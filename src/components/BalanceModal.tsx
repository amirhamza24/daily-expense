"use client";

import React, { useState, useTransition, useEffect } from "react";
import { DollarSign, Loader2, Wallet } from "lucide-react";
import Modal from "./Modal";
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
    <Modal
      open={isOpen}
      onClose={onClose}
      locked={isPending}
      icon={<Wallet className="h-5 w-5" />}
      title="Starting balance"
      description="Set the amount your wallet starts with."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isPending}>
            Cancel
          </button>
          <button type="submit" form="balance-form" disabled={isPending} className="btn btn-primary">
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              "Save changes"
            )}
          </button>
        </>
      }
    >
      <form id="balance-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="balance-amount">
            Amount
          </label>
          <div className="relative">
            <DollarSign className="input-icon" />
            <input
              id="balance-amount"
              type="number"
              step="0.01"
              required
              value={balanceInput}
              onChange={(e) => setBalanceInput(e.target.value)}
              placeholder="0.00"
              className="input pl-9 tabular"
              disabled={isPending}
            />
          </div>
          <p className="text-xs text-faint mt-1.5">
            Your remaining balance is recalculated from logged expenses.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="balance-note">
            Note
          </label>
          <textarea
            id="balance-note"
            required
            maxLength={200}
            rows={3}
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            placeholder="e.g. Monthly salary, savings deposit…"
            className="input resize-none"
            disabled={isPending}
          />
        </div>
      </form>
    </Modal>
  );
}
