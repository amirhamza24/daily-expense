"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Loader2, AlertCircle, CheckCircle2, UserPlus } from "lucide-react";
import { registerUser } from "@/actions/auth";
import { useToast } from "@/components/Toast";
import AuthShell from "@/components/AuthShell";
import PasswordInput from "@/components/PasswordInput";
import { useI18n } from "@/components/I18nProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { m } = useI18n();
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
      setErrorMessage(m.auth.register.fillAll);
      return;
    }

    if (password.length < 6) {
      setErrorMessage(m.authServer.newPasswordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(m.authServer.passwordsMismatch);
      return;
    }

    startTransition(async () => {
      const res = await registerUser(formData);

      if (res.success) {
        setSuccessMessage(m.auth.register.successRedirect);
        showToast(m.auth.register.successRedirect, "success");

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
      icon={UserPlus}
      title={m.auth.register.title}
      description={m.auth.register.description}
      footer={
        !successMessage && (
          <>
            {m.auth.register.haveAccount}{" "}
            <Link href="/login" className="font-medium text-accent-fg hover:underline underline-offset-4">
              {m.auth.register.signIn}
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
            <p className="font-medium">{m.auth.register.created}</p>
            <p className="mt-0.5 opacity-90">{successMessage}</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="name">
              {m.auth.fullName}
            </label>
            <div className="relative">
              <User className="input-icon" />
              <input
                id="name"
                type="text"
                name="name"
                required
                autoComplete="name"
                placeholder={m.auth.namePlaceholder}
                className="input pl-9 h-11"
                disabled={isPending}
              />
            </div>
          </div>

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
                autoComplete="email"
                placeholder={m.auth.emailPlaceholder}
                className="input pl-9 h-11"
                disabled={isPending}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="password">
              {m.auth.password}
            </label>
            <PasswordInput
              className="h-11"
              id="password"
              name="password"
              required
              autoComplete="new-password"
              placeholder={m.auth.atLeast6}
              disabled={isPending}
            />
          </div>

          <div>
            <label className="label" htmlFor="confirmPassword">
              {m.auth.register.confirmPassword}
            </label>
            <PasswordInput
              className="h-11"
              id="confirmPassword"
              name="confirmPassword"
              required
              autoComplete="new-password"
              placeholder={m.auth.register.repeatPassword}
              disabled={isPending}
            />
          </div>

          <button type="submit" disabled={isPending} className="btn btn-primary btn-lg w-full h-11 mt-2">
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {m.auth.register.creating}
              </>
            ) : (
              m.auth.register.submit
            )}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
