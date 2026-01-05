/**
 * Socket.IO Server Implementation for Real-time Auctions
 * خادم Socket.IO للمزادات المباشرة
 */

import { Server as NetServer } from 'http';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextApiRequest } from 'next';
import { Socket as IOSocket, Server as SocketIOServer } from 'socket.io';
import keydbClient from '../../lib/keydb';
import prisma, { dbHelpers } from '../../lib/prisma';
import { NextApiResponseServerIO } from '../../types/next';
import {
  AuctionState,
  ClientToServerEvents,
  RateLimitConfig,
  ServerToClientEvents,
  SocketData,
  SocketErrorCodes,
  SocketUser,
} from '../../types/socket';

// استخدام KeyDB للأحمال العالية بدلاً من Memory
const RATE_LIMIT_PREFIX = 'socket:ratelimit:';
const CONNECTED_USERS_PREFIX = 'socket:users:';

// Connected users tracking (in-memory fallback for Socket.IO)
const connectedUsers = new Map<string, { socketId: string; lastActivity: number; }>();

// Rate limiting configuration
const RATE_LIMITS: RateLimitConfig = {
  bidsPerMinute: 10,
  messagesPerMinute: 30,
  callsPerMinute: 8,
  connectionsPerIP: process.env.NODE_ENV === 'production' ? 5 : 20,
  maxReconnectAttempts: process.env.NODE_ENV === 'production' ? 3 : 10,
  banDurationMinutes: process.env.NODE_ENV === 'production' ? 15 : 2,
};

/**
 * Authentication middleware for socket connections
 */
async function authenticateSocket(token: string): Promise<SocketUser | null> {
  try {
    const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
    const decoded = jwt.verify(token, secret) as JwtPayload | string;

    if (typeof decoded !== 'object' || !decoded || !('userId' in decoded)) {
      return null;
    }

    const userId = String((decoded as Record<string, unknown>).userId);

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        accountType: true,
        verified: true,
        status: true,
      },
    });

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      role: user.role as SocketUser['role'],
      accountType: user.accountType,
      verified: user.verified,
    };
  } catch (error) {
    console.error('Socket authentication error:', error);
    return null;
  }
}

/**
 * Rate limiting check باستخدام KeyDB للأحمال العالية
 */
async function checkRateLimit(key: string, limit: number, windowMs: number = 60000): Promise<boolean> {
  try {
    const redisKey = `${RATE_LIMIT_PREFIX}${key}`;
    const current = await keydbClient.get<number>(redisKey);
    const count = current ? parseInt(String(current), 10) : 0;

    if (count >= limit) {
      return false;
    }

    // Increment and set expiry
    await keydbClient.set(redisKey, count + 1, Math.ceil(windowMs / 1000));
    return true;
  } catch (error) {
    console.error('Rate limit check error:', error);
    // في حالة خطأ KeyDB، نسمح بالطلب
    return true;
  }
}

/**
 * Clean up inactive connections باستخدام KeyDB
 */
async function cleanupInactiveConnections() {
  try {
    // في KeyDB، المفاتيح تنتهي تلقائياً بـ TTL
    // لا حاجة لتنظيف يدوي
    // console.log('[Socket.IO] KeyDB auto-expires inactive connections');
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

// Clean up every 10 minutes (خفيف لأن KeyDB يدير TTL تلقائياً)
setInterval(cleanupInactiveConnections, 10 * 60 * 1000);

export default function SocketHandler(req: NextApiRequest, res: NextApiResponseServerIO) {
  if (!res.socket.server.io) {
    const httpServer: NetServer = res.socket.server as unknown as NetServer;
    const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(
      httpServer,
      {
        path: '/api/socket',
        addTrailingSlash: false,
        cors: {
          origin:
            process.env.NODE_ENV === 'production'
              ? (process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : [])
              : ['http://localhost:3020', 'http://localhost:3021'],
          methods: ['GET', 'POST'],
          credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 60000,
        pingInterval: 25000,
        upgradeTimeout: 30000,
        allowRequest: (req, fn) => {
          // IP-based rate limiting مع KeyDB
          const clientIP =
            req.headers?.['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
          const ipKey = `ip:${clientIP}`;

          checkRateLimit(ipKey, RATE_LIMITS.connectionsPerIP, 60000)
            .then((allowed) => {
              if (!allowed) {
                fn('Rate limit exceeded', false);
                return;
              }
              fn(null, true);
            })
            .catch(() => {
              // في حالة خطأ، نسمح بالاتصال
              fn(null, true);
            });

        },
      },
    );

    // Socket connection handler
    io.on('connection', async (socket) => {
      const s = socket as IOSocket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
      const _clientIP = socket.handshake.headers['x-forwarded-for'] || socket.conn.remoteAddress;

      // Presence announce (global online status)
      socket.on('presence:announce', async (data: { userToken: string; }) => {
        try {
          const user = await authenticateSocket(data.userToken);
          if (!user) return;

          socket.data.user = user;
          socket.data.lastActivity = Date.now();
          socket.data.isAuthenticated = true;

          // حفظ في KeyDB بدلاً من Memory
          await keydbClient.set(
            `${CONNECTED_USERS_PREFIX}${user.id}`,
            { socketId: socket.id, lastActivity: Date.now() },
            5 * 60 // 5 minutes TTL
          );
          io.emit('presence:update', { userId: user.id, isOnline: true });
        } catch (err) {
          // ignore
        }
      });

      // Chat join/leave rooms
      socket.on('chat:join', async (data: { conversationId: string; userToken: string; }) => {
        try {
          const user = await authenticateSocket(data.userToken);
          if (!user) return;
          socket.data.user = user;
          socket.data.lastActivity = Date.now();
          socket.data.isAuthenticated = true;
          await socket.join(`chat:${data.conversationId}`);
        } catch (_) { }
      });

      socket.on('chat:leave', async (data: { conversationId: string; }) => {
        try {
          await socket.leave(`chat:${data.conversationId}`);
        } catch (_) { }
      });

      // Chat typing start/stop
      socket.on('chat:typing:start', (data: { conversationId: string; }) => {
        if (!socket.data?.user) return;
        io.to(`chat:${data.conversationId}`).emit('chat:typing', {
          conversationId: data.conversationId,
          userId: socket.data.user.id,
          typing: true,
        });
      });

      socket.on('chat:typing:stop', (data: { conversationId: string; }) => {
        if (!socket.data?.user) return;
        io.to(`chat:${data.conversationId}`).emit('chat:typing', {
          conversationId: data.conversationId,
          userId: socket.data.user.id,
          typing: false,
        });
      });

      // Chat message read (client indicates it has viewed messages)
      socket.on('chat:message:read', async (data: { conversationId: string; }) => {
        try {
          if (!socket.data?.user) return;
          const readerId = socket.data.user.id;
          await dbHelpers.markMessagesAsRead(data.conversationId, readerId);
          io.to(`chat:${data.conversationId}`).emit('chat:messages:read', {
            conversationId: String(data.conversationId),
            readerId: String(readerId),
            readAt: new Date().toISOString(),
          });
        } catch (_) {
          // ignore
        }
      });

      // Chat message delivered (ACK from client)
      socket.on('chat:message:delivered', async (data: { conversationId: string; messageId: string; }) => {
        if (!socket.data?.user) return;
        try {
          await dbHelpers.markMessageDelivered(String(data.messageId), String(socket.data.user.id));
        } catch (_) {
          // ignore DB errors for delivery; still broadcast for UI
        }
        io.to(`chat:${data.conversationId}`).emit('chat:message:delivered', {
          conversationId: String(data.conversationId),
          messageId: String(data.messageId),
          deliveredTo: String(socket.data.user.id),
          deliveredAt: new Date().toISOString(),
        });
      });

      // ===== Calls (WebRTC signaling)
      // Helper: verify user and membership
      async function ensureMember(conversationId: string): Promise<{ ok: boolean; userId?: string; }> {
        try {
          const user = socket.data?.user;
          if (!user) return { ok: false };
          const allowed = await dbHelpers.isUserInConversation(conversationId, user.id);
          return { ok: !!allowed, userId: user.id };
        } catch {
          return { ok: false };
        }
      }

      // Helper: get other participant id
      async function getOtherParticipantId(conversationId: string, currentUserId: string): Promise<string | null> {
        try {
          const participants = await prisma.conversation_participants.findMany({
            where: { conversationId: String(conversationId) },
            select: { userId: true },
            take: 2,
          });
          const other = participants.find((p) => String(p.userId) !== String(currentUserId));
          return other ? String(other.userId) : null;
        } catch {
          return null;
        }
      }

      // Helper: emit to specific user via KeyDB mapping if available, otherwise to room
      async function emitToUserOrRoom(
        event: keyof ServerToClientEvents | string,
        conversationId: string,
        toUserId: string,
        payload: unknown,
      ) {
        try {
          const key = `${CONNECTED_USERS_PREFIX}${toUserId}`;
          const connection = await keydbClient.get<{ socketId: string; }>(key);
          if (connection?.socketId) {
            io.to(connection.socketId).emit(event as never, payload as never);
            return;
          }
        } catch {
          // ignore
        }
        // fallback to room (may reach other devices already in room)
        io.to(`chat:${conversationId}`).emit(event as never, payload as never);
      }

      socket.on(
        'call:start',
        async (data: { conversationId: string; toUserId: string; media: 'video' | 'audio'; callId: string; }) => {
          try {
            const membership = await ensureMember(String(data.conversationId));
            if (!membership.ok || !membership.userId) return;
            const fromUserId = membership.userId;

            // Basic validation: ensure toUserId is in conversation
            const otherId = await getOtherParticipantId(String(data.conversationId), String(fromUserId));
            if (!otherId || String(otherId) !== String(data.toUserId)) return;

            // Rate limit calls per minute
            const allowed = await checkRateLimit(
              `user:${fromUserId}:call`,
              RATE_LIMITS.callsPerMinute || 8,
              60000,
            );
            if (!allowed) {
              await emitToUserOrRoom('call:error', data.conversationId, fromUserId, {
                conversationId: String(data.conversationId),
                callId: String(data.callId),
                message: 'تم تجاوز حد المكالمات المسموح بها مؤقتاً',
              });
              return;
            }

            // Notify callee with ring
            const ringPayload = {
              conversationId: String(data.conversationId),
              callId: String(data.callId),
              fromUserId: String(fromUserId),
              toUserId: String(otherId),
              media: data.media,
              startedAt: new Date().toISOString(),
            };
            await emitToUserOrRoom('call:ring', String(data.conversationId), String(otherId), ringPayload);
          } catch (err) {
            // ignore
          }
        },
      );

      socket.on('call:accept', async (data: { conversationId: string; callId: string; }) => {
        const membership = await ensureMember(String(data.conversationId));
        if (!membership.ok || !membership.userId) return;
        const userId = membership.userId;
        const otherId = await getOtherParticipantId(String(data.conversationId), String(userId));
        if (!otherId) return;
        await emitToUserOrRoom('call:accepted', String(data.conversationId), String(otherId), {
          conversationId: String(data.conversationId),
          callId: String(data.callId),
          byUserId: String(userId),
        });
      });

      socket.on(
        'call:reject',
        async (data: { conversationId: string; callId: string; reason?: string; }) => {
          const membership = await ensureMember(String(data.conversationId));
          if (!membership.ok || !membership.userId) return;
          const userId = membership.userId;
          const otherId = await getOtherParticipantId(String(data.conversationId), String(userId));
          if (!otherId) return;
          await emitToUserOrRoom('call:rejected', String(data.conversationId), String(otherId), {
            conversationId: String(data.conversationId),
            callId: String(data.callId),
            byUserId: String(userId),
            reason: data.reason,
          });
          if (data.reason === 'busy') {
            await emitToUserOrRoom('call:busy', String(data.conversationId), String(otherId), {
              conversationId: String(data.conversationId),
              callId: String(data.callId),
              toUserId: String(otherId),
            });
          }
        },
      );

      socket.on('call:cancel', async (data: { conversationId: string; callId: string; }) => {
        const membership = await ensureMember(String(data.conversationId));
        if (!membership.ok || !membership.userId) return;
        const userId = membership.userId;
        const otherId = await getOtherParticipantId(String(data.conversationId), String(userId));
        if (!otherId) return;
        await emitToUserOrRoom('call:ended', String(data.conversationId), String(otherId), {
          conversationId: String(data.conversationId),
          callId: String(data.callId),
          byUserId: String(userId),
          reason: 'cancelled',
        });
      });

      socket.on(
        'call:ended',
        async (data: { conversationId: string; callId: string; reason?: string; }) => {
          const membership = await ensureMember(String(data.conversationId));
          if (!membership.ok || !membership.userId) return;
          const userId = membership.userId;
          const otherId = await getOtherParticipantId(String(data.conversationId), String(userId));
          if (!otherId) return;
          await emitToUserOrRoom('call:ended', String(data.conversationId), String(otherId), {
            conversationId: String(data.conversationId),
            callId: String(data.callId),
            byUserId: String(userId),
            reason: data.reason,
          });
        },
      );

      // SDP/ICE relay with separate rate limit bucket
      socket.on(
        'call:offer',
        async (data: { conversationId: string; callId: string; sdp: unknown; }) => {
          const membership = await ensureMember(String(data.conversationId));
          if (!membership.ok || !membership.userId) return;
          const userId = membership.userId;
          const allowed = await checkRateLimit(`user:${userId}:call-signal`, 120, 60000);
          if (!allowed) return;
          const otherId = await getOtherParticipantId(String(data.conversationId), String(userId));
          if (!otherId) return;
          await emitToUserOrRoom('call:offer', String(data.conversationId), String(otherId), {
            conversationId: String(data.conversationId),
            callId: String(data.callId),
            sdp: data.sdp,
            fromUserId: String(userId),
          });
        },
      );

      socket.on(
        'call:answer',
        async (data: { conversationId: string; callId: string; sdp: unknown; }) => {
          const membership = await ensureMember(String(data.conversationId));
          if (!membership.ok || !membership.userId) return;
          const userId = membership.userId;
          const allowed = await checkRateLimit(`user:${userId}:call-signal`, 120, 60000);
          if (!allowed) return;
          const otherId = await getOtherParticipantId(String(data.conversationId), String(userId));
          if (!otherId) return;
          await emitToUserOrRoom('call:answer', String(data.conversationId), String(otherId), {
            conversationId: String(data.conversationId),
            callId: String(data.callId),
            sdp: data.sdp,
            fromUserId: String(userId),
          });
        },
      );

      socket.on(
        'call:ice-candidate',
        async (data: { conversationId: string; callId: string; candidate: unknown; }) => {
          const membership = await ensureMember(String(data.conversationId));
          if (!membership.ok || !membership.userId) return;
          const userId = membership.userId;
          const allowed = await checkRateLimit(`user:${userId}:call-signal`, 300, 60000);
          if (!allowed) return;
          const otherId = await getOtherParticipantId(String(data.conversationId), String(userId));
          if (!otherId) return;
          await emitToUserOrRoom('call:ice-candidate', String(data.conversationId), String(otherId), {
            conversationId: String(data.conversationId),
            callId: String(data.callId),
            candidate: data.candidate,
            fromUserId: String(userId),
          });
        },
      );

      // Authentication on connection
      socket.on('auction:join', async (data, callback) => {
        try {
          // Authenticate user
          const user = await authenticateSocket(data.userToken);
          if (!user) {
            callback({ success: false, error: 'Authentication failed' });
            s.emit('error:auction', {
              error: 'فشل في التحقق من الهوية',
              code: SocketErrorCodes.UNAUTHORIZED,
            });
            return;
          }

          // Rate limiting for this user
          const userKey = `user:${user.id}:join`;
          if (!checkRateLimit(userKey, 3, 60000)) {
            // 3 joins per minute
            callback({ success: false, error: 'Too many join attempts' });
            return;
          }

          // Store user data in socket
          socket.data = {
            user,
            currentAuction: data.auctionId,
            joinedAt: Date.now(),
            lastActivity: Date.now(),
            isAuthenticated: true,
          };

          // Check if auction exists and is accessible
          const auction = await prisma.auctions.findUnique({
            where: { id: data.auctionId },
            include: {
              bids: {
                orderBy: { amount: 'desc' },
                take: 1,
                include: {
                  users: {
                    select: {
                      id: true,
                      name: true,
                      verified: true,
                    },
                  },
                },
              },
            },
          });

          if (!auction) {
            callback({ success: false, error: 'Auction not found' });
            s.emit('error:auction', {
              error: 'المزاد غير موجود',
              code: SocketErrorCodes.AUCTION_NOT_FOUND,
              auctionId: data.auctionId,
            });
            return;
          }

          // Ensure auction is active
          const now = new Date();
          if (auction.status === 'ENDED' || auction.endDate < now) {
            callback({ success: false, error: 'Auction has ended' });
            s.emit('error:auction', {
              error: 'المزاد قد انتهى',
              code: SocketErrorCodes.AUCTION_ENDED,
              auctionId: data.auctionId,
            });
            return;
          }

          // Join auction room
          await socket.join(`auction:${data.auctionId}`);

          // Track connected user
          connectedUsers.set(user.id, {
            socketId: socket.id,
            lastActivity: Date.now(),
          });

          // Get current auction state
          const currentBid = auction.bids[0];
          const currentPrice = currentBid?.amount || auction.startPrice;
          const participantsCount = (await io.in(`auction:${data.auctionId}`).allSockets()).size;

          // Map DB status to socket AuctionState status union
          const statusMap: Record<string, AuctionState['status']> = {
            UPCOMING: 'UPCOMING',
            ACTIVE: 'LIVE',
            ENDED: 'ENDED',
            CANCELLED: 'CANCELLED',
            SUSPENDED: 'SUSPENDED',
          };
          const mappedStatus: AuctionState['status'] = statusMap[String(auction.status)] || 'LIVE';

          const auctionState: AuctionState = {
            auctionId: auction.id,
            title: auction.title,
            description: auction.description || undefined,
            imageUrl: undefined,
            status: mappedStatus,
            currentPrice,
            startingPrice: auction.startPrice,
            minimumBidIncrement: Math.max(auction.minimumBid || 500, 500),
            reservePrice: undefined,
            buyNowPrice: undefined,
            startTime: auction.startDate.getTime(),
            endTime: auction.endDate.getTime(),
            participantsCount,
            bidsCount: auction.totalBids || 0,
            lastBidder: currentBid
              ? {
                id: currentBid.users.id,
                name: currentBid.users.name,
                role: 'USER',
                accountType: 'REGULAR_USER',
                verified: currentBid.users.verified,
              }
              : undefined,
            seller: undefined,
            categories: undefined,
            location: undefined,
            autoExtensionMinutes: undefined,
            isActive: mappedStatus === 'LIVE',
          };

          // Send success response
          callback({
            success: true,
            auction: auctionState,
          });

          // Notify room about new participant
          socket.to(`auction:${data.auctionId}`).emit('participants:updated', []);

          // Send auction joined event with full data
          s.emit('auction:joined', {
            auction: auctionState,
            participants: [], // سيتم تطوير هذا لاحقاً
            recentBids: [], // سيتم تطوير هذا لاحقاً
          });
        } catch (error) {
          console.error('خطأ في الانضمام للمزاد:', error);
          callback({ success: false, error: 'Server error' });
          s.emit('error:auction', {
            error: 'خطأ في الخادم',
            code: SocketErrorCodes.SYSTEM_ERROR,
          });
        }
      });

      // Leave auction room
      socket.on('auction:leave', async (data) => {
        try {
          if (socket.data?.currentAuction === data.auctionId) {
            await socket.leave(`auction:${data.auctionId}`);
            socket.data.currentAuction = undefined;

            if (socket.data.user) {
              connectedUsers.delete(socket.data.user.id);

              // Notify room about participant leaving
              const participantsCount = (await io.in(`auction:${data.auctionId}`).allSockets())
                .size;
              socket.to(`auction:${data.auctionId}`).emit('auction:left', {
                userId: socket.data.user.id,
                participantsCount,
              });
            }
          }
        } catch (error) {
          console.error('خطأ في مغادرة المزاد:', error);
        }
      });

      // Handle bidding
      socket.on('bid:place', async (data, callback) => {
        try {
          if (!socket.data?.isAuthenticated || !socket.data.user) {
            callback({ success: false, error: 'Not authenticated' });
            return;
          }

          const user = socket.data.user;

          // Rate limiting for bidding
          const bidKey = `user:${user.id}:bid`;
          if (!checkRateLimit(bidKey, RATE_LIMITS.bidsPerMinute, 60000)) {
            callback({ success: false, error: 'Too many bids' });
            s.emit('error:auction', {
              error: 'عدد كبير جداً من المحاولات',
              code: SocketErrorCodes.RATE_LIMITED,
              auctionId: data.auctionId,
            });
            return;
          }

          // Validate bid amount
          if (!data.amount || data.amount <= 0) {
            callback({ success: false, error: 'Invalid bid amount' });
            return;
          }

          // Get current auction state
          const auction = await prisma.auctions.findUnique({
            where: { id: data.auctionId },
            include: {
              bids: {
                orderBy: { amount: 'desc' },
                take: 1,
              },
            },
          });

          if (!auction) {
            callback({ success: false, error: 'Auction not found' });
            return;
          }

          // Check if auction is still active
          const now = new Date();
          if (auction.status === 'ENDED' || auction.endDate < now) {
            callback({ success: false, error: 'Auction has ended' });
            return;
          }

          const currentBid = auction.bids[0];
          const currentPrice = currentBid?.amount || auction.startPrice;
          const minimumBid = currentPrice + Math.max(auction.minimumBid || 500, 500);

          if (data.amount < minimumBid) {
            callback({
              success: false,
              error: `Bid must be at least ${minimumBid}`,
            });
            s.emit('bid:rejected', {
              reason: 'العرض أقل من الحد الأدنى المطلوب',
              bidAmount: data.amount,
              minimumRequired: minimumBid,
            });
            return;
          }

          // Create bid in database with unique ID
          const bidId = `bid_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
          const newBid = await prisma.bids.create({
            data: {
              id: bidId,
              auctionId: data.auctionId,
              bidderId: user.id,
              amount: data.amount,
            },
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  verified: true,
                },
              },
            },
          });

          const bidData = {
            auctionId: data.auctionId,
            userId: user.id,
            amount: data.amount,
            timestamp: Date.now(),
            bidId: newBid.id,
          };

          // Update user's last activity
          socket.data.lastActivity = Date.now();
          const userConnection = connectedUsers.get(user.id);
          if (userConnection) {
            userConnection.lastActivity = Date.now();
          }

          // Broadcast bid to all participants
          io.to(`auction:${data.auctionId}`).emit('bid:placed', {
            ...bidData,
            user: {
              id: newBid.users.id,
              name: newBid.users.name,
              role: 'USER',
              accountType: 'REGULAR_USER',
              verified: newBid.users.verified,
            },
          });

          // Send success response to bidder
          callback({ success: true, bid: bidData });

          console.log(
            `💰 عرض جديد: ${user.name} - ${data.amount} دينار في المزاد ${data.auctionId}`,
          );
        } catch (error) {
          console.error('خطأ في تقديم العرض:', error);
          callback({ success: false, error: 'Server error' });
        }
      });

      // Heartbeat for connection health
      socket.on('heartbeat', () => {
        if (socket.data?.user) {
          socket.data.lastActivity = Date.now();
          const userConnection = connectedUsers.get(socket.data.user.id);
          if (userConnection) {
            userConnection.lastActivity = Date.now();
          }
        }

        const hsTime: string | number | undefined = (
          socket.handshake as unknown as { time?: string | number; }
        ).time;
        const startMs =
          typeof hsTime === 'string'
            ? Date.parse(hsTime)
            : typeof hsTime === 'number'
              ? hsTime
              : Date.now();
        s.emit('connection:status', {
          status: 'connected',
          latency: Math.max(0, Date.now() - startMs),
        });
      });

      // Handle disconnection
      socket.on('disconnect', async (_reason) => {
        if (socket.data?.user) {
          connectedUsers.delete(socket.data.user.id);
          // broadcast presence offline
          io.emit('presence:update', { userId: socket.data.user.id, isOnline: false });

          // Notify auction room if user was in one
          if (socket.data.currentAuction) {
            const participantsCount = (
              await io.in(`auction:${socket.data.currentAuction}`).allSockets()
            ).size;
            socket.to(`auction:${socket.data.currentAuction}`).emit('auction:left', {
              userId: socket.data.user.id,
              participantsCount,
            });
          }
        }
      });

      // Error handling
      socket.on('error', (error) => {
        console.error('خطأ في Socket:', error);
        s.emit('error:auction', {
          error: 'خطأ في الاتصال',
          code: SocketErrorCodes.CONNECTION_ERROR,
        });
      });
    });

    res.socket.server.io = io;
  } else {
  }

  res.end();
}

export const config = {
  api: {
    bodyParser: false,
  },
};
