import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import {
  MONEY_DATE_RANGES,
  MONEY_SORTS,
  MONEY_STATUS_FILTERS,
  displayStatus,
  isMoneyType,
  remainingOf,
  round2,
  startOfToday,
  type MoneyDateRange,
  type MoneyRecordView,
  type MoneySort,
  type MoneyStatusFilter,
  type MoneySummary,
  type MoneyType,
} from '@/lib/money';

/** Server-only read helpers for lending & borrowing (pages call these with the session user id). */

export type MoneyFilters = {
  type?: MoneyType;
  status?: MoneyStatusFilter;
  person?: string;
  dateRange?: MoneyDateRange;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sortBy?: MoneySort;
  page?: number;
  limit?: number;
};

const pick = <T extends string>(allowed: readonly T[], v: string | undefined) =>
  allowed.includes(v as T) ? (v as T) : undefined;

const toAmount = (v: string | undefined) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Turns raw URL search params into validated filters (unknown values are dropped). */
export function parseMoneyFilters(params: Record<string, string | undefined>): MoneyFilters {
  const page = parseInt(params.page ?? '', 10);
  return {
    type: isMoneyType(params.type) ? params.type : undefined,
    status: pick(MONEY_STATUS_FILTERS, params.status),
    person: params.person?.trim() || undefined,
    dateRange: pick(MONEY_DATE_RANGES, params.dateRange),
    startDate: params.startDate,
    endDate: params.endDate,
    minAmount: toAmount(params.minAmount),
    maxAmount: toAmount(params.maxAmount),
    sortBy: pick(MONEY_SORTS, params.sortBy),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

function statusWhere(status: MoneyStatusFilter, today: Date): Prisma.MoneyRecordWhereInput {
  const notOverdue: Prisma.MoneyRecordWhereInput = {
    OR: [{ dueDate: null }, { dueDate: { gte: today } }],
  };
  switch (status) {
    case 'PENDING':
    case 'PARTIALLY_PAID':
      // Overdue takes priority in the UI, so exclude overdue rows here
      return { AND: [{ status }, notOverdue] };
    case 'PAID':
      return { status: 'PAID' };
    case 'OVERDUE':
      return { status: { not: 'PAID' }, dueDate: { lt: today } };
    case 'OPEN':
      return { status: { not: 'PAID' } };
  }
}

function dateWhere(f: MoneyFilters): Prisma.DateTimeFilter | undefined {
  const now = new Date();
  const today = startOfToday(now);
  switch (f.dateRange) {
    case 'today': {
      const end = new Date(today);
      end.setHours(23, 59, 59, 999);
      return { gte: today, lte: end };
    }
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay()); // since Sunday
      return { gte: start };
    }
    case 'month':
      return { gte: new Date(now.getFullYear(), now.getMonth(), 1) };
    case 'custom': {
      if (!f.startDate && !f.endDate) return undefined;
      const range: Prisma.DateTimeFilter = {};
      if (f.startDate && !isNaN(Date.parse(f.startDate))) {
        const start = new Date(f.startDate);
        start.setHours(0, 0, 0, 0);
        range.gte = start;
      }
      if (f.endDate && !isNaN(Date.parse(f.endDate))) {
        const end = new Date(f.endDate);
        end.setHours(23, 59, 59, 999);
        range.lte = end;
      }
      return range;
    }
    default:
      return undefined;
  }
}

export function buildMoneyWhere(userId: string, f: MoneyFilters): Prisma.MoneyRecordWhereInput {
  const and: Prisma.MoneyRecordWhereInput[] = [{ userId }];

  if (f.type) and.push({ type: f.type });
  if (f.status) and.push(statusWhere(f.status, startOfToday()));
  if (f.person) and.push({ personName: { contains: f.person, mode: 'insensitive' } });

  const date = dateWhere(f);
  if (date) and.push({ date });

  if (f.minAmount !== undefined || f.maxAmount !== undefined) {
    and.push({ amount: { gte: f.minAmount, lte: f.maxAmount } });
  }

  return { AND: and };
}

function orderByFor(sort: MoneySort = 'latest'): Prisma.MoneyRecordOrderByWithRelationInput[] {
  switch (sort) {
    case 'oldest':
      return [{ date: 'asc' }, { createdAt: 'asc' }];
    case 'highest':
      return [{ amount: 'desc' }, { date: 'desc' }];
    case 'lowest':
      return [{ amount: 'asc' }, { date: 'desc' }];
    case 'due':
      return [{ dueDate: { sort: 'asc', nulls: 'last' } }, { date: 'desc' }];
    case 'person':
      return [{ personName: 'asc' }, { date: 'desc' }];
    default:
      return [{ date: 'desc' }, { createdAt: 'desc' }];
  }
}

export const moneyRecordInclude = {
  payments: {
    select: { id: true, amount: true, paymentDate: true, note: true },
    orderBy: [{ paymentDate: 'desc' }, { createdAt: 'desc' }],
  },
} satisfies Prisma.MoneyRecordInclude;

type RecordWithPayments = Prisma.MoneyRecordGetPayload<{ include: typeof moneyRecordInclude }>;

export function toMoneyRecordView(r: RecordWithPayments, now = new Date()): MoneyRecordView {
  return {
    id: r.id,
    type: r.type,
    personName: r.personName,
    amount: r.amount,
    paidAmount: r.paidAmount,
    date: r.date,
    dueDate: r.dueDate,
    note: r.note,
    status: r.status,
    displayStatus: displayStatus(r, now),
    payments: r.payments,
  };
}

/** Distinct names the user has recorded, for autocomplete. */
export async function listMoneyPeople(userId: string) {
  const rows = await db.moneyRecord.findMany({
    where: { userId },
    distinct: ['personName'],
    select: { personName: true },
    orderBy: { personName: 'asc' },
    take: 200,
  });
  return rows.map((r) => r.personName);
}

export async function listMoneyRecords(userId: string, f: MoneyFilters) {
  const page = f.page ?? 1;
  const limit = f.limit ?? 10;
  const where = buildMoneyWhere(userId, f);

  const [records, total] = await Promise.all([
    db.moneyRecord.findMany({
      where,
      orderBy: orderByFor(f.sortBy),
      skip: (page - 1) * limit,
      take: limit,
      include: moneyRecordInclude,
    }),
    db.moneyRecord.count({ where }),
  ]);

  const now = new Date();
  return {
    records: records.map((r) => toMoneyRecordView(r, now)),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Totals over all of the user's records (independent of page filters). */
export async function getMoneySummary(userId: string): Promise<MoneySummary> {
  const today = startOfToday();
  const [totals, active, overdue] = await Promise.all([
    db.moneyRecord.groupBy({
      by: ['type'],
      where: { userId },
      _sum: { amount: true, paidAmount: true },
      _count: { _all: true },
    }),
    db.moneyRecord.groupBy({
      by: ['type'],
      where: { userId, status: { not: 'PAID' } },
      _count: { _all: true },
    }),
    db.moneyRecord.groupBy({
      by: ['type'],
      where: { userId, status: { not: 'PAID' }, dueDate: { lt: today } },
      _count: { _all: true },
    }),
  ]);

  const sumFor = (type: MoneyType) => {
    const row = totals.find((t) => t.type === type);
    const amount = row?._sum.amount ?? 0;
    const paidAmount = row?._sum.paidAmount ?? 0;
    return { total: round2(amount), outstanding: remainingOf({ amount, paidAmount }) };
  };
  const countIn = (rows: typeof active, type: MoneyType) =>
    rows.find((r) => r.type === type)?._count._all ?? 0;

  const lent = sumFor('LENT');
  const borrowed = sumFor('BORROWED');
  const overdueLending = countIn(overdue, 'LENT');
  const overdueBorrowing = countIn(overdue, 'BORROWED');

  return {
    totalLent: lent.total,
    receivable: lent.outstanding,
    totalBorrowed: borrowed.total,
    payable: borrowed.outstanding,
    activeLending: countIn(active, 'LENT'),
    activeBorrowing: countIn(active, 'BORROWED'),
    overdueLending,
    overdueBorrowing,
    overdue: overdueLending + overdueBorrowing,
    recordCount: totals.reduce((n, t) => n + t._count._all, 0),
  };
}
