"use client";

import React, { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  HandCoins,
  History,
  Pencil,
  Plus,
  Search,
  SearchX,
  Trash2,
  X,
} from "lucide-react";
import TakaSign from "@/components/TakaSign";
import DatePicker from "react-datepicker";
import PageHeader from "./PageHeader";
import AnimatedNumber from "./AnimatedNumber";
import MoneyRecordModal from "./MoneyRecordModal";
import MoneyPaymentModal from "./MoneyPaymentModal";
import MoneyDetailsModal from "./MoneyDetailsModal";
import { MoneyStatusBadge, MoneyTypeIcon, SettledBar } from "./MoneyBadges";
import { Select, type SelectOption } from "./Select";
import SegmentIndicator from "./SegmentIndicator";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmModal";
import { deleteMoneyRecord } from "@/actions/money";
import { useI18n } from "./I18nProvider";
import { useDatePickerI18n } from "./useDatePickerI18n";
import type { Messages } from "@/lib/i18n/messages";
import {
  MONEY_STATUS_FILTERS,
  isMoneyType,
  remainingOf,
  type MoneyRecordView,
  type MoneySummary,
  type MoneyType,
} from "@/lib/money";

interface MoneyClientProps {
  records: MoneyRecordView[];
  summary: MoneySummary;
  people: string[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
}

const BASE = "/lend-borrow";
const FILTER_KEYS = [
  "status",
  "person",
  "dateRange",
  "startDate",
  "endDate",
  "minAmount",
  "maxAmount",
  "sortBy",
];

/** Local-date <-> "YYYY-MM-DD" (avoids the UTC shift of toISOString). */
const toYmd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromYmd = (s: string | null) => {
  const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
};

const shortDate = { month: "short", day: "numeric", year: "numeric" } as const;

const statusDot: Record<string, string> = {
  OPEN: "bg-subtle text-muted",
  PENDING: "bg-warning-soft text-warning",
  PARTIALLY_PAID: "bg-accent-soft text-accent-fg",
  OVERDUE: "bg-danger-soft text-danger",
  PAID: "bg-success-soft text-success",
};
const Dot = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 8 8" className={className} aria-hidden>
    <circle cx="4" cy="4" r="3" fill="currentColor" />
  </svg>
);

const statusOptions = (m: Messages): SelectOption[] => [
  { value: "", label: m.money.anyStatus },
  ...MONEY_STATUS_FILTERS.map((s) => ({
    value: s as string,
    label: m.moneyStatus[s],
    icon: Dot,
    iconClassName: statusDot[s],
  })),
];

const dateOptions = (m: Messages): SelectOption[] => [
  { value: "", label: m.money.anyTime },
  ...(["today", "week", "month", "custom"] as const).map((value) => ({
    value,
    label: m.money.dates[value],
  })),
];

const SORT_VALUES = [
  "latest",
  "oldest",
  "highest",
  "lowest",
  "due",
  "person",
] as const;
const sortOptions = (m: Messages): SelectOption[] =>
  SORT_VALUES.map((value) => ({ value, label: m.money.sorts[value] }));

// ─── Summary ─────────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone,
  deco,
}: {
  label: string;
  value: number;
  hint: React.ReactNode;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "success" | "warning" | "neutral";
  /** Gradient tint class, e.g. "deco-teal". */
  deco: string;
}) {
  const { fmt } = useI18n();
  const tile =
    tone === "success"
      ? "bg-success-soft! text-success!"
      : tone === "warning"
        ? "bg-warning-soft! text-warning!"
        : "";
  return (
    <Link
      href={href}
      className={`card card-interactive card-deco ${deco} p-4 md:p-5 block`}
    >
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <span className={`icon-tile h-8 w-8 rounded-lg ${tile}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="stat-value mt-3">
        <AnimatedNumber value={value} format={fmt.money} />
      </p>
      <p className="text-xs mt-1 text-faint">{hint}</p>
    </Link>
  );
}

function OverdueHint({ count, base }: { count: number; base: string }) {
  const { m } = useI18n();
  if (count === 0) return <>{base}</>;
  return (
    <>
      {base} ·{" "}
      <span className="text-danger font-medium">
        {m.money.overdueCount(count)}
      </span>
    </>
  );
}

// ─── Filters ─────────────────────────────────────────────────────────────────

/**
 * Keyed on the URL by the parent, so its local state always starts from the
 * current query and never needs syncing in an effect.
 */
function FilterBar({
  apply,
  clear,
}: {
  apply: (updates: Record<string, string | null>) => void;
  clear: () => void;
}) {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { m } = useI18n();
  const datePickerI18n = useDatePickerI18n("short");
  const get = (k: string) => searchParams.get(k) || "";

  const [person, setPerson] = useState(get("person"));
  const [minAmount, setMinAmount] = useState(get("minAmount"));
  const [maxAmount, setMaxAmount] = useState(get("maxAmount"));
  const status = get("status");
  const dateRange = get("dateRange");
  const sortBy = get("sortBy") || "latest";
  const startDate = fromYmd(searchParams.get("startDate"));
  const endDate = fromYmd(searchParams.get("endDate"));

  const hasFilters = FILTER_KEYS.some((k) => searchParams.has(k));

  const applyAmounts = () => {
    const min = minAmount.trim();
    const max = maxAmount.trim();
    if ((min && Number(min) < 0) || (max && Number(max) < 0)) {
      showToast(m.money.negativeAmounts, "error");
      return false;
    }
    if (min && max && Number(min) > Number(max)) {
      showToast(m.money.minOverMax, "error");
      return false;
    }
    return { minAmount: min || null, maxAmount: max || null };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amounts = applyAmounts();
    if (!amounts) return;
    apply({ person: person.trim() || null, ...amounts });
  };

  const handleAmountBlur = () => {
    if (
      minAmount.trim() === get("minAmount") &&
      maxAmount.trim() === get("maxAmount")
    )
      return;
    const amounts = applyAmounts();
    if (amounts) apply(amounts);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <div className="flex flex-col lg:flex-row gap-2.5">
        <div className="relative flex-1">
          <Search className="input-icon" />
          <input
            type="search"
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            placeholder={m.money.searchPerson}
            className="input pl-9 pr-8"
            aria-label={m.money.searchPersonLabel}
          />
          {person && (
            <button
              type="button"
              onClick={() => {
                setPerson("");
                apply({ person: null });
              }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn h-6 w-6"
              aria-label={m.expenses.clearSearch}
            >
              <X className="h-3.5! w-3.5!" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-2.5">
          <Select
            value={status}
            onChange={(v) => apply({ status: v || null })}
            options={statusOptions(m)}
            className="lg:w-44"
            aria-label={m.money.status}
          />

          <Select
            value={dateRange}
            onChange={(v) =>
              apply({ dateRange: v || null, startDate: null, endDate: null })
            }
            options={dateOptions(m)}
            className="lg:w-40"
            aria-label={m.expenses.dateRange}
          />

          <div className="col-span-2 sm:col-span-1">
            <Select
              value={sortBy}
              onChange={(v) => apply({ sortBy: v === "latest" ? null : v })}
              options={sortOptions(m)}
              className="lg:w-48"
              aria-label={m.expenses.sort}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2.5">
        <div className="grid grid-cols-2 gap-2.5 sm:w-72">
          <div className="relative">
            <TakaSign className="input-icon" />
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              onBlur={handleAmountBlur}
              placeholder={m.money.minAmount}
              className="input pl-9 tabular"
              aria-label={m.money.minAmountLabel}
            />
          </div>
          <div className="relative">
            <TakaSign className="input-icon" />
            <input
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              onBlur={handleAmountBlur}
              placeholder={m.money.maxAmount}
              className="input pl-9 tabular"
              aria-label={m.money.maxAmountLabel}
            />
          </div>
        </div>

        {dateRange === "custom" && (
          <div className="grid grid-cols-2 gap-2.5 sm:w-80 animate-fade-in">
            <div className="relative">
              <Calendar className="input-icon" />
              <DatePicker
                selected={startDate}
                onChange={(d: Date | null) =>
                  apply({ startDate: d ? toYmd(d) : null })
                }
                maxDate={endDate ?? undefined}
                placeholderText={m.expenses.startDate}
                {...datePickerI18n}
                fixedHeight
                className="input pl-9 cursor-pointer"
                wrapperClassName="w-full"
              />
            </div>
            <div className="relative">
              <Calendar className="input-icon" />
              <DatePicker
                selected={endDate}
                onChange={(d: Date | null) =>
                  apply({ endDate: d ? toYmd(d) : null })
                }
                minDate={startDate ?? undefined}
                placeholderText={m.expenses.endDate}
                {...datePickerI18n}
                fixedHeight
                className="input pl-9 cursor-pointer"
                wrapperClassName="w-full"
              />
            </div>
          </div>
        )}

        {/* Lets Enter submit from the amount fields */}
        <button type="submit" className="sr-only">
          {m.money.applyFilters}
        </button>

        {hasFilters && (
          <button
            type="button"
            onClick={clear}
            className="btn btn-ghost btn-sm sm:ml-auto self-start sm:self-auto"
          >
            <X />
            {m.expenses.clearFilters}
          </button>
        )}
      </div>
    </form>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function MoneyClient({
  records,
  summary,
  people,
  pagination,
}: MoneyClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { m, fmt } = useI18n();
  const [isPending, startTransition] = useTransition();

  const typeParam = searchParams.get("type");
  const activeType: MoneyType | null = isMoneyType(typeParam)
    ? typeParam
    : null;

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<MoneyRecordView | undefined>();
  const [viewing, setViewing] = useState<MoneyRecordView | undefined>();
  const [paying, setPaying] = useState<MoneyRecordView | undefined>();

  // Tab highlight moves immediately; the URL/data follow when the server responds
  const [shownType, setShownType] = useOptimistic(activeType);

  const navigate = (params: URLSearchParams, before?: () => void) => {
    const qs = params.toString();
    startTransition(() => {
      before?.();
      router.push(qs ? `${BASE}?${qs}` : BASE);
    });
  };

  const apply = (
    updates: Record<string, string | null>,
    before?: () => void,
  ) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!("page" in updates)) params.delete("page");
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === "") params.delete(key);
      else params.set(key, val);
    }
    navigate(params, before);
  };

  const clearFilters = () => {
    const params = new URLSearchParams();
    if (activeType) params.set("type", activeType);
    navigate(params);
  };

  const openNew = () => {
    setEditing(undefined);
    setFormOpen(true);
  };
  const openEdit = (r: MoneyRecordView) => {
    setViewing(undefined);
    setEditing(r);
    setFormOpen(true);
  };
  const openPayment = (r: MoneyRecordView) => {
    setViewing(undefined);
    setPaying(r);
  };

  const handleDelete = async (r: MoneyRecordView) => {
    const remaining = remainingOf(r);
    const terms = m.moneyTerms[r.type];
    const effect =
      remaining === 0
        ? m.money.deleteEffectSettled
        : r.type === "LENT"
          ? m.money.deleteEffectLent(fmt.money(remaining))
          : m.money.deleteEffectBorrowed(fmt.money(remaining));
    const ok = await confirm({
      title: terms.deleteRecord,
      message: m.money.deleteMessage(
        r.personName,
        r.payments.length,
        terms.payment,
        effect,
      ),
      confirmText: m.delete,
      variant: "danger",
      icon: <Trash2 className="h-6 w-6" />,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteMoneyRecord(r.id);
      if (res.success) showToast(m.money.recordDeleted, "success");
      else showToast(res.error || m.money.deleteFailed, "error");
    });
  };

  const tabs: Array<{
    value: MoneyType | null;
    label: string;
    icon?: React.ComponentType<{ className?: string }>;
  }> = [
    { value: null, label: m.money.all },
    { value: "LENT", label: m.moneyTerms.LENT.label, icon: ArrowUpRight },
    {
      value: "BORROWED",
      label: m.moneyTerms.BORROWED.label,
      icon: ArrowDownLeft,
    },
  ];

  const settledHeader = activeType
    ? m.moneyTerms[activeType].settled
    : m.money.colSettledBoth;
  const firstItem = (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(
    pagination.page * pagination.limit,
    pagination.total,
  );
  const hasFilters = FILTER_KEYS.some((k) => searchParams.has(k));

  const rowActions = (r: MoneyRecordView) => {
    const terms = m.moneyTerms[r.type];
    const paid = remainingOf(r) === 0;
    return (
      <>
        <button
          onClick={() => setViewing(r)}
          className="icon-btn"
          title={m.expenses.viewDetails}
          aria-label={m.expenses.viewDetails}
        >
          <Eye />
        </button>
        <button
          onClick={() => openPayment(r)}
          className="icon-btn icon-btn-success"
          title={paid ? m.money.fullyPaid : terms.recordPayment}
          aria-label={terms.recordPayment}
          disabled={paid}
        >
          <Banknote />
        </button>
        <button
          onClick={() => openEdit(r)}
          className="icon-btn"
          title={m.edit}
          aria-label={m.edit}
        >
          <Pencil />
        </button>
        <button
          onClick={() => handleDelete(r)}
          className="icon-btn icon-btn-danger"
          title={m.delete}
          aria-label={m.delete}
        >
          <Trash2 />
        </button>
      </>
    );
  };

  const dueLabel = (r: MoneyRecordView) =>
    r.dueDate ? (
      <span
        className={
          r.displayStatus === "OVERDUE" ? "text-danger font-medium" : ""
        }
      >
        {m.money.due(fmt.date(r.dueDate, shortDate))}
      </span>
    ) : (
      <span>{m.money.noDueDate}</span>
    );

  return (
    <>
      <PageHeader
        icon={HandCoins}
        title={m.money.title}
        description={m.money.description}
        actions={
          <>
            <Link
              href="/transaction-history?type=LendBorrow"
              className="btn btn-secondary"
            >
              <History />
              {m.money.history}
            </Link>
            <button onClick={openNew} className="btn btn-primary">
              <Plus />
              {m.money.newRecord}
            </button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <SummaryCard
          label={m.money.totalLent}
          deco="deco-teal"
          value={summary.totalLent}
          hint={m.money.outstandingCount(summary.activeLending)}
          href={`${BASE}?type=LENT`}
          icon={ArrowUpRight}
          tone="neutral"
        />
        <SummaryCard
          label={m.money.receivable}
          deco="deco-violet"
          value={summary.receivable}
          hint={
            <OverdueHint
              count={summary.overdueLending}
              base={m.money.othersOweYou}
            />
          }
          href={`${BASE}?type=LENT&status=OPEN`}
          icon={HandCoins}
          tone="success"
        />
        <SummaryCard
          label={m.money.totalBorrowed}
          deco="deco-amber"
          value={summary.totalBorrowed}
          hint={m.money.outstandingCount(summary.activeBorrowing)}
          href={`${BASE}?type=BORROWED`}
          icon={ArrowDownLeft}
          tone="neutral"
        />
        <SummaryCard
          label={m.money.payable}
          deco="deco-blue"
          value={summary.payable}
          hint={
            <OverdueHint
              count={summary.overdueBorrowing}
              base={m.money.youOweOthers}
            />
          }
          href={`${BASE}?type=BORROWED&status=OPEN`}
          icon={Banknote}
          tone="warning"
        />
      </div>

      <section className="card overflow-hidden">
        <div className="card-head flex flex-col gap-3 p-3 md:p-4">
          <div
            className="segmented sm:max-w-sm"
            role="tablist"
            aria-label={m.money.recordType}
          >
            <SegmentIndicator />
            {tabs.map((t) => {
              const active = shownType === t.value;
              const Icon = t.icon;
              return (
                <button
                  key={t.value ?? "all"}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  data-active={active}
                  onClick={() =>
                    apply({ type: t.value }, () => setShownType(t.value))
                  }
                >
                  {Icon && (
                    <Icon
                      className={
                        active
                          ? t.value === "LENT"
                            ? "text-success"
                            : "text-warning"
                          : ""
                      }
                    />
                  )}
                  {t.label}
                </button>
              );
            })}
          </div>
          <FilterBar
            key={searchParams.toString()}
            apply={apply}
            clear={clearFilters}
          />
        </div>

        {records.length === 0 ? (
          summary.recordCount === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-6 py-16">
              <div className="h-10 w-10 rounded-full bg-subtle flex items-center justify-center mb-3">
                <HandCoins className="h-5 w-5 text-faint" />
              </div>
              <p className="text-sm font-medium text-fg">
                {m.money.emptyTitle}
              </p>
              <p className="text-[13px] text-muted mt-1 max-w-sm">
                {m.money.emptyBody}
              </p>
              <button
                onClick={openNew}
                className="btn btn-secondary btn-sm mt-4"
              >
                <Plus />
                {m.money.newRecord}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center px-6 py-16">
              <div className="h-10 w-10 rounded-full bg-subtle flex items-center justify-center mb-3">
                <SearchX className="h-5 w-5 text-faint" />
              </div>
              <p className="text-sm font-medium text-fg">
                {m.money.noMatchTitle}
              </p>
              <p className="text-[13px] text-muted mt-1 max-w-sm">
                {m.money.noMatchBody}
              </p>
              {(hasFilters || activeType) && (
                <button
                  onClick={() => navigate(new URLSearchParams())}
                  className="btn btn-secondary btn-sm mt-4"
                >
                  <X />
                  {m.money.showAll}
                </button>
              )}
            </div>
          )
        ) : (
          <div
            className={`transition-[opacity,filter] ${isPending ? "is-refreshing" : ""}`}
          >
            {/* Desktop / tablet table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>{m.money.colPerson}</th>
                    <th className="text-right!">{m.money.colAmount}</th>
                    <th className="text-right!">{settledHeader}</th>
                    <th className="text-right!">{m.money.colRemaining}</th>
                    <th>{m.money.colDate}</th>
                    <th>{m.money.colStatus}</th>
                    <th className="w-px">
                      <span className="sr-only">{m.expenses.colActions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="stagger-rows" key={searchParams.toString()}>
                  {records.map((r) => {
                    const terms = m.moneyTerms[r.type];
                    const remaining = remainingOf(r);
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setViewing(r)}
                        className="cursor-pointer"
                      >
                        <td>
                          <div className="flex items-center gap-3 min-w-0">
                            <MoneyTypeIcon type={r.type} />
                            <div className="min-w-0">
                              <p className="font-medium text-fg truncate max-w-40 lg:max-w-56">
                                {r.personName}
                              </p>
                              <p className="text-xs text-faint truncate max-w-40 lg:max-w-56">
                                {terms.label} {terms.arrow}
                                {r.note && ` · ${r.note}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right whitespace-nowrap tabular text-muted">
                          {fmt.money(r.amount)}
                        </td>
                        <td className="text-right whitespace-nowrap tabular text-muted">
                          {fmt.money(r.paidAmount)}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <span
                            className={`font-semibold tabular ${
                              remaining === 0
                                ? "text-faint"
                                : r.type === "LENT"
                                  ? "text-success"
                                  : "text-warning"
                            }`}
                          >
                            {fmt.money(remaining)}
                          </span>
                          <div className="w-20 ml-auto mt-1.5">
                            <SettledBar
                              amount={r.amount}
                              paidAmount={r.paidAmount}
                              type={r.type}
                            />
                          </div>
                        </td>
                        <td className="whitespace-nowrap">
                          <p className="text-muted">
                            {fmt.date(r.date, shortDate)}
                          </p>
                          <p className="text-xs text-faint mt-0.5">
                            {dueLabel(r)}
                          </p>
                        </td>
                        <td>
                          <MoneyStatusBadge status={r.displayStatus} />
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions flex items-center justify-end">
                            {rowActions(r)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul
              className="md:hidden divide-y divide-line stagger-rows"
              key={`m-${searchParams.toString()}`}
            >
              {records.map((r) => {
                const terms = m.moneyTerms[r.type];
                const remaining = remainingOf(r);
                return (
                  <li key={r.id} className="px-4 py-3.5">
                    <button
                      onClick={() => setViewing(r)}
                      className="w-full flex items-start gap-3 text-left cursor-pointer"
                    >
                      <MoneyTypeIcon type={r.type} className="h-9 w-9" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-fg truncate">
                          {r.personName}
                        </span>
                        <span className="block text-xs text-faint mt-0.5">
                          {terms.label} {terms.arrow} ·{" "}
                          {fmt.date(r.date, { month: "short", day: "numeric" })}
                        </span>
                      </span>
                      <span className="flex flex-col items-end gap-1 shrink-0">
                        <span
                          className={`font-semibold tabular ${
                            remaining === 0
                              ? "text-faint"
                              : r.type === "LENT"
                                ? "text-success"
                                : "text-warning"
                          }`}
                        >
                          {fmt.money(remaining)}
                        </span>
                        <MoneyStatusBadge status={r.displayStatus} />
                      </span>
                    </button>

                    <dl className="grid grid-cols-3 gap-2 mt-3 text-xs">
                      <div>
                        <dt className="text-faint">{terms.label}</dt>
                        <dd className="tabular text-fg font-medium">
                          {fmt.money(r.amount)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-faint">{terms.settled}</dt>
                        <dd className="tabular text-fg font-medium">
                          {fmt.money(r.paidAmount)}
                        </dd>
                      </div>
                      <div className="text-right">
                        <dt className="text-faint">{m.money.remaining}</dt>
                        <dd className="tabular text-fg font-medium">
                          {fmt.money(remaining)}
                        </dd>
                      </div>
                    </dl>
                    <div className="mt-2">
                      <SettledBar
                        amount={r.amount}
                        paidAmount={r.paidAmount}
                        type={r.type}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2">
                      <span className="text-xs text-faint">{dueLabel(r)}</span>
                      <div className="flex items-center -mr-1.5">
                        {rowActions(r)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {pagination.total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
            <span className="text-[13px] text-muted">
              <span className="tabular">
                {m.expenses.range(firstItem, lastItem, pagination.total)}
              </span>
            </span>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => apply({ page: String(pagination.page - 1) })}
                  className="btn btn-secondary btn-sm"
                >
                  <ChevronLeft />
                  {m.expenses.prev}
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => apply({ page: String(pagination.page + 1) })}
                  className="btn btn-secondary btn-sm"
                >
                  {m.expenses.next}
                  <ChevronRight />
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      <MoneyDetailsModal
        record={viewing}
        onClose={() => setViewing(undefined)}
        onEdit={openEdit}
        onRecordPayment={openPayment}
      />

      <MoneyPaymentModal record={paying} onClose={() => setPaying(undefined)} />

      <MoneyRecordModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditing(undefined);
        }}
        record={editing}
        defaultType={activeType ?? "LENT"}
        people={people}
      />
    </>
  );
}
