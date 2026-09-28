import React from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';
import ErrorState from '@/components/ErrorState';
import { getMoneySummary } from '@/lib/money-queries';
import { getDashboardInsights, getUserTimeZone } from '@/lib/finance';

export const revalidate = 0; // Disable server caching for real-time changes

async function fetchDashboardData(userId: string) {
  const now = new Date();

  // Define Today's start and end limits
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  todayEnd.setHours(23, 59, 59, 999);

  // Define This Month's start limit
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);

  try {
    // Perform parallel database queries for efficiency
    // Expense totals exclude "Income" entries (credits) — only debits count as spending
    const [balanceRecord, todaySum, totalSpentSum, recentExpenses, monthlyCreditSum, monthlyDebitSum, moneySummary, insights] = await Promise.all([
      db.balance.findUnique({
        where: { userId },
      }),
      db.expense.aggregate({
        where: {
          userId,
          expenseDate: { gte: todayStart, lte: todayEnd },
          category: { not: 'Income' },
        },
        _sum: { amount: true },
      }),
      db.expense.aggregate({
        where: {
          userId,
          category: { not: 'Income' },
        },
        _sum: { amount: true },
      }),
      db.expense.findMany({
        where: { userId },
        orderBy: { expenseDate: 'desc' },
        take: 5,
        include: {
          splits: {
            select: { id: true, title: true, amount: true },
            orderBy: { position: 'asc' },
          },
        },
      }),
      db.expense.aggregate({
        where: {
          userId,
          expenseDate: { gte: monthStart },
          category: 'Income',
        },
        _sum: { amount: true },
      }),
      db.expense.aggregate({
        where: {
          userId,
          expenseDate: { gte: monthStart },
          category: { not: 'Income' },
        },
        _sum: { amount: true },
      }),
      // Optional panel: a failure here shouldn't take the whole dashboard down
      getMoneySummary(userId).catch((error) => {
        console.error('Dashboard lend & borrow summary error:', error);
        return null;
      }),
      getUserTimeZone()
        .then((tz) => getDashboardInsights(userId, tz, 4))
        .catch((error) => {
          console.error('Dashboard insights error:', error);
          return null;
        }),
    ]);

    const totalBalance = balanceRecord?.totalBalance || 0;
    const remainingBalance = balanceRecord?.remainingBalance || 0;
    
    // Total expenses calculated directly from logged expenses
    const totalExpenses = totalSpentSum._sum.amount || 0;

    const monthlyCredit = monthlyCreditSum._sum.amount || 0;
    const monthlyDebit = monthlyDebitSum._sum.amount || 0;
    const monthlyRemaining = monthlyCredit - monthlyDebit;

    const stats = {
      totalBalance,
      remainingBalance,
      totalExpenses,
      monthlyExpenses: monthlyDebit,
      todayExpenses: todaySum._sum.amount || 0,
      balanceNote: balanceRecord?.note || undefined,
      monthlyCredit,
      monthlyDebit,
      monthlyRemaining,
    };

    return {
      success: true,
      stats,
      recentExpenses,
      moneySummary,
      insights,
    };
  } catch (error) {
    console.error('Dashboard server page error:', error);
    return {
      success: false,
    };
  }
}

export default async function DashboardPage() {
  const sessionUser = await getSession();

  // Guard: if user is not authenticated or not approved
  if (!sessionUser || sessionUser.status !== 'APPROVED') {
    redirect('/login');
  }

  const result = await fetchDashboardData(sessionUser.id);

  if (!result.success || !result.stats || !result.recentExpenses) {
    return (
      <ErrorState
        title="Couldn't load your dashboard"
        message="The database didn't respond. Please refresh the page or try again shortly."
      />
    );
  }

  return (
    <DashboardClient
      stats={result.stats}
      recentExpenses={result.recentExpenses}
      moneySummary={result.moneySummary ?? null}
      insights={result.insights ?? null}
    />
  );
}
