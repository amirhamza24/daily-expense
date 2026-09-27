"use client";

import React, { useState, useTransition } from "react";
import {
  UserCheck,
  UserX,
  Ban,
  Users,
  Search,
} from "lucide-react";
import PageHeader from "./PageHeader";
import { formatDate, initials } from "@/lib/format";
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

  const statusBadge: Record<UserRecord["status"], string> = {
    APPROVED: "badge-success",
    PENDING: "badge-warning",
    SUSPENDED: "badge-danger",
    REJECTED: "",
  };

  const countFor = (tab: typeof statusFilter) =>
    tab === "ALL" ? initialUsers.length : initialUsers.filter((u) => u.status === tab).length;

  return (
    <>
      <PageHeader
        title="Users"
        description="Approve new registrations and manage access."
      />

      <section className="card overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3 p-3 md:p-4 border-b border-line">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="input-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or email…"
              className="input pl-9"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto scrollbar-hide lg:ml-auto -mx-1 px-1">
            {(["ALL", "PENDING", "APPROVED", "SUSPENDED", "REJECTED"] as const).map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`btn btn-sm shrink-0 capitalize ${
                    active ? "bg-subtle text-fg border-line" : "btn-ghost"
                  }`}
                >
                  {tab.toLowerCase()}
                  <span
                    className={`tabular text-xs ${active ? "text-muted" : "text-faint"}`}
                  >
                    {countFor(tab)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center px-6 py-16">
            <div className="h-10 w-10 rounded-full bg-subtle flex items-center justify-center mb-3">
              <Users className="h-5 w-5 text-faint" />
            </div>
            <p className="text-sm font-medium text-fg">No users found</p>
            <p className="text-[13px] text-muted mt-1 max-w-sm">
              Nobody matches this search or status.
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity ${isPending ? "opacity-60" : ""}`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th className="hidden md:table-cell">Joined</th>
                  <th className="hidden md:table-cell">Role</th>
                  <th>Status</th>
                  <th className="text-right!">Actions</th>
                </tr>
              </thead>
              <tbody className="stagger-rows" key={statusFilter}>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-accent-soft text-accent-fg flex items-center justify-center text-xs font-semibold shrink-0">
                          {initials(user.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-fg truncate max-w-40 md:max-w-xs">
                            {user.name}
                          </p>
                          <p className="text-xs text-faint truncate max-w-40 md:max-w-xs">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="hidden md:table-cell text-muted whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>

                    {/* Role — editable for APPROVED users only */}
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
                            ? "Role can only be changed for approved users"
                            : "Change user role"
                        }
                        className="input h-8 w-28 text-[13px]"
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>

                    <td>
                      <span className={`badge badge-dot capitalize ${statusBadge[user.status]}`}>
                        {user.status.toLowerCase()}
                      </span>
                    </td>

                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {user.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(user.id, user.name, "APPROVED")}
                              disabled={isPending}
                              className="btn btn-secondary btn-sm"
                            >
                              <UserCheck className="text-success" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(user.id, user.name, "REJECTED")}
                              disabled={isPending}
                              className="icon-btn icon-btn-danger"
                              title="Reject"
                              aria-label="Reject"
                            >
                              <UserX />
                            </button>
                          </>
                        )}

                        {user.status === "APPROVED" && user.role !== "ADMIN" && (
                          <button
                            onClick={() => handleStatusChange(user.id, user.name, "SUSPENDED")}
                            disabled={isPending}
                            className="icon-btn icon-btn-danger"
                            title="Suspend"
                            aria-label="Suspend"
                          >
                            <Ban />
                          </button>
                        )}

                        {(user.status === "SUSPENDED" || user.status === "REJECTED") && (
                          <button
                            onClick={() => handleStatusChange(user.id, user.name, "APPROVED")}
                            disabled={isPending}
                            className="btn btn-secondary btn-sm"
                          >
                            <UserCheck className="text-success" />
                            {user.status === "SUSPENDED" ? "Reactivate" : "Approve"}
                          </button>
                        )}

                        {user.status === "APPROVED" && user.role === "ADMIN" && (
                          <span className="text-xs text-faint pr-1">Admin</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
