/**
 * Enhanced WebSocket Manager for Real-time Auctions
 * نظام WebSocket محسن للمزادات المباشرة
 */

import { io, Socket } from 'socket.io-client';
import {
  AuctionState,
  BidData,
  ClientToServerEvents,
  ConnectionState,
  ServerToClientEvents,
} from '../../types/socket';

// Client-side Socket type
type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// Event listener type for internal emitter
type Listener = (data: unknown) => void;

export interface WebSocketConfig {
  url?: string;
  path?: string;
  transports?: string[];
  timeout?: number;
  reconnection?: boolean;
  reconnectionDelay?: number;
  reconnectionAttempts?: number;
  forceNew?: boolean;
  upgrade?: boolean;
  protocols?: string[] | undefined;
}

export enum MessagePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface QueuedMessage {
  event: keyof ClientToServerEvents;
  data: unknown;
  priority: MessagePriority;
  timestamp: Date;
  retryCount?: number;
}

export interface WebSocketStats {
  connected: boolean;
  connectionState: ConnectionState;
  reconnectAttempts: number;
  messagesSent: number;
  messagesReceived: number;
  lastConnected?: Date;
  lastDisconnected?: Date;
  connectionUptime: number;
  queueLength: number;
}

export class EnhancedWebSocketManager {
  private socket: ClientSocket | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // Start with 1 second
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private currentAuction: string | null = null;
  private eventListeners = new Map<string, Listener[]>();
  private messageQueue: QueuedMessage[] = [];
  private isProcessingQueue = false;
  private stats!: WebSocketStats;

  // Connection status callbacks
  private onConnectionChange?: (state: ConnectionState) => void;
  private onError?: (error: { code: string; message: string }) => void;
  private config!: WebSocketConfig;

  constructor(config: WebSocketConfig = {}) {
    if (typeof window === 'undefined') {
      // Server-side rendering check
      return;
    }

    this.config = {
      url:
        config.url ||
        (process.env.NODE_ENV === 'production'
          ? process.env.NEXT_PUBLIC_APP_URL || window.location.origin
          : 'http://localhost:3021'),
      path: config.path || '/api/socket',
      transports: config.transports || ['websocket', 'polling'],
      timeout: config.timeout || 20000,
      reconnection: config.reconnection !== false,
      reconnectionDelay: config.reconnectionDelay || 1000,
      reconnectionAttempts: config.reconnectionAttempts || 5,
      forceNew: config.forceNew || false,
      upgrade: config.upgrade !== false,
      protocols: config.protocols,
    };

    this.stats = {
      connected: false,
      connectionState: 'disconnected',
      reconnectAttempts: 0,
      messagesSent: 0,
      messagesReceived: 0,
      connectionUptime: 0,
      queueLength: 0,
    };

    this.initializeSocket();
  }

  /**
   * Initialize Socket.IO connection
   */
  private initializeSocket(): void {
    try {
      this.socket = io(this.config.url!, {
        path: this.config.path,
        transports: this.config.transports,
        timeout: this.config.timeout,
        reconnection: this.config.reconnection,
        reconnectionDelay: this.config.reconnectionDelay,
        reconnectionAttempts: this.config.reconnectionAttempts,
        forceNew: this.config.forceNew as boolean,
        upgrade: this.config.upgrade,
      });

      this.setupEventHandlers();
      this.setConnectionState('connecting');

      // Set connection timeout
      this.connectionTimeout = setTimeout(() => {
        if (this.connectionState === 'connecting') {
          this.handleError('CONNECTION_TIMEOUT', 'Connection timeout');
        }
      }, this.config.timeout || 20000);
    } catch (error) {
      console.error('خطأ في تهيئة Socket:', error);
      this.handleError('INITIALIZATION_ERROR', 'Failed to initialize socket');
    }
  }

  /**
   * Setup comprehensive socket event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      this.clearTimers();
      this.setConnectionState('connected');
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;
      this.stats.lastConnected = new Date();
      this.startHeartbeat();
      this.processMessageQueue();
    });

    this.socket.on('disconnect', (reason: string) => {
      this.setConnectionState('disconnected');
      this.stats.lastDisconnected = new Date();
      this.stopHeartbeat();

      if (reason === 'io server disconnect') {
        // Server initiated disconnect, try to reconnect
        this.scheduleReconnect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('[خطأ] خطأ في الاتصال:', error);
      this.setConnectionState('error');
      this.handleError('CONNECTION_ERROR', error.message);
      this.scheduleReconnect();
    });

    // Auction-specific events
    this.socket.on('auction:joined', (data) => {
      this.currentAuction = data.auction?.auctionId || null;
      this.emit('auction:joined', data);
      this.stats.messagesReceived++;
    });

    this.socket.on('auction:left', (data: { userId?: string }) => {
      this.emit('auction:left', data);
      this.stats.messagesReceived++;
    });

    this.socket.on('bid:placed', (bid: BidData) => {
      this.emit('bid:placed', bid);
      this.stats.messagesReceived++;
    });

    this.socket.on('bid:rejected', (data: { reason?: string }) => {
      this.emit('bid:rejected', data);
      this.stats.messagesReceived++;
    });

    this.socket.on('bid:outbid', (data: unknown) => {
      this.emit('bid:outbid', data);
      this.stats.messagesReceived++;
    });

    this.socket.on('auction:state-updated', (auction: AuctionState) => {
      this.emit('auction:state-updated', auction);
      this.stats.messagesReceived++;
    });

    this.socket.on('auction:started', (auction: AuctionState) => {
      this.emit('auction:started', auction);
      this.stats.messagesReceived++;
    });

    this.socket.on('auction:ending-soon', (data: { remainingSeconds?: number }) => {
      this.emit('auction:ending-soon', data);
      this.stats.messagesReceived++;
    });

    this.socket.on('auction:ended', (data: unknown) => {
      this.emit('auction:ended', data);
      this.currentAuction = null;
      this.stats.messagesReceived++;
    });

    this.socket.on('auction:extended', (data: unknown) => {
      this.emit('auction:extended', data);
      this.stats.messagesReceived++;
    });

    // Notification events
    this.socket.on('notification:info', (data: unknown) => {
      this.emit('notification:info', data);
      this.stats.messagesReceived++;
    });

    this.socket.on('notification:auction', (data: unknown) => {
      this.emit('notification:auction', data);
      this.stats.messagesReceived++;
    });

    // Error handling
    this.socket.on('error:auction', (errData: { code: string; error: string }) => {
      console.error('خطأ في المزاد:', errData);
      this.handleError(errData.code, errData.error);
    });

    // Connection status updates
    this.socket.on('connection:status', (data: { status?: string }) => {
      if (data.status === 'connected') {
        this.setConnectionState('connected');
      }
      this.emit('connection:status', data);
    });
  }

  /**
   * Join an auction room
   */
  public async joinAuction(
    auctionId: string,
    userToken: string,
  ): Promise<{ success: boolean; error?: string; auction?: AuctionState }> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected()) {
        resolve({ success: false, error: 'Socket not connected' });
        return;
      }

      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Connection timeout' });
      }, 10000);

      this.socket.emit('auction:join', { auctionId, userToken }, (response: any) => {
        clearTimeout(timeout);
        resolve(response);
      });
    });
  }

  /**
   * Leave auction room
   */
  public leaveAuction(auctionId: string): void {
    if (!this.socket || !this.isConnected()) return;

    this.socket.emit('auction:leave', { auctionId });
    this.currentAuction = null;
  }

  /**
   * Place a bid with queue support
   */
  public async placeBid(
    auctionId: string,
    amount: number,
    priority: MessagePriority = MessagePriority.HIGH,
  ): Promise<{ success: boolean; error?: string; bid?: BidData }> {
    return new Promise((resolve) => {
      const message: QueuedMessage = {
        event: 'bid:place',
        data: { auctionId, amount },
        priority,
        timestamp: new Date(),
        retryCount: 0,
      };

      if (!this.socket || !this.isConnected()) {
        // Queue message for later processing
        this.messageQueue.push(message);
        this.stats.queueLength = this.messageQueue.length;
        resolve({
          success: false,
          error: 'Socket not connected - message queued',
        });
        return;
      }

      if (!this.currentAuction || this.currentAuction !== auctionId) {
        resolve({ success: false, error: 'Not in auction room' });
        return;
      }

      const timeout = setTimeout(() => {
        resolve({ success: false, error: 'Bid timeout' });
      }, 5000);

      this.socket.emit(
        'bid:place',
        { auctionId, amount },
        (response: { success: boolean; error?: string; bid?: BidData }) => {
          clearTimeout(timeout);
          this.stats.messagesSent++;
          resolve(response);
        },
      );
    });
  }

  /**
   * Send message with priority queue
   */
  public async sendMessage(
    event: keyof ClientToServerEvents,
    data: unknown,
    priority: MessagePriority = MessagePriority.MEDIUM,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.socket || !this.isConnected()) {
        // Queue message
        const message: QueuedMessage = {
          event,
          data,
          priority,
          timestamp: new Date(),
          retryCount: 0,
        };
        this.messageQueue.push(message);
        this.stats.queueLength = this.messageQueue.length;
        resolve(false);
        return;
      }

      (this.socket as any).emit(event, data, () => {
        this.stats.messagesSent++;
        resolve(true);
      });
    });
  }

  /**
   * Process message queue
   */
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessingQueue || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    // Sort by priority
    const priorityOrder = {
      [MessagePriority.HIGH]: 0,
      [MessagePriority.MEDIUM]: 1,
      [MessagePriority.LOW]: 2,
    };

    this.messageQueue.sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 1;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 1;
      return aPriority - bPriority;
    });

    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.stats.queueLength = this.messageQueue.length;
        await this.sendMessage(message.event, message.data, message.priority);
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Start heartbeat to maintain connection
   */
  private startHeartbeat(): void {
    this.stopHeartbeat(); // Clear any existing interval

    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.isConnected()) {
        this.socket.emit('heartbeat');
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('🔄 تجاوز الحد الأقصى لمحاولات إعادة الاتصال');
      this.setConnectionState('error');
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');
    this.stats.reconnectAttempts = this.reconnectAttempts;

    const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000);

    this.reconnectTimer = setTimeout(() => {
      if (this.socket && !this.isConnected()) {
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * Clear all timers
   */
  private clearTimers(): void {
    if (this.connectionTimeout !== null) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Set connection state and notify listeners
   */
  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.stats.connectionState = state;
    this.stats.connected = state === 'connected';

    if (this.onConnectionChange) {
      this.onConnectionChange(state);
    }
  }

  /**
   * Handle errors
   */
  private handleError(code: string, message: string): void {
    if (this.onError) {
      this.onError({ code, message });
    }
    this.emit('error', { code, message });
  }

  /**
   * Event listener management
   */
  public on(event: string, listener: Listener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  public off(event: string, listener: Listener): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: unknown): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(data);
        } catch (error) {
          console.error(`خطأ في معالج الحدث ${event}:`, error);
        }
      });
    }
  }

  /**
   * Public getters and utilities
   */
  public isConnected(): boolean {
    return this.socket?.connected === true && this.connectionState === 'connected';
  }

  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  public getCurrentAuction(): string | null {
    return this.currentAuction;
  }

  public getStats(): WebSocketStats {
    return { ...this.stats };
  }

  public getQueueLength(): number {
    return this.messageQueue.length;
  }

  public setConnectionChangeCallback(callback: (state: ConnectionState) => void): void {
    this.onConnectionChange = callback;
  }

  public setErrorCallback(callback: (error: { code: string; message: string }) => void): void {
    this.onError = callback;
  }

  /**
   * Clean up connections
   */
  public disconnect(): void {
    this.clearTimers();
    this.stopHeartbeat();

    if (this.currentAuction && this.socket) {
      this.leaveAuction(this.currentAuction);
    }

    // Process remaining messages in queue
    this.messageQueue.length = 0;
    this.stats.queueLength = 0;

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.setConnectionState('disconnected');
    this.eventListeners.clear();
  }
}

// Singleton instance for global use
let websocketManagerInstance: EnhancedWebSocketManager | null = null;

export function getWebSocketManager(config?: WebSocketConfig): EnhancedWebSocketManager {
  if (typeof window === 'undefined') {
    // Server-side rendering - return mock
    return {} as EnhancedWebSocketManager;
  }

  if (!websocketManagerInstance) {
    websocketManagerInstance = new EnhancedWebSocketManager(config);
  }

  return websocketManagerInstance;
}

export function destroyWebSocketManager(): void {
  if (websocketManagerInstance) {
    websocketManagerInstance.disconnect();
    websocketManagerInstance = null;
  }
}
