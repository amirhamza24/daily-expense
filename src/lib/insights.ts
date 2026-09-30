import { formatMoney, localizeDigits } from '@/lib/format';
import { formatYmd, pctChange, share } from '@/lib/dates';
import type { Locale } from '@/lib/i18n/config';
import { categoryLabel, getMessagesFor } from '@/lib/i18n/messages';

/**
 * Rule-based financial insights. Pure: takes already-aggregated numbers and
 * returns a short, prioritized, de-duplicated list. No predictions or advice.
 *
 * Lending/borrowing is analysed separately and never mixed into income/expense.
 */

export const INSIGHT_THRESHOLDS = {
  /** Category change (either way) worth mentioning, in %. */
  categoryChangePct: 20,
  /** Ignore category changes smaller than this share of total spending, in %. */
  categoryMinSharePct: 5,
  /** Total spending / income change worth mentioning, in %. */
  totalChangePct: 10,
  /** A day is "unusual" when it exceeds this multiple of the average spending day. */
  unusualDayMultiplier: 2.5,
  /** Need at least this many days with spending before calling a day unusual. */
  unusualMinActiveDays: 5,
};

export type InsightTone = 'positive' | 'negative' | 'warning' | 'info';
export type InsightIcon =
  | 'trend-up'
  | 'trend-down'
  | 'alert'
  | 'wallet'
  | 'tag'
  | 'calendar'
  | 'hand'
  | 'info';

export interface Insight {
  id: string;
  tone: InsightTone;
  icon: InsightIcon;
  title: string;
  message: string;
  /** Short highlighted figure, e.g. "+24% vs August". */
  metric?: string;
  href?: string;
  priority: number;
}

export interface InsightInput {
  /** Sentence fragments, e.g. "this month" / "August". */
  periodLabel: string;
  prevLabel: string;
  current: { income: number; expense: number; incomeCount: number; expenseCount: number };
  previous: { income: number; expense: number };
  categories: Array<{ name: string; amount: number; prevAmount: number; href?: string }>;
  /** Expense per day with spending ("YYYY-MM-DD"), for the selected period. */
  spendingDays: Array<{ day: string; amount: number }>;
  elapsedDays: number;
  money: {
    receivable: number;
    payable: number;
    activeLending: number;
    activeBorrowing: number;
    overdueLending: number;
    overdueBorrowing: number;
  };
  /** Base link for a day's expenses, e.g. (day) => "/expenses?...". */
  dayHref?: (day: string) => string;
}

export function buildInsights(input: InsightInput, limit = 5, locale: Locale = 'en'): Insight[] {
  const t = INSIGHT_THRESHOLDS;
  const m = getMessagesFor(locale);
  const i18n = m.insights;
  const money$ = (n: number) => formatMoney(n, locale);
  const pct = (n: number) =>
    localizeDigits(`${Math.abs(n) >= 10 ? Math.round(Math.abs(n)) : Math.abs(n).toFixed(1)}%`, locale);
  const cat = (name: string) => categoryLabel(m, name);
  const out: Insight[] = [];
  const { current: cur, previous: prev, money } = input;
  const usedCategories = new Set<string>();

  // ── Cash flow (income vs expense) ──────────────────────────────────────────
  if (cur.income > 0 || cur.expense > 0) {
    const net = cur.income - cur.expense;
    if (cur.income > 0 && net < 0) {
      out.push({
        id: 'cashflow-negative',
        tone: 'negative',
        icon: 'alert',
        title: i18n.cashflowNegative.title,
        message: i18n.cashflowNegative.message(money$(-net), input.periodLabel),
        metric: i18n.cashflowNegative.metric(pct(share(cur.expense, cur.income))),
        priority: 100,
      });
    } else if (cur.income > 0 && net > 0) {
      out.push({
        id: 'cashflow-positive',
        tone: 'positive',
        icon: 'wallet',
        title: i18n.cashflowPositive.title,
        message: i18n.cashflowPositive.message(money$(net), input.periodLabel),
        metric: cur.expense > 0 ? i18n.cashflowPositive.metric(pct(share(cur.expense, cur.income))) : undefined,
        priority: 70,
      });
    }
  }

  // ── Overdue lending / borrowing ────────────────────────────────────────────
  if (money.overdueLending > 0) {
    out.push({
      id: 'overdue-lending',
      tone: 'warning',
      icon: 'alert',
      title: i18n.overdueLending.title,
      message: i18n.overdueLending.message(money.overdueLending),
      metric: i18n.overdueLending.metric(money$(money.receivable)),
      href: '/lend-borrow?type=LENT&status=OVERDUE',
      priority: 95,
    });
  }
  if (money.overdueBorrowing > 0) {
    out.push({
      id: 'overdue-borrowing',
      tone: 'warning',
      icon: 'alert',
      title: i18n.overdueBorrowing.title,
      message: i18n.overdueBorrowing.message(money.overdueBorrowing),
      metric: i18n.overdueBorrowing.metric(money$(money.payable)),
      href: '/lend-borrow?type=BORROWED&status=OVERDUE',
      priority: 96,
    });
  }

  // ── Total spending change ──────────────────────────────────────────────────
  const expenseChange = pctChange(cur.expense, prev.expense);
  if (expenseChange !== null && cur.expense > 0 && Math.abs(expenseChange) >= t.totalChangePct) {
    const up = expenseChange > 0;
    out.push({
      id: 'expense-change',
      tone: up ? 'negative' : 'positive',
      icon: up ? 'trend-up' : 'trend-down',
      title: up ? i18n.spendingUp : i18n.spendingDown,
      message: i18n.spendingChange(money$(Math.abs(cur.expense - prev.expense)), up, input.prevLabel),
      metric: i18n.vs(`${up ? '+' : '−'}${pct(expenseChange)}`, input.prevLabel),
      priority: 90,
    });
  }

  // ── Category changes (largest increase and largest decrease only) ─────────
  const significant = input.categories.filter(
    (c) => c.prevAmount > 0 && share(Math.max(c.amount, c.prevAmount), Math.max(cur.expense, prev.expense)) >= t.categoryMinSharePct,
  );
  const withChange = significant
    .map((c) => ({ ...c, change: pctChange(c.amount, c.prevAmount)! }))
    .filter((c) => Math.abs(c.change) >= t.categoryChangePct);

  const inc = withChange.filter((c) => c.change > 0).sort((a, b) => b.amount - b.prevAmount - (a.amount - a.prevAmount))[0];
  if (inc) {
    usedCategories.add(inc.name);
    out.push({
      id: `category-up-${inc.name}`,
      tone: 'negative',
      icon: 'trend-up',
      title: i18n.categoryUp.title(cat(inc.name)),
      message: i18n.categoryUp.message(money$(inc.amount - inc.prevAmount), cat(inc.name), input.prevLabel),
      metric: i18n.vs(`+${pct(inc.change)}`, input.prevLabel),
      href: inc.href,
      priority: 85,
    });
  }
  const dec = withChange.filter((c) => c.change < 0).sort((a, b) => a.amount - a.prevAmount - (b.amount - b.prevAmount))[0];
  if (dec) {
    usedCategories.add(dec.name);
    out.push({
      id: `category-down-${dec.name}`,
      tone: 'positive',
      icon: 'trend-down',
      title: i18n.categoryDown.title(cat(dec.name)),
      message: i18n.categoryDown.message(money$(dec.prevAmount - dec.amount), cat(dec.name), input.prevLabel),
      metric: i18n.vs(`−${pct(dec.change)}`, input.prevLabel),
      href: dec.href,
      priority: 80,
    });
  }

  // ── Unusually high spending day ────────────────────────────────────────────
  const active = input.spendingDays.filter((d) => d.amount > 0);
  if (active.length >= t.unusualMinActiveDays) {
    const avg = active.reduce((s, d) => s + d.amount, 0) / active.length;
    const top = active.reduce((a, b) => (b.amount > a.amount ? b : a));
    if (avg > 0 && top.amount >= avg * t.unusualDayMultiplier) {
      out.push({
        id: 'unusual-day',
        tone: 'warning',
        icon: 'calendar',
        title: i18n.unusualDay.title,
        message: i18n.unusualDay.message(
          money$(top.amount),
          formatYmd(top.day, { weekday: 'long', month: 'short', day: 'numeric' }, locale),
        ),
        metric: i18n.unusualDay.metric(localizeDigits((top.amount / avg).toFixed(1), locale)),
        href: input.dayHref?.(top.day),
        priority: 75,
      });
    }
  }

  // ── Income change ──────────────────────────────────────────────────────────
  const incomeChange = pctChange(cur.income, prev.income);
  if (incomeChange !== null && cur.income > 0 && Math.abs(incomeChange) >= t.totalChangePct) {
    const up = incomeChange > 0;
    out.push({
      id: 'income-change',
      tone: up ? 'positive' : 'negative',
      icon: up ? 'trend-up' : 'trend-down',
      title: up ? i18n.incomeUp : i18n.incomeDown,
      message: i18n.incomeChange(money$(Math.abs(cur.income - prev.income)), up, input.prevLabel),
      metric: i18n.vs(`${up ? '+' : '−'}${pct(incomeChange)}`, input.prevLabel),
      priority: 65,
    });
  }

  // ── Outstanding lend & borrow (only when not already flagged as overdue) ──
  if (money.receivable > 0 && money.overdueLending === 0) {
    out.push({
      id: 'receivable',
      tone: 'info',
      icon: 'hand',
      title: i18n.receivable.title,
      message: i18n.receivable.message(money$(money.receivable)),
      metric: i18n.activeRecords(money.activeLending),
      href: '/lend-borrow?type=LENT&status=OPEN',
      priority: 50,
    });
  }
  if (money.payable > 0 && money.overdueBorrowing === 0) {
    out.push({
      id: 'payable',
      tone: 'info',
      icon: 'hand',
      title: i18n.payable.title,
      message: i18n.payable.message(money$(money.payable)),
      metric: i18n.activeRecords(money.activeBorrowing),
      href: '/lend-borrow?type=BORROWED&status=OPEN',
      priority: 45,
    });
  }

  // ── General statistics ─────────────────────────────────────────────────────
  const topCat = [...input.categories].filter((c) => c.amount > 0).sort((a, b) => b.amount - a.amount)[0];
  const spendCategories = input.categories.filter((c) => c.amount > 0).length;
  if (topCat && spendCategories >= 2 && !usedCategories.has(topCat.name)) {
    out.push({
      id: 'top-category',
      tone: 'info',
      icon: 'tag',
      title: i18n.topCategory.title(cat(topCat.name)),
      message: i18n.topCategory.message(cat(topCat.name), pct(share(topCat.amount, cur.expense)), input.periodLabel),
      metric: money$(topCat.amount),
      href: topCat.href,
      priority: 40,
    });
  }
  if (cur.expense > 0 && input.elapsedDays > 1) {
    out.push({
      id: 'avg-daily',
      tone: 'info',
      icon: 'info',
      title: i18n.avgDaily.title,
      message: i18n.avgDaily.message(money$(cur.expense / input.elapsedDays), input.periodLabel),
      metric: i18n.expenses(cur.expenseCount),
      priority: 30,
    });
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, limit);
}
