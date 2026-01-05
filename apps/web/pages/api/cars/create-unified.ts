/**
 * API موحد ومحدث لإنشاء السيارات والإعلانات
 * يدعم النظام الموحد للصور والبيانات
 * متوافق مع vehicleService و auctionService
 */

import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import apiResponse from '../../../lib/api/response';
import { invalidateCache } from '../../../lib/core/cache/UnifiedCache';
import { logger } from '../../../lib/core/logging/UnifiedLogger';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  logger.startPerformanceTracking('create-car-api');

  try {
    logger.info('API إنشاء السيارة الموحد - طلب جديد', {
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.headers['x-forwarded-for'] || 'unknown',
    });

    // التحقق من الطريقة
    if (req.method !== 'POST') {
      return apiResponse.methodNotAllowed(res, ['POST']);
    }

    return await createCarListing(req, res);

  } catch (error) {
    logger.error('خطأ عام في API إنشاء السيارة:', error);
    return apiResponse.serverError(
      res,
      'خطأ في الخادم',
      error instanceof Error ? error.message : 'خطأ غير محدد',
      { route: 'api/cars/create-unified' },
      'SERVER_ERROR'
    );
  } finally {
    logger.endPerformanceTracking('create-car-api', 'API إنشاء السيارة مكتمل');
  }
}

async function createCarListing(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { carData, images, userId, listingType = 'marketplace' } = req.body;

    logger.info('بيانات الطلب المستلمة', {
      hasCarData: !!carData,
      hasImages: !!images,
      imagesCount: Array.isArray(images) ? images.length : 0,
      hasUserId: !!userId,
      listingType
    });

    // التحقق من البيانات الأساسية
    if (!carData) {
      return apiResponse.badRequest(res, 'بيانات السيارة مطلوبة', null, { route: 'create-car' }, 'MISSING_CAR_DATA');
    }

    if (!userId) {
      return apiResponse.badRequest(res, 'معرف المستخدم مطلوب', null, { route: 'create-car' }, 'MISSING_USER_ID');
    }

    // التحقق من الحقول المطلوبة
    const requiredFields = ['brand', 'model', 'year', 'price', 'location'];
    const missingFields = requiredFields.filter(field => {
      const value = carData[field];
      return !value || (typeof value === 'string' && value.trim() === '');
    });

    if (missingFields.length > 0) {
      return apiResponse.badRequest(
        res,
        `بيانات مطلوبة مفقودة: ${missingFields.join(', ')}`,
        { missingFields },
        { route: 'create-car' },
        'MISSING_REQUIRED_FIELDS'
      );
    }

    // التحقق من وجود المستخدم أو إنشاؤه
    const user = await findOrCreateUser(userId, carData.contactPhone);
    if (!user) {
      return apiResponse.badRequest(res, 'فشل في العثور على المستخدم أو إنشاؤه', null, { route: 'create-car' }, 'USER_ERROR');
    }

    // التحقق من صحة البيانات
    const validation = validateCarData(carData);
    if (!validation.isValid) {
      return apiResponse.badRequest(res, validation.error!, validation.details, { route: 'create-car' }, 'VALIDATION_ERROR');
    }

    // إعداد بيانات السيارة
    const carCreateData = prepareCarData(carData, user.id);

    logger.info('بيانات السيارة المعدة للإنشاء', {
      title: carCreateData.title,
      brand: carCreateData.brand,
      model: carCreateData.model,
      year: carCreateData.year,
      price: carCreateData.price,
      sellerId: carCreateData.sellerId
    });

    // إنشاء السيارة في قاعدة البيانات
    const newCar = await prisma.cars.create({
      data: carCreateData,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            phone: true,
            verified: true
          }
        }
      }
    });

    logger.info('تم إنشاء السيارة بنجاح', { carId: newCar.id, title: newCar.title });

    // معالجة الصور إذا كانت موجودة
    let createdImages: Array<{
      id: string;
      fileUrl: string;
      isPrimary: boolean;
      fileName: string;
    }> = [];
    if (images && Array.isArray(images) && images.length > 0) {
      createdImages = await processCarImages(newCar.id, images, user.id);
      logger.info(`تم إنشاء ${createdImages.length} صورة للسيارة ${newCar.id}`);
    }

    // إنشاء مزاد إذا كان مطلوباً
    let newAuction = null;
    if (listingType === 'auction') {
      newAuction = await createAuction(newCar, carData, user.id);
      if (newAuction) {
        logger.info('تم إنشاء المزاد بنجاح', { auctionId: newAuction.id });
      }
    }

    // تنظيف الكاش
    await cleanupCache();

    // إعداد البيانات للإرجاع
    const responseData = {
      car: {
        ...newCar,
        images: createdImages.map(img => ({
          id: img.id,
          fileUrl: img.fileUrl,
          isPrimary: img.isPrimary,
          fileName: img.fileName
        }))
      },
      auction: newAuction,
      listingType,
      success: true
    };

    return apiResponse.created(
      res,
      responseData,
      {
        route: 'api/cars/create-unified',
        message: newAuction ? 'تم إنشاء المزاد بنجاح' : 'تم إنشاء إعلان السيارة بنجاح'
      },
      'CAR_CREATED'
    );

  } catch (error) {
    logger.error('خطأ في إنشاء السيارة:', error);

    // معالجة أخطاء Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return apiResponse.conflict(res, 'يوجد إعلان مشابه بالفعل', error.meta, { route: 'create-car' }, 'DUPLICATE_ENTRY');
        case 'P2003':
          return apiResponse.badRequest(res, 'خطأ في ربط البيانات', error.meta, { route: 'create-car' }, 'FOREIGN_KEY_ERROR');
        case 'P2025':
          return apiResponse.notFound(res, 'البيانات المطلوبة غير موجودة', error.meta, { route: 'create-car' }, 'RECORD_NOT_FOUND');
        default:
          return apiResponse.serverError(res, 'خطأ في قاعدة البيانات', error.message, { route: 'create-car', code: error.code }, 'DATABASE_ERROR');
      }
    }

    return apiResponse.serverError(
      res,
      'خطأ في إنشاء السيارة',
      error instanceof Error ? error.message : 'خطأ غير محدد',
      { route: 'create-car' },
      'CAR_CREATION_ERROR'
    );
  }
}

/**
 * البحث عن المستخدم أو إنشاؤه
 */
async function findOrCreateUser(userId: string, contactPhone?: string): Promise<{
  id: string;
  name: string;
  phone: string;
  verified: boolean;
} | null> {
  try {
    // البحث أولاً بالمعرف
    let user = await prisma.users.findUnique({ where: { id: userId } });

    if (user) {
      return user;
    }

    // البحث برقم الهاتف
    if (contactPhone) {
      const cleanPhone = cleanPhoneNumber(contactPhone);
      user = await prisma.users.findFirst({ where: { phone: cleanPhone } });

      if (user) {
        return user;
      }
    }

    // إنشاء مستخدم جديد
    const cleanPhone = contactPhone ? cleanPhoneNumber(contactPhone) : `phone_${Date.now()}`;

    user = await prisma.users.create({
      data: {
        id: userId,
        name: 'مستخدم جديد',
        phone: cleanPhone,
        role: 'USER',
        accountType: 'REGULAR_USER',
        verified: false,
        status: 'ACTIVE'
      }
    });

    logger.info('تم إنشاء مستخدم جديد', { userId: user.id, phone: user.phone });
    return user;

  } catch (error) {
    logger.error('خطأ في العثور على/إنشاء المستخدم:', error);

    // في حالة تضارب البيانات، حاول البحث مرة أخرى
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      if (contactPhone) {
        const cleanPhone = cleanPhoneNumber(contactPhone);
        const existingUser = await prisma.users.findFirst({ where: { phone: cleanPhone } });
        if (existingUser) {
          return existingUser;
        }
      }
    }

    return null;
  }
}

/**
 * تنظيف رقم الهاتف
 */
function cleanPhoneNumber(phone: string): string {
  const cleanedPhone = phone.toString().trim();

  // إضافة رمز البلد الليبي إذا كان مفقوداً
  if (!cleanedPhone.startsWith('+218') && cleanedPhone.length === 9) {
    return '+218' + cleanedPhone;
  }

  return cleanedPhone;
}

/**
 * التحقق من صحة بيانات السيارة
 */
function validateCarData(carData: Record<string, unknown>): { isValid: boolean; error?: string; details?: Record<string, unknown>; } {
  const currentYear = new Date().getFullYear();

  // التحقق من السنة
  const year = parseInt(carData.year);
  if (isNaN(year) || year < 1990 || year > currentYear + 1) {
    return {
      isValid: false,
      error: `سنة الصنع غير صحيحة. يجب أن تكون بين 1990 و ${currentYear + 1}`,
      details: { field: 'year', value: carData.year }
    };
  }

  // التحقق من السعر
  const price = parseFloat(carData.price);
  if (isNaN(price) || price <= 0) {
    return {
      isValid: false,
      error: 'السعر غير صحيح. يجب أن يكون رقماً موجباً',
      details: { field: 'price', value: carData.price }
    };
  }

  // التحقق من المسافة المقطوعة
  if (carData.mileage) {
    const mileage = parseInt(carData.mileage);
    if (isNaN(mileage) || mileage < 0) {
      return {
        isValid: false,
        error: 'المسافة المقطوعة غير صحيحة',
        details: { field: 'mileage', value: carData.mileage }
      };
    }
  }

  return { isValid: true };
}

/**
 * إعداد بيانات السيارة للإنشاء
 */
function prepareCarData(carData: Record<string, unknown>, sellerId: string): Prisma.CarUncheckedCreateInput {
  const title = carData.title?.trim() || `${carData.brand} ${carData.model} ${carData.year}`;

  return {
    title,
    brand: carData.brand?.trim() || '',
    model: carData.model?.trim() || '',
    year: parseInt(carData.year),
    price: parseFloat(carData.price),
    condition: convertCondition(carData.condition),
    mileage: carData.mileage ? parseInt(carData.mileage) : null,
    location: carData.location?.trim() || '',
    description: carData.description?.trim() || '',

    // الحقول الاختيارية
    fuelType: carData.fuelType?.trim() || null,
    transmission: carData.transmission?.trim() || null,
    bodyType: carData.bodyType?.trim() || null,
    color: carData.color?.trim() || null,
    interiorColor: carData.interiorColor?.trim() || null,
    seatCount: carData.seatCount ? String(carData.seatCount) : null,
    regionalSpecs: carData.regionalSpecs?.trim() || null,
    vehicleType: carData.vehicleType?.trim() || null,
    manufacturingCountry: carData.manufacturingCountry?.trim() || null,
    chassisNumber: carData.chassisNumber?.trim() || null,
    engineNumber: carData.engineNumber?.trim() || null,
    customsStatus: carData.customsStatus?.trim() || null,
    licenseStatus: carData.licenseStatus?.trim() || null,
    insuranceStatus: carData.insuranceStatus?.trim() || null,
    paymentMethod: carData.paymentMethod?.trim() || null,
    contactPhone: carData.contactPhone?.trim() || null,

    // حقول النظام
    sellerId,
    status: 'AVAILABLE',
    isAuction: carData.listingType === 'auction',
    featured: false,
    views: 0,

    // معالجة المزايا
    features: carData.features ? (
      Array.isArray(carData.features)
        ? JSON.stringify(carData.features)
        : carData.features
    ) : JSON.stringify([]),

    // حقل الصور القديم (للتوافق)
    images: 'placeholder.jpg',

    // الحقول الزمنية المطلوبة
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * تحويل حالة السيارة
 */
function convertCondition(condition: string): 'NEW' | 'USED' | 'NEEDS_REPAIR' {
  switch (condition?.toLowerCase()) {
    case 'new':
    case 'جديد':
    case 'جديدة':
      return 'NEW';
    case 'needs_repair':
    case 'بحاجة لإصلاح':
    case 'يحتاج إصلاح':
      return 'NEEDS_REPAIR';
    default:
      return 'USED';
  }
}

/**
 * معالجة صور السيارة
 */
async function processCarImages(carId: string, images: string[], userId: string): Promise<Array<{
  id: string;
  fileUrl: string;
  isPrimary: boolean;
  fileName: string;
}>> {
  const createdImages: Array<{
    id: string;
    fileUrl: string;
    isPrimary: boolean;
    fileName: string;
  }> = [];

  try {
    for (let i = 0; i < images.length; i++) {
      const imageUrl = images[i];
      if (!imageUrl || imageUrl.trim() === '') continue;

      const carImage = await prisma.car_images.create({
        data: {
          carId,
          fileName: `car_${carId}_${i + 1}.jpg`,
          fileUrl: imageUrl,
          fileSize: 0,
          isPrimary: i === 0, // الصورة الأولى أساسية
          uploadedBy: userId,
          category: 'listings'
        }
      });

      createdImages.push(carImage);
    }

    logger.info(`تم إنشاء ${createdImages.length} صورة للسيارة ${carId}`);
  } catch (error) {
    logger.error('خطأ في معالجة صور السيارة:', error);
    // لا نوقف العملية، فقط نسجل الخطأ
  }

  return createdImages;
}

/**
 * إنشاء مزاد جديد
 */
async function createAuction(carData: Record<string, unknown>, _carId: string): Promise<{
  id: string;
  startingPrice: number;
  currentPrice: number;
  endTime: Date;
  status: string;
} | null> {
  try {
    // حساب أوقات البداية والنهاية
    const startTime = calculateStartTime(carData.auctionStartTime);
    const endTime = calculateEndTime(startTime, carData.auctionDuration);
    const status = determineAuctionStatus(startTime, endTime);

    // إنشاء معرف فريد للمزاد (مطلوب حسب schema.prisma)
    const auctionId = `auction_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // استخدام أسماء الحقول الصحيحة من schema.prisma
    const auction = await prisma.auctions.create({
      data: {
        id: auctionId, // المعرف الفريد للمزاد - مطلوب
        title: car.title,
        description: car.description || '',
        carId: car.id,
        sellerId,
        startPrice: car.price, // اسم الحقل في schema
        currentPrice: car.price,
        minimumBid: 500.0, // اسم الحقل في schema
        startDate: startTime, // اسم الحقل في schema
        endDate: endTime, // اسم الحقل في schema
        status,
        featured: false,
        totalBids: 0,
        updatedAt: new Date(), // مطلوب في schema
      }
    });

    // تحديث السيارة لتصبح مزاد
    await prisma.cars.update({
      where: { id: car.id },
      data: { isAuction: true }
    });

    return auction;
  } catch (error) {
    logger.error('خطأ في إنشاء المزاد:', error);
    return null;
  }
}

/**
 * حساب وقت بداية المزاد
 */
function calculateStartTime(startTimeOption?: string): Date {
  const now = new Date();

  switch (startTimeOption) {
    case 'after_30_seconds':
      return new Date(now.getTime() + 30 * 1000); // بعد 30 ثانية
    case 'after_1_hour':
      return new Date(now.getTime() + 60 * 60 * 1000);
    case 'after_24_hours':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    default:
      return now;
  }
}

/**
 * حساب وقت نهاية المزاد
 */
function calculateEndTime(startTime: Date, duration?: string): Date {
  const start = new Date(startTime);

  switch (duration) {
    case '1_minute':
      return new Date(start.getTime() + 60 * 1000);
    case '1_day':
      return new Date(start.getTime() + 24 * 60 * 60 * 1000);
    case '3_days':
      return new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);
    case '1_month':
      return new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
    default: // 1_week
      return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
  }
}

/**
 * تحديد حالة المزاد
 */
function determineAuctionStatus(startTime: Date, endTime: Date): 'UPCOMING' | 'ACTIVE' | 'ENDED' {
  const now = new Date();

  if (startTime > now) {
    return 'UPCOMING';
  } else if (endTime > now) {
    return 'ACTIVE';
  } else {
    return 'ENDED';
  }
}

/**
 * تنظيف الكاش
 */
async function cleanupCache(): Promise<void> {
  try {
    await Promise.allSettled([
      invalidateCache('marketplace:*'),
      invalidateCache('cars:*'),
      invalidateCache('auctions:*'),
      invalidateCache('vehicles:*')
    ]);

    logger.info('تم تنظيف الكاش بنجاح');
  } catch (error) {
    logger.warn('تحذير: فشل في تنظيف الكاش', error);
  }
}
