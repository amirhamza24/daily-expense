import { intlLocale, type Locale } from './i18n/config';

/** Bangladeshi Taka. Every money figure in the app is prefixed with this. */
export const CURRENCY_SYMBOL = '৳';
export const CURRENCY_CODE = 'BDT';

// Every formatter takes the UI locale: "bn" renders Bangla digits and month
// names (Intl bn-BD, which also groups in lakhs: ১২,৩৪,৫৬৭.৫০). Client code
// gets these pre-bound to the current locale via `useI18n().fmt`.

const moneyFormatters: Record<Locale, Intl.NumberFormat> = {
  en: new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  bn: new Intl.NumberFormat('bn-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
};

/** 1234.5 -> "৳1,234.50" / "৳১,২৩৪.৫০" (sign handled by caller) */
export function formatMoney(value: number, locale: Locale = 'en') {
  return `${CURRENCY_SYMBOL}${moneyFormatters[locale].format(Math.abs(value))}`;
}

/** Plain number in the locale's digits, e.g. counts: 12 -> "১২". */
export function formatNumber(value: number, locale: Locale = 'en', opts?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(intlLocale(locale), opts).format(value);
}

export function formatDate(
  value: Date | string,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' },
  locale: Locale = 'en',
) {
  return new Date(value).toLocaleDateString(intlLocale(locale), opts);
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

/** Swaps ASCII digits for Bangla ones when locale is "bn" (for hand-built strings). */
export function localizeDigits(value: string | number, locale: Locale = 'en') {
  const s = String(value);
  return locale === 'bn' ? s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]) : s;
}

/** Bangla digits typed on a Bangla keyboard -> ASCII, so inputs accept either. */
export function toAsciiDigits(value: string) {
  return value.replace(/[০-৯]/g, (ch) => String(BN_DIGITS.indexOf(ch)));
}

/** "৳1.2k", "৳15k", "৳1.1M" for chart axis ticks. */
export function compactMoney(v: number, locale: Locale = 'en') {
  const abs = Math.abs(v);
  const sign = v < 0 ? '−' : '';
  const c = CURRENCY_SYMBOL;
  let body: string;
  if (abs >= 1_000_000) body = `${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  else if (abs >= 1_000) body = `${(abs / 1_000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  else body = `${Math.round(abs)}`;
  return `${sign}${c}${localizeDigits(body, locale)}`;
}

/** All formatters bound to one locale. */
export function makeFormatter(locale: Locale) {
  return {
    locale,
    money: (value: number) => formatMoney(value, locale),
    number: (value: number, opts?: Intl.NumberFormatOptions) => formatNumber(value, locale, opts),
    date: (value: Date | string, opts?: Intl.DateTimeFormatOptions) => formatDate(value, opts, locale),
    digits: (value: string | number) => localizeDigits(value, locale),
    compactMoney: (value: number) => compactMoney(value, locale),
  };
}
export type Formatter = ReturnType<typeof makeFormatter>;

/** Local date as "YYYY-MM-DD", for file names. */
export function fileDate(value: Date | string) {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}
