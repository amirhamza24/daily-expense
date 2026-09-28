import { cookies } from 'next/headers';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getMoneySummary } from '@/lib/money-queries';
import { remainingOf, round2, startOfToday } from '@/lib/money';
import { formatMoney } from '@/lib/format';
import { buildInsights } from '@/lib/insights';
import {
  DEFAULT_TIME_ZONE,
  TZ_COOKIE,
  addDays,
  addMonths,
  compareYmd,
  daysBetween,
  formatYmd,
  isValidTimeZone,
  monthKey,
  monthName,
  normYmd,
  resolvePeriod,
  toYmd,
  ymdKey,
  zonedMidnight,
  type Period,
  type RangePreset,
  type Ymd,
} from '@/lib/dates';
import type {
  AnalyticsData,
  CategoryRow,
  DayPoint,
  FlowTotals,
  MoneyMonthSummary,
  MonthPoint,
  MonthlyReport,
  NamedAmount,
} from '@/lib/finance-types';

/*
 * Server-only financial aggregation for Analytics, Insights and Reports.
 * Every query is scoped by userId and bounded by date; sums and buckets are
 * computed in Postgres, never by loading full history into memory.
 *
 * Money rules (same as Balance.remainingBalance):
 *   income +, expense −, lent −, borrowed +, repayment received +, payment made −
 * Income/expense figures never include lending/borrowing.
 */

const INCOME = 'Income';

/** The viewer's IANA time zone (set by <TimezoneSync />), falling back to UTC. */
export async function getUserTimeZone() {
  const tz = (await cookies()).get(TZ_COOKIE)?.value;
  return isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
}

type Range = { start: Date; end: Date };
const rangeOf = (start: Ymd, end: Ymd, tz: string): Range => ({
  start: zonedMidnight(start, tz),
  end: zonedMidnight(end, tz),
});
const expenseDate = (r: Partial<Range>) => ({ ...(r.start && { gte: r.start }), ...(r.end && { lt: r.end }) });

async function flowTotals(userId: string, r: Partial<Range>): Promise<FlowTotals> {
  const date = expenseDate(r);
  const [income, expense, records, repaid, paidBack] = await Promise.all([
    db.expense.aggregate({
      where: { userId, category: INCOME, expenseDate: date },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.expense.aggregate({
      where: { userId, category: { not: INCOME }, expenseDate: date },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.moneyRecord.groupBy({
      by: ['type'],
      where: { userId, date },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    db.moneyPayment.aggregate({
      where: { moneyRecord: { userId, type: 'LENT' }, paymentDate: date },
      _sum: { amount: true },
    }),
    db.moneyPayment.aggregate({
      where: { moneyRecord: { userId, type: 'BORROWED' }, paymentDate: date },
      _sum: { amount: true },
    }),
  ]);
  const rec = (type: 'LENT' | 'BORROWED') => records.find((x) => x.type === type);
  return {
    income: round2(income._sum.amount ?? 0),
    incomeCount: income._count._all,
    expense: round2(expense._sum.amount ?? 0),
    expenseCount: expense._count._all,
    lent: round2(rec('LENT')?._sum.amount ?? 0),
    lentCount: rec('LENT')?._count._all ?? 0,
    borrowed: round2(rec('BORROWED')?._sum.amount ?? 0),
    borrowedCount: rec('BORROWED')?._count._all ?? 0,
    repaid: round2(repaid._sum.amount ?? 0),
    paidBack: round2(paidBack._sum.amount ?? 0),
  };
}

/** Net effect on the available balance (includes lending/borrowing). */
const balanceEffect = (f: FlowTotals) => round2(f.income - f.expense - f.lent + f.borrowed + f.repaid - f.paidBack);

async function categoryTotals(userId: string, r: Range) {
  const rows = await db.expense.groupBy({
    by: ['category'],
    where: { userId, category: { not: INCOME }, expenseDate: expenseDate(r) },
    _sum: { amount: true },
    _count: { _all: true },
  });
  return rows.map((x) => ({ name: x.category, amount: round2(x._sum.amount ?? 0), count: x._count._all }));
}

// Timestamps are stored as UTC `timestamp`; convert to the viewer's zone before bucketing.
const utcParam = (d: Date) => Prisma.sql`(${d.toISOString()}::timestamptz AT TIME ZONE 'UTC')`;

async function bucketed(userId: string, r: Range, tz: string, format: 'YYYY-MM-DD' | 'YYYY-MM') {
  const rows = await db.$queryRaw<Array<{ bucket: string; income: number; expense: number }>>`
    SELECT
      to_char(("expenseDate" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}, ${format}) AS bucket,
      COALESCE(SUM(amount) FILTER (WHERE category = ${INCOME}), 0)::float8 AS income,
      COALESCE(SUM(amount) FILTER (WHERE category <> ${INCOME}), 0)::float8 AS expense
    FROM "Expense"
    WHERE "userId" = ${userId}
      AND "expenseDate" >= ${utcParam(r.start)}
      AND "expenseDate" < ${utcParam(r.end)}
    GROUP BY 1`;
  return new Map(rows.map((x) => [x.bucket, { income: round2(Number(x.income)), expense: round2(Number(x.expense)) }]));
}

async function dailySeries(userId: string, from: Ymd, to: Ymd, tz: string): Promise<DayPoint[]> {
  if (compareYmd(from, to) >= 0) return [];
  const map = await bucketed(userId, rangeOf(from, to, tz), tz, 'YYYY-MM-DD');
  const out: DayPoint[] = [];
  for (let d = from; compareYmd(d, to) < 0; d = addDays(d, 1)) {
    const key = ymdKey(d);
    out.push({ day: key, income: map.get(key)?.income ?? 0, expense: map.get(key)?.expense ?? 0 });
  }
  return out;
}

async function monthlySeries(userId: string, from: Ymd, to: Ymd, tz: string): Promise<MonthPoint[]> {
  const map = await bucketed(userId, rangeOf(from, to, tz), tz, 'YYYY-MM');
  const out: MonthPoint[] = [];
  for (let d = from; compareYmd(d, to) < 0; d = addMonths(d, 1)) {
    const key = monthKey(d);
    out.push({ month: key, income: map.get(key)?.income ?? 0, expense: map.get(key)?.expense ?? 0 });
  }
  return out;
}

async function largest(userId: string, r: Range, income: boolean, tz: string): Promise<NamedAmount | null> {
  const row = await db.expense.findFirst({
    where: { userId, category: income ? INCOME : { not: INCOME }, expenseDate: expenseDate(r) },
    orderBy: [{ amount: 'desc' }, { expenseDate: 'desc' }],
    select: { title: true, amount: true, expenseDate: true, category: true },
  });
  return row
    ? { title: row.title, amount: row.amount, day: ymdKey(toYmd(row.expenseDate, tz)), category: row.category }
    : null;
}

const lastDay = (endExclusive: Ymd) => addDays(endExclusive, -1);
const expensesHref = (from: Ymd, toExclusive: Ymd, category?: string) =>
  `/expenses?${new URLSearchParams({
    ...(category ? { category } : {}),
    dateRange: 'custom',
    startDate: ymdKey(from),
    endDate: ymdKey(lastDay(toExclusive)),
  })}`;

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getAnalytics(
  userId: string,
  tz: string,
  preset: RangePreset,
  from?: string | null,
  to?: string | null,
): Promise<AnalyticsData> {
  const period = resolvePeriod(preset, tz, from, to);
  const cur = rangeOf(period.start, period.end, tz);
  const prev = rangeOf(period.prevStart, period.prevEnd, tz);

  const [current, previous, cats, prevCats, daily, highestExpense, balance, moneySummary] = await Promise.all([
    flowTotals(userId, cur),
    flowTotals(userId, prev),
    categoryTotals(userId, cur),
    categoryTotals(userId, prev),
    dailySeries(userId, period.start, period.chartEnd, tz),
    largest(userId, cur, false, tz),
    db.balance.findUnique({ where: { userId }, select: { remainingBalance: true } }),
    getMoneySummary(userId),
  ]);

  const names = new Set([...cats.map((c) => c.name), ...prevCats.map((c) => c.name)]);
  const categories: CategoryRow[] = [...names]
    .map((name) => {
      const c = cats.find((x) => x.name === name);
      return {
        name,
        amount: c?.amount ?? 0,
        count: c?.count ?? 0,
        prevAmount: prevCats.find((x) => x.name === name)?.amount ?? 0,
        href: expensesHref(period.start, period.end, name),
      };
    })
    .sort((a, b) => b.amount - a.amount || b.prevAmount - a.prevAmount);

  const spendingDays = daily.filter((d) => d.expense > 0);
  const pick = (cmp: (a: DayPoint, b: DayPoint) => boolean) =>
    spendingDays.length ? spendingDays.reduce((a, b) => (cmp(b, a) ? b : a)) : null;
  const hi = pick((b, a) => b.expense > a.expense);
  const lo = pick((b, a) => b.expense < a.expense);

  const avgDaily = current.expense / period.elapsedDays;

  return {
    period: {
      preset: period.preset,
      label: period.label,
      prevLabel: period.prevLabel,
      from: ymdKey(period.start),
      to: ymdKey(lastDay(period.end)),
      elapsedDays: period.elapsedDays,
    },
    overview: {
      available: round2(balance?.remainingBalance ?? 0),
      income: current.income,
      expense: current.expense,
      net: round2(current.income - current.expense),
      lent: current.lent,
      receivable: moneySummary.receivable,
      borrowed: current.borrowed,
      payable: moneySummary.payable,
    },
    current,
    previous,
    categories,
    daily,
    stats: {
      avgDaily: round2(avgDaily),
      avgWeekly: period.elapsedDays >= 7 ? round2(avgDaily * 7) : null,
      avgMonthly: period.elapsedDays >= 28 ? round2((avgDaily * 365) / 12) : null,
      highestDay: hi && { day: hi.day, amount: hi.expense },
      lowestDay: lo && spendingDays.length > 1 ? { day: lo.day, amount: lo.expense } : null,
      highestExpense,
      expenseCount: current.expenseCount,
      avgTransaction: current.expenseCount ? round2(current.expense / current.expenseCount) : 0,
    },
    money: {
      ...moneySummary,
      lentInPeriod: current.lent,
      lentCountInPeriod: current.lentCount,
      repaidInPeriod: current.repaid,
      borrowedInPeriod: current.borrowed,
      borrowedCountInPeriod: current.borrowedCount,
      paidInPeriod: current.paidBack,
    },
    insights: buildInsights(
      {
        periodLabel: periodPhrase(period),
        prevLabel: period.prevLabel,
        current,
        previous,
        categories,
        spendingDays: spendingDays.map((d) => ({ day: d.day, amount: d.expense })),
        elapsedDays: period.elapsedDays,
        money: moneySummary,
        dayHref: (day) => `/expenses?dateRange=custom&startDate=${day}&endDate=${day}`,
      },
      8,
    ),
  };
}

function periodPhrase(p: Period) {
  switch (p.preset) {
    case 'today':
      return 'today';
    case 'week':
      return 'this week';
    case 'month':
      return 'this month';
    case 'year':
      return 'this year';
    case 'last-month':
      return `in ${p.label}`;
    case '3m':
      return 'over the last 3 months';
    case '6m':
      return 'over the last 6 months';
    default:
      return 'in this period';
  }
}

/** Compact insights for the dashboard: this month vs last month. */
export async function getDashboardInsights(userId: string, tz: string, limit = 4) {
  const data = await getAnalytics(userId, tz, 'month');
  return data.insights.slice(0, limit);
}

// ─── Monthly report ──────────────────────────────────────────────────────────

async function moneyMonth(
  userId: string,
  type: 'LENT' | 'BORROWED',
  r: Range,
  currentOutstanding: number,
): Promise<MoneyMonthSummary> {
  const [records, settled] = await Promise.all([
    db.moneyRecord.findMany({
      where: { userId, type, date: expenseDate(r) },
      select: { amount: true, paidAmount: true, status: true, dueDate: true },
    }),
    db.moneyPayment.aggregate({
      where: { moneyRecord: { userId, type }, paymentDate: expenseDate(r) },
      _sum: { amount: true },
    }),
  ]);
  const today = startOfToday();
  return {
    amount: round2(records.reduce((s, x) => s + x.amount, 0)),
    count: records.length,
    settled: round2(settled._sum.amount ?? 0),
    outstanding: round2(records.reduce((s, x) => s + remainingOf(x), 0)),
    currentOutstanding,
    paid: records.filter((x) => x.status === 'PAID').length,
    partial: records.filter((x) => x.status === 'PARTIALLY_PAID').length,
    pending: records.filter((x) => x.status === 'PENDING').length,
    overdue: records.filter((x) => x.status !== 'PAID' && x.dueDate && x.dueDate < today).length,
  };
}

async function dataYears(userId: string, tz: string, fallback: number) {
  const [e, m] = await Promise.all([
    db.expense.aggregate({ where: { userId }, _min: { expenseDate: true }, _max: { expenseDate: true } }),
    db.moneyRecord.aggregate({ where: { userId }, _min: { date: true }, _max: { date: true } }),
  ]);
  const dates = [e._min.expenseDate, e._max.expenseDate, m._min.date, m._max.date].filter(Boolean) as Date[];
  const years = dates.map((d) => toYmd(d, tz).y);
  const lo = Math.min(fallback, ...years);
  const hi = Math.max(fallback, ...years);
  return Array.from({ length: hi - lo + 1 }, (_, i) => hi - i);
}

export async function getMonthlyReport(userId: string, tz: string, year: number, monthIndex: number): Promise<MonthlyReport> {
  const first = normYmd(year, monthIndex, 1);
  const next = addMonths(first, 1);
  const r = rangeOf(first, next, tz);
  const today = toYmd(new Date(), tz);
  const isCurrentMonth = today.y === first.y && today.m === first.m;
  const chartEnd = isCurrentMonth ? addDays(today, 1) : next;

  const [balance, before, month, cats, daily, trend, highestExpense, highestIncome, summary, years] =
    await Promise.all([
      db.balance.findUnique({ where: { userId }, select: { totalBalance: true } }),
      flowTotals(userId, { end: r.start }),
      flowTotals(userId, r),
      categoryTotals(userId, r),
      dailySeries(userId, first, compareYmd(chartEnd, first) > 0 ? chartEnd : first, tz),
      monthlySeries(userId, addMonths(first, -5), next, tz),
      largest(userId, r, false, tz),
      largest(userId, r, true, tz),
      getMoneySummary(userId),
      dataYears(userId, tz, today.y),
    ]);

  const [lending, borrowing] = await Promise.all([
    moneyMonth(userId, 'LENT', r, summary.receivable),
    moneyMonth(userId, 'BORROWED', r, summary.payable),
  ]);

  // Opening = starting balance + everything that moved the balance before this month
  const opening = round2((balance?.totalBalance ?? 0) + balanceEffect(before));
  const lendBorrowNet = round2(-month.lent + month.borrowed + month.repaid - month.paidBack);
  const net = round2(month.income - month.expense);
  const closing = round2(opening + net + lendBorrowNet);

  const categories = cats.sort((a, b) => b.amount - a.amount);
  const spendingDays = daily.filter((d) => d.expense > 0);
  const hiDay = spendingDays.length ? spendingDays.reduce((a, b) => (b.expense > a.expense ? b : a)) : null;
  const daysForAverage = Math.max(1, daysBetween(first, isCurrentMonth ? addDays(today, 1) : next));
  const avgDaily = round2(month.expense / daysForAverage);
  const label = `${monthName(first.m)} ${first.y}`;

  const highlights: string[] = [];
  if (categories[0]) {
    const pctShare = Math.round((categories[0].amount / month.expense) * 100);
    highlights.push(`${categories[0].name} was your highest spending category (${formatMoney(categories[0].amount)}, ${pctShare}%).`);
  }
  if (hiDay) {
    highlights.push(
      `${formatYmd(hiDay.day, { weekday: 'long', month: 'short', day: 'numeric' })} was your highest spending day (${formatMoney(hiDay.expense)}).`,
    );
  }
  if (highestExpense) highlights.push(`Your largest expense was ${formatMoney(highestExpense.amount)} — ${highestExpense.title}.`);
  if (month.expense > 0) highlights.push(`Average daily expense was ${formatMoney(avgDaily)}.`);
  const txCount = month.incomeCount + month.expenseCount;
  if (txCount > 0) {
    highlights.push(
      `${txCount} transaction${txCount === 1 ? '' : 's'}: ${formatMoney(month.income)} income and ${formatMoney(month.expense)} expenses.`,
    );
    highlights.push(
      net >= 0
        ? `Net cash flow was positive: ${formatMoney(net)}.`
        : `Net cash flow was negative: expenses exceeded income by ${formatMoney(-net)}.`,
    );
  }
  if (lending.count || borrowing.count || month.repaid || month.paidBack) {
    highlights.push(
      `Lend & borrow moved ${lendBorrowNet >= 0 ? '+' : '−'}${formatMoney(lendBorrowNet)} through your balance (not counted as income or expense).`,
    );
  }

  return {
    month: { key: monthKey(first), label, year: first.y, index: first.m },
    generatedAt: new Date().toISOString(),
    isCurrentMonth,
    hasData: txCount > 0 || lending.count > 0 || borrowing.count > 0 || month.repaid > 0 || month.paidBack > 0,
    overview: { opening, income: month.income, expense: month.expense, net, lendBorrowNet, closing },
    expense: {
      total: month.expense,
      count: month.expenseCount,
      average: month.expenseCount ? round2(month.expense / month.expenseCount) : 0,
      avgDaily,
      highest: highestExpense,
      highestDay: hiDay && { day: hiDay.day, amount: hiDay.expense },
      categories,
    },
    income: {
      total: month.income,
      count: month.incomeCount,
      average: month.incomeCount ? round2(month.income / month.incomeCount) : 0,
      highest: highestIncome,
    },
    lending,
    borrowing,
    daily,
    trend,
    highlights,
    years,
  };
}
