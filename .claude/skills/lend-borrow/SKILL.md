---
name: lend-borrow
description: Rules and file map for the Lending & Borrowing module (/lend-borrow — MoneyRecord / MoneyPayment). Use when adding, changing or debugging anything about money lent or borrowed, repayments/payments, receivable/payable, overdue status, or how lending affects the available balance, dashboard or balance recalculation.
---

# Lending & Borrowing module

Tracks money the user **lent** (others owe them) and **borrowed** (they owe others), with partial repayments. It is deliberately separate from `Expense`: lending is never an expense, and borrowing is never income.

## Terminology (use exactly these words in UI copy)

| Type       | Outstanding  | Settled column | One settlement | Action label       | Arrow |
|------------|--------------|----------------|----------------|--------------------|-------|
| `LENT`     | Receivable   | Repaid         | Repayment      | Record repayment   | →     |
| `BORROWED` | Payable      | Paid           | Payment        | Record payment     | ←     |

All labels live in `moneyTerms` in `src/lib/money.ts`. Read them from there instead of hard-coding strings. Don't use "expense", "income", "debt" or "loan" for this feature.

## Files

- `prisma/schema.prisma`: `MoneyRecord` (type, personName, amount, **paidAmount**, date, dueDate?, note?, status) and `MoneyPayment` (amount, paymentDate, note?), plus the enums `MoneyRecordType` and `MoneyRecordStatus`.
- `src/lib/money.ts`: client-safe types (`MoneyRecordView`, `MoneySummary`), status helpers (`settlementStatus`, `displayStatus`, `isOverdue`, `remainingOf`, `round2`), labels and badge/tint classes.
- `src/lib/money-queries.ts`: **server-only** reads: `parseMoneyFilters` (URL → validated filters), `buildMoneyWhere`, `listMoneyRecords`, `getMoneySummary`, `listMoneyPeople`, `toMoneyRecordView`. Pages call these directly with `sessionUser.id`.
- `src/actions/money.ts`: mutations `createMoneyRecord`, `updateMoneyRecord`, `deleteMoneyRecord`, `recordMoneyPayment`, `deleteMoneyPayment`. Each returns `{ success, error? }`.
- `src/app/(authenticated)/lend-borrow/page.tsx` + `loading.tsx`: the page. Filters come from the URL (`type, status, person, dateRange, startDate, endDate, minAmount, maxAmount, sortBy, page`).
- `src/components/MoneyClient.tsx` (page UI: tabs, filters, table on md+, cards on mobile), `MoneyRecordModal.tsx`, `MoneyPaymentModal.tsx`, `MoneyDetailsModal.tsx` and `MoneyBadges.tsx`.
- "New transaction" dialog (`ExpenseModal.tsx`): a third type, **Lend & Borrow**, renders `MoneyEntryForm.tsx` with four kinds — lend, borrow (one or many people → `createMoneyRecords`), get repaid, pay back (enter amounts against one or many open records → `recordMoneyPayments`). Both batch actions are all-or-nothing and check the balance against the batch total. Open records come from `getMoneyEntryData`.
- Dashboard: `LendBorrowOverview` in `DashboardClient.tsx`, fed by `getMoneySummary` in `dashboard/page.tsx`. That call is fail-soft: it returns `null` on error and the panel is hidden.

## Invariants (never break these)

1. **Balance effects** (`Balance.remainingBalance`), applied inside the same `db.$transaction` as the record change through `applyBalanceDelta`:
   - lend X → −X
   - repayment Y received → +Y
   - borrow X → +X
   - payment Y made → −Y
   - Editing a record applies only the change in amount. Deleting a record reverses only its outstanding part (`amount − paidAmount`). Deleting a payment reverses that payment.
   - Any move that would make the balance negative is rejected, the same rule expenses follow.
2. **`setOrUpdateBalance`** (`src/actions/balance.ts`) recomputes `remaining = totalBalance + income − expenses − receivable + payable`. If you add a new way for money to move, update this formula too.
3. `paidAmount` must always equal the sum of the record's payments. It is updated together with the payment rows, using compare-and-set (`updateMany` where `paidAmount` and `updatedAt` are unchanged) so that concurrent requests can't overpay.
4. A payment can never exceed the remaining amount. A record's amount can never be edited below `paidAmount`. The type can't be changed after creation.
5. The stored `status` is only `PENDING | PARTIALLY_PAID | PAID`, and is always set with `settlementStatus(amount, paidAmount)`. **`OVERDUE` is never stored**: it is derived from the due date (before today and not paid). Derive it on the server (`displayStatus`) and pass it down as `displayStatus`, so server and client agree.
6. Status filters match what the UI shows: Pending and Partially paid **exclude** overdue rows, Overdue means not paid and `dueDate < startOfToday`, and `OPEN` means any record that isn't paid.
7. Round every amount with `round2` before comparing or storing it.

## Checklist for changes

- Schema change: run `npx prisma generate`, then push with `DATABASE_URL` pointed at the Supabase session pooler (`:5432`), for example `DATABASE_URL=...:5432/... npx prisma db push`. Push **before** you deploy code that uses the change.
- New mutation: authenticate with `getAuthenticatedUser`, scope every query by `userId`, run it inside `db.$transaction`, and call `revalidateMoney()` (it revalidates `/lend-borrow` and `/dashboard`).
- New UI: use the existing tokens and classes (`card`, `segmented`, `badge-*`, `data-table`, `Modal`, `useConfirm` for destructive actions, `useToast` for results). The page returns a fragment so that `.stagger` animates its sections.
- Verify with `npx tsc --noEmit`, `npx eslint <files>` and `npx next build`.
