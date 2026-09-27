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
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft, RefreshCw } from "lucide-react";
import { verifyEmailOTP, resendVerificationOTP } from "@/actions/auth";
import { useToast } from "@/components/Toast";
import AuthShell from "@/components/AuthShell";

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
    <AuthShell
      title="Check your email"
      description={
        <>
          We sent a 6-digit code to{" "}
          <span className="font-medium text-fg">{email || "your email"}</span>.
        </>
      }
      footer={
        <Link href="/register" className="inline-flex items-center gap-1.5 hover:text-fg transition-colors group">
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Back to registration
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
            Redirecting you to sign in…{" "}
            <Link href="/login" className="font-medium text-accent-fg hover:underline underline-offset-4">
              Go now
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="flex flex-col gap-5">
          <div>
            <label className="label">Verification code</label>
            <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
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
                  aria-label={`Digit ${idx + 1}`}
                  className={`input h-12 px-0 text-center text-lg font-semibold tabular transition-[border-color,box-shadow,transform] duration-150 ${
                    digit ? "border-line-strong" : ""
                  } focus:scale-[1.04]`}
                  disabled={isPending || isResending}
                  autoFocus={idx === 0}
                />
              ))}
            </div>
            <p className="text-xs text-faint mt-2">
              {expiryTimeLeft > 0 ? (
                <>
                  Code expires in{" "}
                  <span
                    className={`tabular font-medium ${expiryTimeLeft <= 60 ? "text-danger" : "text-muted"}`}
                  >
                    {formatTime(expiryTimeLeft)}
                  </span>
                </>
              ) : (
                <span className="text-danger font-medium">Code expired. Request a new one.</span>
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
                  Verifying…
                </>
              ) : (
                "Verify email"
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
                  Sending…
                </>
              ) : resendCooldown > 0 ? (
                <span className="tabular">Resend code in {resendCooldown}s</span>
              ) : (
                <>
                  <RefreshCw />
                  Resend code
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
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-screen">
          <Loader2 className="h-6 w-6 text-faint animate-spin" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
