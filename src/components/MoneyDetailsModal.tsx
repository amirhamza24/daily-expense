"use client";

import React, { useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, Pencil, Trash2 } from "lucide-react";
import Modal from "./Modal";
import { useToast } from "./Toast";
import { useConfirm } from "./ConfirmModal";
import { MoneyStatusBadge, MoneyTypeBadge, SettledBar } from "./MoneyBadges";
import { deleteMoneyPayment } from "@/actions/money";
import { fileDate } from "@/lib/format";
import { useI18n } from "./I18nProvider";
import { toFileSlug } from "@/lib/export-image";
import { remainingOf, type MoneyRecordView } from "@/lib/money";

interface MoneyDetailsModalProps {
  record?: MoneyRecordView;
  onClose: () => void;
  onEdit: (record: MoneyRecordView) => void;
  onRecordPayment: (record: MoneyRecordView) => void;
}

const longDate = { weekday: "short", year: "numeric", month: "long", day: "numeric" } as const;

export default function MoneyDetailsModal({
  record,
  onClose,
  onEdit,
  onRecordPayment,
}: MoneyDetailsModalProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { m, fmt } = useI18n();
  const t = m.money;
  const [isPending, startTransition] = useTransition();

  if (!record) return null;

  const terms = m.moneyTerms[record.type];
  const isLent = record.type === "LENT";
  const remaining = remainingOf(record);

  const handleDeletePayment = async (paymentId: string, amount: number) => {
    const ok = await confirm({
      title: terms.deletePayment,
      message: t.deletePaymentMsg(fmt.money(amount), terms.payment),
      confirmText: m.delete,
      variant: "danger",
      icon: <Trash2 className="h-6 w-6" />,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteMoneyPayment(paymentId);
      if (res.success) {
        showToast(terms.paymentRemoved, "success");
        onClose();
      } else {
        showToast(res.error || terms.removePaymentFailed, "error");
      }
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      locked={isPending}
      size="lg"
      icon={isLent ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownLeft className="h-5 w-5" />}
      title={record.personName}
      download={{
        fileName: `${isLent ? "lent" : "borrowed"}-${toFileSlug(record.personName)}-${fileDate(record.date)}`,
      }}
      description={
        isLent ? t.lentDetail(record.personName) : t.borrowedDetail(record.personName)
      }
      footer={
        <>
          <button onClick={onClose} className="btn btn-secondary mr-auto" disabled={isPending}>
            {m.close}
          </button>
          <button onClick={() => onEdit(record)} className="btn btn-secondary" disabled={isPending}>
            <Pencil />
            {m.edit}
          </button>
          {remaining > 0 && (
            <button
              onClick={() => onRecordPayment(record)}
              className={`btn ${isLent ? "btn-success" : "btn-primary"}`}
              disabled={isPending}
            >
              <Banknote />
              <span className="hidden sm:inline">{terms.recordPayment}</span>
              <span className="sm:hidden">{terms.payment}</span>
            </button>
          )}
        </>
      }
    >
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-line">
        <div className="flex items-center gap-2 flex-wrap">
          <MoneyTypeBadge type={record.type} />
          <MoneyStatusBadge status={record.displayStatus} />
        </div>
        <div className="text-right">
          <p className="text-xs text-faint">{terms.outstanding}</p>
          <p
            className={`text-xl font-semibold tabular tracking-tight ${
              remaining === 0 ? "text-faint" : isLent ? "text-success" : "text-warning"
            }`}
          >
            {fmt.money(remaining)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 py-4 text-center">
        <div className="rounded-lg bg-subtle px-2 py-2.5">
          <p className="text-xs text-faint">{terms.label}</p>
          <p className="text-sm font-semibold tabular text-fg">{fmt.money(record.amount)}</p>
        </div>
        <div className="rounded-lg bg-subtle px-2 py-2.5">
          <p className="text-xs text-faint">{terms.settled}</p>
          <p className="text-sm font-semibold tabular text-fg">{fmt.money(record.paidAmount)}</p>
        </div>
        <div className="rounded-lg bg-subtle px-2 py-2.5">
          <p className="text-xs text-faint">{t.remaining}</p>
          <p className="text-sm font-semibold tabular text-fg">{fmt.money(remaining)}</p>
        </div>
      </div>
      <SettledBar amount={record.amount} paidAmount={record.paidAmount} type={record.type} />

      <dl className="text-[13px] divide-y divide-line mt-2">
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-muted">{terms.dateLabel}</dt>
          <dd className="font-medium text-fg text-right">{fmt.date(record.date, longDate)}</dd>
        </div>
        <div className="flex justify-between gap-4 py-3">
          <dt className="text-muted">{t.dueDate}</dt>
          <dd
            className={`font-medium text-right ${
              record.displayStatus === "OVERDUE" ? "text-danger" : record.dueDate ? "text-fg" : "text-faint"
            }`}
          >
            {record.dueDate ? fmt.date(record.dueDate, longDate) : t.noDueDate}
          </dd>
        </div>
        <div className="py-3">
          <dt className="text-muted mb-1.5">{t.note}</dt>
          <dd
            className={`rounded-lg bg-subtle px-3 py-2.5 leading-relaxed whitespace-pre-wrap ${
              record.note ? "text-fg" : "text-faint"
            }`}
          >
            {record.note || t.noNote}
          </dd>
        </div>
        <div className="pt-3">
          <dt className="text-muted mb-1.5">
            {terms.paymentHistory}
            {record.payments.length > 0 && ` · ${fmt.number(record.payments.length)}`}
          </dt>
          <dd>
            {record.payments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-line px-3 py-3 text-center text-faint">
                {terms.noPayments}
              </p>
            ) : (
              <ul className={`rounded-lg border border-line divide-y divide-line ${isPending ? "is-refreshing" : ""}`}>
                {record.payments.map((p) => (
                  <li key={p.id} className="group flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-fg">{fmt.date(p.paymentDate)}</p>
                      {p.note && <p className="text-xs text-faint truncate">{p.note}</p>}
                    </div>
                    <span className={`font-semibold tabular ${isLent ? "text-success" : "text-fg"}`}>
                      {isLent ? "+" : "−"}
                      {fmt.money(p.amount)}
                    </span>
                    <button
                      onClick={() => handleDeletePayment(p.id, p.amount)}
                      className="icon-btn icon-btn-danger h-7 w-7"
                      data-export-ignore
                      title={terms.deletePayment}
                      aria-label={t.deletePaymentLabel(terms.payment, fmt.money(p.amount))}
                      disabled={isPending}
                    >
                      <Trash2 />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </dd>
        </div>
      </dl>
    </Modal>
  );
}
