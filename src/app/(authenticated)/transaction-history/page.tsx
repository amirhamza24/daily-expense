import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import TransactionHistoryClient, {
  type HistoryTab,
  type LedgerEntry,
} from "@/components/TransactionHistoryClient";
import PageHeader from "@/components/PageHeader";
import { History } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { getUserTimeZone } from "@/lib/finance";
import { toYmd, ymdKey } from "@/lib/dates";

export async function generateMetadata() {
  const { m } = await getI18n();
  return { title: m.history.metaTitle, description: m.history.metaDescription };
}

const TABS: HistoryTab[] = ["All", "Income", "Expense", "LendBorrow"];

export default async function TransactionHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getSession();

  if (!user || user.status !== "APPROVED") {
    redirect("/login");
  }

  const { m } = await getI18n();
  const { type } = await searchParams;
  const initialTab = TABS.find((t) => t.toLowerCase() === type?.toLowerCase()) ?? "All";

  // 1. Starting balance, expenses/income, and lend & borrow records with their payments
  const [balanceRecord, expenses, moneyRecords, tz] = await Promise.all([
    db.balance.findUnique({ where: { userId: user.id } }),
    db.expense.findMany({
      where: { userId: user.id },
      include: {
        splits: {
          select: { id: true, title: true, amount: true, date: true },
          orderBy: { position: "asc" },
        },
      },
    }),
    db.moneyRecord.findMany({
      where: { userId: user.id },
      include: {
        payments: { select: { id: true, amount: true, paymentDate: true, note: true, createdAt: true } },
      },
    }),
    getUserTimeZone(),
  ]);
  const startingBalance = balanceRecord?.totalBalance || 0;
  // Calendar days in the viewer's time zone, so the date filter is the same
  // on the server render and in the browser
  const dayOf = (d: Date) => ymdKey(toYmd(d, tz));

  // 2. One ledger of everything that moved the available balance
  const entries: LedgerEntry[] = [
    ...expenses.map((t) => ({
      id: `exp_${t.id}`,
      kind: t.category === "Income" ? ("income" as const) : ("expense" as const),
      title: t.title,
      amount: t.amount,
      category: t.category,
      note: t.note || "",
      date: t.expenseDate.toISOString(),
      day: dayOf(t.expenseDate),
      createdAt: t.createdAt.toISOString(),
      splits: t.splits,
      splitDays: t.splits.map((s) => dayOf(s.date ?? t.expenseDate)),
    })),
    ...moneyRecords.flatMap((r) => {
      const isLent = r.type === "LENT";
      const record: LedgerEntry = {
        id: `rec_${r.id}`,
        kind: isLent ? "lent" : "borrowed",
        title: isLent ? m.history.lentTo(r.personName) : m.history.borrowedFrom(r.personName),
        amount: r.amount,
        category: isLent ? "Lent" : "Borrowed",
        note: r.note || "",
        date: r.date.toISOString(),
        day: dayOf(r.date),
        createdAt: r.createdAt.toISOString(),
        splits: [],
        splitDays: [],
        person: r.personName,
      };
      const payments: LedgerEntry[] = r.payments.map((p) => ({
        id: `pay_${p.id}`,
        kind: isLent ? "repaid" : "paidback",
        title: isLent ? m.history.repaymentFrom(r.personName) : m.history.paidBackTo(r.personName),
        amount: p.amount,
        category: isLent ? "Repayment" : "Payment",
        note: p.note || "",
        date: p.paymentDate.toISOString(),
        day: dayOf(p.paymentDate),
        createdAt: p.createdAt.toISOString(),
        splits: [],
        splitDays: [],
        person: r.personName,
      }));
      return [record, ...payments];
    }),
  ];

  // 3. Oldest first, so the client can compute the running balance in order
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));

  return (
    <>
      <PageHeader
        icon={History}
        title={m.history.title}
        description={m.history.description}
      />

      <TransactionHistoryClient
        entries={entries}
        startingBalance={startingBalance}
        initialTab={initialTab}
        today={dayOf(new Date())}
      />
    </>
  );
}
