'use server';

import { db } from '@/lib/db';
import { hashPassword, comparePassword, setSession, removeSession, getSession } from '@/lib/auth';
import { sendOTPEmail, sendPasswordResetEmail } from '@/lib/email';
import { createHash, randomInt, timingSafeEqual } from 'crypto';
import { getI18n } from '@/lib/i18n/server';
import type { Locale } from '@/lib/i18n/config';

export type ActionResponse = {
  success: boolean;
  message: string;
  /** Stable machine-readable reason, for UI logic that must not depend on wording. */
  code?: 'EMAIL_UNVERIFIED' | 'RESET_CODE_DEAD';
};

// ─── Sign-up & email verification ────────────────────────────────────────────
// Flow: /register → PendingRegistration + emailed 6-digit code → /verify → the
// User row is created only here, so an unverified email never becomes an
// account (and never reaches the admin's approval list). Only the code's
// SHA-256 is stored; each check burns one attempt.
//
// Legacy: accounts created before this flow may still exist as User rows with
// emailVerified = false. Signing up / resending for such an email starts a
// pending sign-up, and verifying it upgrades that existing row in place.

const SIGNUP_CODE_TTL_SECONDS = 120; // matches the countdown on /verify
const SIGNUP_RESEND_COOLDOWN_SECONDS = 120;
const SIGNUP_MAX_ATTEMPTS = 5;
const SIGNUP_STALE_HOURS = 24;

function hashCode(code: string) {
  return createHash('sha256').update(code).digest('hex');
}

function newSignupCode() {
  const code = randomInt(100000, 1000000).toString();
  return {
    code,
    codeHash: hashCode(code),
    codeExpiry: new Date(Date.now() + SIGNUP_CODE_TTL_SECONDS * 1000),
    codeSentAt: new Date(),
    attempts: 0,
  };
}

/**
 * Emails the code. In production a failed send is a failed sign-up step (the
 * person could never verify); in development the code is logged to the
 * console by sendOTPEmail, so the flow can continue locally.
 */
async function deliverSignupCode(email: string, name: string, code: string, locale: Locale) {
  try {
    const res = await sendOTPEmail(email, name, code, locale);
    if (res.success) return true;
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
  }
  return process.env.NODE_ENV !== 'production';
}

export async function registerUser(formData: FormData): Promise<ActionResponse> {
  const { m, locale } = await getI18n();
  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    return { success: false, message: m.authServer.allRequired };
  }

  try {
    const existingUser = await db.user.findUnique({ where: { email } });
    if (existingUser?.emailVerified) {
      return { success: false, message: m.authServer.emailTaken };
    }

    // Housekeeping: drop sign-ups that were never verified.
    await db.pendingRegistration.deleteMany({
      where: { createdAt: { lt: new Date(Date.now() - SIGNUP_STALE_HOURS * 60 * 60 * 1000) } },
    });

    const pending = await db.pendingRegistration.findUnique({ where: { email } });
    if (pending) {
      const waited = Math.floor((Date.now() - pending.codeSentAt.getTime()) / 1000);
      if (waited < SIGNUP_RESEND_COOLDOWN_SECONDS) {
        return { success: false, message: m.authServer.waitSeconds(SIGNUP_RESEND_COOLDOWN_SECONDS - waited) };
      }
    }

    // Re-registering the same email replaces the earlier unverified attempt:
    // whoever can read the inbox decides which details become the account.
    const { code, ...codeFields } = newSignupCode();
    const details = { name, password: hashPassword(password), ...codeFields };
    await db.pendingRegistration.upsert({
      where: { email },
      create: { email, ...details },
      update: { ...details, createdAt: new Date() },
    });

    if (!(await deliverSignupCode(email, name, code, locale))) {
      await db.pendingRegistration.delete({ where: { email } });
      return { success: false, message: m.authServer.emailSendFailed };
    }

    return { success: true, message: m.authServer.registered };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: m.internalError };
  }
}

export async function verifyEmailOTP(email: string, otp: string): Promise<ActionResponse> {
  const { m } = await getI18n();
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !otp) {
    return { success: false, message: m.authServer.emailAndCodeRequired };
  }

  try {
    const pending = await db.pendingRegistration.findUnique({ where: { email: normalized } });
    if (!pending) {
      const user = await db.user.findUnique({ where: { email: normalized } });
      return user?.emailVerified
        ? { success: false, message: m.authServer.alreadyVerified }
        : { success: false, message: m.authServer.noPendingSignup };
    }

    // Consume one attempt atomically before comparing, so parallel guesses
    // can't slip past the limit.
    const consumed = await db.pendingRegistration.updateMany({
      where: { id: pending.id, codeExpiry: { gt: new Date() }, attempts: { lt: SIGNUP_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    if (consumed.count === 0) {
      return pending.attempts >= SIGNUP_MAX_ATTEMPTS
        ? { success: false, message: m.authServer.resetTooMany }
        : { success: false, message: m.authServer.codeExpired };
    }

    const matches =
      /^\d{6}$/.test(otp) &&
      timingSafeEqual(Buffer.from(hashCode(otp), 'hex'), Buffer.from(pending.codeHash, 'hex'));

    if (!matches) {
      const attemptsLeft = SIGNUP_MAX_ATTEMPTS - (pending.attempts + 1);
      return attemptsLeft <= 0
        ? { success: false, message: m.authServer.resetTooMany }
        : { success: false, message: m.authServer.resetWrong(attemptsLeft) };
    }

    // Verified: now (and only now) the account exists.
    await db.$transaction(async (tx) => {
      const legacy = await tx.user.findUnique({ where: { email: normalized } });
      if (legacy) {
        await tx.user.update({
          where: { id: legacy.id },
          data: {
            name: pending.name,
            password: pending.password,
            emailVerified: true,
            verificationCode: null,
            verificationCodeExpiry: null,
          },
        });
      } else {
        await tx.user.create({
          data: {
            name: pending.name,
            email: normalized,
            password: pending.password,
            role: 'USER',
            status: 'PENDING',
            emailVerified: true,
          },
        });
      }
      await tx.pendingRegistration.delete({ where: { id: pending.id } });
    });

    return { success: true, message: m.authServer.verified };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, message: m.internalError };
  }
}

export async function resendVerificationOTP(email: string): Promise<ActionResponse> {
  const { m, locale } = await getI18n();
  const normalized = email?.trim().toLowerCase();
  if (!normalized) {
    return { success: false, message: m.authServer.emailRequired };
  }

  try {
    let pending = await db.pendingRegistration.findUnique({ where: { email: normalized } });

    if (!pending) {
      const user = await db.user.findUnique({ where: { email: normalized } });
      if (user?.emailVerified) {
        return { success: false, message: m.authServer.alreadyVerified };
      }
      if (!user) {
        return { success: false, message: m.authServer.noPendingSignup };
      }
      // Legacy unverified account: move it onto the new flow.
      pending = await db.pendingRegistration.create({
        data: { email: normalized, name: user.name, password: user.password, ...newSignupCode(), codeSentAt: new Date(0) },
      });
    }

    const waited = Math.floor((Date.now() - pending.codeSentAt.getTime()) / 1000);
    if (waited < SIGNUP_RESEND_COOLDOWN_SECONDS) {
      return { success: false, message: m.authServer.waitSeconds(SIGNUP_RESEND_COOLDOWN_SECONDS - waited) };
    }

    const { code, ...codeFields } = newSignupCode();
    await db.pendingRegistration.update({ where: { id: pending.id }, data: codeFields });

    if (!(await deliverSignupCode(normalized, pending.name, code, locale))) {
      // Undo the cooldown so the person can retry straight away.
      await db.pendingRegistration.update({ where: { id: pending.id }, data: { codeSentAt: new Date(0) } });
      return { success: false, message: m.authServer.emailSendFailed };
    }

    return { success: true, message: m.authServer.newCodeSent };
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
      // Signed up but not verified yet: no account exists, but point them to /verify.
      const pending = await db.pendingRegistration.findUnique({ where: { email: email.toLowerCase() } });
      if (pending && comparePassword(password, pending.password)) {
        return { success: false, message: m.authServer.verifyFirst, code: 'EMAIL_UNVERIFIED' };
      }
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
        resetCodeHash: hashCode(code),
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
      Buffer.from(hashCode(code), 'hex'),
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
