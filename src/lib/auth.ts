import { SignJWT, jwtVerify } from 'jose';
import * as bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from './db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'daily_expense_tracker_secret_glow_and_frosted_glass_security_token_2026_key'
);

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function decrypt(input: string) {
  try {
    const { payload } = await jwtVerify(input, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return payload;
  } catch (e) {
    return null;
  }
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session')?.value;
  if (!sessionToken) return null;

  const decrypted = await decrypt(sessionToken);
  if (!decrypted || !decrypted.userId) return null;

  // Query database in real-time to check role & status (so admin blocks take effect immediately)
  try {
    const user = await db.user.findUnique({
      where: { id: decrypted.userId as string },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    if (!user) return null;
    return user as SessionUser;
  } catch (error) {
    console.error('Session lookup failed:', error);
    return null;
  }
}

export async function setSession(userId: string) {
  const token = await encrypt({ userId });
  const cookieStore = await cookies();
  cookieStore.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 1 day
  });
}

export async function removeSession() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
}
