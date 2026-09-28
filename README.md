<div align="center">

# 💸 Expensify

### Daily Expense & Lend/Borrow Tracker

Track spending, income, balance, and money lent or borrowed, all in one dashboard.

![Version](https://img.shields.io/badge/version-0.3.0-166534?style=for-the-badge)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=for-the-badge&logo=postgresql)](https://supabase.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

**Live:** [daily-expense-tracker-zeta-one.vercel.app](https://daily-expense-tracker-zeta-one.vercel.app)

</div>

---

## ✨ Features

### 💰 Expenses & Balance

- Add, edit and delete transactions (**Expense** or **Income**)
- Split one expense into multiple items (breakdown)
- Starting balance plus a live **available balance**
- Search, filter by category and date, sort, paginate
- CSV export
- Transaction history with running balance, including a **Lend & Borrow** tab

### 🤝 Lend & Borrow

- Separate **Lent** (receivable) and **Borrowed** (payable) records
- Partial repayments/payments, with each amount capped at what's left
- Automatic status: **Pending, Partially paid, Paid, Overdue**
- Due dates and notes
- Tabs (All / Lent / Borrowed) and filters: status, person, date range, amount range, sort
- Summary cards: Total lent, Receivable, Total borrowed, Payable
- Lend, borrow, get repaid or pay back from **New transaction**, including splitting between several people at once
- Updates the available balance, but never counted as income or expense

### 📊 Dashboard & Analytics

- Stat cards: available balance, total, monthly and today's expenses (income excluded)
- Lend & Borrow overview: money owed to you, money you owe, and active/overdue counts
- Monthly summary: money in vs. money out
- Charts for monthly trend, weekly pattern and categories

### 📈 Advanced Analytics

- Period filter: today, this week, this month, last month, last 3/6 months, this year, custom
- Overview: available balance, income, expenses, net cash flow, lent, receivable, borrowed, payable
- Income vs expenses, comparison with the previous period (safe when previous is zero)
- Category donut, comparison bars and summary table (click through to transactions)
- Daily / weekly / monthly trends for expenses, income and net cash flow
- Spending statistics and separate lend & borrow analytics

### 💡 Financial Insights

- Rule-based observations with configurable thresholds (no external AI)
- Cash flow, spending and category changes, unusual days, income changes, overdue/outstanding lend & borrow
- Top 4 on the dashboard, more on Analytics

### 🧾 Financial Reports (`/reports`)

- Monthly report for any month and year (month/year pickers, previous/next arrows)
- **Financial overview:** opening balance, income, expenses, net cash flow, lend & borrow movement, closing balance
- **Monthly highlights:** top category, highest spending day, largest expense, daily average, totals
- **Charts:** expenses by category, income vs expenses, daily spending, 6-month trend
- **Expense summary:** total, count, average, highest expense, highest day, top category, category breakdown
- **Income summary:** total, count, average, highest income
- **Lending (Receivable)** and **Borrowing (Payable)** summaries: amounts, repayments, outstanding, paid/partial/pending/overdue counts
- Closing balance of the current month matches the dashboard's available balance
- Printable white "paper" layout, including in dark mode
- Download as **PDF** (A4, multi-page), **PNG** or **JPG**, always on a white background
- Includes app name, month, generated date; no IDs or login data

### 🖼️ Details & Export

- Details view for every expense and lend/borrow record
- **Download details as PNG / JPG** image

### 🔐 Auth & Admin

- Registration with email OTP verification
- Admin approval (`PENDING → APPROVED / REJECTED / SUSPENDED`)
- JWT session in an httpOnly cookie, access checked again on every request
- Admin panel: user registry, approve/reject/suspend, role management
- Profile and password change

### 🎨 UI

- Light / dark mode with no flash on load
- Responsive, with card layouts on mobile
- Gradient stat cards, skeleton loaders, toasts, confirm dialogs
- Respects the system **reduced-motion** setting

---

## 🛠️ Tech Stack

| Category           | Technology                                              |
| ------------------ | ------------------------------------------------------- |
| Framework          | Next.js 16 (App Router, Turbopack), React 19            |
| Language           | TypeScript                                              |
| Styling            | Tailwind CSS 4                                          |
| Database           | PostgreSQL (Supabase) + Prisma 7 (`@prisma/adapter-pg`) |
| Auth               | jose (JWT), bcryptjs                                    |
| Email              | Resend                                                  |
| Charts             | Recharts                                                |
| Dates              | date-fns, react-datepicker                              |
| Image / PDF export | html-to-image, jsPDF                                    |
| Icons              | lucide-react                                            |
| Hosting            | Vercel                                                  |

---

## 📝 Changelog

### v0.3.0

- Advanced Analytics page with period filters and previous-period comparison
- Rule-based Financial Insights (dashboard + analytics)
- Financial Reports page (`/reports`): monthly overview, summaries, highlights, charts
- Report export as PDF/PNG/JPG on a white background
- Lend & Borrow history tab in Transaction history; running balance now matches available balance
- Custom dropdowns, sliding tab indicator, smoother animations
- Time-zone-aware daily/monthly grouping

### v0.2.0

- Lend & Borrow module: records, partial payments, auto status, filters, summary cards
- Lend/borrow/repay/pay back from **New transaction**, including splits between several people
- Dashboard Lend & Borrow overview
- Dashboard expense cards now exclude income
- Download details as PNG/JPG
- Gradient stat cards
- Loader fixes: calmer skeleton shimmer, login spinner stays until redirect, reduced-motion support

### v0.1.0

- Expenses, income, breakdowns, balance, CSV export
- Transaction history, analytics
- Auth with email verification, admin approval panel
- Light/dark theme

---

## 📄 License

Private project, for personal/educational use.
