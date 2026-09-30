import React from "react";
import { getSession } from "@/lib/auth";
import { getAdminOverview } from "@/actions/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, ShieldCheck, Users, TrendingDown, ArrowRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ErrorState from "@/components/ErrorState";
import { getI18n } from "@/lib/i18n/server";

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

  const { m, fmt } = await getI18n();
  const t = m.admin;

  let overview: {
    totalUsers: number;
    totalSystemExpenses: number;
    pendingCount: number;
    approvedCount: number;
    suspendedCount: number;
    rejectedCount: number;
  } | null = null;

  try {
    overview = await getAdminOverview();
  } catch (error) {
    console.error("Admin dashboard server page error:", error);
  }


  if (!overview) {
    return (
      <ErrorState
        title={t.overviewLoadError}
        message={t.overviewLoadMessage}
      />
    );
  }

  const statuses = [
    { label: m.userStatus.APPROVED, value: overview.approvedCount, dot: "bg-success" },
    { label: m.userStatus.PENDING, value: overview.pendingCount, dot: "bg-warning" },
    { label: m.userStatus.SUSPENDED, value: overview.suspendedCount, dot: "bg-danger" },
    { label: m.userStatus.REJECTED, value: overview.rejectedCount, dot: "bg-faint" },
  ];
  const statusTotal = statuses.reduce((sum, s) => sum + s.value, 0);

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        title={t.overviewTitle}
        description={t.overviewDesc}
        actions={
          <Link href="/admin/users" className="btn btn-primary">
            {t.manageUsers}
            <ArrowRight />
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="card card-interactive p-4 md:p-5">
          <div className="flex items-center justify-between">
            <span className="stat-label">{t.totalUsers}</span>
            <span className="icon-tile h-8 w-8 rounded-lg"><Users className="h-4 w-4" /></span>
          </div>
          <p className="stat-value mt-2">{fmt.number(overview.totalUsers)}</p>
          <p className="text-xs text-faint mt-1">{t.registered}</p>
        </div>

        <div className="card card-interactive p-4 md:p-5">
          <div className="flex items-center justify-between">
            <span className="stat-label">{t.expensesLogged}</span>
            <span className="icon-tile h-8 w-8 rounded-lg"><TrendingDown className="h-4 w-4" /></span>
          </div>
          <p className="stat-value mt-2">{fmt.money(overview.totalSystemExpenses)}</p>
          <p className="text-xs text-faint mt-1">{t.acrossUsers}</p>
        </div>

        <Link href="/admin/users" className="card card-interactive p-4 md:p-5 block">
          <div className="flex items-center justify-between">
            <span className="stat-label">{t.pendingApproval}</span>
            <span className="icon-tile h-8 w-8 rounded-lg"><ShieldAlert className="h-4 w-4" /></span>
          </div>
          <p className="stat-value mt-2">{fmt.number(overview.pendingCount)}</p>
          <p className="text-xs mt-1 text-faint">
            {overview.pendingCount > 0 ? (
              <span className="text-warning font-medium">{t.needsReview}</span>
            ) : (
              t.caughtUp
            )}
          </p>
        </Link>
      </div>

      <section className="card overflow-hidden">
        <div className="card-head px-5 py-4">
          <h2 className="section-title">{t.byStatus}</h2>
          <p className="section-subtitle">{t.byStatusHint}</p>
        </div>

        <div className="p-5 pt-0">
        {/* Proportional bar */}
        <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-muted-bg origin-left animate-[fade-in_0.6s_ease_both]">
          {statusTotal > 0 &&
            statuses.map((s) =>
              s.value > 0 ? (
                <div
                  key={s.label}
                  className={`${s.dot} h-full first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${(s.value / statusTotal) * 100}%` }}
                  title={`${s.label}: ${fmt.number(s.value)}`}
                />
              ) : null,
            )}
        </div>

        <dl className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-4">
          {statuses.map((s) => (
            <div key={s.label}>
              <dt className="flex items-center gap-2 text-[13px] text-muted">
                <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                {s.label}
              </dt>
              <dd className="text-xl font-semibold tabular text-fg mt-1">{fmt.number(s.value)}</dd>
            </div>
          ))}
        </dl>
        </div>
      </section>
    </>
  );
}
