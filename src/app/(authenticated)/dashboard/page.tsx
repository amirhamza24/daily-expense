import React from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';
import ErrorState from '@/components/ErrorState';

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
    const [balanceRecord, todaySum, monthSum, totalSpentSum, recentExpenses, monthlyCreditSum, monthlyDebitSum] = await Promise.all([
      db.balance.findUnique({
        where: { userId },
      }),
      db.expense.aggregate({
        where: {
          userId,
          expenseDate: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),
      db.expense.aggregate({
        where: {
          userId,
          expenseDate: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      db.expense.aggregate({
        where: {
          userId,
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
      monthlyExpenses: monthSum._sum.amount || 0,
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
    />
  );
}
