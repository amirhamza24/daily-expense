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
  History,
  Sun,
  Moon,
  Wallet,
} from "lucide-react";
import { logoutUser } from "@/actions/auth";
import { useToast } from "./Toast";
import { useConfirm, confirmPresets } from "./ConfirmModal";
import { useTheme } from "./ThemeProvider";
import { initials } from "@/lib/format";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: "ADMIN" | "USER";
    status: string;
  };
  pendingUserCount?: number;
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

export default function Sidebar({ user, pendingUserCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const { theme, setTheme } = useTheme();
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

  const navItems: NavItem[] = [
    { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { label: "Expenses", path: "/expenses", icon: Receipt },
    { label: "History", path: "/transaction-history", icon: History },
    { label: "Analytics", path: "/analytics", icon: BarChart3 },
  ];

  const accountItems: NavItem[] = [
    { label: "Profile", path: "/profile", icon: User },
    { label: "Settings", path: "/settings", icon: Settings },
  ];

  const adminItems: NavItem[] = [
    { label: "Overview", path: "/admin/dashboard", icon: ShieldCheck },
    {
      label: "Users",
      path: "/admin/users",
      icon: Users,
      badge: pendingUserCount > 0 ? pendingUserCount : undefined,
    },
  ];

  const renderGroup = (title: string, items: NavItem[]) => (
    <div>
      <p className="px-3 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">
        {title}
      </p>
      <nav className="flex flex-col gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path || pathname.startsWith(`${item.path}/`);
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsOpen(false)}
              data-active={active}
              aria-current={active ? "page" : undefined}
              className="nav-link"
            >
              <Icon />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className={`min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full text-[11px] font-semibold tabular animate-pop-in ${
                    active ? "bg-white text-accent" : "bg-danger text-white"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );

  const brand = (
    <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5 group">
      <span className="icon-tile icon-tile-solid h-8 w-8 rounded-[10px] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
        <Wallet className="h-4! w-4!" />
      </span>
      <span className="font-semibold text-[15px] tracking-tight text-fg">
        Expens<span className="text-accent-fg">ify</span>
      </span>
    </Link>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface/85 backdrop-blur-xl border-r border-line">
      <div className="h-16 flex items-center px-5 shrink-0">{brand}</div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-6 scrollbar-hide">
        {renderGroup("Workspace", navItems)}
        {renderGroup("Account", accountItems)}
        {user.role === "ADMIN" && renderGroup("Admin", adminItems)}
      </div>

      <div className="shrink-0 border-t border-line p-3 flex flex-col gap-1.5">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="nav-link cursor-pointer"
        >
          <span key={theme} className="inline-flex animate-pop-in">
            {theme === "dark" ? <Sun /> : <Moon />}
          </span>
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <div className="flex items-center gap-2.5 p-2 rounded-xl bg-subtle border border-line">
          <div className="h-9 w-9 shrink-0 rounded-full bg-linear-to-br from-accent-2 to-accent text-white flex items-center justify-center text-xs font-semibold shadow-(--shadow-accent)">
            {initials(user.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-fg truncate leading-tight">
              {user.name}
            </p>
            <p className="text-xs text-faint truncate leading-tight mt-0.5">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="icon-btn icon-btn-danger"
            title="Log out"
            aria-label="Log out"
          >
            <LogOut />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-40 h-14 bg-surface/90 backdrop-blur-md border-b border-line px-4 flex items-center justify-between">
        {brand}
        <button
          onClick={() => setIsOpen((v) => !v)}
          className="icon-btn"
          aria-label={isOpen ? "Close menu" : "Open menu"}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </header>

      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 h-screen sticky top-0 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      <div
        onClick={() => setIsOpen(false)}
        className={`md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-72 bg-surface shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
