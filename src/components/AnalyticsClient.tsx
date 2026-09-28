"use client";

import React, { useMemo, useState, useTransition } from "react";
import Link from "next/link";
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
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  Activity,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CalendarRange,
  FileChartColumn,
  HandCoins,
  Loader2,
  Receipt,
  Scale,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
} from "lucide-react";
import DatePicker from "react-datepicker";
import PageHeader from "./PageHeader";
import InsightsCard from "./InsightsCard";
import { Select, type SelectOption } from "./Select";
import SegmentIndicator from "./SegmentIndicator";
import { StatGridSkeleton, CardSkeleton } from "./Skeletons";
import {
  CHART_COLORS,
  SERIES,
  ChangeBadge,
  ChartCard,
  EmptyChart,
  MoneyTooltip,
  axisProps,
  compactMoney,
  useMounted,
} from "./ChartKit";
import { getCategoryIcon, getCategoryGlow } from "@/lib/categories";
import { formatMoney } from "@/lib/format";
import {
  RANGE_PRESETS,
  addDays,
  formatMonthKey,
  formatYmd,
  parseYmd,
  pctChange,
  share,
  ymdKey,
  type RangePreset,
} from "@/lib/dates";
import type { AnalyticsData, DayPoint } from "@/lib/finance-types";

const signed = (n: number) => `${n < 0 ? "−" : ""}${formatMoney(n)}`;
const pctText = (n: number) => `${Math.round(n)}%`;

const toYmdString = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromYmdString = (s: string) => {
  const v = parseYmd(s);
  return v ? new Date(v.y, v.m, v.d) : null;
};

// ─── Small building blocks ───────────────────────────────────────────────────

function OverviewCard({
  label,
  value,
  hint,
  icon: Icon,
  deco,
  valueClass = "",
  href,
}: {
  label: string;
  value: number;
  hint: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  deco: string;
  valueClass?: string;
  href?: string;
}) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="stat-label truncate">{label}</span>
        <span className="icon-tile h-8 w-8 rounded-lg">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`stat-value mt-3 truncate ${valueClass}`}>{signed(value)}</p>
      <p className="text-xs mt-1 text-faint truncate">{hint}</p>
    </>
  );
  const cls = `card card-interactive card-deco ${deco} p-4 md:p-5 min-w-0 block`;
  return href ? (
    <Link href={href} className={cls}>
      {content}
    </Link>
  ) : (
    <div className={cls}>{content}</div>
  );
}

function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3 min-w-0">
      <p className="text-xs text-faint">{label}</p>
      <p className="text-[15px] font-semibold tabular text-fg mt-0.5 truncate">{value}</p>
      {hint && (
        <p className="text-xs text-muted mt-0.5 truncate" title={hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

function MoneyRow({ label, value, strong = false, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className={`tabular ${strong ? "text-[15px] font-semibold" : "text-sm font-medium"} ${tone ?? "text-fg"}`}>{value}</dd>
    </div>
  );
}

// ─── Trend helpers ───────────────────────────────────────────────────────────

type Granularity = "day" | "week" | "month";
type Metric = "expense" | "income" | "net";

function groupSeries(daily: DayPoint[], g: Granularity) {
  if (g === "day") return daily.map((d) => ({ key: d.day, income: d.income, expense: d.expense }));
  const map = new Map<string, { key: string; income: number; expense: number }>();
  for (const d of daily) {
    const v = parseYmd(d.day)!;
    const key =
      g === "month"
        ? d.day.slice(0, 7)
        : ymdKey(addDays(v, -new Date(Date.UTC(v.y, v.m, v.d)).getUTCDay())); // week starting Sunday
    const cur = map.get(key) ?? { key, income: 0, expense: 0 };
    cur.income += d.income;
    cur.expense += d.expense;
    map.set(key, cur);
  }
  return [...map.values()];
}

const bucketLabel = (key: string, g: Granularity, long = false) =>
  g === "month"
    ? formatMonthKey(key, long ? { month: "long", year: "numeric" } : undefined)
    : g === "week"
      ? `${long ? "Week of " : ""}${formatYmd(key)}`
      : formatYmd(key, long ? { weekday: "short", month: "short", day: "numeric", year: "numeric" } : undefined);

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const router = useRouter();
  const mounted = useMounted();
  const [isPending, startTransition] = useTransition();
  const { period, overview, current, previous, categories, stats, money } = data;

  const [customFrom, setCustomFrom] = useState(period.preset === "custom" ? period.from : "");
  const [customTo, setCustomTo] = useState(period.preset === "custom" ? period.to : "");

  const days = period.elapsedDays;
  const granularities: Array<{ value: Granularity; label: string }> = [
    { value: "day", label: "Daily" },
    ...(days >= 14 ? [{ value: "week" as const, label: "Weekly" }] : []),
    ...(days >= 60 ? [{ value: "month" as const, label: "Monthly" }] : []),
  ];
  const defaultGranularity: Granularity = days <= 31 ? "day" : days <= 120 ? "week" : "month";
  const [granularity, setGranularity] = useState<Granularity>(defaultGranularity);
  const g = granularities.some((x) => x.value === granularity) ? granularity : defaultGranularity;
  const [metric, setMetric] = useState<Metric>("expense");

  const trend = useMemo(
    () =>
      groupSeries(data.daily, g).map((b) => ({
        ...b,
        net: Math.round((b.income - b.expense) * 100) / 100,
        label: bucketLabel(b.key, g),
      })),
    [data.daily, g],
  );
  const trendHasData = trend.some((b) => b.income !== 0 || b.expense !== 0);

  const go = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params).toString();
    startTransition(() => router.push(qs ? `/analytics?${qs}` : "/analytics"));
  };

  const onPreset = (p: RangePreset) => {
    if (p === "custom") {
      const f = customFrom || period.from;
      const t = customTo || period.to;
      setCustomFrom(f);
      setCustomTo(t);
      go({ range: "custom", from: f, to: t });
    } else {
      go(p === "month" ? {} : { range: p });
    }
  };

  const expenseCats = categories.filter((c) => c.amount > 0);
  const donutData = expenseCats.slice(0, 7).map((c) => ({ name: c.name, value: c.amount }));
  const otherTotal = expenseCats.slice(7).reduce((s, c) => s + c.amount, 0);
  if (otherTotal > 0) donutData.push({ name: "Other categories", value: otherTotal });

  const compareBars = [
    { name: "Income", Previous: previous.income, Current: current.income },
    { name: "Expenses", Previous: previous.expense, Current: current.expense },
  ];
  const expenseShareOfIncome = current.income > 0 ? share(current.expense, current.income) : null;

  const dim = isPending ? "is-refreshing" : "";
  const noActivity = current.income === 0 && current.expense === 0;

  return (
    <>
      <PageHeader
        icon={BarChart3}
        title="Analytics"
        description="Income, spending and lend & borrow — analysed by period."
        actions={
          <Link href="/reports" className="btn btn-secondary">
            <FileChartColumn />
            Monthly report
          </Link>
        }
      />

      {/* Period toolbar */}
      <section className="card p-3 md:p-4 flex flex-col lg:flex-row lg:items-center gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1">
          <div className="sm:w-52">
            <Select
              value={period.preset}
              onChange={onPreset}
              options={RANGE_PRESETS as SelectOption<RangePreset>[]}
              aria-label="Analysis period"
            />
          </div>
          {period.preset === "custom" && (
            <div className="grid grid-cols-2 gap-2.5 sm:w-80 animate-fade-in">
              <div className="relative">
                <Calendar className="input-icon" />
                <DatePicker
                  selected={fromYmdString(customFrom)}
                  onChange={(d: Date | null) => {
                    if (!d) return;
                    const f = toYmdString(d);
                    setCustomFrom(f);
                    go({ range: "custom", from: f, to: customTo || f });
                  }}
                  maxDate={fromYmdString(customTo) ?? undefined}
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
                  selected={fromYmdString(customTo)}
                  onChange={(d: Date | null) => {
                    if (!d) return;
                    const t = toYmdString(d);
                    setCustomTo(t);
                    go({ range: "custom", from: customFrom || t, to: t });
                  }}
                  minDate={fromYmdString(customFrom) ?? undefined}
                  dateFormat="MMM d, yyyy"
                  placeholderText="To"
                  fixedHeight
                  className="input pl-9 cursor-pointer"
                  wrapperClassName="w-full"
                />
              </div>
            </div>
          )}
        </div>
        <p className="text-[13px] text-muted flex items-center gap-2">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin text-accent-fg" /> : <CalendarRange className="h-4 w-4 text-faint" />}
          <span>
            <span className="font-medium text-fg">{period.label}</span>
            <span className="text-faint"> · compared with {period.prevLabel}</span>
          </span>
        </p>
      </section>

      {/* Overview */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 transition-[opacity,filter] ${dim}`}>
        <OverviewCard label="Available balance" value={overview.available} hint="Right now" icon={Wallet} deco="deco-green" href="/dashboard" />
        <OverviewCard label="Total income" value={overview.income} hint={`${current.incomeCount} income entries`} icon={TrendingUp} deco="deco-teal" />
        <OverviewCard label="Total expenses" value={overview.expense} hint={`${current.expenseCount} expenses`} icon={TrendingDown} deco="deco-cyan" />
        <OverviewCard
          label="Net cash flow"
          value={overview.net}
          hint="Income − expenses"
          icon={Scale}
          deco={overview.net < 0 ? "deco-rose" : "deco-blue"}
          valueClass={overview.net < 0 ? "text-danger!" : ""}
        />
        <OverviewCard label="Lent" value={overview.lent} hint="In this period" icon={ArrowUpRight} deco="deco-sky" href="/lend-borrow?type=LENT" />
        <OverviewCard label="Receivable" value={overview.receivable} hint="Others owe you now" icon={HandCoins} deco="deco-green" href="/lend-borrow?type=LENT&status=OPEN" />
        <OverviewCard label="Borrowed" value={overview.borrowed} hint="In this period" icon={ArrowDownLeft} deco="deco-amber" href="/lend-borrow?type=BORROWED" />
        <OverviewCard label="Payable" value={overview.payable} hint="You owe now" icon={HandCoins} deco="deco-orange" href="/lend-borrow?type=BORROWED&status=OPEN" />
      </div>

      <InsightsCard
        insights={data.insights}
        subtitle={`${period.label} · rule-based, from your own data`}
        columns={2}
        className={dim}
      />

      {!mounted ? (
        <>
          <StatGridSkeleton count={2} className="grid-cols-1 lg:grid-cols-2" />
          <CardSkeleton bodyHeight="h-65" />
        </>
      ) : (
        <>
          {/* Income vs expense + period comparison */}
          <div className={`grid grid-cols-1 lg:grid-cols-5 gap-4 ${dim}`}>
            <ChartCard title="Income vs expenses" subtitle={`${period.label} and ${period.prevLabel}`} className="lg:col-span-3">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <StatTile label="Income" value={formatMoney(current.income)} />
                <StatTile label="Expenses" value={formatMoney(current.expense)} />
                <StatTile
                  label="Net flow"
                  value={signed(current.income - current.expense)}
                  hint={expenseShareOfIncome !== null ? `${pctText(expenseShareOfIncome)} of income spent` : "No income recorded"}
                />
              </div>
              {noActivity && previous.income === 0 && previous.expense === 0 ? (
                <EmptyChart label="No income or expenses in this period" height="h-52" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={compareBars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={6}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" {...axisProps} />
                    <YAxis {...axisProps} tickFormatter={compactMoney} width={52} />
                    <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--text-2)" }} />
                    <Bar dataKey="Previous" name={period.prevLabel} fill={SERIES.previous} radius={[5, 5, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="Current" name={period.label} radius={[5, 5, 0, 0]} maxBarSize={44}>
                      {compareBars.map((b) => (
                        <Cell key={b.name} fill={b.name === "Income" ? SERIES.income : SERIES.expense} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title="Period comparison" subtitle={`vs ${period.prevLabel}`} className="lg:col-span-2" bodyClassName="px-5 py-2">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-xs text-faint">
                    <th className="text-left font-medium py-2"> </th>
                    <th className="text-right font-medium py-2">Previous</th>
                    <th className="text-right font-medium py-2">Current</th>
                    <th className="text-right font-medium py-2">Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    { label: "Income", cur: current.income, prev: previous.income, invert: false },
                    { label: "Expenses", cur: current.expense, prev: previous.expense, invert: true },
                    {
                      label: "Net flow",
                      cur: current.income - current.expense,
                      prev: previous.income - previous.expense,
                      invert: false,
                    },
                  ].map((r) => {
                    // Net flow can be negative: compare against |previous| so the direction stays honest
                    const change =
                      r.label === "Net flow"
                        ? r.prev !== 0
                          ? ((r.cur - r.prev) / Math.abs(r.prev)) * 100
                          : null
                        : pctChange(r.cur, r.prev);
                    return (
                      <tr key={r.label}>
                        <td className="py-3 text-muted">{r.label}</td>
                        <td className="py-3 text-right tabular text-muted">{signed(r.prev)}</td>
                        <td className="py-3 text-right tabular font-semibold text-fg">{signed(r.cur)}</td>
                        <td className="py-3 text-right">
                          {r.cur === 0 && r.prev === 0 ? (
                            <span className="text-faint">—</span>
                          ) : (
                            <ChangeBadge value={change} invert={r.invert} />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-faint py-3 border-t border-line">
                Difference in expenses:{" "}
                <span className="tabular font-medium text-fg">
                  {current.expense - previous.expense >= 0 ? "+" : "−"}
                  {formatMoney(current.expense - previous.expense)}
                </span>
                . &ldquo;New&rdquo; means nothing was recorded in {period.prevLabel}.
              </p>
            </ChartCard>
          </div>

          {/* Trend */}
          <ChartCard
            title="Trend"
            subtitle={`${metric === "expense" ? "Expenses" : metric === "income" ? "Income" : "Net cash flow"} · ${period.label}`}
            className={dim}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="segmented" role="tablist" aria-label="Trend metric">
                  <SegmentIndicator />
                  {(["expense", "income", "net"] as const).map((m) => (
                    <button key={m} type="button" role="tab" aria-selected={metric === m} data-active={metric === m} onClick={() => setMetric(m)}>
                      {m === "expense" ? "Expenses" : m === "income" ? "Income" : "Net"}
                    </button>
                  ))}
                </div>
                {granularities.length > 1 && (
                  <div className="w-32">
                    <Select value={g} onChange={setGranularity} options={granularities} size="sm" aria-label="Group by" />
                  </div>
                )}
              </div>
            }
          >
            {!trendHasData ? (
              <EmptyChart label="Nothing recorded in this period yet" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                {metric === "net" ? (
                  <BarChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                    <YAxis {...axisProps} tickFormatter={compactMoney} width={52} />
                    <ReferenceLine y={0} stroke="var(--border-strong)" />
                    <Tooltip
                      content={<MoneyTooltip labelFormatter={(l) => bucketLabel(trend.find((t) => t.label === l)?.key ?? l, g, true)} />}
                      cursor={{ fill: "var(--surface-2)" }}
                    />
                    <Bar dataKey="net" name="Net flow" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {trend.map((b) => (
                        <Cell key={b.key} fill={b.net < 0 ? SERIES.expense : SERIES.income} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <AreaChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={metric === "income" ? SERIES.income : SERIES.expense} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={metric === "income" ? SERIES.income : SERIES.expense} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                    <YAxis {...axisProps} tickFormatter={compactMoney} width={52} />
                    <Tooltip
                      content={<MoneyTooltip labelFormatter={(l) => bucketLabel(trend.find((t) => t.label === l)?.key ?? l, g, true)} />}
                      cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
                    />
                    <Area
                      type="monotone"
                      dataKey={metric}
                      name={metric === "income" ? "Income" : "Expenses"}
                      stroke={metric === "income" ? SERIES.income : SERIES.expense}
                      strokeWidth={2}
                      fill="url(#trendFill)"
                      activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                      animationDuration={700}
                    />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Categories */}
          <div className={`grid grid-cols-1 lg:grid-cols-5 gap-4 ${dim}`}>
            <ChartCard title="Top spending categories" subtitle="Share of expenses" className="lg:col-span-2">
              {donutData.length === 0 ? (
                <EmptyChart label="No expenses in this period" />
              ) : (
                <div className="flex flex-col gap-4">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={82}
                        paddingAngle={2}
                        dataKey="value"
                        stroke="var(--surface)"
                        strokeWidth={2}
                        animationDuration={700}
                      >
                        {donutData.map((d, i) => (
                          <Cell key={d.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<MoneyTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <ol className="flex flex-col gap-1">
                    {expenseCats.slice(0, 5).map((c, i) => (
                      <li key={c.name}>
                        <Link
                          href={c.href}
                          className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 text-[13px] hover:bg-subtle transition-colors"
                          title={`View ${c.name} expenses`}
                        >
                          <span className="w-4 text-faint tabular text-right">{i + 1}</span>
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i] }} />
                          <span className="flex-1 truncate text-fg group-hover:text-accent-fg">{c.name}</span>
                          <span className="tabular text-faint w-10 text-right">{pctText(share(c.amount, current.expense))}</span>
                          <span className="tabular font-medium text-fg w-24 text-right">{formatMoney(c.amount)}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Category comparison" subtitle={`${period.label} vs ${period.prevLabel}`} className="lg:col-span-3">
              {categories.length === 0 ? (
                <EmptyChart label="No expenses in either period" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, categories.length * 44)}>
                  <BarChart
                    data={categories.map((c) => ({ name: c.name, Current: c.amount, Previous: c.prevAmount }))}
                    layout="vertical"
                    margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                    barGap={2}
                  >
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" {...axisProps} tickFormatter={compactMoney} />
                    <YAxis type="category" dataKey="name" {...axisProps} width={96} />
                    <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--text-2)" }} />
                    <Bar dataKey="Previous" name={period.prevLabel} fill={SERIES.previous} radius={[0, 4, 4, 0]} maxBarSize={14} />
                    <Bar dataKey="Current" name={period.label} fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Category table */}
          {categories.length > 0 && (
            <section className={`card overflow-hidden ${dim}`}>
              <div className="card-head px-5 py-4">
                <h2 className="section-title">Category summary</h2>
                <p className="section-subtitle">Click a category to see its expenses</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th className="text-right!">Amount</th>
                      <th className="text-right!">Share</th>
                      <th className="text-right! hidden sm:table-cell">Transactions</th>
                      <th className="text-right! hidden md:table-cell">Previous</th>
                      <th className="text-right!">Change</th>
                    </tr>
                  </thead>
                  <tbody className="stagger-rows" key={period.from + period.to}>
                    {categories.map((c) => {
                      const Icon = getCategoryIcon(c.name);
                      return (
                        <tr key={c.name} onClick={() => router.push(c.href)} className="cursor-pointer">
                          <td>
                            <span className="flex items-center gap-2.5">
                              <span className={`h-7 w-7 rounded-lg flex items-center justify-center ${getCategoryGlow(c.name)}`}>
                                <Icon className="h-3.5 w-3.5" />
                              </span>
                              <span className="font-medium">{c.name}</span>
                            </span>
                          </td>
                          <td className="text-right tabular font-semibold">{formatMoney(c.amount)}</td>
                          <td className="text-right tabular text-muted">{pctText(share(c.amount, current.expense))}</td>
                          <td className="text-right tabular text-muted hidden sm:table-cell">{c.count}</td>
                          <td className="text-right tabular text-muted hidden md:table-cell">{formatMoney(c.prevAmount)}</td>
                          <td className="text-right">
                            {c.amount === 0 && c.prevAmount === 0 ? (
                              <span className="text-faint">—</span>
                            ) : (
                              <ChangeBadge value={pctChange(c.amount, c.prevAmount)} invert />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* Spending statistics */}
      <section className={`card overflow-hidden ${dim}`}>
        <div className="card-head px-5 py-4 flex items-center gap-2.5">
          <span className="icon-tile h-8 w-8 rounded-lg">
            <Activity className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">Spending statistics</h2>
            <p className="section-subtitle">Expenses only — income and lend & borrow excluded</p>
          </div>
        </div>
        <div className="p-4 md:p-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label="Average daily" value={formatMoney(stats.avgDaily)} hint={`Over ${days} day${days === 1 ? "" : "s"}`} />
          <StatTile label="Average weekly" value={stats.avgWeekly !== null ? formatMoney(stats.avgWeekly) : "—"} hint={stats.avgWeekly === null ? "Needs 7+ days" : undefined} />
          <StatTile label="Average monthly" value={stats.avgMonthly !== null ? formatMoney(stats.avgMonthly) : "—"} hint={stats.avgMonthly === null ? "Needs 28+ days" : undefined} />
          <StatTile label="Expense transactions" value={String(stats.expenseCount)} hint={`Avg ${formatMoney(stats.avgTransaction)} each`} />
          <StatTile
            label="Highest spending day"
            value={stats.highestDay ? formatMoney(stats.highestDay.amount) : "—"}
            hint={stats.highestDay ? formatYmd(stats.highestDay.day, { weekday: "short", month: "short", day: "numeric" }) : "No expenses"}
          />
          <StatTile
            label="Lowest spending day"
            value={stats.lowestDay ? formatMoney(stats.lowestDay.amount) : "—"}
            hint={stats.lowestDay ? formatYmd(stats.lowestDay.day, { weekday: "short", month: "short", day: "numeric" }) : "Needs 2+ spending days"}
          />
          <StatTile
            label="Highest single expense"
            value={stats.highestExpense ? formatMoney(stats.highestExpense.amount) : "—"}
            hint={stats.highestExpense ? `${stats.highestExpense.title} · ${formatYmd(stats.highestExpense.day)}` : "No expenses"}
          />
          <StatTile label="Average transaction" value={formatMoney(stats.avgTransaction)} hint="Per expense" />
        </div>
      </section>

      {/* Lend & borrow analytics */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${dim}`}>
        {(
          [
            {
              title: "Lending",
              subtitle: "Money you gave — receivable",
              icon: ArrowUpRight,
              tile: "bg-success-soft text-success",
              href: "/lend-borrow?type=LENT",
              rows: [
                { label: "Lent in period", value: `${formatMoney(money.lentInPeriod)} · ${money.lentCountInPeriod} record${money.lentCountInPeriod === 1 ? "" : "s"}` },
                { label: "Repaid in period", value: formatMoney(money.repaidInPeriod) },
                { label: "Current receivable", value: formatMoney(money.receivable), strong: true, tone: "text-success" },
                { label: "Active records", value: String(money.activeLending) },
                { label: "Overdue records", value: String(money.overdueLending), tone: money.overdueLending ? "text-danger" : undefined },
              ],
            },
            {
              title: "Borrowing",
              subtitle: "Money you received — payable",
              icon: ArrowDownRight,
              tile: "bg-warning-soft text-warning",
              href: "/lend-borrow?type=BORROWED",
              rows: [
                { label: "Borrowed in period", value: `${formatMoney(money.borrowedInPeriod)} · ${money.borrowedCountInPeriod} record${money.borrowedCountInPeriod === 1 ? "" : "s"}` },
                { label: "Paid back in period", value: formatMoney(money.paidInPeriod) },
                { label: "Current payable", value: formatMoney(money.payable), strong: true, tone: "text-warning" },
                { label: "Active records", value: String(money.activeBorrowing) },
                { label: "Overdue records", value: String(money.overdueBorrowing), tone: money.overdueBorrowing ? "text-danger" : undefined },
              ],
            },
          ] as const
        ).map((s) => {
          const Icon = s.icon;
          return (
            <section key={s.title} className="card overflow-hidden">
              <div className="card-head px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className={`h-8 w-8 rounded-lg flex items-center justify-center ${s.tile}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <h2 className="section-title">{s.title}</h2>
                    <p className="section-subtitle">{s.subtitle}</p>
                  </div>
                </div>
                <Link href={s.href} className="btn btn-ghost btn-sm">
                  View
                </Link>
              </div>
              <dl className="px-5 py-1 divide-y divide-line">
                {s.rows.map((r) => (
                  <MoneyRow key={r.label} label={r.label} value={r.value} strong={"strong" in r && r.strong} tone={"tone" in r ? r.tone : undefined} />
                ))}
              </dl>
              <p className="px-5 py-3 text-xs text-faint border-t border-line">
                Not counted as {s.title === "Lending" ? "an expense" : "income"}.
              </p>
            </section>
          );
        })}
      </div>

      {noActivity && money.recordCount === 0 && (
        <div className="card p-6 text-center">
          <Receipt className="h-6 w-6 text-faint mx-auto mb-2" />
          <p className="text-sm font-medium text-fg">No data yet</p>
          <p className="text-[13px] text-muted mt-1">
            Add transactions from the dashboard and your analytics will fill in automatically.
          </p>
          <Link href="/dashboard" className="btn btn-secondary btn-sm mt-3">
            <Trophy />
            Go to dashboard
          </Link>
        </div>
      )}
    </>
  );
}
