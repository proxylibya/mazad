/**
 * 🎣 Hook للإشعارات الفورية عبر SSE
 * 
 * يتصل بـ /api/notifications/stream ويستقبل الإشعارات فوراً
 * 
 * @version 1.0.0
 * @date 2025-01-22
 */

import { unifiedNotificationManager } from '@/lib/notifications/UnifiedNotificationManager';
import { getCurrentUser } from '@/utils/authUtils';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface RealtimeNotificationsOptions {
  // تفعيل الاتصال
  enabled?: boolean;
  // إعادة الاتصال التلقائي
  autoReconnect?: boolean;
  // مدة الانتظار قبل إعادة الاتصال (ms)
  reconnectDelay?: number;
  // عدد محاولات إعادة الاتصال
  maxReconnectAttempts?: number;
  // Callback عند استقبال إشعار جديد
  onNotification?: (notification: any) => void;
  // Callback عند الاتصال
  onConnect?: () => void;
  // Callback عند قطع الاتصال
  onDisconnect?: () => void;
  // Callback عند الخطأ
  onError?: (error: Error) => void;
}

export function useRealtimeNotifications(options: RealtimeNotificationsOptions = {}) {
  const {
    enabled = true,
    autoReconnect = true,
    reconnectDelay = 5000,
    maxReconnectAttempts = 10,
    onNotification,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'disconnected' | 'connecting' | 'connected' | 'error'
  >('disconnected');
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!enabled) return;

    const user = getCurrentUser();
    if (!user?.id) {
      console.warn('[Realtime] لا يوجد مستخدم مسجل دخول');
      return;
    }

    // إغلاق الاتصال السابق إن وجد
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionStatus('connecting');
    console.log('[Realtime] 🔄 جاري الاتصال بـ SSE...');

    try {
      // الحصول على التوكن
      const token = localStorage.getItem('token') || '';

      // إنشاء اتصال SSE
      const eventSource = new EventSource(
        `/api/notifications/stream?token=${encodeURIComponent(token)}`
      );

      eventSourceRef.current = eventSource;

      // عند الاتصال الناجح
      eventSource.onopen = () => {
        console.log('[Realtime] ✅ تم الاتصال بنجاح');
        setIsConnected(true);
        setConnectionStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
        onConnect?.();
      };

      // عند استقبال رسالة
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          console.log('[Realtime] 📨 استقبال:', data.type);

          switch (data.type) {
            case 'connected':
              console.log('[Realtime] متصل كمستخدم:', data.userId);
              break;

            case 'initial':
              console.log('[Realtime] 📥 إشعارات أولية:', data.notifications.length);
              data.notifications.forEach((notif: any) => {
                onNotification?.(notif);
              });
              break;

            case 'new':
              console.log('[Realtime] 🆕 إشعارات جديدة:', data.count);
              data.notifications.forEach((notif: any) => {
                onNotification?.(notif);
                // إطلاق حدث في النظام الموحد
                unifiedNotificationManager.on('notification', notif);
              });
              break;

            case 'push':
              console.log('[Realtime] ⚡ إشعار فوري');
              onNotification?.(data.notification);
              break;

            case 'broadcast':
              console.log('[Realtime] 📡 إشعار عام');
              onNotification?.(data.notification);
              break;

            default:
              console.log('[Realtime] نوع غير معروف:', data.type);
          }
        } catch (err) {
          console.error('[Realtime] خطأ في معالجة الرسالة:', err);
        }
      };

      // عند حدوث خطأ
      eventSource.onerror = (err) => {
        console.error('[Realtime] ❌ خطأ في الاتصال:', err);
        setIsConnected(false);
        setConnectionStatus('error');

        const error = new Error('فشل الاتصال بخادم الإشعارات');
        setError(error);
        onError?.(error);
        onDisconnect?.();

        eventSource.close();

        // إعادة الاتصال التلقائي
        if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          console.log(
            `[Realtime] 🔄 إعادة المحاولة ${reconnectAttemptsRef.current}/${maxReconnectAttempts} بعد ${reconnectDelay}ms`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else {
          console.error('[Realtime] 🚫 فشلت جميع محاولات إعادة الاتصال');
        }
      };
    } catch (err) {
      console.error('[Realtime] خطأ في إنشاء الاتصال:', err);
      const error = err instanceof Error ? err : new Error('خطأ غير معروف');
      setError(error);
      setConnectionStatus('error');
      onError?.(error);
    }
  }, [
    enabled,
    autoReconnect,
    reconnectDelay,
    maxReconnectAttempts,
    onConnect,
    onDisconnect,
    onError,
    onNotification,
  ]);

  const disconnect = useCallback(() => {
    console.log('[Realtime] 🔌 قطع الاتصال يدوياً');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  const reconnect = useCallback(() => {
    console.log('[Realtime] 🔄 إعادة الاتصال يدوياً');
    disconnect();
    setTimeout(() => {
      reconnectAttemptsRef.current = 0;
      connect();
    }, 100);
  }, [connect, disconnect]);

  // الاتصال عند التحميل
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  // التنظيف عند إلغاء التحميل
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  return {
    isConnected,
    connectionStatus,
    error,
    connect,
    disconnect,
    reconnect,
  };
}
