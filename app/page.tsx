import { auth } from '@/app/(auth)/auth';
import { redirect } from 'next/navigation';
import MainPageClient from './MainPageClient';

export default async function Page() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/');
  }

  return <MainPageClient />;
}
