"use client";

import React, { useState, useTransition } from "react";
import {
  Calendar,
  Loader2,
  TrendingUp,
  TrendingDown,
  Coins,
  Plus,
  X,
  Check,
  Pencil,
  HandCoins,
  ArrowRight,
} from "lucide-react";
import TakaSign from "@/components/TakaSign";
import Link from "next/link";
import { Collapse } from "./SplitBreakdown";
import MoneyEntryForm, { MONEY_ENTRY_KINDS, type MoneyEntryKind } from "./MoneyEntryForm";
import { Select, type SelectOption } from "./Select";
import SegmentIndicator from "./SegmentIndicator";
import { getCategoryIcon, getCategoryGlow } from "@/lib/categories";
import { useI18n } from "./I18nProvider";
import { useDatePickerI18n } from "./useDatePickerI18n";
import { categoryLabel, type Messages } from "@/lib/i18n/messages";
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
    splits?: Array<{ title: string; amount: number; date?: Date | string | null }>;
  };
}

type SplitRow = { key: number; title: string; amount: string; date: Date };

let splitKey = 0;
const newSplitRow = (date: Date, title = "", amount = ""): SplitRow => ({
  key: ++splitKey,
  title,
  amount,
  date,
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

const categoryOptions = (m: Messages): SelectOption[] => CATEGORIES.map((cat) => ({
  value: cat,
  label: categoryLabel(m, cat),
  icon: getCategoryIcon(cat),
  iconClassName: getCategoryGlow(cat),
}));

export default function ExpenseModal({
  isOpen,
  onClose,
  expense,
}: ExpenseModalProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { m, fmt } = useI18n();
  const t = m.txModal;
  const datePickerI18n = useDatePickerI18n("long");
  const itemDatePickerI18n = useDatePickerI18n("short");
  const [isPending, startTransition] = useTransition();

  // Form states
  // "money" = lend / borrow / repayment / payment, handled by MoneyEntryForm
  const [transactionType, setTransactionType] = useState<"debit" | "credit" | "money">(
    "debit",
  );
  const [moneyKind, setMoneyKind] = useState<MoneyEntryKind>("lend");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [note, setNote] = useState("");
  const [splits, setSplits] = useState<SplitRow[]>([]);

  // Reset the form whenever the modal opens or is pointed at another expense.
  // Done during render (not in an effect) so the first frame already shows it.
  const [prevOpen, setPrevOpen] = useState(false);
  const [prevExpense, setPrevExpense] = useState(expense);
  if (isOpen !== prevOpen || expense !== prevExpense) {
    setPrevOpen(isOpen);
    setPrevExpense(expense);
    if (isOpen) {
      if (expense) {
        setTitle(expense.title);
        setAmount(expense.amount.toString());
        setCategory(expense.category === "Income" ? "Food" : expense.category);
        setNote(expense.note || "");
        setTransactionType(expense.category === "Income" ? "credit" : "debit");
        setExpenseDate(new Date(expense.expenseDate));
        setSplits(
          (expense.splits ?? []).map((s) =>
            newSplitRow(new Date(s.date ?? expense.expenseDate), s.title, s.amount.toString()),
          ),
        );
      } else {
        // Reset fields
        setTitle("");
        setAmount("");
        setCategory("Food");
        setNote("");
        setTransactionType("debit");
        setMoneyKind("lend");
        setExpenseDate(new Date());
        setSplits([]);
      }
    }
  }

  if (!isOpen) return null;

  const isCredit = transactionType === "credit";
  const isMoney = transactionType === "money";
  const moneyConfig = MONEY_ENTRY_KINDS(m)[moneyKind];

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
  // A new item starts on the previous item's day (or the expense date); when
  // adding to an existing expense later, it's most likely being spent today.
  const addSplit = () =>
    setSplits((rows) => [
      ...rows,
      newSplitRow(expense?.id ? new Date() : new Date(rows.at(-1)?.date ?? expenseDate)),
    ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast(t.amountPositive, "error");
      return;
    }

    if (!title.trim()) {
      showToast(t.titleRequired, "error");
      return;
    }

    // Drop completely empty breakdown rows; validate the rest. Saved oldest
    // first so the "left" amounts read as a timeline.
    const filledSplits = hasSplits
      ? splits
          .filter((s) => s.title.trim() || s.amount.trim())
          .sort((a, b) => a.date.getTime() - b.date.getTime())
      : [];
    for (const s of filledSplits) {
      const value = parseFloat(s.amount);
      if (!s.title.trim() || isNaN(value) || value <= 0) {
        showToast(t.splitIncomplete, "error");
        return;
      }
    }
    if (overAllocated) {
      showToast(t.splitOver, "error");
      return;
    }

    // Determine final category string
    const finalCategory = isCredit ? "Income" : category;

    const ok = await confirm({
      title: expense?.id ? t.confirmUpdateTitle : isCredit ? t.addBalance : t.recordExpense,
      message: expense?.id
        ? t.confirmUpdateMsg
        : isCredit
          ? t.confirmAddMsg(fmt.money(parsedAmount))
          : t.confirmExpenseMsg(fmt.money(parsedAmount), filledSplits.length),
      confirmText: expense?.id ? m.update : m.confirm,
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
        date: s.date.toISOString(),
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
          expense?.id ? t.updated : isCredit ? t.credited : t.logged,
          "success",
        );
        onClose();
      } else {
        showToast(res.error || t.failed, "error");
      }
    });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      locked={isPending}
      size="lg"
      icon={expense?.id ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      title={expense?.id ? t.editTitle : t.newTitle}
      description={
        expense?.id ? t.editDesc : isMoney ? t.moneyDesc : isCredit ? t.creditDesc : t.debitDesc
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={isPending}
          >
            {m.cancel}
          </button>
          <button
            type="submit"
            form={isMoney ? "money-entry-form" : "expense-form"}
            disabled={isPending}
            className={`btn ${isCredit || (isMoney && moneyKind === "repaid") ? "btn-success" : "btn-primary"} min-w-32`}
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {m.saving}
              </>
            ) : isMoney ? (
              moneyConfig.submit
            ) : expense?.id ? (
              t.saveChanges
            ) : isCredit ? (
              t.addBalance
            ) : (
              t.recordExpense
            )}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Type toggle */}
        <div className="segmented">
          <SegmentIndicator />
          <button
            type="button"
            data-active={transactionType === "debit"}
            disabled={!!expense?.id}
            onClick={() => {
              setTransactionType("debit");
              setCategory("Food");
            }}
          >
            <TrendingDown className={transactionType === "debit" ? "text-danger" : ""} />
            {t.tabExpense}
          </button>
          <button
            type="button"
            data-active={isCredit}
            disabled={!!expense?.id}
            onClick={() => setTransactionType("credit")}
          >
            <TrendingUp className={isCredit ? "text-success" : ""} />
            {t.tabIncome}
          </button>
          {/* Lend & borrow entries can't be created by editing an expense */}
          {!expense?.id && (
            <button
              type="button"
              data-active={isMoney}
              onClick={() => setTransactionType("money")}
            >
              <HandCoins className={isMoney ? "text-accent-fg" : ""} />
              <span className="sm:hidden">{t.tabMoneyShort}</span>
              <span className="hidden sm:inline">{t.tabMoney}</span>
            </button>
          )}
        </div>

        {isMoney ? (
          <>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="label mb-0!">{t.whatDoing}</span>
                <Link
                  href="/lend-borrow"
                  onClick={onClose}
                  className="text-xs font-medium text-accent-fg hover:underline underline-offset-2 inline-flex items-center gap-1"
                >
                  {t.openLendBorrow}
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.lendBorrowType}>
                {(Object.keys(MONEY_ENTRY_KINDS(m)) as MoneyEntryKind[]).map((k) => {
                  const cfg = MONEY_ENTRY_KINDS(m)[k];
                  const Icon = cfg.icon;
                  const active = moneyKind === k;
                  const tint = cfg.type === "LENT" ? "bg-success-soft text-success" : "bg-warning-soft text-warning";
                  return (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => setMoneyKind(k)}
                      disabled={isPending}
                      className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left transition-colors cursor-pointer ${
                        active
                          ? "border-accent bg-accent-soft/50 ring-1 ring-accent/30"
                          : "border-line hover:bg-subtle hover:border-line-strong"
                      }`}
                    >
                      <span className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center ${tint}`}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-medium text-fg leading-tight">{cfg.title}</span>
                        <span className="block text-[11.5px] text-faint leading-snug mt-0.5">{cfg.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <MoneyEntryForm
              formId="money-entry-form"
              kind={moneyKind}
              isPending={isPending}
              startTransition={startTransition}
              onDone={onClose}
            />
          </>
        ) : (
      <form id="expense-form" onSubmit={handleSubmit} className="flex flex-col gap-4">

        <div>
          <label className="label" htmlFor="tx-title">
            {isCredit ? t.source : t.titleLabel}
          </label>
          <input
            id="tx-title"
            type="text"
            required
            maxLength={80}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={isCredit ? t.sourcePlaceholder : t.titlePlaceholder}
            className="input"
            disabled={isPending}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="tx-amount">
              {t.amount}
            </label>
            <div className="relative">
              <TakaSign className="input-icon" />
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
              {t.category}
            </label>
            {isCredit ? (
              <div className="input flex items-center gap-2 bg-subtle text-muted shadow-none">
                <Coins className="h-4 w-4 text-success" />
                {categoryLabel(m, "Income")}
              </div>
            ) : (
              <Select
                id="tx-category"
                value={category}
                onChange={setCategory}
                options={categoryOptions(m)}
                disabled={isPending}
              />
            )}
          </div>
        </div>

        {/* Optional breakdown: one debit, several reasons */}
        {!isCredit && (
          <div className="rounded-lg border border-line bg-subtle/50">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-fg">{t.breakdown}</p>
                <p className="text-xs text-faint">
                  {t.breakdownHint}
                </p>
              </div>
              <button
                type="button"
                onClick={addSplit}
                className="btn btn-secondary btn-sm shrink-0"
                disabled={isPending}
              >
                <Plus />
                {t.addItem}
              </button>
            </div>

            <Collapse open={hasSplits}>
              <div className="border-t border-line px-3 pt-3 pb-3 flex flex-col gap-2">
                {splits.map((s, i) => (
                  <div key={s.key} className="flex items-start gap-2 animate-fade-up">
                    <span className="w-5 h-8 shrink-0 flex items-center justify-center text-xs text-faint tabular">
                      {fmt.digits(i + 1)}
                    </span>
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-[minmax(0,1fr)_8.5rem_7rem] gap-2">
                      <input
                        type="text"
                        value={s.title}
                        maxLength={80}
                        onChange={(e) => updateSplit(s.key, { title: e.target.value })}
                        placeholder={t.reasonPlaceholder}
                        aria-label={t.itemReason(i + 1)}
                        className="input h-8 col-span-2 sm:col-span-1 min-w-0 text-[13px]"
                        disabled={isPending}
                        autoFocus={i === splits.length - 1 && !s.title}
                      />
                      <div className="relative min-w-0">
                        <Calendar className="input-icon h-3.5! w-3.5! left-2.5!" />
                        <DatePicker
                          selected={s.date}
                          onChange={(date: Date | null) => date && updateSplit(s.key, { date })}
                          {...itemDatePickerI18n}
                          fixedHeight
                          portalId="root-portal"
                          popperPlacement="bottom-start"
                          title={t.itemDate(i + 1)}
                          className="input h-8 pl-7 text-[13px] cursor-pointer"
                          disabled={isPending}
                          wrapperClassName="w-full"
                        />
                      </div>
                      <div className="relative min-w-0">
                        <TakaSign className="input-icon h-3.5! w-3.5! left-2.5!" />
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={s.amount}
                          onChange={(e) => updateSplit(s.key, { amount: e.target.value })}
                          placeholder="0.00"
                          aria-label={t.itemAmount(i + 1)}
                          className="input h-8 pl-7 text-[13px] tabular"
                          disabled={isPending}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSplit(s.key)}
                      className="icon-btn icon-btn-danger h-8 w-8 shrink-0"
                      aria-label={t.removeItem(i + 1)}
                      disabled={isPending}
                    >
                      <X />
                    </button>
                  </div>
                ))}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-1 border-t border-dashed border-line text-xs">
                  <span className="text-muted">
                    {t.allocated}{" "}
                    <span className="tabular font-medium text-fg">{fmt.money(allocated)}</span>
                    {` ${t.of} `}
                    <span className="tabular font-medium text-fg">{fmt.money(totalAmount)}</span>
                  </span>
                  {overAllocated ? (
                    <span className="flex items-center gap-2 text-danger font-medium">
                      {t.overBy} <span className="tabular">{fmt.money(-remaining)}</span>
                      <button
                        type="button"
                        onClick={() => setAmount(allocated.toFixed(2))}
                        className="underline underline-offset-2 cursor-pointer"
                      >
                        {t.useAsTotal(fmt.money(allocated))}
                      </button>
                    </span>
                  ) : remaining > 0 ? (
                    <span className="text-faint">
                      <span className="tabular">{fmt.money(remaining)}</span> {t.unassigned}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-success font-medium">
                      <Check className="h-3.5 w-3.5" />
                      {t.fullyAllocated}
                    </span>
                  )}
                </div>
              </div>
            </Collapse>
          </div>
        )}

        <div>
          <label className="label">{t.date}</label>
          <div className="relative">
            <Calendar className="input-icon" />
            <DatePicker
              selected={expenseDate}
              onChange={(date: Date | null) => setExpenseDate(date || new Date())}
              {...datePickerI18n}
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
            {t.note} <span className="text-faint font-normal">({m.optional})</span>
          </label>
          <textarea
            id="tx-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder={t.notePlaceholder}
            className="input resize-none"
            disabled={isPending}
          />
        </div>
      </form>
        )}
      </div>
    </Modal>
  );
}
