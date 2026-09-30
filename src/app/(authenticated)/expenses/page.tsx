import React from 'react';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import ExpensesClient, { ExpenseItem } from '@/components/ExpensesClient';
import { getExpenses, ExpenseFilterOptions } from '@/actions/expenses';
import { Prisma } from '@prisma/client';
import ErrorState from '@/components/ErrorState';
import { getI18n } from '@/lib/i18n/server';

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

  let data: {
    expenses: ExpenseItem[];
    allExpensesForCSV: Array<{
      title: string;
      amount: number;
      category: string;
      note: string | null;
      expenseDate: Date;
      splits: Array<{ title: string; amount: number }>;
    }>;
    pagination: {
      page: number;
      totalPages: number;
      total: number;
      limit: number;
    };
  } | null = null;

  try {
    // 1. Fetch paginated expenses for current page
    const result = await getExpenses(filterOptions);

    // 2. Fetch ALL matching expenses (unpaginated) for CSV export capability
    // Build the same filter criteria for unpaginated query
    const where: Prisma.ExpenseWhereInput = { userId: sessionUser.id };

    if (resolvedParams.search) {
      where.OR = [
        { title: { contains: resolvedParams.search, mode: 'insensitive' } },
        {
          splits: {
            some: { title: { contains: resolvedParams.search, mode: 'insensitive' } },
          },
        },
      ];
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

    const orderBy: Prisma.ExpenseOrderByWithRelationInput = {};
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
        splits: {
          select: { title: true, amount: true },
          orderBy: { position: 'asc' },
        },
      },
    });

    const pagination = {
      page: result.page,
      totalPages: result.totalPages,
      total: result.total,
      limit: result.limit,
    };

    data = {
      expenses: result.expenses,
      allExpensesForCSV,
      pagination,
    };
  } catch (error) {
    console.error('Expenses server page error:', error);
  }

  if (!data) {
    const { m } = await getI18n();
    return (
      <ErrorState
        title={m.errorState.dbTitle(m.expenses.loadError)}
        message={m.errorState.dbMessage}
      />
    );
  }

  return (
    <ExpensesClient
      expenses={data.expenses}
      allExpensesForCSV={data.allExpensesForCSV}
      pagination={data.pagination}
    />
  );
}
