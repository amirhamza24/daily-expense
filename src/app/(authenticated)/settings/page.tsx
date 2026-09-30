"use client";

import React, { useState, useTransition } from "react";
import PageHeader from "@/components/PageHeader";
import { useToast } from "@/components/Toast";
import { useConfirm, confirmPresets } from "@/components/ConfirmModal";
import { Trash2, Loader2, Sun, Moon, LogOut, Languages, Settings as SettingsIcon } from "lucide-react";
import { logoutUser } from "@/actions/auth";
import { useRouter } from "next/navigation";

import { useTheme } from "@/components/ThemeProvider";
import { useI18n } from "@/components/I18nProvider";
import SegmentIndicator from "@/components/SegmentIndicator";
import type { Locale } from "@/lib/i18n/config";
import { getMessagesFor } from "@/lib/i18n/messages";

type Theme = "light" | "dark";

// Each language is shown in its own script so it is recognisable either way
const LANGUAGE_OPTIONS: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "bn", label: "বাংলা" },
];

export default function SettingsPage() {
  const { showToast } = useToast();
  const confirmAction = useConfirm();
  const router = useRouter();
  const { m, locale, setLocale, switching } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [enableAlerts, setEnableAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // Use the global theme context
  const { theme, setTheme } = useTheme();

  const applyTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    showToast(m.settings.switchedTheme(newTheme), "success");
  };

  const applyLanguage = async (next: Locale) => {
    if (next === locale) return;
    await setLocale(next);
    // Confirm in the language just chosen
    showToast(getMessagesFor(next).settings.languageChanged, "success");
  };

  const handleClearHistory = async () => {
    const ok = await confirmAction(confirmPresets.clearHistory(m));
    if (!ok) return;
    startTransition(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      showToast(m.settings.ledgerCleared, "success");
    });
  };

  const handleLogout = async () => {
    const ok = await confirmAction(confirmPresets.logout(m));
    if (!ok) return;
    const res = await logoutUser();
    if (res.success) {
      showToast(m.loggedOut, "success");
      router.push("/login");
      router.refresh();
    } else {
      showToast(res.message, "error");
    }
  };

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: m.settings.light, icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: m.settings.dark, icon: <Moon className="h-4 w-4" /> },
  ];

  return (
    <>
      <PageHeader icon={SettingsIcon} title={m.settings.title} description={m.settings.description} />

      <section className="card overflow-hidden max-w-3xl divide-y divide-line">
        <div className="card-head px-5 py-4">
          <h2 className="section-title">{m.settings.appearance}</h2>
        </div>
        <Row title={m.settings.theme} description={m.settings.themeHint}>
          <div className="segmented w-52">
            <SegmentIndicator />
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
        <Row title={m.settings.language} description={m.settings.languageHint}>
          <div className="segmented w-52" aria-busy={switching}>
            <SegmentIndicator />
            {LANGUAGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                lang={opt.value}
                data-active={locale === opt.value}
                onClick={() => applyLanguage(opt.value)}
              >
                {locale === opt.value && switching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Languages className="h-4 w-4" />
                )}
                {opt.label}
              </button>
            ))}
          </div>
        </Row>
      </section>

      <section className="card overflow-hidden max-w-3xl divide-y divide-line">
        <div className="card-head px-5 py-4">
          <h2 className="section-title">{m.settings.notifications}</h2>
        </div>
        <Row title={m.settings.inAppAlerts} description={m.settings.inAppAlertsHint}>
          <Switch
            checked={enableAlerts}
            onChange={() => setEnableAlerts(!enableAlerts)}
            label={m.settings.inAppAlerts}
          />
        </Row>
        <Row title={m.settings.weeklyDigest} description={m.settings.weeklyDigestHint}>
          <Switch
            checked={weeklyDigest}
            onChange={() => setWeeklyDigest(!weeklyDigest)}
            label={m.settings.weeklyDigest}
          />
        </Row>
      </section>

      <section className="card overflow-hidden max-w-3xl divide-y divide-line">
        <div className="card-head px-5 py-4">
          <h2 className="section-title">{m.settings.account}</h2>
        </div>
        <Row title={m.settings.signOut} description={m.settings.signOutHint}>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            <LogOut />
            {m.settings.signOut}
          </button>
        </Row>
        <Row title={m.settings.resetLedger} description={m.settings.resetLedgerHint}>
          <button
            onClick={handleClearHistory}
            disabled={isPending}
            className="btn btn-danger-soft btn-sm"
          >
            {isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {m.settings.resetting}
              </>
            ) : (
              <>
                <Trash2 />
                {m.settings.resetLedger}
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
