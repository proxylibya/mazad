import { NextApiRequest, NextApiResponse } from 'next';

// استيراد آمن لـ Prisma و Cache
let prisma: any = null;
let getOrSetCache: any = null;

try {
  const prismaModule = require('@/lib/prisma');
  const cacheModule = require('@/lib/cache');
  prisma = prismaModule.prisma;
  getOrSetCache = cacheModule.getOrSetCache;
} catch (error) {
  console.error('[Featured Ads API] فشل تحميل المكتبات:', error);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // التحقق من توفر المكتبات
      if (!prisma || !getOrSetCache) {
        console.error('[Featured Ads API] المكتبات غير متاحة');
        return res.status(200).json({
          success: true,
          data: [],
          fallback: true,
          message: 'المكتبات غير متاحة - لا توجد إعلانات مميزة متاحة حالياً',
        });
      }

      const { limit = 3, position, adType } = req.query;

      // التحقق من اتصال قاعدة البيانات
      try {
        await prisma.$queryRaw`SELECT 1`;
      } catch (dbError) {
        console.error('خطأ في الاتصال بقاعدة البيانات:', dbError);
        return res.status(200).json({
          success: true,
          data: [],
          fallback: true,
          message: 'لا توجد اتصال بقاعدة البيانات - لا توجد إعلانات متاحة',
        });
      }

      // بناء شروط الاستعلام
      const where: any = {
        isActive: true,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      };

      if (position) {
        where.position = parseInt(position as string);
      }

      if (adType) {
        where.adType = adType;
      }

      // كاش النتائج لخفض الحمل على قاعدة البيانات
      const cacheKey = `api:featured-ads:limit=${limit}:position=${position || 'all'}:adType=${adType || 'all'}`;
      const { enrichedAds, featuredIds } = await getOrSetCache(cacheKey, 60, async () => {
        // جلب الإعلانات المميزة
        const featuredAds = await prisma.featured_ads.findMany({
          where,
          include: {
            users: {
              select: { id: true, name: true, phone: true },
            },
          },
          orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
          take: parseInt(limit as string),
        });

        // إصلاح N+1 - استعلام واحد لكل نوع
        const carIds = featuredAds
          .filter((ad) => ad.sourceType === 'car' && ad.sourceId)
          .map((ad) => ad.sourceId!);
        const auctionIds = featuredAds
          .filter((ad) => ad.sourceType === 'auction' && ad.sourceId)
          .map((ad) => ad.sourceId!);
        const showroomIds = featuredAds
          .filter((ad) => ad.sourceType === 'showroom' && ad.sourceId)
          .map((ad) => ad.sourceId!);
        const transportIds = featuredAds
          .filter((ad) => ad.sourceType === 'transport' && ad.sourceId)
          .map((ad) => ad.sourceId!);

        const [cars, auctions, showrooms, transports] = await Promise.all([
          carIds.length > 0
            ? prisma.cars.findMany({
              where: { id: { in: carIds } },
              select: {
                id: true,
                title: true,
                brand: true,
                model: true,
                year: true,
                price: true,
                images: true,
                location: true,
                users: { select: { name: true, phone: true } },
              },
            })
            : [],
          auctionIds.length > 0
            ? prisma.auctions.findMany({
              where: { id: { in: auctionIds } },
              select: {
                id: true,
                title: true,
                startPrice: true,
                currentPrice: true,
                cars: {
                  select: {
                    title: true,
                    brand: true,
                    model: true,
                    year: true,
                    images: true,
                    location: true,
                  },
                },
                users: { select: { name: true, phone: true } },
              },
            })
            : [],
          showroomIds.length > 0
            ? prisma.showrooms.findMany({
              where: { id: { in: showroomIds } },
              select: {
                id: true,
                name: true,
                description: true,
                images: true,
                city: true,
                area: true,
                phone: true,
                rating: true,
                totalCars: true,
              },
            })
            : [],
          transportIds.length > 0
            ? prisma.transport_services.findMany({
              where: { id: { in: transportIds } },
              select: {
                id: true,
                status: true,
                userId: true,
                createdAt: true,
                users: { select: { name: true, phone: true } },
              },
            })
            : [],
        ]);

        const normalizedCars = cars.map((c: any) => ({
          ...c,
          seller: c.users,
          users: undefined,
        }));

        const normalizedAuctions = auctions.map((a: any) => ({
          ...a,
          startingPrice: a.startPrice,
          car: a.cars,
          seller: a.users,
          cars: undefined,
          users: undefined,
        }));

        const carsMap = new Map(normalizedCars.map((c: any) => [c.id, c]));
        const auctionsMap = new Map(normalizedAuctions.map((a: any) => [a.id, a]));
        const showroomsMap = new Map(showrooms.map((s) => [s.id, s]));
        const transportsMap = new Map(transports.map((t) => [t.id, t]));

        const enrichedAds = featuredAds.map((ad: any) => {
          let sourceData: Record<string, unknown> | null = null;
          if (ad.sourceId && ad.sourceType) {
            switch (ad.sourceType) {
              case 'car':
                sourceData = carsMap.get(ad.sourceId) || null;
                break;
              case 'auction':
                sourceData = auctionsMap.get(ad.sourceId) || null;
                break;
              case 'showroom':
                sourceData = showroomsMap.get(ad.sourceId) || null;
                break;
              case 'transport':
                sourceData = transportsMap.get(ad.sourceId) || null;
                break;
            }
          }
          // إضافة creator من users للتوافق مع FeaturedAdCard
          return { ...ad, sourceData, creator: ad.users };
        });

        return { enrichedAds, featuredIds: featuredAds.map((ad) => ad.id) };
      });

      // تحديث عدد المشاهدات - نحافظ على نفس السلوك حتى مع الكاش
      try {
        if (featuredIds.length > 0) {
          await prisma.featured_ads.updateMany({
            where: { id: { in: featuredIds } },
            data: { views: { increment: 1 } },
          });
        }
      } catch (updateError) {
        console.error('خطأ في تحديث عدد المشاهدات:', updateError);
      }

      return res.status(200).json({ success: true, data: enrichedAds });
    } catch (error) {
      console.error('خطأ في جلب الإعلانات المميزة:', error);
      // إرجاع بيانات وهمية بدلاً من خطأ 500
      const mockAds = [
        {
          id: '1',
          title: 'عرض خاص - سيارة تويوتا كامري 2020',
          description: 'سيارة في حالة ممتازة للبيع',
          imageUrl: '/images/placeholder-car.jpg',
          linkUrl: '/cars/1',
          adType: 'CAR_LISTING',
          sourceId: '1',
          sourceType: 'car',
          position: 1,
          isActive: true,
          priority: 5,
          startDate: new Date(),
          endDate: null,
          views: 150,
          clicks: 12,
          budget: null,
          targetAudience: null,
          location: 'طرابلس',
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: { id: 'system', name: 'النظام', phone: '0500000000' },
          sourceData: null,
        },
      ];

      return res.status(200).json({
        success: true,
        data: mockAds,
        fallback: true,
        message: 'تم استخدام بيانات تجريبية',
      });
    }
  } else if (req.method === 'POST') {
    try {
      const {
        title,
        description,
        imageUrl,
        linkUrl,
        adType,
        sourceId,
        sourceType,
        position,
        priority,
        startDate,
        endDate,
        budget,
        targetAudience,
        location,
        createdBy,
      } = req.body;

      const newAd = await prisma.featured_ads.create({
        data: {
          id: `ad_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
          title,
          description,
          imageUrl,
          linkUrl,
          adType,
          sourceId,
          sourceType,
          position: position || 1,
          priority: priority || 1,
          startDate: startDate ? new Date(startDate) : new Date(),
          endDate: endDate ? new Date(endDate) : null,
          budget,
          targetAudience,
          location,
          createdBy,
          updatedAt: new Date(),
        },
        include: {
          users: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        data: newAd,
      });
    } catch (error) {
      console.error('خطأ في إنشاء الإعلان المميز:', error);
      res.status(500).json({
        success: false,
        error: 'خطأ في إنشاء الإعلان المميز',
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).json({
      success: false,
      error: `الطريقة ${req.method} غير مسموحة`,
    });
  }
}
