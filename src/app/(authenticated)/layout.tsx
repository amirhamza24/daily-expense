import { getSession, removeSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

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

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen">
      {/* Premium Navigation Sidebar */}
      <Sidebar user={user} />

      {/* Main Contents Window */}
      <main className="flex-1 flex flex-col pt-16 md:pt-0 overflow-y-auto">
        <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-6 md:gap-8">
          {children}
        </div>
      </main>
    </div>
  );
}
