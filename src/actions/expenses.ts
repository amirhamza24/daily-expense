'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';

export type ExpenseFilterOptions = {
  search?: string;
  category?: string;
  dateRange?: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
  startDate?: string; // ISO string
  endDate?: string; // ISO string
  sortBy?: 'latest' | 'highest';
  page?: number;
  limit?: number;
};

export type ExpenseInput = {
  title: string;
  amount: number;
  category: string;
  note?: string;
  expenseDate: string; // ISO string
};

// Helper to check user session and throw error if not approved
async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session || session.status !== 'APPROVED') {
    throw new Error('Unauthorized or account not approved.');
  }
  return session;
}

export async function getExpenses(options: ExpenseFilterOptions = {}) {
  const user = await getAuthenticatedUser();

  const {
    search,
    category,
    dateRange,
    startDate,
    endDate,
    sortBy = 'latest',
    page = 1,
    limit = 10,
  } = options;

  const skip = (page - 1) * limit;

  // Build prisma where filter
  const where: Prisma.ExpenseWhereInput = {
    userId: user.id,
  };

  // Search filter
  if (search) {
    where.title = {
      contains: search,
      mode: 'insensitive',
    };
  }

  // Category filter
  if (category && category !== 'All') {
    where.category = category;
  }

  // Date Range filter
  const now = new Date();
  if (dateRange === 'today') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    where.expenseDate = { gte: start, lte: end };
  } else if (dateRange === 'yesterday') {
    const start = new Date();
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setDate(now.getDate() - 1);
    end.setHours(23, 59, 59, 999);
    where.expenseDate = { gte: start, lte: end };
  } else if (dateRange === 'week') {
    // Last 7 days
    const start = new Date();
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    where.expenseDate = { gte: start };
  } else if (dateRange === 'month') {
    // This Month
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    where.expenseDate = { gte: start };
  } else if (dateRange === 'custom' && startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);
    where.expenseDate = { gte: start, lte: end };
  }

  // Sorting
  const orderBy: Prisma.ExpenseOrderByWithRelationInput = {};
  if (sortBy === 'highest') {
    orderBy.amount = 'desc';
  } else {
    // default 'latest'
    orderBy.expenseDate = 'desc';
  }

  try {
    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy,
        skip,
        take: limit,
      }),
      db.expense.count({ where }),
    ]);

    return {
      expenses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error('getExpenses error:', error);
    throw new Error('Failed to retrieve expenses.');
  }
}

export async function createExpense(data: ExpenseInput) {
  const user = await getAuthenticatedUser();

  try {
    const expenseDate = new Date(data.expenseDate);

    // Transaction to create expense and subtract remaining balance
    const result = await db.$transaction(async (tx) => {
      // 1. Get user's balance
      const balance = await tx.balance.findUnique({
        where: { userId: user.id },
      });

      if (!balance) {
        throw new Error('Please set an initial balance before adding expenses.');
      }

      // 2. Subtract the amount
      const newRemainingBalance = balance.remainingBalance - data.amount;

      // 3. Update Balance
      await tx.balance.update({
        where: { userId: user.id },
        data: { remainingBalance: newRemainingBalance },
      });

      // 4. Create Expense
      const expense = await tx.expense.create({
        data: {
          title: data.title,
          amount: data.amount,
          category: data.category,
          note: data.note,
          expenseDate,
          userId: user.id,
        },
      });

      return expense;
    });

    revalidatePath('/dashboard');
    revalidatePath('/expenses');
    revalidatePath('/analytics');

    return { success: true, expense: result };
  } catch (error) {
    const err = error as Error;
    console.error('createExpense error:', err);
    return { success: false, error: err.message || 'Failed to create expense.' };
  }
}

export async function updateExpense(id: string, data: ExpenseInput) {
  const user = await getAuthenticatedUser();

  try {
    const expenseDate = new Date(data.expenseDate);

    const result = await db.$transaction(async (tx) => {
      // 1. Fetch old expense
      const oldExpense = await tx.expense.findUnique({
        where: { id, userId: user.id },
      });

      if (!oldExpense) {
        throw new Error('Expense not found.');
      }

      // 2. Fetch user's balance
      const balance = await tx.balance.findUnique({
        where: { userId: user.id },
      });

      if (!balance) {
        throw new Error('Balance record not found.');
      }

      // 3. Calculate difference and update remaining balance
      const diff = data.amount - oldExpense.amount;
      const newRemainingBalance = balance.remainingBalance - diff;

      await tx.balance.update({
        where: { userId: user.id },
        data: { remainingBalance: newRemainingBalance },
      });

      // 4. Update Expense
      const updated = await tx.expense.update({
        where: { id },
        data: {
          title: data.title,
          amount: data.amount,
          category: data.category,
          note: data.note,
          expenseDate,
        },
      });

      return updated;
    });

    revalidatePath('/dashboard');
    revalidatePath('/expenses');
    revalidatePath('/analytics');

    return { success: true, expense: result };
  } catch (error) {
    const err = error as Error;
    console.error('updateExpense error:', err);
    return { success: false, error: err.message || 'Failed to update expense.' };
  }
}

export async function deleteExpense(id: string) {
  const user = await getAuthenticatedUser();

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Fetch expense to delete
      const oldExpense = await tx.expense.findUnique({
        where: { id, userId: user.id },
      });

      if (!oldExpense) {
        throw new Error('Expense not found.');
      }

      // 2. Fetch user's balance
      const balance = await tx.balance.findUnique({
        where: { userId: user.id },
      });

      if (!balance) {
        throw new Error('Balance record not found.');
      }

      // 3. Restore the remaining balance
      const newRemainingBalance = balance.remainingBalance + oldExpense.amount;

      await tx.balance.update({
        where: { userId: user.id },
        data: { remainingBalance: newRemainingBalance },
      });

      // 4. Delete the expense
      await tx.expense.delete({
        where: { id },
      });

      return oldExpense;
    });

    revalidatePath('/dashboard');
    revalidatePath('/expenses');
    revalidatePath('/analytics');

    return { success: true, expense: result };
  } catch (error) {
    const err = error as Error;
    console.error('deleteExpense error:', err);
    return { success: false, error: err.message || 'Failed to delete expense.' };
  }
}
