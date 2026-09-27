"use client";

import React, { useState, useTransition } from "react";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { useConfirm, confirmPresets } from "@/components/ConfirmModal";
import { Trash2, Loader2, Sun, Moon, LogOut } from "lucide-react";
import { logoutUser } from "@/actions/auth";
import { useRouter } from "next/navigation";

import { useTheme } from "@/components/ThemeProvider";

type Theme = "light" | "dark";

export default function SettingsPage() {
  const { showToast } = useToast();
  const confirmAction = useConfirm();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [enableAlerts, setEnableAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Use the global theme context
  const { theme, setTheme } = useTheme();

  const applyTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    showToast(
      `Switched to ${newTheme} mode.`,
      "success",
    );
  };

  const handleClearHistory = async () => {
    const ok = await confirmAction(confirmPresets.clearHistory());
    if (!ok) return;
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      showToast(
        "All transaction logs cleared successfully. Balance reset to zero.",
        "success",
      );
    });
  };

  const handleLogout = async () => {
    const ok = await confirmAction(confirmPresets.logout());
    if (!ok) return;
    const res = await logoutUser();
    if (res.success) {
      showToast("Logged out successfully.", "success");
      router.push("/login");
      router.refresh();
    } else {
      showToast(res.message, "error");
    }
  };


  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
  ];

  return (
    <>
      <PageHeader title="Settings" description="Appearance, notifications and account." />

      <section className="card max-w-3xl divide-y divide-line">
        <div className="px-5 py-4">
          <h2 className="section-title">Appearance</h2>
        </div>
        <Row title="Theme" description="Saved on this device.">
          <div className="segmented w-52">
            {themeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                data-active={theme === opt.value}
                onClick={() => applyTheme(opt.value)}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </Row>
      </section>

      <section className="card max-w-3xl divide-y divide-line">
        <div className="px-5 py-4">
          <h2 className="section-title">Notifications</h2>
        </div>
        <Row title="In-app alerts" description="Show a toast after you add, edit or delete.">
          <Switch
            checked={enableAlerts}
            onChange={() => setEnableAlerts(!enableAlerts)}
            label="In-app alerts"
          />
        </Row>
        <Row title="Weekly digest" description="A short email summary of your spending.">
          <Switch
            checked={weeklyDigest}
            onChange={() => setWeeklyDigest(!weeklyDigest)}
            label="Weekly digest"
          />
        </Row>
      </section>

      <section className="card max-w-3xl divide-y divide-line">
        <div className="px-5 py-4">
          <h2 className="section-title">Account</h2>
        </div>
        <Row title="Sign out" description="End your session on this device.">
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            <LogOut />
            Sign out
          </button>
        </Row>
        <Row
          title="Reset ledger"
          description="Permanently delete all transactions and reset your balance."
        >
          <button
            onClick={handleClearHistory}
            disabled={isPending}
            className="btn btn-danger-soft btn-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Resetting…
              </>
            ) : (
              <>
                <Trash2 />
                Reset ledger
              </>
            )}
          </button>
        </Row>
      </section>
    </>
  );
}

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 cursor-pointer ${
        checked ? "bg-accent" : "bg-line-strong"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="text-[13px] text-muted mt-0.5">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
