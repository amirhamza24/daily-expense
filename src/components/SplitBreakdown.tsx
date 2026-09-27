import React from 'react';
import { formatMoney } from '@/lib/format';

export interface ExpenseSplitView {
  id?: string;
  title: string;
  amount: number;
}

/** Animates height open/closed without measuring (CSS grid 0fr → 1fr). */
export function Collapse({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div className="collapse-grid" data-open={open} aria-hidden={!open}>
      <div>{children}</div>
    </div>
  );
}

/** Tree-style list of the reasons a single debit was split into. */
export default function SplitBreakdown({
  splits,
  total,
}: {
  splits: ExpenseSplitView[];
  total: number;
}) {
  const allocated = splits.reduce((sum, s) => sum + s.amount, 0);
  const unassigned = Math.round((total - allocated) * 100) / 100;

  return (
    <ul className="relative ml-4 pl-5 border-l border-line flex flex-col">
      {splits.map((s, i) => (
        <li
          key={s.id ?? i}
          className="relative flex items-center justify-between gap-4 py-1.5 text-[13px] before:absolute before:-left-5 before:top-1/2 before:w-3.5 before:border-t before:border-line"
        >
          <span className="text-muted truncate">{s.title}</span>
          <span className="tabular font-medium text-fg shrink-0">{formatMoney(s.amount)}</span>
        </li>
      ))}
      {unassigned > 0 && (
        <li className="relative flex items-center justify-between gap-4 py-1.5 text-[13px] before:absolute before:-left-5 before:top-1/2 before:w-3.5 before:border-t before:border-dashed before:border-line">
          <span className="text-faint italic">Unassigned</span>
          <span className="tabular text-faint shrink-0">{formatMoney(unassigned)}</span>
        </li>
      )}
    </ul>
  );
}
