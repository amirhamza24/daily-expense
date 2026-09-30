import React from 'react';
import { getSession } from '@/lib/auth';
import { getAllUsers } from '@/actions/admin';
import { redirect } from 'next/navigation';
import UsersRegistryClient from '@/components/UsersRegistryClient';
import ErrorState from '@/components/ErrorState';
import { getI18n } from '@/lib/i18n/server';

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
    const { m } = await getI18n();
    return (
      <ErrorState
        title={m.admin.usersLoadError}
        message={m.admin.usersLoadMessage}
      />
    );
  }
}
