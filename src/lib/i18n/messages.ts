import type { Locale } from './config';
import * as common from './dict/common';
import * as auth from './dict/auth';
import * as finance from './dict/finance';
import * as dashboard from './dict/dashboard';
import * as expenses from './dict/expenses';
import * as money from './dict/money';
import * as history from './dict/history';
import * as analytics from './dict/analytics';
import * as reports from './dict/reports';
import * as admin from './dict/admin';

// Each dict/* module exports `en` and a `bn` typed against it, so a missing
// or mistyped Bangla string is a compile error.
const en = {
  ...common.en,
  ...auth.en,
  ...finance.en,
  ...dashboard.en,
  ...expenses.en,
  ...money.en,
  ...history.en,
  ...analytics.en,
  ...reports.en,
  ...admin.en,
};

export type Messages = typeof en;

const bn: Messages = {
  ...common.bn,
  ...auth.bn,
  ...finance.bn,
  ...dashboard.bn,
  ...expenses.bn,
  ...money.bn,
  ...history.bn,
  ...analytics.bn,
  ...reports.bn,
  ...admin.bn,
};

/** Display name for a stored (English) category value; unknown ones pass through. */
export function categoryLabel(m: Messages, category: string) {
  return m.categories[category] ?? category;
}

const messages: Record<Locale, Messages> = { en, bn };

export function getMessagesFor(locale: Locale): Messages {
  return messages[locale];
}
