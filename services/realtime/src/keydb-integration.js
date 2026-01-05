/**
 * KeyDB Integration for Realtime Service
 * Replace in-memory storage with KeyDB
 */

const Redis = require('ioredis');
// Initialize KeyDB client
const keydb = new Redis({
  host: process.env.KEYDB_HOST || 'localhost',
  port: parseInt(process.env.KEYDB_PORT || '6379'),
  password: process.env.KEYDB_PASSWORD,
  keyPrefix: 'realtime:',
  enableReadyCheck: true,
});

// Initialize pub/sub clients
const publisher = new Redis({
  host: process.env.KEYDB_HOST || 'localhost',
  port: parseInt(process.env.KEYDB_PORT || '6379'),
  password: process.env.KEYDB_PASSWORD,
});

const subscriber = new Redis({
  host: process.env.KEYDB_HOST || 'localhost',
  port: parseInt(process.env.KEYDB_PORT || '6379'),
  password: process.env.KEYDB_PASSWORD,
});

class RealtimeCache {
  /**
   * Save auction state
   */
  async saveAuctionState(auctionId, state) {
    const key = `auction:${auctionId}:state`;
    await keydb.setex(key, 86400, JSON.stringify(state)); // 24 hours TTL
  }

  /**
   * Get auction state
   */
  async getAuctionState(auctionId) {
    const key = `auction:${auctionId}:state`;
    const state = await keydb.get(key);
    return state ? JSON.parse(state) : null;
  }

  /**
   * Update auction bid
   */
  async updateBid(auctionId, bid) {
    const key = `auction:${auctionId}:state`;

    // Get current state
    let state = await this.getAuctionState(auctionId);
    if (!state) {
      state = {
        id: auctionId,
        currentBid: 0,
        bidCount: 0,
        bids: [],
      };
    }

    // Update state
    state.currentBid = bid.amount;
    state.bidCount++;
    state.lastBidder = bid.userId;
    state.lastBidTime = new Date().toISOString();

    // Add to bids array (keep last 100)
    state.bids.unshift({
      amount: bid.amount,
      userId: bid.userId,
      timestamp: new Date().toISOString(),
    });
    if (state.bids.length > 100) {
      state.bids = state.bids.slice(0, 100);
    }

    // Save state
    await this.saveAuctionState(auctionId, state);

    // Publish bid event
    await publisher.publish(`auction:${auctionId}:bids`, JSON.stringify(bid));

    return state;
  }

  /**
   * Get active auctions
   */
  async getActiveAuctions() {
    const keys = await keydb.keys('auction:*:state');
    const auctions = [];

    for (const key of keys) {
      const state = await keydb.get(key);
      if (state) {
        auctions.push(JSON.parse(state));
      }
    }

    return auctions;
  }

  /**
   * Add user to auction room
   */
  async joinAuction(auctionId, userId, socketId) {
    const roomKey = `auction:${auctionId}:users`;
    const userKey = `user:${userId}:auctions`;

    // Add user to auction room
    await keydb.sadd(roomKey, `${userId}:${socketId}`);
    await keydb.expire(roomKey, 3600); // 1 hour TTL

    // Track user's auctions
    await keydb.sadd(userKey, auctionId);
    await keydb.expire(userKey, 3600);

    // Get room count
    const count = await keydb.scard(roomKey);

    return { count };
  }

  /**
   * Remove user from auction room
   */
  async leaveAuction(auctionId, userId, socketId) {
    const roomKey = `auction:${auctionId}:users`;
    const userKey = `user:${userId}:auctions`;

    // Remove user from auction room
    await keydb.srem(roomKey, `${userId}:${socketId}`);

    // Remove auction from user's list
    await keydb.srem(userKey, auctionId);

    // Get room count
    const count = await keydb.scard(roomKey);

    return { count };
  }

  /**
   * Get auction participants
   */
  async getAuctionParticipants(auctionId) {
    const roomKey = `auction:${auctionId}:users`;
    const participants = await keydb.smembers(roomKey);

    return participants.map((p) => {
      const [userId, socketId] = p.split(':');
      return { userId, socketId };
    });
  }

  /**
   * Save connection info
   */
  async saveConnection(socketId, userId, metadata = {}) {
    const key = `connection:${socketId}`;
    await keydb.setex(
      key,
      3600,
      JSON.stringify({
        userId,
        connectedAt: new Date().toISOString(),
        ...metadata,
      }),
    );
  }

  /**
   * Get connection info
   */
  async getConnection(socketId) {
    const key = `connection:${socketId}`;
    const data = await keydb.get(key);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Remove connection
   */
  async removeConnection(socketId) {
    const key = `connection:${socketId}`;
    await keydb.del(key);
  }

  /**
   * Track online users
   */
  async trackOnlineUser(userId) {
    const key = 'users:online';
    await keydb.zadd(key, Date.now(), userId);

    // Clean old entries (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    await keydb.zremrangebyscore(key, 0, fiveMinutesAgo);
  }

  /**
   * Get online users count
   */
  async getOnlineUsersCount() {
    const key = 'users:online';
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return await keydb.zcount(key, fiveMinutesAgo, '+inf');
  }

  /**
   * Save chat message
   */
  async saveChatMessage(auctionId, message) {
    const key = `auction:${auctionId}:chat`;

    // Add message to list
    await keydb.lpush(
      key,
      JSON.stringify({
        ...message,
        timestamp: new Date().toISOString(),
      }),
    );

    // Keep only last 100 messages
    await keydb.ltrim(key, 0, 99);

    // Set TTL
    await keydb.expire(key, 86400); // 24 hours
  }

  /**
   * Get chat messages
   */
  async getChatMessages(auctionId, limit = 50) {
    const key = `auction:${auctionId}:chat`;
    const messages = await keydb.lrange(key, 0, limit - 1);
    return messages.map((m) => JSON.parse(m)).reverse();
  }

  /**
   * Increment metric
   */
  async incrementMetric(metric) {
    const today = new Date().toISOString().split('T')[0];
    const key = `metrics:${today}:${metric}`;
    await keydb.incr(key);
    await keydb.expire(key, 604800); // 7 days
  }

  /**
   * Get metrics
   */
  async getMetrics() {
    const today = new Date().toISOString().split('T')[0];
    const keys = await keydb.keys(`metrics:${today}:*`);
    const metrics = {};

    for (const key of keys) {
      const metric = key.split(':').pop();
      metrics[metric] = parseInt(await keydb.get(key)) || 0;
    }

    return metrics;
  }
}

// Setup pub/sub handlers
subscriber.on('message', (channel, message) => {
  console.log(`📨 Received message on ${channel}:`, message);
});

// Export
module.exports = {
  keydb,
  publisher,
  subscriber,
  RealtimeCache: new RealtimeCache(),
};
