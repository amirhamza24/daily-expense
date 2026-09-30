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
  useMounted,
} from "./ChartKit";
import { useI18n } from "./I18nProvider";
import { useDatePickerI18n } from "./useDatePickerI18n";
import { getCategoryIcon, getCategoryGlow } from "@/lib/categories";
import type { Formatter } from "@/lib/format";
import { categoryLabel, type Messages } from "@/lib/i18n/messages";
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

const signed = (fmt: Formatter, n: number) => `${n < 0 ? "−" : ""}${fmt.money(n)}`;
const pctText = (fmt: Formatter, n: number) => fmt.digits(`${Math.round(n)}%`);

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
  const { fmt } = useI18n();
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="stat-label truncate">{label}</span>
        <span className="icon-tile h-8 w-8 rounded-lg">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`stat-value mt-3 truncate ${valueClass}`}>{signed(fmt, value)}</p>
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

const bucketLabel = (m: Messages, fmt: Formatter, key: string, g: Granularity, long = false) =>
  g === "month"
    ? formatMonthKey(key, long ? { month: "long", year: "numeric" } : undefined, fmt.locale)
    : g === "week"
      ? long
        ? m.analytics.weekOf(formatYmd(key, undefined, fmt.locale))
        : formatYmd(key, undefined, fmt.locale)
      : formatYmd(key, long ? { weekday: "short", month: "short", day: "numeric", year: "numeric" } : undefined, fmt.locale);

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AnalyticsClient({ data }: { data: AnalyticsData }) {
  const router = useRouter();
  const mounted = useMounted();
  const [isPending, startTransition] = useTransition();
  const { m, fmt } = useI18n();
  const a = m.analytics;
  const datePickerI18n = useDatePickerI18n("short");
  const { period, overview, current, previous, categories, stats, money } = data;
  const cat = (name: string) => categoryLabel(m, name);

  const [customFrom, setCustomFrom] = useState(period.preset === "custom" ? period.from : "");
  const [customTo, setCustomTo] = useState(period.preset === "custom" ? period.to : "");

  const days = period.elapsedDays;
  const granularities: Array<{ value: Granularity; label: string }> = [
    { value: "day", label: a.daily },
    ...(days >= 14 ? [{ value: "week" as const, label: a.weekly }] : []),
    ...(days >= 60 ? [{ value: "month" as const, label: a.monthly }] : []),
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
        label: bucketLabel(m, fmt, b.key, g),
      })),
    [data.daily, g, m, fmt],
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
  const donutData = expenseCats.slice(0, 7).map((c) => ({ name: cat(c.name), value: c.amount }));
  const otherTotal = expenseCats.slice(7).reduce((s, c) => s + c.amount, 0);
  if (otherTotal > 0) donutData.push({ name: a.otherCategories, value: otherTotal });

  const compareBars = [
    { key: "income", name: a.income, Previous: previous.income, Current: current.income },
    { key: "expense", name: a.expenses, Previous: previous.expense, Current: current.expense },
  ];
  const expenseShareOfIncome = current.income > 0 ? share(current.expense, current.income) : null;

  const dim = isPending ? "is-refreshing" : "";
  const noActivity = current.income === 0 && current.expense === 0;

  return (
    <>
      <PageHeader
        icon={BarChart3}
        title={a.title}
        description={a.description}
        actions={
          <Link href="/reports" className="btn btn-secondary">
            <FileChartColumn />
            {a.monthlyReport}
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
              options={RANGE_PRESETS.map((value): SelectOption<RangePreset> => ({ value, label: m.periods.presets[value] }))}
              aria-label={a.period}
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
                  {...datePickerI18n}
                  placeholderText={a.from}
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
                  {...datePickerI18n}
                  placeholderText={a.to}
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
            <span className="text-faint">{a.comparedWith(period.prevLabel)}</span>
          </span>
        </p>
      </section>

      {/* Overview */}
      <div className={`grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 transition-[opacity,filter] ${dim}`}>
        <OverviewCard label={a.availableBalance} value={overview.available} hint={a.rightNow} icon={Wallet} deco="deco-green" href="/dashboard" />
        <OverviewCard label={a.totalIncome} value={overview.income} hint={a.incomeEntries(current.incomeCount)} icon={TrendingUp} deco="deco-teal" />
        <OverviewCard label={a.totalExpenses} value={overview.expense} hint={a.expensesCount(current.expenseCount)} icon={TrendingDown} deco="deco-cyan" />
        <OverviewCard
          label={a.netCashFlow}
          value={overview.net}
          hint={a.incomeMinusExpenses}
          icon={Scale}
          deco={overview.net < 0 ? "deco-rose" : "deco-blue"}
          valueClass={overview.net < 0 ? "text-danger!" : ""}
        />
        <OverviewCard label={a.lent} value={overview.lent} hint={a.inPeriod} icon={ArrowUpRight} deco="deco-sky" href="/lend-borrow?type=LENT" />
        <OverviewCard label={a.receivable} value={overview.receivable} hint={a.othersOweNow} icon={HandCoins} deco="deco-green" href="/lend-borrow?type=LENT&status=OPEN" />
        <OverviewCard label={a.borrowed} value={overview.borrowed} hint={a.inPeriod} icon={ArrowDownLeft} deco="deco-amber" href="/lend-borrow?type=BORROWED" />
        <OverviewCard label={a.payable} value={overview.payable} hint={a.youOweNow} icon={HandCoins} deco="deco-orange" href="/lend-borrow?type=BORROWED&status=OPEN" />
      </div>

      <InsightsCard
        insights={data.insights}
        subtitle={a.insightsSubtitle(period.label)}
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
            <ChartCard title={a.incomeVsExpenses} subtitle={a.andPrev(period.label, period.prevLabel)} className="lg:col-span-3">
              <div className="grid grid-cols-3 gap-2 mb-4">
                <StatTile label={a.income} value={fmt.money(current.income)} />
                <StatTile label={a.expenses} value={fmt.money(current.expense)} />
                <StatTile
                  label={a.netFlow}
                  value={signed(fmt, current.income - current.expense)}
                  hint={expenseShareOfIncome !== null ? a.ofIncomeSpent(pctText(fmt, expenseShareOfIncome)) : a.noIncome}
                />
              </div>
              {noActivity && previous.income === 0 && previous.expense === 0 ? (
                <EmptyChart label={a.noActivity} height="h-52" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={compareBars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={6}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="name" {...axisProps} />
                    <YAxis {...axisProps} tickFormatter={fmt.compactMoney} width={52} />
                    <Tooltip content={<MoneyTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: "var(--text-2)" }} />
                    <Bar dataKey="Previous" name={period.prevLabel} fill={SERIES.previous} radius={[5, 5, 0, 0]} maxBarSize={44} />
                    <Bar dataKey="Current" name={period.label} radius={[5, 5, 0, 0]} maxBarSize={44}>
                      {compareBars.map((b) => (
                        <Cell key={b.key} fill={b.key === "income" ? SERIES.income : SERIES.expense} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            <ChartCard title={a.periodComparison} subtitle={a.vsPrev(period.prevLabel)} className="lg:col-span-2" bodyClassName="px-5 py-2">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-xs text-faint">
                    <th className="text-left font-medium py-2"> </th>
                    <th className="text-right font-medium py-2">{a.previous}</th>
                    <th className="text-right font-medium py-2">{a.current}</th>
                    <th className="text-right font-medium py-2">{a.change}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    { key: "income", label: a.income, cur: current.income, prev: previous.income, invert: false },
                    { key: "expense", label: a.expenses, cur: current.expense, prev: previous.expense, invert: true },
                    {
                      key: "net",
                      label: a.netFlow,
                      cur: current.income - current.expense,
                      prev: previous.income - previous.expense,
                      invert: false,
                    },
                  ].map((r) => {
                    // Net flow can be negative: compare against |previous| so the direction stays honest
                    const change =
                      r.key === "net"
                        ? r.prev !== 0
                          ? ((r.cur - r.prev) / Math.abs(r.prev)) * 100
                          : null
                        : pctChange(r.cur, r.prev);
                    return (
                      <tr key={r.key}>
                        <td className="py-3 text-muted">{r.label}</td>
                        <td className="py-3 text-right tabular text-muted">{signed(fmt, r.prev)}</td>
                        <td className="py-3 text-right tabular font-semibold text-fg">{signed(fmt, r.cur)}</td>
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
                {a.expenseDiff}{" "}
                <span className="tabular font-medium text-fg">
                  {current.expense - previous.expense >= 0 ? "+" : "−"}
                  {fmt.money(current.expense - previous.expense)}
                </span>
                {a.newMeans(period.prevLabel)}
              </p>
            </ChartCard>
          </div>

          {/* Trend */}
          <ChartCard
            title={a.trend}
            subtitle={`${metric === "expense" ? a.expenses : metric === "income" ? a.income : a.netCashFlow} · ${period.label}`}
            className={dim}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <div className="segmented" role="tablist" aria-label={a.trendMetric}>
                  <SegmentIndicator />
                  {(["expense", "income", "net"] as const).map((k) => (
                    <button key={k} type="button" role="tab" aria-selected={metric === k} data-active={metric === k} onClick={() => setMetric(k)}>
                      {k === "expense" ? a.expenses : k === "income" ? a.income : a.net}
                    </button>
                  ))}
                </div>
                {granularities.length > 1 && (
                  <div className="w-32">
                    <Select value={g} onChange={setGranularity} options={granularities} size="sm" aria-label={a.groupBy} />
                  </div>
                )}
              </div>
            }
          >
            {!trendHasData ? (
              <EmptyChart label={a.nothingYet} />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                {metric === "net" ? (
                  <BarChart data={trend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" {...axisProps} minTickGap={16} />
                    <YAxis {...axisProps} tickFormatter={fmt.compactMoney} width={52} />
                    <ReferenceLine y={0} stroke="var(--border-strong)" />
                    <Tooltip
                      content={<MoneyTooltip labelFormatter={(l) => bucketLabel(m, fmt, trend.find((t) => t.label === l)?.key ?? l, g, true)} />}
                      cursor={{ fill: "var(--surface-2)" }}
                    />
                    <Bar dataKey="net" name={a.netFlow} radius={[4, 4, 0, 0]} maxBarSize={32}>
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
                    <YAxis {...axisProps} tickFormatter={fmt.compactMoney} width={52} />
                    <Tooltip
                      content={<MoneyTooltip labelFormatter={(l) => bucketLabel(m, fmt, trend.find((t) => t.label === l)?.key ?? l, g, true)} />}
                      cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
                    />
                    <Area
                      type="monotone"
                      dataKey={metric}
                      name={metric === "income" ? a.income : a.expenses}
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
            <ChartCard title={a.topCategories} subtitle={a.shareOfExpenses} className="lg:col-span-2">
              {donutData.length === 0 ? (
                <EmptyChart label={a.noExpenses} />
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
                          title={a.viewCategory(cat(c.name))}
                        >
                          <span className="w-4 text-faint tabular text-right">{fmt.digits(i + 1)}</span>
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i] }} />
                          <span className="flex-1 truncate text-fg group-hover:text-accent-fg">{cat(c.name)}</span>
                          <span className="tabular text-faint w-10 text-right">{pctText(fmt, share(c.amount, current.expense))}</span>
                          <span className="tabular font-medium text-fg w-24 text-right">{fmt.money(c.amount)}</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </ChartCard>

            <ChartCard title={a.categoryComparison} subtitle={a.vsLabel(period.label, period.prevLabel)} className="lg:col-span-3">
              {categories.length === 0 ? (
                <EmptyChart label={a.noExpensesEither} />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(220, categories.length * 44)}>
                  <BarChart
                    data={categories.map((c) => ({ name: cat(c.name), Current: c.amount, Previous: c.prevAmount }))}
                    layout="vertical"
                    margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
                    barGap={2}
                  >
                    <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="3 3" />
                    <XAxis type="number" {...axisProps} tickFormatter={fmt.compactMoney} />
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
                <h2 className="section-title">{a.categorySummary}</h2>
                <p className="section-subtitle">{a.categorySummaryHint}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{a.colCategory}</th>
                      <th className="text-right!">{a.colAmount}</th>
                      <th className="text-right!">{a.colShare}</th>
                      <th className="text-right! hidden sm:table-cell">{a.colTransactions}</th>
                      <th className="text-right! hidden md:table-cell">{a.previous}</th>
                      <th className="text-right!">{a.change}</th>
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
                              <span className="font-medium">{cat(c.name)}</span>
                            </span>
                          </td>
                          <td className="text-right tabular font-semibold">{fmt.money(c.amount)}</td>
                          <td className="text-right tabular text-muted">{pctText(fmt, share(c.amount, current.expense))}</td>
                          <td className="text-right tabular text-muted hidden sm:table-cell">{fmt.number(c.count)}</td>
                          <td className="text-right tabular text-muted hidden md:table-cell">{fmt.money(c.prevAmount)}</td>
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
            <h2 className="section-title">{a.spendingStats}</h2>
            <p className="section-subtitle">{a.spendingStatsHint}</p>
          </div>
        </div>
        <div className="p-4 md:p-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile label={a.avgDaily} value={fmt.money(stats.avgDaily)} hint={a.overDays(days)} />
          <StatTile label={a.avgWeekly} value={stats.avgWeekly !== null ? fmt.money(stats.avgWeekly) : "—"} hint={stats.avgWeekly === null ? a.needs7 : undefined} />
          <StatTile label={a.avgMonthly} value={stats.avgMonthly !== null ? fmt.money(stats.avgMonthly) : "—"} hint={stats.avgMonthly === null ? a.needs28 : undefined} />
          <StatTile label={a.expenseTransactions} value={fmt.number(stats.expenseCount)} hint={a.avgEach(fmt.money(stats.avgTransaction))} />
          <StatTile
            label={a.highestDay}
            value={stats.highestDay ? fmt.money(stats.highestDay.amount) : "—"}
            hint={stats.highestDay ? formatYmd(stats.highestDay.day, { weekday: "short", month: "short", day: "numeric" }, fmt.locale) : a.noExpensesShort}
          />
          <StatTile
            label={a.lowestDay}
            value={stats.lowestDay ? fmt.money(stats.lowestDay.amount) : "—"}
            hint={stats.lowestDay ? formatYmd(stats.lowestDay.day, { weekday: "short", month: "short", day: "numeric" }, fmt.locale) : a.needs2Days}
          />
          <StatTile
            label={a.highestSingle}
            value={stats.highestExpense ? fmt.money(stats.highestExpense.amount) : "—"}
            hint={stats.highestExpense ? `${stats.highestExpense.title} · ${formatYmd(stats.highestExpense.day, undefined, fmt.locale)}` : a.noExpensesShort}
          />
          <StatTile label={a.avgTransaction} value={fmt.money(stats.avgTransaction)} hint={a.perExpense} />
        </div>
      </section>

      {/* Lend & borrow analytics */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 ${dim}`}>
        {(
          [
            {
              key: "lending",
              title: a.lending,
              subtitle: a.lendingHint,
              icon: ArrowUpRight,
              tile: "bg-success-soft text-success",
              href: "/lend-borrow?type=LENT",
              rows: [
                { label: a.lentInPeriod, value: `${fmt.money(money.lentInPeriod)} · ${a.records(money.lentCountInPeriod)}` },
                { label: a.repaidInPeriod, value: fmt.money(money.repaidInPeriod) },
                { label: a.currentReceivable, value: fmt.money(money.receivable), strong: true, tone: "text-success" },
                { label: a.activeRecords, value: fmt.number(money.activeLending) },
                { label: a.overdueRecords, value: fmt.number(money.overdueLending), tone: money.overdueLending ? "text-danger" : undefined },
              ],
            },
            {
              key: "borrowing",
              title: a.borrowing,
              subtitle: a.borrowingHint,
              icon: ArrowDownRight,
              tile: "bg-warning-soft text-warning",
              href: "/lend-borrow?type=BORROWED",
              rows: [
                { label: a.borrowedInPeriod, value: `${fmt.money(money.borrowedInPeriod)} · ${a.records(money.borrowedCountInPeriod)}` },
                { label: a.paidInPeriod, value: fmt.money(money.paidInPeriod) },
                { label: a.currentPayable, value: fmt.money(money.payable), strong: true, tone: "text-warning" },
                { label: a.activeRecords, value: fmt.number(money.activeBorrowing) },
                { label: a.overdueRecords, value: fmt.number(money.overdueBorrowing), tone: money.overdueBorrowing ? "text-danger" : undefined },
              ],
            },
          ] as const
        ).map((s) => {
          const Icon = s.icon;
          return (
            <section key={s.key} className="card overflow-hidden">
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
                  {m.view}
                </Link>
              </div>
              <dl className="px-5 py-1 divide-y divide-line">
                {s.rows.map((r) => (
                  <MoneyRow key={r.label} label={r.label} value={r.value} strong={"strong" in r && r.strong} tone={"tone" in r ? r.tone : undefined} />
                ))}
              </dl>
              <p className="px-5 py-3 text-xs text-faint border-t border-line">
                {s.key === "lending" ? a.notExpense : a.notIncome}
              </p>
            </section>
          );
        })}
      </div>

      {noActivity && money.recordCount === 0 && (
        <div className="card p-6 text-center">
          <Receipt className="h-6 w-6 text-faint mx-auto mb-2" />
          <p className="text-sm font-medium text-fg">{a.noData}</p>
          <p className="text-[13px] text-muted mt-1">
            {a.noDataHint}
          </p>
          <Link href="/dashboard" className="btn btn-secondary btn-sm mt-3">
            <Trophy />
            {a.goDashboard}
          </Link>
        </div>
      )}
    </>
  );
}
