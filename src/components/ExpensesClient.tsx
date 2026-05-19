"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  Filter,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  X,
  FileSpreadsheet,
  Info,
  ArrowUpDown,
} from "lucide-react";
import GlassCard from "./GlassCard";
import ExpenseModal from "./ExpenseModal";
import { getCategoryIcon, getCategoryGlow } from "./DashboardClient";
import { deleteExpense } from "@/actions/expenses";
import { useToast } from "./Toast";
import { useConfirm, confirmPresets } from "./ConfirmModal";
import DatePicker from "react-datepicker";

export interface ExpenseItem {
  id: string;
  title: string;
  amount: number;
  category: string;
  note: string | null;
  expenseDate: Date;
}

interface ExpensesClientProps {
  expenses: ExpenseItem[];
  allExpensesForCSV: Array<{
    title: string;
    amount: number;
    category: string;
    note: string | null;
    expenseDate: Date;
  }>;
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
  };
}

const CATEGORIES = [
  "All",
  "Food",
  "Transport",
  "Shopping",
  "Bills",
  "Medicine",
  "Education",
  "Entertainment",
  "Others",
  "Income",
];

export default function ExpensesClient({
  expenses,
  allExpensesForCSV,
  pagination,
}: ExpensesClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  // Filter States (initialized from URL query)
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(
    searchParams.get("category") || "All",
  );
  const [dateRange, setDateRange] = useState(
    searchParams.get("dateRange") || "all",
  );
  const [startDate, setStartDate] = useState(
    searchParams.get("startDate") || "",
  );
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "latest");

  // Modal States
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseItem | undefined>(
    undefined,
  );
  const [viewingExpense, setViewingExpense] = useState<ExpenseItem | undefined>(
    undefined,
  );

  // Sync state with URL search params when they change
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchParams.get("search") || "");
      setCategory(searchParams.get("category") || "All");
      setDateRange(searchParams.get("dateRange") || "all");
      setStartDate(searchParams.get("startDate") || "");
      setEndDate(searchParams.get("endDate") || "");
      setSortBy(searchParams.get("sortBy") || "latest");
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams]);

  // Apply filters by pushing values to URL parameters
  const applyFilters = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Always reset page to 1 when changing filters, unless explicitly passing a new page
    if (!updates.hasOwnProperty("page")) {
      params.set("page", "1");
    }

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "" || val === "All" || val === "all") {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });

    router.push(`/expenses?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters({ search });
  };

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
        showToast("Transaction removed successfully.", "success");
      } else {
        showToast(res.error || "Failed to remove transaction.", "error");
      }
    });
  };

  // Client-side CSV generator download logs
  const handleExportCSV = () => {
    if (allExpensesForCSV.length === 0) {
      showToast("No transaction data to export.", "info");
      return;
    }

    try {
      const headers = "Title,Amount,Category,Date,Note\n";
      const rows = allExpensesForCSV.map((exp) => {
        const escapedTitle = `"${exp.title.replace(/"/g, '""')}"`;
        const escapedNote = `"${(exp.note || "").replace(/"/g, '""')}"`;
        const formattedDate = new Date(exp.expenseDate).toLocaleDateString(
          "en-US",
        );
        return `${escapedTitle},${exp.amount},${exp.category},${formattedDate},${escapedNote}`;
      });

      const csvContent = headers + rows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `Expensify_Report_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast("CSV export successful!", "success");
    } catch (e) {
      console.error(e);
      showToast("CSV compilation failed.", "error");
    }
  };

  return (
    <>
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide bg-gradient-to-r from-slate-900 via-slate-700 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent w-fit">
            Transaction Ledger
          </h2>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Search, sort, filter, and audit all your daily expense items.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex-1 md:flex-initial px-4 py-3 rounded-xl border border-emerald-500/10 hover:border-emerald-500/20 hover:bg-emerald-500/10 text-emerald-400 font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            onClick={() => {
              setEditingExpense(undefined);
              setIsExpenseOpen(true);
            }}
            className="flex-1 md:flex-initial px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-violet-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Record Item
          </button>
        </div>
      </div>

      {/* Interactive Filters Glass Panel */}
      <GlassCard className="border-white/5 shadow-xl">
        <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search transaction description..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    applyFilters({ search: null });
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-md hover:bg-white/10 text-slate-500 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  applyFilters({ category: e.target.value });
                }}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs appearance-none cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option
                    key={cat}
                    value={cat}
                    className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white"
                  >
                    {cat === "All" ? "Filter by Category" : cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort Dropdown */}
            <div>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  applyFilters({ sortBy: e.target.value });
                }}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs appearance-none cursor-pointer"
              >
                <option
                  value="latest"
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white"
                >
                  Sort: Latest Date
                </option>
                <option
                  value="highest"
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white"
                >
                  Sort: Highest Amount
                </option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end pt-1 border-t border-white/5">
            {/* Quick Date Filters */}
            <div>
              <select
                value={dateRange}
                onChange={(e) => {
                  setDateRange(e.target.value);
                  applyFilters({
                    dateRange: e.target.value,
                    startDate: null,
                    endDate: null,
                  });
                }}
                className="w-full px-4 py-2.5 rounded-xl glass-input text-xs appearance-none cursor-pointer"
              >
                <option
                  value="all"
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white"
                >
                  Filter by Timeframe
                </option>
                <option
                  value="today"
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white"
                >
                  Today
                </option>
                <option
                  value="yesterday"
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white"
                >
                  Yesterday
                </option>
                <option
                  value="week"
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white"
                >
                  Last 7 Days
                </option>
                <option
                  value="month"
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white"
                >
                  This Month
                </option>
                <option
                  value="custom"
                  className="bg-white dark:bg-slate-900 text-slate-700 dark:text-white"
                >
                  Custom Date Range...
                </option>
              </select>
            </div>

            {/* Custom Dates (visible only if 'custom' is selected) */}
            {dateRange === "custom" && (
              <>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10 pointer-events-none" />
                  <DatePicker
                    selected={startDate ? new Date(startDate) : null}
                    onChange={(date) => {
                      // format date to YYYY-MM-DD
                      const dateStr = date
                        ? date.toISOString().split("T")[0]
                        : "";
                      setStartDate(dateStr);
                      applyFilters({ startDate: dateStr });
                    }}
                    placeholderText="Start date"
                    dateFormat="yyyy-MM-dd"
                    fixedHeight
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs cursor-pointer"
                    wrapperClassName="w-full"
                  />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10 pointer-events-none" />
                  <DatePicker
                    selected={endDate ? new Date(endDate) : null}
                    onChange={(date) => {
                      const dateStr = date
                        ? date.toISOString().split("T")[0]
                        : "";
                      setEndDate(dateStr);
                      applyFilters({ endDate: dateStr });
                    }}
                    placeholderText="End date"
                    dateFormat="yyyy-MM-dd"
                    fixedHeight
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl glass-input text-xs cursor-pointer"
                    wrapperClassName="w-full"
                  />
                </div>
              </>
            )}

            {/* Reset Button */}
            <div
              className={`${dateRange === "custom" ? "" : "md:col-start-4"} flex justify-end`}
            >
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setCategory("All");
                  setDateRange("all");
                  setStartDate("");
                  setEndDate("");
                  setSortBy("latest");
                  router.push("/expenses");
                }}
                className="py-2.5 px-5 rounded-xl border border-white/5 hover:bg-white/5 text-xs font-semibold transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </form>
      </GlassCard>

      {/* Transaction Table */}
      <GlassCard className="border-white/5 shadow-2xl relative overflow-hidden flex-1 flex flex-col p-4 md:p-6">
        {expenses.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Info className="h-10 w-10 text-slate-500 mb-3" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-300">
              No transactions match the filter criteria
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Adjust your search keywords, choose a wider timeframe or clear
              your category tags to search again.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="glass-table w-full">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-sm font-bold! text-slate-800! dark:text-slate-300! uppercase tracking-wider w-36">
                    Description
                  </th>
                  <th className="px-6 py-4 text-sm font-bold! text-slate-800! dark:text-slate-300! uppercase tracking-wider w-36">
                    Category
                  </th>
                  <th className="px-6 py-4 text-sm font-bold! text-slate-800! dark:text-slate-300! uppercase tracking-wider w-36">
                    Log Date
                  </th>
                  <th className="px-6 py-4 text-sm font-bold! text-slate-800! dark:text-slate-300! uppercase tracking-wider w-36">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-sm font-bold! text-slate-800! dark:text-slate-300! uppercase tracking-wider w-36">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => {
                  const Icon = getCategoryIcon(exp.category);
                  const glowClass = getCategoryGlow(exp.category);
                  return (
                    <tr key={exp.id} className="group">
                      {/* Description / Title */}
                      <td>
                        <div className="flex items-center gap-3">
                          {/* Small icon for mobile */}
                          <div
                            className={`md:hidden p-2 rounded-lg border shrink-0 ${glowClass}`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="font-semibold text-sm text-slate-850 dark:text-slate-200 block truncate max-w-[150px] md:max-w-xs group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">
                              {exp.title}
                            </span>
                            {/* Subtitle indicators for mobile */}
                            <span className="md:hidden text-[9px] text-slate-500 dark:text-slate-400 font-medium">
                              {exp.category} •{" "}
                              {new Date(exp.expenseDate).toLocaleDateString(
                                "en-US",
                                { month: "short", day: "numeric" },
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold ${glowClass}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {exp.category}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
                        {new Date(exp.expenseDate).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </td>

                      {/* Amount */}
                      <td>
                        <span className="text-sm font-bold text-slate-850 dark:text-slate-100 block">
                          -$
                          {exp.amount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div className="flex items-center justify-start gap-1">
                          <button
                            onClick={() => setViewingExpense(exp)}
                            className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(exp)}
                            className="p-2 rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(exp.id)}
                            className="p-2 rounded-lg hover:bg-rose-500/10 dark:hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Section */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-4">
            <span className="text-xs text-slate-500 font-semibold">
              Showing Page {pagination.page} of {pagination.totalPages} (
              {pagination.total} entries)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => applyFilters({ page: pagination.page - 1 })}
                className="p-2 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => applyFilters({ page: pagination.page + 1 })}
                className="p-2 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>

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

      {/* Reusable Expense Modal (Add/Edit) */}
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
