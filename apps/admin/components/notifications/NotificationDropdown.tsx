/**
 * قائمة الإشعارات المنسدلة
 */
import { BellIcon, CheckIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { NotificationItem, notificationService } from '../../lib/notifications/notification-system';
import { AnimatedPresence } from '../unified/UnifiedAnimation';
import NotificationBadge from './NotificationBadge';

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // الاشتراك في الإشعارات
    const unsubscribe = notificationService.subscribeToNotifications((notifs) => {
      setNotifications(notifs.slice(0, 10)); // آخر 10 إشعارات
      setUnreadCount(notifs.filter((n) => !n.read).length);
    });

    // جلب الإحصائيات
    notificationService.fetchStats();

    // التحديث التلقائي
    const stopAutoRefresh = notificationService.startAutoRefresh(30000);

    return () => {
      unsubscribe();
      stopAutoRefresh();
    };
  }, []);

  const getTypeColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-blue-500';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${days} يوم`;
  };

  return (
    <div className="relative">
      {/* زر الإشعارات */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <NotificationBadge
            count={unreadCount}
            urgent={unreadCount > 5}
            className="absolute -right-1 -top-1"
          />
        )}
      </button>

      {/* القائمة المنسدلة */}
      <AnimatedPresence show={isOpen} variant="fade" duration="fast" className="fixed inset-0 z-40">
        {/* خلفية للإغلاق */}
        <div className="h-full w-full" onClick={() => setIsOpen(false)} />
      </AnimatedPresence>

      <AnimatedPresence
        show={isOpen}
        className="absolute left-0 top-full z-50 mt-2 w-80 origin-top-left rounded-xl border border-slate-700 bg-slate-800 shadow-2xl"
      >
        {/* الرأس */}
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h3 className="font-bold text-white">الإشعارات</h3>
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => notificationService.markAllAsRead()}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
                title="تحديد الكل كمقروء"
              >
                <CheckIcon className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* قائمة الإشعارات */}
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              <BellIcon className="mx-auto mb-2 h-12 w-12 opacity-50" />
              <p>لا توجد إشعارات</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border-b border-slate-700/50 p-4 transition-colors hover:bg-slate-700/50 ${
                  !notification.read ? 'bg-slate-700/30' : ''
                }`}
              >
                <div className="flex gap-3">
                  {/* النقطة الملونة */}
                  <div
                    className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${getTypeColor(notification.type)}`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-white">{notification.title}</p>
                      <button
                        onClick={() => notificationService.removeNotification(notification.id)}
                        className="flex-shrink-0 rounded p-1 text-slate-500 hover:bg-slate-600 hover:text-white"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {formatTime(notification.timestamp)}
                      </span>
                      {notification.actionUrl && (
                        <Link
                          href={notification.actionUrl}
                          onClick={() => {
                            notificationService.markAsRead(notification.id);
                            setIsOpen(false);
                          }}
                          className="text-xs text-blue-400 hover:text-blue-300"
                        >
                          {notification.actionLabel || 'عرض'}
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* الذيل */}
        {notifications.length > 0 && (
          <div className="border-t border-slate-700 p-3">
            <Link
              href="/admin/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm text-blue-400 hover:text-blue-300"
            >
              عرض جميع الإشعارات
            </Link>
          </div>
        )}
      </AnimatedPresence>
    </div>
  );
}
