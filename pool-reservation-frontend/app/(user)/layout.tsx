'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout';
import { PageLoader } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} onLogout={logout} />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
