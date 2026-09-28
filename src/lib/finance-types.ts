import type { Insight } from '@/lib/insights';
import type { MoneySummary } from '@/lib/money';
import type { RangePreset } from '@/lib/dates';

/** Serializable shapes passed from analytics/report pages to their client components. */

export interface DayPoint {
  /** "YYYY-MM-DD" in the user's time zone */
  day: string;
  income: number;
  expense: number;
}

export interface MonthPoint {
  /** "YYYY-MM" */
  month: string;
  income: number;
  expense: number;
}

export interface CategoryRow {
  name: string;
  amount: number;
  count: number;
  prevAmount: number;
  /** Link to the matching expenses. */
  href: string;
}

export interface NamedAmount {
  title: string;
  amount: number;
  /** "YYYY-MM-DD" */
  day: string;
  category: string;
}

export interface AnalyticsData {
  period: {
    preset: RangePreset;
    label: string;
    prevLabel: string;
    /** Inclusive "YYYY-MM-DD" bounds */
    from: string;
    to: string;
    elapsedDays: number;
  };
  overview: {
    available: number;
    income: number;
    expense: number;
    net: number;
    lent: number;
    receivable: number;
    borrowed: number;
    payable: number;
  };
  current: FlowTotals;
  previous: FlowTotals;
  categories: CategoryRow[];
  daily: DayPoint[];
  stats: {
    avgDaily: number;
    avgWeekly: number | null;
    avgMonthly: number | null;
    highestDay: { day: string; amount: number } | null;
    lowestDay: { day: string; amount: number } | null;
    highestExpense: NamedAmount | null;
    expenseCount: number;
    avgTransaction: number;
  };
  money: MoneySummary & {
    lentInPeriod: number;
    lentCountInPeriod: number;
    repaidInPeriod: number;
    borrowedInPeriod: number;
    borrowedCountInPeriod: number;
    paidInPeriod: number;
  };
  insights: Insight[];
}

export interface FlowTotals {
  income: number;
  incomeCount: number;
  expense: number;
  expenseCount: number;
  lent: number;
  lentCount: number;
  borrowed: number;
  borrowedCount: number;
  /** Repayments received on money lent */
  repaid: number;
  /** Payments made on money borrowed */
  paidBack: number;
}

export interface MoneyMonthSummary {
  amount: number;
  count: number;
  settled: number;
  /** Still outstanding on the records created this month */
  outstanding: number;
  /** Total outstanding right now, across all records */
  currentOutstanding: number;
  paid: number;
  partial: number;
  pending: number;
  overdue: number;
}

export interface MonthlyReport {
  month: { key: string; label: string; year: number; index: number };
  generatedAt: string;
  isCurrentMonth: boolean;
  hasData: boolean;
  overview: {
    opening: number;
    income: number;
    expense: number;
    net: number;
    /** −lent + borrowed + repayments received − payments made */
    lendBorrowNet: number;
    closing: number;
  };
  expense: {
    total: number;
    count: number;
    average: number;
    avgDaily: number;
    highest: NamedAmount | null;
    highestDay: { day: string; amount: number } | null;
    categories: Array<{ name: string; amount: number; count: number }>;
  };
  income: {
    total: number;
    count: number;
    average: number;
    highest: NamedAmount | null;
  };
  lending: MoneyMonthSummary;
  borrowing: MoneyMonthSummary;
  daily: DayPoint[];
  trend: MonthPoint[];
  highlights: string[];
  /** Years that have any data, for the year picker */
  years: number[];
}
