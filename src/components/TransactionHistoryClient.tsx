"use client";

import React, { Fragment, useState } from "react";
import Link from "next/link";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  HandCoins,
  Banknote,
} from "lucide-react";
import { getCategoryIcon, getCategoryGlow } from "@/lib/categories";
import { useI18n } from "./I18nProvider";
import { useDatePickerI18n } from "./useDatePickerI18n";
import { categoryLabel, type Messages } from "@/lib/i18n/messages";
import SplitBreakdown, { Collapse, type ExpenseSplitView } from "./SplitBreakdown";
import DatePicker from "react-datepicker";
import SegmentIndicator from "./SegmentIndicator";
import { Select, type SelectOption } from "./Select";

export type LedgerKind = "income" | "expense" | "lent" | "borrowed" | "repaid" | "paidback";
export type HistoryTab = "All" | "Income" | "Expense" | "LendBorrow";

/** One balance-moving event: an expense/income, or a lend & borrow record or payment. */
export interface LedgerEntry {
  id: string;
  kind: LedgerKind;
  title: string;
  amount: number;
  /** Expense category, or the lend & borrow label (Lent, Borrowed, Repayment, Payment). */
  category: string;
  note: string;
  date: string;
  /** "YYYY-MM-DD" of `date` in the viewer's time zone. */
  day: string;
  createdAt: string;
  splits: ExpenseSplitView[];
  /** "YYYY-MM-DD" of each breakdown item, in the same order as `splits`. */
  splitDays: string[];
  /** Set for lend & borrow entries. */
  person?: string;
}

interface TransactionHistoryClientProps {
  entries: LedgerEntry[];
  startingBalance: number;
  initialTab?: HistoryTab;
  /** Today as "YYYY-MM-DD" in the viewer's time zone. */
  today: string;
}

type Period = "thisMonth" | "lastMonth" | "last3Months" | "thisYear" | "all" | "custom";
const PERIODS: Period[] = ["thisMonth", "lastMonth", "last3Months", "thisYear", "all", "custom"];
const DEFAULT_PERIOD: Period = "thisMonth";

const pad = (n: number) => String(n).padStart(2, "0");
/** Day key for a (possibly overflowing) calendar date, e.g. d = 0 → last day of previous month. */
const dayKey = (y: number, m: number, d: number) => {
  const t = new Date(Date.UTC(y, m, d));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
};
/** Day key ↔ local Date for the date pickers (calendar date only, no time-zone shift). */
const keyToDate = (key: string) => {
  if (!key) return null;
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const dateToKey = (date: Date | null) =>
  date ? `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` : "";

function periodRange(period: Period, today: string): { from: string; to: string } {
  const [y, mo] = today.split("-").map(Number);
  const m = mo - 1;
  switch (period) {
    case "thisMonth":
      return { from: dayKey(y, m, 1), to: dayKey(y, m + 1, 0) };
    case "lastMonth":
      return { from: dayKey(y, m - 1, 1), to: dayKey(y, m, 0) };
    case "last3Months":
      return { from: dayKey(y, m - 2, 1), to: dayKey(y, m + 1, 0) };
    case "thisYear":
      return { from: dayKey(y, 0, 1), to: dayKey(y, 11, 31) };
    default:
      return { from: "", to: "" };
  }
}

const MONEY_KINDS: LedgerKind[] = ["lent", "borrowed", "repaid", "paidback"];
const isMoneyKind = (k: LedgerKind) => MONEY_KINDS.includes(k);
/** Money coming into the wallet. */
const isInflow = (k: LedgerKind) => k === "income" || k === "borrowed" || k === "repaid";

const moneyMeta: Record<
  "lent" | "borrowed" | "repaid" | "paidback",
  { icon: React.ComponentType<{ className?: string }>; tint: string }
> = {
  lent: { icon: ArrowUpRight, tint: "bg-success-soft text-success" },
  borrowed: { icon: ArrowDownLeft, tint: "bg-warning-soft text-warning" },
  repaid: { icon: HandCoins, tint: "bg-success-soft text-success" },
  paidback: { icon: Banknote, tint: "bg-warning-soft text-warning" },
};

const iconFor = (e: LedgerEntry) =>
  isMoneyKind(e.kind) ? moneyMeta[e.kind as keyof typeof moneyMeta].icon : getCategoryIcon(e.category);
const tintFor = (e: LedgerEntry) =>
  isMoneyKind(e.kind) ? moneyMeta[e.kind as keyof typeof moneyMeta].tint : getCategoryGlow(e.category);

const TAB_VALUES: HistoryTab[] = ["All", "Income", "Expense", "LendBorrow"];

const moneyFilterOptions = (m: Messages): SelectOption[] => [
  { value: "all", label: m.history.moneyFilter.all, icon: HandCoins, iconClassName: "bg-subtle text-muted" },
  { value: "lent", label: m.history.moneyFilter.lent, icon: ArrowUpRight, iconClassName: moneyMeta.lent.tint },
  { value: "borrowed", label: m.history.moneyFilter.borrowed, icon: ArrowDownLeft, iconClassName: moneyMeta.borrowed.tint },
  { value: "repaid", label: m.history.moneyFilter.repaid, icon: HandCoins, iconClassName: moneyMeta.repaid.tint },
  { value: "paidback", label: m.history.moneyFilter.paidback, icon: Banknote, iconClassName: moneyMeta.paidback.tint },
];

export default function TransactionHistoryClient({
  entries,
  startingBalance,
  initialTab = "All",
  today,
}: TransactionHistoryClientProps) {
  const { m, fmt } = useI18n();
  const h = m.history;
  const datePickerI18n = useDatePickerI18n("short");
  // Expense entries carry their stored category; lend & borrow ones are labelled by kind
  const categoryText = (e: LedgerEntry) =>
    isMoneyKind(e.kind) ? h.kinds[e.kind as keyof typeof h.kinds] : categoryLabel(m, e.category);

  // --- Filter and Search States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<HistoryTab>(initialTab);
  const [moneyFilter, setMoneyFilter] = useState("all");
  // Date range as "YYYY-MM-DD" keys; opens on the current month
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);
  const [startDate, setStartDate] = useState(() => periodRange(DEFAULT_PERIOD, today).from);
  const [endDate, setEndDate] = useState(() => periodRange(DEFAULT_PERIOD, today).to);

  const selectPeriod = (p: Period) => {
    setPeriod(p);
    if (p !== "custom") {
      const range = periodRange(p, today);
      setStartDate(range.from);
      setEndDate(range.to);
    }
    setCurrentPage(1);
  };

  // --- Pagination States ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Rows whose breakdown is currently shown
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // 1. Calculate sequential Running Balance chronologically (oldest-to-newest)
  const enriched = entries.reduce(
    (acc, e) => {
      const last = acc.length > 0 ? acc[acc.length - 1].runningBalance : startingBalance;
      acc.push({ ...e, runningBalance: isInflow(e.kind) ? last + e.amount : last - e.amount });
      return acc;
    },
    [] as Array<LedgerEntry & { runningBalance: number }>,
  );

  // 2. Present entries LATEST FIRST by default
  const latestFirst = [...enriched].reverse();

  // 3. Apply Filters
  const q = searchQuery.toLowerCase();
  const inRange = (day: string) => (!startDate || day >= startDate) && (!endDate || day <= endDate);
  const filtered = latestFirst.filter((e) => {
    // A. Search (title, note, person, breakdown items)
    const matchesSearch =
      !q ||
      e.title.toLowerCase().includes(q) ||
      e.note.toLowerCase().includes(q) ||
      (e.person ?? "").toLowerCase().includes(q) ||
      e.splits.some((s) => s.title.toLowerCase().includes(q));

    // B. Tab (+ lend & borrow sub-filter)
    const matchesTab =
      tab === "All" ||
      (tab === "Income" && e.kind === "income") ||
      (tab === "Expense" && e.kind === "expense") ||
      (tab === "LendBorrow" && isMoneyKind(e.kind) && (moneyFilter === "all" || e.kind === moneyFilter));

    // C. Date range — an expense also shows when any of its items fall in it
    const matchesDate = inRange(e.day) || e.splitDays.some(inRange);

    return matchesSearch && matchesTab && matchesDate;
  });

  // Balance just before the range and at its end (all entries, ignoring tab/search)
  const balanceBefore = (pred: (e: LedgerEntry) => boolean) => {
    let last = startingBalance;
    for (const e of enriched) {
      if (!pred(e)) break;
      last = e.runningBalance;
    }
    return last;
  };
  const openingBalance = balanceBefore((e) => !!startDate && e.day < startDate);
  const closingBalance = balanceBefore((e) => !endDate || e.day <= endDate);

  // 4. Handle Pagination
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Money in / out over the filtered entries (shown on the Lend & Borrow tab)
  const moneyIn = filtered.filter((e) => isInflow(e.kind)).reduce((s, e) => s + e.amount, 0);
  const moneyOut = filtered.filter((e) => !isInflow(e.kind)).reduce((s, e) => s + e.amount, 0);

  const handleResetFilters = () => {
    setSearchQuery("");
    setTab("All");
    setMoneyFilter("all");
    selectPeriod(DEFAULT_PERIOD);
  };

  // Helper to format dates beautifully
  const formatTransactionDate = (dateStr: string) => {
    return fmt.date(dateStr, { month: "short", day: "numeric", year: "numeric" });
  };

  const defaultRange = periodRange(DEFAULT_PERIOD, today);
  const hasFilters = !!(
    searchQuery ||
    tab !== "All" ||
    startDate !== defaultRange.from ||
    endDate !== defaultRange.to
  );
  const hasRange = !!(startDate || endDate);
  const pageKey = `${currentPage}-${searchQuery}-${tab}-${moneyFilter}-${startDate}-${endDate}`;

  const periodOptions: SelectOption[] = PERIODS.map((p) => ({
    value: p,
    label: h.periods[p],
    hint:
      p === "custom" || p === "all"
        ? undefined
        : (() => {
            const r = periodRange(p, today);
            return `${fmt.date(keyToDate(r.from)!, { month: "short", day: "numeric" })} – ${fmt.date(keyToDate(r.to)!, { month: "short", day: "numeric" })}`;
          })(),
  }));

  const titleFor = (e: LedgerEntry) =>
    e.person ? (
      <Link
        href={`/lend-borrow?person=${encodeURIComponent(e.person)}`}
        onClick={(ev) => ev.stopPropagation()}
        className="hover:text-accent-fg hover:underline underline-offset-2"
        title={h.openInLendBorrow(e.person)}
      >
        {e.title}
      </Link>
    ) : (
      e.title
    );

  return (
    <section className="card overflow-hidden">
      {/* Filters */}
      <div className="card-head flex flex-col gap-3 p-3 md:p-4">
        <div className="flex flex-col xl:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="input-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={h.searchPlaceholder}
              className="input pl-9"
            />
          </div>

          <div className="segmented xl:w-96 shrink-0" role="tablist" aria-label={h.entryType}>
            <SegmentIndicator />
            {TAB_VALUES.map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                data-active={tab === value}
                onClick={() => {
                  setTab(value);
                  setCurrentPage(1);
                }}
              >
                {value === "LendBorrow" ? (
                  <>
                    <span className="sm:hidden">{h.tabLendBorrowShort}</span>
                    <span className="hidden sm:inline">{h.tabs[value]}</span>
                  </>
                ) : (
                  h.tabs[value]
                )}
              </button>
            ))}
          </div>

        </div>

        <div className="grid grid-cols-2 sm:grid-cols-[13rem_1fr_1fr] xl:grid-cols-[13rem_11rem_11rem] gap-2.5">
          <div className="col-span-2 sm:col-span-1">
            <Select
              value={period}
              onChange={(v) => selectPeriod(v as Period)}
              options={periodOptions}
              aria-label={h.periodLabel}
            />
          </div>
          <div className="relative">
            <Calendar className="input-icon" />
            <DatePicker
              selected={keyToDate(startDate)}
              onChange={(date: Date | null) => {
                const key = dateToKey(date);
                setStartDate(key);
                if (key && endDate && key > endDate) setEndDate(key);
                setPeriod("custom");
                setCurrentPage(1);
              }}
              {...datePickerI18n}
              placeholderText={h.from}
              fixedHeight
              portalId="root-portal"
              className="input pl-9 cursor-pointer"
              wrapperClassName="w-full"
            />
          </div>
          <div className="relative">
            <Calendar className="input-icon" />
            <DatePicker
              selected={keyToDate(endDate)}
              onChange={(date: Date | null) => {
                const key = dateToKey(date);
                setEndDate(key);
                if (key && startDate && key < startDate) setStartDate(key);
                setPeriod("custom");
                setCurrentPage(1);
              }}
              {...datePickerI18n}
              placeholderText={h.to}
              fixedHeight
              portalId="root-portal"
              className="input pl-9 cursor-pointer"
              wrapperClassName="w-full"
            />
          </div>
        </div>

        {tab === "LendBorrow" && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 animate-fade-in">
            <div className="sm:w-60">
              <Select
                value={moneyFilter}
                onChange={(v) => {
                  setMoneyFilter(v);
                  setCurrentPage(1);
                }}
                options={moneyFilterOptions(m)}
                aria-label={h.moneyFilterLabel}
              />
            </div>
            <div className="flex items-center gap-4 text-[13px] text-muted sm:ml-auto">
              <span>
                {h.moneyIn}{" "}
                <span className="tabular font-medium text-success">+{fmt.money(moneyIn)}</span>
              </span>
              <span>
                {h.moneyOut}{" "}
                <span className="tabular font-medium text-fg">−{fmt.money(moneyOut)}</span>
              </span>
              <Link href="/lend-borrow" className="font-medium text-accent-fg hover:underline underline-offset-2">
                {h.manage}
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <span className="tabular font-medium text-fg">{fmt.number(totalItems)}</span>{" "}
              {h.entries(totalItems)}
            </span>
            <span className="text-line-strong">·</span>
            {hasRange ? (
              <>
                <span>
                  {h.openingBalance}{" "}
                  <span className="tabular font-medium text-fg">
                    {openingBalance < 0 && "−"}
                    {fmt.money(openingBalance)}
                  </span>
                </span>
                <span className="text-line-strong">→</span>
                <span>
                  {h.closingBalance}{" "}
                  <span className="tabular font-medium text-fg">
                    {closingBalance < 0 && "−"}
                    {fmt.money(closingBalance)}
                  </span>
                </span>
              </>
            ) : (
              <span>
                {h.startingBalance}{" "}
                <span className="tabular font-medium text-fg">
                  {fmt.money(startingBalance)}
                </span>
              </span>
            )}
          </div>
          {hasFilters && (
            <button onClick={handleResetFilters} className="btn btn-ghost btn-sm animate-fade-in">
              <FilterX />
              {h.resetFilters}
            </button>
          )}
        </div>
      </div>

      {paginated.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{h.colDate}</th>
                  <th>{h.colTransaction}</th>
                  <th>{h.colCategory}</th>
                  <th>{h.colType}</th>
                  <th className="text-right!">{h.colAmount}</th>
                  <th className="text-right!">{h.colBalance}</th>
                </tr>
              </thead>
              <tbody className="stagger-rows" key={pageKey}>
                {paginated.map((t) => {
                  const CategoryIcon = iconFor(t);
                  const isCredit = isInflow(t.kind);
                  const hasSplits = t.splits.length > 0;
                  const isOpen = expanded.has(t.id);

                  return (
                    <Fragment key={t.id}>
                      <tr
                        onClick={hasSplits ? () => toggleExpanded(t.id) : undefined}
                        className={`${hasSplits ? "cursor-pointer" : ""} ${isOpen ? "row-expanded bg-subtle/60" : ""}`}
                        aria-expanded={hasSplits ? isOpen : undefined}
                      >
                        <td className="text-muted whitespace-nowrap">
                          {formatTransactionDate(t.date)}
                        </td>
                        <td>
                          <p className="flex items-center gap-2 font-medium text-fg">
                            <span className="truncate max-w-xs">{titleFor(t)}</span>
                            {hasSplits && (
                              <span className="badge h-5 px-1.5 gap-0.5 text-[11px] shrink-0">
                                <ChevronRight className="chevron h-3 w-3" data-open={isOpen} />
                                {m.items(t.splits.length)}
                              </span>
                            )}
                          </p>
                          {t.note && (
                            <p className="text-xs text-faint truncate max-w-xs mt-0.5">{t.note}</p>
                          )}
                        </td>
                        <td>
                          <span className={`badge ${tintFor(t)}`}>
                            <CategoryIcon className="h-3 w-3" />
                            {categoryText(t)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-dot ${isCredit ? "badge-success" : "badge-danger"}`}>
                            {isCredit ? h.credit : h.debit}
                          </span>
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <span className={`font-semibold tabular ${isCredit ? "text-success" : "text-fg"}`}>
                            {isCredit ? "+" : "−"}
                            {fmt.money(t.amount)}
                          </span>
                        </td>
                        <td className="text-right whitespace-nowrap tabular text-muted">
                          {t.runningBalance < 0 && "−"}
                          {fmt.money(t.runningBalance)}
                        </td>
                      </tr>
                      {hasSplits && (
                        <tr className="expand-row">
                          <td colSpan={6} className="expand-cell bg-subtle/60" data-open={isOpen}>
                            <Collapse open={isOpen}>
                              {/* Indent under the "Transaction" column, amounts line up with Amount */}
                              <div className="pl-32 pr-44 pb-3">
                                <SplitBreakdown splits={t.splits} total={t.amount} />
                              </div>
                            </Collapse>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <ul className="md:hidden divide-y divide-line stagger-rows" key={`m-${pageKey}`}>
            {paginated.map((t) => {
              const CategoryIcon = iconFor(t);
              const isCredit = isInflow(t.kind);
              const hasSplits = t.splits.length > 0;
              const isOpen = expanded.has(t.id);

              return (
                <li key={t.id} className={`transition-colors duration-300 ${isOpen ? "bg-subtle/60" : ""}`}>
                  <div
                    onClick={hasSplits ? () => toggleExpanded(t.id) : undefined}
                    className={`flex items-start gap-3 px-4 py-3 ${hasSplits ? "cursor-pointer" : ""}`}
                    aria-expanded={hasSplits ? isOpen : undefined}
                  >
                    <span
                      className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${tintFor(t)}`}
                    >
                      <CategoryIcon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{titleFor(t)}</p>
                      <p className="flex items-center gap-1 text-xs text-faint mt-0.5">
                        {categoryText(t)} · {formatTransactionDate(t.date)}
                        {hasSplits && (
                          <>
                            {" · "}
                            <span className="inline-flex items-center gap-0.5 text-muted">
                              {m.items(t.splits.length)}
                              <ChevronRight className="chevron h-3 w-3" data-open={isOpen} />
                            </span>
                          </>
                        )}
                      </p>
                      {t.note && (
                        <p className="text-xs text-muted mt-1 line-clamp-2">{t.note}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-semibold tabular ${isCredit ? "text-success" : "text-fg"}`}>
                        {isCredit ? "+" : "−"}
                        {fmt.money(t.amount)}
                      </p>
                      <p className="text-xs text-faint tabular mt-0.5">
                        {t.runningBalance < 0 && "−"}
                        {fmt.money(t.runningBalance)}
                      </p>
                    </div>
                  </div>
                  {hasSplits && (
                    <Collapse open={isOpen}>
                      <div className="pl-12 pr-4 pb-3">
                        <SplitBreakdown splits={t.splits} total={t.amount} />
                      </div>
                    </Collapse>
                  )}
                </li>
              );
            })}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
              <span className="text-[13px] text-muted">
                <span className="tabular">{m.pageOf(currentPage, totalPages)}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  <ChevronLeft />
                  {m.expenses.prev}
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  {m.expenses.next}
                  <ChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-center px-6 py-16">
          <div className="h-10 w-10 rounded-full bg-subtle flex items-center justify-center mb-3">
            {tab === "LendBorrow" ? (
              <HandCoins className="h-5 w-5 text-faint" />
            ) : (
              <FilterX className="h-5 w-5 text-faint" />
            )}
          </div>
          <p className="text-sm font-medium text-fg">
            {tab === "LendBorrow" ? h.noLendBorrow : h.noneFound}
          </p>
          <p className="text-[13px] text-muted mt-1 max-w-sm">
            {tab === "LendBorrow" && !searchQuery && !hasRange
              ? h.lendBorrowEmpty
              : hasFilters
                ? h.filtersEmpty
                : h.empty}
          </p>
          {hasFilters && (
            <button onClick={handleResetFilters} className="btn btn-secondary btn-sm mt-4">
              {h.clearAll}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
