"use server";

import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { formatMoney } from "@/lib/format";
import {
  isMoneyType,
  moneyTerms,
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

class ConflictError extends Error {
  constructor() {
    super("This record was changed by another request. Please refresh and try again.");
  }
}

async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session || session.status !== "APPROVED") {
    throw new Error("Unauthorized or account not approved.");
  }
  return session;
}

function parseDate(value: string | null | undefined, field: string) {
  const d = value ? new Date(value) : null;
  if (!d || isNaN(d.getTime())) throw new Error(`${field} is not a valid date.`);
  return d;
}

function parseAmount(value: unknown, field = "Amount") {
  const amount = round2(Number(value));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(`${field} must be a positive number greater than zero.`);
  }
  if (amount > 1_000_000_000) throw new Error(`${field} is too large.`);
  return amount;
}

function normalizeRecord(data: MoneyRecordInput) {
  if (!isMoneyType(data.type)) throw new Error("Choose whether you lent or borrowed.");

  const personName = (data.personName ?? "").trim().replace(/\s+/g, " ");
  if (!personName) throw new Error("Person name is required.");
  if (personName.length > 80) throw new Error("Person name must be 80 characters or fewer.");

  const amount = parseAmount(data.amount);
  const date = parseDate(data.date, "Date");
  const dueDate = data.dueDate ? parseDate(data.dueDate, "Due date") : null;
  if (dueDate && dueDate.toDateString() !== date.toDateString() && dueDate < date) {
    throw new Error("Due date can't be before the date of the record.");
  }

  const note = data.note?.trim().slice(0, 300) || null;
  return { type: data.type, personName, amount, date, dueDate, note };
}

/**
 * Moves available balance by `delta` (negative = money out). Rejects moves that
 * would make it negative, mirroring the expense rules. Uses a compare-and-set
 * update so two concurrent requests can't both spend the same balance.
 */
const NEGATIVE = "This change would make your available balance negative";

async function applyBalanceDelta(tx: Tx, userId: string, delta: number, reason: string) {
  if (delta === 0) return;

  let balance = await tx.balance.findUnique({ where: { userId } });
  if (!balance) {
    balance = await tx.balance.create({
      data: { userId, totalBalance: 0, remainingBalance: 0, note: "Auto-created balance" },
    });
  }

  const next = round2(balance.remainingBalance + delta);
  if (next < 0) {
    throw new Error(
      `Insufficient balance. ${reason} (available: ${formatMoney(balance.remainingBalance)}).`,
    );
  }

  const { count } = await tx.balance.updateMany({
    where: { userId, remainingBalance: balance.remainingBalance },
    data: { remainingBalance: next },
  });
  if (count !== 1) throw new ConflictError();
}

async function findOwnedRecord(tx: Tx, userId: string, id: string) {
  const record = await tx.moneyRecord.findFirst({ where: { id, userId } });
  if (!record) throw new Error("Record not found.");
  return record;
}

/** Writes new paid total + status, failing if the record changed since it was read. */
async function setPaidAmount(
  tx: Tx,
  record: { id: string; amount: number; paidAmount: number; updatedAt: Date },
  paidAmount: number,
) {
  const { count } = await tx.moneyRecord.updateMany({
    where: { id: record.id, paidAmount: record.paidAmount, updatedAt: record.updatedAt },
    data: { paidAmount, status: settlementStatus(record.amount, paidAmount) },
  });
  if (count !== 1) throw new ConflictError();
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

  try {
    if (!Array.isArray(items) || items.length === 0) throw new Error("Add at least one person.");
    if (items.length > MAX_BATCH) throw new Error(`You can add up to ${MAX_BATCH} people at once.`);

    const inputs = items.map(normalizeRecord);
    const type = inputs[0].type;
    if (inputs.some((i) => i.type !== type)) throw new Error("All entries must be the same type.");

    const total = round2(inputs.reduce((sum, i) => sum + i.amount, 0));

    const records = await db.$transaction(async (tx) => {
      await applyBalanceDelta(
        tx,
        user.id,
        type === "LENT" ? -total : total,
        "You can't lend more than your available balance",
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
    return fail("createMoneyRecords", error, "Failed to save record.");
  }
}

export async function updateMoneyRecord(id: string, data: MoneyRecordInput) {
  const user = await getAuthenticatedUser();

  try {
    const input = normalizeRecord(data);

    const record = await db.$transaction(async (tx) => {
      const old = await findOwnedRecord(tx, user.id, id);

      if (input.type !== old.type) {
        throw new Error("The type of a record can't be changed. Delete it and add a new one instead.");
      }
      if (input.amount < old.paidAmount) {
        const settled = moneyTerms[old.type].settled.toLowerCase();
        throw new Error(
          `Amount can't be less than the ${formatMoney(old.paidAmount)} already ${settled}.`,
        );
      }

      // Only the change in the original amount affects the balance
      const diff = round2(input.amount - old.amount);
      await applyBalanceDelta(
        tx,
        user.id,
        old.type === "LENT" ? -diff : diff,
        old.type === "LENT" ? "You can't lend more than your available balance" : NEGATIVE,
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
      if (count !== 1) throw new ConflictError();

      return tx.moneyRecord.findUniqueOrThrow({ where: { id } });
    });

    revalidateMoney();
    return { success: true as const, record };
  } catch (error) {
    return fail("updateMoneyRecord", error, "Failed to update record.");
  }
}

export async function deleteMoneyRecord(id: string) {
  const user = await getAuthenticatedUser();

  try {
    await db.$transaction(async (tx) => {
      const old = await findOwnedRecord(tx, user.id, id);

      // Undo the record and all of its payments: only the outstanding part is still "moved"
      const outstanding = remainingOf(old);
      await applyBalanceDelta(
        tx,
        user.id,
        old.type === "LENT" ? outstanding : -outstanding,
        NEGATIVE,
      );

      const { count } = await tx.moneyRecord.deleteMany({
        where: { id, userId: user.id, updatedAt: old.updatedAt },
      });
      if (count !== 1) throw new ConflictError();
    });

    revalidateMoney();
    return { success: true as const };
  } catch (error) {
    return fail("deleteMoneyRecord", error, "Failed to delete record.");
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

  try {
    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) throw new Error("Choose at least one record and enter an amount.");
    if (items.length > MAX_BATCH) throw new Error(`You can settle up to ${MAX_BATCH} records at once.`);
    if (new Set(items.map((i) => i.recordId)).size !== items.length) {
      throw new Error("Each record can only appear once.");
    }

    const parsed = items.map((i) => ({ recordId: String(i.recordId), amount: parseAmount(i.amount) }));
    const paymentDate = parseDate(data.paymentDate, "Payment date");
    const note = data.note?.trim().slice(0, 300) || null;

    const records = await db.$transaction(async (tx) => {
      let delta = 0;
      const touched = [];

      for (const item of parsed) {
        const record = await findOwnedRecord(tx, user.id, item.recordId);
        const terms = moneyTerms[record.type];
        const remaining = remainingOf(record);
        const who = parsed.length > 1 ? ` for ${record.personName}` : "";

        if (remaining <= 0) throw new Error(`The record${who} is already fully paid.`);
        if (item.amount > remaining) {
          throw new Error(
            `${terms.payment}${who} can't be more than the remaining ${formatMoney(remaining)}.`,
          );
        }
        if (paymentDate.toDateString() !== record.date.toDateString() && paymentDate < record.date) {
          throw new Error(`${terms.payment} date can't be before the ${terms.label.toLowerCase()} date${who}.`);
        }

        await setPaidAmount(tx, record, round2(record.paidAmount + item.amount));
        await tx.moneyPayment.create({
          data: { moneyRecordId: record.id, amount: item.amount, paymentDate, note },
        });

        // Repayment received → money in; payment made → money out
        delta += record.type === "LENT" ? item.amount : -item.amount;
        touched.push(record.id);
      }

      await applyBalanceDelta(
        tx,
        user.id,
        round2(delta),
        "You can't pay back more than your available balance",
      );

      return tx.moneyRecord.findMany({ where: { id: { in: touched } } });
    });

    revalidateMoney();
    return { success: true as const, records };
  } catch (error) {
    return fail("recordMoneyPayments", error, "Failed to record payment.");
  }
}

/** Data for the lend/borrow options of the "New transaction" dialog. */
export async function getMoneyEntryData() {
  const user = await getAuthenticatedUser();

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
    return fail("getMoneyEntryData", error, "Couldn't load your lend & borrow records.");
  }
}

export async function deleteMoneyPayment(paymentId: string) {
  const user = await getAuthenticatedUser();

  try {
    await db.$transaction(async (tx) => {
      const payment = await tx.moneyPayment.findFirst({
        where: { id: paymentId, moneyRecord: { userId: user.id } },
        include: { moneyRecord: true },
      });
      if (!payment) throw new Error("Payment not found.");
      const record = payment.moneyRecord;

      // Reverse the balance move of this payment
      await applyBalanceDelta(
        tx,
        user.id,
        record.type === "LENT" ? -payment.amount : payment.amount,
        NEGATIVE,
      );
      await setPaidAmount(tx, record, Math.max(0, round2(record.paidAmount - payment.amount)));
      await tx.moneyPayment.delete({ where: { id: payment.id } });
    });

    revalidateMoney();
    return { success: true as const };
  } catch (error) {
    return fail("deleteMoneyPayment", error, "Failed to delete payment.");
  }
}
