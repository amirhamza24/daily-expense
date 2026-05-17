'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { X, Heading, DollarSign, Calendar, FileText, Loader2, Tag } from 'lucide-react';
import { createExpense, updateExpense } from '@/actions/expenses';
import { useToast } from './Toast';
import { useConfirm, confirmPresets } from './ConfirmModal';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense?: {
    id: string;
    title: string;
    amount: number;
    category: string;
    note?: string | null;
    expenseDate: Date | string;
  };
}

const CATEGORIES = [
  'Food',
  'Transport',
  'Shopping',
  'Bills',
  'Medicine',
  'Education',
  'Entertainment',
  'Others',
];

export default function ExpenseModal({
  isOpen,
  onClose,
  expense,
}: ExpenseModalProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  // Form states
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [expenseDate, setExpenseDate] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setTitle(expense.title);
        setAmount(expense.amount.toString());
        setCategory(expense.category);
        setNote(expense.note || '');
        
        // Format Date to YYYY-MM-DD
        const dateObj = new Date(expense.expenseDate);
        const yyyy = dateObj.getFullYear();
        const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
        const dd = String(dateObj.getDate()).padStart(2, '0');
        setExpenseDate(`${yyyy}-${mm}-${dd}`);
      } else {
        // Reset fields
        setTitle('');
        setAmount('');
        setCategory('Food');
        setNote('');
        
        // Default today's date in local YYYY-MM-DD format
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setExpenseDate(`${yyyy}-${mm}-${dd}`);
      }
    }
  }, [isOpen, expense]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Amount must be a positive number greater than zero.', 'error');
      return;
    }

    if (!title.trim()) {
      showToast('Title is required.', 'error');
      return;
    }

    const preset = expense?.id
      ? confirmPresets.updateExpense()
      : confirmPresets.addExpense();
    const ok = await confirm(preset);
    if (!ok) return;

    const payload = {
      title: title.trim(),
      amount: parsedAmount,
      category,
      note: note.trim() || undefined,
      expenseDate: new Date(expenseDate).toISOString(),
    };

    startTransition(async () => {
      let res;
      if (expense?.id) {
        res = await updateExpense(expense.id, payload);
      } else {
        res = await createExpense(payload);
      }

      if (res.success) {
        showToast(
          expense?.id ? 'Expense details updated.' : 'Expense logged successfully.',
          'success'
        );
        onClose();
      } else {
        showToast(res.error || 'Failed to complete action.', 'error');
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl glass-panel-glow border border-violet-500/20 p-6 z-10 animate-scale-up text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg text-slate-100">
              {expense?.id ? 'Edit Expense Record' : 'Record New Expense'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {expense?.id ? 'Update registered transaction parameters' : 'Create a new expense entry item'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Title field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Expense Title
            </label>
            <div className="relative">
              <Heading className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                required
                maxLength={80}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Weekly Groceries, Gas Refill"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Amount field */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                Amount spent ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
                  disabled={isPending}
                />
              </div>
            </div>

            {/* Category dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                Category
              </label>
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm appearance-none cursor-pointer"
                  disabled={isPending}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-slate-900 text-white">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Transaction Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="date"
                required
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm cursor-pointer"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Note field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Add Note (Optional)
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                placeholder="Details or specific notes on this purchase..."
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm h-24 resize-none"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/5 transition-colors cursor-pointer"
              disabled={isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-sm font-semibold text-white shadow-lg shadow-violet-950/20 hover:shadow-violet-900/45 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Transaction'
              )}
            </button>
          </div>
        </form>
      </div>

      <style jsx global>{`
        @keyframes scale-up {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-scale-up {
          animation: scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}
