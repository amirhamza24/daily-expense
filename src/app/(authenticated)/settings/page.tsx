"use client";

import React, { useState, useEffect, useTransition } from "react";
import GlassCard from "@/components/GlassCard";
import { useToast } from "@/components/Toast";
import { useConfirm, confirmPresets } from "@/components/ConfirmModal";
import {
  Bell,
  Eye,
  Trash2,
  Loader2,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  LogOut,
} from "lucide-react";
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
      `Switched to ${newTheme === "dark" ? "🌙 Dark" : "☀️ Light"} mode!`,
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

  const themeOptions: {
    value: Theme;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "light",
      label: "Light Mode",
      desc: "Clean white workspace",
      icon: <Sun className="h-5 w-5 text-amber-500" />,
    },
    {
      value: "dark",
      label: "Dark Mode",
      desc: "Deep dark glass mode",
      icon: <Moon className="h-5 w-5 text-violet-400" />,
    },
  ];

  return (
    <>
      {/* Title Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide bg-gradient-to-r from-slate-900 via-slate-700 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent w-fit">
          System Preferences
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Customize design parameters, notifications, and ledger records.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {/* ── Full-width Theme Switcher Card ── */}
        <GlassCard className="border-white/5 shadow-2xl flex flex-col gap-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200/50 dark:border-white/5">
            <Sparkles className="h-5 w-5 text-violet-500 dark:text-violet-400" />
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
              Workspace Theme
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Choose your preferred color scheme. Your selection is saved and
              persists across sessions.
            </p>

            {/* Theme Selector Grid */}
            <div className="grid grid-cols-2 gap-3">
              {themeOptions.map((opt) => {
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => applyTheme(opt.value)}
                    className={`
                      relative flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer
                      ${
                        isActive
                          ? "border-violet-500 bg-violet-500/10 dark:bg-violet-500/10 shadow-md shadow-violet-500/10"
                          : "border-slate-200/50 bg-slate-100/50 dark:border-white/10 dark:bg-white/3 hover:border-violet-500/30 hover:bg-slate-200/50 dark:hover:bg-white/5"
                      }
                    `}
                  >
                    <div
                      className={`p-2 rounded-lg ${isActive ? "bg-violet-500/20" : "bg-white/5"}`}
                    >
                      {opt.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm font-bold block ${isActive ? "text-violet-600 dark:text-violet-300" : "text-slate-700 dark:text-slate-300"}`}
                      >
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                    {/* Active dot indicator */}
                    {isActive && (
                      <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-violet-500 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Current active theme badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/15">
              <Monitor className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-[10px] text-violet-400 font-semibold tracking-wide uppercase">
                Active:{" "}
                {theme === "light" ? "☀️ Light Mode" : "🌙 Dark Glow Mode"}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Bottom two cards row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          {/* Notification Preferences */}
          <GlassCard className="border-white/5 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200/50 dark:border-white/5">
              <Bell className="h-5 w-5 text-pink-500 dark:text-pink-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Notification Alerts
              </h3>
            </div>

            <div className="flex flex-col gap-4">
              {/* Toggle 1 */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Interactive Toast Alerts
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Show status banners on CRUD
                  </span>
                </div>
                <button
                  onClick={() => setEnableAlerts(!enableAlerts)}
                  className={`w-10 h-6 rounded-full transition-all duration-300 relative border ${
                    enableAlerts
                      ? "bg-violet-600/30 border-violet-500/50"
                      : "bg-white/5 border-white/10"
                  } cursor-pointer`}
                >
                  <span
                    className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-slate-100 transition-all duration-300 ${enableAlerts ? "left-4.5" : "left-0.5"}`}
                  />
                </button>
              </div>

              {/* Toggle 2 */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Weekly Digest Email
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Summarized stats of expenses
                  </span>
                </div>
                <button
                  onClick={() => setWeeklyDigest(!weeklyDigest)}
                  className={`w-10 h-6 rounded-full transition-all duration-300 relative border ${
                    weeklyDigest
                      ? "bg-violet-600/30 border-violet-500/50"
                      : "bg-white/5 border-white/10"
                  } cursor-pointer`}
                >
                  <span
                    className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-slate-100 transition-all duration-300 ${weeklyDigest ? "left-4.5" : "left-0.5"}`}
                  />
                </button>
              </div>

              {/* Glass status */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-white/5">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Glassmorphism Panels
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                    Frosted CSS and blurs active
                  </span>
                </div>
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
            </div>
          </GlassCard>

          {/* Danger Zone: Ledger + Logout */}
          <GlassCard className="border-white/5 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200/50 dark:border-white/5">
              <Trash2 className="h-5 w-5 text-rose-500 dark:text-rose-400" />
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                Danger Zone
              </h3>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Reset your budget limits and clear all transactional records to
                start fresh. This process is irreversible!
              </p>

              <button
                onClick={handleClearHistory}
                disabled={isPending}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/20 hover:border-rose-500/35 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Wiping records...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Reset Transaction Ledger
                  </>
                )}
              </button>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full py-2.5 bg-white/3 hover:bg-rose-500/8 text-slate-400 hover:text-rose-400 font-semibold text-xs border border-white/8 hover:border-rose-500/20 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sign Out of Account
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </>
  );
}
