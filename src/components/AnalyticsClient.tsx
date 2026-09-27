"use client";

import React, { useState, useEffect } from "react";
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
} from "recharts";
import { TrendingUp, TrendingDown, CircleDollarSign, Tag } from "lucide-react";
import PageHeader from "./PageHeader";
import { formatMoney } from "@/lib/format";

interface AnalyticsClientProps {
  categoryDistribution: Array<{ name: string; value: number }>;
  monthlyTrend: Array<{ name: string; spent: number }>;
  weeklyPattern: Array<{ name: string; spent: number }>;
  aggregates: {
    highest: { title: string; amount: number } | null;
    lowest: { title: string; amount: number } | null;
    average: number;
    topCategory: string;
  };
}

const COLORS = [
  "#6366f1", // indigo
  "#0ea5e9", // sky
  "#14b8a6", // teal
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#a855f7", // purple
  "#22c55e", // green
  "#94a3b8", // slate
];

const axisProps = {
  stroke: "var(--border)",
  tick: { fill: "var(--text-3)", fontSize: 12 },
  tickLine: false,
  axisLine: false,
} as const;

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: Array<{
    name: string;
    value: number;
    payload?: { name?: string };
  }>;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="card shadow-(--shadow-md) px-3 py-2 text-xs">
        <p className="text-muted mb-0.5">{label ?? payload[0].payload?.name ?? payload[0].name}</p>
        <p className="text-sm font-semibold tabular text-fg">{formatMoney(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

function ChartCard({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`card p-5 flex flex-col ${className}`}>
      <div className="mb-5">
        <h2 className="section-title">{title}</h2>
        <p className="section-subtitle">{subtitle}</p>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-60 flex items-center justify-center rounded-lg border border-dashed border-line text-[13px] text-faint">
      {label}
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="card card-interactive p-4 min-w-0">
      <div className="flex items-center justify-between">
        <span className="stat-label">{label}</span>
        <Icon className="h-4 w-4 text-faint" />
      </div>
      <p className="stat-value mt-2 truncate">{value}</p>
      {hint && (
        <p className="text-xs text-faint mt-1 truncate" title={hint}>
          {hint}
        </p>
      )}
    </div>
  );
}

export default function AnalyticsClient({
  categoryDistribution,
  monthlyTrend,
  weeklyPattern,
  aggregates,
}: AnalyticsClientProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Prevent server hydration mismatches by mounting on client first
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const header = (
    <PageHeader
      title="Analytics"
      description="Where your money goes, month by month."
    />
  );

  if (!isMounted) {
    return (
      <>
        {header}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24.5" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="skeleton h-80 lg:col-span-3" />
          <div className="skeleton h-80 lg:col-span-2" />
        </div>
      </>
    );
  }

  const categoryTotal = categoryDistribution.reduce((sum, c) => sum + c.value, 0);

  return (
    <>
      {header}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatTile
          label="Average transaction"
          value={formatMoney(aggregates.average)}
          icon={CircleDollarSign}
        />
        <StatTile
          label="Top category"
          value={aggregates.topCategory || "—"}
          icon={Tag}
        />
        <StatTile
          label="Largest"
          value={aggregates.highest ? formatMoney(aggregates.highest.amount) : "—"}
          hint={aggregates.highest?.title ?? "No records yet"}
          icon={TrendingUp}
        />
        <StatTile
          label="Smallest"
          value={aggregates.lowest ? formatMoney(aggregates.lowest.amount) : "—"}
          hint={aggregates.lowest?.title ?? "No records yet"}
          icon={TrendingDown}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <ChartCard
          title="Monthly spending"
          subtitle="Last six months"
          className="lg:col-span-3"
        >
          {monthlyTrend.length === 0 ? (
            <EmptyChart label="No monthly data yet" />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthlyTrend} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="name" {...axisProps} />
                <YAxis {...axisProps} tickFormatter={(v) => `$${v}`} width={56} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface-2)" }} />
                <Bar
                  dataKey="spent"
                  fill="var(--accent)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={40}
                  animationDuration={700}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="By category"
          subtitle="Share of total spending"
          className="lg:col-span-2"
        >
          {categoryDistribution.length === 0 ? (
            <EmptyChart label="No category data yet" />
          ) : (
            <div className="flex flex-col gap-4">
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={categoryDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="var(--surface)"
                    strokeWidth={2}
                    animationDuration={700}
                  >
                    {categoryDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <ul className="flex flex-col gap-2.5">
                {categoryDistribution.map((entry, index) => {
                  const pct = categoryTotal > 0 ? (entry.value / categoryTotal) * 100 : 0;
                  return (
                    <li key={entry.name} className="flex items-center gap-2.5 text-[13px]">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="flex-1 truncate text-muted" title={entry.name}>
                        {entry.name}
                      </span>
                      <span className="tabular text-faint w-10 text-right">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="tabular font-medium text-fg w-20 text-right">
                        {formatMoney(entry.value)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Last 7 days" subtitle="Daily spending this week">
        {weeklyPattern.length === 0 ? (
          <EmptyChart label="No weekly data yet" />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={weeklyPattern} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="weeklyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} tickFormatter={(v) => `$${v}`} width={56} />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: "var(--border-strong)", strokeDasharray: "3 3" }}
              />
              <Area
                type="monotone"
                dataKey="spent"
                stroke="var(--accent)"
                strokeWidth={2}
                fill="url(#weeklyFill)"
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                animationDuration={800}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </>
  );
}
