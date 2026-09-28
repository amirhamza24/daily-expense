"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Loader2, AlertCircle, LogIn, ArrowRight } from "lucide-react";
import { loginUser } from "@/actions/auth";
import { useToast } from "@/components/Toast";
import AuthShell, { AuthShellSkeleton } from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
  // The transition ends when loginUser returns, but the dashboard still has to
  // load; keep the button busy until this page unmounts.
  const [redirecting, setRedirecting] = useState(false);
  const busy = isPending || redirecting;
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
        setRedirecting(true);
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
    <AuthShell
      icon={LogIn}
      title="Welcome back"
      description="Sign in to continue tracking your expenses."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-accent-fg hover:underline underline-offset-4">
            Create one
          </Link>
        </>
      }
    >
      {errorMessage && (
        <div className="alert alert-danger mb-5 animate-shake flex-col gap-1.5!">
          <div className="flex items-start gap-2.5">
            <AlertCircle />
            <span>{errorMessage}</span>
          </div>
          {unverifiedEmail && (
            <Link
              href={`/verify?email=${encodeURIComponent(unverifiedEmail)}`}
              className="pl-6.5 font-medium underline underline-offset-4"
            >
              Verify your email now →
            </Link>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <div className="relative">
            <Mail className="input-icon" />
            <input
              id="email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="input pl-9 h-11"
              disabled={busy}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <PasswordInput
              className="h-11"
            id="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={busy}
          />
        </div>

        <button type="submit" disabled={busy} className="btn btn-primary btn-lg w-full h-11 mt-2">
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              {redirecting ? "Opening dashboard…" : "Signing in…"}
            </>
          ) : (
            <>
              Sign in
              <ArrowRight />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthShellSkeleton />}>
      <LoginContent />
    </Suspense>
  );
}
