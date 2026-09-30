"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { formatMoney } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import {
  isMoneyType,
  remainingOf,
  round2,
  settlementStatus,
  type MoneyType,
} from "@/lib/money";

/*
 * Lending & borrowing mutations.
 *
 * Balance effects (Balance.remainingBalance = available cash):
 *   Lend X            → −X   (money left my wallet; tracked as receivable)
 *   Repayment Y in    → +Y   (receivable shrinks by Y)
 *   Borrow X          → +X   (money entered my wallet; tracked as payable, not income)
 *   Payment Y out     → −Y   (payable shrinks by Y)
 * None of these touch the Expense table, so they never count as income or spending.
 */

export type MoneyRecordInput = {
  type: MoneyType;
  personName: string;
  amount: number;
  date: string; // ISO string
  dueDate?: string | null; // ISO string
  note?: string;
};

export type MoneyPaymentInput = {
  amount: number;
  paymentDate: string; // ISO string
  note?: string;
};

type Tx = Prisma.TransactionClient;

// Server messages follow the caller's UI language (request cookie).
type I18n = { m: Messages; locale: Locale };

class ConflictError extends Error {
  constructor(m: Messages) {
    super(m.moneyServer.conflict);
  }
}

async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session || session.status !== "APPROVED") {
    throw new Error((await getI18n()).m.expenseServer.notApproved);
  }
  return session;
}

function parseDate(m: Messages, value: string | null | undefined, field: string) {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) throw new Error(m.moneyServer.invalidDate(field));
  return d;
}

function parseAmount(m: Messages, value: unknown, field = m.moneyServer.fieldAmount) {
  const amount = round2(Number(value));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(m.moneyServer.mustBePositive(field));
  }
  if (amount > 1_000_000_000) throw new Error(m.moneyServer.tooLarge(field));
  return amount;
}

function normalizeRecord(m: Messages, data: MoneyRecordInput) {
  if (!isMoneyType(data.type)) throw new Error(m.moneyServer.chooseType);

  const personName = (data.personName ?? "").trim().replace(/\s+/g, " ");
  if (!personName) throw new Error(m.moneyServer.personRequired);
  if (personName.length > 80) throw new Error(m.moneyServer.personTooLong);

  const amount = parseAmount(m, data.amount);
  const date = parseDate(m, data.date, m.moneyServer.fieldDate);
  const dueDate = data.dueDate ? parseDate(m, data.dueDate, m.moneyServer.fieldDueDate) : null;
  if (dueDate && dueDate.toDateString() !== date.toDateString() && dueDate < date) {
    throw new Error(m.moneyServer.dueBeforeDate);
  }

  const note = data.note?.trim().slice(0, 300) || null;
  return { type: data.type, personName, amount, date, dueDate, note };
}

/**
 * Moves available balance by `delta` (negative = money out). Rejects moves that
 * would make it negative, mirroring the expense rules. Uses a compare-and-set
 * update so two concurrent requests can't both spend the same balance.
 */
async function applyBalanceDelta(tx: Tx, { m, locale }: I18n, userId: string, delta: number, reason: string) {
  if (delta === 0) return;

  let balance = await tx.balance.findUnique({ where: { userId } });
  if (!balance) {
    balance = await tx.balance.create({
      data: { userId, totalBalance: 0, remainingBalance: 0, note: "Auto-created balance" },
    });
  }

  const next = round2(balance.remainingBalance + delta);
  if (next < 0) {
    throw new Error(m.moneyServer.insufficient(reason, formatMoney(balance.remainingBalance, locale)));
  }

  const { count } = await tx.balance.updateMany({
    where: { userId, remainingBalance: balance.remainingBalance },
    data: { remainingBalance: next },
  });
  if (count !== 1) throw new ConflictError(m);
}

async function findOwnedRecord(tx: Tx, m: Messages, userId: string, id: string) {
  const record = await tx.moneyRecord.findFirst({ where: { id, userId } });
  if (!record) throw new Error(m.moneyServer.notFound);
  return record;
}

/** Writes new paid total + status, failing if the record changed since it was read. */
async function setPaidAmount(
  tx: Tx,
  m: Messages,
  record: { id: string; amount: number; paidAmount: number; updatedAt: Date },
  paidAmount: number,
) {
  const { count } = await tx.moneyRecord.updateMany({
    where: { id: record.id, paidAmount: record.paidAmount, updatedAt: record.updatedAt },
    data: { paidAmount, status: settlementStatus(record.amount, paidAmount) },
  });
  if (count !== 1) throw new ConflictError(m);
}

function revalidateMoney() {
  revalidatePath("/lend-borrow");
  revalidatePath("/dashboard");
  revalidatePath("/transaction-history");
}

function fail(scope: string, error: unknown, fallback: string) {
  const err = error as Error;
  console.error(`${scope} error:`, err);
  return { success: false as const, error: err.message || fallback };
}

// ─── Records ─────────────────────────────────────────────────────────────────

const MAX_BATCH = 20;

export async function createMoneyRecord(data: MoneyRecordInput) {
  const res = await createMoneyRecords([data]);
  return res.success ? { success: true as const, record: res.records[0] } : res;
}

/**
 * Creates several records of the same type at once — e.g. lending 6,000 split
 * between three people. All-or-nothing: the balance is checked against the total.
 */
export async function createMoneyRecords(items: MoneyRecordInput[]) {
  const user = await getAuthenticatedUser();
  const i18n = await getI18n();
  const { m } = i18n;

  try {
    if (!Array.isArray(items) || items.length === 0) throw new Error(m.moneyServer.addOne);
    if (items.length > MAX_BATCH) throw new Error(m.moneyServer.maxPeople(MAX_BATCH));

    const inputs = items.map((item) => normalizeRecord(m, item));
    const type = inputs[0].type;
    if (inputs.some((i) => i.type !== type)) throw new Error(m.moneyServer.sameType);

    const total = round2(inputs.reduce((sum, i) => sum + i.amount, 0));

    const records = await db.$transaction(async (tx) => {
      await applyBalanceDelta(
        tx,
        i18n,
        user.id,
        type === "LENT" ? -total : total,
        type === "LENT" ? m.moneyServer.cantLendMore : m.moneyServer.negative,
      );
      const created = [];
      for (const input of inputs) {
        created.push(
          await tx.moneyRecord.create({
            data: { ...input, userId: user.id, paidAmount: 0, status: "PENDING" },
          }),
        );
      }
      return created;
    });

    revalidateMoney();
    return { success: true as const, records };
  } catch (error) {
    return fail("createMoneyRecords", error, m.moneyServer.saveFailed);
  }
}

export async function updateMoneyRecord(id: string, data: MoneyRecordInput) {
  const user = await getAuthenticatedUser();
  const i18n = await getI18n();
  const { m, locale } = i18n;

  try {
    const input = normalizeRecord(m, data);

    const record = await db.$transaction(async (tx) => {
      const old = await findOwnedRecord(tx, m, user.id, id);

      if (input.type !== old.type) {
        throw new Error(m.moneyServer.typeLocked);
      }
      if (input.amount < old.paidAmount) {
        throw new Error(
          m.moneyServer.amountBelowSettled(formatMoney(old.paidAmount, locale), m.moneyTerms[old.type].settled),
        );
      }

      // Only the change in the original amount affects the balance
      const diff = round2(input.amount - old.amount);
      await applyBalanceDelta(
        tx,
        i18n,
        user.id,
        old.type === "LENT" ? -diff : diff,
        old.type === "LENT" ? m.moneyServer.cantLendMore : m.moneyServer.negative,
      );

      const { count } = await tx.moneyRecord.updateMany({
        where: { id, userId: user.id, updatedAt: old.updatedAt },
        data: {
          personName: input.personName,
          amount: input.amount,
          date: input.date,
          dueDate: input.dueDate,
          note: input.note,
          status: settlementStatus(input.amount, old.paidAmount),
        },
      });
      if (count !== 1) throw new ConflictError(m);

      return tx.moneyRecord.findUniqueOrThrow({ where: { id } });
    });

    revalidateMoney();
    return { success: true as const, record };
  } catch (error) {
    return fail("updateMoneyRecord", error, m.moneyServer.updateFailed);
  }
}

export async function deleteMoneyRecord(id: string) {
  const user = await getAuthenticatedUser();
  const i18n = await getI18n();
  const { m } = i18n;

  try {
    await db.$transaction(async (tx) => {
      const old = await findOwnedRecord(tx, m, user.id, id);

      // Undo the record and all of its payments: only the outstanding part is still "moved"
      const outstanding = remainingOf(old);
      await applyBalanceDelta(
        tx,
        i18n,
        user.id,
        old.type === "LENT" ? outstanding : -outstanding,
        m.moneyServer.negative,
      );

      const { count } = await tx.moneyRecord.deleteMany({
        where: { id, userId: user.id, updatedAt: old.updatedAt },
      });
      if (count !== 1) throw new ConflictError(m);
    });

    revalidateMoney();
    return { success: true as const };
  } catch (error) {
    return fail("deleteMoneyRecord", error, m.moneyServer.deleteFailed);
  }
}

// ─── Payments / repayments ───────────────────────────────────────────────────

export async function recordMoneyPayment(recordId: string, data: MoneyPaymentInput) {
  const res = await recordMoneyPayments({
    items: [{ recordId, amount: data.amount }],
    paymentDate: data.paymentDate,
    note: data.note,
  });
  return res.success ? { success: true as const, record: res.records[0] } : res;
}

export type MoneyPaymentsBatchInput = {
  items: Array<{ recordId: string; amount: number }>;
  paymentDate: string; // ISO string
  note?: string;
};

/**
 * Records repayments/payments against one or more records in one go — e.g.
 * paying back three people from the same transaction. All-or-nothing.
 */
export async function recordMoneyPayments(data: MoneyPaymentsBatchInput) {
  const user = await getAuthenticatedUser();
  const i18n = await getI18n();
  const { m, locale } = i18n;

  try {
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) throw new Error(m.moneyServer.chooseRecord);
    if (items.length > MAX_BATCH) throw new Error(m.moneyServer.maxRecords(MAX_BATCH));
    if (new Set(items.map((i) => i.recordId)).size !== items.length) {
      throw new Error(m.moneyServer.onceEach);
    }

    const parsed = items.map((i) => ({ recordId: String(i.recordId), amount: parseAmount(m, i.amount) }));
    const paymentDate = parseDate(m, data.paymentDate, m.moneyServer.fieldPaymentDate);
    const note = data.note?.trim().slice(0, 300) || null;

    const records = await db.$transaction(async (tx) => {
      let delta = 0;
      const touched = [];

      for (const item of parsed) {
        const record = await findOwnedRecord(tx, m, user.id, item.recordId);
        const terms = m.moneyTerms[record.type];
        const remaining = remainingOf(record);
        const who = parsed.length > 1 ? m.moneyServer.forPerson(record.personName) : "";

        if (remaining <= 0) throw new Error(m.moneyServer.alreadyPaid(who));
        if (item.amount > remaining) {
          throw new Error(m.moneyServer.paymentTooMuch(terms.payment, who, formatMoney(remaining, locale)));
        }
        if (paymentDate.toDateString() !== record.date.toDateString() && paymentDate < record.date) {
          throw new Error(m.moneyServer.paymentBeforeDate(terms.payment, terms.label, who));
        }

        await setPaidAmount(tx, m, record, round2(record.paidAmount + item.amount));
        await tx.moneyPayment.create({
          data: { moneyRecordId: record.id, amount: item.amount, paymentDate, note },
        });

        // Repayment received → money in; payment made → money out
        delta += record.type === "LENT" ? item.amount : -item.amount;
        touched.push(record.id);
      }

      await applyBalanceDelta(tx, i18n, user.id, round2(delta), m.moneyServer.cantPayMore);

      return tx.moneyRecord.findMany({ where: { id: { in: touched } } });
    });

    revalidateMoney();
    return { success: true as const, records };
  } catch (error) {
    return fail("recordMoneyPayments", error, m.moneyServer.recordPaymentFailed);
  }
}

/** Data for the lend/borrow options of the "New transaction" dialog. */
export async function getMoneyEntryData() {
  const user = await getAuthenticatedUser();
  const { m } = await getI18n();

  try {
    const [open, people] = await Promise.all([
      db.moneyRecord.findMany({
        where: { userId: user.id, status: { not: "PAID" } },
        orderBy: [{ personName: "asc" }, { date: "asc" }],
        select: {
          id: true,
          type: true,
          personName: true,
          amount: true,
          paidAmount: true,
          date: true,
          dueDate: true,
          note: true,
        },
        take: 300,
      }),
      db.moneyRecord.findMany({
        where: { userId: user.id },
        distinct: ["personName"],
        select: { personName: true },
        orderBy: { personName: "asc" },
        take: 200,
      }),
    ]);
    return {
      success: true as const,
      open: open.map((r) => ({ ...r, remaining: remainingOf(r) })),
      people: people.map((p) => p.personName),
    };
  } catch (error) {
    return fail("getMoneyEntryData", error, m.moneyServer.loadFailed);
  }
}

export async function deleteMoneyPayment(paymentId: string) {
  const user = await getAuthenticatedUser();
  const i18n = await getI18n();
  const { m } = i18n;

  try {
    await db.$transaction(async (tx) => {
      const payment = await tx.moneyPayment.findFirst({
        where: { id: paymentId, moneyRecord: { userId: user.id } },
        include: { moneyRecord: true },
      });
      if (!payment) throw new Error(m.moneyServer.paymentNotFound);
      const record = payment.moneyRecord;

      // Reverse the balance move of this payment
      await applyBalanceDelta(
        tx,
        i18n,
        user.id,
        record.type === "LENT" ? -payment.amount : payment.amount,
        m.moneyServer.negative,
      );
      await setPaidAmount(tx, m, record, Math.max(0, round2(record.paidAmount - payment.amount)));
      await tx.moneyPayment.delete({ where: { id: payment.id } });
    });

    revalidateMoney();
    return { success: true as const };
  } catch (error) {
    return fail("deleteMoneyPayment", error, m.moneyServer.deletePaymentFailed);
  }
}
