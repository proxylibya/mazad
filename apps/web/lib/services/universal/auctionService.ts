/**
 * خدمة موحدة للمزادات - مع دعم كامل للصور الحقيقية
 */

import { getOrSetCache } from '../../core/cache/UnifiedCache';
import { logger } from '../../core/logging/UnifiedLogger';
import prisma from '../../prisma';
import { getVehicleWithImages, resolveVehicleImages } from './vehicleService';

export interface AuctionWithVehicle {
  id: string;
  title: string;
  description: string | null;
  startPrice: number;
  currentPrice: number;
  minimumBid: number;
  startDate: Date;
  endDate: Date;
  status: string;
  featured: boolean;
  views: number;
  totalBids: number;
  createdAt: Date;
  car: {
    id: string;
    title: string;
    brand: string;
    model: string;
    year: number;
    price: number;
    condition: string;
    mileage: number | null;
    location: string;
    area?: string;
    images: string[];
    seller: {
      id: string;
      name: string;
      phone: string;
      verified: boolean;
    };
  };
  seller: {
    id: string;
    name: string;
    phone: string;
    verified: boolean;
  };
}

/**
 * جلب مزاد محدد مع بيانات السيارة والصور
 * يدعم البحث بـ auctionId أو carId
 */
export async function getAuctionWithVehicle(auctionId: string): Promise<AuctionWithVehicle | null> {
  const cacheKey = `auction:${auctionId}:with-vehicle`;

  return await getOrSetCache(cacheKey, 300, async () => {
    logger.info(`[AuctionService] جلب بيانات المزاد: ${auctionId}`);

    // البحث أولاً بـ id المزاد
    let auction = await prisma.auctions.findUnique({
      where: { id: auctionId },
      select: {
        id: true,
        title: true,
        description: true,
        startPrice: true,
        currentPrice: true,
        minimumBid: true,
        startDate: true,
        endDate: true,
        status: true,
        featured: true,
        promotionPackage: true,
        promotionDays: true,
        promotionStartDate: true,
        promotionEndDate: true,
        promotionPriority: true,
        views: true,
        totalBids: true,
        createdAt: true,
        carId: true,
        sellerId: true,
        location: true,
        users: {
          select: {
            id: true,
            name: true,
            phone: true,
            verified: true,
          }
        },
        bids: {
          select: {
            amount: true,
            createdAt: true,
            users: {
              select: {
                name: true
              }
            }
          },
          orderBy: { amount: 'desc' },
          take: 5
        }
      }
    });

    // إذا لم يُعثر عليه بـ id، نبحث بـ carId
    if (!auction) {
      logger.info(`[AuctionService] لم يُعثر على المزاد بـ id، نبحث بـ carId: ${auctionId}`);
      auction = await prisma.auctions.findFirst({
        where: { carId: auctionId },
        select: {
          id: true,
          title: true,
          description: true,
          startPrice: true,
          currentPrice: true,
          minimumBid: true,
          startDate: true,
          endDate: true,
          status: true,
          featured: true,
          promotionPackage: true,
          promotionDays: true,
          promotionStartDate: true,
          promotionEndDate: true,
          promotionPriority: true,
          views: true,
          totalBids: true,
          createdAt: true,
          carId: true,
          sellerId: true,
          location: true,
          users: {
            select: {
              id: true,
              name: true,
              phone: true,
              verified: true,
            }
          },
          bids: {
            select: {
              amount: true,
              createdAt: true,
              users: {
                select: {
                  name: true
                }
              }
            },
            orderBy: { amount: 'desc' },
            take: 5
          }
        }
      });
    }

    if (!auction) {
      logger.warn(`[AuctionService] المزاد غير موجود بـ id أو carId: ${auctionId}`);
      return null;
    }

    const auctionAny = auction as any;

    // جلب بيانات السيارة مع الصور
    const vehicle = await getVehicleWithImages(auction.carId);

    if (!vehicle) {
      logger.error(`[AuctionService] السيارة المرتبطة بالمزاد غير موجودة: ${auction.carId}`);
      return null;
    }

    // حل الصور بالنظام الموحد
    const resolvedImages = resolveVehicleImages(vehicle);

    // جلب بيانات المشتري إذا كان المزاد مباع
    let buyerName = null;
    if (auctionAny.status === 'SOLD' && auctionAny.bids && auctionAny.bids.length > 0) {
      // أعلى مزايد هو الفائز
      buyerName = auctionAny.bids[0]?.users?.name || null;
    }

    // رقم الهاتف للاتصال - أولوية: contactPhone من السيارة، ثم هاتف البائع
    const contactPhone = (vehicle as any).contactPhone || auctionAny.users?.phone || '';

    const auctionWithVehicle: any = {
      ...auctionAny,
      // إضافة اسم المشتري إذا كان المزاد مباع
      buyerName: buyerName,
      // رقم الهاتف للاتصال على مستوى المزاد
      contactPhone: contactPhone,
      // إعادة تسمية الحقول للتوافق مع الواجهة
      seller: auctionAny.users,
      // إضافة حقول التوقيت للعداد - توحيد مع البطاقات (تحويل إلى ISO دائمًا)
      auctionStartTime: auctionAny.startDate ? new Date(auctionAny.startDate).toISOString() : null,
      auctionEndTime: auctionAny.endDate ? new Date(auctionAny.endDate).toISOString() : null,
      startTime: auctionAny.startDate,
      endTime: auctionAny.endDate,
      auctionType: (() => {
        const now = new Date();
        const startTime = new Date(auctionAny.startDate);
        const endTime = new Date(auctionAny.endDate);

        if (now < startTime) return 'upcoming';
        if (now > endTime) return 'ended';
        return 'live';
      })(),
      // بيانات المزايدة للعداد
      startingPrice: auctionAny.startPrice,
      startingBid: auctionAny.startPrice,
      currentBid: auctionAny.currentPrice,
      bidCount: auctionAny.totalBids,
      reservePrice: null,
      minimumBidIncrement: auctionAny.minimumBid ?? 500, // الحد الأدنى للزيادة من قاعدة البيانات
      car: {
        id: vehicle.id,
        title: vehicle.title,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year,
        price: vehicle.price,
        condition: vehicle.condition,
        mileage: vehicle.mileage,
        location: vehicle.location,
        area: (vehicle as any).area,
        images: resolvedImages,
        seller: vehicle.seller,
        // إضافة جميع الحقول التقنية والقانونية - مع type assertion آم
        chassisNumber: (vehicle as any).chassisNumber,
        engineNumber: (vehicle as any).engineNumber,
        manufacturingCountry: (vehicle as any).manufacturingCountry,
        customsStatus: (vehicle as any).customsStatus,
        licenseStatus: (vehicle as any).licenseStatus,
        fuelType: (vehicle as any).fuelType,
        transmission: (vehicle as any).transmission,
        bodyType: (vehicle as any).bodyType,
        engineSize: (vehicle as any).engineSize,
        color: (vehicle as any).color,
        interiorColor: (vehicle as any).interiorColor,
        seatCount: (vehicle as any).seatCount,
        regionalSpecs: (vehicle as any).regionalSpecs,
        locationAddress: (vehicle as any).locationAddress,
        locationLat: (vehicle as any).locationLat,
        locationLng: (vehicle as any).locationLng,
        // الميزات والكماليات
        features: vehicle.features,
        interiorFeatures: (vehicle as any).interiorFeatures,
        exteriorFeatures: (vehicle as any).exteriorFeatures,
        technicalFeatures: (vehicle as any).technicalFeatures,
        // تقرير الفحص
        hasInspectionReport: (vehicle as any).hasInspectionReport,
        hasManualInspectionReport: (vehicle as any).hasManualInspectionReport,
        manualInspectionData: (vehicle as any).manualInspectionData,
        inspectionReportFileUrl: (vehicle as any).inspectionReportFileUrl,
        // بيانات إضافية
        description: (vehicle as any).description,
        views: (vehicle as any).views,
        featured: (vehicle as any).featured,
        // رقم الهاتف للاتصال
        contactPhone: (vehicle as any).contactPhone,
        // إضافة بيانات العداد في Car object أيضاً للتوافق (ISO)
        auctionStartTime: auctionAny.startDate ? new Date(auctionAny.startDate).toISOString() : null,
        auctionEndTime: auctionAny.endDate ? new Date(auctionAny.endDate).toISOString() : null,
        startingBid: auctionAny.startPrice,
        currentBid: auctionAny.currentPrice
      }
    };

    logger.info(`[AuctionService] تم جلب المزاد ${auctionId} مع ${resolvedImages.length} صورة`);

    return auctionWithVehicle as AuctionWithVehicle;
  });
}

/**
 * جلب قائمة المزادات مع بيانات السيارات والصور
 */
export async function getAuctionsWithVehicles(options: {
  limit?: number;
  offset?: number;
  status?: string;
  featured?: boolean;
  sellerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{ auctions: AuctionWithVehicle[]; total: number; }> {

  const {
    limit = 20,
    offset = 0,
    status,
    featured,
    sellerId,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = options;

  const cacheKey = `auctions:list:${JSON.stringify(options)}`;

  return await getOrSetCache(cacheKey, 60, async () => {
    logger.info('[AuctionService] جلب قائمة المزادات مع الفلاتر:', options);

    // ✅ استبعاد مزادات الساحات افتراضياً - تظهر فقط في /yards/[slug]
    const where: any = {
      yardId: null, // مزادات أونلاين فقط
    };
    if (status) where.status = status;
    if (featured !== undefined) where.featured = featured;
    if (sellerId) where.sellerId = sellerId;

    const [auctions, total] = await Promise.all([
      prisma.auctions.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          startPrice: true,
          currentPrice: true,
          minimumBid: true,
          startDate: true,
          endDate: true,
          status: true,
          featured: true,
          views: true,
          totalBids: true,
          createdAt: true,
          carId: true,
          location: true,
          users: {
            select: {
              id: true,
              name: true,
              phone: true,
              verified: true,
            }
          },
          cars: {
            select: {
              id: true,
              title: true,
              brand: true,
              model: true,
              year: true,
              price: true,
              condition: true,
              mileage: true,
              location: true,
              images: true,
              car_images: {
                select: {
                  fileUrl: true,
                  isPrimary: true,
                },
                orderBy: [
                  { isPrimary: 'desc' },
                  { createdAt: 'asc' }
                ],
                take: 3
              },
              users: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  verified: true,
                }
              }
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip: offset,
        take: limit,
      }),
      prisma.auctions.count({ where })
    ]);

    // معالجة الصور لكل مزاد
    const processedAuctions: AuctionWithVehicle[] = (auctions as any[]).map((auction) => {
      const resolvedImages = auction.cars ? resolveVehicleImages(auction.cars) : [];
      const now = new Date();
      const start = auction.startDate ? new Date(auction.startDate) : null;
      const end = auction.endDate ? new Date(auction.endDate) : null;
      const auctionType = (() => {
        if (start && now < start) return 'upcoming';
        if (end && now > end) return 'ended';
        return 'live';
      })();

      const unified: any = {
        ...auction,
        seller: auction.users,
        car: auction.cars ? {
          ...auction.cars,
          seller: auction.cars.users,
          images: resolvedImages,
        } : null,
        auctionStartTime: start ? start.toISOString() : null,
        auctionEndTime: end ? end.toISOString() : null,
        startTime: auction.startDate,
        endTime: auction.endDate,
        auctionType,
        startingPrice: auction.startPrice,
        startingBid: auction.startPrice,
        currentBid: auction.currentPrice,
        bidCount: auction.totalBids,
        reservePrice: null,
        minimumBidIncrement: auction.minimumBid ?? 500,
      };

      return unified as AuctionWithVehicle;
    });

    logger.info(`[AuctionService] تم العثور على ${processedAuctions.length} من أصل ${total} مزاد`);

    return {
      auctions: processedAuctions,
      total
    };
  });
}

/**
 * تحديث عداد المشاهدات للمزاد
 * @deprecated استخدم viewsService.recordAuctionView بدلاً من هذه الدالة
 */
export async function incrementAuctionViews(auctionId: string): Promise<void> {
  // استخدام الخدمة الموحدة للمشاهدات
  try {
    // استيراد ديناميكي لتجنب التبعية الدائرية
    const { default: viewsService } = await import('../unified/viewsService');
    await viewsService.recordAuctionView(auctionId);
    logger.info(`[AuctionService] تم تحديث عداد المشاهدات للمزاد ${auctionId}`);
  } catch (error) {
    logger.error(`[AuctionService] فشل في تحديث عداد المشاهدات للمزاد ${auctionId}:`, error);
  }
}

export default {
  getAuctionWithVehicle,
  getAuctionsWithVehicles,
  incrementAuctionViews
};
