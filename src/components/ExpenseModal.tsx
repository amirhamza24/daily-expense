"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  DollarSign,
  Calendar,
  Loader2,
  TrendingUp,
  TrendingDown,
  Coins,
  Plus,
  X,
  Check,
} from "lucide-react";
import { Collapse } from "./SplitBreakdown";
import { formatMoney } from "@/lib/format";
import { createExpense, updateExpense } from "@/actions/expenses";
import DatePicker from "react-datepicker";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmModal";
import Modal from "./Modal";

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
    splits?: Array<{ title: string; amount: number }>;
  };
}

type SplitRow = { key: number; title: string; amount: string };

let splitKey = 0;
const newSplitRow = (title = "", amount = ""): SplitRow => ({
  key: ++splitKey,
  title,
  amount,
});

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
  const [splits, setSplits] = useState<SplitRow[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setTitle(expense.title);
        setAmount(expense.amount.toString());
        setCategory(expense.category === "Income" ? "Food" : expense.category);
        setNote(expense.note || "");
        setTransactionType(expense.category === "Income" ? "credit" : "debit");
        setExpenseDate(new Date(expense.expenseDate));
        setSplits(
          (expense.splits ?? []).map((s) => newSplitRow(s.title, s.amount.toString())),
        );
      } else {
        // Reset fields
        setTitle("");
        setAmount("");
        setCategory("Food");
        setNote("");
        setTransactionType("debit");
        setExpenseDate(new Date());
        setSplits([]);
      }
    }
  }, [isOpen, expense]);

  if (!isOpen) return null;

  const isCredit = transactionType === "credit";

  // Breakdown bookkeeping (debits only)
  const hasSplits = !isCredit && splits.length > 0;
  const totalAmount = parseFloat(amount) || 0;
  const allocated = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  const remaining = Math.round((totalAmount - allocated) * 100) / 100;
  const overAllocated = hasSplits && remaining < 0;

  const updateSplit = (key: number, patch: Partial<SplitRow>) =>
    setSplits((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeSplit = (key: number) =>
    setSplits((rows) => rows.filter((r) => r.key !== key));
  const addSplit = () => setSplits((rows) => [...rows, newSplitRow()]);

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

    // Drop completely empty breakdown rows; validate the rest
    const filledSplits = hasSplits
      ? splits.filter((s) => s.title.trim() || s.amount.trim())
      : [];
    for (const s of filledSplits) {
      const value = parseFloat(s.amount);
      if (!s.title.trim() || isNaN(value) || value <= 0) {
        showToast("Each breakdown item needs a reason and an amount.", "error");
        return;
      }
    }
    if (overAllocated) {
      showToast("Breakdown total is more than the transaction amount.", "error");
      return;
    }

    // Determine final category string
    const finalCategory = isCredit ? "Income" : category;

    const ok = await confirm({
      title: expense?.id
        ? "Update transaction"
        : isCredit
          ? "Add balance"
          : "Record expense",
      message: expense?.id
        ? "Your balance will be recalculated with the updated values."
        : isCredit
          ? `Add $${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} to your wallet?`
          : `Record an expense of $${parsedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}${
              filledSplits.length ? ` split into ${filledSplits.length} items` : ""
            }?`,
      confirmText: expense?.id ? "Update" : "Confirm",
      variant: isCredit ? "success" : "default",
    });
    if (!ok) return;

    const payload = {
      title: title.trim(),
      amount: parsedAmount,
      category: finalCategory,
      note: note.trim() || undefined,
      expenseDate: expenseDate.toISOString(),
      splits: filledSplits.map((s) => ({
        title: s.title.trim(),
        amount: parseFloat(s.amount),
      })),
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
            : isCredit
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
    <Modal
      open={isOpen}
      onClose={onClose}
      locked={isPending}
      size="lg"
      title={expense?.id ? "Edit transaction" : "New transaction"}
      description={
        expense?.id
          ? "Update the details of this entry."
          : isCredit
            ? "Add money to your wallet balance."
            : "Record money you spent."
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isPending}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="expense-form"
            disabled={isPending}
            className={`btn ${isCredit ? "btn-success" : "btn-primary"} min-w-32`}
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : expense?.id ? (
              "Save changes"
            ) : isCredit ? (
              "Add balance"
            ) : (
              "Record expense"
            )}
          </button>
        </>
      }
    >
      <form id="expense-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Type toggle */}
        <div className="segmented">
          <button
            type="button"
            data-active={!isCredit}
            disabled={!!expense?.id}
            onClick={() => {
              setTransactionType("debit");
              setCategory("Food");
            }}
          >
            <TrendingDown className={!isCredit ? "text-danger" : ""} />
            Expense
          </button>
          <button
            type="button"
            data-active={isCredit}
            disabled={!!expense?.id}
            onClick={() => setTransactionType("credit")}
          >
            <TrendingUp className={isCredit ? "text-success" : ""} />
            Income
          </button>
        </div>

        <div>
          <label className="label" htmlFor="tx-title">
            {isCredit ? "Source" : "Title"}
          </label>
          <input
            id="tx-title"
            type="text"
            required
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isCredit ? "e.g. Monthly salary" : "e.g. Weekly groceries"}
            className="input"
            disabled={isPending}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="tx-amount">
              Amount
            </label>
            <div className="relative">
              <DollarSign className="input-icon" />
              <input
                id="tx-amount"
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="input pl-9 tabular"
                disabled={isPending}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="tx-category">
              Category
            </label>
            {isCredit ? (
              <div className="input flex items-center gap-2 bg-subtle text-muted shadow-none">
                <Coins className="h-4 w-4 text-success" />
                Income
              </div>
            ) : (
              <select
                id="tx-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input"
                disabled={isPending}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Optional breakdown: one debit, several reasons */}
        {!isCredit && (
          <div className="rounded-lg border border-line bg-subtle/50">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-fg">Breakdown</p>
                <p className="text-xs text-faint">
                  Optional — split this amount into separate reasons.
                </p>
              </div>
              <button
                type="button"
                onClick={addSplit}
                className="btn btn-secondary btn-sm shrink-0"
                disabled={isPending}
              >
                <Plus />
                Add item
              </button>
            </div>

            <Collapse open={hasSplits}>
              <div className="border-t border-line px-3 pt-3 pb-3 flex flex-col gap-2">
                {splits.map((s, i) => (
                  <div key={s.key} className="flex items-center gap-2 animate-fade-up">
                    <span className="w-5 shrink-0 text-center text-xs text-faint tabular">
                      {i + 1}
                    </span>
                    <input
                      type="text"
                      value={s.title}
                      maxLength={80}
                      onChange={(e) => updateSplit(s.key, { title: e.target.value })}
                      placeholder="Reason, e.g. Rent"
                      aria-label={`Item ${i + 1} reason`}
                      className="input h-8 flex-1 min-w-0 text-[13px]"
                      disabled={isPending}
                      autoFocus={i === splits.length - 1 && !s.title}
                    />
                    <div className="relative w-28 shrink-0">
                      <DollarSign className="input-icon h-3.5! w-3.5! left-2.5!" />
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={s.amount}
                        onChange={(e) => updateSplit(s.key, { amount: e.target.value })}
                        placeholder="0.00"
                        aria-label={`Item ${i + 1} amount`}
                        className="input h-8 pl-7 text-[13px] tabular"
                        disabled={isPending}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSplit(s.key)}
                      className="icon-btn icon-btn-danger h-8 w-8 shrink-0"
                      aria-label={`Remove item ${i + 1}`}
                      disabled={isPending}
                    >
                      <X />
                    </button>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-1 border-t border-dashed border-line text-xs">
                  <span className="text-muted">
                    Allocated{" "}
                    <span className="tabular font-medium text-fg">{formatMoney(allocated)}</span>
                    {" of "}
                    <span className="tabular font-medium text-fg">{formatMoney(totalAmount)}</span>
                  </span>
                  {overAllocated ? (
                    <span className="flex items-center gap-2 text-danger font-medium">
                      Over by <span className="tabular">{formatMoney(-remaining)}</span>
                      <button
                        type="button"
                        onClick={() => setAmount(allocated.toFixed(2))}
                        className="underline underline-offset-2 cursor-pointer"
                      >
                        Use {formatMoney(allocated)} as total
                      </button>
                    </span>
                  ) : remaining > 0 ? (
                    <span className="text-faint">
                      <span className="tabular">{formatMoney(remaining)}</span> unassigned
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-success font-medium">
                      <Check className="h-3.5 w-3.5" />
                      Fully allocated
                    </span>
                  )}
                </div>
              </div>
            </Collapse>
          </div>
        )}

        <div>
          <label className="label">Date</label>
          <div className="relative">
            <Calendar className="input-icon" />
            <DatePicker
              selected={expenseDate}
              onChange={(date: Date | null) => setExpenseDate(date || new Date())}
              dateFormat="MMMM d, yyyy"
              fixedHeight
              portalId="root-portal"
              popperPlacement="bottom-start"
              className="input pl-9 cursor-pointer"
              disabled={isPending}
              wrapperClassName="w-full"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tx-note">
            Note <span className="text-faint font-normal">(optional)</span>
          </label>
          <textarea
            id="tx-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Add any details…"
            className="input resize-none"
            disabled={isPending}
          />
        </div>
      </form>
    </Modal>
  );
}
