'use server';

import { db } from '@/lib/db';
import { hashPassword, comparePassword, setSession, removeSession } from '@/lib/auth';

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

    // Create the pending user in database
    await db.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'USER',
        status: 'PENDING',
      },
    });

    return {
      success: true,
      message: 'Registration successful. Wait for admin approval.',
    };
  } catch (error) {
    console.error('Registration error:', error);
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

    // Role-based status checks
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
