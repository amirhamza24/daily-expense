import React from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import ExpensesClient from '@/components/ExpensesClient';
import { getExpenses, ExpenseFilterOptions } from '@/actions/expenses';

export const revalidate = 0; // Disable caching

interface ExpensesPageProps {
  searchParams: Promise<{
    search?: string;
    category?: string;
    dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
    startDate?: string;
    endDate?: string;
    sortBy?: 'latest' | 'highest';
    page?: string;
  }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
  const sessionUser = await getSession();

  // Guard: if user is not authenticated or not approved
  if (!sessionUser || sessionUser.status !== 'APPROVED') {
    redirect('/login');
  }

  // Next.js 15/16 searchParams is a Promise, so we must await it!
  const resolvedParams = await searchParams;

  const page = resolvedParams.page ? parseInt(resolvedParams.page, 10) : 1;

  const filterOptions: ExpenseFilterOptions = {
    search: resolvedParams.search,
    category: resolvedParams.category,
    dateRange: resolvedParams.dateRange,
    startDate: resolvedParams.startDate,
    endDate: resolvedParams.endDate,
    sortBy: resolvedParams.sortBy,
    page,
    limit: 10,
  };

  try {
    // 1. Fetch paginated expenses for current page
    const result = await getExpenses(filterOptions);

    // 2. Fetch ALL matching expenses (unpaginated) for CSV export capability
    // Build the same filter criteria for unpaginated query
    const where: any = { userId: sessionUser.id };

    if (resolvedParams.search) {
      where.title = { contains: resolvedParams.search, mode: 'insensitive' };
    }

    if (resolvedParams.category && resolvedParams.category !== 'All') {
      where.category = resolvedParams.category;
    }

    const now = new Date();
    if (resolvedParams.dateRange === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.expenseDate = { gte: start, lte: end };
    } else if (resolvedParams.dateRange === 'yesterday') {
      const start = new Date();
      start.setDate(now.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(now.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      where.expenseDate = { gte: start, lte: end };
    } else if (resolvedParams.dateRange === 'week') {
      const start = new Date();
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      where.expenseDate = { gte: start };
    } else if (resolvedParams.dateRange === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      where.expenseDate = { gte: start };
    } else if (resolvedParams.dateRange === 'custom' && resolvedParams.startDate) {
      const start = new Date(resolvedParams.startDate);
      start.setHours(0, 0, 0, 0);
      const end = resolvedParams.endDate ? new Date(resolvedParams.endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      where.expenseDate = { gte: start, lte: end };
    }

    const orderBy: any = {};
    if (resolvedParams.sortBy === 'highest') {
      orderBy.amount = 'desc';
    } else {
      orderBy.expenseDate = 'desc';
    }

    const allExpensesForCSV = await db.expense.findMany({
      where,
      orderBy,
      select: {
        title: true,
        amount: true,
        category: true,
        note: true,
        expenseDate: true,
      },
    });

    const pagination = {
      page: result.page,
      totalPages: result.totalPages,
      total: result.total,
      limit: result.limit,
    };

    return (
      <ExpensesClient
        expenses={result.expenses}
        allExpensesForCSV={allExpensesForCSV}
        pagination={pagination}
      />
    );
  } catch (error) {
    console.error('Expenses server page error:', error);
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-2xl glass-panel border border-rose-500/10">
        <h3 className="text-xl font-bold text-rose-400">Ledger Compilation Interrupted</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-md">
          Unable to pull data logs from the database server. Please verify your connection or try again.
        </p>
      </div>
    );
  }
}
