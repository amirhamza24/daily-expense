import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import TransactionHistoryClient from "@/components/TransactionHistoryClient";

export const metadata = {
  title: "Transaction History Ledger | Wallet Tracker",
  description: "View and filter your complete credit and debit ledger with real-time running balance.",
};

export default async function TransactionHistoryPage() {
  const user = await getSession();

  if (!user || user.status !== "APPROVED") {
    redirect("/login");
  }

  // 1. Fetch user's starting/initial balance
  const balanceRecord = await db.balance.findUnique({
    where: { userId: user.id },
  });
  const startingBalance = balanceRecord?.totalBalance || 0;

  // 2. Fetch all user transactions, ordered chronologically (oldest first)
  // to calculate the running balance sequentially starting from the oldest
  const transactions = await db.expense.findMany({
    where: { userId: user.id },
    orderBy: { expenseDate: "asc" },
  });

  // 3. Serialize date fields to avoid Next.js Client Component props serialization warnings
  const serializedTransactions = transactions.map((t) => ({
    id: t.id,
    title: t.title,
    amount: t.amount,
    category: t.category,
    note: t.note || "",
    expenseDate: t.expenseDate.toISOString(),
    createdAt: t.createdAt.toISOString(),
  }));

  return (
    <div className="flex flex-col gap-6 md:gap-8 w-full">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
          Transaction History
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Explore your complete account ledger with chronological running balances, filters, and transaction types.
        </p>
      </div>

      <TransactionHistoryClient
        transactions={serializedTransactions}
        startingBalance={startingBalance}
      />
    </div>
  );
}
