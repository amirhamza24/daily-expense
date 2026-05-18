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
  X,
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

const variantConfig: Record<
  ConfirmVariant,
  {
    iconBg: string;
    iconColor: string;
    confirmBtn: string;
    borderAccent: string;
    glowClass: string;
  }
> = {
  danger: {
    iconBg: 'bg-rose-500/15',
    iconColor: 'text-rose-400',
    confirmBtn:
      'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-950/30',
    borderAccent: 'border-rose-500/20',
    glowClass: 'shadow-rose-500/10',
  },
  warning: {
    iconBg: 'bg-amber-500/15',
    iconColor: 'text-amber-400',
    confirmBtn:
      'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-950/30',
    borderAccent: 'border-amber-500/20',
    glowClass: 'shadow-amber-500/10',
  },
  success: {
    iconBg: 'bg-emerald-500/15',
    iconColor: 'text-emerald-400',
    confirmBtn:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/30',
    borderAccent: 'border-emerald-500/20',
    glowClass: 'shadow-emerald-500/10',
  },
  info: {
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
    confirmBtn:
      'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 shadow-violet-950/30',
    borderAccent: 'border-violet-500/20',
    glowClass: 'shadow-violet-500/10',
  },
  default: {
    iconBg: 'bg-slate-500/15',
    iconColor: 'text-slate-400',
    confirmBtn:
      'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 shadow-slate-950/30',
    borderAccent: 'border-slate-500/20',
    glowClass: 'shadow-slate-500/10',
  },
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

      {/* ── Modal Overlay ── */}
      {modal.open && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleCancel}
          />

          {/* Modal Card */}
          <div
            className={`
              relative w-full max-w-md rounded-2xl
              bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl
              border ${cfg.borderAccent}
              shadow-2xl ${cfg.glowClass}
              flex flex-col gap-0
              animate-confirm-in
            `}
          >
            {/* Top accent line */}
            <div
              className={`h-1 w-full rounded-t-2xl ${
                modal.variant === 'danger'
                  ? 'bg-gradient-to-r from-rose-600 to-red-500'
                  : modal.variant === 'warning'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                  : modal.variant === 'success'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                  : modal.variant === 'info'
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-500'
                  : 'bg-gradient-to-r from-slate-600 to-slate-500'
              }`}
            />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-0">
              <div className="flex items-center gap-4">
                {/* Icon badge */}
                <div className={`p-3 rounded-xl ${cfg.iconBg} shrink-0`}>
                  <div className={cfg.iconColor}>
                    {modal.icon ?? <HelpCircle className="h-6 w-6" />}
                  </div>
                </div>
                <div>
                  <h3
                    id="confirm-modal-title"
                    className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug"
                  >
                    {modal.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5 uppercase tracking-wider">
                    Action Confirmation Required
                  </p>
                </div>
              </div>

              {/* Close X */}
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-slate-300 transition-colors shrink-0 cursor-pointer mt-0.5"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Divider */}
            <div className="mx-6 mt-4 border-t border-slate-200 dark:border-white/5" />

            {/* Body message */}
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {modal.message}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              {/* Cancel */}
              <button
                onClick={handleCancel}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 text-sm font-semibold transition-all duration-200 cursor-pointer active:scale-[0.98]"
              >
                {modal.cancelText ?? 'Cancel'}
              </button>

              {/* Confirm */}
              <button
                onClick={handleConfirm}
                className={`
                  px-5 py-2.5 rounded-xl text-white text-sm font-bold
                  transition-all duration-200 shadow-lg
                  active:scale-[0.97] cursor-pointer
                  ${cfg.confirmBtn}
                `}
              >
                {modal.confirmText ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation style */}
      <style jsx global>{`
        @keyframes confirm-in {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-confirm-in {
          animation: confirm-in 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
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
      '⚠️ All expense records and your wallet balance will be permanently erased. This is irreversible and cannot be recovered!',
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
