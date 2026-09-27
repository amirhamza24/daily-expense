import React from "react";
import { getSession } from "@/lib/auth";
import { getAdminOverview } from "@/actions/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, Users, TrendingDown, ArrowRight } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import ErrorState from "@/components/ErrorState";
import { formatMoney } from "@/lib/format";

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
        title="Couldn't load admin overview"
        message="The database didn't respond. Please refresh or try again shortly."
      />
    );
  }

  const statuses = [
    { label: "Approved", value: overview.approvedCount, dot: "bg-success" },
    { label: "Pending", value: overview.pendingCount, dot: "bg-warning" },
    { label: "Suspended", value: overview.suspendedCount, dot: "bg-danger" },
    { label: "Rejected", value: overview.rejectedCount, dot: "bg-faint" },
  ];
  const statusTotal = statuses.reduce((sum, s) => sum + s.value, 0);

  return (
    <>
      <PageHeader
        title="Admin overview"
        description="Platform activity and registrations that need attention."
        actions={
          <Link href="/admin/users" className="btn btn-primary">
            Manage users
            <ArrowRight />
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <div className="card card-interactive p-4">
          <div className="flex items-center justify-between">
            <span className="stat-label">Total users</span>
            <Users className="h-4 w-4 text-faint" />
          </div>
          <p className="stat-value mt-2">{overview.totalUsers}</p>
          <p className="text-xs text-faint mt-1">Registered accounts</p>
        </div>

        <div className="card card-interactive p-4">
          <div className="flex items-center justify-between">
            <span className="stat-label">Expenses logged</span>
            <TrendingDown className="h-4 w-4 text-faint" />
          </div>
          <p className="stat-value mt-2">{formatMoney(overview.totalSystemExpenses)}</p>
          <p className="text-xs text-faint mt-1">Across all users</p>
        </div>

        <Link href="/admin/users" className="card card-interactive p-4 block">
          <div className="flex items-center justify-between">
            <span className="stat-label">Pending approval</span>
            <ShieldAlert className="h-4 w-4 text-faint" />
          </div>
          <p className="stat-value mt-2">{overview.pendingCount}</p>
          <p className="text-xs mt-1 text-faint">
            {overview.pendingCount > 0 ? (
              <span className="text-warning font-medium">Needs review →</span>
            ) : (
              "All caught up"
            )}
          </p>
        </Link>
      </div>

      <section className="card p-5">
        <h2 className="section-title">Accounts by status</h2>
        <p className="section-subtitle">How every registered user is currently set</p>

        {/* Proportional bar */}
        <div className="mt-5 flex h-2 w-full overflow-hidden rounded-full bg-subtle">
          {statusTotal > 0 &&
            statuses.map((s) =>
              s.value > 0 ? (
                <div
                  key={s.label}
                  className={`${s.dot} h-full first:rounded-l-full last:rounded-r-full`}
                  style={{ width: `${(s.value / statusTotal) * 100}%` }}
                  title={`${s.label}: ${s.value}`}
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
              <dd className="text-xl font-semibold tabular text-fg mt-1">{s.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
