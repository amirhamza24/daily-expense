import React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  HandCoins,
  Info,
  Lightbulb,
  Tag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import type { Insight, InsightIcon, InsightTone } from "@/lib/insights";

const ICONS: Record<InsightIcon, React.ComponentType<{ className?: string }>> = {
  "trend-up": TrendingUp,
  "trend-down": TrendingDown,
  alert: AlertTriangle,
  wallet: Wallet,
  tag: Tag,
  calendar: CalendarDays,
  hand: HandCoins,
  info: Info,
};

const TONES: Record<InsightTone, { tile: string; metric: string }> = {
  positive: { tile: "bg-success-soft text-success", metric: "text-success" },
  negative: { tile: "bg-danger-soft text-danger", metric: "text-danger" },
  warning: { tile: "bg-warning-soft text-warning", metric: "text-warning" },
  info: { tile: "bg-accent-soft text-accent-fg", metric: "text-muted" },
};

/** "Financial Insights" card; rule-based observations from src/lib/insights.ts. */
export default function InsightsCard({
  insights,
  subtitle = "Based on your recorded transactions",
  footer,
  className = "",
  columns = 1,
}: {
  insights: Insight[];
  subtitle?: string;
  footer?: React.ReactNode;
  className?: string;
  /** 2 lays insights out in two columns on large screens. */
  columns?: 1 | 2;
}) {
  return (
    <section className={`card overflow-hidden flex flex-col ${className}`}>
      <div className="card-head px-5 py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="icon-tile h-8 w-8 rounded-lg">
            <Lightbulb className="h-4 w-4" />
          </span>
          <div>
            <h2 className="section-title">Financial insights</h2>
            <p className="section-subtitle">{subtitle}</p>
          </div>
        </div>
        {footer}
      </div>

      {insights.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center px-6 py-10">
          <div className="h-10 w-10 rounded-full bg-subtle flex items-center justify-center mb-3">
            <Lightbulb className="h-5 w-5 text-faint" />
          </div>
          <p className="text-sm font-medium text-fg">No insights yet</p>
          <p className="text-[13px] text-muted mt-1 max-w-xs">
            Record a few transactions and insights about your spending will appear here.
          </p>
        </div>
      ) : (
        <ul
          className={`grid gap-px bg-line stagger-rows ${
            columns === 2 ? "lg:grid-cols-2 lg:[&>li:last-child:nth-child(odd)]:col-span-2" : ""
          }`}
        >
          {insights.map((ins) => {
            const Icon = ICONS[ins.icon];
            const tone = TONES[ins.tone];
            const body = (
              <>
                <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${tone.tile}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold text-fg leading-snug">{ins.title}</span>
                  <span className="block text-[13px] text-muted mt-0.5 leading-snug">{ins.message}</span>
                  {ins.metric && (
                    <span className={`block text-xs font-medium tabular mt-1 ${tone.metric}`}>{ins.metric}</span>
                  )}
                </span>
                {ins.href && (
                  <ArrowRight className="h-4 w-4 text-faint shrink-0 mt-1 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-accent-fg" />
                )}
              </>
            );
            return (
              <li key={ins.id} className="bg-surface">
                {ins.href ? (
                  <Link href={ins.href} className="group flex items-start gap-3 px-5 py-3.5 hover:bg-subtle/60 transition-colors">
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-5 py-3.5">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
