'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Sidebar } from '@/components/layout';
import { PageLoader } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      router.push('/admin/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <PageLoader />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar onLogout={logout} />
      <main className="ml-16 lg:ml-64 transition-all duration-300">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
