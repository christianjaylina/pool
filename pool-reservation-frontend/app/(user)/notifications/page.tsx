'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Bell, Check, CheckCheck, Calendar, Info, AlertCircle } from 'lucide-react';
import { Card, CardHeader, Button, Badge } from '@/components/ui';

interface Notification {
  id: number;
  type: 'reservation_approved' | 'reservation_rejected' | 'reminder' | 'info';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

const mockNotifications: Notification[] = [
  {
    id: 1,
    type: 'reservation_approved',
    title: 'Reservation Approved',
    message: 'Your pool reservation for November 29, 2025 at 10:00 AM has been approved.',
    read: false,
    created_at: '2025-11-28T10:30:00',
  },
  {
    id: 2,
    type: 'reminder',
    title: 'Upcoming Reservation',
    message: 'Reminder: You have a pool reservation tomorrow at 10:00 AM.',
    read: false,
    created_at: '2025-11-28T08:00:00',
  },
  {
    id: 3,
    type: 'reservation_rejected',
    title: 'Reservation Rejected',
    message: 'Your pool reservation for November 25, 2025 was rejected due to scheduled maintenance.',
    read: true,
    created_at: '2025-11-24T14:00:00',
  },
  {
    id: 4,
    type: 'info',
    title: 'Pool Hours Updated',
    message: 'Pool operating hours have been extended to 9 PM for the holiday weekend.',
    read: true,
    created_at: '2025-11-22T09:00:00',
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.read).length;
  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  const getIcon = (type: string) => {
    switch (type) {
      case 'reservation_approved':
        return <Check className="h-5 w-5 text-success-500" />;
      case 'reservation_rejected':
        return <AlertCircle className="h-5 w-5 text-danger-500" />;
      case 'reminder':
        return <Calendar className="h-5 w-5 text-warning-500" />;
      default:
        return <Info className="h-5 w-5 text-primary-500" />;
    }
  };

  const markAsRead = (id: number) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            {unreadCount > 0 ? `You have ${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={markAllAsRead}>
            <CheckCheck className="h-4 w-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'unread' 
              ? 'bg-primary-600 text-white' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <Card padding="none">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 text-center">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No notifications to show</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 sm:p-6 flex gap-4 transition-colors ${
                  !notification.read ? 'bg-primary-50/50' : 'hover:bg-gray-50'
                }`}
              >
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  notification.type === 'reservation_approved' ? 'bg-success-50' :
                  notification.type === 'reservation_rejected' ? 'bg-danger-50' :
                  notification.type === 'reminder' ? 'bg-warning-50' : 'bg-primary-50'
                }`}>
                  {getIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium text-gray-900 flex items-center gap-2">
                        {notification.title}
                        {!notification.read && (
                          <span className="w-2 h-2 rounded-full bg-primary-500" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(notification.created_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                    </div>
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
