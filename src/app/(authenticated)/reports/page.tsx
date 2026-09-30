import React from 'react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReportClient from '@/components/ReportClient';
import ErrorState from '@/components/ErrorState';
import { getMonthlyReport, getUserTimeZone } from '@/lib/finance';
import { toYmd } from '@/lib/dates';
import { getI18n } from '@/lib/i18n/server';

export const revalidate = 0; // Disable caching

export async function generateMetadata() {
  const { m } = await getI18n();
  return { title: m.reports.metaTitle };
}

interface ReportsPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const sessionUser = await getSession();

  // Guard: if user is not authenticated or not approved
  if (!sessionUser || sessionUser.status !== 'APPROVED') {
    redirect('/login');
  }

  const tz = await getUserTimeZone();
  const { locale, m } = await getI18n();
  const { month } = await searchParams;

  // "YYYY-MM", defaulting to the current month in the user's time zone
  const match = month?.match(/^(\d{4})-(\d{2})$/);
  const today = toYmd(new Date(), tz);
  const year = match ? Number(match[1]) : today.y;
  const index = match ? Number(match[2]) - 1 : today.m;
  const valid = year >= 2000 && year <= today.y + 1 && index >= 0 && index <= 11;

  let report;
  try {
    report = await getMonthlyReport(sessionUser.id, tz, valid ? year : today.y, valid ? index : today.m, locale);
  } catch (error) {
    console.error('Reports server page error:', error);
  }

  if (!report) {
    return (
      <ErrorState
        title={m.reports.loadErrorTitle}
        message={m.reports.loadErrorMessage}
      />
    );
  }

  return <ReportClient report={report} userName={sessionUser.name} />;
}
