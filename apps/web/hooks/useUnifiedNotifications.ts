/**
 * 🎣 Hook موحد للإشعارات - يدمج جميع الأنظمة
 * 
 * يستبدل:
 * - useNotifications من EnhancedNotificationSystem
 * - مكونات AuctionNotificationSystem
 * - استدعاءات مباشرة لـ notificationService
 * 
 * @version 2.0.0
 * @date 2025-01-22
 */

import { unifiedNotificationManager } from '@/lib/notifications/UnifiedNotificationManager';
import {
  DBNotificationType,
  NotificationPriority,
  UINotificationType,
  UnifiedNotification,
} from '@/types/notification.types';
import { getCurrentUser } from '@/utils/authUtils';
import { useCallback, useEffect, useRef, useState } from 'react';

// ===========================
// 📋 Types
// ===========================

export interface NotificationHookOptions {
  // تحديث تلقائي كل X ثانية
  autoRefresh?: boolean;
  refreshInterval?: number;
  // تحميل فوري عند البداية
  loadOnMount?: boolean;
  // عدد الإشعارات المطلوبة
  limit?: number;
}

export interface UseNotificationsReturn {
  // الإشعارات الحالية
  notifications: UnifiedNotification[];
  // عدد غير المقروءة
  unreadCount: number;
  // حالة التحميل
  isLoading: boolean;
  // خطأ إن وجد
  error: string | null;

  // دوال الإدارة
  sendNotification: (options: {
    type: UINotificationType | DBNotificationType;
    title: string;
    message: string;
    priority?: NotificationPriority;
    metadata?: Record<string, any>;
    auctionId?: string;
    carId?: string;
    duration?: number;
    persistent?: boolean;
    actions?: Array<{
      label: string;
      onClick: () => void;
      type?: 'primary' | 'secondary' | 'danger';
    }>;
  }) => Promise<void>;

  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  refresh: () => Promise<void>;

  // دوال سريعة
  success: (title: string, message: string) => Promise<void>;
  notifyError: (title: string, message: string) => Promise<void>;
  warning: (title: string, message: string) => Promise<void>;
  info: (title: string, message: string) => Promise<void>;

  // إشعارات المزادات
  notifyAuctionWon: (params: {
    auctionId: string;
    amount: number;
    carTitle: string;
  }) => Promise<void>;
  notifySaleConfirmed: (params: {
    auctionId: string;
    role: 'winner' | 'seller';
    otherPartyName: string;
    amount: number;
    carTitle: string;
  }) => Promise<void>;
  notifyNewBid: (params: {
    auctionId: string;
    bidderName: string;
    amount: number;
    carTitle: string;
    bidCount: number;
  }) => Promise<void>;
  notifyBidOutbid: (params: {
    auctionId: string;
    previousBid: number;
    newBid: number;
    carTitle: string;
  }) => Promise<void>;
}

// ===========================
// 🎣 Hook
// ===========================

export function useUnifiedNotifications(
  options: NotificationHookOptions = {}
): UseNotificationsReturn {
  const {
    autoRefresh = false,
    refreshInterval = 30000,
    loadOnMount = true,
    limit = 50,
  } = options;

  const [notifications, setNotifications] = useState<UnifiedNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const intervalRef = useRef<NodeJS.Timeout>();

  // جلب المستخدم الحالي
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // جلب الإشعارات
  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const data = await unifiedNotificationManager.getUserNotifications(currentUser.id, {
        limit,
      } as any);

      setNotifications(data as UnifiedNotification[]);
      setUnreadCount(data.filter((n: any) => !n.isRead).length);
    } catch (err) {
      console.error('[Hook] خطأ في جلب الإشعارات:', err);
      setError('فشل في تحميل الإشعارات');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, limit]);

  // تحميل عند البداية
  useEffect(() => {
    if (loadOnMount && currentUser?.id) {
      fetchNotifications();
    }
  }, [loadOnMount, currentUser?.id, fetchNotifications]);

  // تحديث تلقائي
  useEffect(() => {
    if (autoRefresh && currentUser?.id) {
      intervalRef.current = setInterval(() => {
        fetchNotifications();
      }, refreshInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, currentUser?.id, fetchNotifications]);

  // الاستماع للأحداث الجديدة
  useEffect(() => {
    const handleNewNotification = (data: any) => {
      setNotifications((prev) => [data, ...prev.slice(0, limit - 1)]);
      setUnreadCount((prev) => prev + 1);
    };

    const handleNotificationRead = (data: any) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === data.id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    };

    const handleAllRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    };

    const handleDeleted = (data: any) => {
      setNotifications((prev) => prev.filter((n) => n.id !== data.id));
    };

    unifiedNotificationManager.on('notification', handleNewNotification);
    unifiedNotificationManager.on('notification-read', handleNotificationRead);
    unifiedNotificationManager.on('all-notifications-read', handleAllRead);
    unifiedNotificationManager.on('notification-deleted', handleDeleted);

    return () => {
      unifiedNotificationManager.off('notification', handleNewNotification);
      unifiedNotificationManager.off('notification-read', handleNotificationRead);
      unifiedNotificationManager.off('all-notifications-read', handleAllRead);
      unifiedNotificationManager.off('notification-deleted', handleDeleted);
    };
  }, [limit]);

  // ===========================
  // 🎯 دوال الإدارة
  // ===========================

  const sendNotification = useCallback(
    async (options: any) => {
      if (!currentUser?.id) {
        console.warn('[Hook] لا يوجد مستخدم مسجل دخول');
        return;
      }

      await unifiedNotificationManager.send({
        userId: currentUser.id,
        ...options,
      });
    },
    [currentUser?.id]
  );

  const markAsRead = useCallback(async (notificationId: string) => {
    await unifiedNotificationManager.markAsRead(notificationId);
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!currentUser?.id) return;
    await unifiedNotificationManager.markAllAsRead(currentUser.id);
  }, [currentUser?.id]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    await unifiedNotificationManager.delete(notificationId);
  }, []);

  const refresh = useCallback(async () => {
    await fetchNotifications();
  }, [fetchNotifications]);

  // ===========================
  // 🚀 دوال سريعة
  // ===========================

  const success = useCallback(
    async (title: string, message: string) => {
      await sendNotification({
        type: 'success',
        title,
        message,
        priority: 'medium',
      });
    },
    [sendNotification]
  );

  const errorNotif = useCallback(
    async (title: string, message: string) => {
      await sendNotification({
        type: 'error',
        title,
        message,
        priority: 'high',
        persistent: true,
      });
    },
    [sendNotification]
  );

  const warning = useCallback(
    async (title: string, message: string) => {
      await sendNotification({
        type: 'warning',
        title,
        message,
        priority: 'medium',
      });
    },
    [sendNotification]
  );

  const info = useCallback(
    async (title: string, message: string) => {
      await sendNotification({
        type: 'info',
        title,
        message,
        priority: 'low',
      });
    },
    [sendNotification]
  );

  // ===========================
  // 🎯 إشعارات المزادات
  // ===========================

  const notifyAuctionWon = useCallback(
    async (params: any) => {
      if (!currentUser?.id) return;
      await unifiedNotificationManager.notifyAuctionWon({
        ...params,
        winnerId: currentUser.id,
        winnerName: currentUser.name,
      });
    },
    [currentUser]
  );

  const notifySaleConfirmed = useCallback(
    async (params: any) => {
      if (!currentUser?.id) return;
      await unifiedNotificationManager.notifySaleConfirmed({
        ...params,
        userId: currentUser.id,
      });
    },
    [currentUser]
  );

  const notifyNewBid = useCallback(
    async (params: any) => {
      if (!currentUser?.id) return;
      await unifiedNotificationManager.notifyNewBid({
        ...params,
        sellerId: currentUser.id,
      });
    },
    [currentUser]
  );

  const notifyBidOutbid = useCallback(
    async (params: any) => {
      if (!currentUser?.id) return;
      await unifiedNotificationManager.notifyBidOutbid({
        ...params,
        bidderId: currentUser.id,
      });
    },
    [currentUser]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    sendNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refresh,
    success,
    notifyError: errorNotif,
    warning,
    info,
    notifyAuctionWon,
    notifySaleConfirmed,
    notifyNewBid,
    notifyBidOutbid,
  };
}
