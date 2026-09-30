/**
 * Lending & borrowing domain rules shared by server and client.
 *
 * Terminology (keep consistent across the UI):
 *   LENT     → Receivable → Repayment   ("I gave someone money, they owe me")
 *   BORROWED → Payable    → Payment     ("I received money, I owe them")
 */

export type MoneyType = 'LENT' | 'BORROWED';
export type MoneySettlementStatus = 'PENDING' | 'PARTIALLY_PAID' | 'PAID';
/** What the UI shows: settlement status, with OVERDUE taking priority when it applies. */
export type MoneyDisplayStatus = MoneySettlementStatus | 'OVERDUE';
/** Status filter values; OPEN = anything not fully paid. */
export type MoneyStatusFilter = MoneyDisplayStatus | 'OPEN';

export type MoneyDateRange = 'today' | 'week' | 'month' | 'custom';
export type MoneySort = 'latest' | 'oldest' | 'highest' | 'lowest' | 'due' | 'person';

export interface MoneyPaymentView {
  id: string;
  amount: number;
  paymentDate: Date | string;
  note: string | null;
}

/** A record as passed from the page to client components. */
export interface MoneyRecordView {
  id: string;
  type: MoneyType;
  personName: string;
  amount: number;
  paidAmount: number;
  date: Date | string;
  dueDate: Date | string | null;
  note: string | null;
  status: MoneySettlementStatus;
  /** Computed on the server so client and server agree on "overdue". */
  displayStatus: MoneyDisplayStatus;
  payments: MoneyPaymentView[];
}

export type MoneySummary = {
  totalLent: number;
  receivable: number;
  totalBorrowed: number;
  payable: number;
  activeLending: number;
  activeBorrowing: number;
  overdueLending: number;
  overdueBorrowing: number;
  overdue: number;
  recordCount: number;
};

export const MONEY_TYPES: MoneyType[] = ['LENT', 'BORROWED'];
export const MONEY_STATUS_FILTERS: MoneyStatusFilter[] = [
  'OPEN',
  'PENDING',
  'PARTIALLY_PAID',
  'OVERDUE',
  'PAID',
];
export const MONEY_DATE_RANGES: MoneyDateRange[] = ['today', 'week', 'month', 'custom'];
export const MONEY_SORTS: MoneySort[] = ['latest', 'oldest', 'highest', 'lowest', 'due', 'person'];

/** Rounds to cents so float sums never leave 0.0000001 "remaining". */
export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function remainingOf(record: { amount: number; paidAmount: number }) {
  return Math.max(0, round2(record.amount - record.paidAmount));
}

export function settlementStatus(amount: number, paidAmount: number): MoneySettlementStatus {
  if (round2(amount - paidAmount) <= 0) return 'PAID';
  if (paidAmount > 0) return 'PARTIALLY_PAID';
  return 'PENDING';
}

export function startOfToday(now = new Date()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Overdue = unpaid and the due date is before today (due today is not overdue yet). */
export function isOverdue(
  record: { status: MoneySettlementStatus; dueDate: Date | string | null },
  now = new Date(),
) {
  return (
    record.status !== 'PAID' &&
    record.dueDate !== null &&
    new Date(record.dueDate) < startOfToday(now)
  );
}

export function displayStatus(
  record: { status: MoneySettlementStatus; dueDate: Date | string | null },
  now = new Date(),
): MoneyDisplayStatus {
  return isOverdue(record, now) ? 'OVERDUE' : record.status;
}

// Display text for types and statuses lives in the messages
// (`m.moneyTerms[type]`, `m.moneyStatus[status]`, see src/lib/i18n/dict/money.ts).

/** Tint classes for the type icon tile / badge. */
export const moneyTypeTint: Record<MoneyType, string> = {
  LENT: 'bg-success-soft text-success',
  BORROWED: 'bg-warning-soft text-warning',
};

export const statusBadge: Record<MoneyDisplayStatus, string> = {
  PENDING: 'badge-warning',
  PARTIALLY_PAID: 'badge-accent',
  PAID: 'badge-success',
  OVERDUE: 'badge-danger',
};

export function isMoneyType(v: unknown): v is MoneyType {
  return v === 'LENT' || v === 'BORROWED';
}
