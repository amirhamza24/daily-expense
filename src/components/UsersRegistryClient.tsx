"use client";

import React, { useState, useTransition } from "react";
import {
  UserCheck,
  UserX,
  Clock,
  Ban,
  Activity,
  Calendar,
  Shield,
  Loader2,
  Info,
  Search,
  Filter,
} from "lucide-react";
import GlassCard from "./GlassCard";
import { updateUserStatus, updateUserRole } from "@/actions/admin";
import { useToast } from "./Toast";
import { useConfirm, confirmPresets } from "./ConfirmModal";

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "USER";
  status: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED";
  approvedAt: Date | null;
  approvedBy: string | null;
  createdAt: Date;
}

interface UsersRegistryClientProps {
  initialUsers: UserRecord[];
}

export default function UsersRegistryClient({
  initialUsers,
}: UsersRegistryClientProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [isPending, startTransition] = useTransition();

  // Local state for search & category filtering
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "PENDING" | "APPROVED" | "SUSPENDED" | "REJECTED"
  >("ALL");

  const handleStatusChange = async (
    userId: string,
    userName: string,
    newStatus: "PENDING" | "APPROVED" | "REJECTED" | "SUSPENDED",
  ) => {
    const preset =
      newStatus === "APPROVED"
        ? confirmPresets.approveUser(userName)
        : newStatus === "SUSPENDED"
          ? confirmPresets.suspendUser(userName)
          : newStatus === "REJECTED"
            ? confirmPresets.rejectUser(userName)
            : confirmPresets.reactivateUser(userName);

    const ok = await confirm(preset);
    if (!ok) return;
    startTransition(async () => {
      const res = await updateUserStatus(userId, newStatus);
      if (res.success) {
        showToast(`User status updated to ${newStatus}.`, "success");
      } else {
        showToast(res.error || "Failed to update user status.", "error");
      }
    });
  };

  const handleRoleChange = async (
    userId: string,
    userName: string,
    newRole: "USER" | "ADMIN",
    currentRole: "USER" | "ADMIN",
  ) => {
    if (newRole === currentRole) return;
    const preset =
      newRole === "ADMIN"
        ? confirmPresets.promoteToAdmin(userName)
        : confirmPresets.demoteToUser(userName);
    const ok = await confirm(preset);
    if (!ok) return;
    startTransition(async () => {
      const res = await updateUserRole(userId, newRole);
      if (res.success) {
        showToast(`User role updated to ${newRole}.`, "success");
      } else {
        showToast(res.error || "Failed to update role.", "error");
      }
    });
  };

  // Filter users based on search term and selected tab
  const filteredUsers = initialUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTab = statusFilter === "ALL" || user.status === statusFilter;

    return matchesSearch && matchesTab;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wide">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            Approved
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs font-bold uppercase tracking-wide">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            Pending
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 text-xs font-bold uppercase tracking-wide">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse"></span>
            Suspended
          </span>
        );
      default:
        // REJECTED
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-slate-500/20 bg-slate-500/10 text-slate-400 text-xs font-bold uppercase tracking-wide">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-slate-400"></span>
            Rejected
          </span>
        );
    }
  };

  return (
    <>
      {/* Title Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent">
          User Security Registry
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Approve pending registration requests, audit credentials, or suspend
          user access privileges.
        </p>
      </div>

      {/* Local Filter Tools */}
      <GlassCard className="border-white/5 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Local Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search user registry by name or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
            />
          </div>

          {/* Filtering Tab buttons */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            {(
              ["ALL", "PENDING", "APPROVED", "SUSPENDED", "REJECTED"] as const
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`
                  px-4 py-2 rounded-xl transition-all duration-200 cursor-pointer
                  ${
                    statusFilter === tab
                      ? "bg-violet-600/30 border border-violet-500/40 text-violet-300 shadow-md shadow-violet-950/15"
                      : "border border-white/5 hover:bg-white/5 text-slate-400 hover:text-slate-200"
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Registry Table List */}
      <GlassCard className="border-white/5 p-4 md:p-6 shadow-2xl flex-1 flex flex-col min-h-[300px]">
        {filteredUsers.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <Info className="h-10 w-10 text-slate-500 mb-3" />
            <h4 className="font-semibold text-slate-800 dark:text-slate-300">
              No registry records found
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Either there are no registrations in this status segment, or your
              search query matches no records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="glass-table w-full text-left">
              <thead>
                <tr>
                  <th>Identity Details</th>
                  <th className="hidden md:table-cell">Reg Date</th>
                  <th className="hidden md:table-cell">Privilege</th>
                  <th>Clearance Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="group">
                    {/* User profile avatar, name & email */}
                    <td>
                      <div className="flex items-center gap-3">
                        {/* Compact Initials */}
                        <div className="h-9 w-9 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-slate-300 shrink-0">
                          {user.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 block truncate max-w-[140px] md:max-w-xs group-hover:text-violet-500 dark:group-hover:text-violet-400 transition-colors">
                            {user.name}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[140px] md:max-w-xs mt-0.5">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Registration Date */}
                    <td className="hidden md:table-cell text-xs text-slate-600 dark:text-slate-400 font-semibold">
                      {new Date(user.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>

                    {/* Privilege Role — editable dropdown for APPROVED users only */}
                    <td className="hidden md:table-cell">
                      <select
                        value={user.role}
                        disabled={user.status !== "APPROVED" || isPending}
                        onChange={(e) =>
                          handleRoleChange(
                            user.id,
                            user.name,
                            e.target.value as "USER" | "ADMIN",
                            user.role,
                          )
                        }
                        title={
                          user.status !== "APPROVED"
                            ? "Role can only be changed for APPROVED users"
                            : "Change user role"
                        }
                        className={`
                          px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide
                          border transition-colors duration-200 outline-none
                          ${
                            user.status !== "APPROVED"
                              ? "bg-slate-100/50 dark:bg-white/3 border-slate-200/50 dark:border-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50"
                              : user.role === "ADMIN"
                                ? "bg-violet-500/15 border-violet-500/30 text-violet-700 dark:text-violet-300 hover:border-violet-400/50 cursor-pointer"
                                : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:border-violet-500/30 hover:bg-violet-500/8 cursor-pointer"
                          }
                        `}
                      >
                        <option value="USER" className="bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200">USER</option>
                        <option value="ADMIN" className="bg-white dark:bg-slate-900 text-violet-700 dark:text-violet-300">ADMIN</option>
                      </select>
                    </td>

                    {/* Status Badge */}
                    <td>{getStatusBadge(user.status)}</td>

                    {/* Moderation Controls */}
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {user.status === "PENDING" && (
                          <>
                            <button
                              onClick={() =>
                                handleStatusChange(user.id, user.name, "APPROVED")
                              }
                              disabled={isPending}
                              className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 cursor-pointer disabled:opacity-50"
                              title="Approve User"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() =>
                                handleStatusChange(user.id, user.name, "REJECTED")
                              }
                              disabled={isPending}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 cursor-pointer disabled:opacity-50"
                              title="Reject User"
                            >
                              <UserX className="h-4 w-4" />
                            </button>
                          </>
                        )}

                        {user.status === "APPROVED" &&
                          user.role !== "ADMIN" && (
                            <button
                              onClick={() =>
                                handleStatusChange(user.id, user.name, "SUSPENDED")
                              }
                              disabled={isPending}
                              className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/20 cursor-pointer disabled:opacity-50"
                              title="Suspend User"
                            >
                              <Ban className="h-4 w-4" />
                            </button>
                          )}

                        {user.status === "SUSPENDED" && (
                          <button
                            onClick={() =>
                              handleStatusChange(user.id, user.name, "APPROVED")
                            }
                            disabled={isPending}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 cursor-pointer disabled:opacity-50"
                            title="Re-activate User"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}

                        {user.status === "REJECTED" && (
                          <button
                            onClick={() =>
                              handleStatusChange(user.id, user.name, "APPROVED")
                            }
                            disabled={isPending}
                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/20 cursor-pointer disabled:opacity-50"
                            title="Restore & Approve"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )}

                        {user.role === "ADMIN" && (
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider pr-2">
                            SYSTEM OWNER
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </>
  );
}
