/**
 * 🚀 Enterprise Socket Client Manager
 * مدير Socket.IO على جانب العميل بمميزات احترافية
 * 
 * المميزات:
 * - Auto-reconnection ذكي
 * - Exponential backoff
 * - Message queueing offline
 * - Event buffering
 * - Connection state management
 * - Heartbeat monitoring
 */

import { io, Socket } from 'socket.io-client';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from './enterprise-socket-server';

// ============================================
// Types
// ============================================

type SocketInstance = Socket<ServerToClientEvents, ClientToServerEvents>;

interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  attempts: number;
  lastError?: string;
}

interface QueuedMessage {
  event: keyof ClientToServerEvents;
  data: any;
  callback?: (...args: any[]) => void;
  timestamp: number;
}

// ============================================
// Enterprise Socket Client Class
// ============================================

class EnterpriseSocketClient {
  private socket: SocketInstance | null = null;
  private connectionState: ConnectionState = {
    status: 'disconnected',
    attempts: 0,
  };

  // Queue للرسائل المؤجلة عند عدم الاتصال
  private messageQueue: QueuedMessage[] = [];

  // Listeners مسجلة
  private eventListeners: Map<string, Set<(...args: any[]) => void>> = new Map();

  // معرف المستخدم الحالي
  private currentUserId: string | null = null;

  // إعدادات إعادة الاتصال
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000; // يبدأ من 1 ثانية
  private maxReconnectDelay = 30000; // حد أقصى 30 ثانية

  // Timer للـ Heartbeat
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private lastHeartbeat = 0;

  // Callbacks لحالة الاتصال
  private connectionCallbacks: Set<(state: ConnectionState) => void> = new Set();

  /**
   * الاتصال بالـ Socket.IO Server
   */
  connect(userId: string, token?: string): SocketInstance {
    if (this.socket?.connected) {
      console.log('⚡ [Socket Client] Already connected');
      return this.socket;
    }

    this.currentUserId = userId;
    this.updateConnectionState('connecting');

    const socketUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3021';

    this.socket = io(socketUrl, {
      path: '/api/socketio',
      addTrailingSlash: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: this.maxReconnectDelay,
      timeout: 20000,
      auth: {
        token,
        userId,
      },
      query: {
        userId,
      },
    }) as SocketInstance;

    this.setupEventHandlers();
    this.startHeartbeat();

    return this.socket;
  }

  /**
   * إعداد معالجات الأحداث الأساسية
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    // الاتصال الناجح
    this.socket.on('connect', () => {
      console.log('✅ [Socket Client] Connected successfully');
      this.updateConnectionState('connected');
      this.reconnectAttempts = 0;

      // الإعلان عن الحضور
      if (this.currentUserId) {
        this.socket!.emit('presence:announce', this.currentUserId);
      }

      // إرسال الرسائل المؤجلة
      this.flushMessageQueue();
    });

    // خطأ في الاتصال
    this.socket.on('connect_error', (error) => {
      console.error('❌ [Socket Client] Connection error:', error.message);
      this.updateConnectionState('disconnected', error.message);
    });

    // قطع الاتصال
    this.socket.on('disconnect', (reason) => {
      console.warn('⚠️ [Socket Client] Disconnected:', reason);
      this.updateConnectionState('disconnected', reason);
      this.stopHeartbeat();

      // محاولة إعادة الاتصال إذا كان قطع الاتصال من الخادم
      if (reason === 'io server disconnect') {
        this.attemptReconnect();
      }
    });

    // محاولة إعادة الاتصال
    this.socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`🔄 [Socket Client] Reconnection attempt ${attempt}/${this.maxReconnectAttempts}`);
      this.updateConnectionState('reconnecting');
    });

    // نجاح إعادة الاتصال
    this.socket.io.on('reconnect', (attempt) => {
      console.log(`✅ [Socket Client] Reconnected successfully after ${attempt} attempts`);
      this.reconnectAttempts = 0;
    });

    // فشل إعادة الاتصال
    this.socket.io.on('reconnect_failed', () => {
      console.error('❌ [Socket Client] Reconnection failed after maximum attempts');
      this.updateConnectionState('disconnected', 'Max reconnection attempts reached');
    });

    // Error event
    this.socket.on('error' as any, (error: any) => {
      console.error('❌ [Socket Client] Socket error:', error);
    });
  }

  /**
   * محاولة إعادة الاتصال مع Exponential Backoff
   */
  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ [Socket Client] Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`🔄 [Socket Client] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (this.socket && !this.socket.connected && this.currentUserId) {
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * تحديث حالة الاتصال
   */
  private updateConnectionState(status: ConnectionState['status'], error?: string) {
    this.connectionState = {
      status,
      attempts: this.reconnectAttempts,
      lastError: error,
    };

    // إخطار المستمعين
    this.connectionCallbacks.forEach(callback => {
      callback(this.connectionState);
    });
  }

  /**
   * بدء Heartbeat monitoring
   */
  private startHeartbeat() {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket?.connected) {
        const now = Date.now();
        this.socket.emit('typing:start', 'heartbeat'); // استخدام حدث موجود كـ ping
        this.lastHeartbeat = now;
      }
    }, 30000); // كل 30 ثانية
  }

  /**
   * إيقاف Heartbeat monitoring
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * إرسال الرسائل المؤجلة
   */
  private flushMessageQueue() {
    if (this.messageQueue.length === 0) return;

    console.log(`📤 [Socket Client] Flushing ${this.messageQueue.length} queued messages`);

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(({ event, data, callback }) => {
      if (this.socket?.connected) {
        (this.socket.emit as any)(event, data, callback);
      }
    });
  }

  /**
   * الانضمام لمحادثة
   */
  joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('⚠️ [Socket Client] Not connected, queueing join request');
      this.queueMessage('join:conversation', conversationId);
      return;
    }

    this.socket.emit('join:conversation', conversationId);
    console.log(`📝 [Socket Client] Joined conversation: ${conversationId}`);
  }

  /**
   * مغادرة محادثة
   */
  leaveConversation(conversationId: string) {
    if (!this.socket?.connected) {
      return;
    }

    this.socket.emit('leave:conversation', conversationId);
    console.log(`📝 [Socket Client] Left conversation: ${conversationId}`);
  }

  /**
   * إرسال رسالة
   */
  sendMessage(
    data: {
      conversationId: string;
      content: string;
      type: 'text' | 'image' | 'file' | 'location' | 'voice' | 'bid' | 'video';
      tempId?: string;
    },
    callback?: (response: any) => void
  ) {
    if (!this.socket?.connected) {
      console.warn('⚠️ [Socket Client] Not connected, queueing message');
      this.queueMessage('message:send', data, callback);
      return;
    }

    this.socket.emit('message:send', data, callback || (() => { }));
  }

  /**
   * بدء الكتابة
   */
  startTyping(conversationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:start', conversationId);
  }

  /**
   * إيقاف الكتابة
   */
  stopTyping(conversationId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit('typing:stop', conversationId);
  }

  /**
   * تأكيد قراءة الرسائل
   */
  markMessagesAsRead(conversationId: string, messageIds: string[]) {
    if (!this.socket?.connected) {
      this.queueMessage('message:mark-read', { conversationId, messageIds });
      return;
    }

    this.socket.emit('message:mark-read', { conversationId, messageIds });
  }

  /**
   * إضافة رسالة للقائمة المؤجلة
   */
  private queueMessage(
    event: keyof ClientToServerEvents,
    data: any,
    callback?: (...args: any[]) => void
  ) {
    this.messageQueue.push({
      event,
      data,
      callback,
      timestamp: Date.now(),
    });

    // حذف الرسائل القديمة (أكثر من 5 دقائق)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.messageQueue = this.messageQueue.filter(msg => msg.timestamp > fiveMinutesAgo);
  }

  /**
   * الاستماع لحدث معين
   */
  on<K extends keyof ServerToClientEvents>(
    event: K,
    listener: ServerToClientEvents[K]
  ): () => void {
    if (!this.socket) {
      console.warn('⚠️ [Socket Client] Socket not initialized');
      return () => { };
    }

    // تسجيل الـ listener
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(listener);

    // إضافة للـ socket
    this.socket.on(event, listener as any);

    // إرجاع دالة لإلغاء الاستماع
    return () => {
      if (this.socket) {
        this.socket.off(event, listener as any);
      }
      this.eventListeners.get(event)?.delete(listener);
    };
  }

  /**
   * إلغاء الاستماع لحدث
   */
  off<K extends keyof ServerToClientEvents>(
    event: K,
    listener?: ServerToClientEvents[K]
  ) {
    if (!this.socket) return;

    if (listener) {
      this.socket.off(event, listener as any);
      this.eventListeners.get(event)?.delete(listener);
    } else {
      this.socket.off(event);
      this.eventListeners.delete(event);
    }
  }

  /**
   * مراقبة حالة الاتصال
   */
  onConnectionStateChange(callback: (state: ConnectionState) => void): () => void {
    this.connectionCallbacks.add(callback);

    // إرسال الحالة الحالية فوراً
    callback(this.connectionState);

    // إرجاع دالة لإلغاء الاشتراك
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  /**
   * الحصول على حالة الاتصال
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * التحقق من الاتصال
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * قطع الاتصال
   */
  disconnect() {
    if (this.socket) {
      this.stopHeartbeat();
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentUserId = null;
    this.updateConnectionState('disconnected');
    console.log('🔌 [Socket Client] Disconnected manually');
  }

  /**
   * الحصول على Socket instance
   */
  getSocket(): SocketInstance | null {
    return this.socket;
  }
}

// ============================================
// Singleton Instance
// ============================================

const enterpriseSocketClient = new EnterpriseSocketClient();

export default enterpriseSocketClient;
export { EnterpriseSocketClient };
export type { ConnectionState };

