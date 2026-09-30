'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  Trash2,
  LogOut,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  UserCheck,
  UserX,
  RefreshCw,
  HelpCircle,
  Crown,
} from 'lucide-react';
import type { Messages } from '@/lib/i18n/messages';
import { useI18n } from './I18nProvider';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ConfirmVariant =
  | 'danger'      // red  – delete, suspend, reject
  | 'warning'     // amber – clear history, role demotion
  | 'success'     // green – approve, restore
  | 'info'        // violet – promote, logout
  | 'default';    // slate – generic

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  icon?: React.ReactNode;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

// ─── Context ──────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}

// ─── Variant config ───────────────────────────────────────────────────────────

const variantConfig: Record<ConfirmVariant, { icon: string; confirmBtn: string }> = {
  danger: { icon: 'bg-danger-soft text-danger', confirmBtn: 'btn-danger' },
  warning: { icon: 'bg-warning-soft text-warning', confirmBtn: 'btn-warning' },
  success: { icon: 'bg-success-soft text-success', confirmBtn: 'btn-success' },
  info: { icon: 'bg-accent-soft text-accent-fg', confirmBtn: 'btn-primary' },
  default: { icon: 'bg-subtle text-muted', confirmBtn: 'btn-primary' },
};

// ─── Internal modal state ─────────────────────────────────────────────────────

interface ModalState extends ConfirmOptions {
  open: boolean;
}

const DEFAULT_STATE: ModalState = {
  open: false,
  title: '',
  message: '',
  variant: 'default',
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { m } = useI18n();
  const [modal, setModal] = useState<ModalState>(DEFAULT_STATE);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm: ConfirmFn = useCallback((opts) => {
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setModal({ ...DEFAULT_STATE, ...opts, open: true });
    });
  }, []);

  const handleConfirm = () => {
    resolverRef.current?.(true);
    setModal((s) => ({ ...s, open: false }));
  };

  const handleCancel = () => {
    resolverRef.current?.(false);
    setModal((s) => ({ ...s, open: false }));
  };

  const cfg = variantConfig[modal.variant ?? 'default'];

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {modal.open && (
        <div
          className="modal-root z-9999"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          onKeyDown={(e) => e.key === 'Escape' && handleCancel()}
        >
          <div className="modal-overlay" onClick={handleCancel} />

          <div className="modal-panel max-w-100">
            <div className="flex gap-4 p-5">
              <div
                className={`h-11 w-11 shrink-0 rounded-xl flex items-center justify-center animate-pop-in [&_svg]:h-5 [&_svg]:w-5 ${cfg.icon}`}
              >
                {modal.icon ?? <HelpCircle />}
              </div>
              <div className="min-w-0 pt-0.5">
                <h3
                  id="confirm-modal-title"
                  className="text-[15px] font-semibold tracking-tight text-fg"
                >
                  {modal.title}
                </h3>
                <p className="text-[13px] text-muted leading-relaxed mt-1.5">{modal.message}</p>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-5 py-3.5 border-t border-line bg-subtle/60 rounded-b-2xl">
              <button onClick={handleCancel} className="btn btn-secondary">
                {modal.cancelText ?? m.cancel}
              </button>
              <button onClick={handleConfirm} autoFocus className={`btn ${cfg.confirmBtn}`}>
                {modal.confirmText ?? m.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// ─── Pre-built confirm helpers ─────────────────────────────────────────────────
// Typed shortcuts used by each action; pass `m` from useI18n().

type Dialogs = Messages['confirmDialogs'];

export const confirmPresets = {
  logout: (m: Messages): ConfirmOptions => ({
    title: m.confirmDialogs.logout.title,
    message: m.confirmDialogs.logout.message,
    confirmText: m.confirmDialogs.logout.confirm,
    cancelText: m.confirmDialogs.logout.cancel,
    variant: 'info',
    icon: <LogOut className="h-6 w-6" />,
  }),

  deleteExpense: (m: Messages): ConfirmOptions => simple(m.confirmDialogs.deleteExpense, 'danger', <Trash2 className="h-6 w-6" />),

  setBalance: (m: Messages): ConfirmOptions => simple(m.confirmDialogs.setBalance, 'info', <RefreshCw className="h-6 w-6" />),

  addExpense: (m: Messages): ConfirmOptions => simple(m.confirmDialogs.addExpense, 'info', <ShieldCheck className="h-6 w-6" />),

  updateExpense: (m: Messages): ConfirmOptions => simple(m.confirmDialogs.updateExpense, 'info', <ShieldCheck className="h-6 w-6" />),

  clearHistory: (m: Messages): ConfirmOptions => ({
    title: m.confirmDialogs.clearHistory.title,
    message: m.confirmDialogs.clearHistory.message,
    confirmText: m.confirmDialogs.clearHistory.confirm,
    cancelText: m.confirmDialogs.clearHistory.cancel,
    variant: 'warning',
    icon: <AlertTriangle className="h-6 w-6" />,
  }),

  approveUser: (m: Messages, name: string): ConfirmOptions =>
    named(m.confirmDialogs.approveUser, name, 'success', <UserCheck className="h-6 w-6" />),

  rejectUser: (m: Messages, name: string): ConfirmOptions =>
    named(m.confirmDialogs.rejectUser, name, 'danger', <UserX className="h-6 w-6" />),

  suspendUser: (m: Messages, name: string): ConfirmOptions =>
    named(m.confirmDialogs.suspendUser, name, 'danger', <ShieldX className="h-6 w-6" />),

  reactivateUser: (m: Messages, name: string): ConfirmOptions =>
    named(m.confirmDialogs.reactivateUser, name, 'success', <ShieldCheck className="h-6 w-6" />),

  promoteToAdmin: (m: Messages, name: string): ConfirmOptions =>
    named(m.confirmDialogs.promoteToAdmin, name, 'warning', <Crown className="h-6 w-6" />),

  demoteToUser: (m: Messages, name: string): ConfirmOptions =>
    named(m.confirmDialogs.demoteToUser, name, 'danger', <ShieldAlert className="h-6 w-6" />),
};

function simple(
  d: Dialogs['deleteExpense'],
  variant: ConfirmVariant,
  icon: React.ReactNode,
): ConfirmOptions {
  return { title: d.title, message: d.message, confirmText: d.confirm, variant, icon };
}

function named(
  d: Dialogs['approveUser'],
  name: string,
  variant: ConfirmVariant,
  icon: React.ReactNode,
): ConfirmOptions {
  return { title: d.title, message: d.message(name), confirmText: d.confirm, variant, icon };
}
