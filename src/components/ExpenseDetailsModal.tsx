'use client';

import React from 'react';
import Modal from './Modal';
import { getCategoryIcon, getCategoryGlow } from '@/lib/categories';
import { formatDate, formatMoney } from '@/lib/format';
import SplitBreakdown, { type ExpenseSplitView } from './SplitBreakdown';

interface ExpenseDetailsModalProps {
  expense?: {
    title: string;
    amount: number;
    category: string;
    note: string | null;
    expenseDate: Date | string;
    splits?: ExpenseSplitView[];
  };
  onClose: () => void;
}

export default function ExpenseDetailsModal({ expense, onClose }: ExpenseDetailsModalProps) {
  if (!expense) return null;

  const isCredit = expense.category === 'Income';

  return (
    <Modal
      open
      onClose={onClose}
      icon={React.createElement(getCategoryIcon(expense.category), { className: 'h-5 w-5' })}
      title={expense.title}
      footer={
        <button onClick={onClose} className="btn btn-secondary">
          Close
        </button>
      }
    >
      <div className="flex items-center justify-between pb-4 border-b border-line">
        <span className={`badge ${getCategoryGlow(expense.category)}`}>
          {React.createElement(getCategoryIcon(expense.category), { className: 'h-3 w-3' })}
          {expense.category}
        </span>
        <span
          className={`text-xl font-semibold tabular tracking-tight ${
            isCredit ? 'text-success' : 'text-fg'
          }`}
        >
          {isCredit ? '+' : '−'}
          {formatMoney(expense.amount)}
        </span>
      </div>

      <dl className="text-[13px] divide-y divide-line">
        <div className="flex justify-between py-3">
          <dt className="text-muted">Date</dt>
          <dd className="font-medium text-fg">
            {formatDate(expense.expenseDate, {
              weekday: 'short',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </dd>
        </div>
        <div className="flex justify-between py-3">
          <dt className="text-muted">Type</dt>
          <dd className="font-medium text-fg">{isCredit ? 'Credit' : 'Debit'}</dd>
        </div>
        {!!expense.splits?.length && (
          <div className="py-3">
            <dt className="text-muted mb-1">
              Breakdown · {expense.splits.length} items
            </dt>
            <dd className="-ml-4">
              <SplitBreakdown splits={expense.splits} total={expense.amount} />
            </dd>
          </div>
        )}
        <div className="pt-3">
          <dt className="text-muted mb-1.5">Note</dt>
          <dd
            className={`rounded-lg bg-subtle px-3 py-2.5 leading-relaxed whitespace-pre-wrap ${
              expense.note ? 'text-fg' : 'text-faint'
            }`}
          >
            {expense.note || 'No note added.'}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}
