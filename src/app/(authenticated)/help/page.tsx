"use client";

import React, { useState } from "react";
import GlassCard from "@/components/GlassCard";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Mail,
  LogIn,
  Wallet,
  LayoutDashboard,
  PlusCircle,
  Edit3,
  Trash2,
  Filter,
  Download,
  TrendingUp,
  History,
  BarChart3,
  User,
  Settings,
  ShieldCheck,
  Users,
  HelpCircle,
  AlertCircle,
  CheckCircle,
  Info,
  ExternalLink,
  FileText,
  Camera,
} from "lucide-react";
import Link from "next/link";

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  content: React.ReactNode;
}

function ScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <div className="my-4 rounded-xl border-2 border-dashed border-slate-300/40 dark:border-white/10 bg-slate-100/40 dark:bg-white/3 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-200/40 dark:border-white/5 bg-slate-200/30 dark:bg-white/5">
        <span className="h-3 w-3 rounded-full bg-rose-400/70" />
        <span className="h-3 w-3 rounded-full bg-amber-400/70" />
        <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
        <span className="ml-2 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
          expensify.app
        </span>
      </div>
      <div className="flex flex-col items-center justify-center gap-2 py-10 px-4">
        <Camera className="h-8 w-8 text-slate-300 dark:text-slate-600" />
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
          {label}
        </span>
        <span className="text-[10px] text-slate-300 dark:text-slate-600">
          Place screenshot at /public/screenshots/
        </span>
      </div>
    </div>
  );
}

function Step({
  num,
  children,
}: {
  num: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3 items-start">
      <span className="shrink-0 h-6 w-6 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-[11px] font-bold text-violet-500 dark:text-violet-400">
        {num}
      </span>
      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-0.5">
        {children}
      </p>
    </div>
  );
}

function InfoBox({
  type = "info",
  children,
}: {
  type?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-500/8 border-blue-500/20 text-blue-600 dark:text-blue-400",
    warning:
      "bg-amber-500/8 border-amber-500/20 text-amber-600 dark:text-amber-400",
    success:
      "bg-emerald-500/8 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  };
  const icons = {
    info: <Info className="h-4 w-4 shrink-0 mt-0.5" />,
    warning: <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />,
    success: <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />,
  };
  return (
    <div
      className={`flex gap-2.5 p-3 rounded-xl border text-xs leading-relaxed my-3 ${styles[type]}`}
    >
      {icons[type]}
      <span>{children}</span>
    </div>
  );
}

function TableRow({ cells }: { cells: string[] }) {
  return (
    <tr className="border-b border-slate-200/40 dark:border-white/5 last:border-0">
      {cells.map((c, i) => (
        <td
          key={i}
          className={`py-2.5 px-3 text-xs ${i === 0 ? "font-semibold text-slate-700 dark:text-slate-300 w-40" : "text-slate-500 dark:text-slate-400"}`}
        >
          {c}
        </td>
      ))}
    </tr>
  );
}

function SimpleTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: string[][];
}) {
  return (
    <div className="my-3 rounded-xl overflow-hidden border border-slate-200/40 dark:border-white/5">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-100/60 dark:bg-white/3">
            {headers.map((h) => (
              <th
                key={h}
                className="py-2 px-3 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <TableRow key={i} cells={row} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function HelpPage() {
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["getting-started"])
  );

  const toggle = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sections: Section[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <UserPlus className="h-5 w-5" />,
      color: "text-violet-500 dark:text-violet-400",
      content: (
        <div className="flex flex-col gap-5">
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-violet-400" />
              Step 1 — Register an Account
            </h4>
            <div className="flex flex-col gap-2.5">
              <Step num={1}>
                Go to the app. You will be redirected to the{" "}
                <strong>Login</strong> page.
              </Step>
              <Step num={2}>
                Click <strong>"Don't have an account? Register"</strong> at the
                bottom.
              </Step>
              <Step num={3}>
                Fill in your <strong>Full Name</strong>,{" "}
                <strong>Email Address</strong>, and{" "}
                <strong>Password</strong> (min 6 characters).
              </Step>
              <Step num={4}>
                Click <strong>"Create Account"</strong>. A verification email
                will be sent instantly.
              </Step>
            </div>
            <ScreenshotPlaceholder label="Screenshot: Registration Form" />
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Mail className="h-4 w-4 text-blue-400" />
              Step 2 — Verify Your Email
            </h4>
            <div className="flex flex-col gap-2.5">
              <Step num={1}>
                Check your email inbox for a message from Expensify.
              </Step>
              <Step num={2}>
                The email contains a <strong>6-digit verification code</strong>.
              </Step>
              <Step num={3}>
                Enter the 6 digits on the verification page and click{" "}
                <strong>"Verify Email"</strong>.
              </Step>
            </div>
            <InfoBox type="warning">
              Codes expire in <strong>2 minutes</strong>. Click "Resend Code"
              if yours expired. Wait 120 seconds between resend attempts.
            </InfoBox>
            <ScreenshotPlaceholder label="Screenshot: Email Verification Page" />
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              Step 3 — Wait for Admin Approval
            </h4>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              After email verification your account status is{" "}
              <strong className="text-amber-500">PENDING</strong>. An
              administrator must approve it before you can log in. Simply try
              logging in again after a short wait.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <LogIn className="h-4 w-4 text-emerald-400" />
              Step 4 — Log In
            </h4>
            <div className="flex flex-col gap-2.5">
              <Step num={1}>
                Go to the <strong>Login</strong> page.
              </Step>
              <Step num={2}>
                Enter your <strong>email</strong> and <strong>password</strong>.
              </Step>
              <Step num={3}>
                Click <strong>"Sign In"</strong>. You will land on your
                Dashboard.
              </Step>
            </div>
            <SimpleTable
              headers={["Error Message", "Cause"]}
              rows={[
                ["Account not verified", "Email OTP step not completed"],
                [
                  "Account pending approval",
                  "Admin hasn't approved yet",
                ],
                ["Account suspended", "Admin suspended your account"],
                ["Account rejected", "Admin rejected your registration"],
                ["Invalid credentials", "Wrong email or password"],
              ]}
            />
            <ScreenshotPlaceholder label="Screenshot: Login Page" />
          </div>
        </div>
      ),
    },
    {
      id: "budget-setup",
      title: "Setting Up Your Budget",
      icon: <Wallet className="h-5 w-5" />,
      color: "text-emerald-500 dark:text-emerald-400",
      content: (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Before tracking expenses, set your <strong>initial balance</strong>{" "}
            (your total budget). This is the ceiling your remaining balance
            counts down from.
          </p>
          <div className="flex flex-col gap-2.5">
            <Step num={1}>
              On the <strong>Dashboard</strong>, click the{" "}
              <strong>"Set Balance"</strong> button in the top area.
            </Step>
            <Step num={2}>
              Enter your <strong>Total Balance</strong> amount (e.g.,{" "}
              <code className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono">
                5000
              </code>
              ).
            </Step>
            <Step num={3}>
              Add an optional <strong>Note</strong> describing the source (e.g.,{" "}
              <em>Monthly salary</em>).
            </Step>
            <Step num={4}>
              Click <strong>"Save Balance"</strong>. Your dashboard now shows
              the total and remaining balance.
            </Step>
          </div>
          <InfoBox type="info">
            You can update your balance anytime. The remaining balance
            recalculates automatically from your transactions.
          </InfoBox>
          <ScreenshotPlaceholder label="Screenshot: Set Balance Modal" />
        </div>
      ),
    },
    {
      id: "dashboard",
      title: "Dashboard Overview",
      icon: <LayoutDashboard className="h-5 w-5" />,
      color: "text-indigo-500 dark:text-indigo-400",
      content: (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            The <strong>Dashboard</strong> is your home screen — a complete
            financial overview at a glance.
          </p>
          <ScreenshotPlaceholder label="Screenshot: Dashboard Overview" />
          <SimpleTable
            headers={["Section", "Description"]}
            rows={[
              ["Total Balance", "Your set budget ceiling"],
              [
                "Remaining Balance",
                "What's left after all recorded expenses",
              ],
              ["Today's Expenses", "All expenses recorded today"],
              ["This Month's Expenses", "Sum of expenses this calendar month"],
              ["All-time Total", "Every expense since account creation"],
              [
                "Monthly Credit",
                "Income recorded this month (adds to balance)",
              ],
              [
                "Monthly Debit",
                "Expenses recorded this month",
              ],
              [
                "Recent Transactions",
                "Your latest 5 entries with edit/delete buttons",
              ],
            ]}
          />
          <InfoBox type="success">
            From the dashboard you can directly <strong>add a new expense</strong>{" "}
            or <strong>set your balance</strong> using the quick-action buttons.
          </InfoBox>
        </div>
      ),
    },
    {
      id: "expenses",
      title: "Managing Expenses",
      icon: <PlusCircle className="h-5 w-5" />,
      color: "text-pink-500 dark:text-pink-400",
      content: (
        <div className="flex flex-col gap-6">
          <ScreenshotPlaceholder label="Screenshot: Expenses Page" />

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <PlusCircle className="h-4 w-4 text-emerald-400" />
              Adding an Expense
            </h4>
            <div className="flex flex-col gap-2.5">
              <Step num={1}>
                Click <strong>"+ Add Expense"</strong> (top-right of Expenses
                page or Dashboard).
              </Step>
              <Step num={2}>
                Fill in the form: <strong>Title</strong>,{" "}
                <strong>Amount</strong>, <strong>Category</strong>,{" "}
                <strong>Type</strong> (Debit/Credit), <strong>Date</strong>,
                and an optional <strong>Note</strong>.
              </Step>
              <Step num={3}>
                Click <strong>"Save Expense"</strong>. Your remaining balance
                updates immediately.
              </Step>
            </div>
            <InfoBox type="warning">
              If your remaining balance is less than the expense amount, the
              system will block the transaction with an error.
            </InfoBox>
            <ScreenshotPlaceholder label="Screenshot: Add Expense Modal" />
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-blue-400" />
              Editing an Expense
            </h4>
            <div className="flex flex-col gap-2.5">
              <Step num={1}>
                Click the <strong>pencil icon</strong> on any expense row.
              </Step>
              <Step num={2}>
                The modal opens pre-filled. Change the fields you need.
              </Step>
              <Step num={3}>
                Click <strong>"Update Expense"</strong>. Balance recalculates
                based on the difference.
              </Step>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-400" />
              Deleting an Expense
            </h4>
            <div className="flex flex-col gap-2.5">
              <Step num={1}>
                Click the <strong>trash icon</strong> on the expense row.
              </Step>
              <Step num={2}>
                A <strong>confirmation dialog</strong> appears. Read it before
                confirming.
              </Step>
              <Step num={3}>
                Click <strong>"Delete"</strong> to confirm. The amount is
                restored to your balance.
              </Step>
            </div>
            <InfoBox type="warning">
              Deletion is <strong>permanent</strong> and cannot be undone.
            </InfoBox>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-violet-400" />
              Filtering & Searching
            </h4>
            <SimpleTable
              headers={["Filter", "How to Use"]}
              rows={[
                ["Search", "Type any word from the expense title"],
                [
                  "Category",
                  "Select a specific category from the dropdown",
                ],
                [
                  "Date Range",
                  "Today / Yesterday / This Week / This Month / Custom",
                ],
                [
                  "Sort",
                  "Sort by Latest First or Highest Amount",
                ],
              ]}
            />
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Download className="h-4 w-4 text-teal-400" />
              Exporting to CSV
            </h4>
            <div className="flex flex-col gap-2.5">
              <Step num={1}>
                Apply any filters to narrow the data you want.
              </Step>
              <Step num={2}>
                Click the <strong>"Export CSV"</strong> button — exports{" "}
                <em>all matching records</em>, not just the visible page.
              </Step>
              <Step num={3}>
                A <code className="bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono">.csv</code>{" "}
                file downloads. Open in Excel or Google Sheets.
              </Step>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "income",
      title: "Recording Income",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-emerald-500 dark:text-emerald-400",
      content: (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Income is a special transaction that <strong>adds to your balance</strong>{" "}
            instead of deducting from it.
          </p>
          <div className="flex flex-col gap-2.5">
            <Step num={1}>
              Click <strong>"+ Add Expense"</strong>.
            </Step>
            <Step num={2}>
              Set the <strong>Type toggle</strong> to <strong>"Credit"</strong>,
              or choose <strong>"Income"</strong> from the category dropdown.
            </Step>
            <Step num={3}>
              Fill in title (e.g., <em>Freelance payment</em>), amount, and
              date.
            </Step>
            <Step num={4}>
              Save — your remaining balance <strong>increases</strong> by that
              amount.
            </Step>
          </div>
          <InfoBox type="info">
            Income entries appear in Analytics under the "Income" category and
            in the monthly credit total on the Dashboard.
          </InfoBox>
        </div>
      ),
    },
    {
      id: "transaction-history",
      title: "Transaction History",
      icon: <History className="h-5 w-5" />,
      color: "text-blue-500 dark:text-blue-400",
      content: (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            The <strong>Transaction History</strong> page shows a complete
            chronological ledger of every transaction with a running balance
            column.
          </p>
          <ScreenshotPlaceholder label="Screenshot: Transaction History" />
          <SimpleTable
            headers={["Column", "Description"]}
            rows={[
              ["Date", "When the transaction was recorded"],
              ["Title", "Name/description of the transaction"],
              ["Category", "Transaction category"],
              ["Type badge", "Green = Income, Red = Expense"],
              ["Amount", "Transaction value"],
              [
                "Running Balance",
                "Your balance after this specific transaction",
              ],
            ]}
          />
          <InfoBox type="info">
            This view is <strong>read-only</strong>. To edit or delete, go to
            the Expenses page.
          </InfoBox>
        </div>
      ),
    },
    {
      id: "analytics",
      title: "Analytics & Charts",
      icon: <BarChart3 className="h-5 w-5" />,
      color: "text-orange-500 dark:text-orange-400",
      content: (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            The <strong>Analytics</strong> page gives you visual insights into
            your spending habits through interactive charts.
          </p>
          <ScreenshotPlaceholder label="Screenshot: Analytics Charts" />
          <SimpleTable
            headers={["Chart / Section", "What It Shows"]}
            rows={[
              [
                "Spending by Category",
                "Bar chart — total spend per category across all time",
              ],
              [
                "6-Month Trend",
                "Line chart — monthly expense totals for the last 6 months",
              ],
              [
                "7-Day Pattern",
                "Bar chart — daily spending over the last 7 days",
              ],
              ["Highest Expense", "Your single largest transaction"],
              ["Lowest Expense", "Your smallest transaction"],
              ["Average Expense", "Mean amount across all transactions"],
              [
                "Top Category",
                "Category with the most transactions by count",
              ],
            ]}
          />
        </div>
      ),
    },
    {
      id: "profile",
      title: "Profile & Password",
      icon: <User className="h-5 w-5" />,
      color: "text-cyan-500 dark:text-cyan-400",
      content: (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            The <strong>Profile</strong> page shows your account details and
            lets you change your password.
          </p>
          <ScreenshotPlaceholder label="Screenshot: Profile Page" />
          <SimpleTable
            headers={["Field", "Description"]}
            rows={[
              ["Full Name & Email", "Your registered identity"],
              ["System Role", "USER or ADMIN"],
              [
                "Account Status",
                "APPROVED / PENDING / SUSPENDED / REJECTED",
              ],
              ["Member Since", "Exact registration date and time"],
              [
                "Approved By",
                "Admin's name and when approval was granted",
              ],
            ]}
          />

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3">
              Changing Your Password
            </h4>
            <div className="flex flex-col gap-2.5">
              <Step num={1}>
                Click <strong>"Change Password"</strong> on the profile page.
              </Step>
              <Step num={2}>
                Enter your <strong>Current Password</strong>, then{" "}
                <strong>New Password</strong> (min 6 characters), then{" "}
                <strong>Confirm New Password</strong>.
              </Step>
              <Step num={3}>
                Click <strong>"Update Password"</strong>. Use the new password
                on next login.
              </Step>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "settings",
      title: "Settings",
      icon: <Settings className="h-5 w-5" />,
      color: "text-slate-500 dark:text-slate-400",
      content: (
        <div className="flex flex-col gap-4">
          <ScreenshotPlaceholder label="Screenshot: Settings Page" />
          <SimpleTable
            headers={["Setting", "Description"]}
            rows={[
              ["Light Mode", "Clean white workspace"],
              ["Dark Mode", "Deep dark glass mode (default)"],
              [
                "Interactive Toast Alerts",
                "Toggle success/error popup notifications on/off",
              ],
              [
                "Weekly Digest Email",
                "Toggle for summary email feature",
              ],
              [
                "Reset Transaction Ledger",
                "Deletes ALL expenses and resets balance to zero",
              ],
              ["Sign Out", "Logs you out of the application"],
            ]}
          />
          <InfoBox type="warning">
            <strong>Reset Transaction Ledger</strong> is irreversible. All
            expense records and balance will be permanently deleted.
          </InfoBox>
        </div>
      ),
    },
    {
      id: "admin",
      title: "Admin Guide",
      icon: <ShieldCheck className="h-5 w-5" />,
      color: "text-rose-500 dark:text-rose-400",
      content: (
        <div className="flex flex-col gap-6">
          <InfoBox type="info">
            Admin features are only visible to users with the{" "}
            <strong>ADMIN</strong> role. Look for "ADMIN CONTROL PANEL" in the
            sidebar.
          </InfoBox>

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-rose-400" />
              Admin Dashboard
            </h4>
            <ScreenshotPlaceholder label="Screenshot: Admin Dashboard" />
            <SimpleTable
              headers={["Metric", "Description"]}
              rows={[
                ["Total Users", "All registered users in the system"],
                [
                  "Total System Expenses",
                  "Sum of all expenses across all users",
                ],
                [
                  "Pending Approvals",
                  "Users waiting for account approval",
                ],
                ["Approved Users", "Active approved accounts count"],
                ["Suspended Users", "Currently suspended accounts"],
                ["Rejected Users", "Registration-rejected accounts"],
              ]}
            />
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-rose-400" />
              Managing Users (User Registry)
            </h4>
            <ScreenshotPlaceholder label="Screenshot: User Registry" />
            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Approving a New User
                </p>
                <div className="flex flex-col gap-2">
                  <Step num={1}>
                    Find the user with <strong>PENDING</strong> status.
                  </Step>
                  <Step num={2}>
                    Click <strong>"Approve"</strong> (green button) and confirm.
                  </Step>
                  <Step num={3}>
                    User status changes to <strong>APPROVED</strong> — they can
                    now log in.
                  </Step>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Suspending an Active User
                </p>
                <div className="flex flex-col gap-2">
                  <Step num={1}>
                    Find the <strong>APPROVED</strong> user.
                  </Step>
                  <Step num={2}>
                    Click <strong>"Suspend"</strong> and confirm. The user is
                    immediately blocked — even mid-session.
                  </Step>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">
                  Changing User Role
                </p>
                <div className="flex flex-col gap-2">
                  <Step num={1}>
                    Find an <strong>APPROVED</strong> user.
                  </Step>
                  <Step num={2}>
                    Click <strong>"Make Admin"</strong> or{" "}
                    <strong>"Make User"</strong> to toggle their role.
                  </Step>
                </div>
                <InfoBox type="warning">
                  You <strong>cannot remove your own admin role</strong>. This
                  prevents accidental lockout.
                </InfoBox>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "faq",
      title: "FAQ & Troubleshooting",
      icon: <HelpCircle className="h-5 w-5" />,
      color: "text-amber-500 dark:text-amber-400",
      content: (
        <div className="flex flex-col gap-4">
          {[
            {
              q: "I registered but can't log in.",
              a: "Your account needs email verification AND admin approval. Check that you completed the 6-digit OTP step, then wait for admin approval.",
            },
            {
              q: "My verification code expired.",
              a: "Codes expire in 2 minutes. Click 'Resend Code' on the verification page. You must wait at least 120 seconds between resend requests.",
            },
            {
              q: "I can't add an expense — balance error.",
              a: "Your remaining balance is less than the expense amount. Reduce the amount, delete old expenses to free up balance, or update your total balance via 'Set Balance' on the dashboard.",
            },
            {
              q: "I accidentally deleted an expense.",
              a: "Deletions are permanent and cannot be recovered. Always confirm carefully before deleting.",
            },
            {
              q: "My dashboard shows $0 remaining balance.",
              a: "You haven't set a balance yet. Click 'Set Balance' on the dashboard and enter your budget amount.",
            },
            {
              q: "I forgot my password.",
              a: "There is no automatic reset link. Contact your system administrator to reset your password manually.",
            },
            {
              q: "Does Expensify work on mobile?",
              a: "Yes — fully responsive. On mobile, the sidebar becomes a hamburger menu accessible from the top navigation bar.",
            },
            {
              q: "As admin, why can't I demote myself?",
              a: "Safety feature to prevent accidental lockout. Another admin must change your role if needed.",
            },
          ].map(({ q, a }) => (
            <div
              key={q}
              className="p-4 rounded-xl bg-slate-50/50 dark:bg-white/2 border border-slate-200/40 dark:border-white/5"
            >
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">
                Q: {q}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {a}
              </p>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "categories",
      title: "Expense Categories Reference",
      icon: <FileText className="h-5 w-5" />,
      color: "text-teal-500 dark:text-teal-400",
      content: (
        <div className="flex flex-col gap-3">
          <SimpleTable
            headers={["Category", "Use For"]}
            rows={[
              ["Food", "Meals, groceries, snacks, restaurants"],
              ["Transport", "Fuel, bus fare, ride-sharing, parking"],
              ["Shopping", "Clothes, electronics, household items"],
              ["Bills", "Electricity, water, internet, rent"],
              ["Medicine", "Doctor visits, prescriptions, health"],
              ["Education", "Tuition, books, courses, workshops"],
              [
                "Entertainment",
                "Movies, games, subscriptions, hobbies",
              ],
              [
                "Income ★",
                "Salary, freelance, side income — ADDS to balance",
              ],
              [
                "Others",
                "Anything that doesn't fit the categories above",
              ],
            ]}
          />
          <InfoBox type="success">
            The <strong>Income</strong> category is special — it increases your
            remaining balance instead of decreasing it.
          </InfoBox>
        </div>
      ),
    },
  ];

  return (
    <>
      {/* Header */}
      <div>
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-wide bg-gradient-to-r from-slate-900 via-slate-700 to-indigo-600 dark:from-white dark:via-slate-200 dark:to-violet-400 bg-clip-text text-transparent w-fit">
          Help Center
        </h2>
        <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Complete guide to using Expensify — from account creation to advanced
          features.
        </p>
      </div>

      {/* Download Manual Button */}
      <GlassCard className="border-violet-500/10 bg-violet-500/3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
              <BookOpen className="h-5 w-5 text-violet-500 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                Full User Manual (Markdown)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Download the complete reference document for offline reading.
              </p>
            </div>
          </div>
          <a
            href="/USER_MANUAL.md"
            download="Expensify_User_Manual.md"
            className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl transition-colors duration-200 shadow-md shadow-violet-500/20"
          >
            <Download className="h-4 w-4" />
            Download Manual
          </a>
        </div>
      </GlassCard>

      {/* Expand/Collapse All Controls */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
          {sections.length} sections — click any title to expand
        </p>
        <div className="flex gap-2">
          <button
            onClick={() =>
              setOpenSections(new Set(sections.map((s) => s.id)))
            }
            className="text-[11px] font-semibold text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 px-3 py-1.5 rounded-lg hover:bg-violet-500/5 transition-colors cursor-pointer"
          >
            Expand All
          </button>
          <button
            onClick={() => setOpenSections(new Set())}
            className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-500/5 transition-colors cursor-pointer"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="flex flex-col gap-3">
        {sections.map((section) => {
          const isOpen = openSections.has(section.id);
          return (
            <GlassCard key={section.id} className="p-0 overflow-hidden">
              {/* Section Header */}
              <button
                onClick={() => toggle(section.id)}
                className="w-full flex items-center justify-between px-6 py-4 text-left transition-colors duration-200 hover:bg-slate-100/50 dark:hover:bg-white/3 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className={section.color}>{section.icon}</span>
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {section.title}
                  </span>
                </div>
                <span className="text-slate-400 dark:text-slate-500 shrink-0">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </span>
              </button>

              {/* Section Content */}
              {isOpen && (
                <div className="px-6 pb-6 border-t border-slate-200/40 dark:border-white/5 pt-5">
                  {section.content}
                </div>
              )}
            </GlassCard>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-center gap-2 py-2">
        <Info className="h-3.5 w-3.5 text-slate-400" />
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Expensify v1.0 · For support contact your system administrator
        </p>
      </div>
    </>
  );
}
