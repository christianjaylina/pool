'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout';
import { PageLoader } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        // Not logged in - redirect to admin login
        router.push('/admin/login');
      } else if (user?.role !== 'admin') {
        // User is a renter, not admin - redirect to user homepage
        router.push('/');
      } else {
        // User is authenticated admin
        setIsReady(true);
      }
    }
  }, [user, isLoading, isAuthenticated, router]);

  if (isLoading || !isReady) {
    return <PageLoader />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar onLogout={logout} />
      {/* Main content - responsive margins for mobile header and desktop sidebar */}
      <main className="pt-14 lg:pt-0 lg:ml-16 transition-all duration-300">
        <div className="p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
