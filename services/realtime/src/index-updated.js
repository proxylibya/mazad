/**
 * Enhanced Realtime Service with KeyDB
 * Production-ready WebSocket server
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const { keydb, publisher, subscriber, RealtimeCache } = require('./keydb-integration');
// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const httpServer = createServer(app);
const PORT = process.env.REALTIME_PORT || 3024;
// Configure Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3021', 'http://localhost:3022', 'http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(
  cors({
    origin: ['http://localhost:3021', 'http://localhost:3022', 'http://localhost:3000'],
    credentials: true,
  }),
);
app.use(express.json());

// Socket.IO connection handling
io.on('connection', async (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // Save connection
  await RealtimeCache.saveConnection(socket.id, socket.handshake.query.userId || 'anonymous');

  // Track online user
  if (socket.handshake.query.userId) {
    await RealtimeCache.trackOnlineUser(socket.handshake.query.userId);
  }

  // Increment connection metric
  await RealtimeCache.incrementMetric('connections');

  // Join auction room
  socket.on('join_auction', async (auctionId) => {
    socket.join(`auction_${auctionId}`);

    const userId = socket.handshake.query.userId || 'anonymous';
    const { count } = await RealtimeCache.joinAuction(auctionId, userId, socket.id);

    console.log(`User ${userId} joined auction ${auctionId}. Room count: ${count}`);

    // Send current auction state
    const auctionState = await RealtimeCache.getAuctionState(auctionId);
    if (auctionState) {
      socket.emit('auction_state', auctionState);
    }

    // Send recent chat messages
    const messages = await RealtimeCache.getChatMessages(auctionId, 20);
    socket.emit('chat_history', messages);

    // Notify others
    socket.to(`auction_${auctionId}`).emit('user_joined', {
      userId,
      count,
    });
  });

  // Leave auction room
  socket.on('leave_auction', async (auctionId) => {
    socket.leave(`auction_${auctionId}`);

    const userId = socket.handshake.query.userId || 'anonymous';
    const { count } = await RealtimeCache.leaveAuction(auctionId, userId, socket.id);

    console.log(`User ${userId} left auction ${auctionId}. Room count: ${count}`);

    // Notify others
    socket.to(`auction_${auctionId}`).emit('user_left', {
      userId,
      count,
    });
  });

  // Place bid
  socket.on('place_bid', async (data) => {
    const { auctionId, bidAmount, userId } = data;
    console.log(`💰 Bid placed: ${bidAmount} LYD on auction ${auctionId} by user ${userId}`);

    // Update auction state in KeyDB
    const auctionState = await RealtimeCache.updateBid(auctionId, {
      amount: bidAmount,
      userId,
    });

    // Increment bid metric
    await RealtimeCache.incrementMetric('bids');

    // Broadcast to all users in the auction room
    io.to(`auction_${auctionId}`).emit('new_bid', {
      auctionId,
      currentBid: bidAmount,
      bidCount: auctionState.bidCount,
      lastBidder: userId,
      timestamp: new Date().toISOString(),
    });

    // Send updated state
    io.to(`auction_${auctionId}`).emit('auction_state', auctionState);
  });

  // Chat message
  socket.on('chat_message', async (data) => {
    const { auctionId, message, userId, username } = data;

    const chatMessage = {
      userId,
      username,
      message,
      timestamp: new Date().toISOString(),
    };

    // Save message
    await RealtimeCache.saveChatMessage(auctionId, chatMessage);

    // Broadcast to room
    io.to(`auction_${auctionId}`).emit('chat_message', chatMessage);

    // Increment chat metric
    await RealtimeCache.incrementMetric('chat_messages');
  });

  // Typing indicator
  socket.on('typing', (data) => {
    const { auctionId, userId, username } = data;
    socket.to(`auction_${auctionId}`).emit('user_typing', {
      userId,
      username,
    });
  });

  // Stop typing
  socket.on('stop_typing', (data) => {
    const { auctionId, userId } = data;
    socket.to(`auction_${auctionId}`).emit('user_stopped_typing', {
      userId,
    });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`❌ User disconnected: ${socket.id}`);

    // Get connection info
    const connection = await RealtimeCache.getConnection(socket.id);

    if (connection && connection.userId) {
      // Leave all auctions
      const userKey = `user:${connection.userId}:auctions`;
      const auctions = await keydb.smembers(userKey);

      for (const auctionId of auctions) {
        await RealtimeCache.leaveAuction(auctionId, connection.userId, socket.id);

        // Notify room
        io.to(`auction_${auctionId}`).emit('user_disconnected', {
          userId: connection.userId,
        });
      }
    }

    // Remove connection
    await RealtimeCache.removeConnection(socket.id);

    // Increment disconnection metric
    await RealtimeCache.incrementMetric('disconnections');
  });
});

// Subscribe to auction events from KeyDB
subscriber.subscribe('auction:*:bids');
subscriber.on('pmessage', (pattern, channel, message) => {
  const auctionId = channel.split(':')[1];
  const bid = JSON.parse(message);

  // Broadcast to all clients in the auction room
  io.to(`auction_${auctionId}`).emit('external_bid', bid);
});

// REST API Endpoints

// Health check
app.get('/health', async (req, res) => {
  const onlineUsers = await RealtimeCache.getOnlineUsersCount();
  const metrics = await RealtimeCache.getMetrics();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'realtime',
    onlineUsers,
    metrics,
    connections: io.engine.clientsCount,
  });
});

// Get auction state
app.get('/api/auctions/:id/state', async (req, res) => {
  const auctionState = await RealtimeCache.getAuctionState(req.params.id);

  if (auctionState) {
    res.json({
      success: true,
      data: auctionState,
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Auction not found',
    });
  }
});

// Get auction participants
app.get('/api/auctions/:id/participants', async (req, res) => {
  const participants = await RealtimeCache.getAuctionParticipants(req.params.id);

  res.json({
    success: true,
    data: participants,
    count: participants.length,
  });
});

// Get auction chat
app.get('/api/auctions/:id/chat', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const messages = await RealtimeCache.getChatMessages(req.params.id, limit);

  res.json({
    success: true,
    data: messages,
    count: messages.length,
  });
});

// Initialize auction
app.post('/api/auctions/:id/initialize', async (req, res) => {
  const { id } = req.params;
  const { startingBid } = req.body;

  const state = {
    id,
    currentBid: startingBid || 0,
    bidCount: 0,
    bids: [],
    startedAt: new Date().toISOString(),
  };

  await RealtimeCache.saveAuctionState(id, state);

  res.json({
    success: true,
    message: 'Auction initialized',
    data: state,
  });
});

// Get active auctions
app.get('/api/auctions/active', async (req, res) => {
  const auctions = await RealtimeCache.getActiveAuctions();

  res.json({
    success: true,
    data: auctions,
    count: auctions.length,
  });
});

// Get metrics
app.get('/api/metrics', async (req, res) => {
  const metrics = await RealtimeCache.getMetrics();
  const onlineUsers = await RealtimeCache.getOnlineUsersCount();

  res.json({
    success: true,
    data: {
      ...metrics,
      onlineUsers,
      serverTime: new Date().toISOString(),
    },
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message,
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🛑 Shutting down gracefully...');

  // Close Socket.IO
  io.close();

  // Close HTTP server
  httpServer.close();

  // Close KeyDB connections
  await keydb.quit();
  await publisher.quit();
  await subscriber.quit();

  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Realtime server running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(
    `💾 Connected to KeyDB: ${process.env.KEYDB_HOST || 'localhost'}:${process.env.KEYDB_PORT || '6379'}`,
  );
  console.log(`✅ Ready to handle real-time connections`);
});
