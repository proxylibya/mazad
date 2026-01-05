import prisma from '@/lib/prisma';

// إعداد Connection Pool محسن
export const prismaConfig = {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // تحسين Connection Pool
  log:
    process.env.NODE_ENV === 'development'
      ? ['query' as const, 'error' as const, 'warn' as const]
      : ['error' as const],
  errorFormat: 'pretty' as const,
};

export { prisma };

// دالة لإنشاء الفهارس المحسنة
export async function createOptimizedIndexes() {
  try {
    console.log('🗃️ بدء إنشاء الفهارس المحسنة...');

    const queries = [
      // فهارس للمستخدمين
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_status ON users(phone, status) WHERE status = 'ACTIVE';`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role_type ON users(role, "accountType");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users("createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login ON users("lastLogin" DESC) WHERE "lastLogin" IS NOT NULL;`,

      // فهارس للسيارات
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_status_featured ON cars(status, featured);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_brand_model ON cars(brand, model);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_price_range ON cars(price) WHERE status = 'AVAILABLE';`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_location ON cars("locationLat", "locationLng") WHERE "locationLat" IS NOT NULL;`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_created_at ON cars("createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_views ON cars(views DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_seller_status ON cars("sellerId", status);`,

      // فهارس للمزادات
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_status_time ON auctions(status, "endTime");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_featured_status ON auctions(featured, status);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_price_range ON auctions("currentPrice") WHERE status = 'ACTIVE';`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_seller_status ON auctions("sellerId", status);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_start_time ON auctions("startTime" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_total_bids ON auctions("totalBids" DESC);`,

      // فهارس للمزايدات
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_auction_amount ON bids("auctionId", amount DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_bidder_created ON bids("bidderId", "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bids_car_amount ON bids("carId", amount DESC) WHERE "carId" IS NOT NULL;`,

      // فهارس للرسائل
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_time ON messages("conversationId", "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_time ON messages("senderId", "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_status ON messages(status) WHERE status != 'SENT';`,

      // فهارس للمحادثات
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_type_updated ON conversations(type, "lastMessageAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_car_auction ON conversations("carId", "auctionId");`,

      // فهارس للإشعارات
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_read ON notifications("userId", "isRead", "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type_created ON notifications(type, "createdAt" DESC);`,

      // فهارس للمعاملات
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_wallet_status ON transactions("walletId", status);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type_created ON transactions(type, "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status_amount ON transactions(status, amount DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_created_at ON transactions("createdAt" DESC);`,

      // فهارس للمفضلة
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user_car ON favorites("userId", "carId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_user_auction ON favorites("userId", "auctionId");`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_favorites_created_at ON favorites("createdAt" DESC);`,

      // فهارس للمراجعات
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_target_rating ON "reviews"("targetUserId", rating DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_car_verified ON "reviews"("carId", "isVerified") WHERE "carId" IS NOT NULL;`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_created_at ON "reviews"("createdAt" DESC);`,

      // فهارس للأمان والسجلات
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activity_logs_user_action ON activity_logs("userId", action, "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_security_logs_ip_action ON security_logs("ipAddress", action, "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_admin_action ON audit_logs("adminId", action, "createdAt" DESC);`,

      // فهارس للإحصائيات
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_events_user_type ON analytics_events("userId", "eventType", "createdAt" DESC);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_stats_date ON "DailyStats"(date DESC);`,

      // فهارس للمحلات والشركات
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_showrooms_status_featured ON showrooms(status, featured);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_showrooms_city_verified ON showrooms(city, verified);`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_status_city ON companies(status, city);`,

      // فهارس النص الكامل للبحث
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_cars_search_text ON cars USING gin(to_tsvector('arabic', title || ' ' || brand || ' ' || model));`,
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_auctions_search_text ON auctions USING gin(to_tsvector('arabic', title || ' ' || COALESCE(description, '')));`,
    ];

    for (const query of queries) {
      try {
        await prisma.$executeRawUnsafe(query);
        console.log(`✅ تم إنشاء فهرس: ${query.split(' ')[7] || 'غير معروف'}`);
      } catch (error: any) {
        if (error.message && error.message.includes('already exists')) {
          console.log(`⚠️ الفهرس موجود بالفعل: ${query.split(' ')[7] || 'غير معروف'}`);
        } else {
          console.error(`❌ خطأ في إنشاء فهرس: ${error.message}`);
        }
      }
    }

    console.log('✅ تم الانتهاء من إنشاء الفهارس المحسنة');
  } catch (error) {
    console.error('❌ خطأ عام في إنشاء الفهارس:', error);
  }
}

// دالة لتحليل الاستعلامات البطيئة
export async function analyzeDatabasePerformance() {
  try {
    console.log('📊 بدء تحليل أداء قاعدة البيانات...');

    // فحص الاستعلامات البطيئة
    const slowQueries = await prisma.$queryRaw`
      SELECT query, calls, total_time, mean_time, rows
      FROM pg_stat_statements 
      WHERE mean_time > 100 
      ORDER BY mean_time DESC 
      LIMIT 10;
    `;

    console.log('🐌 الاستعلامات البطيئة:', slowQueries);

    // فحص حجم الجداول
    const tableSizes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY size_bytes DESC;
    `;

    console.log('📏 أحجام الجداول:', tableSizes);

    // فحص الفهارس غير المستخدمة
    const unusedIndexes = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan as index_scans,
        pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
      FROM pg_stat_user_indexes 
      WHERE idx_scan < 50
      ORDER BY pg_relation_size(indexname::regclass) DESC;
    `;

    console.log('🗂️ الفهارس قليلة الاستخدام:', unusedIndexes);
  } catch (error) {
    console.error('❌ خطأ في تحليل الأداء:', error);
  }
}

// دالة لتحسين الاستعلامات الشائعة
export const optimizedQueries = {
  // استعلام محسن للحصول على السيارات المتاحة
  getAvailableCars: async (limit: number = 20, offset: number = 0) => {
    return prisma.cars.findMany({
      where: { status: 'AVAILABLE' },
      select: {
        id: true,
        title: true,
        brand: true,
        model: true,
        year: true,
        price: true,
        images: true,
        location: true,
        featured: true,
        views: true,
        createdAt: true,
        users: {
          select: {
            id: true,
            name: true,
            phone: true,
            verified: true,
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      skip: offset,
    });
  },

  // استعلام محسن للمزادات النشطة (أونلاين فقط)
  getActiveAuctions: async (limit: number = 20, offset: number = 0) => {
    return prisma.auctions.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gt: new Date() },
        yardId: null, // ✅ مزادات أونلاين فقط - استبعاد مزادات الساحات
      },
      select: {
        id: true,
        title: true,
        startPrice: true,
        currentPrice: true,
        endDate: true,
        totalBids: true,
        featured: true,
        cars: {
          select: {
            id: true,
            title: true,
            brand: true,
            model: true,
            images: true,
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            verified: true,
          },
        },
      },
      orderBy: [{ featured: 'desc' }, { endDate: 'asc' }],
      take: limit,
      skip: offset,
    });
  },

  // استعلام محسن لإحصائيات المستخدم
  getUserStats: async (userId: string) => {
    const [totalCars, totalAuctions, totalBids, totalReviews, avgRating] = await Promise.all([
      prisma.cars.count({ where: { sellerId: userId } }),
      prisma.auctions.count({ where: { sellerId: userId } }),
      prisma.bids.count({ where: { bidderId: userId } }),
      prisma.reviews.count({ where: { targetUserId: userId } }),
      prisma.reviews.aggregate({
        where: { targetUserId: userId },
        _avg: { rating: true },
      }),
    ]);

    return {
      totalCars,
      totalAuctions,
      totalBids,
      totalReviews,
      avgRating: avgRating._avg.rating || 0,
    };
  },
};

// دالة لتنظيف البيانات القديمة
export async function cleanupOldData() {
  try {
    console.log('🧹 بدء تنظيف البيانات القديمة...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // حذف كودات التحقق المنتهية الصلاحية
    const deletedCodes = await prisma.verification_codes.deleteMany({
      where: {
        OR: [{ used: true, usedAt: { lt: thirtyDaysAgo } }, { expiresAt: { lt: new Date() } }],
      },
    });

    // حذف سجلات SMS القديمة
    const deletedSmsLogs = await prisma.sms_logs.deleteMany({
      where: { createdAt: { lt: sixMonthsAgo } },
    });

    // حذف سجلات الأنشطة القديمة (عدا المهمة)
    const deletedActivityLogs = await prisma.activity_logs.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        severity: { not: 'CRITICAL' },
      },
    });

    console.log(`✅ تم حذف ${deletedCodes.count} كود تحقق`);
    console.log(`✅ تم حذف ${deletedSmsLogs.count} سجل SMS`);
    console.log(`✅ تم حذف ${deletedActivityLogs.count} سجل نشاط`);
  } catch (error) {
    console.error('❌ خطأ في تنظيف البيانات:', error);
  }
}

// دالة لمراقبة الاتصالات
export async function monitorConnections() {
  try {
    const connections = await prisma.$queryRaw`
      SELECT 
        count(*) as total_connections,
        count(*) FILTER (WHERE state = 'active') as active_connections,
        count(*) FILTER (WHERE state = 'idle') as idle_connections
      FROM pg_stat_activity 
      WHERE datname = current_database();
    `;

    console.log('🔗 حالة الاتصالات:', connections);
    return connections;
  } catch (error) {
    console.error('❌ خطأ في مراقبة الاتصالات:', error);
  }
}

export default prisma;
