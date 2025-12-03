'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Bell, LogOut, User, Menu, X, Check, CheckCheck, Calendar, Info, AlertCircle } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useNotifications } from '@/contexts/NotificationContext';

interface NavbarProps {
  user?: {
    fName: string;
    role: string;
  };
  onLogout?: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const notificationRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case 'reservation_approved':
        return <Check className="h-4 w-4 text-success-500" />;
      case 'reservation_rejected':
        return <AlertCircle className="h-4 w-4 text-danger-500" />;
      case 'reservation_cancelled':
        return <X className="h-4 w-4 text-gray-500" />;
      case 'reservation_pending':
        return <Calendar className="h-4 w-4 text-warning-500" />;
      case 'reminder':
        return <Calendar className="h-4 w-4 text-warning-500" />;
      default:
        return <Info className="h-4 w-4 text-primary-500" />;
    }
  };

  const navLinks = [
    { href: '/availability', label: 'Pool Availability' },
    { href: '/my-reservations', label: 'My Reservations' },
    { href: '/profile', label: 'My Profile' },
    { href: '/feedback', label: 'Feedback' },
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/logo/logo.png"
              alt="Luxuria Bacaca Resort Logo"
              width={36}
              height={36}
              className="rounded-lg"
            />
            <span className="font-semibold text-gray-900 hidden sm:block">
              Luxuria Bacaca Resort
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2">
            {user ? (
              <>
                {/* Notifications Bell with Dropdown */}
                <div className="relative" ref={notificationRef}>
                  <button
                    onClick={() => setNotificationsOpen(!notificationsOpen)}
                    className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 relative"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-xs font-bold text-white bg-danger-500 rounded-full px-1">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notificationsOpen && (
                    <>
                      {/* Mobile: Full-width dropdown below header */}
                      <div className="sm:hidden fixed left-0 right-0 top-16 mx-2 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                            >
                              <CheckCheck className="h-3 w-3" />
                              Mark all read
                            </button>
                          )}
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[60vh] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="py-8 text-center">
                              <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No notifications</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {notifications.slice(0, 5).map((notification) => (
                                <div
                                  key={notification.id}
                                  className={cn(
                                    'px-4 py-3 flex gap-3 transition-colors cursor-pointer hover:bg-gray-50',
                                    !notification.read && 'bg-primary-50/50'
                                  )}
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  {/* Icon */}
                                  <div className={cn(
                                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                                    notification.type === 'reservation_approved' ? 'bg-success-50' :
                                    notification.type === 'reservation_rejected' ? 'bg-danger-50' :
                                    notification.type === 'reservation_cancelled' ? 'bg-gray-100' :
                                    notification.type === 'reservation_pending' ? 'bg-warning-50' :
                                    notification.type === 'reminder' ? 'bg-warning-50' : 'bg-primary-50'
                                  )}>
                                    {getIcon(notification.type)}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                      {notification.title}
                                      {!notification.read && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                      )}
                                    </p>
                                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                            <Link
                              href="/notifications"
                              onClick={() => setNotificationsOpen(false)}
                              className="block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                            >
                              View all notifications →
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Desktop: Regular dropdown */}
                      <div className="hidden sm:block absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden z-50">
                        {/* Header */}
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                          <h3 className="font-semibold text-gray-900">Notifications</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                            >
                              <CheckCheck className="h-3 w-3" />
                              Mark all read
                            </button>
                          )}
                        </div>

                        {/* Notifications List */}
                        <div className="max-h-[400px] overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="py-8 text-center">
                              <Bell className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                              <p className="text-sm text-gray-500">No notifications</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {notifications.map((notification) => (
                                <div
                                  key={notification.id}
                                  className={cn(
                                    'px-4 py-3 flex gap-3 transition-colors cursor-pointer hover:bg-gray-50',
                                    !notification.read && 'bg-primary-50/50'
                                  )}
                                  onClick={() => markAsRead(notification.id)}
                                >
                                  {/* Icon */}
                                  <div className={cn(
                                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                                    notification.type === 'reservation_approved' ? 'bg-success-50' :
                                    notification.type === 'reservation_rejected' ? 'bg-danger-50' :
                                    notification.type === 'reservation_cancelled' ? 'bg-gray-100' :
                                    notification.type === 'reservation_pending' ? 'bg-warning-50' :
                                    notification.type === 'reminder' ? 'bg-warning-50' : 'bg-primary-50'
                                  )}>
                                    {getIcon(notification.type)}
                                  </div>

                                  {/* Content */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                                        {notification.title}
                                        {!notification.read && (
                                          <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                                        )}
                                      </p>
                                    </div>
                                    <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notification.message}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {format(new Date(notification.created_at), 'MMM d, h:mm a')}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
                            <Link
                              href="/notifications"
                              onClick={() => setNotificationsOpen(false)}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                            >
                              View all notifications →
                            </Link>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{user.fName}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="p-2 rounded-lg text-gray-500 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                    pathname === link.href
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
