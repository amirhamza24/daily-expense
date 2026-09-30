"use client";

import React, { createContext, useCallback, useContext, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/config";
import { getMessagesFor, type Messages } from "@/lib/i18n/messages";
import { makeFormatter, type Formatter } from "@/lib/format";
import { setLocaleCookie } from "@/actions/locale";

interface I18nContextValue {
  locale: Locale;
  /** Messages for the current language. */
  m: Messages;
  /** Number / money / date formatters bound to the current language. */
  fmt: Formatter;
  setLocale: (locale: Locale) => Promise<void>;
  switching: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ locale: initialLocale, children }: { locale: Locale; children: React.ReactNode }) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);
  const [switching, startTransition] = useTransition();

  const setLocale = useCallback(
    async (next: Locale) => {
      // Client text switches instantly; the refresh re-renders server output.
      setLocaleState(next);
      document.documentElement.lang = next;
      await setLocaleCookie(next);
      startTransition(() => router.refresh());
    },
    [router],
  );

  const value = useMemo(
    () => ({ locale, m: getMessagesFor(locale), fmt: makeFormatter(locale), setLocale, switching }),
    [locale, setLocale, switching],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
