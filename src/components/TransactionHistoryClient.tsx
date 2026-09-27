"use client";

import React, { Fragment, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Calendar,
} from "lucide-react";
import { getCategoryIcon, getCategoryGlow } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import SplitBreakdown, { Collapse, type ExpenseSplitView } from "./SplitBreakdown";
import DatePicker from "react-datepicker";

interface SerializedExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  note: string;
  expenseDate: string;
  createdAt: string;
  splits: ExpenseSplitView[];
}

interface TransactionHistoryClientProps {
  transactions: SerializedExpense[];
  startingBalance: number;
}

export default function TransactionHistoryClient({
  transactions,
  startingBalance,
}: TransactionHistoryClientProps) {
  // --- Filter and Search States ---
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"All" | "Credit" | "Debit">(
    "All",
  );
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
  const enrichedTransactions = transactions.reduce((acc, t) => {
    const isCredit = t.category === "Income";
    const lastBalance = acc.length > 0 ? acc[acc.length - 1].runningBalance : startingBalance;
    const currentBalance = isCredit ? lastBalance + t.amount : lastBalance - t.amount;
    
    acc.push({
      ...t,
      type: isCredit ? "Credit" : "Debit",
      runningBalance: currentBalance,
    });
    return acc;
  }, [] as Array<SerializedExpense & { type: "Credit" | "Debit"; runningBalance: number }>);

  // 2. Present transactions LATEST FIRST by default
  const chronologicalLatestFirst = [...enrichedTransactions].reverse();

  // 3. Apply Filters
  const filteredTransactions = chronologicalLatestFirst.filter((t) => {
    // A. Search Filter (Title or Note)
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.note.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.splits.some((s) => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

    // B. Transaction Type Filter
    const matchesType =
      typeFilter === "All" ||
      (typeFilter === "Credit" && t.type === "Credit") ||
      (typeFilter === "Debit" && t.type === "Debit");

    // C. Date Range Filter
    const tDate = new Date(t.expenseDate.split("T")[0] + "T00:00:00");
    const matchesStartDate = !startDate
      ? true
      : tDate >= new Date(startDate + "T00:00:00");
    const matchesEndDate = !endDate
      ? true
      : tDate <= new Date(endDate + "T23:59:59");

    return matchesSearch && matchesType && matchesStartDate && matchesEndDate;
  });

  // 4. Handle Pagination
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleResetFilters = () => {
    setSearchQuery("");
    setTypeFilter("All");
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

  const hasFilters = !!(searchQuery || typeFilter !== "All" || startDate || endDate);
  const pageKey = `${currentPage}-${searchQuery}-${typeFilter}-${startDate}-${endDate}`;

  return (
    <section className="card overflow-hidden">
      {/* Filters */}
      <div className="flex flex-col gap-3 p-3 md:p-4 border-b border-line">
        <div className="flex flex-col lg:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="input-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by title or note…"
              className="input pl-9"
            />
          </div>

          <div className="segmented lg:w-60 shrink-0">
            {(["All", "Credit", "Debit"] as const).map((type) => (
              <button
                key={type}
                type="button"
                data-active={typeFilter === type}
                onClick={() => {
                  setTypeFilter(type);
                  setCurrentPage(1);
                }}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2.5 lg:w-72 shrink-0">
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

      {paginatedTransactions.length > 0 ? (
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
                {paginatedTransactions.map((t) => {
                  const CategoryIcon = getCategoryIcon(t.category);
                  const isCredit = t.type === "Credit";
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
                          {formatTransactionDate(t.expenseDate)}
                        </td>
                        <td>
                          <p className="flex items-center gap-2 font-medium text-fg">
                            <span className="truncate max-w-xs">{t.title}</span>
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
                          <span className={`badge ${getCategoryGlow(t.category)}`}>
                            <CategoryIcon className="h-3 w-3" />
                            {t.category}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-dot ${isCredit ? "badge-success" : "badge-danger"}`}>
                            {t.type}
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
            {paginatedTransactions.map((t) => {
              const CategoryIcon = getCategoryIcon(t.category);
              const isCredit = t.type === "Credit";
              const hasSplits = t.splits.length > 0;
              const isOpen = expanded.has(t.id);

              return (
                <li key={t.id} className={isOpen ? "bg-subtle/60" : ""}>
                  <div
                    onClick={hasSplits ? () => toggleExpanded(t.id) : undefined}
                    className={`flex items-start gap-3 px-4 py-3 ${hasSplits ? "cursor-pointer" : ""}`}
                    aria-expanded={hasSplits ? isOpen : undefined}
                  >
                    <span
                      className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${getCategoryGlow(t.category)}`}
                    >
                      <CategoryIcon className="h-4 w-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fg truncate">{t.title}</p>
                      <p className="flex items-center gap-1 text-xs text-faint mt-0.5">
                        {t.category} · {formatTransactionDate(t.expenseDate)}
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
            <FilterX className="h-5 w-5 text-faint" />
          </div>
          <p className="text-sm font-medium text-fg">No transactions found</p>
          <p className="text-[13px] text-muted mt-1 max-w-sm">
            {hasFilters
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
