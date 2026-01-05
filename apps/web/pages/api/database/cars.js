import { prisma } from '@/lib/prisma';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      cursor = '',
      limit = 10,
      search = '',
      brand = '',
      condition = '',
      status = '',
      minPrice = '',
      maxPrice = '',
      year = '',
    } = req.query;

    const take = parseInt(limit);

    // بناء شروط البحث
    const where = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }

    if (condition) {
      where.condition = condition;
    }

    if (status) {
      where.status = status;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    if (year) {
      where.year = parseInt(year);
    }

    // جلب السيارات مع البيانات المرتبطة باستخدام Cursor Pagination
    const queryOptions = {
      where,
      take: take + 1, // جلب عنصر إضافي للتحقق من وجود صفحة تالية
      include: {
        users: {
          select: {
            id: true,
            name: true,
            phone: true,
            accountType: true,
            verified: true,
            profileImage: true,
          },
        },
        car_images: {
          select: {
            id: true,
            fileName: true,
            fileUrl: true,
            isPrimary: true,
            category: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        auctions: {
          select: {
            id: true,
            title: true,
            status: true,
            startPrice: true,
            currentPrice: true,
            totalBids: true,
            startDate: true,
            endDate: true,
            featured: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        bids: {
          select: {
            id: true,
            amount: true,
            createdAt: true,
            users: {
              select: {
                name: true,
                phone: true,
              },
            },
          },
          orderBy: { amount: 'desc' },
          take: 5,
        },
        inspection_reports: {
          select: {
            id: true,
            inspectorName: true,
            inspectionDate: true,
            overallCondition: true,
            rating: true,
            recommendedPrice: true,
          },
        },
        _count: {
          select: {
            auctions: true,
            bids: true,
            car_images: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    };

    // إضافة cursor إذا كان موجوداً
    if (cursor) {
      queryOptions.cursor = { id: String(cursor) };
      queryOptions.skip = 1; // تخطي العنصر المستخدم كـ cursor
    }

    const cars = await prisma.cars.findMany(queryOptions);

    // التحقق من وجود صفحة تالية
    const hasNextPage = cars.length > take;
    if (hasNextPage) {
      cars.pop(); // إزالة العنصر الإضافي
    }

    // جلب العدد الإجمالي للسيارات (اختياري - يمكن حذفه لتحسين الأداء)
    const totalCars = await prisma.cars.count({ where });

    // تنسيق البيانات
    const formattedCars = cars.map((car) => {
      // تحليل الميزات
      let features = [];
      let interiorFeatures = [];
      let exteriorFeatures = [];
      let technicalFeatures = [];

      try {
        if (car.features) features = JSON.parse(car.features);
        if (car.interiorFeatures) interiorFeatures = JSON.parse(car.interiorFeatures);
        if (car.exteriorFeatures) exteriorFeatures = JSON.parse(car.exteriorFeatures);
        if (car.technicalFeatures) technicalFeatures = JSON.parse(car.technicalFeatures);
      } catch (e) {
        // في حالة كانت البيانات نص عادي
        if (car.features) features = car.features.split(',').map((f) => f.trim());
      }

      return {
        id: car.id,
        title: car.title,
        brand: car.brand,
        model: car.model,
        year: car.year,
        price: car.price,
        condition: car.condition,
        status: car.status,
        mileage: car.mileage,
        location: car.location,
        locationLat: car.locationLat,
        locationLng: car.locationLng,
        locationAddress: car.locationAddress,
        description: car.description,
        createdAt: car.createdAt,
        updatedAt: car.updatedAt,

        // تفاصيل السيارة
        details: {
          fuelType: car.fuelType,
          transmission: car.transmission,
          bodyType: car.bodyType,
          color: car.color,
          interiorColor: car.interiorColor,
          seatCount: car.seatCount,
          regionalSpecs: car.regionalSpecs,
          vehicleType: car.vehicleType,
          manufacturingCountry: car.manufacturingCountry,
          chassisNumber: car.chassisNumber,
          engineNumber: car.engineNumber,
          customsStatus: car.customsStatus,
          licenseStatus: car.licenseStatus,
          insuranceStatus: car.insuranceStatus,
          paymentMethod: car.paymentMethod,
          contactPhone: car.contactPhone,
        },

        // الميزات
        features: {
          general: features,
          interior: interiorFeatures,
          exterior: exteriorFeatures,
          technical: technicalFeatures,
        },

        // تقرير الفحص
        inspection: car.inspection_reports
          ? {
              hasReport: true,
              inspector: car.inspection_reports.inspectorName,
              date: car.inspection_reports.inspectionDate,
              condition: car.inspection_reports.overallCondition,
              rating: car.inspection_reports.rating,
              recommendedPrice: car.inspection_reports.recommendedPrice,
            }
          : {
              hasReport: false,
            },

        // بيانات البائع
        seller: {
          id: car.users.id,
          name: car.users.name,
          phone: car.users.phone,
          accountType: car.users.accountType,
          verified: car.users.verified,
          profileImage: car.users.profileImage,
        },

        // الصور
        images: car.car_images.map((img) => ({
          id: img.id,
          fileName: img.fileName,
          url: img.fileUrl,
          isPrimary: img.isPrimary,
          category: img.category,
        })),

        // المزادات
        auctions: car.auctions.map((auction) => ({
          id: auction.id,
          title: auction.title,
          status: auction.status,
          startingPrice: auction.startPrice,
          currentPrice: auction.currentPrice,
          reservePrice: null,
          totalBids: auction.totalBids,
          startTime: auction.startDate,
          endTime: auction.endDate,
          featured: auction.featured,
        })),

        // أعلى العروض
        topBids: car.bids.map((bid) => ({
          id: bid.id,
          amount: bid.amount,
          createdAt: bid.createdAt,
          bidder: bid.users.name,
        })),

        // الإحصائيات
        stats: {
          auctions: car._count.auctions,
          bids: car._count.bids,
          images: car._count.car_images,
          highestBid: car.bids.length > 0 ? car.bids[0].amount : 0,
        },
      };
    });

    // معلومات التصفح مع Cursor Pagination
    const nextCursor = hasNextPage && cars.length > 0 ? cars[cars.length - 1].id : null;

    const pagination = {
      totalCars,
      hasNextPage,
      nextCursor,
      limit: take,
    };

    res.status(200).json({
      success: true,
      data: formattedCars,
      pagination,
      filters: {
        search,
        brand,
        condition,
        status,
        minPrice,
        maxPrice,
        year,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        recordsReturned: formattedCars.length,
      },
    });
  } catch (error) {
    console.error('خطأ في جلب بيانات السيارات:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب بيانات السيارات',
      details: error.message,
    });
  }
}
