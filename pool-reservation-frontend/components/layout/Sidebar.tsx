'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  Users,
  FileText,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Waves,
  Menu,
  X,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onLogout?: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(true); // Start collapsed
  const [mobileOpen, setMobileOpen] = useState(false); // Mobile menu state
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on window resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileOpen]);

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/reservations', icon: CalendarCheck, label: 'Reservations' },
    { href: '/admin/schedules', icon: Calendar, label: 'Pool Schedules' },
    { href: '/admin/swimming-lessons', icon: Waves, label: 'Swimming Lessons' },
    { href: '/admin/users', icon: Users, label: 'Manage Users' },
    { href: '/admin/settings', icon: Settings, label: 'Pool Settings' },
    { href: '/admin/logs', icon: FileText, label: 'Admin Logs' },
    { href: '/admin/feedback', icon: MessageSquare, label: 'Feedback' },
  ];

  const handleNavClick = () => {
    // Close mobile menu when navigating
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 z-50 flex items-center justify-between px-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Image
            src="/images/logo/logo.png"
            alt="Luxuria Bacaca Resort Logo"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="font-bold text-white text-sm">Luxuria Bacaca Resort</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-white hover:bg-gray-800 transition-colors"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'lg:hidden fixed left-0 top-14 bottom-0 w-64 bg-gray-900 text-white z-50 transition-transform duration-300',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-3 mt-2 overflow-y-auto h-[calc(100%-80px)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={handleNavClick}
                className={cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-4 left-0 right-0 px-3">
          <button
            onClick={() => {
              setMobileOpen(false);
              onLogout?.();
            }}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:block fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 z-50',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Header */}
        <div className="flex items-center h-16 px-3 border-b border-gray-800">
          {!collapsed ? (
            <div className="flex items-center gap-2 flex-1">
              <Image
                src="/images/logo/logo.png"
                alt="Luxuria Bacaca Resort Logo"
                width={32}
                height={32}
                className="rounded-lg flex-shrink-0"
              />
              <span className="font-bold text-sm">Luxuria Bacaca</span>
            </div>
          ) : (
            <Image
              src="/images/logo/logo.png"
              alt="Luxuria Bacaca Resort Logo"
              width={32}
              height={32}
              className="rounded-lg mx-auto"
            />
          )}
          {!collapsed && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="w-full p-2 hover:bg-gray-800 transition-colors"
          >
            <ChevronRight className="h-5 w-5 mx-auto" />
          </button>
        )}

        {/* Navigation */}
        <nav className="flex flex-col gap-1 p-2 mt-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                )}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm font-medium">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="absolute bottom-4 left-0 right-0 px-2">
          <button
            onClick={onLogout}
            className={cn(
              'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors'
            )}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
