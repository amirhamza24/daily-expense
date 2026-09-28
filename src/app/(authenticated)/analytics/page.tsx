import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import AnalyticsClient from '@/components/AnalyticsClient';
import ErrorState from '@/components/ErrorState';
import { getAnalytics, getUserTimeZone } from '@/lib/finance';
import { RANGE_PRESETS, type RangePreset } from '@/lib/dates';

export const revalidate = 0; // Disable caching

interface AnalyticsPageProps {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}

export default async function AnalyticsPage({ searchParams }: AnalyticsPageProps) {
  const sessionUser = await getSession();

  // Guard: if user is not authenticated or not approved
  if (!sessionUser || sessionUser.status !== 'APPROVED') {
    redirect('/login');
  }

  const { range, from, to } = await searchParams;
  const preset: RangePreset = RANGE_PRESETS.some((p) => p.value === range) ? (range as RangePreset) : 'month';

  let data;
  try {
    data = await getAnalytics(sessionUser.id, await getUserTimeZone(), preset, from, to);
  } catch (error) {
    console.error('Analytics server page error:', error);
  }

  if (!data) {
    return (
      <ErrorState
        title="Couldn't load analytics"
        message="We couldn't aggregate your data right now. Please try again later."
      />
    );
  }

  return <AnalyticsClient data={data} />;
}
