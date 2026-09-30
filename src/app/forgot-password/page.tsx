"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  KeyRound,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import { requestPasswordReset, resetPasswordWithCode } from "@/actions/auth";
import { useToast } from "@/components/Toast";
import AuthShell, { AuthShellSkeleton } from "@/components/AuthShell";
import OtpInput, { emptyOtp } from "@/components/OtpInput";
import PasswordInput from "@/components/PasswordInput";
import { useI18n } from "@/components/I18nProvider";

// Must match RESET_RESEND_COOLDOWN_SECONDS in src/actions/auth.ts
const RESEND_COOLDOWN = 60;

function ForgotPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { m } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();

  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [otpDigits, setOtpDigits] = useState<string[]>(emptyOtp);
  const [otpKey, setOtpKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [redirecting, setRedirecting] = useState(false);
  const busy = isPending || isResending || redirecting;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleRequest = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    const value = email.trim();
    if (!value) {
      setErrorMessage(m.auth.forgot.enterEmail);
      return;
    }

    startTransition(async () => {
      const res = await requestPasswordReset(value);
      if (res.success) {
        showToast(res.message, "success");
        setStep("reset");
        setResendCooldown(RESEND_COOLDOWN);
      } else {
        setErrorMessage(res.message);
        showToast(res.message, "error");
      }
    });
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    startResendTransition(async () => {
      const res = await requestPasswordReset(email.trim());
      if (res.success) {
        showToast(m.auth.forgot.newCodeSent, "success");
        setOtpDigits(emptyOtp());
        setOtpKey((k) => k + 1);
        setResendCooldown(RESEND_COOLDOWN);
      } else {
        setErrorMessage(res.message);
        showToast(res.message, "error");
      }
    });
  };

  const handleReset = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);

    const formData = new FormData(e.currentTarget);
    const newPassword = (formData.get("newPassword") as string) ?? "";
    const confirmPassword = (formData.get("confirmPassword") as string) ?? "";
    const code = otpDigits.join("");

    if (code.length !== 6) {
      setErrorMessage(m.auth.forgot.enterAllDigits);
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage(m.authServer.newPasswordTooShort);
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage(m.auth.forgot.mismatch);
      return;
    }

    startTransition(async () => {
      const res = await resetPasswordWithCode(email.trim(), code, newPassword, confirmPassword);
      if (res.success) {
        setRedirecting(true);
        showToast(res.message, "success");
        router.push("/login");
      } else {
        setErrorMessage(res.message);
        showToast(res.message, "error");
        // A burned or expired code can't be retried — clear the boxes
        if (res.code === "RESET_CODE_DEAD") {
          setOtpDigits(emptyOtp());
          setOtpKey((k) => k + 1);
          setResendCooldown(0);
        }
      }
    });
  };

  const errorAlert = errorMessage && (
    <div className="alert alert-danger mb-5 animate-shake">
      <AlertCircle />
      <span>{errorMessage}</span>
    </div>
  );

  if (step === "email") {
    return (
      <AuthShell
        icon={KeyRound}
        title={m.auth.forgot.title}
        description={m.auth.forgot.description}
        footer={
          <Link href="/login" className="inline-flex items-center gap-1.5 hover:text-fg transition-colors group">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            {m.auth.forgot.backToLogin}
          </Link>
        }
      >
        {errorAlert}
        <form onSubmit={handleRequest} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="email">
              {m.auth.email}
            </label>
            <div className="relative">
              <Mail className="input-icon" />
              <input
                id="email"
                type="email"
                name="email"
                required
                autoFocus
                autoComplete="email"
                placeholder={m.auth.emailPlaceholder}
                className="input pl-9 h-11"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </div>
          </div>

          <button type="submit" disabled={busy} className="btn btn-primary btn-lg w-full h-11 mt-2">
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {m.auth.forgot.sendingCode}
              </>
            ) : (
              <>
                {m.auth.forgot.send}
                <ArrowRight />
              </>
            )}
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      icon={MailCheck}
      title={m.auth.forgot.resetTitle}
      description={
        <>
          {m.auth.forgot.sentTo} <span className="font-medium text-fg">{email}</span>.{" "}
          {m.auth.forgot.validFor}
        </>
      }
      footer={
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setErrorMessage(null);
            setOtpDigits(emptyOtp());
          }}
          className="inline-flex items-center gap-1.5 hover:text-fg transition-colors group cursor-pointer"
          disabled={busy}
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          {m.auth.forgot.differentEmail}
        </button>
      }
    >
      {errorAlert}
      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <div>
          <label className="label">{m.auth.forgot.code}</label>
          <OtpInput key={otpKey} digits={otpDigits} onChange={setOtpDigits} disabled={busy} />
        </div>

        <div>
          <label className="label" htmlFor="newPassword">
            {m.auth.forgot.newPassword}
          </label>
          <PasswordInput
            className="h-11"
            id="newPassword"
            name="newPassword"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder={m.auth.atLeast6}
            disabled={busy}
          />
        </div>

        <div>
          <label className="label" htmlFor="confirmPassword">
            {m.auth.forgot.confirmNew}
          </label>
          <PasswordInput
            className="h-11"
            id="confirmPassword"
            name="confirmPassword"
            required
            minLength={6}
            autoComplete="new-password"
            placeholder={m.auth.forgot.repeatNew}
            disabled={busy}
          />
        </div>

        <div className="flex flex-col gap-2 mt-2">
          <button type="submit" disabled={busy} className="btn btn-primary btn-lg w-full h-11">
            {isPending || redirecting ? (
              <>
                <Loader2 className="animate-spin" />
                {redirecting ? m.auth.forgot.openingLogin : m.auth.forgot.resetting}
              </>
            ) : (
              m.auth.forgot.submit
            )}
          </button>

          <button
            type="button"
            onClick={handleResend}
            disabled={busy || resendCooldown > 0}
            className="btn btn-ghost w-full"
          >
            {isResending ? (
              <>
                <RefreshCw className="animate-spin" />
                {m.auth.verify.sending}
              </>
            ) : resendCooldown > 0 ? (
              <span className="tabular">{m.auth.verify.resendIn(resendCooldown)}</span>
            ) : (
              <>
                <RefreshCw />
                {m.auth.verify.resend}
              </>
            )}
          </button>
        </div>
      </form>
    </AuthShell>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthShellSkeleton />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
