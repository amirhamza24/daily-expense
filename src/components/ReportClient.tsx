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
import { CHART_COLORS, SERIES, EmptyChart, MoneyTooltip, axisProps, useMounted } from "./ChartKit";
import { useI18n } from "./I18nProvider";
import type { Formatter } from "@/lib/format";
import { categoryLabel } from "@/lib/i18n/messages";
import { formatMonthKey, formatYmd, monthName, share } from "@/lib/dates";
import { downloadNodeAsImage, downloadNodeAsPdf } from "@/lib/export-image";
import type { MoneyMonthSummary, MonthlyReport } from "@/lib/finance-types";

const signed = (fmt: Formatter, n: number) => `${n < 0 ? "−" : n > 0 ? "+" : ""}${fmt.money(n)}`;
const plain = (fmt: Formatter, n: number) => `${n < 0 ? "−" : ""}${fmt.money(n)}`;
const pct = (fmt: Formatter, n: number) => fmt.digits(`${Math.round(n)}%`);

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
  const { m, fmt } = useI18n();
  const r = m.reports;
  const lent = kind === "LENT";
  const Icon = lent ? ArrowUpRight : ArrowDownLeft;
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex items-center gap-2.5 mb-2">
        <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${lent ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div>
          <p className="text-[13.5px] font-semibold text-fg">{lent ? r.lendingTitle : r.borrowingTitle}</p>
          <p className="text-[11px] text-faint">{lent ? r.notExpense : r.notIncome}</p>
        </div>
      </div>
      <Rows
        rows={[
          [lent ? r.lentThisMonth : r.borrowedThisMonth, `${fmt.money(data.amount)} · ${r.records(data.count)}`],
          [lent ? r.repaymentsReceived : r.paymentsMade, fmt.money(data.settled)],
          [r.stillOutstanding, fmt.money(data.outstanding)],
          [lent ? r.totalReceivable : r.totalPayable, fmt.money(data.currentOutstanding), lent ? "text-success" : "text-warning"],
          [r.statusBreakdown, fmt.digits(`${data.paid} · ${data.partial} · ${data.pending}`)],
          [r.overdue, fmt.number(data.overdue), data.overdue ? "text-danger" : undefined],
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
  const { m, fmt } = useI18n();
  const r = m.reports;
  const cat = (name: string) => categoryLabel(m, name);
  const monthOptions: SelectOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: String(i),
    label: monthName(i, fmt.locale),
  }));

  const { month, overview, expense, income, lending, borrowing } = report;

  const goTo = (year: number, index: number) => {
    const d = new Date(Date.UTC(year, index, 1));
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    startTransition(() => router.push(`/reports?month=${key}`));
  };

  const yearOptions: SelectOption[] = report.years.map((y) => ({ value: String(y), label: fmt.digits(y) }));

  const handleExport = async (format: "pdf" | "png" | "jpg") => {
    const node = paperRef.current;
    if (!node) return;
    setExporting(format);
    const fileName = `expensify-report-${month.key}`;
    try {
      if (format === "pdf") await downloadNodeAsPdf(node, fileName);
      // Printable report: always white, regardless of theme
      else await downloadNodeAsImage(node, fileName, format, { backgroundColor: "#ffffff" });
      showToast(r.saved(month.label, format.toUpperCase()), "success");
    } catch (error) {
      console.error("Report export failed:", error);
      showToast(r.exportFailed, "error");
    } finally {
      setExporting(null);
    }
  };

  const donut = expense.categories.map((c) => ({ name: cat(c.name), value: c.amount }));
  const dailyData = report.daily.map((d) => ({
    name: formatYmd(d.day, { day: "numeric" }, fmt.locale),
    full: formatYmd(d.day, { weekday: "short", month: "short", day: "numeric" }, fmt.locale),
    Expenses: d.expense,
  }));
  const trendData = report.trend.map((t) => ({ name: formatMonthKey(t.month, undefined, fmt.locale), Income: t.income, Expenses: t.expense }));
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
        title={r.title}
        description={r.description}
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
        <button onClick={() => goTo(month.year, month.index - 1)} className="icon-btn border border-line" aria-label={r.prevMonth} disabled={isPending}>
          <ChevronLeft />
        </button>
        <div className="w-40">
          <Select value={String(month.index)} onChange={(v) => goTo(month.year, Number(v))} options={monthOptions} aria-label={r.month} />
        </div>
        <div className="w-28">
          <Select value={String(month.year)} onChange={(v) => goTo(Number(v), month.index)} options={yearOptions} aria-label={r.year} />
        </div>
        <button onClick={() => goTo(month.year, month.index + 1)} className="icon-btn border border-line" aria-label={r.nextMonth} disabled={isPending}>
          <ChevronRight />
        </button>
        <span className="text-[13px] text-muted ml-auto flex items-center gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin text-accent-fg" />}
          {report.isCurrentMonth ? r.currentMonth : r.completeMonth}
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
              <p className="text-xs text-faint">{r.paperTitle}</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-2xl font-semibold tracking-tight text-fg">{month.label}</h1>
            <p className="text-xs text-faint mt-1">{r.preparedFor(userName)}</p>
            <p className="text-xs text-faint">
              {r.generated}{" "}
              {mounted
                ? new Date(report.generatedAt).toLocaleString(fmt.locale === "bn" ? "bn-BD" : "en-US", { dateStyle: "medium", timeStyle: "short" })
                : formatYmd(report.generatedAt.slice(0, 10), { month: "short", day: "numeric", year: "numeric" }, fmt.locale)}
            </p>
          </div>
        </header>

        <div className="pt-6">
          <Section title={r.overview} subtitle={r.overviewHint}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Figure label={r.opening} value={plain(fmt, overview.opening)} />
              <Figure label={r.income} value={fmt.money(overview.income)} tone="text-success" />
              <Figure label={r.expenses} value={fmt.money(overview.expense)} tone="text-danger" />
              <Figure label={r.netCashFlow} value={signed(fmt, overview.net)} tone={overview.net < 0 ? "text-danger" : "text-fg"} note={r.incomeMinusExpenses} />
              <Figure label={r.lendBorrow} value={signed(fmt, overview.lendBorrowNet)} note={r.lendBorrowNote} />
              <Figure label={r.closing} value={plain(fmt, overview.closing)} tone="text-accent-fg" />
            </div>
          </Section>

          <Section title={r.highlights}>
            {report.highlights.length === 0 ? (
              <p className="text-[13px] text-faint">{r.noTransactions(month.label)}</p>
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

          <Section title={r.charts}>
            {!mounted ? (
              <div className="skeleton h-64 w-full rounded-xl" />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-line p-4 min-w-0">
                  <p className="text-[13px] font-medium text-fg mb-2">{r.byCategory}</p>
                  {donut.length === 0 ? (
                    <EmptyChart label={r.noExpenses} height="h-52" />
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
                            <span className="tabular text-fg">{pct(fmt, share(d.value, expense.total))}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-line p-4 min-w-0">
                  <p className="text-[13px] font-medium text-fg mb-2">{r.incomeVsExpenses}</p>
                  {overview.income === 0 && overview.expense === 0 ? (
                    <EmptyChart label={r.noIncomeExpenses} height="h-52" />
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={[{ name: month.label, Income: overview.income, Expenses: overview.expense }]} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="name" {...axisProps} />
                        <YAxis {...axisProps} tickFormatter={fmt.compactMoney} width={48} />
                        <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Income" name={r.income} fill={SERIES.income} radius={[5, 5, 0, 0]} maxBarSize={56} isAnimationActive={false} />
                        <Bar dataKey="Expenses" name={r.expenses} fill={SERIES.expense} radius={[5, 5, 0, 0]} maxBarSize={56} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="rounded-xl border border-line p-4 min-w-0 md:col-span-2">
                  <p className="text-[13px] font-medium text-fg mb-2">{r.dailySpending}</p>
                  {expense.total === 0 ? (
                    <EmptyChart label={r.noExpenses} height="h-40" />
                  ) : (
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={dailyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="name" {...axisProps} interval="preserveStartEnd" minTickGap={8} />
                        <YAxis {...axisProps} tickFormatter={fmt.compactMoney} width={48} />
                        <Tooltip
                          content={<MoneyTooltip labelFormatter={(l) => dailyData.find((d) => d.name === l)?.full ?? l} />}
                          cursor={{ fill: "var(--surface-2)" }}
                        />
                        <Bar dataKey="Expenses" name={r.expenses} fill={SERIES.expense} radius={[3, 3, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="rounded-xl border border-line p-4 min-w-0 md:col-span-2">
                  <p className="text-[13px] font-medium text-fg mb-2">{r.trend6}</p>
                  {!trendHasHistory ? (
                    <EmptyChart label={r.notEnoughHistory} height="h-40" />
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={trendData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={3}>
                        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                        <XAxis dataKey="name" {...axisProps} />
                        <YAxis {...axisProps} tickFormatter={fmt.compactMoney} width={48} />
                        <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Income" name={r.income} fill={SERIES.income} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                        <Bar dataKey="Expenses" name={r.expenses} fill={SERIES.expense} radius={[4, 4, 0, 0]} maxBarSize={26} isAnimationActive={false} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            )}
          </Section>

          <Section title={r.expenseSummary} subtitle={r.expenseSummaryHint}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <Figure label={r.totalExpenses} value={fmt.money(expense.total)} />
              <Figure label={r.transactions} value={fmt.number(expense.count)} />
              <Figure label={r.averageExpense} value={fmt.money(expense.average)} />
              <Figure
                label={r.highestExpense}
                value={expense.highest ? fmt.money(expense.highest.amount) : "—"}
                note={expense.highest ? `${expense.highest.title} · ${formatYmd(expense.highest.day, undefined, fmt.locale)}` : undefined}
              />
              <Figure
                label={r.highestDay}
                value={expense.highestDay ? fmt.money(expense.highestDay.amount) : "—"}
                note={expense.highestDay ? formatYmd(expense.highestDay.day, { weekday: "long", month: "short", day: "numeric" }, fmt.locale) : undefined}
              />
              <Figure
                label={r.topCategory}
                value={expense.categories[0] ? cat(expense.categories[0].name) : "—"}
                note={expense.categories[0] ? `${fmt.money(expense.categories[0].amount)} · ${pct(fmt, share(expense.categories[0].amount, expense.total))}` : undefined}
              />
            </div>
            {expense.categories.length > 0 && (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-xs text-faint border-b border-line">
                    <th className="text-left font-medium py-2">{r.colCategory}</th>
                    <th className="text-right font-medium py-2">{r.transactions}</th>
                    <th className="text-right font-medium py-2 w-1/3">{r.colShare}</th>
                    <th className="text-right font-medium py-2">{r.colAmount}</th>
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
                            {cat(c.name)}
                          </span>
                        </td>
                        <td className="py-2 text-right tabular text-muted">{fmt.number(c.count)}</td>
                        <td className="py-2">
                          <span className="flex items-center justify-end gap-2">
                            <span className="h-1.5 w-24 rounded-full bg-muted-bg overflow-hidden hidden sm:block">
                              <span className="block h-full rounded-full bg-accent" style={{ width: `${pctValue}%` }} />
                            </span>
                            <span className="tabular text-muted w-9 text-right">{pct(fmt, pctValue)}</span>
                          </span>
                        </td>
                        <td className="py-2 text-right tabular font-medium">{fmt.money(c.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </Section>

          <Section title={r.incomeSummary}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Figure label={r.totalIncome} value={fmt.money(income.total)} tone="text-success" />
              <Figure label={r.transactions} value={fmt.number(income.count)} />
              <Figure label={r.averageIncome} value={fmt.money(income.average)} />
              <Figure
                label={r.highestIncome}
                value={income.highest ? fmt.money(income.highest.amount) : "—"}
                note={income.highest ? `${income.highest.title} · ${formatYmd(income.highest.day, undefined, fmt.locale)}` : undefined}
              />
            </div>
          </Section>

          <Section title={r.lendingBorrowing} subtitle={r.lendingBorrowingHint}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <MoneyBlock kind="LENT" data={lending} />
              <MoneyBlock kind="BORROWED" data={borrowing} />
            </div>
          </Section>
        </div>

        <footer className="mt-8 pt-4 border-t border-line flex flex-wrap justify-between gap-2 text-[11px] text-faint">
          <span>{r.footer(month.label)}</span>
          <span>{r.footerNote}</span>
        </footer>
      </article>
    </>
  );
}
