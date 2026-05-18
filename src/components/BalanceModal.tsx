"use client";

import React, { useState, useTransition, useEffect } from "react";
import { X, DollarSign, Loader2, FileText } from "lucide-react";
import { setOrUpdateBalance } from "@/actions/balance";
import { useToast } from "./Toast";
import { useConfirm, confirmPresets } from "./ConfirmModal";

interface BalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance?: number;
  currentNote?: string;
}

export default function BalanceModal({
  isOpen,
  onClose,
  currentBalance = 0,
  currentNote = "",
}: BalanceModalProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();
  const [balanceInput, setBalanceInput] = useState(currentBalance.toString());
  const [noteInput, setNoteInput] = useState(currentNote);

  useEffect(() => {
    if (isOpen) {
      setBalanceInput(currentBalance.toString());
      setNoteInput(currentNote);
    }
  }, [isOpen, currentBalance, currentNote]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(balanceInput);

    if (isNaN(parsed) || parsed < 0) {
      showToast("Please enter a valid positive number.", "error");
      return;
    }

    if (!noteInput.trim()) {
      showToast("Please add a note describing this balance.", "error");
      return;
    }

    const ok = await confirm(confirmPresets.setBalance());
    if (!ok) return;

    startTransition(async () => {
      const res = await setOrUpdateBalance(parsed, noteInput.trim());
      if (res.success) {
        showToast("Initial balance updated successfully.", "success");
        onClose();
      } else {
        showToast(res.error || "Failed to update balance.", "error");
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
      <div className="relative w-full max-w-md rounded-2xl glass-panel-glow border border-violet-500/20 p-6 z-10 animate-scale-up text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-lg text-slate-100">
              Configure Balance
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Define your starting wallet amount
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
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Starting Budget
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
              <input
                type="number"
                step="0.01"
                required
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-lg font-bold"
                disabled={isPending}
              />
            </div>
            <p className="text-[10px] text-slate-500 px-1 mt-1">
              * Changing initial balance automatically adjusts remaining balance
              by subtracting logged expenses.
            </p>
          </div>

          {/* Note Field (Mandatory) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Balance Note <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <textarea
                required
                maxLength={200}
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                placeholder="e.g. Monthly salary, Freelance payment, Savings deposit..."
                className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm h-20 resize-none"
                disabled={isPending}
              />
            </div>
            <p className="text-[10px] text-slate-500 px-1">
              Describe the source or type of this balance entry.
            </p>
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
                "Save Changes"
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
