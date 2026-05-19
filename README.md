<div align="center">

# 💸 Expensify

### Premium Daily Expense Tracker

A full-stack, production-grade personal finance management application built with modern web technologies. Track your spending, manage your balance, visualize analytics, and stay in control of your finances — all in one beautifully crafted dashboard.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.6-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.x-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-06B6D4?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

</div>

---

## 🎯 Project Goal

**Expensify** is designed to give individuals a clear, secure, and beautiful way to manage their day-to-day finances. The core goals are:

- 📊 **Visualize** spending trends with interactive monthly and category-based charts
- 🔐 **Secure** all data behind JWT-based authentication with email verification
- 🧾 **Record** transactions with rich metadata (title, amount, category, date, notes)
- 💰 **Track** total and remaining balance in real time
- 👑 **Administer** users via a dedicated Admin panel with approval workflows
- 🌙 **Delight** users with a premium glassmorphism UI with full dark/light mode support

---

## 🛠️ Tech Stack

### Languages

| Language | Usage |
|---|---|
| **TypeScript** | Primary language for all source code (React components, server actions, types) |
| **JavaScript** | Utility scripts (e.g., `test_prisma.js`) |
| **SQL** (via Prisma) | Database schema definition and query building |
| **CSS** | Global styles, glassmorphism design, animations |

### Frameworks & Libraries

| Category | Technology | Version |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org/) (App Router) | 16.2.6 |
| **UI Library** | [React](https://react.dev/) | 19.2.4 |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) | 4.x |
| **ORM** | [Prisma](https://www.prisma.io/) | 7.x |
| **Database Driver** | [node-postgres (pg)](https://node-postgres.com/) + `@prisma/adapter-pg` | 8.x |
| **Charts** | [Recharts](https://recharts.org/) | 3.x |
| **Forms** | [React Hook Form](https://react-hook-form.com/) | 7.x |
| **Validation** | [Zod](https://zod.dev/) | 4.x |
| **Date Handling** | [date-fns](https://date-fns.org/) & [React DatePicker](https://reactdatepicker.com/) | Latest |
| **Authentication** | [jose](https://github.com/panva/jose) (JWT) + [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | Latest |
| **Email** | [Resend](https://resend.com/) | 6.x |
| **Icons** | [Lucide React](https://lucide.dev/) | 1.x |
| **Fonts** | Google Fonts — **Outfit** & **Inter** | — |

---

## ✨ Features

### 👤 User Features
- **Email Registration & Verification** — secure signup with a one-time verification code sent via email
- **JWT Session Management** — stateless, cookie-based authentication with server-side middleware guards
- **Expense CRUD** — create, read, update, and delete expenses with title, amount, category, date, and optional notes
- **Transaction Ledger** — view a chronological history of your expenses with a calculated **running balance**
- **CSV Data Export** — securely download your expense reports directly from the client side
- **Balance Management** — set total balance and track remaining balance in real time
- **Analytics Dashboard** — interactive bar & pie charts for monthly spending breakdowns and category analysis
- **Profile Management** — update personal details and change password securely
- **Settings** — configure application preferences
- **Dark / Light Mode** — persistent theme switching with no flash on page load (SSR-safe inline script)

### 👑 Admin Features
- **User Registry** — view all registered users with their status, role, and metadata
- **Approval Workflow** — approve, reject, or suspend user accounts (`PENDING → APPROVED / REJECTED / SUSPENDED`)
- **Admin Dashboard** — high-level overview of platform activity

### 🔒 Security
- Passwords hashed with **bcryptjs**
- JWT tokens signed with **HS256** (via `jose`)
- Route-level protection via **Next.js Middleware**
- Admin routes additionally guarded at the **Server Component** level
- Email verification required before account activation
- Secure, interactive credential visibility toggles (Show/Hide password)

---

## 🗄️ Database Schema

```
User
 ├── id (UUID)
 ├── name, email (unique), password (hashed)
 ├── role: ADMIN | USER
 ├── status: PENDING | APPROVED | REJECTED | SUSPENDED
 ├── emailVerified, verificationCode, verificationCodeExpiry
 ├── approvedAt, approvedBy
 └── createdAt

Expense
 ├── id (UUID)
 ├── title, amount, category, note
 ├── expenseDate, createdAt
 └── userId → User (cascade delete)

Balance
 ├── id (UUID)
 ├── totalBalance, remainingBalance
 ├── note
 └── userId → User (unique, cascade delete)
```

---

## 📁 Project Structure

```
daily-expense-track/
├── prisma/
│   ├── schema.prisma          # Database models & enums
│   └── seed.ts                # Database seeding script
├── src/
│   ├── app/
│   │   ├── (authenticated)/   # Protected routes (App Router group)
│   │   │   ├── admin/         # Admin dashboard & user management
│   │   │   ├── analytics/     # Spending analytics page
│   │   │   ├── dashboard/     # Main user dashboard
│   │   │   ├── expenses/      # Expense list & management
│   │   │   ├── profile/       # User profile
│   │   │   └── settings/      # App settings
│   │   ├── login/             # Login page
│   │   ├── register/          # Registration page
│   │   ├── verify/            # Email verification page
│   │   ├── layout.tsx         # Root layout (fonts, providers, glow blobs)
│   │   └── globals.css        # Global styles & design tokens
│   ├── components/
│   │   ├── AnalyticsClient.tsx      # Charts (Recharts)
│   │   ├── BalanceModal.tsx         # Set/edit balance modal
│   │   ├── ChangePasswordForm.tsx   # Password update form
│   │   ├── ConfirmModal.tsx         # Reusable confirm dialog
│   │   ├── DashboardClient.tsx      # Main dashboard UI
│   │   ├── ExpenseModal.tsx         # Add/edit expense modal
│   │   ├── ExpensesClient.tsx       # Full expense list with filters
│   │   ├── GlassCard.tsx            # Glassmorphism card primitive
│   │   ├── Sidebar.tsx              # Navigation sidebar
│   │   ├── ThemeProvider.tsx        # Dark/light mode context
│   │   ├── Toast.tsx                # Global toast notification system
│   │   └── UsersRegistryClient.tsx  # Admin user management table
│   ├── actions/               # Next.js Server Actions
│   ├── lib/                   # Utilities (auth, prisma client, etc.)
│   └── middleware.ts          # JWT-based route protection
├── .env                       # Environment variables (not committed)
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v20+
- **PostgreSQL** database instance
- **Resend** account (for email verification)

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/daily-expense-track.git
cd daily-expense-track
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up the Database

```bash
# Push the Prisma schema to your database
npx prisma db push

# (Optional) Seed the database with an admin account
npx prisma db seed
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Build for production |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open Prisma Studio (database GUI) |
| `npx prisma db seed` | Seed the database |

---

## 🎨 Design System

The UI is built around a **premium glassmorphism** aesthetic:

- **Fonts**: `Outfit` (headings) and `Inter` (body) from Google Fonts
- **Glow Blobs**: Ambient purple, blue, and pink background elements for depth
- **Glass Cards**: Frosted-glass effect with `backdrop-blur` and translucent backgrounds
- **Theme**: Full dark/light mode support with SSR-safe flash-free initialization
- **Animations**: Smooth transitions and micro-interactions throughout
- **Premium Components**: Custom-styled calendar interfaces (`react-datepicker`) overriding standard native HTML inputs for a consistent aesthetic

---

## 👨‍💻 Author

Built with ❤️ using Next.js, TypeScript, Prisma, and PostgreSQL.

---

## 📄 License

This project is private and for personal/educational use.
