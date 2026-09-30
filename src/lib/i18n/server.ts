import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from './config';
import { getMessagesFor } from './messages';
import { makeFormatter } from '@/lib/format';

/** UI language for this request (Server Components, Server Actions). */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/** Messages + locale-bound formatters for this request. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, m: getMessagesFor(locale), fmt: makeFormatter(locale) };
}
