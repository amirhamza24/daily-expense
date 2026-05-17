import React from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import DashboardClient from '@/components/DashboardClient';

export const revalidate = 0; // Disable server caching for real-time changes

export default async function DashboardPage() {
  const sessionUser = await getSession();

  // Guard: if user is not authenticated or not approved
  if (!sessionUser || sessionUser.status !== 'APPROVED') {
    redirect('/login');
  }

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
    const [balanceRecord, todaySum, monthSum, totalSpentSum, recentExpenses] = await Promise.all([
      db.balance.findUnique({
        where: { userId: sessionUser.id },
      }),
      db.expense.aggregate({
        where: {
          userId: sessionUser.id,
          expenseDate: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
      }),
      db.expense.aggregate({
        where: {
          userId: sessionUser.id,
          expenseDate: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      db.expense.aggregate({
        where: {
          userId: sessionUser.id,
        },
        _sum: { amount: true },
      }),
      db.expense.findMany({
        where: { userId: sessionUser.id },
        orderBy: { expenseDate: 'desc' },
        take: 5,
      }),
    ]);

    const totalBalance = balanceRecord?.totalBalance || 0;
    const remainingBalance = balanceRecord?.remainingBalance || 0;
    
    // Total expenses calculated directly from logged expenses
    const totalExpenses = totalSpentSum._sum.amount || 0;

    const stats = {
      totalBalance,
      remainingBalance,
      totalExpenses,
      monthlyExpenses: monthSum._sum.amount || 0,
      todayExpenses: todaySum._sum.amount || 0,
      balanceNote: balanceRecord?.note || undefined,
    };

    return (
      <DashboardClient
        stats={stats}
        recentExpenses={recentExpenses}
      />
    );
  } catch (error) {
    console.error('Dashboard server page error:', error);
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-2xl glass-panel border border-rose-500/10">
        <h3 className="text-xl font-bold text-rose-400">Database Connection Interrupted</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-md">
          Unable to synchronize with the server database. Please refresh the page or contact support if the issue persists.
        </p>
      </div>
    );
  }
}
