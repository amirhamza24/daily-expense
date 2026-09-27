import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import TransactionHistoryClient from "@/components/TransactionHistoryClient";
import PageHeader from "@/components/PageHeader";
import { History } from "lucide-react";

export const metadata = {
  title: "Transaction History Ledger | Wallet Tracker",
  description:
    "View and filter your complete credit and debit ledger with real-time running balance.",
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
    include: {
      splits: {
        select: { id: true, title: true, amount: true },
        orderBy: { position: "asc" },
      },
    },
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
    splits: t.splits,
  }));

  return (
    <>
      <PageHeader
        icon={History}
        title="Transaction history"
        description="Your complete ledger with a running balance after every entry."
      />

      <TransactionHistoryClient
        transactions={serializedTransactions}
        startingBalance={startingBalance}
      />
    </>
  );
}
