"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  BarChart3,
  User,
  Settings,
  ShieldCheck,
  Users,
  LogOut,
  Menu,
  X,
  TrendingUp,
  History,
} from "lucide-react";
import { logoutUser } from "@/actions/auth";
import { useToast } from "./Toast";
import { useConfirm, confirmPresets } from "./ConfirmModal";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: "ADMIN" | "USER";
    status: string;
  };
  pendingUserCount?: number;
}

export default function Sidebar({ user, pendingUserCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    const ok = await confirm(confirmPresets.logout());
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

  const navItems = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Expenses", path: "/expenses", icon: Receipt },
    { label: "Transaction History", path: "/transaction-history", icon: History },
    { label: "Analytics", path: "/analytics", icon: BarChart3 },
    { label: "Profile", path: "/profile", icon: User },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const adminItems = [
    { label: "Admin Dashboard", path: "/admin/dashboard", icon: ShieldCheck },
    { 
      label: "User Registry", 
      path: "/admin/users", 
      icon: Users,
      badge: pendingUserCount > 0 ? pendingUserCount : undefined
    },
  ];

  const isActive = (path: string) => pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-50/80 dark:bg-[#09090e] backdrop-blur-2xl border-r border-slate-200/50 dark:border-white/5 text-slate-800 dark:text-slate-100 overflow-hidden">
      {/* App Logo — always visible at top */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4 shrink-0">
        <div className="p-2.5 bg-violet-100 dark:bg-violet-600/30 rounded-xl border border-violet-200 dark:border-violet-500/40 shadow-lg shadow-violet-500/10 dark:shadow-violet-500/20">
          <TrendingUp className="h-6 w-6 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-wide text-slate-900 dark:text-white bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text dark:text-transparent">
            Expensify
          </h1>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium uppercase tracking-widest">
            Daily Tracker
          </p>
        </div>
      </div>

      {/* Navigation Links — scrollable */}
      <div className="flex-1 overflow-y-auto px-6 flex flex-col gap-6 pb-4 scrollbar-hide">
        {/* General section */}
        <div>
          <h2 className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-3 px-3">
            WORKSPACE
          </h2>
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                    ${
                      active
                        ? "bg-gradient-to-r from-indigo-500/10 to-violet-500/5 border-l-4 border-indigo-500 text-indigo-600 dark:from-violet-500/15 dark:to-indigo-500/10 dark:border-violet-500 dark:text-violet-400 shadow-sm dark:shadow-md dark:shadow-violet-950/10"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5"
                    }
                  `}
                >
                  <Icon
                    className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105 ${active ? "text-indigo-600 dark:text-violet-400" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"}`}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Administration section (Admins only) */}
        {user.role === "ADMIN" && (
          <div>
            <h2 className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-wider mb-3 px-3">
              ADMIN CONTROL PANEL
            </h2>
            <nav className="flex flex-col gap-1.5">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group
                      ${
                        active
                          ? "bg-gradient-to-r from-pink-500/10 to-rose-500/5 border-l-4 border-pink-500 text-pink-600 dark:from-pink-500/15 dark:to-rose-500/10 dark:border-pink-500 dark:text-pink-400 shadow-sm dark:shadow-md dark:shadow-pink-950/10"
                          : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-white/5"
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-105 ${active ? "text-pink-600 dark:text-pink-400" : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200"}`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="flex h-5 min-w-5 px-1.5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-[#09090e] animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}
      </div>

      {/* User Footer Profile & Logout — always pinned at bottom */}
      <div className="shrink-0 border-t border-slate-200/50 dark:border-white/5 px-6 pt-4 pb-5 flex flex-col gap-4">
        <div className="flex items-center gap-3 px-2">
          {/* Avatar Initials */}
          <div className="h-10 w-10 shrink-0 rounded-xl bg-violet-100 dark:bg-violet-600/20 border border-violet-200 dark:border-violet-500/30 flex items-center justify-center font-bold text-violet-600 dark:text-violet-300">
            {user.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
              {user.name}
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate uppercase tracking-wide">
                {user.role} • {user.status}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors w-full cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Header Bar */}
      <header className="md:hidden fixed top-0 left-0 w-full z-40 bg-white/95 dark:bg-[#09090e]/95 backdrop-blur-md border-b border-slate-200/50 dark:border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <span className="font-bold text-sm tracking-wide text-slate-900 dark:text-white">
            Expensify
          </span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 h-screen sticky top-0 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* Mobile Off-canvas Drawer */}
      <aside
        className={`
          md:hidden fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
