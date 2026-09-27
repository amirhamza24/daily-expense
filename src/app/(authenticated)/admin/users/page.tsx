import React from 'react';
import { getSession } from '@/lib/auth';
import { getAllUsers } from '@/actions/admin';
import { redirect } from 'next/navigation';
import UsersRegistryClient from '@/components/UsersRegistryClient';
import ErrorState from '@/components/ErrorState';

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
      <ErrorState
        title="Couldn't load users"
        message="The user list couldn't be retrieved. Please refresh or try again shortly."
      />
    );
  }
}
