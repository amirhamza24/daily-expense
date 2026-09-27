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
      <p className="px-2.5 mb-1.5 text-[11px] font-medium text-faint">{title}</p>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => setIsOpen(false)}
              className={`group relative flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[13px] font-medium transition-colors duration-150 ${
                active
                  ? "bg-subtle text-fg"
                  : "text-muted hover:text-fg hover:bg-subtle/70"
              }`}
            >
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] rounded-r-full bg-accent transition-all duration-300 ${
                  active ? "h-4 opacity-100" : "h-0 opacity-0"
                }`}
              />
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  active ? "text-accent" : "text-faint group-hover:text-muted"
                }`}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== undefined && (
                <span className="min-w-5 h-5 px-1.5 inline-flex items-center justify-center rounded-full bg-danger text-[11px] font-semibold text-white tabular">
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
    <Link href="/dashboard" onClick={() => setIsOpen(false)} className="flex items-center gap-2.5">
      <span className="h-7 w-7 rounded-lg bg-accent text-white flex items-center justify-center shadow-sm">
        <Wallet className="h-4 w-4" />
      </span>
      <span className="font-semibold text-[15px] tracking-tight text-fg">Expensify</span>
    </Link>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-surface border-r border-line">
      <div className="h-14 flex items-center px-4 shrink-0">{brand}</div>

      <div className="flex-1 overflow-y-auto px-2.5 py-3 flex flex-col gap-5 scrollbar-hide">
        {renderGroup("Workspace", navItems)}
        {renderGroup("Account", accountItems)}
        {user.role === "ADMIN" && renderGroup("Admin", adminItems)}
      </div>

      <div className="shrink-0 border-t border-line p-2.5 flex flex-col gap-1">
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-2.5 h-8 px-2.5 rounded-md text-[13px] font-medium text-muted hover:text-fg hover:bg-subtle/70 transition-colors cursor-pointer"
        >
          {theme === "dark" ? (
            <Sun className="h-4 w-4 text-faint" />
          ) : (
            <Moon className="h-4 w-4 text-faint" />
          )}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>

        <div className="flex items-center gap-2.5 px-2 py-2 mt-1 rounded-lg">
          <div className="h-8 w-8 shrink-0 rounded-full bg-accent-soft text-accent-fg flex items-center justify-center text-xs font-semibold">
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
      <aside className="hidden md:block w-60 h-screen sticky top-0 shrink-0">
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
        className={`md:hidden fixed inset-y-0 left-0 z-50 w-64 shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
