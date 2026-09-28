"use client";

import React, { useState, useTransition } from "react";
import { Banknote, Calendar, DollarSign, Loader2 } from "lucide-react";
import DatePicker from "react-datepicker";
import Modal from "./Modal";
import { useToast } from "./Toast";
import { MoneyStatusBadge, SettledBar } from "./MoneyBadges";
import { recordMoneyPayment } from "@/actions/money";
import { formatMoney } from "@/lib/format";
import { moneyTerms, remainingOf, round2, settlementStatus, type MoneyRecordView } from "@/lib/money";

interface MoneyPaymentModalProps {
  record?: MoneyRecordView;
  onClose: () => void;
}

export default function MoneyPaymentModal({ record, onClose }: MoneyPaymentModalProps) {
  if (!record) return null;
  // Remount per record so the form always starts empty
  return <PaymentForm key={record.id} record={record} onClose={onClose} />;
}

function PaymentForm({ record, onClose }: { record: MoneyRecordView; onClose: () => void }) {
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(() => new Date());
  const [note, setNote] = useState("");

  const terms = moneyTerms[record.type];
  const isLent = record.type === "LENT";
  const remaining = remainingOf(record);
  const parsed = round2(parseFloat(amount) || 0);
  const tooMuch = parsed > remaining;
  const remainingAfter = Math.max(0, round2(remaining - parsed));
  const statusAfter = settlementStatus(record.amount, round2(record.paidAmount + parsed));
  const recordDate = new Date(record.date);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isNaN(parsed) || parsed <= 0) {
      showToast("Amount must be a positive number greater than zero.", "error");
      return;
    }
    if (tooMuch) {
      showToast(`${terms.payment} can't be more than the remaining ${formatMoney(remaining)}.`, "error");
      return;
    }

    startTransition(async () => {
      const res = await recordMoneyPayment(record.id, {
        amount: parsed,
        paymentDate: paymentDate.toISOString(),
        note: note.trim() || undefined,
      });
      if (res.success) {
        showToast(
          remainingAfter === 0
            ? `${terms.payment} recorded — ${record.personName}'s record is fully paid.`
            : `${terms.payment} of ${formatMoney(parsed)} recorded.`,
          "success",
        );
        onClose();
      } else {
        showToast(res.error || `Failed to record ${terms.payment.toLowerCase()}.`, "error");
      }
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      locked={isPending}
      icon={<Banknote className="h-5 w-5" />}
      title={terms.recordPayment}
      description={
        isLent
          ? `Money ${record.personName} returned to you.`
          : `Money you paid back to ${record.personName}.`
      }
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isPending}>
            Cancel
          </button>
          <button
            type="submit"
            form="money-payment-form"
            disabled={isPending || tooMuch || parsed <= 0}
            className={`btn ${isLent ? "btn-success" : "btn-primary"} min-w-32`}
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : (
              terms.recordPayment
            )}
          </button>
        </>
      }
    >
      <form id="money-payment-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Where the record stands now */}
        <div className="rounded-lg border border-line bg-subtle/50 p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-faint">{terms.label}</p>
              <p className="text-sm font-semibold tabular text-fg">{formatMoney(record.amount)}</p>
            </div>
            <div>
              <p className="text-xs text-faint">{terms.settled}</p>
              <p className="text-sm font-semibold tabular text-fg">{formatMoney(record.paidAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-faint">Remaining</p>
              <p className={`text-sm font-semibold tabular ${isLent ? "text-success" : "text-warning"}`}>
                {formatMoney(remaining)}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <SettledBar amount={record.amount} paidAmount={record.paidAmount} type={record.type} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label mb-0!" htmlFor="payment-amount">
              {terms.payment} amount
            </label>
            <button
              type="button"
              onClick={() => setAmount(remaining.toFixed(2))}
              className="text-xs font-medium text-accent-fg hover:underline underline-offset-2 cursor-pointer"
              disabled={isPending}
            >
              Full remaining ({formatMoney(remaining)})
            </button>
          </div>
          <div className="relative">
            <DollarSign className="input-icon" />
            <input
              id="payment-amount"
              type="number"
              step="0.01"
              min="0.01"
              max={remaining}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className={`input pl-9 tabular ${tooMuch ? "border-danger!" : ""}`}
              aria-invalid={tooMuch}
              disabled={isPending}
              autoFocus
            />
          </div>
          {tooMuch ? (
            <p className="text-xs text-danger mt-1.5">
              Can&apos;t be more than the remaining {formatMoney(remaining)}.
            </p>
          ) : parsed > 0 ? (
            <p className="text-xs text-muted mt-1.5 flex flex-wrap items-center gap-1.5">
              Remaining after this:{" "}
              <span className="tabular font-medium text-fg">{formatMoney(remainingAfter)}</span>
              <MoneyStatusBadge status={statusAfter} />
            </p>
          ) : null}
        </div>

        <div>
          <label className="label">{terms.payment} date</label>
          <div className="relative">
            <Calendar className="input-icon" />
            <DatePicker
              selected={paymentDate}
              onChange={(d: Date | null) => setPaymentDate(d || new Date())}
              minDate={recordDate}
              dateFormat="MMM d, yyyy"
              fixedHeight
              portalId="root-portal"
              popperPlacement="bottom-start"
              className="input pl-9 cursor-pointer"
              disabled={isPending}
              wrapperClassName="w-full"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="payment-note">
            Note <span className="text-faint font-normal">(optional)</span>
          </label>
          <input
            id="payment-note"
            type="text"
            maxLength={300}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={isLent ? "e.g. Paid in cash" : "e.g. Bank transfer"}
            className="input"
            disabled={isPending}
          />
        </div>

        <p className="text-xs text-faint">
          {isLent
            ? "Adds to your available balance and reduces your receivable."
            : "Deducted from your available balance and reduces your payable."}
        </p>
      </form>
    </Modal>
  );
}
