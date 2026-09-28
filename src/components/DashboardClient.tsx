"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingDown,
  Clock,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  CalendarDays,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  LayoutDashboard,
  ArrowDownLeft,
} from "lucide-react";
import type { MoneySummary } from "@/lib/money";
import type { Insight } from "@/lib/insights";
import InsightsCard from "./InsightsCard";
import ExpenseModal from "./ExpenseModal";
import ExpenseDetailsModal from "./ExpenseDetailsModal";
import PageHeader from "./PageHeader";
import AnimatedNumber from "./AnimatedNumber";
import { deleteExpense } from "@/actions/expenses";
import { useToast } from "./Toast";
import { useConfirm, confirmPresets } from "./ConfirmModal";
import { getCategoryIcon, getCategoryGlow } from "@/lib/categories";
import { formatDate, formatMoney } from "@/lib/format";
import type { ExpenseSplitView } from "./SplitBreakdown";

// Re-exported for existing imports
export { getCategoryIcon, getCategoryGlow };

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  note: string | null;
  expenseDate: Date;
  splits: ExpenseSplitView[];
}

interface DashboardClientProps {
  stats: {
    totalBalance: number;
    remainingBalance: number;
    totalExpenses: number;
    monthlyExpenses: number;
    todayExpenses: number;
    balanceNote?: string;
    monthlyCredit: number;
    monthlyDebit: number;
    monthlyRemaining: number;
  };
  recentExpenses: ExpenseItem[];
  /** Null when the lending summary couldn't be loaded; the panel is then hidden. */
  moneySummary: MoneySummary | null;
  /** Null when insights couldn't be computed; the card is then hidden. */
  insights: Insight[] | null;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  featured = false,
  deco = "",
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  featured?: boolean;
  /** Gradient tint for non-featured cards, e.g. "deco-blue". */
  deco?: string;
}) {
  return (
    <div className={`card card-interactive p-4 md:p-5 ${featured ? "card-feature" : `card-deco ${deco}`}`}>
      <div className="flex items-center justify-between">
        <span className={`stat-label ${featured ? "opacity-80" : ""}`}>{label}</span>
        <span
          className={`icon-tile h-8 w-8 rounded-lg ${featured ? "bg-white/15! text-white! ring-1 ring-white/20" : ""}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="stat-value mt-3">
        {value < 0 && "−"}
        <AnimatedNumber value={value} format={(n) => formatMoney(n)} />
      </p>
      <p className={`text-xs mt-1 ${featured ? "text-white/70" : "text-faint"}`}>{hint}</p>
    </div>
  );
}

function LendBorrowOverview({ summary }: { summary: MoneySummary }) {
  const counts = [
    { label: "Active lending", deco: "deco-teal", value: summary.activeLending, href: "/lend-borrow?type=LENT&status=OPEN" },
    { label: "Active borrowing", deco: "deco-orange", value: summary.activeBorrowing, href: "/lend-borrow?type=BORROWED&status=OPEN" },
    { label: "Overdue", deco: "deco-rose", value: summary.overdue, href: "/lend-borrow?status=OVERDUE", danger: summary.overdue > 0 },
  ];

  return (
    <section className="card overflow-hidden">
      <div className="card-head flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="section-title">Lend &amp; borrow</h2>
          <p className="section-subtitle">Money owed to you and by you</p>
        </div>
        <Link href="/lend-borrow" className="btn btn-ghost btn-sm group">
          Manage
          <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="p-4 md:p-5 grid grid-cols-1 lg:grid-cols-[1fr_1fr_1.2fr] gap-3">
        <Link
          href="/lend-borrow?type=LENT&status=OPEN"
          className="card-deco deco-green rounded-xl border border-line p-4 flex items-center gap-3 hover:border-line-strong hover:shadow-(--shadow-md) transition-[border-color,box-shadow]"
        >
          <span className="h-10 w-10 shrink-0 rounded-lg bg-success-soft text-success flex items-center justify-center">
            <ArrowUpRight className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] text-muted">Money others owe you</span>
            <span className="block text-lg font-semibold tabular tracking-tight text-success">
              <AnimatedNumber value={summary.receivable} format={formatMoney} />
            </span>
          </span>
        </Link>
        <Link
          href="/lend-borrow?type=BORROWED&status=OPEN"
          className="card-deco deco-amber rounded-xl border border-line p-4 flex items-center gap-3 hover:border-line-strong hover:shadow-(--shadow-md) transition-[border-color,box-shadow]"
        >
          <span className="h-10 w-10 shrink-0 rounded-lg bg-warning-soft text-warning flex items-center justify-center">
            <ArrowDownLeft className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[13px] text-muted">Money you owe</span>
            <span className="block text-lg font-semibold tabular tracking-tight text-warning">
              <AnimatedNumber value={summary.payable} format={formatMoney} />
            </span>
          </span>
        </Link>

        <div className="grid grid-cols-3 gap-2">
          {counts.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className={`card-deco card-deco-sm ${c.deco} rounded-xl border p-3 flex flex-col justify-center transition-[border-color,box-shadow,filter] ${
                c.danger
                  ? "border-transparent bg-danger-soft hover:brightness-[0.97]"
                  : "border-line hover:border-line-strong hover:shadow-(--shadow-md)"
              }`}
            >
              <span className={`text-xl font-semibold tabular ${c.danger ? "text-danger" : "text-fg"}`}>
                {c.value}
              </span>
              <span className={`text-xs leading-tight mt-0.5 ${c.danger ? "text-danger" : "text-faint"}`}>
                {c.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function DashboardClient({
  stats,
  recentExpenses,
  moneySummary,
  insights,
}: DashboardClientProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | undefined>(
    undefined,
  );
  const [viewingExpense, setViewingExpense] = useState<ExpenseItem | undefined>(
    undefined,
  );

  const openNew = () => {
    setEditingExpense(undefined);
    setIsExpenseOpen(true);
  };

  const handleEdit = (expense: ExpenseItem) => {
    setEditingExpense(expense);
    setIsExpenseOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm(confirmPresets.deleteExpense());
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteExpense(id);
      if (res.success) {
        showToast("Expense deleted and wallet balance restored.", "success");
      } else {
        showToast(res.error || "Failed to delete expense.", "error");
      }
    });
  };

  const monthTotal = stats.monthlyCredit + stats.monthlyDebit;
  const debitShare = monthTotal > 0 ? (stats.monthlyDebit / monthTotal) * 100 : 0;
  const monthName = new Date().toLocaleDateString("en-US", { month: "long" });

  return (
    <>
      <PageHeader
        icon={LayoutDashboard}
        title="Dashboard"
        description="Your balance and spending at a glance."
        actions={
          <button onClick={openNew} className="btn btn-primary">
            <Plus />
            New transaction
          </button>
        }
      />

      {/* Key numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          label="Available balance"
          value={stats.remainingBalance}
          hint="After all transactions"
          icon={Wallet}
          featured
        />
        <StatCard
          label="Total expenses"
          value={stats.totalExpenses}
          hint="All time, excluding income"
          icon={TrendingDown}
          deco="deco-cyan"
        />
        <StatCard
          label="This month's expenses"
          value={stats.monthlyExpenses}
          hint={`Expenses in ${monthName}`}
          icon={CalendarDays}
          deco="deco-violet"
        />
        <StatCard
          label="Today"
          value={stats.todayExpenses}
          hint="Spent today"
          icon={Clock}
          deco="deco-blue"
        />
      </div>

      {insights && (
        <InsightsCard
          insights={insights}
          subtitle="This month compared with last month"
          columns={2}
          footer={
            <Link href="/analytics" className="btn btn-ghost btn-sm group shrink-0">
              More
              <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          }
        />
      )}

      {moneySummary && <LendBorrowOverview summary={moneySummary} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent transactions */}
        <section className="card lg:col-span-2 overflow-hidden">
          <div className="card-head flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="section-title">Recent transactions</h2>
              <p className="section-subtitle">Your latest five entries</p>
            </div>
            <Link href="/expenses" className="btn btn-ghost btn-sm group">
              View all
              <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-14">
              <div className="h-10 w-10 rounded-full bg-subtle flex items-center justify-center mb-3">
                <Receipt className="h-5 w-5 text-faint" />
              </div>
              <p className="text-sm font-medium text-fg">No transactions yet</p>
              <p className="text-[13px] text-muted mt-1">
                Record your first expense to see it here.
              </p>
              <button onClick={openNew} className="btn btn-secondary btn-sm mt-4">
                <Plus />
                Add transaction
              </button>
            </div>
          ) : (
            <ul className={`divide-y divide-line stagger-rows ${isPending ? "is-refreshing" : ""}`}>
              {recentExpenses.map((exp) => {
                const Icon = getCategoryIcon(exp.category);
                const isCredit = exp.category === "Income";
                return (
                  <li
                    key={exp.id}
                    className="group flex items-center gap-3 px-5 py-3 hover:bg-subtle/60 transition-colors"
                  >
                    <button
                      onClick={() => setViewingExpense(exp)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <span
                        className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${getCategoryGlow(exp.category)}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-fg truncate">
                          {exp.title}
                        </span>
                        <span className="block text-xs text-faint mt-0.5">
                          {exp.category} · {formatDate(exp.expenseDate, { month: "short", day: "numeric" })}
                          {exp.splits.length > 0 && ` · ${exp.splits.length} items`}
                        </span>
                      </span>
                    </button>

                    <span
                      className={`text-sm font-semibold tabular shrink-0 ${isCredit ? "text-success" : "text-fg"}`}
                    >
                      {isCredit ? "+" : "−"}
                      {formatMoney(exp.amount)}
                    </span>

                    <div className="flex items-center shrink-0 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(exp)}
                        className="icon-btn"
                        title="Edit"
                        aria-label="Edit"
                      >
                        <Pencil />
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="icon-btn icon-btn-danger"
                        title="Delete"
                        aria-label="Delete"
                      >
                        <Trash2 />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Month summary */}
        <section className="card overflow-hidden flex flex-col">
          <div className="card-head px-5 py-4">
            <h2 className="section-title">{monthName} summary</h2>
            <p className="section-subtitle">Money in vs. money out</p>
          </div>

          <div className="px-5 pb-5 flex-1 flex flex-col">
          <div className="mt-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] text-muted">
                <span className="h-6 w-6 rounded-md bg-success-soft text-success flex items-center justify-center">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                </span>
                Money in
              </span>
              <span className="text-sm font-semibold tabular text-fg">
                +<AnimatedNumber value={stats.monthlyCredit} format={formatMoney} />
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] text-muted">
                <span className="h-6 w-6 rounded-md bg-danger-soft text-danger flex items-center justify-center">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
                Money out
              </span>
              <span className="text-sm font-semibold tabular text-fg">
                −<AnimatedNumber value={stats.monthlyDebit} format={formatMoney} />
              </span>
            </div>
          </div>

          {/* In / out ratio */}
          <div className="mt-5 mb-5 h-1.5 w-full rounded-full bg-success/25 overflow-hidden">
            <div
              className="h-full rounded-full bg-danger transition-[width] duration-700 ease-out"
              style={{ width: `${debitShare}%` }}
            />
          </div>

          <div className="mt-auto pt-4 border-t border-line flex items-center justify-between">
            <span className="text-[13px] text-muted">Net this month</span>
            <span
              className={`text-lg font-semibold tabular tracking-tight ${
                stats.monthlyRemaining >= 0 ? "text-success" : "text-danger"
              }`}
            >
              {stats.monthlyRemaining < 0 ? "−" : "+"}
              <AnimatedNumber value={stats.monthlyRemaining} format={formatMoney} />
            </span>
          </div>
          </div>
        </section>
      </div>

      <ExpenseDetailsModal
        expense={viewingExpense}
        onClose={() => setViewingExpense(undefined)}
      />

      <ExpenseModal
        isOpen={isExpenseOpen}
        onClose={() => {
          setIsExpenseOpen(false);
          setEditingExpense(undefined);
        }}
        expense={editingExpense}
      />
    </>
  );
}
