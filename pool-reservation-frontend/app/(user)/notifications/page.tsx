'use client';

import { Bell, Check, CheckCheck, Calendar, Info, AlertCircle, X, Loader2 } from 'lucide-react';
import { Card, CardHeader, Button, Badge } from '@/components/ui';
import { useNotifications } from '@/contexts/NotificationContext';
import { useState } from 'react';

// Format timestamp - DB returns timestamps in PHT (UTC+8)
const formatPHTime = (dateString: string) => {
  // If the string doesn't have timezone info, treat it as PHT
  let dateStr = dateString;
  if (!dateString.includes('Z') && !dateString.includes('+') && !dateString.includes('T')) {
    dateStr = dateString.replace(' ', 'T') + '+08:00';
  }
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

export default function NotificationsPage() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, loadMore, isLoading, pagination } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'all' 
    ? notifications 
    : notifications.filter(n => !n.read);

  const getIcon = (type: string) => {
    switch (type) {
      case 'reservation_approved':
        return <Check className="h-5 w-5 text-success-500" />;
      case 'reservation_rejected':
        return <AlertCircle className="h-5 w-5 text-danger-500" />;
      case 'reservation_cancelled':
        return <X className="h-5 w-5 text-gray-500" />;
      case 'reservation_pending':
        return <Calendar className="h-5 w-5 text-warning-500" />;
      case 'reminder':
        return <Calendar className="h-5 w-5 text-warning-500" />;
      default:
        return <Info className="h-5 w-5 text-primary-500" />;
    }
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
                  notification.type === 'reservation_cancelled' ? 'bg-gray-100' :
                  notification.type === 'reservation_pending' ? 'bg-warning-50' :
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
                        {formatPHTime(notification.created_at)}
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

      {/* Load More Button */}
      {pagination && pagination.hasMore && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              `Load More (${pagination.total - notifications.length} remaining)`
            )}
          </Button>
        </div>
      )}

      {/* Pagination Info */}
      {pagination && (
        <p className="text-center text-sm text-gray-500">
          Showing {notifications.length} of {pagination.total} notifications
        </p>
      )}
    </div>
  );
}
