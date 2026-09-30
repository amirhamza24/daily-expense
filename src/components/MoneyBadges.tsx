'use client';

import React from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { moneyTypeTint, statusBadge, type MoneyDisplayStatus, type MoneyType } from '@/lib/money';
import { useI18n } from './I18nProvider';

/** Arrow out (lent) / arrow in (borrowed) in a tinted tile. */
export function MoneyTypeIcon({ type, className = 'h-8 w-8' }: { type: MoneyType; className?: string }) {
  const Icon = type === 'LENT' ? ArrowUpRight : ArrowDownLeft;
  return (
    <span className={`shrink-0 rounded-lg flex items-center justify-center ${moneyTypeTint[type]} ${className}`}>
      <Icon className="h-4 w-4" />
    </span>
  );
}

/** "Lent →" / "Borrowed ←" pill. */
export function MoneyTypeBadge({ type }: { type: MoneyType }) {
  const terms = useI18n().m.moneyTerms[type];
  return (
    <span className={`badge ${moneyTypeTint[type]}`}>
      {terms.label} <span aria-hidden>{terms.arrow}</span>
    </span>
  );
}

export function MoneyStatusBadge({ status }: { status: MoneyDisplayStatus }) {
  const { m } = useI18n();
  return <span className={`badge badge-dot ${statusBadge[status]}`}>{m.moneyStatus[status]}</span>;
}

/** Thin bar showing how much of the original amount is settled. */
export function SettledBar({ amount, paidAmount, type }: { amount: number; paidAmount: number; type: MoneyType }) {
  const { m } = useI18n();
  const pct = amount > 0 ? Math.min(100, (paidAmount / amount) * 100) : 0;
  return (
    <div
      className="h-1.5 w-full rounded-full bg-muted-bg overflow-hidden"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={m.moneyTerms[type].settledBar(Math.round(pct))}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-700 ease-out ${
          type === 'LENT' ? 'bg-success' : 'bg-warning'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
