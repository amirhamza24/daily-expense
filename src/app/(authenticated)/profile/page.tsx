import React from "react";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import PageHeader from "@/components/PageHeader";
import { initials } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
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
  const { m, fmt } = await getI18n();

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
    { icon: User, label: m.profile.fullName, value: fullUser.name },
    { icon: Mail, label: m.profile.email, value: fullUser.email },
    {
      icon: Shield,
      label: m.profile.role,
      value: fullUser.role === "ADMIN" ? m.profile.administrator : m.profile.user,
    },
    {
      icon: Calendar,
      label: m.profile.memberSince,
      value: fmt.date(fullUser.createdAt, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    },
    ...(fullUser.approvedBy
      ? [
          {
            icon: UserCheck,
            label: m.profile.approvedBy,
            value: `${fullUser.approvedBy}${
              fullUser.approvedAt ? ` · ${fmt.date(fullUser.approvedAt)}` : ""
            }`,
          },
        ]
      : []),
  ];

  return (
    <>
      <PageHeader icon={User} title={m.profile.title} description={m.profile.description} />

      <section className="card overflow-hidden max-w-3xl">
        <div className="card-head flex flex-col sm:flex-row sm:items-center gap-4 p-5">
          <div className="h-16 w-16 rounded-2xl bg-linear-to-br from-accent-2 to-accent text-white flex items-center justify-center text-xl font-semibold shrink-0 shadow-(--shadow-accent) animate-pop-in">
            {initials(fullUser.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-fg truncate">{fullUser.name}</h2>
            <p className="text-[13px] text-muted truncate">{fullUser.email}</p>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="badge badge-success badge-dot">{m.userStatus[fullUser.status]}</span>
              <span className="badge badge-accent">{m.userRole[fullUser.role]}</span>
            </div>
          </div>
          <ChangePasswordForm />
        </div>

        <dl className="divide-y divide-line stagger-rows">
          {details.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-subtle/60 animate-fade-in"
            >
              <span className="icon-tile h-8 w-8 rounded-lg">
                <Icon className="h-4 w-4" />
              </span>
              <dt className="w-32 shrink-0 text-[13px] text-muted">{label}</dt>
              <dd className="flex-1 min-w-0 text-sm font-medium text-fg truncate">{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
