import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import {
  User,
  Mail,
  Shield,
  Calendar,
  CheckCircle2,
  UserCheck,
} from "lucide-react";

export const revalidate = 0;

export default async function ProfilePage() {
  const user = await getSession();

  if (!user || user.status !== "APPROVED") {
    redirect("/login");
  }

  // Fetch full details of user (like registration date) from database
  const fullUser = await import("@/lib/db").then((m) =>
    m.db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        approvedAt: true,
        approvedBy: true,
        createdAt: true,
      },
    }),
  );

  if (!fullUser) {
    redirect("/login");
  }

  return (
    <>
      {/* Title Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent">
          User Account Profile
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review and audit your login parameters and security clearance
          credentials.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left column: Avatar Initials Card */}
        <GlassCard className="md:col-span-1 border-white/5 flex flex-col items-center text-center p-8 shadow-2xl">
          <div className="h-24 w-24 rounded-2xl bg-violet-100 dark:bg-violet-600/20 border-2 border-violet-200 dark:border-violet-500/40 flex items-center justify-center font-black text-3xl text-violet-600 dark:text-violet-300 shadow-xl shadow-violet-500/10 mb-5 animate-pulse">
            {fullUser.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .substring(0, 2)
              .toUpperCase()}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{fullUser.name}</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {fullUser.email}
          </span>

          <div className="mt-6 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wide">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {fullUser.status}
          </div>
        </GlassCard>

        {/* Right column: Audit parameters */}
        <GlassCard className="md:col-span-2 border-white/5 p-6 shadow-2xl">
          <h4 className="font-bold text-base text-slate-900 dark:text-slate-100 mb-6 pb-2 border-b border-slate-200/50 dark:border-white/5">
            Security Clearance Parameters
          </h4>

          <div className="flex flex-col gap-4">
            {/* Row 1: Name */}
            <div className="flex items-center gap-4 py-2 border-b border-slate-100 dark:border-white/2">
              <div className="p-2.5 bg-slate-100 dark:bg-white/2 rounded-lg text-slate-500">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Full Name
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                  {fullUser.name}
                </span>
              </div>
            </div>

            {/* Row 2: Email */}
            <div className="flex items-center gap-4 py-2 border-b border-slate-100 dark:border-white/2">
              <div className="p-2.5 bg-slate-100 dark:bg-white/2 rounded-lg text-slate-500">
                <Mail className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Email Address
                </span>
                <span className="text-sm font-semibold text-slate-850 dark:text-slate-200 mt-0.5 block truncate">
                  {fullUser.email}
                </span>
              </div>
            </div>

            {/* Row 3: Role */}
            <div className="flex items-center gap-4 py-2 border-b border-slate-100 dark:border-white/2">
              <div className="p-2.5 bg-slate-100 dark:bg-white/2 rounded-lg text-slate-500">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  System Clearance Role
                </span>
                <span className="text-sm font-semibold text-violet-600 dark:text-violet-400 mt-0.5 block uppercase tracking-wide">
                  {fullUser.role}
                </span>
              </div>
            </div>

            {/* Row 4: Registration date */}
            <div className="flex items-center gap-4 py-2 border-b border-slate-100 dark:border-white/2">
              <div className="p-2.5 bg-slate-100 dark:bg-white/2 rounded-lg text-slate-500">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Registered Time
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {new Date(fullUser.createdAt).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>

            {/* Row 5: Approved by / Approved at */}
            {fullUser.approvedBy && (
              <div className="flex items-center gap-4 py-2">
                <div className="p-2.5 bg-slate-100 dark:bg-white/2 rounded-lg text-slate-500">
                  <UserCheck className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Approval Authority
                  </span>
                  <span className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5 block">
                    Approved by{" "}
                    <span className="text-violet-600 dark:text-violet-400">
                      {fullUser.approvedBy}
                    </span>{" "}
                    on{" "}
                    {fullUser.approvedAt
                      ? new Date(fullUser.approvedAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          },
                        )
                      : "N/A"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </>
  );
}
