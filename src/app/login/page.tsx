"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Loader2, AlertCircle } from "lucide-react";
import { loginUser } from "@/actions/auth";
import { useToast } from "@/components/Toast";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();
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
    <AuthShell
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
              className="input pl-9"
              disabled={isPending}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            disabled={isPending}
          />
        </div>

        <button type="submit" disabled={isPending} className="btn btn-primary btn-lg w-full mt-2">
          {isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center min-h-screen">
          <Loader2 className="h-6 w-6 animate-spin text-faint" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
