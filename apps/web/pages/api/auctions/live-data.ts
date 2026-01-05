/**
 * API endpoint لجلب البيانات المباشرة للمزادات
 * يعيد السعر الحالي وعدد المزايدات والحالة
 */

import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // السماح فقط بطلبات POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'طريقة غير مسموحة' });
  }

  try {
    const { auctionIds } = req.body;

    // التحقق من صحة البيانات
    if (!auctionIds || !Array.isArray(auctionIds) || auctionIds.length === 0) {
      return res.status(400).json({ error: 'معرفات المزادات مطلوبة' });
    }

    // جلب بيانات المزادات المحدثة
    const auctions = await prisma.auctions.findMany({
      where: {
        id: {
          in: auctionIds.map(id => String(id)),
        },
      },
      select: {
        id: true,
        currentPrice: true,
        startPrice: true,
        startDate: true,
        endDate: true,
        status: true,
        _count: {
          select: {
            bids: true,
          },
        },
        bids: {
          orderBy: {
            amount: 'desc',
          },
          take: 1,
          select: {
            amount: true,
          },
        },
      },
    });

    // تحويل البيانات
    const liveData = auctions.map((auction) => {
      const currentTime = new Date();
      const startTime = auction.startDate ? new Date(auction.startDate) : null;
      const endTime = auction.endDate ? new Date(auction.endDate) : null;

      // تحديد حالة المزاد
      let auctionType: 'upcoming' | 'live' | 'ended' = 'live';

      if (endTime && currentTime >= endTime) {
        auctionType = 'ended';
      } else if (startTime && currentTime < startTime) {
        auctionType = 'upcoming';
      }

      // السعر الحالي
      const currentBid =
        auction.bids[0]?.amount || auction.currentPrice || auction.startPrice || 0;

      return {
        id: auction.id,
        currentBid: currentBid.toString(),
        currentPrice: currentBid.toString(),
        bidCount: auction._count.bids,
        totalBids: auction._count.bids,
        auctionType,
        status: auctionType,
      };
    });

    // إعداد headers للتخزين المؤقت القصير
    res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');

    return res.status(200).json({
      success: true,
      auctions: liveData,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[API Error] /api/auctions/live-data:', error?.message || error);

    // إرجاع بيانات فارغة بدلاً من خطأ لتجنب كسر الواجهة
    return res.status(200).json({
      success: false,
      auctions: [],
      timestamp: new Date().toISOString(),
      error: 'خطأ في جلب البيانات المباشرة',
    });
  }
}
