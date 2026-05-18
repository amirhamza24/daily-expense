'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session || session.status !== 'APPROVED') {
    throw new Error('Unauthorized or account not approved.');
  }
  return session;
}

export async function getBalance() {
  const user = await getAuthenticatedUser();
  
  try {
    const balance = await db.balance.findUnique({
      where: { userId: user.id },
    });
    return balance;
  } catch (error) {
    console.error('getBalance error:', error);
    return null;
  }
}

export async function setOrUpdateBalance(totalBalance: number, note: string) {
  const user = await getAuthenticatedUser();

  if (totalBalance < 0) {
    return { success: false, error: 'Balance cannot be negative.' };
  }

  if (!note.trim()) {
    return { success: false, error: 'A note describing this balance is required.' };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Check if balance already exists
      const existingBalance = await tx.balance.findUnique({
        where: { userId: user.id },
      });

      // 2. Fetch sum of all debits (non-Income) and credits (Income) logged by the user
      const [debitsAggregation, creditsAggregation] = await Promise.all([
        tx.expense.aggregate({
          where: { userId: user.id, NOT: { category: 'Income' } },
          _sum: { amount: true },
        }),
        tx.expense.aggregate({
          where: { userId: user.id, category: 'Income' },
          _sum: { amount: true },
        }),
      ]);

      const totalDebits = debitsAggregation._sum.amount || 0;
      const totalCredits = creditsAggregation._sum.amount || 0;
      const remainingBalance = totalBalance + totalCredits - totalDebits;

      let balanceRecord;

      if (existingBalance) {
        // Update existing balance
        balanceRecord = await tx.balance.update({
          where: { userId: user.id },
          data: {
            totalBalance,
            remainingBalance,
            note: note.trim(),
          },
        });
      } else {
        // Create new balance
        balanceRecord = await tx.balance.create({
          data: {
            totalBalance,
            remainingBalance,
            note: note.trim(),
            userId: user.id,
          },
        });
      }

      return balanceRecord;
    });

    revalidatePath('/dashboard');
    revalidatePath('/expenses');
    revalidatePath('/analytics');

    return { success: true, balance: result };
  } catch (error) {
    const err = error as Error;
    console.error('setOrUpdateBalance error:', err);
    return { success: false, error: err.message || 'Failed to update balance.' };
  }
}
