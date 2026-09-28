import { getSession, removeSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TimezoneSync from '@/components/TimezoneSync';
import { db } from '@/lib/db';

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSession();

  // If no session exists, redirect to login (middleware should catch this, but double guard is safe)
  if (!user) {
    redirect('/login');
  }

  // Real-time status guard: immediately bounce users whose status is no longer APPROVED
  if (user.status !== 'APPROVED') {
    // Clear session cookie to prevent infinite redirect loops
    await removeSession();
    
    let errorParam = 'pending';
    if (user.status === 'SUSPENDED') errorParam = 'suspended';
    if (user.status === 'REJECTED') errorParam = 'rejected';
    
    redirect(`/login?error=${errorParam}`);
  }

  // Retrieve count of pending users if current user is an Admin
  let pendingUserCount = 0;
  if (user.role === 'ADMIN') {
    try {
      pendingUserCount = await db.user.count({
        where: {
          status: 'PENDING',
        },
      });
    } catch (error) {
      console.error('Failed to fetch pending user count:', error);
    }
  }

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen">
      <Sidebar user={user} pendingUserCount={pendingUserCount} />
      <TimezoneSync />

      <main className="flex-1 min-w-0 flex flex-col pt-14 md:pt-0">
        <div className="w-full max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
