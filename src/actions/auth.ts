'use server';

import { db } from '@/lib/db';
import { hashPassword, comparePassword, setSession, removeSession, getSession } from '@/lib/auth';
import { sendOTPEmail } from '@/lib/email';

export type ActionResponse = {
  success: boolean;
  message: string;
};

export async function registerUser(formData: FormData): Promise<ActionResponse> {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!name || !email || !password) {
    return { success: false, message: 'All fields are required.' };
  }

  try {
    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return { success: false, message: 'Email is already registered.' };
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
      await sendOTPEmail(email.toLowerCase(), name, otp);
    } catch (emailError) {
      console.error('Failed to send registration OTP email:', emailError);
    }

    return {
      success: true,
      message: 'Registration successful. A 6-digit verification code has been sent to your email.',
    };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, message: 'Internal server error occurred.' };
  }
}

export async function verifyEmailOTP(email: string, otp: string): Promise<ActionResponse> {
  if (!email || !otp) {
    return { success: false, message: 'Email and verification code are required.' };
  }

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    if (user.emailVerified) {
      return { success: false, message: 'Email is already verified.' };
    }

    if (!user.verificationCode || !user.verificationCodeExpiry) {
      return { success: false, message: 'No active verification code found. Please request a new one.' };
    }

    if (user.verificationCode !== otp) {
      return { success: false, message: 'Invalid verification code.' };
    }

    if (new Date() > user.verificationCodeExpiry) {
      return { success: false, message: 'Verification code expired.' };
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
      message: 'Email verified successfully. Wait for admin approval.',
    };
  } catch (error) {
    console.error('Verification error:', error);
    return { success: false, message: 'Internal server error occurred.' };
  }
}

export async function resendVerificationOTP(email: string): Promise<ActionResponse> {
  if (!email) {
    return { success: false, message: 'Email is required.' };
  }

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { success: false, message: 'User not found.' };
    }

    if (user.emailVerified) {
      return { success: false, message: 'Email is already verified.' };
    }

    // Rate limit check: 120 seconds (2 minutes)
    if (user.verificationCodeExpiry) {
      const lastCreatedTime = new Date(user.verificationCodeExpiry.getTime() - 2 * 60 * 1000);
      const secondsSinceLastOtp = Math.floor((Date.now() - lastCreatedTime.getTime()) / 1000);
      
      if (secondsSinceLastOtp < 120) {
        const waitTime = 120 - secondsSinceLastOtp;
        return { 
          success: false, 
          message: `Please wait ${waitTime} seconds before requesting a new code.` 
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
      await sendOTPEmail(user.email, user.name, otp);
    } catch (emailError) {
      console.error('Failed to send resend OTP email:', emailError);
    }

    return {
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
    };
  } catch (error) {
    console.error('Resend OTP error:', error);
    return { success: false, message: 'Internal server error occurred.' };
  }
}

export async function loginUser(formData: FormData): Promise<ActionResponse> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { success: false, message: 'Email and password are required.' };
  }

  try {
    const user = await db.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return { success: false, message: 'Invalid email or password.' };
    }

    const isPasswordCorrect = comparePassword(password, user.password);
    if (!isPasswordCorrect) {
      return { success: false, message: 'Invalid email or password.' };
    }

    // 1. Verify email status
    if (!user.emailVerified) {
      return { success: false, message: 'Please verify your email first.' };
    }

    // 2. Role-based status checks
    if (user.status === 'PENDING') {
      return { success: false, message: 'Your account approval is pending.' };
    }

    if (user.status === 'REJECTED') {
      return { success: false, message: 'Your account has been rejected.' };
    }

    if (user.status === 'SUSPENDED') {
      return { success: false, message: 'Your account has been suspended.' };
    }

    // Set secure HTTP-only session cookie
    await setSession(user.id);

    return { success: true, message: 'Login successful.' };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, message: 'Internal server error occurred.' };
  }
}

export async function logoutUser(): Promise<ActionResponse> {
  try {
    await removeSession();
    return { success: true, message: 'Logged out successfully.' };
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false, message: 'Failed to log out.' };
  }
}

export async function changeUserPassword(formData: FormData): Promise<ActionResponse> {
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;
  const confirmNewPassword = formData.get('confirmNewPassword') as string;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return { success: false, message: 'All password fields are required.' };
  }

  if (newPassword !== confirmNewPassword) {
    return { success: false, message: 'New passwords do not match.' };
  }

  if (newPassword.length < 6) {
    return { success: false, message: 'New password must be at least 6 characters long.' };
  }

  try {
    const user = await getSession();
    if (!user) {
      return { success: false, message: 'Unauthorized. Please log in.' };
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      return { success: false, message: 'User record not found.' };
    }

    const isPasswordCorrect = comparePassword(currentPassword, dbUser.password);
    if (!isPasswordCorrect) {
      return { success: false, message: 'Incorrect current password.' };
    }

    if (currentPassword === newPassword) {
      return { success: false, message: 'New password cannot be the same as current password.' };
    }

    const newHashedPassword = hashPassword(newPassword);
    await db.user.update({
      where: { id: user.id },
      data: { password: newHashedPassword },
    });

    return { success: true, message: 'Password updated successfully!' };
  } catch (error) {
    console.error('Change password error:', error);
    return { success: false, message: 'Internal server error occurred.' };
  }
}
