'use client';

import React, { useState, useTransition } from 'react';
import { X, Lock, Key, Loader2, Eye, EyeOff } from 'lucide-react';
import { changeUserPassword } from '@/actions/auth';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';

export default function ChangePasswordForm() {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  
  // Fields state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Password visibility peeks
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleOpen = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      showToast('All fields are required.', 'error');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('New password must be at least 6 characters long.', 'error');
      return;
    }

    if (currentPassword === newPassword) {
      showToast('New password cannot be the same as your current password.', 'error');
      return;
    }

    // Trigger standard confirm modal preset
    const ok = await confirm({
      title: 'Update Login Password',
      message: 'Are you sure you want to change your password? This will overwrite your existing account credentials.',
      confirmText: 'Yes, Update Password',
      cancelText: 'Cancel',
      variant: 'info',
      icon: <Lock className="h-6 w-6" />,
    });

    if (!ok) return;

    startTransition(async () => {
      const formData = new FormData();
      formData.append('currentPassword', currentPassword);
      formData.append('newPassword', newPassword);
      formData.append('confirmNewPassword', confirmNewPassword);

      const res = await changeUserPassword(formData);

      if (res.success) {
        showToast(res.message, 'success');
        resetForm();
        setIsOpen(false);
      } else {
        showToast(res.message, 'error');
      }
    });
  };

  return (
    <div className="w-full flex justify-end">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className="px-4 py-2 bg-violet-600/10 hover:bg-violet-600/20 text-violet-600 dark:text-violet-400 border border-violet-500/20 dark:border-violet-500/30 font-semibold text-xs rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-violet-950/5 dark:shadow-violet-950/20"
      >
        <Key className="h-3.5 w-3.5" />
        Change Password
      </button>

      {/* Frosted Glass Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={handleClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-md rounded-2xl glass-panel-glow border border-violet-500/20 p-6 z-10 animate-scale-up text-slate-100 bg-slate-950/95">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-100 flex items-center gap-2">
                  <Lock className="h-4 w-4 text-violet-400" />
                  Change Credentials
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Update your authentication parameters
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                disabled={isPending}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              
              {/* Current Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-xs font-medium"
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-350 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-xs font-medium"
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-350 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl glass-input text-xs font-medium"
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-350 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-4 border-t border-white/5 pt-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 py-2.5 border border-white/10 rounded-xl text-xs font-semibold hover:bg-white/5 transition-all cursor-pointer text-slate-300"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl text-xs font-bold text-white shadow-lg shadow-violet-950/20 hover:shadow-violet-900/45 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Confirm Update'
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Scale Up Animation */}
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
              animation: scale-up 0.22s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
