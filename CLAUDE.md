# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

- `npm run dev` — dev server (localhost:3000)
- `npm run build` — runs `prisma generate` then `next build` (Turbopack). Use `npx next build` to skip client generation.
- `npm run lint` — ESLint (`eslint-config-next`, includes React Compiler rules such as `react-hooks/set-state-in-effect`; some pre-existing violations exist)
- `npx tsc --noEmit` — typecheck only
- `npx prisma db push` — sync `prisma/schema.prisma` to the DB (no migrations folder; schema is pushed, not migrated). `DATABASE_URL` points at the Supabase transaction pooler (`:6543`), where `db push` hangs — run it with the same URL on port `:5432` (session pooler) via an inline `DATABASE_URL=...` override. Push new tables before deploying code that queries them.
- `npx prisma db seed` — seed admin/user accounts via `prisma/seed.ts` (uses `SEED_ADMIN_*` / `SEED_USER_*` env vars)
- `npx prisma studio` — DB GUI

There is no test suite. Root-level `test-*.ts` / `test_prisma.js` / `*_output.txt` files are ad-hoc DB connectivity scripts, not tests.

Env vars: `DATABASE_URL` (Postgres), `JWT_SECRET` (required in production), `RESEND_API_KEY`, `EMAIL_FROM`. Without `RESEND_API_KEY`, verification OTPs are logged to the server console instead of emailed.

## Stack

Next.js 16 App Router (see AGENTS.md — read `node_modules/next/dist/docs/` before using Next APIs), React 19, Tailwind CSS v4 (CSS-first config, no `tailwind.config`), Prisma 7 with the `@prisma/adapter-pg` driver adapter, Recharts, react-datepicker, lucide-react. Deployed on Vercel.

## Architecture

**Auth & access control (three layers).** A JWT (`jose`, HS256, 24h) containing only `userId` is stored in the httpOnly `session` cookie.
1. `src/proxy.ts` — Next 16's replacement for `middleware.ts`. Verifies the JWT *and* checks the user is `APPROVED` in the DB; redirects private paths to `/login` and logged-in users away from `/login`/`/register`. Its `matcher` must be updated when adding top-level routes.
2. `src/app/(authenticated)/layout.tsx` — calls `getSession()` (which re-reads role/status from DB on every request so admin actions take effect immediately), clears the cookie and redirects with `?error=pending|suspended|rejected` if the user is not `APPROVED`.
3. Each page / server action re-checks `getSession()`; admin pages additionally require `role === 'ADMIN'`.

User lifecycle: register → email OTP verification (`/verify`) → `PENDING` → admin approves in `/admin/users` → `APPROVED`. Only approved users can log in.

**Data flow.** Pages under `src/app/(authenticated)/*/page.tsx` are async Server Components that query Prisma directly (`export const revalidate = 0`) and pass serialized data to a `*Client.tsx` component in `src/components/`. Mutations are Server Actions in `src/actions/*.ts` that return `{ success, error? }` / `{ success, message }` and call `revalidatePath(...)` for affected pages. Clients call actions inside `startTransition` and report results via `useToast()`; destructive actions first `await useConfirm()(confirmPresets.x())`.

**Money model.** There is no separate income table: an `Expense` with `category === "Income"` is a credit; every other category is a debit. `Balance` (one per user) stores `totalBalance` (starting balance) and `remainingBalance`, which is kept in sync inside `db.$transaction` in `createExpense`/`updateExpense`/`deleteExpense` (debits that would make it negative are rejected). `setOrUpdateBalance` recomputes `remainingBalance = totalBalance + credits − debits`. The transaction-history page computes running balances client-side from all expenses sorted ascending.

**Lending & borrowing** (`/lend-borrow`, `MoneyRecord` + `MoneyPayment`) is separate from `Expense` — never income or spending — but moves `remainingBalance` (lend −, repayment +, borrow +, payment −). Rules and file map: `.claude/skills/lend-borrow/SKILL.md`.

**Analytics, insights & reports.** `src/lib/finance.ts` (server-only) aggregates in Postgres — `aggregate`/`groupBy` plus one `$queryRaw` that buckets `Expense` by day/month in the viewer's time zone (`AT TIME ZONE`, zone from the `tz` cookie set by `<TimezoneSync />`). Periods and calendar math live in `src/lib/dates.ts` (`resolvePeriod`, `zonedMidnight`, zero-safe `pctChange`); rule-based insights in `src/lib/insights.ts` (`INSIGHT_THRESHOLDS`); serializable shapes in `src/lib/finance-types.ts`. Income/expense figures never include lend & borrow; report balances use the same rules as `remainingBalance` (opening = starting balance + all earlier movements), so the current month's closing equals the dashboard's available balance. `/reports` renders a `.report-paper` (light palette even in dark mode) exported via `downloadNodeAsPdf` (jsPDF, breaks at `[data-report-section]`) or `downloadNodeAsImage`; report charts use `isAnimationActive={false}` so exports never catch a half-drawn chart.

**Global providers** (root `src/app/layout.tsx`): `ThemeProvider` (class-based `.dark` on `<html>`, persisted in `localStorage`, with an inline pre-hydration script to avoid flash), `ToastProvider`, `ConfirmProvider`. `#root-portal` is the portal target for datepicker popovers.

## UI conventions

- Design tokens live in `src/app/globals.css` as CSS variables on `:root` / `.dark`, exposed to Tailwind via `@theme inline` — use semantic utilities (`bg-surface`, `bg-subtle`, `border-line`, `text-fg`, `text-muted`, `text-faint`, `bg-accent`, `text-success`, `bg-danger-soft`, …) rather than raw palette colors.
- Reusable component classes (in `@layer components`, so utilities override them): `card`, `card-interactive`, `btn` + `btn-primary|secondary|ghost|danger|success|warning|danger-soft` + `btn-sm|lg`, `icon-btn`, `input` (+ `input-icon` for a leading icon, add `pl-9`), `label`, `segmented` (buttons use `data-active`), `badge` + variants, `data-table`, `alert`, `page-title`, `section-title`, `stat-label`, `stat-value`, `skeleton`.
- Shared building blocks: `PageHeader`, `Modal` (use for all dialogs), `ErrorState`, `AuthShell` (login/register/verify), `PasswordInput`, `AnimatedNumber`; helpers `src/lib/format.ts` (`formatMoney`, `formatDate`, `initials`) and `src/lib/categories.ts` (category icon + tint classes).
- Motion: `(authenticated)/template.tsx` wraps every page in `.stagger`, so a page's top-level children fade in sequentially — pages should return a fragment of sections rather than a single wrapper div. Use `.stagger-rows` on `<tbody>`/`<ul>` for row entrance. Under `prefers-reduced-motion` only endless/decorative motion stops and slide-in entrances become fades; short functional transitions (collapse, dropdowns, tab pill) stay.
- Never use native `<select>`/`<datalist>`: use `Select` / `ComboInput` from `src/components/Select.tsx`. Add `<SegmentIndicator />` as the first child of any `.segmented` control for the sliding pill.
- The `/help` page exists but is intentionally not linked in the sidebar.
