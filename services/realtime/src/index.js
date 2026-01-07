const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
// const AuctionHandler = require('./auction-handler'); // Available for advanced features

// Load environment variables
dotenv.config();

// Create Express app and HTTP server
const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || process.env.REALTIME_PORT || 3024;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.CORS_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Configure Socket.IO with CORS
const io = new Server(httpServer, {
  path: '/api/socketio',
  cors: {
    origin: allowedOrigins.length
      ? allowedOrigins
      : ['http://localhost:3021', 'http://localhost:3022', 'http://localhost:3000'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

// Middleware
app.use(
  cors({
    origin: allowedOrigins.length
      ? allowedOrigins
      : ['http://localhost:3021', 'http://localhost:3022', 'http://localhost:3000'],
    credentials: true,
  }),
);
app.use(express.json());

// In-memory storage for demo purposes
const activeAuctions = new Map();
const connectedUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // Join auction room
  socket.on('join_auction', (auctionId) => {
    socket.join(`auction_${auctionId}`);
    console.log(`User ${socket.id} joined auction ${auctionId}`);

    // Send current auction state
    const auctionState = activeAuctions.get(auctionId);
    if (auctionState) {
      socket.emit('auction_state', auctionState);
    }
  });

  // Leave auction room
  socket.on('leave_auction', (auctionId) => {
    socket.leave(`auction_${auctionId}`);
    console.log(`User ${socket.id} left auction ${auctionId}`);
  });

  // Place bid
  socket.on('place_bid', (data) => {
    const { auctionId, bidAmount, userId } = data;
    console.log(`Bid placed: ${bidAmount} LYD on auction ${auctionId} by user ${userId}`);

    // Update auction state
    const auctionState = activeAuctions.get(auctionId) || {
      id: auctionId,
      currentBid: 0,
      bidCount: 0,
      bids: [],
    };

    auctionState.currentBid = bidAmount;
    auctionState.bidCount++;
    auctionState.lastBidder = userId;
    auctionState.bids.unshift({
      amount: bidAmount,
      userId,
      timestamp: new Date().toISOString(),
    });

    activeAuctions.set(auctionId, auctionState);

    // Broadcast to all users in the auction room
    io.to(`auction_${auctionId}`).emit('new_bid', {
      auctionId,
      currentBid: bidAmount,
      bidCount: auctionState.bidCount,
      lastBidder: userId,
      timestamp: new Date().toISOString(),
    });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    connectedUsers.delete(socket.id);
  });
});

// REST API Endpoints

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'realtime',
    connections: connectedUsers.size,
    activeAuctions: activeAuctions.size,
  });
});

// Get auction state
app.get('/api/auctions/:id/state', (req, res) => {
  const auctionState = activeAuctions.get(req.params.id);
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

// Initialize auction
app.post('/api/auctions/:id/initialize', (req, res) => {
  const { id } = req.params;
  const { startingBid } = req.body;

  activeAuctions.set(id, {
    id,
    currentBid: startingBid || 0,
    bidCount: 0,
    bids: [],
    startedAt: new Date().toISOString(),
  });

  res.json({
    success: true,
    message: 'Auction initialized',
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Initialize auction handler for advanced features
// Comment this out if you want to use simple in-memory handlers above
// const auctionHandler = new AuctionHandler(io);

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Realtime Server running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket server ready for connections`);
});
