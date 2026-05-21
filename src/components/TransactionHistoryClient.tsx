"use client";

import React, { useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FilterX,
  DollarSign,
  ArrowRightLeft,
} from "lucide-react";
import GlassCard from "./GlassCard";
import { getCategoryIcon, getCategoryGlow } from "./DashboardClient";
import DatePicker from "react-datepicker";

interface SerializedExpense {
  id: string;
  title: string;
  amount: number;
  category: string;
  note: string;
  expenseDate: string;
  createdAt: string;
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
      t.note.toLowerCase().includes(searchQuery.toLowerCase());

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

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* 1. Header Filter Controls Panel */}
      <GlassCard className="border-slate-200 dark:border-slate-500/10 shadow-lg p-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 items-end">
          {/* Search Box */}
          <div className="flex flex-col gap-2 xl:col-span-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Search Transactions
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search by title, category, notes..."
                className="w-full glass-input rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-violet-500/50 transition placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Transaction Type
            </label>
            <div className="grid grid-cols-3 gap-1 bg-slate-100/50 dark:bg-slate-950/45 p-1 rounded-xl border border-slate-200 dark:border-slate-500/10">
              {(["All", "Credit", "Debit"] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setTypeFilter(type);
                    setCurrentPage(1);
                  }}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                    typeFilter === type
                      ? type === "Credit"
                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                        : type === "Debit"
                          ? "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : "bg-violet-500/20 text-violet-600 dark:text-violet-400 border border-violet-500/30"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 border border-transparent"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Start & End Dates Filter */}
          <div className="grid grid-cols-2 gap-2 xl:col-span-1">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Start Date
              </label>
              <div className="relative">
                <DatePicker
                  selected={startDate ? new Date(startDate) : null}
                  onChange={(date: Date | null) => {
                    const dateStr = date
                      ? date.toISOString().split("T")[0]
                      : "";
                    setStartDate(dateStr);
                    setCurrentPage(1);
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select date..."
                  fixedHeight
                  className="w-full glass-input rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-violet-500/50 transition [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
                  wrapperClassName="w-full"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                End Date
              </label>
              <div className="relative">
                <DatePicker
                  selected={endDate ? new Date(endDate) : null}
                  onChange={(date: Date | null) => {
                    const dateStr = date
                      ? date.toISOString().split("T")[0]
                      : "";
                    setEndDate(dateStr);
                    setCurrentPage(1);
                  }}
                  dateFormat="yyyy-MM-dd"
                  placeholderText="Select date..."
                  fixedHeight
                  className="w-full glass-input rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-violet-500/50 transition [color-scheme:light] dark:[color-scheme:dark] cursor-pointer"
                  wrapperClassName="w-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Info panel + Reset Button */}
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-500/10 mt-5 pt-4">
          <div className="flex flex-wrap gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-950/20 py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-500/5">
              <ArrowRightLeft className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <span>{totalItems} matched ledger entries</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-100/50 dark:bg-slate-950/20 py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-500/5">
              <DollarSign className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
              <span>
                Starting balance:{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  $
                  {startingBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </strong>
              </span>
            </div>
          </div>

          {(searchQuery || typeFilter !== "All" || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 py-1 px-3 bg-rose-500/15 border border-rose-500/25 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              <FilterX className="h-3.5 w-3.5" />
              Reset Filters
            </button>
          )}
        </div>
      </GlassCard>

      {/* 2. Ledger Results Table */}
      {paginatedTransactions.length > 0 ? (
        <div className="flex flex-col gap-4 w-full">
          {/* Table Container - Hidden on small mobile, beautiful premium table on medium+ screens */}
          <div className="hidden md:block overflow-hidden border border-slate-200 dark:border-slate-500/10 rounded-2xl glass-panel shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900/35 border-b border-slate-200 dark:border-slate-500/15">
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider w-36">
                    Date
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider w-28">
                    Type
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider w-32">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider w-40">
                    Category
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider">
                    Transaction Details
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold text-slate-505 dark:text-slate-400 uppercase tracking-wider w-44 text-right">
                    Running Balance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-500/5">
                {paginatedTransactions.map((t) => {
                  const CategoryIcon = getCategoryIcon(t.category);
                  const isCredit = t.type === "Credit";

                  return (
                    <tr
                      key={t.id}
                      className="hover:bg-slate-950/5 dark:hover:bg-white/5 transition-all duration-150 group"
                    >
                      {/* Date */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {formatTransactionDate(t.expenseDate)}
                      </td>

                      {/* Type Badge */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase border ${
                            isCredit
                              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 shadow-sm"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400 shadow-sm"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isCredit
                                ? "bg-emerald-500 dark:bg-emerald-400 animate-pulse"
                                : "bg-rose-500 dark:bg-rose-400"
                            }`}
                          ></span>
                          {t.type}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-3.5 whitespace-nowrap text-xs font-extrabold">
                        <span
                          className={
                            isCredit
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }
                        >
                          {isCredit ? "+" : "-"}$
                          {t.amount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-6 py-4.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div
                            className={`p-1.5 rounded-lg border ${getCategoryGlow(
                              t.category,
                            )}`}
                          >
                            <CategoryIcon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                            {t.category}
                          </span>
                        </div>
                      </td>

                      {/* Title & Notes */}
                      <td className="px-6 py-3.5">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white transition">
                            {t.title}
                          </span>
                          {t.note && (
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 italic mt-0.5 max-w-sm truncate">
                              {t.note}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Running Balance */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className="inline-block px-3 py-1 bg-slate-100/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-500/10 rounded-xl text-xs font-extrabold text-slate-700 dark:text-slate-200 tracking-wide">
                          $
                          {t.runningBalance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout - Shows only on small mobile screens (< md) */}
          <div className="flex flex-col gap-4 md:hidden">
            {paginatedTransactions.map((t) => {
              const CategoryIcon = getCategoryIcon(t.category);
              const isCredit = t.type === "Credit";

              return (
                <GlassCard
                  key={t.id}
                  className={`border ${
                    isCredit
                      ? "border-emerald-500/15"
                      : "border-slate-200 dark:border-slate-500/10"
                  } p-4.5 relative`}
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-500/10 pb-3 mb-3">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatTransactionDate(t.expenseDate)}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase border ${
                        isCredit
                          ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {t.type}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-1.5">
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                        {t.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <div
                          className={`p-1 rounded-md border ${getCategoryGlow(
                            t.category,
                          )}`}
                        >
                          <CategoryIcon className="h-3 w-3" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          {t.category}
                        </span>
                      </div>
                      {t.note && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-1 leading-normal">
                          {t.note}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={`text-base font-extrabold ${isCredit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                      >
                        {isCredit ? "+" : "-"}$
                        {t.amount.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>

                      <div className="flex flex-col items-end">
                        <span className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wide">
                          Running Bal
                        </span>
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 mt-0.5">
                          $
                          {t.runningBalance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* 3. Pagination Footer Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between bg-slate-100/30 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-500/10 p-4 rounded-2xl mt-2 shadow-md">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Page{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {currentPage}
                </strong>{" "}
                of{" "}
                <strong className="text-slate-700 dark:text-slate-300">
                  {totalPages}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 border border-slate-200 dark:border-slate-500/20 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`h-8 w-8 text-xs font-bold rounded-xl border transition cursor-pointer ${
                          currentPage === pageNum
                            ? "bg-violet-500 border-violet-500 text-white shadow-lg shadow-violet-500/25"
                            : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-500/20 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500/40"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(p + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 border border-slate-200 dark:border-slate-500/20 rounded-xl bg-white dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <GlassCard className="border-slate-200 dark:border-slate-500/10 py-16 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-slate-100 dark:bg-slate-950/40 rounded-full border border-slate-200 dark:border-slate-500/15 mb-4 animate-bounce">
            <FilterX className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">
            No Transactions Found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            We couldn&apos;t find any transaction history matches. Try clearing some
            search queries or adjusting date/type filters.
          </p>
          {(searchQuery || typeFilter !== "All" || startDate || endDate) && (
            <button
              onClick={handleResetFilters}
              className="mt-6 py-2 px-5 bg-violet-600 hover:bg-violet-500 border border-violet-500/20 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-violet-600/25 cursor-pointer"
            >
              Clear All Filters
            </button>
          )}
        </GlassCard>
      )}
    </div>
  );
}
