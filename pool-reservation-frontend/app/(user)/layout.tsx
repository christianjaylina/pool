'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Navbar } from '@/components/layout';
import { PageLoader } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for auth to finish loading before making redirect decisions
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        setIsReady(true);
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Show loader while auth is loading or while checking auth
  if (isLoading || !isReady) {
    return <PageLoader />;
  }

  // Should not reach here if not authenticated or if admin, but safety check
  if (!user || user.role === 'admin') {
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
