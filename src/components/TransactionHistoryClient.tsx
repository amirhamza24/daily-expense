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
import { formatMoney } from "@/lib/format";
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
  createdAt: string;
  splits: ExpenseSplitView[];
  /** Set for lend & borrow entries. */
  person?: string;
}

interface TransactionHistoryClientProps {
  entries: LedgerEntry[];
  startingBalance: number;
  initialTab?: HistoryTab;
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

const TABS: Array<{ value: HistoryTab; label: string; short?: string }> = [
  { value: "All", label: "All" },
  { value: "Income", label: "Income" },
  { value: "Expense", label: "Expense" },
  { value: "LendBorrow", label: "Lend & Borrow", short: "Lend/Borrow" },
];

const MONEY_FILTER_OPTIONS: SelectOption[] = [
  { value: "all", label: "All lend & borrow", icon: HandCoins, iconClassName: "bg-subtle text-muted" },
  { value: "lent", label: "Lent", icon: ArrowUpRight, iconClassName: moneyMeta.lent.tint },
  { value: "borrowed", label: "Borrowed", icon: ArrowDownLeft, iconClassName: moneyMeta.borrowed.tint },
  { value: "repaid", label: "Repayments received", icon: HandCoins, iconClassName: moneyMeta.repaid.tint },
  { value: "paidback", label: "Payments made", icon: Banknote, iconClassName: moneyMeta.paidback.tint },
];

export default function TransactionHistoryClient({
  entries,
  startingBalance,
  initialTab = "All",
}: TransactionHistoryClientProps) {
  // --- Filter and Search States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [tab, setTab] = useState<HistoryTab>(initialTab);
  const [moneyFilter, setMoneyFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

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

    // C. Date Range
    const tDate = new Date(e.date.split("T")[0] + "T00:00:00");
    const matchesStartDate = !startDate ? true : tDate >= new Date(startDate + "T00:00:00");
    const matchesEndDate = !endDate ? true : tDate <= new Date(endDate + "T23:59:59");

    return matchesSearch && matchesTab && matchesStartDate && matchesEndDate;
  });

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
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  // Helper to format dates beautifully
  const formatTransactionDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const hasFilters = !!(searchQuery || tab !== "All" || startDate || endDate);
  const pageKey = `${currentPage}-${searchQuery}-${tab}-${moneyFilter}-${startDate}-${endDate}`;

  const titleFor = (e: LedgerEntry) =>
    e.person ? (
      <Link
        href={`/lend-borrow?person=${encodeURIComponent(e.person)}`}
        onClick={(ev) => ev.stopPropagation()}
        className="hover:text-accent-fg hover:underline underline-offset-2"
        title={`Open ${e.person} in Lend & Borrow`}
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
              placeholder="Search by title, person or note…"
              className="input pl-9"
            />
          </div>

          <div className="segmented xl:w-96 shrink-0" role="tablist" aria-label="Entry type">
            <SegmentIndicator />
            {TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                role="tab"
                aria-selected={tab === t.value}
                data-active={tab === t.value}
                onClick={() => {
                  setTab(t.value);
                  setCurrentPage(1);
                }}
              >
                {t.short ? (
                  <>
                    <span className="sm:hidden">{t.short}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                  </>
                ) : (
                  t.label
                )}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5 xl:w-72 shrink-0">
            <div className="relative">
              <Calendar className="input-icon" />
              <DatePicker
                selected={startDate ? new Date(startDate) : null}
                onChange={(date: Date | null) => {
                  const dateStr = date ? date.toISOString().split("T")[0] : "";
                  setStartDate(dateStr);
                  setCurrentPage(1);
                }}
                dateFormat="MMM d, yyyy"
                placeholderText="From"
                fixedHeight
                className="input pl-9 cursor-pointer"
                wrapperClassName="w-full"
              />
            </div>
            <div className="relative">
              <Calendar className="input-icon" />
              <DatePicker
                selected={endDate ? new Date(endDate) : null}
                onChange={(date: Date | null) => {
                  const dateStr = date ? date.toISOString().split("T")[0] : "";
                  setEndDate(dateStr);
                  setCurrentPage(1);
                }}
                dateFormat="MMM d, yyyy"
                placeholderText="To"
                fixedHeight
                className="input pl-9 cursor-pointer"
                wrapperClassName="w-full"
              />
            </div>
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
                options={MONEY_FILTER_OPTIONS}
                aria-label="Lend & borrow entry type"
              />
            </div>
            <div className="flex items-center gap-4 text-[13px] text-muted sm:ml-auto">
              <span>
                Money in{" "}
                <span className="tabular font-medium text-success">+{formatMoney(moneyIn)}</span>
              </span>
              <span>
                Money out{" "}
                <span className="tabular font-medium text-fg">−{formatMoney(moneyOut)}</span>
              </span>
              <Link href="/lend-borrow" className="font-medium text-accent-fg hover:underline underline-offset-2">
                Manage →
              </Link>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-muted">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              <span className="tabular font-medium text-fg">{totalItems}</span>{" "}
              {totalItems === 1 ? "entry" : "entries"}
            </span>
            <span className="text-line-strong">·</span>
            <span>
              Starting balance{" "}
              <span className="tabular font-medium text-fg">
                {formatMoney(startingBalance)}
              </span>
            </span>
          </div>
          {hasFilters && (
            <button onClick={handleResetFilters} className="btn btn-ghost btn-sm animate-fade-in">
              <FilterX />
              Reset filters
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
                  <th>Date</th>
                  <th>Transaction</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th className="text-right!">Amount</th>
                  <th className="text-right!">Balance</th>
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
                                {t.splits.length} items
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
                            {t.category}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-dot ${isCredit ? "badge-success" : "badge-danger"}`}>
                            {isCredit ? "Credit" : "Debit"}
                          </span>
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <span className={`font-semibold tabular ${isCredit ? "text-success" : "text-fg"}`}>
                            {isCredit ? "+" : "−"}
                            {formatMoney(t.amount)}
                          </span>
                        </td>
                        <td className="text-right whitespace-nowrap tabular text-muted">
                          {t.runningBalance < 0 && "−"}
                          {formatMoney(t.runningBalance)}
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
                        {t.category} · {formatTransactionDate(t.date)}
                        {hasSplits && (
                          <>
                            {" · "}
                            <span className="inline-flex items-center gap-0.5 text-muted">
                              {t.splits.length} items
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
                        {formatMoney(t.amount)}
                      </p>
                      <p className="text-xs text-faint tabular mt-0.5">
                        {t.runningBalance < 0 && "−"}
                        {formatMoney(t.runningBalance)}
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
                Page <span className="tabular font-medium text-fg">{currentPage}</span> of{" "}
                <span className="tabular font-medium text-fg">{totalPages}</span>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn btn-secondary btn-sm"
                >
                  <ChevronLeft />
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn btn-secondary btn-sm"
                >
                  Next
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
            {tab === "LendBorrow" ? "No lend & borrow history" : "No transactions found"}
          </p>
          <p className="text-[13px] text-muted mt-1 max-w-sm">
            {tab === "LendBorrow" && !searchQuery && !startDate && !endDate
              ? "Money you lend, borrow, get back or pay back will show up here."
              : hasFilters
                ? "Nothing matches these filters. Try widening the date range or clearing the search."
                : "Once you record transactions they will show up here."}
          </p>
          {hasFilters && (
            <button onClick={handleResetFilters} className="btn btn-secondary btn-sm mt-4">
              Clear all filters
            </button>
          )}
        </div>
      )}
    </section>
  );
}
