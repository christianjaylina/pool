'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  CalendarCheck,
  Calendar,
  Users,
  FileText,
  MessageSquare,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  onLogout?: () => void;
}

export default function Sidebar({ onLogout }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/admin/reservations', icon: CalendarCheck, label: 'Reservations' },
    { href: '/admin/schedules', icon: Calendar, label: 'Pool Schedules' },
    { href: '/admin/users', icon: Users, label: 'Manage Users' },
    { href: '/admin/logs', icon: FileText, label: 'Admin Logs' },
    { href: '/admin/feedback', icon: MessageSquare, label: 'Feedback' },
  ];

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 z-50',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-800">
        {!collapsed && (
          <span className="font-bold text-lg">Admin Panel</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors ml-auto"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </button>
      </div>

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
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
