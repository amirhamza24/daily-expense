'use server';

import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { getI18n } from '@/lib/i18n/server';

async function getAuthenticatedUser() {
  const session = await getSession();
  if (!session || session.status !== 'APPROVED') {
    throw new Error((await getI18n()).m.expenseServer.notApproved);
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
  const { m } = await getI18n();

  if (totalBalance < 0) {
    return { success: false, error: m.expenseServer.balanceNegative };
  }

  if (!note.trim()) {
    return { success: false, error: m.expenseServer.balanceNoteRequired };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // 1. Check if balance already exists
      const existingBalance = await tx.balance.findUnique({
        where: { userId: user.id },
      });

      // 2. Fetch sum of all debits (non-Income) and credits (Income) logged by the user
      // plus lending/borrowing still outstanding (see src/actions/money.ts)
      const [debitsAggregation, creditsAggregation, moneyTotals] = await Promise.all([
        tx.expense.aggregate({
          where: { userId: user.id, NOT: { category: 'Income' } },
          _sum: { amount: true },
        }),
        tx.expense.aggregate({
          where: { userId: user.id, category: 'Income' },
          _sum: { amount: true },
        }),
        tx.moneyRecord.groupBy({
          by: ['type'],
          where: { userId: user.id },
          _sum: { amount: true, paidAmount: true },
        }),
      ]);

      const outstanding = (type: 'LENT' | 'BORROWED') => {
        const row = moneyTotals.find((m) => m.type === type);
        return (row?._sum.amount || 0) - (row?._sum.paidAmount || 0);
      };

      const totalDebits = debitsAggregation._sum.amount || 0;
      const totalCredits = creditsAggregation._sum.amount || 0;
      // Receivable money is out of the wallet; payable money is still in it
      const remainingBalance =
        totalBalance + totalCredits - totalDebits - outstanding('LENT') + outstanding('BORROWED');

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
    revalidatePath('/lend-borrow');

    return { success: true, balance: result };
  } catch (error) {
    const err = error as Error;
    console.error('setOrUpdateBalance error:', err);
    return { success: false, error: err.message || m.expenseServer.balanceFailed };
  }
}
