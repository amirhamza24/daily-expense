"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Heading,
  DollarSign,
  Calendar,
  FileText,
  Loader2,
  Tag,
  TrendingUp,
  TrendingDown,
  Coins,
} from "lucide-react";
import { createExpense, updateExpense } from "@/actions/expenses";
import DatePicker from "react-datepicker";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmModal";

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: {
    id: string;
    title: string;
    amount: number;
    category: string;
    note?: string | null;
    expenseDate: Date | string;
  };
}

const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Medicine",
  "Education",
  "Entertainment",
  "Others",
];

export default function ExpenseModal({
  isOpen,
  onClose,
  expense,
}: ExpenseModalProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [transactionType, setTransactionType] = useState<"debit" | "credit">(
    "debit",
  );
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [note, setNote] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setTitle(expense.title);
        setAmount(expense.amount.toString());
        setCategory(expense.category === "Income" ? "Food" : expense.category);
        setNote(expense.note || "");
        setTransactionType(expense.category === "Income" ? "credit" : "debit");
        setExpenseDate(new Date(expense.expenseDate));
      } else {
        // Reset fields
        setTitle("");
        setAmount("");
        setCategory("Food");
        setNote("");
        setTransactionType("debit");
        setExpenseDate(new Date());
      }
    }
  }, [isOpen, expense]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast("Amount must be a positive number greater than zero.", "error");
      return;
    }

    if (!title.trim()) {
      showToast("Title is required.", "error");
      return;
    }

    // Determine final category string
    const finalCategory = transactionType === "credit" ? "Income" : category;

    const ok = await confirm({
      title: expense?.id
        ? "Update Transaction"
        : transactionType === "credit"
          ? "Add Wallet Balance (Credit)"
          : "Record Expense (Debit)",
      message: expense?.id
        ? "Are you sure you want to update this transaction? Your balance will be recalculated accordingly."
        : transactionType === "credit"
          ? `Are you sure you want to add $${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} as a credit to your wallet?`
          : `Are you sure you want to record this expense of $${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}?`,
      confirmText: expense?.id ? "Update" : "Confirm",
      variant: transactionType === "credit" ? "success" : "default",
    });
    if (!ok) return;

    const payload = {
      title: title.trim(),
      amount: parsedAmount,
      category: finalCategory,
      note: note.trim() || undefined,
      expenseDate: expenseDate.toISOString(),
    };

    startTransition(async () => {
      let res;
      if (expense?.id) {
        res = await updateExpense(expense.id, payload);
      } else {
        res = await createExpense(payload);
      }

      if (res.success) {
        showToast(
          expense?.id
            ? "Transaction details updated."
            : transactionType === "credit"
              ? "Balance added (credited) successfully."
              : "Expense logged successfully.",
          "success",
        );
        onClose();
      } else {
        showToast(res.error || "Failed to complete action.", "error");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl glass-panel-glow border border-violet-500/20 p-6 z-10 animate-scale-up text-slate-800 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
              {expense?.id
                ? "Edit Transaction Record"
                : transactionType === "credit"
                  ? "Add Wallet Balance (Credit)"
                  : "Record New Expense (Debit)"}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {expense?.id
                ? "Update registered transaction parameters"
                : transactionType === "credit"
                  ? "Deposit funds or add credit amount directly to your wallet"
                  : "Create a new expense entry item to deduct from your wallet"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Segmented Type Toggle */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-950/40 p-1 border border-slate-200 dark:border-white/5 gap-1">
            <button
              type="button"
              disabled={!!expense?.id}
              onClick={() => {
                setTransactionType("debit");
                setCategory("Food");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                transactionType === "debit"
                  ? "bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <TrendingDown className="h-4 w-4" />
              Debit (Expense)
            </button>
            <button
              type="button"
              disabled={!!expense?.id}
              onClick={() => {
                setTransactionType("credit");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                transactionType === "credit"
                  ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              Credit (Add Balance)
            </button>
          </div>

          {/* Title field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              {transactionType === "credit"
                ? "Credit Source / Title"
                : "Expense Title"}
            </label>
            <div className="relative">
              <Heading className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  transactionType === "credit"
                    ? "e.g. Monthly salary, Refund, Savings deposit"
                    : "e.g. Weekly Groceries, Gas Refill, Cafe"
                }
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                {transactionType === "credit"
                  ? "Credit Amount ($)"
                  : "Amount Spent ($)"}
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm font-bold"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Category selection */}
            {transactionType === "debit" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  Category
                </label>
                <div className="relative">
                  <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm appearance-none cursor-pointer"
                    disabled={isPending}
                  >
                    {CATEGORIES.map((cat) => (
                      <option
                        key={cat}
                        value={cat}
                        className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      >
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  Category
                </label>
                <div className="w-full pl-4 pr-4 py-3 rounded-xl glass-input text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-2 h-[46px] border border-emerald-500/20">
                  <Coins className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400" />
                  Income / Credit Deposit
                </div>
              </div>
            )}
          </div>

          {/* Date Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              Transaction Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10 pointer-events-none" />
              <DatePicker
                selected={expenseDate}
                onChange={(date) => setExpenseDate(date || new Date())}
                dateFormat="MMMM d, yyyy"
                fixedHeight
                portalId="root-portal"
                popperPlacement="bottom-start"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm cursor-pointer"
                disabled={isPending}
                wrapperClassName="w-full"
              />
            </div>
          </div>

          {/* Note field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
              Add Note (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder={
                  transactionType === "credit"
                    ? "e.g. Salary description, Freelance client info..."
                    : "Details or specific notes on this purchase..."
                }
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm h-24 resize-none"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-300 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                transactionType === "credit"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/20 hover:shadow-emerald-900/45"
                  : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-950/20 hover:shadow-violet-900/45"
              }`}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : transactionType === "credit" ? (
                "Add Balance"
              ) : (
                "Record Expense"
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes scale-up {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-up {
          animation: scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
