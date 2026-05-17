"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrendingUp,
  User,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
} from "lucide-react";
import { registerUser } from "@/actions/auth";
import { useToast } from "@/components/Toast";
import GlassCard from "@/components/GlassCard";

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Client-side validations
    if (!name || !email || !password || !confirmPassword) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    startTransition(async () => {
      const res = await registerUser(formData);

      if (res.success) {
        setSuccessMessage("Registration successful! Redirecting to email verification...");
        showToast("Registration successful! Redirecting to email verification...", "success");

        // Redirect to email verification page after 1.5 seconds
        setTimeout(() => {
          router.push(`/verify?email=${encodeURIComponent(email)}`);
        }, 1500);
      } else {
        setErrorMessage(res.message);
        showToast(res.message, "error");
      }
    });
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 min-h-screen">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="flex flex-col items-center mb-8">
          <div className="p-3 bg-violet-600/30 rounded-2xl border border-violet-500/40 shadow-xl shadow-violet-500/20 mb-3 animate-pulse">
            <TrendingUp className="h-8 w-8 text-violet-400" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent">
            Expensify
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            Track daily expenses elegantly
          </p>
        </div>

        {/* Register frosted card */}
        <GlassCard
          glow
          className="relative overflow-hidden border-violet-500/10 shadow-2xl"
        >
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Create Account
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Register to request budget-tracking privileges.
          </p>

          {/* Validation Alert */}
          {errorMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium animate-shake">
              <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Approval Modal-like Banner */}
          {successMessage && (
            <div className="mb-5 flex items-start gap-2.5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400 animate-bounce" />
              <div className="flex flex-col gap-1">
                <span className="font-bold text-sm">Request Submitted!</span>
                <span>{successMessage}</span>
                <span className="text-[10px] text-slate-400 mt-1 animate-pulse">
                  Redirecting to login shortly...
                </span>
              </div>
            </div>
          )}

          {!successMessage && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Full Name Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    name="name"
                    required
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Email Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl glass-input text-sm"
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  Password (min 6 chars)
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl glass-input text-sm"
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-500 hover:text-violet-400 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    placeholder="••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl glass-input text-sm"
                    disabled={isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-500 hover:text-violet-400 transition-colors cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isPending}
                className="mt-2 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl transition-all duration-300 shadow-lg shadow-violet-950/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Request...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </form>
          )}

          {/* Footer Login Link */}
          {!successMessage && (
            <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 font-semibold transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}
        </GlassCard>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          25% {
            transform: translateX(-4px);
          }
          75% {
            transform: translateX(4px);
          }
        }
        .animate-shake {
          animation: shake 0.2s ease-in-out 2;
        }
      `}</style>
    </div>
  );
}
