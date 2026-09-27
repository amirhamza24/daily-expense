"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { registerUser } from "@/actions/auth";
import { useToast } from "@/components/Toast";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
        setSuccessMessage(
          "Registration successful! Redirecting to email verification...",
        );
        showToast(
          "Registration successful! Redirecting to email verification...",
          "success",
        );

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
    <AuthShell
      title="Create your account"
      description="Start tracking where your money goes."
      footer={
        !successMessage && (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-accent-fg hover:underline underline-offset-4">
              Sign in
            </Link>
          </>
        )
      }
    >
      {errorMessage && (
        <div className="alert alert-danger mb-5 animate-shake">
          <AlertCircle />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage ? (
        <div className="alert alert-success animate-fade-up">
          <CheckCircle2 />
          <div>
            <p className="font-medium">Account created</p>
            <p className="mt-0.5 opacity-90">{successMessage}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="name">
              Full name
            </label>
            <div className="relative">
              <User className="input-icon" />
              <input
                id="name"
                type="text"
                name="name"
                required
                autoComplete="name"
                placeholder="Jane Doe"
                className="input pl-9"
                disabled={isPending}
              />
            </div>
          </div>

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
              autoComplete="new-password"
              placeholder="At least 6 characters"
              disabled={isPending}
            />
          </div>

          <div>
            <label className="label" htmlFor="confirmPassword">
              Confirm password
            </label>
            <PasswordInput
              id="confirmPassword"
              name="confirmPassword"
              required
              autoComplete="new-password"
              placeholder="Repeat password"
              disabled={isPending}
            />
          </div>

          <button type="submit" disabled={isPending} className="btn btn-primary btn-lg w-full mt-2">
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
