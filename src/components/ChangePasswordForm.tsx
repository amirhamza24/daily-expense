'use client';

import React, { useState, useTransition } from 'react';
import { Lock, Key, Loader2, Eye, EyeOff } from 'lucide-react';
import Modal from './Modal';
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


  const fields = [
    {
      id: 'current',
      label: 'Current password',
      value: currentPassword,
      set: setCurrentPassword,
      show: showCurrent,
      toggle: () => setShowCurrent((v) => !v),
      autoComplete: 'current-password',
    },
    {
      id: 'new',
      label: 'New password',
      value: newPassword,
      set: setNewPassword,
      show: showNew,
      toggle: () => setShowNew((v) => !v),
      autoComplete: 'new-password',
      hint: 'At least 6 characters.',
    },
    {
      id: 'confirm',
      label: 'Confirm new password',
      value: confirmNewPassword,
      set: setConfirmNewPassword,
      show: showConfirm,
      toggle: () => setShowConfirm((v) => !v),
      autoComplete: 'new-password',
    },
  ];

  return (
    <>
      <button type="button" onClick={handleOpen} className="btn btn-secondary btn-sm">
        <Key />
        Change password
      </button>

      <Modal
        open={isOpen}
        onClose={handleClose}
        locked={isPending}
        title="Change password"
        description="Use a password you don't use anywhere else."
        footer={
          <>
            <button type="button" onClick={handleClose} className="btn btn-secondary" disabled={isPending}>
              Cancel
            </button>
            <button type="submit" form="password-form" disabled={isPending} className="btn btn-primary">
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  Updating…
                </>
              ) : (
                'Update password'
              )}
            </button>
          </>
        }
      >
        <form id="password-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fields.map((f) => (
            <div key={f.id}>
              <label className="label" htmlFor={`pw-${f.id}`}>
                {f.label}
              </label>
              <div className="relative">
                <input
                  id={`pw-${f.id}`}
                  type={f.show ? 'text' : 'password'}
                  required
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  autoComplete={f.autoComplete}
                  className="input pr-10"
                  disabled={isPending}
                />
                <button
                  type="button"
                  onClick={f.toggle}
                  className="absolute right-1 top-1/2 -translate-y-1/2 icon-btn h-7 w-7"
                  tabIndex={-1}
                  aria-label={f.show ? 'Hide password' : 'Show password'}
                >
                  {f.show ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {f.hint && <p className="text-xs text-faint mt-1.5">{f.hint}</p>}
            </div>
          ))}
        </form>
      </Modal>
    </>
  );
}
