"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Calendar,
  CalendarClock,
  DollarSign,
  HandCoins,
  Info,
  Plus,
  RefreshCw,
  Search,
  User,
  X,
} from "lucide-react";
import DatePicker from "react-datepicker";
import { useToast } from "./Toast";
import { ComboInput } from "./Select";
import { useConfirm } from "./ConfirmModal";
import { createMoneyRecords, getMoneyEntryData, recordMoneyPayments } from "@/actions/money";
import { formatDate, formatMoney } from "@/lib/format";
import { moneyTerms, round2, type MoneyType } from "@/lib/money";

/*
 * Lend / borrow / repayment / payment entry, embedded in the "New transaction"
 * dialog (ExpenseModal). Everything recorded here goes to Lend & Borrow — never
 * to expenses or income.
 */

export type MoneyEntryKind = "lend" | "borrow" | "repaid" | "payback";

export const MONEY_ENTRY_KINDS: Record<
  MoneyEntryKind,
  {
    type: MoneyType;
    mode: "new" | "settle";
    title: string;
    hint: string;
    submit: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  lend: {
    type: "LENT",
    mode: "new",
    title: "Lend money",
    hint: "You give money to someone",
    submit: "Record lent",
    icon: ArrowUpRight,
  },
  borrow: {
    type: "BORROWED",
    mode: "new",
    title: "Borrow money",
    hint: "You take money from someone",
    submit: "Record borrowed",
    icon: ArrowDownLeft,
  },
  repaid: {
    type: "LENT",
    mode: "settle",
    title: "Get repaid",
    hint: "Someone returns money they owe you",
    submit: "Record repayment",
    icon: HandCoins,
  },
  payback: {
    type: "BORROWED",
    mode: "settle",
    title: "Pay back",
    hint: "You return money you owe",
    submit: "Record payment",
    icon: Banknote,
  },
};

type OpenRecord = {
  id: string;
  type: MoneyType;
  personName: string;
  amount: number;
  paidAmount: number;
  remaining: number;
  date: Date | string;
  dueDate: Date | string | null;
  note: string | null;
};

type EntryData = { open: OpenRecord[]; people: string[] };

interface MoneyEntryFormProps {
  formId: string;
  kind: MoneyEntryKind;
  isPending: boolean;
  startTransition: React.TransitionStartFunction;
  onDone: () => void;
}

export default function MoneyEntryForm({ kind, ...rest }: MoneyEntryFormProps) {
  const [data, setData] = useState<EntryData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(() => {
    getMoneyEntryData().then((res) => {
      if (res.success) {
        setData({ open: res.open, people: res.people });
        setLoadError(null);
      } else {
        setLoadError(res.error);
      }
    });
  }, []);

  useEffect(load, [load]);

  const retry = () => {
    setLoadError(null);
    load();
  };

  const config = MONEY_ENTRY_KINDS[kind];
  return config.mode === "new" ? (
    <NewRecordsForm key={kind} kind={kind} people={data?.people ?? []} {...rest} />
  ) : (
    <SettleForm key={kind} kind={kind} data={data} loadError={loadError} onRetry={retry} {...rest} />
  );
}

// ─── Lend / borrow (one or more people) ──────────────────────────────────────

type PersonRow = { key: number; name: string; amount: string };
let rowKey = 0;
const newRow = (): PersonRow => ({ key: ++rowKey, name: "", amount: "" });

const joinNames = (names: string[]) =>
  names.length <= 2 ? names.join(" and ") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

function NewRecordsForm({
  formId,
  kind,
  people,
  isPending,
  startTransition,
  onDone,
}: Omit<MoneyEntryFormProps, "kind"> & { kind: MoneyEntryKind; people: string[] }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const config = MONEY_ENTRY_KINDS[kind];
  const isLent = config.type === "LENT";

  const [rows, setRows] = useState<PersonRow[]>(() => [newRow()]);
  const [date, setDate] = useState<Date>(() => new Date());
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [note, setNote] = useState("");

  const total = round2(rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0));
  const multi = rows.length > 1;

  const update = (key: number, patch: Partial<PersonRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: number) => setRows((rs) => rs.filter((r) => r.key !== key));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ignore completely empty extra rows
    const filled = rows.filter((r, i) => i === 0 || r.name.trim() || r.amount.trim());
    for (const r of filled) {
      const amount = parseFloat(r.amount);
      if (!r.name.trim()) {
        showToast("Each person needs a name.", "error");
        return;
      }
      if (isNaN(amount) || amount <= 0) {
        showToast(`Enter an amount greater than zero for ${r.name.trim()}.`, "error");
        return;
      }
    }
    if (dueDate && dueDate.toDateString() !== date.toDateString() && dueDate < date) {
      showToast("Due date can't be before the date.", "error");
      return;
    }

    const names = filled.map((r) => r.name.trim());
    const sum = round2(filled.reduce((s, r) => s + parseFloat(r.amount), 0));

    const ok = await confirm({
      title: isLent ? "Record money lent" : "Record money borrowed",
      message: isLent
        ? `Lend ${formatMoney(sum)} to ${joinNames(names)}? It will be deducted from your available balance and tracked as receivable.`
        : `Borrow ${formatMoney(sum)} from ${joinNames(names)}? It will be added to your available balance and tracked as payable.`,
      confirmText: "Confirm",
      variant: isLent ? "info" : "warning",
    });
    if (!ok) return;

    const payload = filled.map((r) => ({
      type: config.type,
      personName: r.name.trim(),
      amount: round2(parseFloat(r.amount)),
      date: date.toISOString(),
      dueDate: dueDate ? dueDate.toISOString() : null,
      note: note.trim() || undefined,
    }));

    startTransition(async () => {
      const res = await createMoneyRecords(payload);
      if (res.success) {
        const who = names.length === 1 ? names[0] : `${names.length} people`;
        showToast(
          isLent ? `Lent ${formatMoney(sum)} to ${who}.` : `Borrowed ${formatMoney(sum)} from ${who}.`,
          "success",
        );
        onDone();
      } else {
        showToast(res.error || "Failed to save.", "error");
      }
    });
  };

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="label mb-0!">{isLent ? "Lent to" : "Borrowed from"}</span>
          {multi && (
            <span className="text-xs text-muted">
              Total <span className="tabular font-semibold text-fg">{formatMoney(total)}</span>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {rows.map((r, i) => (
            <div key={r.key} className="flex items-center gap-2 animate-fade-up">
              <div className="flex-1 min-w-0">
                <ComboInput
                  icon={User}
                  value={r.name}
                  maxLength={80}
                  onChange={(name) => update(r.key, { name })}
                  // Don't suggest people already added in another row
                  suggestions={people.filter(
                    (p) => !rows.some((o) => o.key !== r.key && o.name.trim().toLowerCase() === p.toLowerCase()),
                  )}
                  placeholder={i === 0 ? "Person, e.g. Rahim" : "Another person"}
                  aria-label={`Person ${i + 1} name`}
                  disabled={isPending}
                  autoFocus={i === rows.length - 1}
                />
              </div>
              <div className="relative w-32 shrink-0">
                <DollarSign className="input-icon" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={r.amount}
                  onChange={(e) => update(r.key, { amount: e.target.value })}
                  placeholder="0.00"
                  aria-label={`Person ${i + 1} amount`}
                  className="input pl-9 tabular"
                  disabled={isPending}
                />
              </div>
              {multi && (
                <button
                  type="button"
                  onClick={() => remove(r.key)}
                  className="icon-btn icon-btn-danger h-9 w-9 shrink-0"
                  aria-label={`Remove person ${i + 1}`}
                  disabled={isPending}
                >
                  <X />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setRows((rs) => [...rs, newRow()])}
          className="btn btn-ghost btn-sm mt-2 -ml-2"
          disabled={isPending || rows.length >= 20}
        >
          <Plus />
          {isLent ? "Split between more people" : "Add another person"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{moneyTerms[config.type].dateLabel}</label>
          <div className="relative">
            <Calendar className="input-icon" />
            <DatePicker
              selected={date}
              onChange={(d: Date | null) => setDate(d || new Date())}
              dateFormat="MMM d, yyyy"
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
          <label className="label">
            Due date <span className="text-faint font-normal">(optional)</span>
          </label>
          <div className="relative">
            <CalendarClock className="input-icon" />
            <DatePicker
              selected={dueDate}
              onChange={(d: Date | null) => setDueDate(d)}
              minDate={date}
              placeholderText="No due date"
              dateFormat="MMM d, yyyy"
              fixedHeight
              portalId="root-portal"
              popperPlacement="bottom-start"
              className="input pl-9 pr-8 cursor-pointer"
              disabled={isPending}
              wrapperClassName="w-full"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate(null)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn h-6 w-6"
                aria-label="Clear due date"
                disabled={isPending}
              >
                <X className="h-3.5! w-3.5!" />
              </button>
            )}
          </div>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="money-entry-note">
          Note <span className="text-faint font-normal">(optional)</span>
        </label>
        <textarea
          id="money-entry-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={300}
          rows={2}
          placeholder="e.g. For medical bills"
          className="input resize-none"
          disabled={isPending}
        />
      </div>

      <div className="alert bg-subtle text-muted">
        <Info />
        <span>
          {isLent
            ? "Deducted from your available balance and tracked as receivable in Lend & Borrow. Not counted as an expense."
            : "Added to your available balance and tracked as payable in Lend & Borrow. Not counted as income."}
          {multi && " A separate record is created for each person."}
        </span>
      </div>
    </form>
  );
}

// ─── Repayment received / payment made (one or more records) ─────────────────

function SettleForm({
  formId,
  kind,
  data,
  loadError,
  onRetry,
  isPending,
  startTransition,
  onDone,
}: Omit<MoneyEntryFormProps, "kind"> & {
  kind: MoneyEntryKind;
  data: EntryData | null;
  loadError: string | null;
  onRetry: () => void;
}) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const config = MONEY_ENTRY_KINDS[kind];
  const terms = moneyTerms[config.type];
  const isLent = config.type === "LENT";

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(() => new Date());
  const [note, setNote] = useState("");

  const records = useMemo(
    () => (data?.open ?? []).filter((r) => r.type === config.type),
    [data, config.type],
  );
  const visible = query.trim()
    ? records.filter((r) => r.personName.toLowerCase().includes(query.trim().toLowerCase()))
    : records;

  const selected = records
    .map((r) => ({ record: r, amount: round2(parseFloat(amounts[r.id] || "") || 0) }))
    .filter((s) => s.amount > 0);
  const total = round2(selected.reduce((sum, s) => sum + s.amount, 0));
  const overpaid = selected.filter((s) => s.amount > s.record.remaining);

  const setAmount = (id: string, value: string) => setAmounts((a) => ({ ...a, [id]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selected.length === 0) {
      showToast(`Enter a ${terms.payment.toLowerCase()} amount for at least one person.`, "error");
      return;
    }
    if (overpaid.length > 0) {
      const s = overpaid[0];
      showToast(
        `${terms.payment} for ${s.record.personName} can't be more than the remaining ${formatMoney(s.record.remaining)}.`,
        "error",
      );
      return;
    }

    const names = [...new Set(selected.map((s) => s.record.personName))];
    const ok = await confirm({
      title: config.submit,
      message: isLent
        ? `Record ${formatMoney(total)} received from ${joinNames(names)}? It will be added to your available balance and reduce your receivable.`
        : `Record ${formatMoney(total)} paid to ${joinNames(names)}? It will be deducted from your available balance and reduce your payable.`,
      confirmText: "Confirm",
      variant: isLent ? "success" : "info",
    });
    if (!ok) return;

    startTransition(async () => {
      const res = await recordMoneyPayments({
        items: selected.map((s) => ({ recordId: s.record.id, amount: s.amount })),
        paymentDate: paymentDate.toISOString(),
        note: note.trim() || undefined,
      });
      if (res.success) {
        const who = names.length === 1 ? names[0] : `${names.length} people`;
        showToast(
          isLent ? `Recorded ${formatMoney(total)} repaid by ${who}.` : `Recorded ${formatMoney(total)} paid to ${who}.`,
          "success",
        );
        onDone();
      } else {
        showToast(res.error || `Failed to record ${terms.payment.toLowerCase()}.`, "error");
      }
    });
  };

  if (loadError) {
    return (
      <div className="alert alert-danger">
        <AlertCircle />
        <div className="flex-1">
          <p>{loadError}</p>
          <button type="button" onClick={onRetry} className="mt-1.5 font-medium underline underline-offset-2 cursor-pointer inline-flex items-center gap-1">
            <RefreshCw className="h-3.5! w-3.5! mt-0!" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true" aria-label="Loading records">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-line p-3">
            <div className="skeleton h-4 flex-1" />
            <div className="skeleton h-9 w-32" />
          </div>
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center text-center rounded-lg border border-dashed border-line px-6 py-10">
        <div className="h-10 w-10 rounded-full bg-subtle flex items-center justify-center mb-3">
          <HandCoins className="h-5 w-5 text-faint" />
        </div>
        <p className="text-sm font-medium text-fg">
          {isLent ? "Nobody owes you right now" : "You don't owe anyone right now"}
        </p>
        <p className="text-[13px] text-muted mt-1 max-w-xs">
          {isLent
            ? "Record money you lent first — repayments are matched against it."
            : "Record money you borrowed first — payments are matched against it."}
        </p>
        <Link href="/lend-borrow" className="btn btn-ghost btn-sm mt-3 group">
          Open Lend &amp; Borrow
          <ArrowRight className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </div>
    );
  }

  return (
    <form id={formId} onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="label mb-0!">{isLent ? "Who is paying you back?" : "Whom are you paying back?"}</span>
          {total > 0 && (
            <span className="text-xs text-muted">
              Total <span className="tabular font-semibold text-fg">{formatMoney(total)}</span>
            </span>
          )}
        </div>

        {records.length > 5 && (
          <div className="relative mb-2">
            <Search className="input-icon" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a person"
              className="input pl-9"
              aria-label="Find a person"
            />
          </div>
        )}

        <ul className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-0.5">
          {visible.map((r) => {
            const value = amounts[r.id] || "";
            const parsed = parseFloat(value) || 0;
            const tooMuch = parsed > r.remaining;
            const active = parsed > 0;
            return (
              <li
                key={r.id}
                className={`rounded-lg border p-3 transition-colors ${
                  tooMuch ? "border-danger" : active ? "border-accent bg-accent-soft/40" : "border-line"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-fg truncate">{r.personName}</p>
                    <p className="text-xs text-faint truncate">
                      Remaining{" "}
                      <span className={`tabular font-medium ${isLent ? "text-success" : "text-warning"}`}>
                        {formatMoney(r.remaining)}
                      </span>{" "}
                      of {formatMoney(r.amount)} · {formatDate(r.date, { month: "short", day: "numeric" })}
                      {r.note && ` · ${r.note}`}
                    </p>
                  </div>
                  <div className="relative w-32 shrink-0">
                    <DollarSign className="input-icon" />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={r.remaining}
                      value={value}
                      onChange={(e) => setAmount(r.id, e.target.value)}
                      placeholder="0.00"
                      aria-label={`${terms.payment} amount for ${r.personName}`}
                      aria-invalid={tooMuch}
                      className={`input pl-9 tabular ${tooMuch ? "border-danger!" : ""}`}
                      disabled={isPending}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  {tooMuch ? (
                    <span className="text-xs text-danger">Max {formatMoney(r.remaining)}</span>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    onClick={() => setAmount(r.id, active && parsed === r.remaining ? "" : r.remaining.toFixed(2))}
                    className="text-xs font-medium text-accent-fg hover:underline underline-offset-2 cursor-pointer"
                    disabled={isPending}
                  >
                    {active && parsed === r.remaining ? "Clear" : "Full amount"}
                  </button>
                </div>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="text-center text-[13px] text-faint py-4">No one matches “{query}”.</li>
          )}
        </ul>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">{terms.payment} date</label>
          <div className="relative">
            <Calendar className="input-icon" />
            <DatePicker
              selected={paymentDate}
              onChange={(d: Date | null) => setPaymentDate(d || new Date())}
              dateFormat="MMM d, yyyy"
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
          <label className="label" htmlFor="money-settle-note">
            Note <span className="text-faint font-normal">(optional)</span>
          </label>
          <input
            id="money-settle-note"
            type="text"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isLent ? "e.g. Paid in cash" : "e.g. Bank transfer"}
            className="input"
            disabled={isPending}
          />
        </div>
      </div>

      <p className="text-xs text-faint">
        {isLent
          ? "Adds to your available balance and reduces what others owe you."
          : "Deducted from your available balance and reduces what you owe."}
      </p>
    </form>
  );
}
