import React from 'react';
import { getSession } from '@/lib/auth';
import { getAllUsers } from '@/actions/admin';
import { redirect } from 'next/navigation';
import UsersRegistryClient from '@/components/UsersRegistryClient';

export const revalidate = 0; // Disable caching

export default async function AdminUsersPage() {
  const sessionUser = await getSession();

  // Guard: Admins only
  if (!sessionUser || sessionUser.role !== 'ADMIN' || sessionUser.status !== 'APPROVED') {
    redirect('/dashboard');
  }

  try {
    const users = await getAllUsers();
    
    return (
      <UsersRegistryClient
        initialUsers={users}
      />
    );
  } catch (error) {
    console.error('Admin users registry server page error:', error);
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center rounded-2xl glass-panel border border-rose-500/10">
        <h3 className="text-xl font-bold text-rose-400">Moderation Index Failure</h3>
        <p className="text-xs text-slate-400 mt-2 max-w-md">
          Failed to retrieve platform registrations. Please verify your connection pooler status.
        </p>
      </div>
    );
  }
}
