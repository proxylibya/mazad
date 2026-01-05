import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/lib/prisma';
import { getUserIdFromRequest } from '../../../utils/serverAuthUtils';

/**
 * API لجلب إعلانات المستخدم
 * GET /api/user/listings
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({
      success: false,
      error: 'الطريقة غير مدعومة',
    });
  }

  try {
    // استخراج معرف المستخدم من الطلب
    const userId = getUserIdFromRequest(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'يجب تسجيل الدخول لعرض إعلاناتك',
      });
    }

    const page = Math.max(1, parseInt((req.query.page as string) || '1'));
    const limit = Math.min(50, parseInt((req.query.limit as string) || '20'));
    const status = req.query.status as string; // 'AVAILABLE' | 'SOLD' | 'PENDING' | 'DRAFT'

    // بناء شروط البحث
    const where: any = {
      sellerId: userId,
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    console.log('[API] جلب إعلانات المستخدم:', { userId, page, limit, status });

    // جلب إجمالي العدد والإعلانات
    const [total, listings] = await Promise.all([
      prisma.cars.count({ where }),
      prisma.cars.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          brand: true,
          model: true,
          year: true,
          price: true,
          mileage: true,
          condition: true,
          location: true,
          images: true,
          status: true,
          featured: true,
          views: true,
          isAuction: true,
          createdAt: true,
          updatedAt: true,
          // الصور المرفوعة
          car_images: {
            select: {
              fileUrl: true,
              isPrimary: true,
            },
            take: 1,
            orderBy: { isPrimary: 'desc' },
          },
          // بيانات المزاد إن وجد
          auctions: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              currentPrice: true,
              totalBids: true,
            },
            where: {
              status: {
                in: ['UPCOMING', 'ACTIVE'],
              },
            },
          },
        },
      }),
    ]);

    // معالجة البيانات
    const processedListings = listings.map((listing) => {
      // معالجة الصور
      let mainImage = '';
      if (listing.car_images && listing.car_images.length > 0) {
        mainImage = listing.car_images[0].fileUrl;
      } else if (listing.images) {
        try {
          if (typeof listing.images === 'string') {
            const parsed = JSON.parse(listing.images);
            mainImage = Array.isArray(parsed) ? parsed[0] : listing.images;
          } else if (Array.isArray(listing.images)) {
            mainImage = listing.images[0];
          }
        } catch {
          mainImage = '';
        }
      }

      // معلومات المزاد
      const auction = listing.auctions && listing.auctions.length > 0 ? listing.auctions[0] : null;

      return {
        id: listing.id,
        title: listing.title,
        brand: listing.brand,
        model: listing.model,
        year: listing.year,
        price: listing.price,
        condition: listing.condition,
        location: listing.location,
        image: mainImage,
        status: listing.status,
        featured: listing.featured,
        views: listing.views || 0,
        isAuction: listing.isAuction,
        listingType: listing.isAuction ? 'auction' : 'instant',
        createdAt: listing.createdAt,
        updatedAt: listing.updatedAt,
        // بيانات المزاد
        auction: auction
          ? {
              id: auction.id,
              status: auction.status,
              startTime: auction.startDate,
              endTime: auction.endDate,
              currentPrice: auction.currentPrice,
              totalBids: auction.totalBids,
            }
          : null,
      };
    });

    // حساب الإحصائيات
    const stats = {
      total,
      active: listings.filter((l) => l.status === 'AVAILABLE').length,
      sold: listings.filter((l) => l.status === 'SOLD').length,
      pending: listings.filter((l) => l.status === 'PENDING').length,
      draft: listings.filter((l) => l.status === 'DRAFT').length,
      auctions: listings.filter((l) => l.isAuction).length,
      instant: listings.filter((l) => !l.isAuction).length,
    };

    console.log(`[نجح] تم جلب ${processedListings.length} إعلان للمستخدم ${userId}`);

    return res.status(200).json({
      success: true,
      data: {
        listings: processedListings,
        stats,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
      },
      meta: {
        timestamp: new Date().toISOString(),
        userId,
      },
    });
  } catch (error) {
    console.error('[خطأ] فشل في جلب إعلانات المستخدم:', error);

    return res.status(500).json({
      success: false,
      error: 'حدث خطأ في جلب إعلاناتك',
      details:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : 'خطأ غير معروف'
          : undefined,
    });
  }
}
