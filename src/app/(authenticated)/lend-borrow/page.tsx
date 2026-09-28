import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import MoneyClient from '@/components/MoneyClient';
import ErrorState from '@/components/ErrorState';
import {
  getMoneySummary,
  listMoneyPeople,
  listMoneyRecords,
  parseMoneyFilters,
} from '@/lib/money-queries';

export const revalidate = 0; // Disable caching

interface LendBorrowPageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

async function fetchData(userId: string, params: Record<string, string | undefined>) {
  try {
    const filters = parseMoneyFilters(params);
    const [list, summary, people] = await Promise.all([
      listMoneyRecords(userId, { ...filters, limit: 10 }),
      getMoneySummary(userId),
      listMoneyPeople(userId),
    ]);
    return { ...list, summary, people };
  } catch (error) {
    console.error('Lend & borrow server page error:', error);
    return null;
  }
}

export default async function LendBorrowPage({ searchParams }: LendBorrowPageProps) {
  const sessionUser = await getSession();

  // Guard: if user is not authenticated or not approved
  if (!sessionUser || sessionUser.status !== 'APPROVED') {
    redirect('/login');
  }

  const data = await fetchData(sessionUser.id, await searchParams);

  if (!data) {
    return (
      <ErrorState
        title="Couldn't load lending & borrowing"
        message="The database didn't respond. Please refresh the page or try again shortly."
      />
    );
  }

  return (
    <MoneyClient
      records={data.records}
      summary={data.summary}
      people={data.people}
      pagination={data.pagination}
    />
  );
}
