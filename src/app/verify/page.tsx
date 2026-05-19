"use client";

import React, {
  useState,
  useEffect,
  useRef,
  useTransition,
  Suspense,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  TrendingUp,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { verifyEmailOTP, resendVerificationOTP } from "@/actions/auth";
import { useToast } from "@/components/Toast";
import GlassCard from "@/components/GlassCard";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isResending, startResendTransition] = useTransition();

  const email = searchParams.get("email") || "";

  // 6 digit OTP states
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Handle single digit input
  const handleChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return; // only digits allowed

    const newOtp = [...otpDigits];
    // Keep only the last character entered
    newOtp[index] = value.substring(value.length - 1);
    setOtpDigits(newOtp);

    // Auto-focus next field if value is filled
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace key
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Handle paste support
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text");
    if (!/^\d+$/.test(pastedData)) return; // must be only digits

    const digits = pastedData.substring(0, 6).split("");
    const newOtp = [...otpDigits];

    digits.forEach((digit, index) => {
      if (index < 6) {
        newOtp[index] = digit;
      }
    });

    setOtpDigits(newOtp);

    // Focus last or appropriate input
    const focusIndex = Math.min(digits.length, 5);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullOtp = otpDigits.join("");
    if (fullOtp.length !== 6) {
      setErrorMessage("Please enter all 6 digits of the verification code.");
      return;
    }

    if (expiryTimeLeft <= 0) {
      setErrorMessage("Verification code expired. Please request a new one.");
      return;
    }

    startTransition(async () => {
      const res = await verifyEmailOTP(email, fullOtp);

      if (res.success) {
        setSuccessMessage(res.message);
        showToast(res.message, "success");
        // Clear OTP inputs
        setOtpDigits(Array(6).fill(""));

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
        setOtpDigits(Array(6).fill(""));
        inputRefs.current[0]?.focus();
      } else {
        setErrorMessage(res.message);
        showToast(res.message, "error");
      }
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-violet-600/30 rounded-2xl border border-violet-500/40 shadow-xl shadow-violet-500/20 mb-3 animate-pulse">
            <TrendingUp className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent">
            Expensify
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            Track daily expenses elegantly
          </p>
        </div>

        {/* Verification frosted card */}
        <GlassCard
          glow
          className="relative overflow-hidden border-violet-500/10 shadow-2xl"
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-400 transition-colors mb-4 group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
            Back to registration
          </Link>

          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Verify Email
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            We have sent a 6-digit verification code to{" "}
            <span className="font-semibold text-slate-700 dark:text-slate-350">
              {email || "your email"}
            </span>
            .
          </p>

          {/* Messages */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleVerify} className="flex flex-col gap-6">
              {/* Digit Inputs container */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  Verification Code
                </label>
                <div
                  className="flex justify-between gap-2.5"
                  onPaste={handlePaste}
                >
                  {otpDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl glass-input focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                      disabled={isPending || isResending}
                      autoFocus={idx === 0}
                    />
                  ))}
                </div>
              </div>

              {/* Timer metrics */}
              <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                <span>
                  Code expires in:{" "}
                  <strong
                    className={`${expiryTimeLeft <= 60 ? "text-rose-400 animate-pulse" : "text-violet-400 font-semibold"}`}
                  >
                    {formatTime(expiryTimeLeft)}
                  </strong>
                </span>
                {expiryTimeLeft <= 0 && (
                  <span className="text-rose-400 font-medium">Expired</span>
                )}
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={isPending || isResending || expiryTimeLeft <= 0}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition-all duration-300 shadow-lg shadow-violet-950/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Verifying Code...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={isPending || isResending || resendCooldown > 0}
                  className="w-full py-2.5 border border-slate-300 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/5 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Resending...
                    </>
                  ) : resendCooldown > 0 ? (
                    `Resend code in ${resendCooldown}s`
                  ) : (
                    <>
                      <RefreshCw className="h-3.5 w-3.5" />
                      Resend Code
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {successMessage && (
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You will be automatically redirected to the login page shortly,
                or click{" "}
                <Link
                  href="/login"
                  className="text-violet-500 hover:underline font-semibold"
                >
                  here
                </Link>{" "}
                to sign in now.
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
