"use client";

import React, { useSyncExternalStore } from "react";
import { useI18n } from "./I18nProvider";

/** Shared chart styling for Analytics and Reports (Recharts). */

export const CHART_COLORS = [
  "#166534", // deep green (brand)
  "#22c55e", // green
  "#0d9488", // teal
  "#f59e0b", // amber
  "#f43f5e", // rose
  "#8b5cf6", // violet
  "#0ea5e9", // sky
  "#94a3b8", // slate
];

export const SERIES = {
  income: "#10b981",
  expense: "#f43f5e",
  net: "var(--accent)",
  previous: "var(--border-strong)",
};

export const axisProps = {
  stroke: "var(--border)",
  tick: { fill: "var(--text-3)", fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

// Axis ticks: use `useI18n().fmt.compactMoney` ("৳1.2k" / "৳১.২k").

/** Recharts renders nothing useful on the server; mount charts on the client only. */
export function useMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

interface TooltipProps {
  active?: boolean;
  label?: string | number;
  labelFormatter?: (label: string) => string;
  payload?: Array<{ name?: string; value?: number; color?: string; payload?: Record<string, unknown> }>;
}

export function MoneyTooltip({ active, payload, label, labelFormatter }: TooltipProps) {
  const { fmt } = useI18n();
  if (!active || !payload?.length) return null;
  const title = String(label ?? payload[0].payload?.name ?? payload[0].name ?? "");
  return (
    <div className="card shadow-(--shadow-md) px-3 py-2 text-xs min-w-32">
      {title && <p className="text-muted mb-1">{labelFormatter ? labelFormatter(title) : title}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center justify-between gap-3">
          {payload.length > 1 && (
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.name}
            </span>
          )}
          <span className="text-sm font-semibold tabular text-fg">
            {(p.value ?? 0) < 0 && "−"}
            {fmt.money(p.value ?? 0)}
          </span>
        </p>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  action,
  className = "",
  bodyClassName = "p-5",
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`card overflow-hidden flex flex-col min-w-0 ${className}`}>
      <div className="card-head px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className={`flex-1 min-h-0 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export function EmptyChart({ label, height = "h-60" }: { label: string; height?: string }) {
  return (
    <div className={`${height} flex items-center justify-center rounded-lg border border-dashed border-line text-[13px] text-faint text-center px-4`}>
      {label}
    </div>
  );
}

/** "+12.4%" / "−3%" / "—" (no meaningful base) with direction color. */
export function ChangeBadge({
  value,
  invert = false,
  className = "",
}: {
  value: number | null;
  /** When true, an increase is bad (e.g. expenses). */
  invert?: boolean;
  className?: string;
}) {
  const { m, fmt } = useI18n();
  if (value === null || !Number.isFinite(value)) {
    return (
      <span className={`badge ${className}`} title={m.charts.noPrevData}>
        {m.charts.new}
      </span>
    );
  }
  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  if (rounded === 0) return <span className={`badge ${className}`}>{fmt.digits("0%")}</span>;
  const up = rounded > 0;
  const good = invert ? !up : up;
  return (
    <span className={`badge ${good ? "badge-success" : "badge-danger"} tabular ${className}`}>
      {up ? "▲" : "▼"} {fmt.digits(`${Math.abs(rounded)}%`)}
    </span>
  );
}
