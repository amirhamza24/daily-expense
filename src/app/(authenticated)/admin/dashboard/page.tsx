import React from "react";
import { getSession } from "@/lib/auth";
import { getAdminOverview } from "@/actions/admin";
import { redirect } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import Link from "next/link";
import {
  ShieldAlert,
  Users,
  UserCheck,
  UserX,
  TrendingDown,
  Activity,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";

export const revalidate = 0; // Disable caching

export default async function AdminDashboardPage() {
  const sessionUser = await getSession();

  // Guard: Admins only
  if (
    !sessionUser ||
    sessionUser.role !== "ADMIN" ||
    sessionUser.status !== "APPROVED"
  ) {
    redirect("/dashboard");
  }

  try {
    const overview = await getAdminOverview();

    return (
      <>
        {/* Title Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-violet-500 dark:text-violet-400 shrink-0" />
              Administrative Overview
            </h2>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
              System health audit metrics, aggregate user logs, and pending
              registration moderation.
            </p>
          </div>

          <Link
            href="/admin/users"
            className="px-4 py-3 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-pink-950/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Moderate Users
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Aggregate statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Total Platform Users */}
          <GlassCard className="border-violet-500/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Registered System Users
              </span>
              <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight">
              {overview.totalUsers}
            </h3>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">
              Total customer entries in platform registry
            </p>
          </GlassCard>

          {/* Card 2: Cumulative Platform Expenses */}
          <GlassCard className="border-pink-500/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Cumulative Expenses Logged
              </span>
              <div className="p-2 bg-pink-500/10 rounded-lg text-pink-400">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight">
              $
              {overview.totalSystemExpenses.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </h3>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">
              Sum total of all customer-logged expenses
            </p>
          </GlassCard>

          {/* Card 3: Pending Registration Backlog */}
          <GlassCard className="border-amber-500/10 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Pending Registrations
              </span>
              <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                <ShieldAlert className="h-5 w-5" />
              </div>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-900 dark:text-white mt-4 tracking-tight">
              {overview.pendingCount}
            </h3>
            <p className="text-[10px] text-amber-400 mt-2 font-medium flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping"></span>
              Moderation work item backlog
            </p>
          </GlassCard>
        </div>

        {/* Detailed User Clearance Counts Grid */}
        <GlassCard className="border-white/5 p-6 shadow-2xl flex flex-col gap-6">
          <div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">
              Clearance Status Registry Summary
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Platform users segmented by security clearance status
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Approved user count indicator */}
            <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <UserCheck className="h-4 w-4" />
                Approved
              </div>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
                {overview.approvedCount}
              </span>
            </div>

            {/* Pending count */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                <Activity className="h-4 w-4 animate-spin-slow" />
                Pending
              </div>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
                {overview.pendingCount}
              </span>
            </div>

            {/* Suspended count */}
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold uppercase tracking-wider">
                <UserX className="h-4 w-4" />
                Suspended
              </div>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
                {overview.suspendedCount}
              </span>
            </div>

            {/* Rejected count */}
            <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-rose-400 text-xs font-bold uppercase tracking-wider">
                <UserX className="h-4 w-4" />
                Rejected
              </div>
              <span className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">
                {overview.rejectedCount}
              </span>
            </div>
          </div>
        </GlassCard>
      </>
    );
  } catch (error) {
    console.error("Admin dashboard server page error:", error);
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-2xl glass-panel border border-rose-500/10">
        <h3 className="text-xl font-bold text-rose-400">
          Admin Service Connection Failure
        </h3>
        <p className="text-xs text-slate-400 mt-2 max-w-md">
          Unable to pull administrative indexes from the PostgreSQL server.
          Please verify database poolers.
        </p>
      </div>
    );
  }
}
