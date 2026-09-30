'use client';

import React, { useState, useTransition } from 'react';
import { KeyRound, Loader2, Check, X, ShieldCheck } from 'lucide-react';
import Modal from './Modal';
import PasswordInput from './PasswordInput';
import { changeUserPassword } from '@/actions/auth';
import { useToast } from './Toast';
import { useI18n } from './I18nProvider';

// Labels come from m.changePassword.strength (same order)
const strengthLevels = [
  { bar: 'bg-danger', text: 'text-danger' },
  { bar: 'bg-danger', text: 'text-danger' },
  { bar: 'bg-warning', text: 'text-warning' },
  { bar: 'bg-accent-2', text: 'text-accent-fg' },
  { bar: 'bg-accent', text: 'text-accent-fg' },
];

/** 0 = too short … 4 = strong */
function scorePassword(pw: string) {
  if (pw.length < 6) return 0;
  let score = 1;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return Math.min(score, 4);
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li
      className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
        met ? 'text-accent-fg' : 'text-faint'
      }`}
    >
      <span
        className={`h-4 w-4 rounded-full flex items-center justify-center transition-all duration-300 ${
          met ? 'bg-accent text-white scale-100' : 'bg-muted-bg text-faint scale-90'
        }`}
      >
        {met ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : <span className="h-1 w-1 rounded-full bg-current" />}
      </span>
      {children}
    </li>
  );
}

export default function ChangePasswordForm() {
  const { showToast } = useToast();
  const { m } = useI18n();
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Bumped on each failed submit so the error alert re-plays its shake
  const [errorKey, setErrorKey] = useState(0);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setError(null);
  };

  const handleOpen = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleClose = () => {
    if (isPending) return;
    setIsOpen(false);
  };

  const fail = (msg: string) => {
    setError(msg);
    setErrorKey((k) => k + 1);
  };

  const score = scorePassword(newPassword);
  const level = strengthLevels[score];
  const checks = {
    length: newPassword.length >= 6,
    mixed: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    differs: newPassword.length > 0 && newPassword !== currentPassword,
  };
  const matches = confirmNewPassword.length > 0 && confirmNewPassword === newPassword;
  const mismatch = confirmNewPassword.length > 0 && confirmNewPassword !== newPassword;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword || !confirmNewPassword) return fail(m.changePassword.allRequired);
    if (newPassword.length < 6) return fail(m.changePassword.tooShort);
    if (newPassword !== confirmNewPassword) return fail(m.changePassword.mismatch);
    if (currentPassword === newPassword) return fail(m.changePassword.same);

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
        fail(res.message);
      }
    });
  };

  return (
    <>
      <button type="button" onClick={handleOpen} className="btn btn-secondary btn-sm">
        <KeyRound />
        {m.changePassword.open}
      </button>

      <Modal
        open={isOpen}
        onClose={handleClose}
        locked={isPending}
        icon={<KeyRound className="h-5 w-5" />}
        title={m.changePassword.title}
        description={m.changePassword.description}
        footer={
          <>
            <button type="button" onClick={handleClose} className="btn btn-secondary" disabled={isPending}>
              {m.cancel}
            </button>
            <button type="submit" form="password-form" disabled={isPending} className="btn btn-primary">
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {m.changePassword.updating}
                </>
              ) : (
                <>
                  <ShieldCheck />
                  {m.changePassword.submit}
                </>
              )}
            </button>
          </>
        }
      >
        <form id="password-form" onSubmit={handleSubmit} className="flex flex-col gap-5">
          {error && (
            <div key={errorKey} className="alert alert-danger animate-shake" role="alert">
              <X />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="label" htmlFor="pw-current">
              {m.changePassword.current}
            </label>
            <PasswordInput
              id="pw-current"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              placeholder={m.changePassword.currentPlaceholder}
              disabled={isPending}
              autoFocus
            />
          </div>

          <div className="h-px bg-line" />

          <div>
            <label className="label" htmlFor="pw-new">
              {m.changePassword.new}
            </label>
            <PasswordInput
              id="pw-new"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={m.auth.atLeast6}
              disabled={isPending}
            />

            {/* Strength meter */}
            <div className="mt-2.5 flex items-center gap-3">
              <div className="flex-1 grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4].map((i) => (
                  <span key={i} className="h-1.5 rounded-full bg-muted-bg overflow-hidden">
                    <span
                      className={`block h-full rounded-full origin-left transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${level.bar}`}
                      style={{ transform: `scaleX(${newPassword && score >= i ? 1 : 0})` }}
                    />
                  </span>
                ))}
              </div>
              <span className={`w-16 text-right text-xs font-medium transition-colors ${newPassword ? level.text : 'text-faint'}`}>
                {newPassword ? m.changePassword.strength[score] : '—'}
              </span>
            </div>

            <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-xl bg-subtle border border-line p-3">
              <Requirement met={checks.length}>{m.changePassword.reqLength}</Requirement>
              <Requirement met={checks.mixed}>{m.changePassword.reqMixed}</Requirement>
              <Requirement met={checks.number}>{m.changePassword.reqNumber}</Requirement>
              <Requirement met={checks.differs}>{m.changePassword.reqDiffers}</Requirement>
            </ul>
          </div>

          <div>
            <label className="label" htmlFor="pw-confirm">
              {m.changePassword.confirm}
            </label>
            <PasswordInput
              id="pw-confirm"
              required
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              autoComplete="new-password"
              placeholder={m.changePassword.repeatNew}
              disabled={isPending}
              className={mismatch ? 'border-danger! focus:shadow-[0_0_0_3px_var(--danger-soft)]!' : matches ? 'border-accent!' : ''}
            />
            <p
              className={`text-xs mt-1.5 h-4 flex items-center gap-1 transition-opacity duration-200 ${
                matches ? 'text-accent-fg opacity-100' : mismatch ? 'text-danger opacity-100' : 'opacity-0'
              }`}
            >
              {matches ? (
                <>
                  <Check className="h-3.5 w-3.5" /> {m.changePassword.match}
                </>
              ) : mismatch ? (
                <>
                  <X className="h-3.5 w-3.5" /> {m.changePassword.noMatch}
                </>
              ) : null}
            </p>
          </div>
        </form>
      </Modal>
    </>
  );
}
