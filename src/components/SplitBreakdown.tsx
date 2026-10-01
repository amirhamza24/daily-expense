'use client';

import React from 'react';
import { useI18n } from './I18nProvider';

export interface ExpenseSplitView {
  id?: string;
  title: string;
  amount: number;
  /** Day the item was spent; null on legacy rows. */
  date?: Date | string | null;
}

/** Animates height open/closed without measuring (CSS grid 0fr → 1fr). */
export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className="collapse-grid" data-open={open} aria-hidden={!open}>
      <div>{children}</div>
    </div>
  );
}

/**
 * Tree-style list of the items a single debit was split into, each with its
 * date and what was left of the total after it.
 */
export default function SplitBreakdown({
  splits,
  total,
}: {
  splits: ExpenseSplitView[];
  total: number;
}) {
  const { m, fmt } = useI18n();
  const allocated = splits.reduce((sum, s) => sum + s.amount, 0);
  const unassigned = Math.round((total - allocated) * 100) / 100;

  // What was left of the total after each item
  const lefts = splits.reduce<number[]>((acc, s) => {
    acc.push(Math.round(((acc.at(-1) ?? total) - s.amount) * 100) / 100);
    return acc;
  }, []);

  return (
    <ul className="relative ml-4 pl-5 border-l border-line flex flex-col">
      {splits.map((s, i) => {
        const left = lefts[i];
        return (
          <li
            key={s.id ?? i}
            className="relative flex items-center justify-between gap-4 py-1.5 text-[13px] before:absolute before:-left-5 before:top-1/2 before:w-3.5 before:border-t before:border-line"
          >
            <span className="min-w-0">
              <span className="block text-muted truncate">{s.title}</span>
              {s.date && (
                <span className="block text-[11.5px] text-faint">
                  {fmt.date(s.date, { weekday: "short", month: "short", day: "numeric" })}
                </span>
              )}
            </span>
            <span className="shrink-0 text-right">
              <span className="block tabular font-medium text-fg">{fmt.money(s.amount)}</span>
              <span className="block text-[11.5px] tabular text-faint">
                {m.details.left(fmt.money(Math.max(left, 0)))}
              </span>
            </span>
          </li>
        );
      })}
      {unassigned > 0 && (
        <li className="relative flex items-center justify-between gap-4 py-1.5 text-[13px] before:absolute before:-left-5 before:top-1/2 before:w-3.5 before:border-t before:border-dashed before:border-line">
          <span className="text-faint italic">{m.details.unassigned}</span>
          <span className="tabular text-faint shrink-0">{fmt.money(unassigned)}</span>
        </li>
      )}
    </ul>
  );
}
