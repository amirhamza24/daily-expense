"use client";

import React, { Fragment, useState, useEffect, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search,
  SearchX,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  X,
  Plus,
  Receipt,
  LayoutGrid,
} from "lucide-react";
import { Select, type SelectOption } from "./Select";
import ExpenseModal from "./ExpenseModal";
import ExpenseDetailsModal from "./ExpenseDetailsModal";
import PageHeader from "./PageHeader";
import SplitBreakdown, { Collapse, type ExpenseSplitView } from "./SplitBreakdown";
import { getCategoryIcon, getCategoryGlow } from "@/lib/categories";
import { useI18n } from "./I18nProvider";
import { useDatePickerI18n } from "./useDatePickerI18n";
import { categoryLabel, type Messages } from "@/lib/i18n/messages";
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
  splits: ExpenseSplitView[];
}

interface ExpensesClientProps {
  expenses: ExpenseItem[];
  allExpensesForCSV: Array<{
    title: string;
    amount: number;
    category: string;
    note: string | null;
    expenseDate: Date;
    splits: Array<{ title: string; amount: number; date: Date | null }>;
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

const categoryOptions = (m: Messages): SelectOption[] =>
  CATEGORIES.map((cat) =>
    cat === "All"
      ? { value: cat, label: m.expenses.allCategories, icon: LayoutGrid, iconClassName: "bg-subtle text-muted" }
      : { value: cat, label: categoryLabel(m, cat), icon: getCategoryIcon(cat), iconClassName: getCategoryGlow(cat) },
  );

const DATE_VALUES = ["all", "today", "yesterday", "week", "month", "custom"] as const;
const dateOptions = (m: Messages): SelectOption[] =>
  DATE_VALUES.map((value) => ({ value, label: m.expenses.dates[value] }));

const sortOptions = (m: Messages): SelectOption[] => [
  { value: "latest", label: m.expenses.sortLatest },
  { value: "highest", label: m.expenses.sortHighest },
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
  const { m, fmt } = useI18n();
  const datePickerI18n = useDatePickerI18n("short");
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
  // Rows whose breakdown is currently shown
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

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

    startTransition(() => router.push(`/expenses?${params.toString()}`));
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
    const ok = await confirm(confirmPresets.deleteExpense(m));
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteExpense(id);
      if (res.success) {
        showToast(m.expenses.removed, "success");
      } else {
        showToast(res.error || m.expenses.removeFailed, "error");
      }
    });
  };

  // Client-side CSV generator download logs
  const handleExportCSV = () => {
    if (allExpensesForCSV.length === 0) {
      showToast(m.expenses.csvEmpty, "info");
      return;
    }

    try {
      const headers = m.expenses.csvHeaders.join(",") + "\n";
      const rows = allExpensesForCSV.map((exp) => {
        const escapedTitle = `"${exp.title.replace(/"/g, '""')}"`;
        const escapedNote = `"${(exp.note || "").replace(/"/g, '""')}"`;
        const breakdown = exp.splits
          .map((s) =>
            s.date
              ? `${new Date(s.date).toLocaleDateString("en-US")} ${s.title}: ${s.amount}`
              : `${s.title}: ${s.amount}`,
          )
          .join("; ");
        const escapedBreakdown = `"${breakdown.replace(/"/g, '""')}"`;
        const formattedDate = new Date(exp.expenseDate).toLocaleDateString(
          "en-US",
        );
        const escapedCategory = `"${categoryLabel(m, exp.category).replace(/"/g, '""')}"`;
        return `${escapedTitle},${exp.amount},${escapedCategory},${formattedDate},${escapedNote},${escapedBreakdown}`;
      });

      // BOM so Excel reads UTF-8 (Bangla headers / categories) correctly
      const csvContent = "\uFEFF" + headers + rows.join("\n");
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
      showToast(m.expenses.csvDone, "success");
    } catch (e) {
      console.error(e);
      showToast(m.expenses.csvFailed, "error");
    }
  };

  const hasFilters =
    !!search ||
    category !== "All" ||
    dateRange !== "all" ||
    sortBy !== "latest";
  const firstItem = (pagination.page - 1) * pagination.limit + 1;
  const lastItem = Math.min(pagination.page * pagination.limit, pagination.total);

  return (
    <>
      <PageHeader
        icon={Receipt}
        title={m.expenses.title}
        description={m.expenses.description}
        actions={
          <>
            <button onClick={handleExportCSV} className="btn btn-secondary">
              <Download />
              {m.expenses.export}
            </button>
            <button
              onClick={() => {
                setEditingExpense(undefined);
                setIsExpenseOpen(true);
              }}
              className="btn btn-primary"
            >
              <Plus />
              {m.expenses.newTransaction}
            </button>
          </>
        }
      />

      <section className="card overflow-hidden">
        {/* Filters */}
        <form
          onSubmit={handleSearchSubmit}
          className="card-head flex flex-col gap-3 p-3 md:p-4"
        >
          <div className="flex flex-col lg:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="input-icon" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={m.expenses.searchPlaceholder}
                className="input pl-9 pr-8"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    applyFilters({ search: null });
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
                value={category}
                onChange={(v) => {
                  setCategory(v);
                  applyFilters({ category: v });
                }}
                options={categoryOptions(m)}
                className="lg:w-44"
                aria-label={m.expenses.category}
              />

              <Select
                value={dateRange}
                onChange={(v) => {
                  setDateRange(v);
                  applyFilters({
                    dateRange: v,
                    startDate: null,
                    endDate: null,
                  });
                }}
                options={dateOptions(m)}
                className="lg:w-40"
                aria-label={m.expenses.dateRange}
              />

              <div className="col-span-2 sm:col-span-1">
                <Select
                  value={sortBy}
                  onChange={(v) => {
                    setSortBy(v);
                    applyFilters({ sortBy: v });
                  }}
                  options={sortOptions(m)}
                  className="lg:w-44"
                  aria-label={m.expenses.sort}
                />
              </div>
            </div>
          </div>

          {(dateRange === "custom" || hasFilters) && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 animate-fade-in">
              {dateRange === "custom" && (
                <div className="grid grid-cols-2 gap-2.5 sm:w-96">
                  <div className="relative">
                    <Calendar className="input-icon" />
                    <DatePicker
                      selected={startDate ? new Date(startDate) : null}
                      onChange={(date: Date | null) => {
                        // format date to YYYY-MM-DD
                        const dateStr = date
                          ? date.toISOString().split("T")[0]
                          : "";
                        setStartDate(dateStr);
                        applyFilters({ startDate: dateStr });
                      }}
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
                      selected={endDate ? new Date(endDate) : null}
                      onChange={(date: Date | null) => {
                        const dateStr = date
                          ? date.toISOString().split("T")[0]
                          : "";
                        setEndDate(dateStr);
                        applyFilters({ endDate: dateStr });
                      }}
                      placeholderText={m.expenses.endDate}
                      {...datePickerI18n}
                      fixedHeight
                      className="input pl-9 cursor-pointer"
                      wrapperClassName="w-full"
                    />
                  </div>
                </div>
              )}

              {hasFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("All");
                    setDateRange("all");
                    setStartDate("");
                    setEndDate("");
                    setSortBy("latest");
                    startTransition(() => router.push("/expenses"));
                  }}
                  className="btn btn-ghost btn-sm sm:ml-auto self-start"
                >
                  <X />
                  {m.expenses.clearFilters}
                </button>
              )}
            </div>
          )}
        </form>

        {/* Table */}
        {expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="h-10 w-10 rounded-full bg-subtle flex items-center justify-center mb-3">
              <SearchX className="h-5 w-5 text-faint" />
            </div>
            <p className="text-sm font-medium text-fg">{m.expenses.noneFound}</p>
            <p className="text-[13px] text-muted mt-1 max-w-sm">
              {m.expenses.noneFoundHint}
            </p>
          </div>
        ) : (
          <div
            className={`overflow-x-auto transition-[opacity,filter] ${isPending ? "is-refreshing" : ""}`}
          >
            <table className="data-table">
              <thead>
                <tr>
                  <th>{m.expenses.colTransaction}</th>
                  <th className="hidden md:table-cell">{m.expenses.colCategory}</th>
                  <th className="hidden sm:table-cell">{m.expenses.colDate}</th>
                  <th className="text-right!">{m.expenses.colAmount}</th>
                  <th className="w-px">
                    <span className="sr-only">{m.expenses.colActions}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="stagger-rows" key={searchParams.toString()}>
                {expenses.map((exp) => {
                  const Icon = getCategoryIcon(exp.category);
                  const glowClass = getCategoryGlow(exp.category);
                  const isCredit = exp.category === "Income";
                  const hasSplits = exp.splits.length > 0;
                  const isOpen = expanded.has(exp.id);
                  return (
                    <Fragment key={exp.id}>
                      <tr
                        onClick={hasSplits ? () => toggleExpanded(exp.id) : undefined}
                        className={`${hasSplits ? "cursor-pointer" : ""} ${isOpen ? "row-expanded bg-subtle/60" : ""}`}
                        aria-expanded={hasSplits ? isOpen : undefined}
                      >
                        <td>
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${glowClass}`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 font-medium text-fg">
                                <span className="truncate max-w-45 md:max-w-xs">{exp.title}</span>
                                {hasSplits && (
                                  <span className="badge h-5 px-1.5 gap-0.5 text-[11px] shrink-0">
                                    <ChevronRight
                                      className="chevron h-3 w-3"
                                      data-open={isOpen}
                                    />
                                    {m.items(exp.splits.length)}
                                  </span>
                                )}
                              </p>
                              <p className="sm:hidden text-xs text-faint mt-0.5">
                                {fmt.date(exp.expenseDate, { month: "short", day: "numeric" })}
                              </p>
                              {exp.note && (
                                <p className="hidden sm:block text-xs text-faint truncate max-w-xs mt-0.5">
                                  {exp.note}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="hidden md:table-cell">
                          <span className={`badge ${glowClass}`}>{categoryLabel(m, exp.category)}</span>
                        </td>
                        <td className="hidden sm:table-cell text-muted whitespace-nowrap">
                          {fmt.date(exp.expenseDate)}
                        </td>
                        <td className="text-right whitespace-nowrap">
                          <span
                            className={`font-semibold tabular ${isCredit ? "text-success" : "text-fg"}`}
                          >
                            {isCredit ? "+" : "−"}
                            {fmt.money(exp.amount)}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div className="row-actions flex items-center justify-end">
                            <button
                              onClick={() => setViewingExpense(exp)}
                              className="icon-btn"
                              title={m.expenses.viewDetails}
                              aria-label={m.expenses.viewDetails}
                            >
                              <Eye />
                            </button>
                            <button
                              onClick={() => handleEdit(exp)}
                              className="icon-btn"
                              title={m.edit}
                              aria-label={m.edit}
                            >
                              <Pencil />
                            </button>
                            <button
                              onClick={() => handleDelete(exp.id)}
                              className="icon-btn icon-btn-danger"
                              title={m.delete}
                              aria-label={m.delete}
                            >
                              <Trash2 />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {hasSplits && (
                        <tr className="expand-row">
                          <td colSpan={5} className="expand-cell bg-subtle/60" data-open={isOpen}>
                            <Collapse open={isOpen}>
                              <div className="pl-7 pr-4 md:pr-28 pb-3">
                                <SplitBreakdown splits={exp.splits} total={exp.amount} />
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
        )}

        {/* Pagination */}
        {pagination.total > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-line">
            <span className="text-[13px] text-muted">
              <span className="tabular">{m.expenses.range(firstItem, lastItem, pagination.total)}</span>
            </span>
            {pagination.totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => applyFilters({ page: pagination.page - 1 })}
                  className="btn btn-secondary btn-sm"
                >
                  <ChevronLeft />
                  {m.expenses.prev}
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => applyFilters({ page: pagination.page + 1 })}
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

      <ExpenseDetailsModal
        expense={viewingExpense}
        onClose={() => setViewingExpense(undefined)}
      />

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
