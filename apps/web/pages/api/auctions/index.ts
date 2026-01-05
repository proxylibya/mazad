/**
 * API المزادات - جلب جميع المزادات من قاعدة البيانات
 * تم تنظيف البيانات الوهمية - يعرض فقط البيانات الحقيقية
 */
import { prisma } from '@/lib/prisma';
import { formatMileage } from '@/utils/carTranslations';
import { translateToArabic } from '@/utils/formatters';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const status = req.query.status as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // بناء شرط البحث
    // ✅ فقط المزادات الأونلاين (بدون ساحة) - مزادات الساحات تظهر في /yards/[slug]
    const where: Record<string, unknown> = {
      yardId: null, // استبعاد مزادات الساحات
    };
    if (status && status !== 'all') {
      where.status = status;
    } else {
      where.status = { not: 'CANCELLED' };
    }

    // جلب المزادات من قاعدة البيانات مع جميع العلاقات
    // ✅ تم إصلاح أسماء العلاقات حسب schema.prisma:
    // - cars (وليس car)
    // - users (وليس seller)
    // - car_images (وليس carImages)
    const [auctions, total] = await Promise.all([
      prisma.auctions.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { featured: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          cars: {
            include: {
              car_images: {
                take: 5,
                orderBy: { isPrimary: 'desc' },
              },
            },
          },
          users: {
            select: {
              id: true,
              name: true,
              verified: true,
            },
          },
          _count: {
            select: { bids: true },
          },
        },
      }),
      prisma.auctions.count({ where }),
    ]);

    // تحويل البيانات لتتوافق مع الواجهة الأمامية
    // الواجهة تتوقع: car, seller, carImages, auctionStartTime, auctionEndTime
    // قاعدة البيانات ترجع: cars, users, car_images, startDate, endDate
    const transformedAuctions = auctions.map((auction: any) => {
      // استخراج روابط الصور من car_images (الجديد) أو images (القديم)
      const carImagesArray = auction.cars?.car_images || [];
      let imageUrls: string[] = carImagesArray
        .filter((img: any) => img && img.fileUrl && img.fileUrl.trim())
        .map((img: any) => {
          const url = img.fileUrl.trim();
          // التأكد من أن الرابط صحيح
          if (url.startsWith('http') || url.startsWith('/')) {
            return url;
          }
          return `/images/cars/listings/${url}`;
        });

      // ✅ fallback للصور القديمة من حقل images
      if (imageUrls.length === 0 && auction.cars?.images) {
        const legacyImages = auction.cars.images;
        if (typeof legacyImages === 'string' && legacyImages.trim()) {
          try {
            // محاولة تحليل JSON
            if (legacyImages.startsWith('[')) {
              const parsed = JSON.parse(legacyImages);
              if (Array.isArray(parsed)) {
                imageUrls = parsed.filter((img: any) =>
                  typeof img === 'string' && img.trim() &&
                  !img.includes('placeholder') && !img.includes('unsplash')
                );
              }
            } else if (legacyImages.includes(',')) {
              // صور مفصولة بفواصل
              imageUrls = legacyImages.split(',')
                .map((img: string) => img.trim())
                .filter((img: string) => img && !img.includes('placeholder') && !img.includes('unsplash'));
            } else {
              // صورة واحدة
              if (!legacyImages.includes('placeholder') && !legacyImages.includes('unsplash')) {
                imageUrls = [legacyImages.trim()];
              }
            }
          } catch (e) {
            // إذا فشل التحليل، استخدم النص كما هو
            if (!legacyImages.includes('placeholder') && !legacyImages.includes('unsplash')) {
              imageUrls = [legacyImages.trim()];
            }
          }
        } else if (Array.isArray(legacyImages)) {
          imageUrls = legacyImages.filter((img: any) =>
            typeof img === 'string' && img.trim() &&
            !img.includes('placeholder') && !img.includes('unsplash')
          );
        }
      }

      // إذا لم توجد صور، استخدم الصورة الافتراضية
      if (imageUrls.length === 0) {
        imageUrls.push('/images/cars/default-car.svg');
      }

      return {
        ...auction,
        // تحويل cars إلى car مع الصور المحسنة وتنسيق البيانات
        car: auction.cars ? {
          ...auction.cars,
          // تحويل car_images إلى carImages مع fileUrl
          carImages: carImagesArray,
          // إضافة مصفوفة images مباشرة للاستخدام السهل
          images: imageUrls,
          // حذف car_images الأصلي
          car_images: undefined,
          // ✅ تنسيق البيانات لتتوافق مع العرض (كما في SSR)
          mileage: formatMileage(auction.cars.mileage),
          fuelType: translateToArabic(auction.cars.fuelType),
          transmission: translateToArabic(auction.cars.transmission),
          condition: translateToArabic(auction.cars.condition),
          bodyType: translateToArabic(auction.cars.bodyType),
          color: translateToArabic(auction.cars.color),
        } : null,
        // إضافة الصور على مستوى المزاد أيضاً
        images: imageUrls,
        image: imageUrls[0] || '/images/cars/default-car.svg',
        imageList: imageUrls,
        // تحويل users إلى seller
        seller: auction.users || null,
        // ✅ تحويل التواريخ للواجهة الأمامية
        auctionStartTime: auction.startDate?.toISOString?.() || auction.startDate || null,
        auctionEndTime: auction.endDate?.toISOString?.() || auction.endDate || null,
        startTime: auction.startDate?.toISOString?.() || auction.startDate || null,
        endTime: auction.endDate?.toISOString?.() || auction.endDate || null,
        // ✅ إضافة السعر الابتدائي للعداد
        startingBid: auction.startPrice || auction.currentPrice || 0,
        startingPrice: auction.startPrice || auction.currentPrice || 0,
        // حذف الأسماء القديمة
        cars: undefined,
        users: undefined,
        // إضافة عدد المزايدات
        bidsCount: auction._count?.bids || 0,
        bidCount: auction._count?.bids || 0,
        totalBids: auction._count?.bids || 0,
        // بيانات الترويج
        featured: auction.featured || false,
        promotionPackage: auction.promotionPackage || 'free',
        promotionDays: auction.promotionDays || 0,
        promotionEndDate: auction.promotionEndDate || null,
        promotionPriority: auction.promotionPriority || 0,
      };
    });

    // إرجاع البيانات الحقيقية فقط (بدون بيانات وهمية)
    return res.status(200).json({
      success: true,
      message: auctions.length > 0 ? 'تم جلب المزادات بنجاح' : 'لا توجد مزادات حالياً',
      data: {
        auctions: transformedAuctions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error('[API Error] /api/auctions:', error);

    // إرجاع خطأ واضح بدون بيانات وهمية
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في جلب المزادات',
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
      data: {
        auctions: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
        },
      },
    });
  }
}
