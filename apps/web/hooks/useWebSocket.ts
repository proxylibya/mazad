/**
 * React Hook للاتصال بـ WebSocket
 * يدعم Topic-based subscriptions و Auto-reconnect
 */

import { logger } from '@/lib/utils/logger';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket, io } from 'socket.io-client';

/**
 * حالة الاتصال
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * خيارات Hook
 */
export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

/**
 * نتيجة Hook
 */
export interface UseWebSocketResult {
  socket: Socket | null;
  status: ConnectionStatus;
  subscribe: (topic: string) => void;
  unsubscribe: (topic: string) => void;
  connect: () => void;
  disconnect: () => void;
  isConnected: boolean;
}

/**
 * Hook للاتصال بـ WebSocket
 */
export function useWebSocket(
  topics: string[] = [],
  options: UseWebSocketOptions = {},
): UseWebSocketResult {
  const {
    autoConnect = true,
    reconnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 3000,
  } = options;

  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const socketRef = useRef<Socket | null>(null);
  const reconnectCountRef = useRef(0);
  const subscribedTopicsRef = useRef<Set<string>>(new Set());

  /**
   * إنشاء اتصال
   */
  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    setStatus('connecting');

    const socket = io(process.env.NEXT_PUBLIC_WS_URL || '', {
      transports: ['websocket', 'polling'],
      reconnection: reconnect,
      'reconnectionAttempts': reconnectAttempts,
      'reconnectionDelay': reconnectDelay,
    });

    // معالجة الاتصال الناجح
    socket.on('connect', () => {
      setStatus('connected');
      reconnectCountRef.current = 0;
      logger.info('WebSocket connected', { socketId: socket.id });

      // إعادة الاشتراك في Topics
      subscribedTopicsRef.current.forEach((topic) => {
        socket.emit('subscribe', topic);
      });
    });

    // معالجة قطع الاتصال
    socket.on('disconnect', (reason) => {
      setStatus('disconnected');
      logger.warn('WebSocket disconnected', { reason });
    });

    // معالجة الأخطاء
    socket.on('connect_error', (error) => {
      setStatus('error');
      logger.error('WebSocket connection error', { error });
      reconnectCountRef.current++;
    });

    // استلام تأكيد الاتصال
    socket.on('connected', (data) => {
      logger.debug('WebSocket connection confirmed', { data });
    });

    socketRef.current = socket;
  }, [reconnect, reconnectAttempts, reconnectDelay]);

  /**
   * قطع الاتصال
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setStatus('disconnected');
      subscribedTopicsRef.current.clear();
    }
  }, []);

  /**
   * الاشتراك في Topic
   */
  const subscribe = useCallback((topic: string) => {
    if (!socketRef.current?.connected) {
      logger.warn('Cannot subscribe: socket not connected', { topic });
      // حفظ للاشتراك لاحقاً عند الاتصال
      subscribedTopicsRef.current.add(topic);
      return;
    }

    socketRef.current.emit('subscribe', topic);
    subscribedTopicsRef.current.add(topic);
    logger.debug('Subscribed to topic', { topic });
  }, []);

  /**
   * إلغاء الاشتراك
   */
  const unsubscribe = useCallback((topic: string) => {
    if (!socketRef.current?.connected) {
      subscribedTopicsRef.current.delete(topic);
      return;
    }

    socketRef.current.emit('unsubscribe', topic);
    subscribedTopicsRef.current.delete(topic);
    logger.debug('Unsubscribed from topic', { topic });
  }, []);

  /**
   * الاتصال التلقائي عند التحميل
   */
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  /**
   * الاشتراك في Topics المحددة
   */
  useEffect(() => {
    if (!socketRef.current?.connected || topics.length === 0) {
      return;
    }

    topics.forEach((topic) => subscribe(topic));

    return () => {
      topics.forEach((topic) => unsubscribe(topic));
    };
  }, [topics, subscribe, unsubscribe]);

  return {
    socket: socketRef.current,
    status,
    subscribe,
    unsubscribe,
    connect,
    disconnect,
    isConnected: status === 'connected',
  };
}

/**
 * Hook للاشتراك في تحديثات المزاد
 */
export interface AuctionUpdate {
  type: 'bid' | 'auction' | 'auction_end';
  data: unknown;
  timestamp: number;
}

export function useAuctionUpdates(
  auctionId: string | null,
  onUpdate?: (update: AuctionUpdate) => void,
) {
  const topics = auctionId ? [`auction:${auctionId}`] : [];
  const { socket, ...rest } = useWebSocket(topics);

  useEffect(() => {
    if (!socket || !onUpdate) return;

    // معالجة التحديثات الفردية
    const handleUpdate = (update: AuctionUpdate) => {
      onUpdate(update);
    };

    // معالجة Batch Updates
    const handleBatchUpdate = (batch: { updates: AuctionUpdate[]; }) => {
      batch.updates.forEach((update) => onUpdate(update));
    };

    socket.on('bid', handleUpdate);
    socket.on('auction', handleUpdate);
    socket.on('auction_end', handleUpdate);
    socket.on('batch_update', handleBatchUpdate);

    return () => {
      socket.off('bid', handleUpdate);
      socket.off('auction', handleUpdate);
      socket.off('auction_end', handleUpdate);
      socket.off('batch_update', handleBatchUpdate);
    };
  }, [socket, onUpdate]);

  return { socket, ...rest };
}

/**
 * Hook لعدد المشاهدين
 */
export function useAuctionViewers(auctionId: string | null) {
  const [viewersCount, setViewersCount] = useState(0);
  const { socket, ...rest } = useWebSocket(auctionId ? [`auction:${auctionId}`] : []);

  useEffect(() => {
    if (!socket) return;

    socket.on('viewers_count', (data: { count: number; }) => {
      setViewersCount(data.count);
    });

    return () => {
      socket.off('viewers_count');
    };
  }, [socket]);

  return { viewersCount, socket, ...rest };
}

export default useWebSocket;
