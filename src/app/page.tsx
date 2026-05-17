import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const revalidate = 0;

export default async function IndexPage() {
  const user = await getSession();

  if (user && user.status === 'APPROVED') {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
