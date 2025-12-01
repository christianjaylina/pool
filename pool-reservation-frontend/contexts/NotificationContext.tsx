'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { notificationsApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: number;
  type: 'reservation_approved' | 'reservation_rejected' | 'reminder' | 'info' | 'reservation_cancelled' | 'reservation_pending';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  refreshNotifications: () => void;
  loadMore: () => void;
  isLoading: boolean;
  pagination: PaginationInfo | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const { user, isLoading: authLoading } = useAuth();

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  // Fetch notifications from API
  const fetchNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await notificationsApi.getAll(page, 10);
      
      // Handle both old format (array) and new format (object with notifications and pagination)
      let newNotifications: Notification[];
      let paginationData: PaginationInfo | null = null;
      
      if (Array.isArray(response.data)) {
        // Old API format - array of notifications
        newNotifications = response.data;
      } else {
        // New API format - object with notifications and pagination
        newNotifications = response.data.notifications || [];
        paginationData = response.data.pagination || null;
      }
      
      if (append) {
        setNotifications(prev => [...(prev || []), ...newNotifications]);
      } else {
        setNotifications(newNotifications);
      }
      setPagination(paginationData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      if (!append) {
        setNotifications([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Fetch notifications when user changes or on mount
  useEffect(() => {
    if (!authLoading) {
      fetchNotifications();
    }
  }, [user, authLoading, fetchNotifications]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  // Refresh notifications (can be called manually)
  const refreshNotifications = useCallback(() => {
    fetchNotifications(1, false);
  }, [fetchNotifications]);

  // Load more notifications
  const loadMore = useCallback(() => {
    if (pagination && pagination.hasMore && !isLoading) {
      fetchNotifications(pagination.page + 1, true);
    }
  }, [pagination, isLoading, fetchNotifications]);

  const markAsRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead,
      refreshNotifications,
      loadMore,
      isLoading,
      pagination
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
