import React from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import AnalyticsClient from '@/components/AnalyticsClient';

export const revalidate = 0; // Disable caching

export default async function AnalyticsPage() {
  const sessionUser = await getSession();

  // Guard: if user is not authenticated or not approved
  if (!sessionUser || sessionUser.status !== 'APPROVED') {
    redirect('/login');
  }

  try {
    // 1. Fetch ALL user expenses in parallel to compute programmatic aggregates
    const [expenses, highestExpenseRecord, lowestExpenseRecord, averageAgg] = await Promise.all([
      db.expense.findMany({
        where: { userId: sessionUser.id },
        orderBy: { expenseDate: 'asc' },
      }),
      db.expense.findFirst({
        where: { userId: sessionUser.id },
        orderBy: { amount: 'desc' },
      }),
      db.expense.findFirst({
        where: { userId: sessionUser.id },
        orderBy: { amount: 'asc' },
      }),
      db.expense.aggregate({
        where: { userId: sessionUser.id },
        _avg: { amount: true },
      }),
    ]);

    // ----------------------------------------------------
    // Category Wise Distribution Calculation
    // ----------------------------------------------------
    const categoryMap: Record<string, number> = {};
    expenses.forEach((exp) => {
      categoryMap[exp.category] = (categoryMap[exp.category] || 0) + exp.amount;
    });

    const categoryDistribution = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value,
    }));

    // Most frequent category
    const categoryCountMap: Record<string, number> = {};
    expenses.forEach((exp) => {
      categoryCountMap[exp.category] = (categoryCountMap[exp.category] || 0) + 1;
    });

    let topCategory = 'None';
    let maxCount = 0;
    Object.entries(categoryCountMap).forEach(([cat, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCategory = cat;
      }
    });

    // ----------------------------------------------------
    // Monthly Trend Calculation (Last 6 Months)
    // ----------------------------------------------------
    const monthlyMap: Record<string, number> = {};
    const now = new Date();

    // Initialize last 6 months with zero values
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthlyMap[label] = 0;
    }

    expenses.forEach((exp) => {
      const date = new Date(exp.expenseDate);
      const label = date.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      // Only add to map if the month falls within our last 6 months list
      if (monthlyMap.hasOwnProperty(label)) {
        monthlyMap[label] += exp.amount;
      }
    });

    const monthlyTrend = Object.entries(monthlyMap).map(([name, spent]) => ({
      name,
      spent,
    }));

    // ----------------------------------------------------
    // Weekly Pattern Calculation (Last 7 Days)
    // ----------------------------------------------------
    const weeklyMap: Record<string, number> = {};
    // Initialize last 7 days with zero values
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const label = d.toLocaleString('en-US', { weekday: 'short' });
      weeklyMap[label] = 0;
    }

    // Filter and aggregate last 7 days of expenses
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    expenses.forEach((exp) => {
      const date = new Date(exp.expenseDate);
      if (date >= sevenDaysAgo) {
        const label = date.toLocaleString('en-US', { weekday: 'short' });
        if (weeklyMap.hasOwnProperty(label)) {
          weeklyMap[label] += exp.amount;
        }
      }
    });

    const weeklyPattern = Object.entries(weeklyMap).map(([name, spent]) => ({
      name,
      spent,
    }));

    // ----------------------------------------------------
    // Package and Assemble all parameters
    // ----------------------------------------------------
    const aggregates = {
      highest: highestExpenseRecord
        ? { title: highestExpenseRecord.title, amount: highestExpenseRecord.amount }
        : null,
      lowest: lowestExpenseRecord
        ? { title: lowestExpenseRecord.title, amount: lowestExpenseRecord.amount }
        : null,
      average: averageAgg._avg.amount || 0,
      topCategory,
    };

    return (
      <AnalyticsClient
        categoryDistribution={categoryDistribution}
        monthlyTrend={monthlyTrend}
        weeklyPattern={weeklyPattern}
        aggregates={aggregates}
      />
    );
  } catch (error) {
    console.error('Analytics server page error:', error);
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-2xl glass-panel border border-rose-500/10">
        <h3 className="text-xl font-bold text-rose-400">Analytics Compiler Interrupted</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-md">
          Failed to process and aggregate expense statistics. Please try again later.
        </p>
      </div>
    );
  }
}
