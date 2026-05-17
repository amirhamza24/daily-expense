"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  TrendingUp,
  Mail,
  Lock,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from "lucide-react";
import { loginUser } from "@/actions/auth";
import { useToast } from "@/components/Toast";
import GlassCard from "@/components/GlassCard";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    searchParams.get("error") === "suspended"
      ? "Your session was terminated. Your account has been suspended."
      : null,
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setUnverifiedEmail(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    startTransition(async () => {
      const res = await loginUser(formData);

      if (res.success) {
        showToast("Welcome back! Login successful.", "success");
        router.push("/dashboard");
        router.refresh();
      } else {
        setErrorMessage(res.message);
        showToast(res.message, "error");

        if (res.message === "Please verify your email first.") {
          setUnverifiedEmail(email);
        }
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
          <h1 className="text-3xl font-extrabold tracking-wide bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent">
            Expensify
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-semibold">
            Track daily expenses elegantly
          </p>
        </div>

        {/* Login frosted card */}
        <GlassCard
          glow
          className="relative overflow-hidden border-violet-500/10 shadow-2xl"
        >
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Welcome Back
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Sign in to resume tracking your expenses.
          </p>

          {/* Real-time admin status rejection / suspension alert */}
          {errorMessage && (
            <div className="mb-5 flex flex-col gap-1.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium animate-shake">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
              {unverifiedEmail && (
                <div className="pl-7 mt-1">
                  <Link
                    href={`/verify?email=${encodeURIComponent(unverifiedEmail)}`}
                    className="text-violet-400 hover:text-violet-300 font-semibold underline transition-colors"
                  >
                    Verify your email now &rarr;
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
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
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-slate-500 hover:text-violet-400 transition-colors cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          {/* Footer Register Link */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-violet-600 dark:text-violet-400 hover:text-violet-500 dark:hover:text-violet-300 font-semibold transition-colors"
            >
              Create Account
            </Link>
          </div>
        </GlassCard>

        {/* Demo credentials tip */}
        {/* {process.env.NEXT_PUBLIC_HIDE_DEMO_CREDENTIALS !== "true" && (
          <div className="mt-6 flex flex-col gap-1.5 p-4 rounded-xl bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200/50 dark:border-white/5 text-center text-[10px] text-slate-500">
            <p className="font-semibold text-slate-650 dark:text-slate-400 uppercase tracking-wider">
              🔒 Demo Accounts
            </p>
            <div className="flex justify-around gap-2 mt-1">
              <div>
                <span className="font-medium text-slate-600 dark:text-slate-450">Admin:</span>{" "}
                <span className="text-slate-600 dark:text-slate-500">
                  {process.env.NEXT_PUBLIC_DEMO_ADMIN_EMAIL || "admin@expense.com"} / {process.env.NEXT_PUBLIC_DEMO_ADMIN_PASSWORD || "admin123"}
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-600 dark:text-slate-450">User:</span>{" "}
                <span className="text-slate-600 dark:text-slate-500">
                  {process.env.NEXT_PUBLIC_DEMO_USER_EMAIL || "user@expense.com"} / {process.env.NEXT_PUBLIC_DEMO_USER_PASSWORD || "user123"}
                </span>
              </div>
            </div>
          </div>
        )} */}
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
