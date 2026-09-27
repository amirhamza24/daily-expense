import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { formatDate, initials } from "@/lib/format";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import {
  User,
  Mail,
  Shield,
  Calendar,
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

  const details = [
    { icon: User, label: "Full name", value: fullUser.name },
    { icon: Mail, label: "Email", value: fullUser.email },
    {
      icon: Shield,
      label: "Role",
      value: fullUser.role === "ADMIN" ? "Administrator" : "User",
    },
    {
      icon: Calendar,
      label: "Member since",
      value: formatDate(fullUser.createdAt, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
    ...(fullUser.approvedBy
      ? [
          {
            icon: UserCheck,
            label: "Approved by",
            value: `${fullUser.approvedBy}${
              fullUser.approvedAt ? ` · ${formatDate(fullUser.approvedAt)}` : ""
            }`,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader title="Profile" description="Your account details and security." />

      <section className="card overflow-hidden max-w-3xl">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 border-b border-line">
          <div className="h-14 w-14 rounded-full bg-accent-soft text-accent-fg flex items-center justify-center text-lg font-semibold shrink-0">
            {initials(fullUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-fg truncate">{fullUser.name}</h2>
            <p className="text-[13px] text-muted truncate">{fullUser.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="badge badge-success badge-dot capitalize">
                {fullUser.status.toLowerCase()}
              </span>
              <span className="badge badge-accent capitalize">{fullUser.role.toLowerCase()}</span>
            </div>
          </div>
          <ChangePasswordForm />
        </div>

        <dl className="divide-y divide-line">
          {details.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3.5">
              <Icon className="h-4 w-4 text-faint shrink-0" />
              <dt className="w-32 shrink-0 text-[13px] text-muted">{label}</dt>
              <dd className="flex-1 min-w-0 text-sm font-medium text-fg truncate">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
