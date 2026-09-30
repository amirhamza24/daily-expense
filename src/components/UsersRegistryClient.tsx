"use client";

import React, { useState, useTransition } from "react";
import {
  UserCheck,
  UserX,
  Ban,
  Users,
  Search,
  User,
  Crown,
} from "lucide-react";
import PageHeader from "./PageHeader";
import { initials } from "@/lib/format";
import { useI18n } from "./I18nProvider";
import { updateUserStatus, updateUserRole } from "@/actions/admin";
import { useToast } from "./Toast";
import { useConfirm, confirmPresets } from "./ConfirmModal";
import { Select, type SelectOption } from "./Select";

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
  const { m, fmt } = useI18n();
  const t = m.admin;
  const [isPending, startTransition] = useTransition();
  const roleOptions: SelectOption<"USER" | "ADMIN">[] = [
    { value: "USER", label: m.userRole.USER, icon: User, iconClassName: "bg-subtle text-muted" },
    { value: "ADMIN", label: m.userRole.ADMIN, icon: Crown, iconClassName: "bg-warning-soft text-warning" },
  ];

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
        ? confirmPresets.approveUser(m, userName)
        : newStatus === "SUSPENDED"
          ? confirmPresets.suspendUser(m, userName)
          : newStatus === "REJECTED"
            ? confirmPresets.rejectUser(m, userName)
            : confirmPresets.reactivateUser(m, userName);

    const ok = await confirm(preset);
    if (!ok) return;
    startTransition(async () => {
      const res = await updateUserStatus(userId, newStatus);
      if (res.success) {
        showToast(t.statusUpdated(m.userStatus[newStatus]), "success");
      } else {
        showToast(res.error || t.statusFailed, "error");
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
        ? confirmPresets.promoteToAdmin(m, userName)
        : confirmPresets.demoteToUser(m, userName);
    const ok = await confirm(preset);
    if (!ok) return;
    startTransition(async () => {
      const res = await updateUserRole(userId, newRole);
      if (res.success) {
        showToast(t.roleUpdated(m.userRole[newRole]), "success");
      } else {
        showToast(res.error || t.roleFailed, "error");
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
        icon={Users}
        title={t.usersTitle}
        description={t.usersDesc}
      />

      <section className="card overflow-hidden">
        <div className="card-head flex flex-col lg:flex-row lg:items-center gap-3 p-3 md:p-4">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="input-icon" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.search}
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
                  className={`btn btn-sm shrink-0 ${
                    active ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  {tab === "ALL" ? t.all : m.userStatus[tab]}
                  <span
                    className={`tabular text-xs ${active ? "text-white/75" : "text-faint"}`}
                  >
                    {fmt.number(countFor(tab))}
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
            <p className="text-sm font-medium text-fg">{t.noneFound}</p>
            <p className="text-[13px] text-muted mt-1 max-w-sm">
              {t.noneFoundHint}
            </p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-[opacity,filter] ${isPending ? "is-refreshing" : ""}`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t.colUser}</th>
                  <th className="hidden md:table-cell">{t.colJoined}</th>
                  <th className="hidden md:table-cell">{t.colRole}</th>
                  <th>{t.colStatus}</th>
                  <th className="text-right!">{t.colActions}</th>
                </tr>
              </thead>
              <tbody className="stagger-rows" key={`${statusFilter}-${searchTerm}`}>
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
                      {fmt.date(user.createdAt)}
                    </td>

                    {/* Role — editable for APPROVED users only */}
                    <td className="hidden md:table-cell">
                      <Select<"USER" | "ADMIN">
                        value={user.role}
                        disabled={user.status !== "APPROVED" || isPending}
                        onChange={(role) => handleRoleChange(user.id, user.name, role, user.role)}
                        options={roleOptions}
                        title={
                          user.status !== "APPROVED" ? t.roleLocked : t.changeRole
                        }
                        aria-label={t.roleFor(user.name)}
                        size="sm"
                        className="w-32"
                      />
                    </td>

                    <td>
                      <span className={`badge badge-dot ${statusBadge[user.status]}`}>
                        {m.userStatus[user.status]}
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
                              {t.approve}
                            </button>
                            <button
                              onClick={() => handleStatusChange(user.id, user.name, "REJECTED")}
                              disabled={isPending}
                              className="icon-btn icon-btn-danger"
                              title={t.reject}
                              aria-label={t.reject}
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
                            title={t.suspend}
                            aria-label={t.suspend}
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
                            {user.status === "SUSPENDED" ? t.reactivate : t.approve}
                          </button>
                        )}

                        {user.status === "APPROVED" && user.role === "ADMIN" && (
                          <span className="text-xs text-faint pr-1">{m.userRole.ADMIN}</span>
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
