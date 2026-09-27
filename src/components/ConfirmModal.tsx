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
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'default',
};

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
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
                {modal.cancelText ?? 'Cancel'}
              </button>
              <button onClick={handleConfirm} autoFocus className={`btn ${cfg.confirmBtn}`}>
                {modal.confirmText ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

// ─── Pre-built confirm helpers ─────────────────────────────────────────────────
// These are convenient typed shortcuts used by each action.

export const confirmPresets = {
  logout: (): ConfirmOptions => ({
    title: 'Sign Out',
    message: 'You will be logged out of your account. Any unsaved changes will be lost.',
    confirmText: 'Yes, Logout',
    cancelText: 'Stay',
    variant: 'info',
    icon: <LogOut className="h-6 w-6" />,
  }),

  deleteExpense: (): ConfirmOptions => ({
    title: 'Delete Transaction',
    message:
      'This expense record will be permanently removed and the amount will be credited back to your balance. This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger',
    icon: <Trash2 className="h-6 w-6" />,
  }),

  setBalance: (): ConfirmOptions => ({
    title: 'Update Wallet Balance',
    message:
      'Are you sure you want to set a new balance? This will overwrite your current total balance.',
    confirmText: 'Update Balance',
    cancelText: 'Cancel',
    variant: 'info',
    icon: <RefreshCw className="h-6 w-6" />,
  }),

  addExpense: (): ConfirmOptions => ({
    title: 'Record New Expense',
    message: 'This expense will be saved and deducted from your current wallet balance.',
    confirmText: 'Save Expense',
    cancelText: 'Cancel',
    variant: 'info',
    icon: <ShieldCheck className="h-6 w-6" />,
  }),

  updateExpense: (): ConfirmOptions => ({
    title: 'Update Expense',
    message: 'Your changes will be saved and the balance will be recalculated accordingly.',
    confirmText: 'Save Changes',
    cancelText: 'Cancel',
    variant: 'info',
    icon: <ShieldCheck className="h-6 w-6" />,
  }),

  clearHistory: (): ConfirmOptions => ({
    title: 'Reset Transaction Ledger',
    message:
      'All expense records and your wallet balance will be permanently erased. This is irreversible and cannot be recovered!',
    confirmText: 'Yes, Wipe All',
    cancelText: 'Abort',
    variant: 'warning',
    icon: <AlertTriangle className="h-6 w-6" />,
  }),

  approveUser: (name: string): ConfirmOptions => ({
    title: 'Approve User Account',
    message: `Grant full access to "${name}"? They will be able to log in and use the platform immediately.`,
    confirmText: 'Approve',
    cancelText: 'Cancel',
    variant: 'success',
    icon: <UserCheck className="h-6 w-6" />,
  }),

  rejectUser: (name: string): ConfirmOptions => ({
    title: 'Reject Registration',
    message: `Reject the registration request from "${name}"? They will not be able to access the platform.`,
    confirmText: 'Reject',
    cancelText: 'Cancel',
    variant: 'danger',
    icon: <UserX className="h-6 w-6" />,
  }),

  suspendUser: (name: string): ConfirmOptions => ({
    title: 'Suspend User Account',
    message: `Suspend "${name}"? Their session will be terminated and they will be locked out of the system.`,
    confirmText: 'Suspend',
    cancelText: 'Cancel',
    variant: 'danger',
    icon: <ShieldX className="h-6 w-6" />,
  }),

  reactivateUser: (name: string): ConfirmOptions => ({
    title: 'Reactivate Account',
    message: `Re-activate "${name}" and grant them platform access again?`,
    confirmText: 'Reactivate',
    cancelText: 'Cancel',
    variant: 'success',
    icon: <ShieldCheck className="h-6 w-6" />,
  }),

  promoteToAdmin: (name: string): ConfirmOptions => ({
    title: 'Promote to Admin',
    message: `Grant administrator privileges to "${name}"? They will have full control over user management and system settings.`,
    confirmText: 'Promote',
    cancelText: 'Cancel',
    variant: 'warning',
    icon: <Crown className="h-6 w-6" />,
  }),

  demoteToUser: (name: string): ConfirmOptions => ({
    title: 'Demote to User',
    message: `Remove administrator privileges from "${name}"? They will lose access to admin-only features.`,
    confirmText: 'Demote',
    cancelText: 'Cancel',
    variant: 'danger',
    icon: <ShieldAlert className="h-6 w-6" />,
  }),
};
