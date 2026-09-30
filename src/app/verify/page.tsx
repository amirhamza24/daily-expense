"use client";

import React, {
  useState,
  useEffect,
  useTransition,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw, MailCheck } from "lucide-react";
import { verifyEmailOTP, resendVerificationOTP } from "@/actions/auth";
import { useToast } from "@/components/Toast";
import AuthShell, { AuthShellSkeleton } from "@/components/AuthShell";
import OtpInput, { emptyOtp } from "@/components/OtpInput";
import { useI18n } from "@/components/I18nProvider";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const { m, fmt } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();

  const email = searchParams.get("email") || "";

  // 6 digit OTP states
  const [otpDigits, setOtpDigits] = useState<string[]>(emptyOtp);
  // Bumped to remount the OTP boxes (and refocus the first) after a resend
  const [otpKey, setOtpKey] = useState(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Expiry timer (2 minutes = 120 seconds)
  const [expiryTimeLeft, setExpiryTimeLeft] = useState<number>(120);
  // Resend cooldown timer (120 seconds initially)
  const [resendCooldown, setResendCooldown] = useState<number>(120);

  // Countdown timer for OTP Expiration
  useEffect(() => {
    if (expiryTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setExpiryTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [expiryTimeLeft]);

  // Cooldown timer for Resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setErrorMessage(m.auth.verify.enterAll);
      return;
    }

    if (expiryTimeLeft <= 0) {
      setErrorMessage(m.auth.verify.expiredRequestNew);
      return;
    }

    startTransition(async () => {
      const res = await verifyEmailOTP(email, fullOtp);

      if (res.success) {
        setSuccessMessage(res.message);
        showToast(res.message, "success");
        // Clear OTP inputs
        setOtpDigits(emptyOtp());

        // Redirect to login after 3.5 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3500);
      } else {
        setErrorMessage(res.message);
        showToast(res.message, "error");
      }
    });
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startResendTransition(async () => {
      const res = await resendVerificationOTP(email);

      if (res.success) {
        showToast(res.message, "success");
        setExpiryTimeLeft(120); // reset expiration timer to 2 minutes
        setResendCooldown(120); // trigger 120s (2 minutes) resend cooldown
        setOtpDigits(emptyOtp());
        setOtpKey((k) => k + 1);
      } else {
        setErrorMessage(res.message);
        showToast(res.message, "error");
      }
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return fmt.digits(`${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
  };


  return (
    <AuthShell
      icon={MailCheck}
      title={m.auth.verify.title}
      description={
        <>
          {m.auth.verify.sentTo}{" "}
          <span className="font-medium text-fg">{email || m.auth.verify.yourEmail}</span>.
        </>
      }
      footer={
        <Link href="/register" className="inline-flex items-center gap-1.5 hover:text-fg transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          {m.auth.verify.backToRegister}
        </Link>
      }
    >
      {errorMessage && (
        <div className="alert alert-danger mb-5 animate-shake">
          <AlertCircle />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage ? (
        <div className="flex flex-col gap-4 animate-fade-up">
          <div className="alert alert-success">
            <CheckCircle2 />
            <span>{successMessage}</span>
          </div>
          <p className="text-[13px] text-muted">
            {m.auth.verify.redirecting}{" "}
            <Link href="/login" className="font-medium text-accent-fg hover:underline underline-offset-4">
              {m.auth.verify.goNow}
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-5">
          <div>
            <label className="label">{m.auth.verify.code}</label>
            <OtpInput
              key={otpKey}
              digits={otpDigits}
              onChange={setOtpDigits}
              disabled={isPending || isResending}
            />
            <p className="text-xs text-faint mt-2">
              {expiryTimeLeft > 0 ? (
                <>
                  {m.auth.verify.expiresIn}{" "}
                  <span
                    className={`tabular font-medium ${expiryTimeLeft <= 60 ? "text-danger" : "text-muted"}`}
                  >
                    {formatTime(expiryTimeLeft)}
                  </span>
                </>
              ) : (
                <span className="text-danger font-medium">{m.auth.verify.expired}</span>
              )}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={isPending || isResending || expiryTimeLeft <= 0}
              className="btn btn-primary btn-lg w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="animate-spin" />
                  {m.auth.verify.verifying}
                </>
              ) : (
                m.auth.verify.submit
              )}
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={isPending || isResending || resendCooldown > 0}
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
      )}
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<AuthShellSkeleton />}>
      <VerifyEmailForm />
    </Suspense>
  );
}
