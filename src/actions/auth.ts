'use server';

import { db } from '@/lib/db';
import { hashPassword, comparePassword, setSession, removeSession, getSession } from '@/lib/auth';
import { sendOTPEmail, sendPasswordResetEmail } from '@/lib/email';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { getI18n } from '@/lib/i18n/server';

export type ActionResponse = {
  success: boolean;
  message: string;
  /** Stable machine-readable reason, for UI logic that must not depend on wording. */
  code?: 'EMAIL_UNVERIFIED' | 'RESET_CODE_DEAD';
};

export async function registerUser(formData: FormData): Promise<ActionResponse> {
  const { m, locale } = await getI18n();
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    return { success: false, message: m.authServer.allRequired };
  }

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return { success: false, message: m.authServer.emailTaken };
    }

    const hashedPassword = hashPassword(password);

    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // Create the pending user in database
    await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'USER',
        status: 'PENDING',
        emailVerified: false,
        verificationCode: otp,
        verificationCodeExpiry: otpExpiry,
      },
    });

    // Send the verification OTP email (non-blocking so email service failures don't crash registration)
    try {
      await sendOTPEmail(email.toLowerCase(), name, otp, locale);
    } catch (emailError) {
      console.error('Failed to send registration OTP email:', emailError);
    }

    return {
      success: true,
      message: m.authServer.registered,
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: m.internalError };
  }
}

export async function verifyEmailOTP(email: string, otp: string): Promise<ActionResponse> {
  const { m } = await getI18n();
  if (!email || !otp) {
    return { success: false, message: m.authServer.emailAndCodeRequired };
  }

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { success: false, message: m.authServer.userNotFound };
    }

    if (user.emailVerified) {
      return { success: false, message: m.authServer.alreadyVerified };
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      return { success: false, message: m.authServer.noActiveCode };
    }

    if (user.verificationCode !== otp) {
      return { success: false, message: m.authServer.invalidCode };
    }

    if (new Date() > user.verificationCodeExpiry) {
      return { success: false, message: m.authServer.codeExpired };
    }

    // Set emailVerified = true, and clean verification code fields
    await db.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null,
      },
    });

    return {
      success: true,
      message: m.authServer.verified,
    };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, message: m.internalError };
  }
}

export async function resendVerificationOTP(email: string): Promise<ActionResponse> {
  const { m, locale } = await getI18n();
  if (!email) {
    return { success: false, message: m.authServer.emailRequired };
  }

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { success: false, message: m.authServer.userNotFound };
    }

    if (user.emailVerified) {
      return { success: false, message: m.authServer.alreadyVerified };
    }

    // Rate limit check: 120 seconds (2 minutes)
    if (user.verificationCodeExpiry) {
      const lastCreatedTime = new Date(user.verificationCodeExpiry.getTime() - 2 * 60 * 1000);
      const secondsSinceLastOtp = Math.floor((Date.now() - lastCreatedTime.getTime()) / 1000);
      
      if (secondsSinceLastOtp < 120) {
        const waitTime = 120 - secondsSinceLastOtp;
        return { 
          success: false, 
          message: m.authServer.waitSeconds(waitTime) 
        };
      }
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    await db.user.update({
      where: { id: user.id },
      data: {
        verificationCode: otp,
        verificationCodeExpiry: otpExpiry,
      },
    });

    // Send the verification OTP email (non-blocking)
    try {
      await sendOTPEmail(user.email, user.name, otp, locale);
    } catch (emailError) {
      console.error('Failed to send resend OTP email:', emailError);
    }

    return {
      success: true,
      message: m.authServer.newCodeSent,
    };
  } catch (error) {
    console.error('Resend OTP error:', error);
    return { success: false, message: m.internalError };
  }
}

export async function loginUser(formData: FormData): Promise<ActionResponse> {
  const { m } = await getI18n();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: m.authServer.emailPasswordRequired };
  }

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { success: false, message: m.authServer.invalidLogin };
    }

    const isPasswordCorrect = comparePassword(password, user.password);
    if (!isPasswordCorrect) {
      return { success: false, message: m.authServer.invalidLogin };
    }

    // 1. Verify email status
    if (!user.emailVerified) {
      return { success: false, message: m.authServer.verifyFirst, code: 'EMAIL_UNVERIFIED' };
    }

    // 2. Role-based status checks
    if (user.status === 'PENDING') {
      return { success: false, message: m.authServer.pending };
    }

    if (user.status === 'REJECTED') {
      return { success: false, message: m.authServer.rejected };
    }

    if (user.status === 'SUSPENDED') {
      return { success: false, message: m.authServer.suspended };
    }

    // Set secure HTTP-only session cookie
    await setSession(user.id);

    return { success: true, message: m.authServer.loginOk };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: m.internalError };
  }
}

export async function logoutUser(): Promise<ActionResponse> {
  const { m } = await getI18n();
  try {
    await removeSession();
    return { success: true, message: m.loggedOut };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, message: m.authServer.logoutFailed };
  }
}

// ─── Forgot password ─────────────────────────────────────────────────────────
// Flow: /forgot-password (email) → emailed 6-digit code → /reset-password
// (code + new password). Only the code's SHA-256 is stored; each check burns
// one attempt, and the code dies after RESET_MAX_ATTEMPTS misses or expiry.

const RESET_CODE_TTL_MINUTES = 10;
const RESET_RESEND_COOLDOWN_SECONDS = 60;
const RESET_MAX_ATTEMPTS = 5;

// Product decision: unknown emails get an explicit error (clearer UX), which
// does let this form reveal whether an email is registered.

function hashResetCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

export async function requestPasswordReset(email: string): Promise<ActionResponse> {
  const { m, locale } = await getI18n();
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return { success: false, message: m.auth.forgot.enterEmail };
  }

  try {
    const user = await db.user.findUnique({ where: { email: normalized } });

    if (!user) {
      return { success: false, message: m.authServer.noAccountForEmail };
    }
    if (!user.emailVerified) {
      return {
        success: false,
        message: m.authServer.unverifiedForReset,
      };
    }

    if (user.resetCodeExpiry) {
      const issuedAt = user.resetCodeExpiry.getTime() - RESET_CODE_TTL_MINUTES * 60 * 1000;
      const waited = Math.floor((Date.now() - issuedAt) / 1000);
      if (waited < RESET_RESEND_COOLDOWN_SECONDS) {
        const wait = RESET_RESEND_COOLDOWN_SECONDS - waited;
        return { success: false, message: m.authServer.waitSeconds(wait) };
      }
    }

    const code = randomInt(100000, 1000000).toString();
    await db.user.update({
      where: { id: user.id },
      data: {
        resetCodeHash: hashResetCode(code),
        resetCodeExpiry: new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60 * 1000),
        resetAttempts: 0,
      },
    });

    try {
      await sendPasswordResetEmail(user.email, user.name, code, RESET_CODE_TTL_MINUTES, locale);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
    }

    return { success: true, message: m.authServer.resetCodeSent };
  } catch (error) {
    console.error('Request password reset error:', error);
    return { success: false, message: m.internalError };
  }
}

export async function resetPasswordWithCode(
  email: string,
  code: string,
  newPassword: string,
  confirmPassword: string,
): Promise<ActionResponse> {
  const { m } = await getI18n();
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !code) {
    return { success: false, message: m.authServer.resetEmailCodeRequired };
  }
  if (!/^\d{6}$/.test(code)) {
    return { success: false, message: m.authServer.resetEnterAll };
  }
  if (!newPassword || newPassword.length < 6) {
    return { success: false, message: m.authServer.newPasswordTooShort };
  }
  if (newPassword !== confirmPassword) {
    return { success: false, message: m.authServer.passwordsMismatch };
  }

  const invalid: ActionResponse = { success: false, message: m.authServer.resetInvalid, code: 'RESET_CODE_DEAD' };

  try {
    const user = await db.user.findUnique({ where: { email: normalized } });
    if (!user || !user.resetCodeHash || !user.resetCodeExpiry) return invalid;

    // Consume one attempt atomically before comparing, so parallel guesses
    // can't slip past the limit.
    const consumed = await db.user.updateMany({
      where: {
        id: user.id,
        resetCodeHash: { not: null },
        resetCodeExpiry: { gt: new Date() },
        resetAttempts: { lt: RESET_MAX_ATTEMPTS },
      },
      data: { resetAttempts: { increment: 1 } },
    });

    if (consumed.count === 0) {
      await db.user.update({
        where: { id: user.id },
        data: { resetCodeHash: null, resetCodeExpiry: null, resetAttempts: 0 },
      });
      return user.resetAttempts >= RESET_MAX_ATTEMPTS
        ? { success: false, message: m.authServer.resetTooMany, code: 'RESET_CODE_DEAD' }
        : { success: false, message: m.authServer.resetExpired, code: 'RESET_CODE_DEAD' };
    }

    const matches = timingSafeEqual(
      Buffer.from(hashResetCode(code), 'hex'),
      Buffer.from(user.resetCodeHash, 'hex'),
    );

    if (!matches) {
      const attemptsLeft = RESET_MAX_ATTEMPTS - (user.resetAttempts + 1);
      if (attemptsLeft <= 0) {
        await db.user.update({
          where: { id: user.id },
          data: { resetCodeHash: null, resetCodeExpiry: null, resetAttempts: 0 },
        });
        return { success: false, message: m.authServer.resetTooMany, code: 'RESET_CODE_DEAD' };
      }
      return {
        success: false,
        message: m.authServer.resetWrong(attemptsLeft),
      };
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        password: hashPassword(newPassword),
        resetCodeHash: null,
        resetCodeExpiry: null,
        resetAttempts: 0,
      },
    });

    return { success: true, message: m.authServer.resetDone };
  } catch (error) {
    console.error('Reset password error:', error);
    return { success: false, message: m.internalError };
  }
}

export async function changeUserPassword(formData: FormData): Promise<ActionResponse> {
  const { m } = await getI18n();
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmNewPassword = formData.get('confirmNewPassword') as string;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return { success: false, message: m.authServer.passwordFieldsRequired };
  }

  if (newPassword !== confirmNewPassword) {
    return { success: false, message: m.authServer.newPasswordsMismatch };
  }

  if (newPassword.length < 6) {
    return { success: false, message: m.authServer.newPasswordTooShort };
  }

  try {
    const user = await getSession();
    if (!user) {
      return { success: false, message: m.unauthorized };
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return { success: false, message: m.authServer.recordNotFound };
    }

    const isPasswordCorrect = comparePassword(currentPassword, dbUser.password);
    if (!isPasswordCorrect) {
      return { success: false, message: m.authServer.wrongCurrent };
    }

    if (currentPassword === newPassword) {
      return { success: false, message: m.authServer.sameAsCurrent };
    }

    const newHashedPassword = hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { password: newHashedPassword },
    });

    return { success: true, message: m.authServer.passwordUpdated };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, message: m.internalError };
  }
}
