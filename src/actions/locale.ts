'use server';

import { cookies } from 'next/headers';
import { LOCALE_COOKIE, isLocale } from '@/lib/i18n/config';

/** Persists the UI language; the current route re-renders with it. */
export async function setLocaleCookie(locale: string) {
  if (!isLocale(locale)) return { success: false };
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  return { success: true };
}
