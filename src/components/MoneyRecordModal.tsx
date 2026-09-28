"use client";

import React, { useState, useTransition } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  CalendarClock,
  DollarSign,
  Info,
  Loader2,
  Pencil,
  Plus,
  User,
  X,
} from "lucide-react";
import DatePicker from "react-datepicker";
import Modal from "./Modal";
import { ComboInput } from "./Select";
import SegmentIndicator from "./SegmentIndicator";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmModal";
import { createMoneyRecord, updateMoneyRecord } from "@/actions/money";
import { formatMoney } from "@/lib/format";
import { moneyTerms, type MoneyRecordView, type MoneyType } from "@/lib/money";

interface MoneyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Editing when set; creating otherwise. */
  record?: MoneyRecordView;
  defaultType?: MoneyType;
  /** Previously used names, offered as suggestions. */
  people?: string[];
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export default function MoneyRecordModal(props: MoneyRecordModalProps) {
  if (!props.isOpen) return null;
  // Mounted fresh on every open, so fields start from the record (or blank)
  return <RecordForm key={props.record?.id ?? "new"} {...props} />;
}

function RecordForm({
  isOpen,
  onClose,
  record,
  defaultType = "LENT",
  people = [],
}: MoneyRecordModalProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [type, setType] = useState<MoneyType>(record?.type ?? defaultType);
  const [personName, setPersonName] = useState(record?.personName ?? "");
  const [amount, setAmount] = useState(record ? record.amount.toString() : "");
  const [date, setDate] = useState<Date>(() => (record ? new Date(record.date) : new Date()));
  const [dueDate, setDueDate] = useState<Date | null>(() =>
    record?.dueDate ? new Date(record.dueDate) : null,
  );
  const [note, setNote] = useState(record?.note ?? "");

  const isEdit = !!record;
  const isLent = type === "LENT";
  const terms = moneyTerms[type];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = personName.trim();
    const parsedAmount = Math.round(parseFloat(amount) * 100) / 100;

    if (!name) {
      showToast("Person name is required.", "error");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast("Amount must be a positive number greater than zero.", "error");
      return;
    }
    if (record && parsedAmount < record.paidAmount) {
      showToast(
        `Amount can't be less than the ${formatMoney(record.paidAmount)} already ${terms.settled.toLowerCase()}.`,
        "error",
      );
      return;
    }
    if (dueDate && !sameDay(dueDate, date) && dueDate < date) {
      showToast("Due date can't be before the date of the record.", "error");
      return;
    }

    const ok = await confirm({
      title: isEdit ? "Update record" : isLent ? "Record money lent" : "Record money borrowed",
      message: isEdit
        ? "Your available balance will be adjusted for any change in the amount."
        : isLent
          ? `Lend ${formatMoney(parsedAmount)} to ${name}? It will be deducted from your available balance and tracked as receivable.`
          : `Borrow ${formatMoney(parsedAmount)} from ${name}? It will be added to your available balance and tracked as payable.`,
      confirmText: isEdit ? "Update" : "Confirm",
      variant: isEdit ? "default" : isLent ? "info" : "warning",
    });
    if (!ok) return;

    const payload = {
      type,
      personName: name,
      amount: parsedAmount,
      date: date.toISOString(),
      dueDate: dueDate ? dueDate.toISOString() : null,
      note: note.trim() || undefined,
    };

    startTransition(async () => {
      const res = record
        ? await updateMoneyRecord(record.id, payload)
        : await createMoneyRecord(payload);

      if (res.success) {
        showToast(
          isEdit
            ? "Record updated."
            : isLent
              ? `Lent ${formatMoney(parsedAmount)} to ${name}.`
              : `Borrowed ${formatMoney(parsedAmount)} from ${name}.`,
          "success",
        );
        onClose();
      } else {
        showToast(res.error || "Failed to save record.", "error");
      }
    });
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      locked={isPending}
      size="lg"
      icon={isEdit ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      title={isEdit ? `Edit ${terms.label.toLowerCase()} record` : "New lend / borrow record"}
      description={
        isLent ? "Money you gave to someone — they owe you." : "Money you received from someone — you owe them."
      }
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-secondary" disabled={isPending}>
            Cancel
          </button>
          <button type="submit" form="money-record-form" disabled={isPending} className="btn btn-primary min-w-32">
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save changes"
            ) : isLent ? (
              "Record lent"
            ) : (
              "Record borrowed"
            )}
          </button>
        </>
      }
    >
      <form id="money-record-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="segmented" role="radiogroup" aria-label="Type">
          <SegmentIndicator />
          <button
            type="button"
            role="radio"
            aria-checked={isLent}
            data-active={isLent}
            disabled={isEdit}
            onClick={() => setType("LENT")}
          >
            <ArrowUpRight className={isLent ? "text-success" : ""} />
            I lent money
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={!isLent}
            data-active={!isLent}
            disabled={isEdit}
            onClick={() => setType("BORROWED")}
          >
            <ArrowDownLeft className={!isLent ? "text-warning" : ""} />
            I borrowed money
          </button>
        </div>

        <div>
          <label className="label" htmlFor="money-person">
            {isLent ? "Lent to" : "Borrowed from"}
          </label>
          <ComboInput
            id="money-person"
            icon={User}
            required
            maxLength={80}
            value={personName}
            onChange={setPersonName}
            suggestions={people}
            placeholder="e.g. Rahim"
            disabled={isPending}
            autoFocus
          />
        </div>

        <div>
          <label className="label" htmlFor="money-amount">
            Amount
          </label>
          <div className="relative">
            <DollarSign className="input-icon" />
            <input
              id="money-amount"
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="input pl-9 tabular"
              disabled={isPending}
            />
          </div>
          {record && record.paidAmount > 0 && (
            <p className="text-xs text-faint mt-1.5">
              {formatMoney(record.paidAmount)} already {terms.settled.toLowerCase()} — the amount can&apos;t go below this.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">{terms.dateLabel}</label>
            <div className="relative">
              <Calendar className="input-icon" />
              <DatePicker
                selected={date}
                onChange={(d: Date | null) => setDate(d || new Date())}
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
            <label className="label">
              Due date <span className="text-faint font-normal">(optional)</span>
            </label>
            <div className="relative">
              <CalendarClock className="input-icon" />
              <DatePicker
                selected={dueDate}
                onChange={(d: Date | null) => setDueDate(d)}
                minDate={date}
                placeholderText="No due date"
                dateFormat="MMM d, yyyy"
                fixedHeight
                portalId="root-portal"
                popperPlacement="bottom-start"
                className="input pl-9 pr-8 cursor-pointer"
                disabled={isPending}
                wrapperClassName="w-full"
              />
              {dueDate && (
                <button
                  type="button"
                  onClick={() => setDueDate(null)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 icon-btn h-6 w-6"
                  aria-label="Clear due date"
                  disabled={isPending}
                >
                  <X className="h-3.5! w-3.5!" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="money-note">
            Note <span className="text-faint font-normal">(optional)</span>
          </label>
          <textarea
            id="money-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="e.g. For medical bills"
            className="input resize-none"
            disabled={isPending}
          />
        </div>

        {!isEdit && (
          <div className="alert bg-subtle text-muted">
            <Info />
            <span>
              {isLent
                ? "Deducted from your available balance and tracked as receivable. Not counted as an expense."
                : "Added to your available balance and tracked as payable. Not counted as income."}
            </span>
          </div>
        )}
      </form>
    </Modal>
  );
}
