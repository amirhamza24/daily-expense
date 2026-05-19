# Expensify — User Manual

> **Version:** 1.0 | **App:** Daily Expense Tracker | **Date:** May 2026

---

## Table of Contents

1. [What is Expensify?](#what-is-expensify)
2. [Getting Started](#getting-started)
   - [Step 1: Register an Account](#step-1-register-an-account)
   - [Step 2: Verify Your Email](#step-2-verify-your-email)
   - [Step 3: Wait for Admin Approval](#step-3-wait-for-admin-approval)
   - [Step 4: Log In](#step-4-log-in)
3. [Setting Up Your Budget](#setting-up-your-budget)
4. [Dashboard](#dashboard)
5. [Managing Expenses](#managing-expenses)
   - [Adding an Expense](#adding-an-expense)
   - [Editing an Expense](#editing-an-expense)
   - [Deleting an Expense](#deleting-an-expense)
   - [Filtering & Searching](#filtering--searching)
   - [Exporting to CSV](#exporting-to-csv)
6. [Recording Income](#recording-income)
7. [Transaction History](#transaction-history)
8. [Analytics & Charts](#analytics--charts)
9. [Profile Page](#profile-page)
10. [Settings](#settings)
11. [Admin Guide](#admin-guide)
    - [Admin Dashboard](#admin-dashboard)
    - [Managing Users](#managing-users)
12. [FAQ & Troubleshooting](#faq--troubleshooting)
13. [Expense Categories Reference](#expense-categories-reference)

---

## What is Expensify?

**Expensify** is a full-featured daily expense tracking web application. It helps you:

- **Track every expense** — record where your money goes with categories, dates, and notes
- **Monitor your balance** — see your remaining budget at a glance, updated in real-time
- **Analyze spending patterns** — charts and insights reveal your habits
- **Record income** — credit transactions add to your balance automatically
- **Manage transaction history** — full chronological ledger with running balance

The app uses a **glassmorphism design** (frosted-glass visual style) and supports both **Light** and **Dark** modes.

---

## Getting Started

### Step 1: Register an Account

1. Go to the app's homepage. You will be redirected to the **Login** page.
2. Click **"Don't have an account? Register"** at the bottom of the login form.
3. Fill in the registration form:
   - **Full Name** — your display name (e.g., `John Doe`)
   - **Email Address** — must be unique and valid (a verification email will be sent)
   - **Password** — minimum 6 characters
4. Click **"Create Account"**.
5. You will see a success message. You are now redirected to the **Email Verification** page.

> **Note:** Your account status is **PENDING** after registration. You cannot log in yet until you verify your email AND an admin approves your account.

![Screenshot: Registration Form](screenshots/register.png)

---

### Step 2: Verify Your Email

1. Check your email inbox for a message from Expensify.
2. The email contains a **6-digit verification code** (OTP).
3. On the verification page, enter all 6 digits in the code boxes.
4. Click **"Verify Email"**.
5. You will see a confirmation message.

> **Code Expired?** Codes expire after **2 minutes**. Click **"Resend Code"** to get a new one. You must wait at least 120 seconds between resend requests.

![Screenshot: Email Verification Page](screenshots/verify.png)

---

### Step 3: Wait for Admin Approval

After email verification, your account is still **PENDING**. An administrator must review and approve your account before you can log in.

- **What to expect:** The admin will receive a notification that you have registered.
- **When approved:** You will be able to log in with your credentials.
- **If rejected or suspended:** You will see an error message when trying to log in.

> There is no automatic notification email when approved — simply try logging in after some time.

---

### Step 4: Log In

1. Go to the **Login** page.
2. Enter your **email address** and **password**.
3. Click **"Sign In"**.
4. If approved, you will be redirected to your **Dashboard**.

**Login error messages:**
| Message | Cause |
|---------|-------|
| "Account not verified" | Email OTP not completed |
| "Account pending approval" | Admin hasn't approved yet |
| "Account suspended" | Admin suspended your account |
| "Account rejected" | Admin rejected your registration |
| "Invalid credentials" | Wrong email or password |

![Screenshot: Login Page](screenshots/login.png)

---

## Setting Up Your Budget

Before tracking expenses, you need to set your **initial balance** (your total budget).

1. On the **Dashboard**, click **"Set Balance"** button (top-right area of balance card).
2. A modal dialog will appear. Enter:
   - **Total Balance** — your starting budget amount (e.g., `5000`)
   - **Note** — optional description (e.g., `Monthly salary`, `Pocket money`)
3. Click **"Save Balance"**.
4. Your dashboard now shows:
   - **Total Balance** — the amount you entered
   - **Remaining Balance** — starts equal to total, decreases with expenses

> You can update your balance anytime. The remaining balance will be **recalculated automatically** based on your recorded transactions.

---

## Dashboard

The **Dashboard** is your home screen. It gives you a complete financial overview at a glance.

![Screenshot: Dashboard Overview](screenshots/dashboard.png)

### Balance Cards (top section)
| Card | Description |
|------|-------------|
| **Total Balance** | Your set budget ceiling |
| **Remaining Balance** | What's left after expenses |

### Expense Summary Cards
| Card | Description |
|------|-------------|
| **Today's Expenses** | All expenses recorded for today |
| **This Month's Expenses** | Sum of all expenses this month |
| **All-time Total** | Every expense since account creation |

### Income vs. Debit (Monthly Breakdown)
- **Monthly Credit** — total income recorded this month
- **Monthly Debit** — total expenses this month
- **Net Remaining** — credit minus debit

### Recent Transactions
- Shows your **5 most recent** expense/income entries
- Each card displays: title, category icon, amount, date
- **Edit** (pencil icon) or **Delete** (trash icon) directly from here

### Quick Actions
- **"Set Balance"** button — opens balance setup modal
- **"Add Expense"** button — opens the add expense form

---

## Managing Expenses

Navigate to **Expenses** in the sidebar to access your full expense ledger.

![Screenshot: Expenses Page](screenshots/expenses.png)

### Adding an Expense

1. Click the **"+ Add Expense"** button (top-right).
2. The **Add Expense modal** opens. Fill in:
   - **Title** — what you spent on (e.g., `Lunch`, `Electricity bill`)
   - **Amount** — numeric value (e.g., `150.00`)
   - **Category** — select from the dropdown (see [Categories Reference](#expense-categories-reference))
   - **Type** — choose **Debit** (expense) or **Credit** (income)
   - **Date** — defaults to today; click to open date picker and change
   - **Note** — optional extra description
3. Click **"Save Expense"**.
4. The expense is saved, your remaining balance is updated, and a green success toast appears.

> **Insufficient Balance?** If you try to add a debit expense larger than your remaining balance, the system will block it with an error message.

![Screenshot: Add Expense Modal](screenshots/add-expense.png)

---

### Editing an Expense

1. In the expenses table, click the **pencil icon** on any row.
2. The same modal opens, pre-filled with the existing data.
3. Change any fields you need.
4. Click **"Update Expense"**.
5. The balance is recalculated automatically based on the difference.

---

### Deleting an Expense

1. Click the **trash icon** on the expense row.
2. A **confirmation dialog** appears — read carefully before proceeding.
3. Click **"Delete"** to confirm.
4. The expense is removed and your balance is restored.

> **Warning:** Deletion is permanent and cannot be undone.

---

### Filtering & Searching

Use the filter bar above the expenses table to find specific transactions:

| Filter | How to Use |
|--------|-----------|
| **Search** | Type any word from the expense title |
| **Category** | Select a specific category from the dropdown |
| **Date Range** | Choose: Today, Yesterday, This Week, This Month, or set a Custom range |
| **Sort** | Sort by "Latest First" or "Highest Amount" |

All filters work together — combine them to narrow results precisely.

---

### Exporting to CSV

1. Apply any filters you want (the export uses your current filter, not just the visible page).
2. Click the **"Export CSV"** button.
3. A `.csv` file downloads to your computer with all matching expenses.
4. Open in Excel, Google Sheets, or any spreadsheet app.

---

## Recording Income

Income is recorded as a special expense type that **adds to your balance** instead of deducting.

1. Click **"+ Add Expense"**.
2. Set the **Type toggle** to **"Credit"** (or select category **"Income"**).
3. Fill in the title (e.g., `Freelance payment`), amount, and date.
4. Save — your remaining balance increases by that amount.

> Income entries are shown in the analytics under the "Income" category and separately in the monthly breakdown on the dashboard.

---

## Transaction History

Navigate to **Transaction History** in the sidebar for a full chronological ledger.

![Screenshot: Transaction History](screenshots/transaction-history.png)

### What you see:
- **All transactions** from oldest to newest
- **Running Balance column** — shows your balance after each transaction
  - Starts from your initial total balance
  - Updates sequentially: income increases it, expenses decrease it
- **Type badge** — green "Income" or red "Expense"
- **Category**, **Date**, **Amount** for each entry

> This view is read-only. To edit/delete transactions, go to the **Expenses** page.

---

## Analytics & Charts

Navigate to **Analytics** in the sidebar for data-driven insights into your spending.

![Screenshot: Analytics Page](screenshots/analytics.png)

### Sections:

#### 1. Spending by Category
- Visual **bar/pie chart** showing how much you spent in each category
- Shows total amount per category across all time
- Larger bars = more spending in that category

#### 2. 6-Month Trend
- **Line chart** showing your monthly expenses for the last 6 months
- Identifies months where you spent more or less
- Helps spot trends (seasonal spending, etc.)

#### 3. 7-Day Weekly Pattern
- **Bar chart** of your daily spending over the last 7 days
- Shows which days of the week you spend the most

#### 4. Key Statistics
| Stat | Description |
|------|-------------|
| **Highest Expense** | Your single largest transaction |
| **Lowest Expense** | Your smallest transaction |
| **Average Expense** | Mean amount across all transactions |
| **Top Category** | Category with the most transactions |

---

## Profile Page

Navigate to **Profile** in the sidebar to see your account details.

![Screenshot: Profile Page](screenshots/profile.png)

### Information displayed:
- **Avatar** — initials from your name
- **Full Name** and **Email**
- **System Role** — USER or ADMIN
- **Account Status** — APPROVED, PENDING, SUSPENDED, or REJECTED
- **Member Since** — exact registration date and time
- **Approved By** — admin's name and date when your account was approved

### Changing Your Password

1. Click the **"Change Password"** button on the profile page.
2. A form appears below. Enter:
   - **Current Password** — your existing password
   - **New Password** — minimum 6 characters
   - **Confirm New Password** — repeat the new password
3. Click **"Update Password"**.
4. Your password is updated immediately. Use the new password next login.

---

## Settings

Navigate to **Settings** in the sidebar to customize preferences.

![Screenshot: Settings Page](screenshots/settings.png)

### Workspace Theme
- **Light Mode** — clean white workspace with subtle shadows
- **Dark Mode** — deep dark glass mode (default)
- Click a theme card to switch. Preference is saved and persists across sessions.

### Notification Alerts
- **Interactive Toast Alerts** — toggle on/off the success/error popup notifications
- **Weekly Digest Email** — toggle for email summary (UI feature)

### Danger Zone

> **Warning:** Actions in this section are irreversible.

| Action | What it Does |
|--------|-------------|
| **Reset Transaction Ledger** | Deletes ALL your expenses and resets balance to zero |
| **Sign Out** | Logs you out of the app |

Both actions require **confirmation** before executing.

---

## Admin Guide

> This section is for users with the **ADMIN** role only. Admin menu items appear in the sidebar under "ADMIN CONTROL PANEL".

---

### Admin Dashboard

Navigate to **Admin Dashboard** in the sidebar.

![Screenshot: Admin Dashboard](screenshots/admin-dashboard.png)

Shows system-wide statistics:
| Metric | Description |
|--------|-------------|
| **Total Users** | All registered users in the system |
| **Total System Expenses** | Sum of all expenses across all users |
| **Pending Approvals** | Users waiting for account approval |
| **Approved Users** | Active approved accounts |
| **Suspended Users** | Currently suspended accounts |
| **Rejected Users** | Registration-rejected accounts |

A pulsing badge on the **User Registry** sidebar link shows the pending count.

---

### Managing Users

Navigate to **User Registry** in the sidebar.

![Screenshot: User Registry](screenshots/admin-users.png)

#### Viewing Users
- All registered users are listed, newest first
- Each row shows: Name, Email, Role, Status, Registration Date, Approval Date

#### Searching & Filtering
- **Search box** — filter by name or email
- **Status filter** — show ALL, PENDING, APPROVED, SUSPENDED, or REJECTED users

#### Approving a New User
1. Find the user with **PENDING** status.
2. Click the **"Approve"** button (green).
3. A confirmation dialog appears.
4. Click **"Confirm"** — user status changes to APPROVED and they can now log in.

#### Rejecting a User
1. Find the user (usually PENDING).
2. Click the **"Reject"** button (red).
3. Confirm the action — user status changes to REJECTED.
4. The user will see "Account rejected" when trying to log in.

#### Suspending an Active User
1. Find the APPROVED user.
2. Click **"Suspend"** button (orange/yellow).
3. Confirm — user is immediately blocked from the app.
4. If the user is currently logged in, they are blocked on their next page navigation.

#### Re-activating a User
1. Find a SUSPENDED or REJECTED user.
2. Click **"Approve"** to restore their access.

#### Changing User Role
1. Find an APPROVED user.
2. Click **"Make Admin"** or **"Make User"** to toggle their role.
3. Admins get access to the admin control panel.

> **Safety:** You cannot remove your own admin role. The system prevents self-demotion to avoid lockout.

---

## FAQ & Troubleshooting

**Q: I registered but can't log in.**
> Your account needs email verification AND admin approval. Check that you completed the email OTP step. Then wait for an admin to approve your account.

**Q: My verification code expired.**
> Codes expire in 2 minutes. Click "Resend Code" on the verification page. Wait at least 120 seconds between resend requests.

**Q: I can't add an expense — it shows an error about balance.**
> Your remaining balance is too low for that amount. Either reduce the expense amount, delete some old expenses to free up balance, or update your total balance via the "Set Balance" button on the dashboard.

**Q: I accidentally deleted an expense. Can I recover it?**
> No. Deletions are permanent. Always confirm before deleting.

**Q: My dashboard shows $0 remaining balance.**
> You haven't set a balance yet. Click "Set Balance" on the dashboard and enter your budget amount.

**Q: The app isn't loading correctly.**
> Try a hard refresh (Ctrl + Shift + R on Windows, Cmd + Shift + R on Mac). Also try clearing browser cache.

**Q: I forgot my password.**
> There is no automatic password reset. Contact your system administrator to reset your password.

**Q: Can I use Expensify on mobile?**
> Yes. The app is fully responsive. On mobile, the sidebar collapses into a hamburger menu accessible from the top navigation bar.

**Q: I'm an admin — why can't I demote myself?**
> This is a safety feature to prevent accidental lockout. Another admin must change your role.

---

## Expense Categories Reference

| Icon | Category | Use For |
|------|----------|---------|
| 🍔 | **Food** | Meals, groceries, snacks, restaurants |
| 🚗 | **Transport** | Fuel, bus fare, ride-sharing, parking |
| 🛍️ | **Shopping** | Clothes, electronics, household items |
| 📄 | **Bills** | Electricity, water, internet, rent |
| 💊 | **Medicine** | Doctor visits, prescriptions, health |
| 📚 | **Education** | Tuition, books, courses, workshops |
| 🎬 | **Entertainment** | Movies, games, subscriptions, hobbies |
| 💵 | **Income** | Salary, freelance, side income — **adds to balance** |
| 📦 | **Others** | Anything that doesn't fit above categories |

---

*Expensify — Track smarter, spend wiser.*
