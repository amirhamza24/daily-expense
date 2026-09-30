export const LOCALES = ['en', 'bn'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

/** Cookie holding the chosen UI language (per device, set from Settings). */
export const LOCALE_COOKIE = 'lang';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** BCP 47 tag used for Intl number / date formatting. */
export function intlLocale(locale: Locale) {
  return locale === 'bn' ? 'bn-BD' : 'en-US';
}
