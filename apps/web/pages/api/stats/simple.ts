// API محسن للإحصائيات مع التخزين المؤقت
import prisma from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';
import { statsCache } from '../../../lib/cache/statsCache';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // استخدام التخزين المؤقت للإحصائيات
    const cachedStats = await statsCache.getOrSet('simple', async () => {
      const [userCount, carCount, auctionCount] = await Promise.all([
        prisma.users.count(),
        prisma.cars.count(),
        prisma.auctions.count(),
      ]);

      return {
        userCount,
        carCount,
        auctionCount,
        systemSettings: {},
        lastUpdated: Date.now()
      };
    }, 300);

    const { userCount, carCount, auctionCount } = cachedStats;

    const stats = {
      users: userCount,
      cars: carCount,
      auctions: auctionCount,
      transportServices: Math.ceil(userCount * 0.1), // تقدير
      showrooms: Math.ceil(userCount * 0.05), // تقدير
    };

    return res.status(200).json({
      success: true,
      stats,
      formatted: {
        users: String(userCount),
        cars: String(carCount),
        auctions: String(auctionCount),
        transportServices: String(Math.ceil(userCount * 0.1)),
        showrooms: String(Math.ceil(userCount * 0.05)),
      },
    });
  } catch (error) {
    console.error('خطأ في جلب الإحصائيات:', error);

    // إرجاع بيانات افتراضية في حالة الخطأ
    const defaultStats = {
      users: 24,
      cars: 40,
      auctions: 29,
      transportServices: 7,
      showrooms: 3,
    };

    return res.status(200).json({
      success: true,
      stats: defaultStats,
      formatted: {
        users: '24',
        cars: '40',
        auctions: '29',
        transportServices: '7',
        showrooms: '3',
      },
      fallback: true,
      message: 'حدث خطأ - بيانات تجريبية',
    });
  }
}
