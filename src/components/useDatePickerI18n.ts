"use client";

import { registerLocale } from "react-datepicker";
import { bn } from "date-fns/locale";
import { useI18n } from "./I18nProvider";

registerLocale("bn", bn);

const FORMATS = {
  en: { long: "MMMM d, yyyy", short: "MMM d, yyyy" },
  bn: { long: "d MMMM, yyyy", short: "d MMM, yyyy" },
} as const;

/**
 * Props to spread onto every react-datepicker so its month names, date
 * format and calendar day numbers follow the UI language.
 */
export function useDatePickerI18n(style: "long" | "short" = "long") {
  const { locale, fmt } = useI18n();
  return {
    dateFormat: FORMATS[locale][style],
    ...(locale === "bn" && {
      locale: "bn",
      renderDayContents: (day: number) => fmt.digits(day),
    }),
  };
}
