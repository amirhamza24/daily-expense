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
} from "lucide-react";
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
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="card card-interactive p-4">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <Icon className="h-4 w-4 text-faint" />
      </div>
      <p className="stat-value mt-2">
        {value < 0 && "−"}
        <AnimatedNumber value={value} format={(n) => formatMoney(n)} />
      </p>
      <p className="text-xs text-faint mt-1">{hint}</p>
    </div>
  );
}

export default function DashboardClient({
  stats,
  recentExpenses,
}: DashboardClientProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();

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
        />
        <StatCard
          label="Total expenses"
          value={stats.totalExpenses}
          hint="All time"
          icon={TrendingDown}
        />
        <StatCard
          label="This month"
          value={stats.monthlyExpenses}
          hint={`Spent in ${monthName}`}
          icon={CalendarDays}
        />
        <StatCard
          label="Today"
          value={stats.todayExpenses}
          hint="Spent today"
          icon={Clock}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent transactions */}
        <section className="card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-line">
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
            <ul className="divide-y divide-line stagger-rows">
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
        <section className="card p-5 flex flex-col">
          <h2 className="section-title">{monthName} summary</h2>
          <p className="section-subtitle">Money in vs. money out</p>

          <div className="mt-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[13px] text-muted">
                <span className="h-6 w-6 rounded-md bg-success-soft text-success flex items-center justify-center">
                  <ArrowDownRight className="h-3.5 w-3.5" />
                </span>
                Money in
              </span>
              <span className="text-sm font-semibold tabular text-fg">
                +{formatMoney(stats.monthlyCredit)}
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
                −{formatMoney(stats.monthlyDebit)}
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
              {formatMoney(stats.monthlyRemaining)}
            </span>
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
