import { Prisma, PrismaClient } from '@prisma/client';
import { getOrSetCache } from './cache';
import logger from './utils/logger';
import { generateUniqueId } from './wallet/wallet-utils';

// ملاحظة: تم تعطيل Extensions & Metrics مؤقتاً لضمان استقرار الاتصال
// الاستيرادات التالية معطلة حالياً:
// import * as Sentry from '@sentry/nextjs';
// import { metrics } from './monitoring/performance-metrics';
// import { trackDatabaseQuery } from './monitoring/sentry-config';

// ملاحظة: تم إزالة محاولة الاستيراد الديناميكي لـ Enhanced Connection Manager لتجنب أخطاء البناء
// في حال الحاجة لاستخدامه لاحقاً، يجب استيراده في أعلى الملف بصيغة ثابتة واستخدامه فعلياً.

// Query Limit Protection
const MAX_QUERY_LIMIT = 100;
const DEFAULT_QUERY_LIMIT = 20;

/**
 * التحقق من صحة حد الاستعلام
 * حماية من الاستعلامات الكبيرة التي قد تبطئ النظام
 */
export function validateQueryLimit(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_QUERY_LIMIT;
  if (limit > MAX_QUERY_LIMIT) return MAX_QUERY_LIMIT;
  return Math.floor(limit);
}

// ملاحظة: تم إزالة دالة decodeResultData بعد تنظيف قاعدة البيانات
// جميع البيانات الآن محفوظة مباشرة بالعربية (UTF-8)

// ═══════════════════════════════════════════════════════════════
// إنشاء PrismaClient الأساسي - Singleton Pattern
// ═══════════════════════════════════════════════════════════════
// تم تبسيط هذا القسم لضمان استقرار الاتصال بقاعدة البيانات
// Extensions & Metrics تم تعطيلها مؤقتاً لحل مشاكل الاتصال

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function buildPrismaDatabaseUrl(databaseUrl: string): string {
  try {
    const parsed = new URL(databaseUrl);
    const params = new URLSearchParams(parsed.search);
    if (params.has('options')) {
      return databaseUrl;
    }
  } catch (_) {
    // ignore
  }

  const separator = databaseUrl.includes('?') ? '&' : '?';
  return databaseUrl + separator + 'options=-c%20client_encoding=UTF8';
}

const rawDatabaseUrl = (process.env.DATABASE_URL || '').trim();
const normalizedDatabaseUrl = rawDatabaseUrl.replace(/^\s*['"]|['"]\s*$/g, '').trim();
if (!normalizedDatabaseUrl || (!normalizedDatabaseUrl.startsWith('postgresql://') && !normalizedDatabaseUrl.startsWith('postgres://'))) {
  throw new Error('Invalid DATABASE_URL. It must start with postgresql:// or postgres://');
}

const basePrisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: buildPrismaDatabaseUrl(normalizedDatabaseUrl),
      },
    },
  });

// ضبط client_encoding عند الاتصال
basePrisma.$executeRawUnsafe("SET client_encoding = 'UTF8'").catch(() => {
  // تجاهل الخطأ إذا فشل - سيعمل بالإعدادات الافتراضية
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = basePrisma;
}

// تصدير Prisma Client البسيط والمستقر
// ملاحظة: تم تعطيل Extensions مؤقتاً لحل "User was denied access" error
// سيتم إعادة تفعيل Metrics & Monitoring بعد استقرار الاتصال
export const prisma = basePrisma;

export default prisma;

// مساعدات قاعدة البيانات
export const dbHelpers = {
  // إكسبوز prisma للاستخدام المباشر
  prisma,

  // الحصول على سيارة بواسطة ID مع جميع التفاصيل
  async getCarById(id: string) {
    return await prisma.cars.findUnique({
      where: { id },
      select: {
        // البيانات الأساسية
        id: true,
        title: true,
        brand: true,
        model: true,
        year: true,
        price: true,
        images: true,
        condition: true,
        mileage: true,
        location: true,
        description: true,
        features: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        views: true,
        isAuction: true,

        // بيانات الموقع المفصلة
        locationLat: true,
        locationLng: true,
        locationAddress: true,

        // المميزات المصنفة
        interiorFeatures: true,
        exteriorFeatures: true,
        technicalFeatures: true,

        // المواصفات التقنية
        fuelType: true,
        transmission: true,
        bodyType: true,
        color: true,
        interiorColor: true,
        seatCount: true,
        regionalSpecs: true,
        vehicleType: true,
        manufacturingCountry: true,
        chassisNumber: true,
        engineNumber: true,

        // الحالة القانونية والوثائق
        customsStatus: true,
        licenseStatus: true,
        insuranceStatus: true,
        paymentMethod: true,

        // معلومات الاتصال
        contactPhone: true,

        // تقارير الفحص
        hasInspectionReport: true,
        inspectionReportFile: true,
        inspectionReportType: true,
        inspectionReportFileUrl: true,
        inspectionReportFileName: true,
        inspectionReportUploadId: true,
        hasManualInspectionReport: true,
        manualInspectionData: true,

        // معلومات المعرض
        showroomId: true,
        featured: true,

        // حقول الترويج والإعلان المميز
        promotionPackage: true,
        promotionDays: true,
        promotionStartDate: true,
        promotionEndDate: true,
        promotionPriority: true,

        users: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            profileImage: true,
            verified: true,
            accountType: true,
            rating: true,
          },
        },
        showrooms: {
          select: {
            id: true,
            name: true,
            verified: true,
            rating: true,
          },
        },
        car_images: {
          select: {
            fileUrl: true,
            isPrimary: true,
            createdAt: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          take: 10,
        },
      },
    });
  },

  // الحصول على سيارات السوق الفوري (بدون المزادات) - مع Cursor Pagination
  async getMarketplaceCars(options: {
    limit?: number;
    cursor?: string; // إضافة cursor للتصفح الأسرع
    status?: string;
    brand?: string;
    model?: string;
    minPrice?: number;
    maxPrice?: number;
    minYear?: number;
    maxYear?: number;
    condition?: string;
    fuelType?: string;
    transmission?: string;
    bodyType?: string;
    mileageMax?: number;
    color?: string;
    search?: string;
  }) {
    // إعادة تفعيل التخزين المؤقت بعد إصلاح مشكلة isAuction
    const cacheKey = `marketplace:cars:${encodeURIComponent(JSON.stringify(options || {}))}`;
    return await getOrSetCache(cacheKey, 60, async () => { // 60 ثانية cache
      const {
        limit: rawLimit = 50,
        cursor,
        status = 'AVAILABLE',
        brand,
        model,
        minPrice,
        maxPrice,
        minYear,
        maxYear,
        condition,
        fuelType,
        transmission,
        bodyType,
        mileageMax,
        color,
        search,
      } = options;

      // تطبيق حماية حد الاستعلام
      const limit = validateQueryLimit(rawLimit);

      const where: Prisma.carsWhereInput = {
        status: status as Prisma.carsWhereInput['status'],
        isAuction: false, // فقط السيارات التي ليست في مزادات
      };

      if (brand) where.brand = brand;
      if (model) where.model = model;
      if (condition) where.condition = condition as Prisma.carsWhereInput['condition'];
      if (fuelType) where.fuelType = fuelType as Prisma.carsWhereInput['fuelType'];
      if (transmission) where.transmission = transmission as Prisma.carsWhereInput['transmission'];
      if (bodyType) where.bodyType = bodyType as Prisma.carsWhereInput['bodyType'];
      if (color) where.color = color;

      if (minPrice !== undefined || maxPrice !== undefined) {
        const priceFilter: Prisma.FloatFilter = {};
        if (minPrice !== undefined) priceFilter.gte = minPrice;
        if (maxPrice !== undefined) priceFilter.lte = maxPrice;
        where.price = priceFilter;
      }

      if (minYear !== undefined || maxYear !== undefined) {
        const yearFilter: Prisma.IntFilter = {};
        if (minYear !== undefined) yearFilter.gte = minYear;
        if (maxYear !== undefined) yearFilter.lte = maxYear;
        where.year = yearFilter;
      }

      if (mileageMax) {
        where.mileage = { lte: mileageMax };
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { brand: { contains: search, mode: 'insensitive' } },
          { model: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Cursor-based Pagination للأداء الأفضل
      const queryOptions: Prisma.carsFindManyArgs = {
        where,
        take: limit + 1, // +1 للتحقق من وجود المزيد
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          brand: true,
          model: true,
          year: true,
          price: true,
          mileage: true,
          fuelType: true,
          transmission: true,
          bodyType: true,
          condition: true,
          location: true,
          color: true,
          images: true,
          sellerId: true,
          status: true,
          featured: true,
          createdAt: true,
          // بيانات المستخدم المختصرة
          users: {
            select: {
              id: true,
              name: true,
              phone: true,
              verified: true,
              profileImage: true,
              accountType: true,
              rating: true,
            },
          },
          // بيانات المعرض المختصرة
          showrooms: {
            select: {
              id: true,
              name: true,
              verified: true,
              rating: true,
            },
          },
          // الصور (فقط أول 3 صور)
          car_images: {
            select: {
              fileUrl: true,
              isPrimary: true,
            },
            take: 3,
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
        },
      };

      // استخدام cursor إذا كان موجوداً
      if (cursor) {
        queryOptions.cursor = { id: cursor };
        queryOptions.skip = 1; // تخطي العنصر الذي يشير إليه cursor
      }

      let results: Array<{
        id: string;
        [key: string]: unknown;
      }>;
      try {
        results = await prisma.cars.findMany(queryOptions);
      } catch (err: unknown) {
        const error = err as Error;
        // تسجيل الخطأ مع التفاصيل
        logger.error('فشل في استعلام السيارات', {
          error: error?.message,
          options: JSON.stringify(options).substring(0, 200)
        });
        throw new Error('خطأ في قاعدة البيانات: ' + (error?.message || 'خطأ غير معروف'));
      }

      // التحقق من وجود المزيد من النتائج
      const hasMore = results.length > limit;
      const cars = hasMore ? results.slice(0, limit) : results;
      const nextCursor = hasMore ? cars[cars.length - 1].id : null;

      return { cars, nextCursor, hasMore };
    }); // إعادة تفعيل التخزين المؤقت
  },

  // الحصول على السيارات المميزة
  async getFeaturedCars(options: { limit?: number; status?: string; }) {
    const { limit = 20, status = 'AVAILABLE' } = options;
    const cacheKey = `cars:featured:${limit}:${status}`;

    return await getOrSetCache(cacheKey, 60, async () => {
      let featuredCars;
      try {
        featuredCars = await prisma.cars.findMany({
          where: {
            featured: true,
            status: status as Prisma.carsWhereInput['status'],
            isAuction: false,
          },
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
            fuelType: true,
            transmission: true,
            condition: true,
            color: true,
            images: true,
            featured: true,
            createdAt: true,
            users: {
              select: {
                id: true,
                name: true,
                verified: true,
                profileImage: true,
                rating: true,
              },
            },
            car_images: {
              select: {
                fileUrl: true,
                isPrimary: true,
              },
              take: 3,
              orderBy: [{ isPrimary: 'desc' }],
            },
          },
        });
      } catch (err: unknown) {
        const error = err as Error;
        const message: string = error?.message || '';
        const isMissingIsAuctionColumn =
          typeof message === 'string' &&
          message.toLowerCase().includes('isauction') &&
          (message.toLowerCase().includes('does not exist') ||
            message.toLowerCase().includes('unknown column'));

        if (isMissingIsAuctionColumn) {
          // جلب السيارات المميزة بدون فلتر isAuction ثم فلترة المزادات يدوياً
          const allFeaturedCars = await prisma.cars.findMany({
            where: {
              featured: true,
              status: status as Prisma.carsWhereInput['status'],
            },
            take: limit * 2, // جلب المزيد لضمان الحصول على العدد المطلوب بعد الفلترة
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              title: true,
              brand: true,
              model: true,
              year: true,
              price: true,
              mileage: true,
              fuelType: true,
              transmission: true,
              condition: true,
              color: true,
              images: true,
              featured: true,
              createdAt: true,
              users: {
                select: {
                  id: true,
                  name: true,
                  verified: true,
                  profileImage: true,
                  rating: true,
                },
              },
              car_images: {
                select: {
                  fileUrl: true,
                  isPrimary: true,
                },
                take: 3,
                orderBy: [{ isPrimary: 'desc' }],
              },
            },
          });

          // فلترة السيارات التي لا تحتوي على مزادات نشطة
          const carsWithoutAuctions = await Promise.all(
            allFeaturedCars.map(async (car) => {
              const hasActiveAuction = await prisma.auctions.findFirst({
                where: {
                  carId: car.id,
                  status: { in: ['UPCOMING', 'ACTIVE'] }
                }
              });
              return hasActiveAuction ? null : car;
            })
          );

          featuredCars = carsWithoutAuctions.filter(Boolean).slice(0, limit);
        } else {
          throw err;
        }
      }

      return featuredCars;
    });
  },

  // البحث عن المستخدمين
  async searchUsers(whereConditions: Prisma.usersWhereInput, limit: number = 20) {
    return await prisma.users.findMany({
      where: whereConditions,
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        profileImage: true,
        verified: true,
        accountType: true,
        rating: true,
        createdAt: true,
      },
    });
  },

  // الحصول على إعدادات المستخدم
  async getUserSettings(userId: string) {
    const dbSettings = await prisma.user_settings.findUnique({
      where: { userId },
      include: {
        users: {
          select: {
            name: true,
            phone: true,
            profileImage: true,
          },
        },
      },
    });

    // إذا لم توجد إعدادات، جلب بيانات المستخدم الأساسية
    if (!dbSettings) {
      const user = await prisma.users.findUnique({
        where: { id: userId },
        select: {
          name: true,
          phone: true,
          profileImage: true,
        },
      });

      // إرجاع بنية افتراضية
      return {
        profile: {
          name: user?.name || '',
          phone: user?.phone || '',
          city: '',
          bio: '',
          avatar: user?.profileImage || null,
        },
        truckProfile: {},
        notifications: {
          smsNotifications: true,
          pushNotifications: true,
          auctionAlerts: true,
          bidUpdates: true,
          messageAlerts: true,
        },
        privacy: {
          profileVisibility: 'public' as const,
          showPhone: false,
          showLocation: true,
          allowMessages: true,
          showOnlineStatus: true,
        },
        preferences: {
          theme: 'light' as const,
          timezone: 'Africa/Tripoli',
          dateFormat: 'DD/MM/YYYY' as const,
          numberFormat: 'western' as const,
        },
        security: {
          twoFactorEnabled: false,
          loginAlerts: true,
          sessionTimeout: 0,
          trustedDevices: [],
        },
      };
    }

    // تحويل البنية المسطحة إلى البنية المتداخلة
    return {
      profile: {
        name: dbSettings.profileName || dbSettings.users?.name || '',
        phone: dbSettings.users?.phone || '',
        city: dbSettings.profileCity || '',
        bio: dbSettings.profileBio || '',
        avatar: dbSettings.profileAvatar || dbSettings.users?.profileImage || null,
      },
      truckProfile: {
        frontImage: dbSettings.truckFrontImage || undefined,
        backImage: dbSettings.truckBackImage || undefined,
        sideImage: dbSettings.truckSideImage || undefined,
        interiorImage: dbSettings.truckInteriorImage || undefined,
        truckNumber: dbSettings.truckNumber || undefined,
        licenseCode: dbSettings.truckLicenseCode || undefined,
        truckType: dbSettings.truckType || undefined,
        capacity: dbSettings.truckCapacity || undefined,
        serviceArea: dbSettings.truckServiceArea || undefined,
      },
      notifications: {
        smsNotifications: dbSettings.smsNotifications,
        pushNotifications: dbSettings.pushNotifications,
        auctionAlerts: dbSettings.auctionAlerts,
        bidUpdates: dbSettings.bidUpdates,
        messageAlerts: dbSettings.messageAlerts,
      },
      privacy: {
        profileVisibility: dbSettings.profileVisibility as 'public' | 'private' | 'friends',
        showPhone: dbSettings.showPhone,
        showLocation: dbSettings.showLocation,
        allowMessages: dbSettings.allowMessages,
        showOnlineStatus: dbSettings.showOnlineStatus,
      },
      preferences: {
        theme: dbSettings.theme as 'light' | 'dark' | 'auto',
        timezone: dbSettings.timezone,
        dateFormat: dbSettings.dateFormat as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD',
        numberFormat: dbSettings.numberFormat as 'western',
      },
      security: {
        twoFactorEnabled: dbSettings.twoFactorEnabled,
        loginAlerts: dbSettings.loginAlerts,
        sessionTimeout: dbSettings.sessionTimeout,
        trustedDevices: dbSettings.trustedDevices ? dbSettings.trustedDevices.split(',') : [],
      },
    };
  },

  // تحديث إعدادات المستخدم
  async updateUserSettings(
    userId: string,
    settings: {
      profile?: {
        name?: string;
        city?: string;
        bio?: string;
        avatar?: string | null;
      };
      truckProfile?: {
        frontImage?: string;
        backImage?: string;
        sideImage?: string;
        interiorImage?: string;
        truckNumber?: string;
        licenseCode?: string;
        truckType?: string;
        capacity?: number;
        serviceArea?: string;
      };
      notifications?: {
        smsNotifications?: boolean;
        pushNotifications?: boolean;
        auctionAlerts?: boolean;
        bidUpdates?: boolean;
        messageAlerts?: boolean;
      };
      preferences?: {
        theme?: string;
        timezone?: string;
        dateFormat?: string;
        numberFormat?: string;
      };
      security?: {
        twoFactorEnabled?: boolean;
        loginAlerts?: boolean;
        sessionTimeout?: number;
        trustedDevices?: string[];
      };
    },
  ) {
    const flatSettings: any = {};

    if (settings.profile) {
      if (settings.profile.name) flatSettings.profileName = settings.profile.name;
      if (settings.profile.city) flatSettings.profileCity = settings.profile.city;
      if (settings.profile.bio) flatSettings.profileBio = settings.profile.bio;
      if (settings.profile.avatar !== undefined)
        flatSettings.profileAvatar = settings.profile.avatar;
    }

    if (settings.truckProfile) {
      if (settings.truckProfile.frontImage)
        flatSettings.truckFrontImage = settings.truckProfile.frontImage;
      if (settings.truckProfile.backImage)
        flatSettings.truckBackImage = settings.truckProfile.backImage;
      if (settings.truckProfile.sideImage)
        flatSettings.truckSideImage = settings.truckProfile.sideImage;
      if (settings.truckProfile.interiorImage)
        flatSettings.truckInteriorImage = settings.truckProfile.interiorImage;
      if (settings.truckProfile.truckNumber)
        flatSettings.truckNumber = settings.truckProfile.truckNumber;
      if (settings.truckProfile.licenseCode)
        flatSettings.truckLicenseCode = settings.truckProfile.licenseCode;
      if (settings.truckProfile.truckType) flatSettings.truckType = settings.truckProfile.truckType;
      if (settings.truckProfile.capacity)
        flatSettings.truckCapacity = settings.truckProfile.capacity;
      if (settings.truckProfile.serviceArea)
        flatSettings.truckServiceArea = settings.truckProfile.serviceArea;
    }

    if (settings.notifications) {
      if (settings.notifications.smsNotifications !== undefined) {
        flatSettings.smsNotifications = settings.notifications.smsNotifications;
      }
      if (settings.notifications.pushNotifications !== undefined) {
        flatSettings.pushNotifications = settings.notifications.pushNotifications;
      }
      if (settings.notifications.auctionAlerts !== undefined) {
        flatSettings.auctionAlerts = settings.notifications.auctionAlerts;
      }
      if (settings.notifications.bidUpdates !== undefined) {
        flatSettings.bidUpdates = settings.notifications.bidUpdates;
      }
      if (settings.notifications.messageAlerts !== undefined) {
        flatSettings.messageAlerts = settings.notifications.messageAlerts;
      }
    }


    if (settings.preferences) {
      if (settings.preferences.theme) flatSettings.theme = settings.preferences.theme;
      if (settings.preferences.timezone) flatSettings.timezone = settings.preferences.timezone;
      if (settings.preferences.dateFormat)
        flatSettings.dateFormat = settings.preferences.dateFormat;
      if (settings.preferences.numberFormat)
        flatSettings.numberFormat = settings.preferences.numberFormat;
    }

    if (settings.security) {
      if (settings.security.twoFactorEnabled !== undefined) {
        flatSettings.twoFactorEnabled = settings.security.twoFactorEnabled;
      }
      if (settings.security.loginAlerts !== undefined) {
        flatSettings.loginAlerts = settings.security.loginAlerts;
      }
      if (settings.security.sessionTimeout !== undefined) {
        flatSettings.sessionTimeout = settings.security.sessionTimeout;
      }
      if (settings.security.trustedDevices) {
        flatSettings.trustedDevices = settings.security.trustedDevices.join(',');
      }
    }

    return await prisma.user_settings.upsert({
      where: { userId },
      update: flatSettings,
      create: {
        userId,
        ...flatSettings,
      },
    });
  },

  // إنشاء محفظة مستخدم
  async createUserWallet(userId: string) {
    const now = new Date();
    const walletId = generateUniqueId('wallet');

    return await prisma.wallets.create({
      data: {
        id: walletId,
        userId,
        local_wallets: {
          create: {
            id: generateUniqueId('local'),
            balance: 0.0,
            currency: 'LYD',
            updatedAt: now,
          },
        },
        global_wallets: {
          create: {
            id: generateUniqueId('global'),
            balance: 0.0,
            currency: 'USD',
            updatedAt: now,
          },
        },
        crypto_wallets: {
          create: {
            id: generateUniqueId('crypto'),
            balance: 0.0,
            currency: 'USDT-TRC20',
            network: 'TRC20',
            updatedAt: now,
          },
        },
        updatedAt: now,
      },
    });
  },

  // الحصول على محفظة المستخدم
  async getUserWallet(userId: string) {
    return await prisma.wallets.findUnique({
      where: { userId },
    });
  },

  // تحديث رصيد المحفظة المحلية
  async updateLocalWalletBalance(
    userId: string,
    amount: number,
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'BID' | 'REFUND' | 'PAYMENT',
    description: string,
    referenceId?: string,
  ) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // الحصول على المحفظة مع المحفظة المحلية
        const wallet = await tx.wallets.findUnique({
          where: { userId },
          include: { local_wallets: true },
        });

        if (!wallet || !wallet.local_wallets) {
          throw new Error('المحفظة غير موجودة');
        }

        // حساب الرصيد الجديد
        const newBalance =
          type === 'WITHDRAWAL' || type === 'BID' || type === 'PAYMENT'
            ? wallet.local_wallets.balance - amount
            : wallet.local_wallets.balance + amount;

        // التحقق من الرصيد الكافي للسحب
        if (newBalance < 0) {
          throw new Error('رصيد غير كافٍ');
        }

        // تحديث المحفظة المحلية
        const updatedWallet = await tx.local_wallets.update({
          where: { walletId: wallet.id },
          data: { balance: newBalance },
        });

        // إنشاء سجل المعاملة
        const mappedType =
          type === 'DEPOSIT'
            ? 'DEPOSIT'
            : type === 'WITHDRAWAL'
              ? 'WITHDRAWAL'
              : type === 'REFUND'
                ? 'REFUND'
                : 'TRANSFER';

        const transaction = await tx.transactions.create({
          data: {
            walletId: wallet.id,
            amount,
            type: mappedType,
            description,
            reference: referenceId,
            currency: 'LYD',
            walletType: 'LOCAL',
            status: 'COMPLETED',
          } as any,
        });

        return { wallet: updatedWallet, transaction };
      });

      return { success: true, ...result };
    } catch (error: unknown) {
      logger.error('خطأ في تحديث رصيد المحفظة:', {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      });
      return { success: false, error };
    }
  },

  // الحصول على معاملات المستخدم
  async getUserTransactions(userId: string, limit: number = 10) {
    const wallet = await prisma.wallets.findUnique({
      where: { userId },
    });

    if (!wallet) return [];

    return await prisma.transactions.findMany({
      where: { walletId: wallet.id },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  },

  // تحديث تقييم المستخدم
  async updateUserRating(userId: string) {
    const reviews = await prisma.reviews.findMany({
      where: { targetUserId: userId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      await prisma.users.update({
        where: { id: userId },
        data: { rating: 0 },
      });
      return;
    }

    const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await prisma.users.update({
      where: { id: userId },
      data: { rating: Math.round(averageRating * 10) / 10 },
    });
  },

  // الحصول على إحصائيات التقييمات
  async getReviewsStatistics() {
    const totalReviews = await prisma.reviews.count();
    const averageRating = await prisma.reviews.aggregate({
      _avg: { rating: true },
    });

    const ratingDistribution = await prisma.reviews.groupBy({
      by: ['rating'],
      _count: { rating: true },
    });

    return {
      totalReviews,
      averageRating: averageRating._avg.rating || 0,
      ratingDistribution,
    };
  },

  // إعادة حساب تقييمات جميع المستخدمين
  async recalculateAllUserRatings() {
    const users = await prisma.users.findMany({
      select: { id: true },
    });

    for (const user of users) {
      await this.updateUserRating(user.id);
    }

    return { success: true, usersUpdated: users.length };
  },

  // الحصول على مزاد بواسطة ID مع معالجة آمنة للأخطاء
  async getAuctionById(id: string) {
    try {
      logger.info(`[dbHelpers.getAuctionById] البحث عن المزاد: ${id}`);

      if (!id || typeof id !== 'string' || id.trim() === '') {
        logger.warn('[dbHelpers.getAuctionById] معرف المزاد غير صحيح');
        return null;
      }

      const auction = await prisma.auctions.findUnique({
        where: { id: id.trim() },
        include: {
          bids: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true,
                  verified: true,
                  phone: true,
                  email: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { amount: 'desc' },
          },
          cars: {
            include: {
              users: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
                  profileImage: true,
                  verified: true,
                },
              },
              car_images: {
                orderBy: [
                  { isPrimary: 'desc' },
                  { createdAt: 'asc' }
                ],
                select: {
                  id: true,
                  fileName: true,
                  fileUrl: true,
                  isPrimary: true,
                },
              },
            },
          },
        },
      });

      if (!auction) {
        logger.info(`[dbHelpers.getAuctionById] المزاد غير موجود: ${id}`);
        return null;
      }

      logger.info(`[dbHelpers.getAuctionById] تم العثور على المزاد بنجاح: ${auction.id}`);
      return auction;
    } catch (error: unknown) {
      logger.error(`[dbHelpers.getAuctionById] خطأ في جلب المزاد ${id}:`, {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      });
      logger.error('[dbHelpers.getAuctionById] تفاصيل الخطأ:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        auctionId: id
      });

      // في حالة الخطأ، نعيد null بدلاً من إلقاء الخطأ لمنع crash
      return null;
    }
  },

  // إنشاء مزايدة مع معاملة ذرّية ومعالجة آمنة للأخطاء
  async createBidTransactional(data: {
    amount: number;
    auctionId: string;
    bidderId: string;
  }) {
    try {
      logger.info('[dbHelpers.createBidTransactional] بدء إنشاء مزايدة:', data);

      // التحقق من صحة البيانات المُدخلة
      if (!data.auctionId || !data.bidderId || !data.amount || data.amount <= 0) {
        throw new Error('INVALID_BID_DATA');
      }

      return await prisma.$transaction(async (tx) => {
        // التحقق من المزاد مع معالجة آمنة
        const auction = await tx.auctions.findUnique({
          where: { id: data.auctionId },
          include: {
            bids: {
              orderBy: { amount: 'desc' },
              take: 1,
            },
          },
        });

        if (!auction) {
          logger.warn('[createBidTransactional] المزاد غير موجود:', { auctionId: data.auctionId });
          throw new Error('AUCTION_NOT_FOUND');
        }

        if (auction.status !== 'ACTIVE') {
          logger.warn('[createBidTransactional] المزاد غير نشط:', { status: auction.status });
          throw new Error('AUCTION_NOT_ACTIVE');
        }

        if (new Date() > new Date(auction.endDate)) {
          logger.warn('[createBidTransactional] المزاد منتهي:', { endDate: auction.endDate });
          throw new Error('AUCTION_NOT_ACTIVE');
        }

        if (data.bidderId === auction.sellerId) {
          logger.warn('[createBidTransactional] البائع يحاول المزايدة:', { bidderId: data.bidderId });
          throw new Error('BID_FROM_SELLER_NOT_ALLOWED');
        }

        // التحقق من المبلغ الأدنى مع معالجة آمنة
        const currentHighestBid = auction.bids && auction.bids.length > 0
          ? auction.bids[0].amount
          : auction.startPrice || 0;

        // أولوية لاستخدام الإعداد من قاعدة البيانات، ثم الشرائح الافتراضية
        const configuredIncrement = typeof auction.minimumBid === 'number'
          ? auction.minimumBid
          : 0;
        // تثبيت حد أدنى لا يقل عن 500 د.ل ومطابقة منطق طبقة API
        const minimumIncrement = Math.max(configuredIncrement > 0 ? configuredIncrement : 500, 500);

        logger.debug('[createBidTransactional] فحص المبلغ:', {
          currentHighestBid,
          minimumIncrement,
          requiredBid: currentHighestBid + minimumIncrement,
          actualBid: data.amount
        });

        // السماح بالمساواة (>=) لتوافق أزرار +500/+1000/+2000
        if (data.amount < currentHighestBid + minimumIncrement) {
          throw new Error('BID_TOO_LOW');
        }

        // إنشاء المزايدة مع توليد ID فريد
        const bidId = `bid_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const newBid = await tx.bids.create({
          data: {
            id: bidId,
            amount: data.amount,
            auctionId: data.auctionId,
            bidderId: data.bidderId,
          },
          include: {
            users: {
              select: {
                id: true,
                name: true,
                profileImage: true,
                verified: true,
              },
            },
          },
        });

        logger.info('[createBidTransactional] تم إنشاء المزايدة بنجاح:', { bidId: newBid.id });

        // تحديث السعر الحالي للمزاد
        await tx.auctions.update({
          where: { id: data.auctionId },
          data: {
            currentPrice: data.amount,
            totalBids: {
              increment: 1,
            },
          },
        });

        return newBid;
      });
    } catch (error: unknown) {
      logger.error('[createBidTransactional] خطأ في إنشاء المزايدة:', {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      });
      logger.error('[createBidTransactional] تفاصيل الخطأ:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        bidData: data
      });

      // إعادة إلقاء الخطأ مع رسالة واضحة
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('خطأ غير متوقع في إنشاء المزايدة');
      }
    }
  },

  // البحث عن مستخدم أو إنشاؤه
  async findOrCreateUser(userId: string) {
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error(`المستخدم غير موجود: ${userId}`);
    }

    return user;
  },

  // إنشاء سيارة جديدة
  async createCar(data: Prisma.carsUncheckedCreateInput) {
    return await prisma.cars.create({
      data,
      select: {
        id: true,
        title: true,
        brand: true,
        model: true,
        year: true,
        price: true,
        condition: true,
        status: true,
        location: true,
        images: true,
        createdAt: true,
      },
    });
  },

  // الحصول على إعلانات المستخدم (السيارات)
  async getUserListings(userId: string) {
    try {
      const cars = await prisma.cars.findMany({
        where: { sellerId: userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          brand: true,
          model: true,
          year: true,
          price: true,
          images: true,
          status: true,
          condition: true,
          mileage: true,
          location: true,
          featured: true,
          views: true,
          isAuction: true,
          createdAt: true,
          car_images: {
            select: { fileUrl: true, isPrimary: true },
            take: 3,
            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          },
          // جلب المفضلة الحقيقية
          favorites: {
            select: { id: true },
          },
          // جلب المحادثات والرسائل الحقيقية
          conversations: {
            select: {
              id: true,
              messages: {
                select: { id: true },
              },
            },
          },
          auctions: {
            select: {
              id: true,
              status: true,
              startDate: true,
              endDate: true,
              currentPrice: true,
              totalBids: true,
            },
            take: 1,
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      return cars.map((car) => {
        try {
          // معالجة الصور: إعطاء أولوية للصور الجديدة ثم القديمة
          let primaryImage = '/images/cars/default-car.svg';

          // البحث عن الصورة الأساسية من car_images أولاً
          if (car.car_images && car.car_images.length > 0) {
            const primaryImg = car.car_images.find(img => img.isPrimary);
            primaryImage = primaryImg ? primaryImg.fileUrl : car.car_images[0].fileUrl;
          }
          // إذا لم توجد صور جديدة، استخدم الصور القديمة
          else if (car.images && Array.isArray(car.images) && car.images.length > 0) {
            primaryImage = car.images[0];
          }

          // معلومات المزاد إن وجد
          const auction = car.auctions && car.auctions.length > 0 ? car.auctions[0] : null;

          // ✅ تحديد نوع الإعلان: فقط إذا كان isAuction=true ويوجد مزاد فعلي
          const listingType = (car.isAuction && auction) ? 'auction' : 'marketplace';

          // تشخيص: طباعة معلومات التصنيف
          if (car.isAuction && !auction) {
            console.log(`[تشخيص] سيارة معلمة كمزاد لكن لا يوجد مزاد فعلي - تصنيفها كـ marketplace:`, {
              carId: car.id,
              title: car.title,
              isAuction: car.isAuction,
              hasAuction: !!auction,
              finalType: listingType
            });
          }

          // حساب حالة المزاد
          let auctionType = undefined;
          let bidCount = 0;

          if (auction) {
            bidCount = auction.totalBids || 0;

            const now = new Date();
            const startDate = new Date(auction.startDate);
            const endDate = new Date(auction.endDate);

            if (auction.status === 'ENDED' || now > endDate) {
              auctionType = 'ended';
            } else if (auction.status === 'ACTIVE' && now >= startDate && now <= endDate) {
              auctionType = 'active';
            } else if (auction.status === 'UPCOMING' || now < startDate) {
              auctionType = 'upcoming';
            }
          }

          // تحديد الحالة النهائية للعرض
          let displayStatus = car.status || 'active';
          if (listingType === 'auction' && auctionType) {
            // تعيين حالة المزاد كحالة عرض
            if (auctionType === 'active') displayStatus = 'live';
            else if (auctionType === 'ended') displayStatus = 'ended';
            else if (auctionType === 'upcoming') displayStatus = 'upcoming';
          }

          // حساب المفضلة والرسائل الحقيقية
          const favoritesCount = (car as any).favorites?.length || 0;
          const messagesCount = (car as any).conversations?.reduce((total: number, conv: any) => {
            return total + (conv.messages?.length || 0);
          }, 0) || 0;

          return {
            id: car.id,
            title: car.title || 'إعلان بدون عنوان',
            type: listingType,
            status: displayStatus,
            location: typeof car.location === 'string' ? car.location : 'غير محدد',
            image: primaryImage,
            price: car.price ? `${car.price.toLocaleString()} د.ل` : 'غير محدد',
            views: car.views || 0,
            favorites: favoritesCount,
            messages: messagesCount,
            date: car.createdAt ? new Date(car.createdAt).toLocaleDateString('ar-SA') : 'غير محدد',
            createdAt: car.createdAt ? car.createdAt.toISOString() : new Date().toISOString(),
            bidCount,
            auctionType,
            // حقول الترويج
            isPromoted: car.featured || false,
          };
        } catch (itemError) {
          logger.error('خطأ في معالجة إعلان واحد:', {
            error: itemError instanceof Error
              ? { message: itemError.message, stack: itemError.stack }
              : itemError,
          });
          // إرجاع بيانات احتياطية
          const hasAuction = car.auctions && car.auctions.length > 0;
          const fallbackFavorites = (car as any).favorites?.length || 0;
          const fallbackMessages = (car as any).conversations?.reduce((total: number, conv: any) => {
            return total + (conv.messages?.length || 0);
          }, 0) || 0;

          return {
            id: car.id,
            title: car.title || 'إعلان',
            type: (car.isAuction && hasAuction) ? 'auction' : 'marketplace',
            status: car.status || 'active',
            location: 'غير محدد',
            image: '/images/cars/default-car.svg',
            price: 'غير محدد',
            views: 0,
            favorites: fallbackFavorites,
            messages: fallbackMessages,
            date: 'غير محدد',
            createdAt: new Date().toISOString(),
            isPromoted: car.featured || false,
          };
        }
      });
    } catch (error: unknown) {
      logger.error('خطأ حرج في getUserListings:', {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      });
      return [];
    }
  },

  // الحصول على تقييمات المستخدم
  async getUserReviews(
    userId: string,
    options: {
      type?: 'received' | 'given';
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { type = 'received', limit = 10, offset = 0 } = options;

    const where = type === 'received' ? { targetUserId: userId } : { reviewerId: userId };

    return await prisma.reviews.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        users_reviews_reviewerIdTousers: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            verified: true,
          },
        },
        users_reviews_targetUserIdTousers: {
          select: {
            id: true,
            name: true,
            profileImage: true,
          },
        },
      },
    });
  },

  // الحصول على تقييمات سيارة
  async getCarReviews(carId: string, options: { limit?: number; offset?: number; } = {}) {
    const { limit = 10, offset = 0 } = options;

    return await prisma.reviews.findMany({
      where: { carId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        users_reviews_reviewerIdTousers: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            verified: true,
          },
        },
      },
    });
  },

  // الحصول على تقييمات عنصر عام
  async getItemReviews(
    itemId: string,
    itemType: string,
    options: { limit?: number; offset?: number; } = {},
  ) {
    const { limit = 10, offset = 0 } = options;
    const where: Record<string, string> = {};

    // تحديد الحقل المناسب حسب النوع
    if (itemType === 'car') {
      where.carId = itemId;
    } else if (itemType === 'auction') {
      where.auctionId = itemId;
    }

    return await prisma.reviews.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        users_reviews_reviewerIdTousers: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            verified: true,
          },
        },
      },
    });
  },

  // إنشاء تقييم (الدالة الأولى - محسنة)
  async createLegacyReview(data: {
    rating: number;
    comment: string;
    reviewerId: string;
    targetUserId?: string;
    itemId: string;
    itemType: string;
    carId?: string;
    auctionId?: string;
    serviceType?: string;
  }) {
    // التحقق من عدم وجود تقييم سابق
    const existingReview = await prisma.reviews.findFirst({
      where: {
        reviewerId: data.reviewerId,
        ...(data.carId ? { carId: data.carId } : {}),
        ...(data.auctionId ? { auctionId: data.auctionId } : {}),
        ...(data.targetUserId ? { targetUserId: data.targetUserId } : {}),
      },
    });

    if (existingReview) {
      throw new Error('لقد قمت بتقييم هذا العنصر مسبقاً');
    }

    return await prisma.reviews.create({
      data: {
        rating: data.rating,
        comment: data.comment,
        reviewerId: data.reviewerId,
        targetUserId: data.targetUserId || null,
        carId: data.carId,
        auctionId: data.auctionId,
        serviceType: data.serviceType,
        isVerified: false,
      } as any,
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            verified: true,
          },
        },
      } as any,
    });
  },

  // جلب التقييمات
  async getReviews(options: {
    userId?: string;
    itemId?: string;
    itemType?: string;
    limit?: number;
  }) {
    try {
      const { userId, itemId, itemType, limit = 10 } = options;

      logger.debug('📥 [dbHelpers.getReviews] جلب التقييمات:', { userId, itemId, itemType, limit });

      const whereCondition: any = {
        parentId: null,
      };

      // إضافة شرط المستخدم إذا وُجد
      if (userId) {
        whereCondition.targetUserId = userId;
      }

      // إضافة شرط العنصر إذا وُجد
      if (itemId && itemType) {
        const itemField = itemType === 'car' ? 'carId' :
          itemType === 'auction' ? 'auctionId' :
            null;

        if (itemField) {
          whereCondition[itemField] = itemId;
        }
      }

      const reviews = (await prisma.reviews.findMany({
        where: whereCondition,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          users_reviews_reviewerIdTousers: {
            select: {
              id: true,
              name: true,
              profileImage: true,
              verified: true,
            },
          },
          users_reviews_targetUserIdTousers: {
            select: {
              id: true,
              name: true,
              profileImage: true,
            },
          },
          other_reviews: {
            orderBy: { createdAt: 'asc' },
            include: {
              users_reviews_reviewerIdTousers: {
                select: {
                  id: true,
                  name: true,
                  profileImage: true,
                  verified: true,
                },
              },
            },
          },
        },
      } as any)) as any[];

      logger.info(`✅ [dbHelpers.getReviews] تم جلب ${reviews.length} تقييم`);

      // تحويل التقييمات للشكل المطلوب
      return reviews.map(review => ({
        id: review.id,
        rating: review.rating,
        comment: review.comment || '',
        createdAt: review.createdAt.toISOString(),
        isHelpful: 0,
        isNotHelpful: 0,
        reviewer: review.users_reviews_reviewerIdTousers ? {
          name: review.users_reviews_reviewerIdTousers.name || 'مستخدم',
          profileImage: review.users_reviews_reviewerIdTousers.profileImage || '/images/avatars/default.svg',
          verified: review.users_reviews_reviewerIdTousers.verified || false,
        } : undefined,
        replies: (review.other_reviews || []).map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment || '',
          createdAt: r.createdAt.toISOString(),
          isHelpful: 0,
          isNotHelpful: 0,
          reviewer: r.users_reviews_reviewerIdTousers ? {
            name: r.users_reviews_reviewerIdTousers.name || 'مستخدم',
            profileImage: r.users_reviews_reviewerIdTousers.profileImage || '/images/avatars/default.svg',
            verified: r.users_reviews_reviewerIdTousers.verified || false,
          } : undefined,
        })),
      }));
    } catch (error: unknown) {
      logger.error('🚨 [dbHelpers.getReviews] خطأ في جلب التقييمات:', {
        error: error instanceof Error
          ? { message: error.message, stack: error.stack }
          : error,
      });
      logger.error('🚨 [dbHelpers.getReviews] التفاصيل:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        options
      });
      // إرجاع مصفوفة فارغة بدلاً من إطلاق الخطأ
      return [];
    }
  },

  // إنشاء تقييم جديد
  async createReview(options: {
    rating: number;
    comment: string;
    reviewerId: string;
    targetUserId?: string | null;
    itemId: string;
    itemType: string;
    parentId?: string;
  }) {
    const { rating, comment, reviewerId, targetUserId, itemId, itemType, parentId } = options;

    logger.info('💾 [dbHelpers.createReview] إنشاء تقييم جديد:', { reviewerId, itemId, itemType });

    // تحديد الحقل المناسب حسب نوع العنصر
    const itemField = itemType === 'car' ? 'carId' :
      itemType === 'auction' ? 'auctionId' :
        null;

    if (!parentId) {
      const whereCondition: any = {
        reviewerId,
        parentId: null,
      };

      // إضافة شرط العنصر
      if (itemField) {
        whereCondition[itemField] = itemId;
      }

      logger.debug('🔍 [dbHelpers.createReview] شرط البحث:', whereCondition);

      const existingReview = await prisma.reviews.findFirst({
        where: whereCondition,
      });

      if (existingReview) {
        logger.warn('⚠️ [dbHelpers.createReview] تقييم مكرر موجود:', { reviewId: existingReview.id });
        throw new Error('لقد قمت بتقييم هذا العنصر مسبقاً');
      }
    }

    const createData: any = {
      rating,
      comment,
      reviewer: { connect: { id: reviewerId } },
      targetUserId: targetUserId || null,
      serviceType: itemType,
      isVerified: false,
    };

    if (itemField) {
      createData[itemField] = itemId;
    }

    if (parentId) {
      createData.parentId = parentId;
    }

    logger.debug('📝 [dbHelpers.createReview] بيانات الإنشاء:', createData);

    const newReview: any = await prisma.reviews.create({
      data: createData,
      include: {
        reviewer: {
          select: {
            id: true,
            name: true,
            profileImage: true,
            verified: true,
          },
        },
      },
    } as any);

    logger.info('✅ [dbHelpers.createReview] تم الإنشاء بنجاح:', { reviewId: newReview.id });

    return {
      id: newReview.id,
      rating: newReview.rating,
      comment: newReview.comment,
      reviewerId: newReview.reviewerId,
      targetUserId: newReview.targetUserId,
      itemId,
      itemType,
      createdAt: newReview.createdAt.toISOString()
    };
  },

  // ============================
  // Messaging/Conversations APIs
  // ============================
  async getUserById(userId: string) {
    return await prisma.users.findUnique({ where: { id: String(userId) } });
  },

  async getOrCreateDirectConversation(userId1: string, userId2: string) {
    const u1 = String(userId1);
    const u2 = String(userId2);

    // استخدام transaction للحماية من race conditions
    return await prisma.$transaction(async (tx) => {
      // Try to find an existing DIRECT conversation between both users
      const existing = await tx.conversations.findFirst({
        where: {
          type: 'DIRECT',
          AND: [
            { conversation_participants: { some: { userId: u1 } } },
            { conversation_participants: { some: { userId: u2 } } },
          ],
        },
        include: {
          conversation_participants: {
            include: {
              users: { select: { id: true, name: true, profileImage: true, verified: true, phone: true } },
            },
          },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          cars: { select: { id: true, title: true } },
          auctions: { select: { id: true, title: true } },
        },
      });

      if (existing) return existing;

      const genId = (p: string) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

      // إنشاء المحادثة بشكل آمن داخل transaction
      const conversation = await tx.conversations.create({
        data: {
          id: genId('conv'),
          type: 'DIRECT',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastMessageAt: new Date(),
          conversation_participants: {
            create: [
              { id: genId('cp'), userId: u1, joinedAt: new Date(), role: 'MEMBER' },
              { id: genId('cp'), userId: u2, joinedAt: new Date(), role: 'MEMBER' },
            ],
          },
        },
        include: {
          conversation_participants: {
            include: {
              users: { select: { id: true, name: true, profileImage: true, verified: true, phone: true } },
            },
          },
        },
      });

      return conversation;
    }, {
      maxWait: 5000, // 5 seconds
      timeout: 10000, // 10 seconds
      isolationLevel: 'Serializable', // أعلى مستوى حماية
    });
  },

  async getUserConversations(userId: string) {
    const uid = String(userId);

    // جلب المحادثات مع الرسائل غير المقروءة في استعلام واحد محسّن
    const conversationsList = await prisma.conversations.findMany({
      where: { conversation_participants: { some: { userId: uid } } },
      orderBy: { lastMessageAt: 'desc' },
      include: {
        conversation_participants: {
          include: {
            users: { select: { id: true, name: true, profileImage: true, verified: true, phone: true } },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        _count: {
          select: {
            messages: {
              where: {
                senderId: { not: uid },
                message_reads: { none: { userId: uid } },
              },
            },
          },
        },
        cars: { select: { id: true, title: true } },
        auctions: { select: { id: true, title: true } },
      },
    });

    // تحويل _count إلى unread (بدون loop إضافي)
    type ConversationWithCount = typeof conversationsList[number];
    return conversationsList.map((c: ConversationWithCount) => ({
      ...c,
      unread: c._count?.messages || 0,
      _count: undefined, // إزالة _count من الرد
    }));
  },

  async getConversationById(conversationId: string, userId: string) {
    const c = await prisma.conversations.findUnique({
      where: { id: String(conversationId) },
      include: {
        conversation_participants: {
          include: {
            users: { select: { id: true, name: true, profileImage: true, verified: true, phone: true } },
          },
        },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        cars: { select: { id: true, title: true } },
        auctions: { select: { id: true, title: true } },
      },
    });

    if (!c) return null;
    const isParticipant = c.conversation_participants.some((p) => p.userId === String(userId));
    if (!isParticipant) return null;
    return c;
  },

  async createMessage(data: {
    senderId: string;
    conversationId: string;
    content: string;
    type?: 'TEXT' | 'IMAGE' | 'FILE' | 'LOCATION' | 'VOICE' | 'BID';
    status?: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
    metadata?: string | null;
  }) {
    const { senderId, conversationId, content } = data;

    // 🔍 تشخيص: طباعة البيانات الواردة
    logger.debug('[DB createMessage] 📥 بيانات الرسالة:', {
      senderId,
      conversationId,
      contentLength: content?.length || 0,
      type: data.type,
      status: data.status,
    });

    if (!senderId || !conversationId || !content?.trim()) {
      logger.error('[DB createMessage] ❌ بيانات غير صحيحة:', { senderId: !!senderId, conversationId: !!conversationId, content: !!content?.trim() });
      throw new Error('INVALID_MESSAGE_DATA');
    }

    logger.debug('[DB createMessage] 🔍 التحقق من وجود المحادثة:', { conversationId });
    const conv = await prisma.conversations.findUnique({
      where: { id: String(conversationId) },
      include: { conversation_participants: true },
    });

    if (!conv) {
      logger.error('[DB createMessage] ❌ المحادثة غير موجودة:', { conversationId });
      throw new Error('CONVERSATION_NOT_FOUND');
    }

    logger.debug('[DB createMessage] ✅ المحادثة موجودة, المشاركون:', {
      participantsCount: conv.conversation_participants.length,
    });

    const isParticipant = conv.conversation_participants.some((p) => p.userId === String(senderId));
    if (!isParticipant) {
      logger.error('[DB createMessage] ❌ المرسل ليس مشاركاً:', { senderId, participants: conv.conversation_participants.map(p => p.userId) });
      throw new Error('NOT_A_PARTICIPANT');
    }

    logger.debug('[DB createMessage] ✅ المرسل مشارك في المحادثة');

    logger.info('[DB createMessage] 💾 حفظ الرسالة في قاعدة البيانات...');

    // توليد معرف فريد للرسالة
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const message = await prisma.messages.create({
      data: {
        id: messageId,
        senderId: String(senderId),
        conversationId: String(conversationId),
        content: content.trim(),
        type: (data.type || 'TEXT') as 'TEXT',
        status: (data.status || 'SENT') as 'SENT',
        metadata: data.metadata || null,
      },
    });
    logger.info('[DB createMessage] ✅ تم حفظ الرسالة:', { messageId: message.id });

    // Update conversation timestamps
    logger.debug('[DB createMessage] 🔄 تحديث توقيت المحادثة...');
    await prisma.conversations.update({
      where: { id: String(conversationId) },
      data: { lastMessageAt: new Date(), updatedAt: new Date() },
    });
    logger.debug('[DB createMessage] ✅ تم تحديث توقيت المحادثة');

    // Mark as read for sender (self-read)
    logger.debug('[DB createMessage] 📖 تسجيل الرسالة كمقروءة للمرسل...');
    try {
      await prisma.message_reads.upsert({
        where: {
          messageId_userId: {
            messageId: message.id,
            userId: String(senderId),
          },
        },
        update: {
          readAt: new Date(),
        },
        create: {
          id: `mr_${message.id}_${String(senderId)}`,
          messageId: message.id,
          userId: String(senderId),
          readAt: new Date(),
        },
      });
      logger.debug('[DB createMessage] ✅ تم تسجيل القراءة');
    } catch (readError) {
      // تجاهل أخطاء القراءة - ليست حرجة
      logger.warn('[DB createMessage] ⚠️ تحذير: فشل تسجيل قراءة الرسالة:', {
        error: readError instanceof Error ? readError.message : String(readError),
      });
    }

    logger.info('[DB createMessage] 🎉 اكتمل حفظ الرسالة بنجاح');
    return message;
  },

  async getConversationMessages(conversationId: string, limit: number = 50) {
    logger.debug('[DB getConversationMessages] 🔍 جلب رسائل المحادثة:', { conversationId });

    const messages = await prisma.messages.findMany({
      where: { conversationId: String(conversationId) },
      // إرجاع أحدث الرسائل أولاً حتى نجلب آخر N رسالة
      orderBy: { createdAt: 'desc' },
      take: validateQueryLimit(limit),
    });

    logger.info('[DB getConversationMessages] ✅ تم جلب رسائل من قاعدة البيانات', { count: messages.length });
    if (messages.length > 0) {
      logger.debug('[DB getConversationMessages] 📋 عينة من الرسائل:', {
        sample: messages.slice(0, 2).map((m) => ({
          id: m.id,
          content: m.content.substring(0, 30),
          type: m.type,
          createdAt: m.createdAt,
        })),
      });
    }

    return messages;
  },

  async markMessagesAsRead(conversationId: string, userId: string) {
    const uid = String(userId);
    const now = new Date();

    try {
      // استخدام createMany لإدراج جميع القراءات دفعة واحدة
      const msgs = await prisma.messages.findMany({
        where: {
          conversationId: String(conversationId),
          senderId: { not: uid },
          message_reads: { none: { userId: uid } },
        },
        select: { id: true },
        take: 500,
      });

      if (msgs.length === 0) return 0;

      // Bulk insert بدلاً من loop
      const result = await prisma.message_reads.createMany({
        data: msgs.map((m) => ({
          id: `mr_${m.id}_${uid}`,
          messageId: m.id,
          userId: uid,
          readAt: now,
        })),
        skipDuplicates: true, // تجنب أخطاء التكرار
      });

      return result.count;
    } catch (error) {
      logger.warn('[Message Read] تحذير: فشل تسجيل قراءة الرسائل:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  },

  async getMessagesBetweenUsers(userId: string, otherUserId: string, limit: number = 50) {
    const conv = await prisma.conversations.findFirst({
      where: {
        type: 'DIRECT',
        AND: [
          { conversation_participants: { some: { userId: String(userId) } } },
          { conversation_participants: { some: { userId: String(otherUserId) } } },
        ],
      },
    });
    if (!conv) return [];
    return await this.getConversationMessages(conv.id, limit);
  },

  async getUserMessages(userId: string, limit: number = 50) {
    // Latest messages across all conversations the user is in
    return await prisma.messages.findMany({
      where: {
        conversations: { conversation_participants: { some: { userId: String(userId) } } },
      },
      orderBy: { createdAt: 'desc' },
      take: validateQueryLimit(limit),
    });
  },

  async searchMessages(userId: string, query: string, limit: number = 50) {
    return await prisma.messages.findMany({
      where: {
        content: { contains: query, mode: 'insensitive' },
        conversations: { conversation_participants: { some: { userId: String(userId) } } },
      },
      orderBy: { createdAt: 'desc' },
      take: validateQueryLimit(limit),
    });
  },

  async updateParticipantLastRead(conversationId: string, userId: string, date: Date) {
    return await prisma.conversation_participants.update({
      where: { conversationId_userId: { conversationId: String(conversationId), userId: String(userId) } as any },
      data: { lastReadAt: date },
    });
  },

  async updateConversationTitle(conversationId: string, title: string) {
    return await prisma.conversations.update({
      where: { id: String(conversationId) },
      data: { title, updatedAt: new Date() },
    });
  },

  async isUserInConversation(conversationId: string, userId: string) {
    const rel = await prisma.conversation_participants.findUnique({
      where: { conversationId_userId: { conversationId: String(conversationId), userId: String(userId) } as any },
    });
    return !!rel;
  },

  async deleteConversation(conversationId: string) {
    await prisma.conversations.delete({ where: { id: String(conversationId) } });
    return true;
  },

  async deleteMessage(messageId: string, userId: string) {
    const msg = await prisma.messages.findUnique({ where: { id: String(messageId) } });
    if (!msg) return false;
    if (String(msg.senderId) !== String(userId)) return false;
    await prisma.messages.delete({ where: { id: msg.id } });
    return true;
  },

  async markMessageDelivered(messageId: string, deliveredToUserId: string) {
    const msg = await prisma.messages.findUnique({
      where: { id: String(messageId) },
      select: { id: true, senderId: true, status: true },
    });
    if (!msg) return false;
    // Ignore if the sender reports delivery or already has a terminal state
    if (String(msg.senderId) === String(deliveredToUserId)) return false;
    if (String(msg.status) === 'READ' || String(msg.status) === 'DELIVERED') return true;

    await prisma.messages.update({
      where: { id: msg.id },
      data: { status: 'DELIVERED' },
    });
    return true;
  },
};
