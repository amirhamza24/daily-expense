"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  Eye,
  Utensils,
  Car,
  ShoppingBag,
  FileText,
  HeartPulse,
  GraduationCap,
  Tv,
  DollarSign,
  Info,
  CalendarDays,
  Coins,
  X,
} from "lucide-react";
import GlassCard from "./GlassCard";
import ExpenseModal from "./ExpenseModal";
import { deleteExpense } from "@/actions/expenses";
import { useToast } from "./Toast";
import { useConfirm, confirmPresets } from "./ConfirmModal";

// Category Icons Mapping
export const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Food":
      return Utensils;
    case "Transport":
      return Car;
    case "Shopping":
      return ShoppingBag;
    case "Bills":
      return FileText;
    case "Medicine":
      return HeartPulse;
    case "Education":
      return GraduationCap;
    case "Entertainment":
      return Tv;
    case "Income":
      return Coins;
    default:
      return DollarSign;
  }
};

// Category Glow Border Mapping
export const getCategoryGlow = (category: string) => {
  switch (category) {
    case "Food":
      return "border-orange-500/20 text-orange-400 bg-orange-500/10";
    case "Transport":
      return "border-blue-500/20 text-blue-400 bg-blue-500/10";
    case "Shopping":
      return "border-pink-500/20 text-pink-400 bg-pink-500/10";
    case "Bills":
      return "border-amber-500/20 text-amber-400 bg-amber-500/10";
    case "Medicine":
      return "border-emerald-500/20 text-emerald-400 bg-emerald-500/10";
    case "Education":
      return "border-violet-500/20 text-violet-400 bg-violet-500/10";
    case "Entertainment":
      return "border-rose-500/20 text-rose-400 bg-rose-500/10";
    case "Income":
      return "border-emerald-500/20 text-emerald-400 bg-emerald-500/10";
    default:
      return "border-slate-500/20 text-slate-400 bg-slate-500/10";
  }
};

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  note: string | null;
  expenseDate: Date;
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

export default function DashboardClient({
  stats,
  recentExpenses,
}: DashboardClientProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  // Modal States
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | undefined>(
    undefined,
  );
  const [viewingExpense, setViewingExpense] = useState<ExpenseItem | undefined>(
    undefined,
  );

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

  return (
    <>
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent">
            Financial Dashboard
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time tracking of balance limits and daily transactions.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingExpense(undefined);
              setIsExpenseOpen(true);
            }}
            className="flex-1 md:flex-initial px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-violet-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Record Item
          </button>
        </div>
      </div>

      {/* Statistics Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Balance */}
        <GlassCard
          hoverable
          onClick={() => {
            setEditingExpense(undefined);
            setIsExpenseOpen(true);
          }}
          className="border-violet-500/10 shadow-violet-950/5 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Initial Balance
            </span>
            <div className="p-2 bg-violet-500/15 rounded-lg border border-violet-500/25">
              <Wallet className="h-5 w-5 text-violet-400" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-wide">
            $
            {stats.totalBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </h3>
          {stats.balanceNote && (
            <p
              className="text-[11px] text-slate-400 dark:text-slate-400 mt-2 italic line-clamp-1 border-t border-white/5 dark:border-white/5 pt-2"
              title={stats.balanceNote}
            >
              Note: {stats.balanceNote}
            </p>
          )}
          <p className="text-[10px] text-emerald-400 mt-2 font-medium flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Click card to record transaction
          </p>
        </GlassCard>

        {/* Card 2: Total Expenses */}
        <GlassCard className="border-rose-500/10 shadow-rose-950/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="p-2 bg-rose-500/15 rounded-lg border border-rose-500/25">
              <TrendingDown className="h-5 w-5 text-rose-400" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-wide">
            $
            {stats.totalExpenses.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </h3>
          <p className="text-[10px] text-rose-400 mt-2 font-medium">
            Accumulated sum of logged items
          </p>
        </GlassCard>

        {/* Card 3: Remaining Balance */}
        <GlassCard className="border-emerald-500/10 shadow-emerald-950/5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Remaining Balance
            </span>
            <div className="p-2 bg-emerald-500/15 rounded-lg border border-emerald-500/25">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-wide">
            $
            {stats.remainingBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </h3>
          <p className="text-[10px] text-emerald-400 mt-2 font-medium flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500"></span>
            Adjusted wallet limits
          </p>
        </GlassCard>
      </div>

      {/* Monthly Summary Section */}
      <div className="mt-2">
        <h3 className="text-lg font-bold tracking-wide text-slate-800 dark:text-slate-200">
          Monthly Summary (Current Month)
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          A summary of your credits and debits logged during the current month.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Total Credit (This Month) */}
        <GlassCard className="border-emerald-500/10 shadow-emerald-950/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Credit (This Month)
            </span>
            <div className="p-2 bg-emerald-500/15 rounded-lg border border-emerald-500/25">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-4 tracking-wide">
            +$
            {stats.monthlyCredit.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Total income/deposits logged this month
          </p>
        </GlassCard>

        {/* Card 2: Total Debit (This Month) */}
        <GlassCard className="border-rose-500/10 shadow-rose-950/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Total Debit (This Month)
            </span>
            <div className="p-2 bg-rose-500/15 rounded-lg border border-rose-500/25">
              <TrendingDown className="h-5 w-5 text-rose-400" />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 mt-4 tracking-wide">
            -$
            {stats.monthlyDebit.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Total expenses logged this month
          </p>
        </GlassCard>

        {/* Card 3: Remaining Balance (This Month) */}
        <GlassCard className="border-indigo-500/10 shadow-indigo-950/5 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Remaining Balance (This Month)
            </span>
            <div className="p-2 bg-indigo-500/15 rounded-lg border border-indigo-500/25">
              <Wallet className="h-5 w-5 text-indigo-400" />
            </div>
          </div>
          <h3
            className={`text-3xl font-extrabold mt-4 tracking-wide ${stats.monthlyRemaining >= 0 ? "text-indigo-600 dark:text-indigo-400" : "text-rose-600 dark:text-rose-400"}`}
          >
            {stats.monthlyRemaining < 0 ? "-" : ""}$
            {Math.abs(stats.monthlyRemaining).toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </h3>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Net monthly balance (Credit - Debit)
          </p>
        </GlassCard>
      </div>

      {/* Sub Grid for Monthly/Today and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Quick Stats Overview */}
        <div className="flex flex-col gap-6 lg:col-span-1">
          {/* Card: Monthly Spent */}
          <GlassCard className="border-blue-500/10 shadow-blue-950/5 flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Monthly Expenses
                </p>
                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  $
                  {stats.monthlyExpenses.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </h4>
              </div>
            </div>
          </GlassCard>

          {/* Card: Today Spent */}
          <GlassCard className="border-amber-500/10 shadow-amber-950/5 flex-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  Today Expenses
                </p>
                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  $
                  {stats.todayExpenses.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </h4>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right column: Recent Transactions */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full border-white/5 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
                  Recent Transactions
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Latest expense items logged in system
                </p>
              </div>
              <Link
                href="/expenses"
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1 transition-colors"
              >
                View History
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Transaction List */}
            {recentExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-white/2 border border-white/5 text-center">
                <Info className="h-8 w-8 text-slate-500 mb-2" />
                <p className="text-xs text-slate-400">
                  No expenses recorded yet.
                </p>
                <button
                  onClick={() => setIsExpenseOpen(true)}
                  className="mt-3 text-xs text-violet-400 hover:text-violet-300 font-bold"
                >
                  Create first expense item
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {recentExpenses.map((exp) => {
                  const Icon = getCategoryIcon(exp.category);
                  const glowClass = getCategoryGlow(exp.category);
                  return (
                    <div
                      key={exp.id}
                      className="group flex items-center justify-between p-3.5 rounded-xl bg-slate-100/50 dark:bg-white/2 border border-slate-200/50 dark:border-white/5 hover:bg-slate-200/50 dark:hover:bg-white/5 transition-all duration-200"
                    >
                      {/* Icon & Details */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        {/* Icon */}
                        <div
                          className={`p-2.5 rounded-xl border shrink-0 ${glowClass}`}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        {/* Title & Category */}
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                            {exp.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                              {exp.category}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-600 font-extrabold">
                              •
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              {new Date(exp.expenseDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                },
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions & Price */}
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          -$
                          {exp.amount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>

                        {/* Interactive Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setViewingExpense(exp)}
                            className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                            title="View notes"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(exp)}
                            className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-500/10 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Transaction Detail Notes View Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setViewingExpense(undefined)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-2xl glass-panel-glow border border-violet-500/20 p-6 z-10 animate-scale-up text-slate-100">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/5">
              <div>
                <h3 className="font-bold text-lg text-slate-100">
                  {viewingExpense.title}
                </h3>
                <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider">
                  {viewingExpense.category}
                </span>
              </div>
              <button
                onClick={() => setViewingExpense(undefined)}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-4 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-medium">
                  Spent Amount:
                </span>
                <span className="font-extrabold text-rose-400">
                  -$
                  {viewingExpense.amount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-400 font-medium">Date logged:</span>
                <span className="font-semibold text-slate-300">
                  {new Date(viewingExpense.expenseDate).toLocaleDateString(
                    "en-US",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    },
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-1.5 py-1">
                <span className="text-slate-400 font-medium">
                  Specific Note:
                </span>
                <div className="p-3 rounded-xl bg-white/2 border border-white/5 text-slate-300 text-xs italic leading-relaxed whitespace-pre-wrap">
                  {viewingExpense.note ||
                    "No description provided for this transaction."}
                </div>
              </div>
            </div>

            <button
              onClick={() => setViewingExpense(undefined)}
              className="mt-6 w-full py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Close Details
            </button>
          </div>
        </div>
      )}

      {/* Unified Transaction Modal (Credit / Debit) */}
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
