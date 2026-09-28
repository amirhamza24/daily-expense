"use client";

import React, { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  FileChartColumn,
  FileDown,
  ImageDown,
  Loader2,
  Sparkles,
  Wallet,
} from "lucide-react";
import PageHeader from "./PageHeader";
import { Select, type SelectOption } from "./Select";
import { useToast } from "./Toast";
import { CHART_COLORS, SERIES, EmptyChart, MoneyTooltip, axisProps, compactMoney, useMounted } from "./ChartKit";
import { formatMoney } from "@/lib/format";
import { formatMonthKey, formatYmd, monthName, share } from "@/lib/dates";
import { downloadNodeAsImage, downloadNodeAsPdf } from "@/lib/export-image";
import type { MoneyMonthSummary, MonthlyReport } from "@/lib/finance-types";

const signed = (n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${formatMoney(n)}`;
const plain = (n: number) => `${n < 0 ? "−" : ""}${formatMoney(n)}`;

const MONTH_OPTIONS: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({
  value: String(i),
  label: monthName(i),
}));

// ─── Paper building blocks ───────────────────────────────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section data-report-section className="pt-6 mt-6 border-t border-line first:border-t-0 first:mt-0 first:pt-0">
      <div className="mb-3">
        <h2 className="text-[15px] font-semibold tracking-tight text-fg">{title}</h2>
        {subtitle && <p className="text-xs text-faint mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Figure({ label, value, tone = "text-fg", note }: { label: string; value: string; tone?: string; note?: string }) {
  return (
    <div className="rounded-xl border border-line px-4 py-3 min-w-0">
      <p className="text-xs text-faint">{label}</p>
      <p className={`text-base font-semibold tabular mt-0.5 truncate ${tone}`}>{value}</p>
      {note && <p className="text-[11px] text-faint mt-0.5 truncate" title={note}>{note}</p>}
    </div>
  );
}

function Rows({ rows }: { rows: Array<[string, string, string?]> }) {
  return (
    <dl className="divide-y divide-line text-[13px]">
      {rows.map(([label, value, tone]) => (
        <div key={label} className="flex items-center justify-between gap-4 py-2">
          <dt className="text-muted">{label}</dt>
          <dd className={`tabular font-medium text-right ${tone ?? "text-fg"}`}>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function MoneyBlock({ kind, data }: { kind: "LENT" | "BORROWED"; data: MoneyMonthSummary }) {
  const lent = kind === "LENT";
  const Icon = lent ? ArrowUpRight : ArrowDownLeft;
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${lent ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13.5px] font-semibold text-fg">{lent ? "Lending — Receivable" : "Borrowing — Payable"}</p>
          <p className="text-[11px] text-faint">Not counted as {lent ? "expense" : "income"}</p>
        </div>
      </div>
      <Rows
        rows={[
          [lent ? "Lent this month" : "Borrowed this month", `${formatMoney(data.amount)} · ${data.count} record${data.count === 1 ? "" : "s"}`],
          [lent ? "Repayments received" : "Payments made", formatMoney(data.settled)],
          ["Still outstanding (this month's records)", formatMoney(data.outstanding)],
          [lent ? "Current total receivable" : "Current total payable", formatMoney(data.currentOutstanding), lent ? "text-success" : "text-warning"],
          ["Fully paid · partially paid · pending", `${data.paid} · ${data.partial} · ${data.pending}`],
          ["Overdue", String(data.overdue), data.overdue ? "text-danger" : undefined],
        ]}
      />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReportClient({ report, userName }: { report: MonthlyReport; userName: string }) {
  const router = useRouter();
  const mounted = useMounted();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [exporting, setExporting] = useState<"pdf" | "png" | "jpg" | null>(null);
  const paperRef = useRef<HTMLElement>(null);

  const { month, overview, expense, income, lending, borrowing } = report;

  const goTo = (year: number, index: number) => {
    const d = new Date(Date.UTC(year, index, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    startTransition(() => router.push(`/reports?month=${key}`));
  };

  const yearOptions: SelectOption[] = report.years.map((y) => ({ value: String(y), label: String(y) }));

  const handleExport = async (format: "pdf" | "png" | "jpg") => {
    const node = paperRef.current;
    if (!node) return;
    setExporting(format);
    const fileName = `expensify-report-${month.key}`;
    try {
      if (format === "pdf") await downloadNodeAsPdf(node, fileName);
      // Printable report: always white, regardless of theme
      else await downloadNodeAsImage(node, fileName, format, { backgroundColor: "#ffffff" });
      showToast(`${month.label} report saved as ${format.toUpperCase()}.`, "success");
    } catch (error) {
      console.error("Report export failed:", error);
      showToast("Couldn't create the file. Please try again.", "error");
    } finally {
      setExporting(null);
    }
  };

  const donut = expense.categories.map((c) => ({ name: c.name, value: c.amount }));
  const dailyData = report.daily.map((d) => ({ name: formatYmd(d.day, { day: "numeric" }), full: formatYmd(d.day, { weekday: "short", month: "short", day: "numeric" }), Expenses: d.expense }));
  const trendData = report.trend.map((t) => ({ name: formatMonthKey(t.month), Income: t.income, Expenses: t.expense }));
  const trendHasHistory = report.trend.filter((t) => t.income || t.expense).length >= 2;

  const exportButton = (format: "pdf" | "png" | "jpg", label: string, Icon: React.ComponentType<{ className?: string }>, primary = false) => (
    <button
      onClick={() => handleExport(format)}
      disabled={!!exporting || !mounted}
      className={`btn ${primary ? "btn-primary" : "btn-secondary"}`}
    >
      {exporting === format ? <Loader2 className="animate-spin" /> : <Icon />}
      {label}
    </button>
  );

  return (
    <>
      <PageHeader
        icon={FileChartColumn}
        title="Financial reports"
        description="A complete, printable summary of any month."
        actions={
          <>
            {exportButton("pdf", "PDF", FileDown, true)}
            {exportButton("png", "PNG", ImageDown)}
            {exportButton("jpg", "JPG", ImageDown)}
          </>
        }
      />

      {/* Month picker */}
      <section className="card p-3 md:p-4 flex flex-wrap items-center gap-2.5">
        <button onClick={() => goTo(month.year, month.index - 1)} className="icon-btn border border-line" aria-label="Previous month" disabled={isPending}>
          <ChevronLeft />
        </button>
        <div className="w-40">
          <Select value={String(month.index)} onChange={(v) => goTo(month.year, Number(v))} options={MONTH_OPTIONS} aria-label="Month" />
        </div>
        <div className="w-28">
          <Select value={String(month.year)} onChange={(v) => goTo(Number(v), month.index)} options={yearOptions} aria-label="Year" />
        </div>
        <button onClick={() => goTo(month.year, month.index + 1)} className="icon-btn border border-line" aria-label="Next month" disabled={isPending}>
          <ChevronRight />
        </button>
        <span className="text-[13px] text-muted ml-auto flex items-center gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-accent-fg" />}
          {report.isCurrentMonth ? "Current month — figures so far" : "Complete month"}
        </span>
      </section>

      {/* Printable report */}
      <article
        ref={paperRef}
        className={`report-paper bg-white rounded-2xl border border-line shadow-(--shadow-md) p-5 sm:p-8 md:p-10 transition-[opacity,filter] ${isPending ? "is-refreshing" : ""}`}
      >
        <header data-report-section className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b-2 border-accent">
          <div className="flex items-center gap-3">
            <span className="icon-tile icon-tile-solid h-10 w-10 rounded-xl">
              <Wallet className="h-5! w-5!" />
            </span>
            <div>
              <p className="text-[15px] font-semibold text-fg">
                Expens<span className="text-accent-fg">ify</span>
              </p>
              <p className="text-xs text-faint">Monthly Financial Report</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{month.label}</h1>
            <p className="text-xs text-faint mt-1">Prepared for {userName}</p>
            <p className="text-xs text-faint">
              Generated{" "}
              {mounted
                ? new Date(report.generatedAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
                : formatYmd(report.generatedAt.slice(0, 10), { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </header>

        <div className="pt-6">
          <Section title="Financial overview" subtitle="Closing = opening + net cash flow + lend & borrow movements">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Figure label="Opening balance" value={plain(overview.opening)} />
              <Figure label="Income" value={formatMoney(overview.income)} tone="text-success" />
              <Figure label="Expenses" value={formatMoney(overview.expense)} tone="text-danger" />
              <Figure label="Net cash flow" value={signed(overview.net)} tone={overview.net < 0 ? "text-danger" : "text-fg"} note="Income − expenses" />
              <Figure label="Lend & borrow" value={signed(overview.lendBorrowNet)} note="−lent +borrowed +repaid −paid back" />
              <Figure label="Closing balance" value={plain(overview.closing)} tone="text-accent-fg" />
            </div>
          </Section>

          <Section title="Monthly highlights">
            {report.highlights.length === 0 ? (
              <p className="text-[13px] text-faint">No transactions were recorded in {month.label}.</p>
            ) : (
              <ul className="grid gap-2">
                {report.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2.5 text-[13.5px] text-fg">
                    <Sparkles className="h-4 w-4 text-accent-fg shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Charts">
            {!mounted ? (
              <div className="skeleton h-64 w-full rounded-xl" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-line p-4 min-w-0">
                  <p className="text-[13px] font-medium text-fg mb-2">Expenses by category</p>
                  {donut.length === 0 ? (
                    <EmptyChart label="No expenses" height="h-52" />
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-40 shrink-0">
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie data={donut} dataKey="value" innerRadius={44} outerRadius={70} paddingAngle={2} stroke="#fff" strokeWidth={2} isAnimationActive={false}>
                              {donut.map((d, i) => (
                                <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<MoneyTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <ul className="flex-1 min-w-0 flex flex-col gap-1.5 text-xs">
                        {donut.slice(0, 7).map((d, i) => (
                          <li key={d.name} className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            <span className="flex-1 truncate text-muted">{d.name}</span>
                            <span className="tabular text-fg">{Math.round(share(d.value, expense.total))}%</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-line p-4 min-w-0">
                  <p className="text-[13px] font-medium text-fg mb-2">Income vs expenses</p>
                  {overview.income === 0 && overview.expense === 0 ? (
                    <EmptyChart label="No income or expenses" height="h-52" />
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={[{ name: month.label, Income: overview.income, Expenses: overview.expense }]} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="name" {...axisProps} />
                        <YAxis {...axisProps} tickFormatter={compactMoney} width={48} />
                        <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Income" fill={SERIES.income} radius={[5, 5, 0, 0]} maxBarSize={56} isAnimationActive={false} />
                        <Bar dataKey="Expenses" fill={SERIES.expense} radius={[5, 5, 0, 0]} maxBarSize={56} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="rounded-xl border border-line p-4 min-w-0 md:col-span-2">
                  <p className="text-[13px] font-medium text-fg mb-2">Daily spending</p>
                  {expense.total === 0 ? (
                    <EmptyChart label="No expenses" height="h-40" />
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="name" {...axisProps} interval="preserveStartEnd" minTickGap={8} />
                        <YAxis {...axisProps} tickFormatter={compactMoney} width={48} />
                        <Tooltip
                          content={<MoneyTooltip labelFormatter={(l) => dailyData.find((d) => d.name === l)?.full ?? l} />}
                          cursor={{ fill: "var(--surface-2)" }}
                        />
                        <Bar dataKey="Expenses" fill={SERIES.expense} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="rounded-xl border border-line p-4 min-w-0 md:col-span-2">
                  <p className="text-[13px] font-medium text-fg mb-2">6-month trend</p>
                  {!trendHasHistory ? (
                    <EmptyChart label="Not enough history yet — at least two months with data are needed" height="h-40" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={3}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="name" {...axisProps} />
                        <YAxis {...axisProps} tickFormatter={compactMoney} width={48} />
                        <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Income" fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                        <Bar dataKey="Expenses" fill={SERIES.expense} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </Section>

          <Section title="Expense summary" subtitle="Income and lend & borrow excluded">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <Figure label="Total expenses" value={formatMoney(expense.total)} />
              <Figure label="Transactions" value={String(expense.count)} />
              <Figure label="Average expense" value={formatMoney(expense.average)} />
              <Figure
                label="Highest expense"
                value={expense.highest ? formatMoney(expense.highest.amount) : "—"}
                note={expense.highest ? `${expense.highest.title} · ${formatYmd(expense.highest.day)}` : undefined}
              />
              <Figure
                label="Highest spending day"
                value={expense.highestDay ? formatMoney(expense.highestDay.amount) : "—"}
                note={expense.highestDay ? formatYmd(expense.highestDay.day, { weekday: "long", month: "short", day: "numeric" }) : undefined}
              />
              <Figure
                label="Top category"
                value={expense.categories[0]?.name ?? "—"}
                note={expense.categories[0] ? `${formatMoney(expense.categories[0].amount)} · ${Math.round(share(expense.categories[0].amount, expense.total))}%` : undefined}
              />
            </div>
            {expense.categories.length > 0 && (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-xs text-faint border-b border-line">
                    <th className="text-left font-medium py-2">Category</th>
                    <th className="text-right font-medium py-2">Transactions</th>
                    <th className="text-right font-medium py-2 w-1/3">Share</th>
                    <th className="text-right font-medium py-2">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {expense.categories.map((c, i) => {
                    const pctValue = share(c.amount, expense.total);
                    return (
                      <tr key={c.name}>
                        <td className="py-2">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                            {c.name}
                          </span>
                        </td>
                        <td className="py-2 text-right tabular text-muted">{c.count}</td>
                        <td className="py-2">
                          <span className="flex items-center justify-end gap-2">
                            <span className="h-1.5 w-24 rounded-full bg-muted-bg overflow-hidden hidden sm:block">
                              <span className="block h-full rounded-full bg-accent" style={{ width: `${pctValue}%` }} />
                            </span>
                            <span className="tabular text-muted w-9 text-right">{Math.round(pctValue)}%</span>
                          </span>
                        </td>
                        <td className="py-2 text-right tabular font-medium">{formatMoney(c.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Section>

          <Section title="Income summary">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Figure label="Total income" value={formatMoney(income.total)} tone="text-success" />
              <Figure label="Transactions" value={String(income.count)} />
              <Figure label="Average income" value={formatMoney(income.average)} />
              <Figure
                label="Highest income"
                value={income.highest ? formatMoney(income.highest.amount) : "—"}
                note={income.highest ? `${income.highest.title} · ${formatYmd(income.highest.day)}` : undefined}
              />
            </div>
          </Section>

          <Section title="Lending & borrowing" subtitle="Tracked separately — never counted as income or expense">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MoneyBlock kind="LENT" data={lending} />
              <MoneyBlock kind="BORROWED" data={borrowing} />
            </div>
          </Section>
        </div>

        <footer className="mt-8 pt-4 border-t border-line flex flex-wrap justify-between gap-2 text-[11px] text-faint">
          <span>Expensify · Monthly Financial Report · {month.label}</span>
          <span>Amounts in USD · figures based on transactions recorded in the app</span>
        </footer>
      </article>
    </>
  );
}
