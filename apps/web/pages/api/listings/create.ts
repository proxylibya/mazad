import { NextApiRequest, NextApiResponse } from 'next';
import { computeTieredIncrement, roundToIncrement } from '../../../config/auction-constants';
import { getStartPriceFactorFromSettings } from '../../../config/auction-settings-loader';
import { invalidateCache } from '../../../lib/cache';
import prisma from '../../../lib/prisma';
import { CacheNamespaces, CacheTags, advancedCache, invalidateCacheOnUpdate } from '../../../utils/advancedCaching';
import {
  handleApiError,
  sendErrorResponse,
  sendSuccessResponse,
} from '../../../utils/apiErrorHandler';
import { convertConditionToEnum } from '../../../utils/carConditionConverter';
import {
  sanitizeCarListingData,
  validateCarListingData,
  validateImages,
} from '../../../utils/listingValidation';
import { getUserIdFromRequest } from '../../../utils/serverAuthUtils';

// استخدام عميل Prisma الموحّد (Singleton) لتجنّب فتح اتصالات متعددة

// دالة حساب أولوية الترويج
function getPromotionPriority(packageType?: string): number {
  switch (packageType) {
    case 'vip': return 3;
    case 'premium': return 2;
    case 'basic': return 1;
    default: return 0;
  }
}

interface CarListingData {
  title?: string; // إضافة حقل العنوان المخصص
  brand: string;
  model: string;
  year: string;
  condition: string;
  mileage: string;
  price: string;
  city: string;
  area?: string;
  contactPhone: string;
  description: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  regionalSpec: string;
  exteriorColor: string;
  interiorColor: string;
  seatCount: string;
  yardName?: string;
  // البيانات التقنية
  chassisNumber?: string;
  engineNumber?: string;
  engineSize?: string;
  listingType: 'auction' | 'instant';
  // حقول المزاد
  auctionStartTime?: 'now' | 'after_30_seconds' | 'after_1_hour' | 'after_24_hours' | 'custom';
  auctionCustomStartTime?: string;
  auctionDuration?: '1_minute' | '1_day' | '3_days' | '1_week' | '1_month';
  // حقول الترويج
  featured?: boolean;
  promotionPackage?: 'free' | 'basic' | 'premium' | 'vip';
  promotionDays?: number;
  // تقرير الفحص
  inspectionReport?: {
    hasReport: boolean;
    manualReport?: {
      engineCondition?: string;
      bodyCondition?: string;
      interiorCondition?: string;
      tiresCondition?: string;
      electricalCondition?: string;
      overallRating?: string;
      notes?: string;
    };
  };
}

interface ImageData {
  id: string;
  url: string;
  fileName?: string;
  fileSize?: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // إضافة headers للاستجابة JSON في البداية
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // معالجة OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true, message: 'OPTIONS handled' });
  }

  if (req.method !== 'POST') {
    return sendErrorResponse(res, 405, 'Method not allowed', 'METHOD_NOT_ALLOWED', {
      method: req.method,
      allowedMethods: ['POST'],
    });
  }

  try {
    // التحقق من وجود body
    if (!req.body) {
      return sendErrorResponse(res, 400, 'البيانات المرسلة فارغة', 'EMPTY_BODY', {
        bodyType: typeof req.body,
      });
    }

    // التحقق من أن body هو object وليس string
    let parsedBody = req.body;
    if (typeof req.body === 'string') {
      try {
        parsedBody = JSON.parse(req.body);
      } catch (parseError) {
        console.error('[فشل] خطأ في تحليل JSON:', parseError);
        return sendErrorResponse(
          res,
          400,
          'خطأ في تنسيق البيانات المرسلة - JSON غير صحيح',
          'INVALID_JSON',
          { parseError: parseError.message },
        );
      }
    }

    // التحقق من بنية البيانات
    if (!parsedBody || typeof parsedBody !== 'object') {
      return sendErrorResponse(
        res,
        400,
        'بنية البيانات المرسلة غير صحيحة',
        'INVALID_BODY_STRUCTURE',
        { received: typeof parsedBody },
      );
    }

    const {
      carData,
      images,
      userId: bodyUserId, // إضافة userId من البيانات المرسلة
    }: { carData: CarListingData; images: ImageData[]; userId?: string; } = parsedBody;

    // استخراج معرف المستخدم من الطلب (headers، cookies، أو body)
    const userId = getUserIdFromRequest(req) || bodyUserId;

    // التحقق من وجود البيانات الأساسية
    if (!carData) {
      return sendErrorResponse(res, 400, 'بيانات السيارة مفقودة', 'MISSING_CAR_DATA');
    }

    console.log('Car data received:', {
      brand: carData.brand,
      model: carData.model,
      year: carData.year,
      price: carData.price,
      listingType: carData.listingType,
    });

    console.log('User ID received:', {
      userId: userId,
      userIdType: typeof userId,
      hasUserId: !!userId,
    });

    // تنظيف البيانات
    const sanitizedCarData = sanitizeCarListingData(carData);

    // التحقق من صحة بيانات السيارة
    const carValidation = validateCarListingData(sanitizedCarData);
    if (!carValidation.isValid) {
      const firstError = Object.values(carValidation.errors)[0];
      return sendErrorResponse(res, 400, firstError, 'VALIDATION_ERROR', {
        errors: carValidation.errors,
      });
    }

    // التحقق من صحة الصور
    const imageValidation = validateImages(images);
    if (!imageValidation.isValid) {
      const firstError = Object.values(imageValidation.errors)[0];
      return sendErrorResponse(res, 400, firstError, 'IMAGE_VALIDATION_ERROR', {
        errors: imageValidation.errors,
      });
    }

    // إنشاء عنوان الإعلان - استخدام العنوان المخصص أو إنشاء عنوان تلقائي
    const title =
      carData.title && carData.title.trim()
        ? carData.title.trim()
        : `${carData.brand} ${carData.model} ${carData.year}`;

    console.log('[التحرير] عنوان الإعلان:', {
      customTitle: carData.title,
      generatedTitle: `${carData.brand} ${carData.model} ${carData.year}`,
      finalTitle: title,
    });

    // تسجيل بيانات الموقع للتشخيص
    console.log('بيانات الموقع المستلمة:', {
      city: carData.city,
      area: carData.area,
      coordinates: carData.coordinates,
      detailedAddress: carData.detailedAddress,
      carLocation: carData.carLocation,
    });

    // تكوين الموقع المدمج: المدينة + المنطقة (إذا كانت موجودة)
    const combinedLocation = carData.area && carData.area.trim()
      ? `${carData.city}، ${carData.area.trim()}`
      : carData.city;

    // تحويل البيانات للتوافق مع قاعدة البيانات
    console.log(
      '[التحديث] تحويل حالة السيارة:',
      carData.condition,
      '->',
      convertConditionToEnum(carData.condition),
    );

    // تطبيع نوع الإعلان: أي قيمة غير "auction" تعتبر "instant" (يدعم قيم مثل marketplace)
    const normalizedListingType: 'auction' | 'instant' =
      carData.listingType === 'auction' ? 'auction' : 'instant';

    // تحديد حالة السيارة بناءً على نوع الإعلان الموحّد
    const carStatus = normalizedListingType === 'auction' ? 'PENDING' : 'AVAILABLE';

    // إنشاء معرف فريد للسيارة
    const carId = `car_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const now = new Date();
    const carDbData = {
      id: carId, // إضافة المعرف الفريد
      title,
      brand: carData.brand,
      model: carData.model,
      year: parseInt(carData.year),
      price: parseFloat(carData.price),
      condition: convertConditionToEnum(carData.condition),
      mileage: carData.mileage ? parseInt(carData.mileage) : null,
      location: combinedLocation,
      // إحداثيات الموقع (اختيارية)
      locationLat: carData.carLocation?.lat || carData.coordinates?.lat || null,
      locationLng: carData.carLocation?.lng || carData.coordinates?.lng || null,
      locationAddress:
        carData.carLocation?.address || carData.detailedAddress || carData.city || null,
      description: carData.description || '',
      contactPhone: carData.contactPhone || null,
      features: JSON.stringify({
        // المواصفات التفصيلية
        bodyType: carData.bodyType,
        fuelType: carData.fuelType,
        transmission: carData.transmission,
        regionalSpec: carData.regionalSpec,
        exteriorColor: carData.exteriorColor,
        interiorColor: carData.interiorColor,
        seatCount: carData.seatCount,
        // البيانات التقنية
        chassisNumber: carData.chassisNumber,
        engineNumber: carData.engineNumber,
        engineSize: carData.engineSize,
        yardName: carData.yardName || null,
        // المميزات والكماليات
        features: carData.features || [],
      }),
      images: JSON.stringify(images.map((img) => img.url)),
      // الحقول المباشرة للبيانات التقنية
      chassisNumber: carData.chassisNumber || null,
      engineNumber: carData.engineNumber || null,
      fuelType: carData.fuelType || null,
      transmission: carData.transmission || null,
      bodyType: carData.bodyType || null,
      color: carData.exteriorColor || null,
      interiorColor: carData.interiorColor || null,
      seatCount: carData.seatCount || null,
      regionalSpecs: carData.regionalSpec || null,
      sellerId: userId, // استخدام معرف المستخدم الحالي
      status: carStatus, // PENDING للمزادات، AVAILABLE للسوق الفوري
      isAuction: normalizedListingType === 'auction',
      // الحقول الزمنية المطلوبة
      createdAt: now,
      updatedAt: now,
      // حقول الترويج - دائماً free عند الإنشاء (الدفع يتم لاحقاً)
      // ⚠️ مهم: الإعلان يُنشر كـ free دائماً، والترويج يُفعّل فقط بعد الدفع
      featured: false,
      promotionPackage: 'free',
      promotionDays: 0,
      promotionStartDate: null,
      promotionEndDate: null,
      promotionPriority: 0,
    };

    console.log('[الإحصائيات] بيانات السيارة المحولة:', {
      ...carDbData,
      features: 'JSON string', // لا نطبع JSON الكامل
      images: 'JSON string',
      listingType: carData.listingType, // نوع الإعلان
    });

    // تسجيل بيانات الترويج للتشخيص
    // ⚠️ الباقة المطلوبة محفوظة لإرجاعها للـ frontend للتوجيه للدفع
    const requestedPackage = carData.promotionPackage || 'free';
    const requestedDays = carData.promotionDays || 0;
    console.log('[الترويج] الإعلان يُنشر كـ free - الباقة المطلوبة:', {
      requestedPackage,
      requestedDays,
      willRedirectToPayment: requestedPackage !== 'free',
    });

    // تسجيل بيانات الموقع المحولة للتشخيص
    console.log('بيانات الموقع المحولة للحفظ:', {
      originalCity: carData.city,
      originalArea: carData.area,
      combinedLocation: combinedLocation,
      locationLat: carDbData.locationLat,
      locationLng: carDbData.locationLng,
      locationAddress: carDbData.locationAddress,
      finalLocation: carDbData.location,
    });

    // التأكد من وجود userId صحيح
    if (!userId) {
      return sendErrorResponse(
        res,
        401,
        'يجب تسجيل الدخول أولاً لإنشاء إعلان',
        'USER_NOT_AUTHENTICATED',
        { providedUserId: userId },
      );
    }

    // التأكد من وجود المستخدم أو إنشاؤه
    let user;
    try {
      user = await prisma.users.findUnique({
        where: { id: userId },
      });

      if (!user) {
        // البحث عن مستخدم بنفس رقم الهاتف أولاً
        const existingUserByPhone = await prisma.users.findFirst({
          where: {
            phone: carData.contactPhone,
          },
        });

        if (existingUserByPhone) {
          // استخدام المستخدم الموجود بنفس رقم الهاتف
          user = existingUserByPhone;
          console.log('[تم بنجاح] تم العثور على مستخدم موجود برقم الهاتف:', user.id);
        } else {
          return sendErrorResponse(
            res,
            401,
            'المستخدم غير موجود. يرجى تسجيل الدخول أولاً',
            'USER_NOT_FOUND',
            { userId },
          );
        }
      }
    } catch (userError) {
      console.error('[فشل] خطأ في التعامل مع المستخدم:', userError);
      throw new Error(`خطأ في إنشاء أو العثور على المستخدم: ${userError?.message}`);
    }

    // إنشاء السيارة في قاعدة البيانات
    let newCar;
    try {
      console.log('[الإحصائيات] Car data to insert:', JSON.stringify(carDbData, null, 2));

      newCar = await prisma.cars.create({
        data: carDbData,
        // تحديد الحقول المعادة لتجنّب RETURNING أعمدة غير موجودة مثل area
        select: { id: true },
      });
    } catch (dbError: unknown) {
      // معالجة خاصة في حال كان عمود isAuction غير موجود في قاعدة البيانات
      const message: string = (dbError as { message?: string; })?.message || String(dbError || '');
      const isMissingIsAuctionColumn =
        typeof message === 'string' &&
        message.includes('isAuction') &&
        message.includes('does not exist');

      if (isMissingIsAuctionColumn) {
        console.warn(
          '[تحذير] عمود isAuction غير موجود في قاعدة البيانات. سيتم المتابعة بدون هذا الحقل مؤقتاً. يُنصح بتطبيق ترحيل قاعدة البيانات لإضافة العمود والفهارس.',
        );
        // إزالة الحقل وإعادة المحاولة كحل مؤقت
        const { isAuction: _ignoredIsAuction, ...carDbDataWithoutIsAuction } =
          (carDbData as typeof carDbData & { isAuction?: boolean; }) || ({} as never);
        try {
          newCar = await prisma.cars.create({
            data: carDbDataWithoutIsAuction,
            select: { id: true },
          });
        } catch (fallbackError: unknown) {
          console.error('[فشل] فشل الإدراج بدون isAuction أيضاً:', fallbackError);
          throw new Error(
            `خطأ في قاعدة البيانات بعد المحاولة الاحتياطية: ${(fallbackError as { message?: string; })?.message || 'خطأ غير معروف'
            }`,
          );
        }
      } else {
        console.error('[فشل] خطأ في إنشاء السيارة في قاعدة البيانات:', dbError);
        console.error('[فشل] Database error code:', (dbError as { code?: unknown; })?.code);
        console.error('[فشل] Database error message:', message);
        throw new Error(`خطأ في قاعدة البيانات: ${message || 'خطأ غير معروف'}`);
      }
    }

    // جلب مجموعة آمنة من الحقول الموجودة فقط لإرجاعها للواجهة بدون أعمدة مثل area
    // carId تم إنشاؤه مسبقاً واستخدامه في carDbData
    let safeCar = await prisma.cars.findUnique({
      where: { id: carId },
      select: {
        id: true,
        title: true,
        brand: true,
        model: true,
        year: true,
        price: true,
        mileage: true,
        status: true,
        location: true,
        createdAt: true,
      },
    });
    if (!safeCar) {
      safeCar = { id: carId } as any;
    }

    // حفظ الصور في جدول CarImage
    const carImages = [];
    for (let i = 0; i < images.length; i++) {
      const image = images[i];
      try {
        const carImage = await prisma.car_images.create({
          data: {
            carId: carId,
            fileName: image.fileName || `car_${carId}_${i + 1}.jpg`,
            fileUrl: image.url,
            fileSize: image.fileSize || 0,
            isPrimary: i === 0, // الصورة الأولى هي الأساسية
            uploadedBy: userId,
            category: 'listings',
          },
        });
        carImages.push(carImage);
      } catch (imageError) {
        console.error(`[فشل] خطأ في حفظ الصورة ${i + 1}:`, imageError);
      }
    }

    // حفظ تقرير الفحص إذا كان متوفراً
    if (carData.inspectionReport && carData.inspectionReport.hasReport) {
      try {
        const inspectionData = carData.inspectionReport.manualReport;
        const reportFile = carData.inspectionReport;

        // تحديث بيانات السيارة مع معلومات تقرير الفحص
        await prisma.cars.update({
          where: { id: carId },
          data: {
            hasInspectionReport: true,
            inspectionReportFileUrl: reportFile.reportUrl || null,
            inspectionReportFileName: reportFile.reportFileName || null,
            inspectionReportUploadId: reportFile.uploadId || null,
            hasManualInspectionReport: !!inspectionData,
            manualInspectionData: inspectionData ? JSON.stringify(inspectionData) : null,
          },
          select: { id: true },
        });

        // إنشاء سجل في جدول inspection_reports
        if (inspectionData || reportFile.reportUrl) {
          await prisma.inspection_reports.create({
            data: {
              id: `inspection_${carId}`,
              carId: carId,
              inspectorName: inspectionData ? 'فحص ذاتي' : 'تقرير مرفوع',
              inspectionDate: new Date(),
              overallCondition: inspectionData?.overallRating || null,
              engineCondition: inspectionData?.engineCondition || null,
              bodyCondition: inspectionData?.bodyCondition || null,
              interiorCondition: inspectionData?.interiorCondition || null,
              tiresCondition: inspectionData?.tiresCondition || null,
              electricalSystem: inspectionData?.electricalCondition || null,
              notes: inspectionData?.notes || null,
              rating: inspectionData?.overallRating
                ? parseFloat(inspectionData.overallRating)
                : null,
              fileUrl: reportFile.reportUrl || null,
              fileName: reportFile.reportFileName || null,
              fileType: reportFile.fileType || null,
              reportType: inspectionData ? 'manual' : 'file',
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });
        }
      } catch (inspectionError) {
        console.error('[فشل] خطأ في حفظ تقرير الفحص:', inspectionError);
      }
    }

    // إنشاء مزاد إذا كان النوع مزاد
    let auction = null;
    if (normalizedListingType === 'auction') {
      try {
        console.log('[المزاد] بدء إنشاء مزاد جديد:', { carId, userId });

        // حساب وقت بداية المزاد
        let startTime = new Date();
        if (carData.auctionStartTime === 'after_30_seconds') {
          startTime = new Date(Date.now() + 30 * 1000); // بعد 30 ثانية
        } else if (carData.auctionStartTime === 'after_1_hour') {
          startTime = new Date(Date.now() + 60 * 60 * 1000); // بعد ساعة
        } else if (carData.auctionStartTime === 'after_24_hours') {
          startTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // بعد 24 ساعة
        } else if (carData.auctionStartTime === 'custom' && carData.auctionCustomStartTime) {
          startTime = new Date(carData.auctionCustomStartTime);
        }

        // حساب وقت انتهاء المزاد
        let endTime = new Date(startTime);
        const duration = carData.auctionDuration || '1_week';
        switch (duration) {
          case '1_minute':
            endTime = new Date(startTime.getTime() + 60 * 1000);
            break;
          case '1_day':
            endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
            break;
          case '3_days':
            endTime = new Date(startTime.getTime() + 3 * 24 * 60 * 60 * 1000);
            break;
          case '1_week':
            endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case '1_month':
            endTime = new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            endTime = new Date(startTime.getTime() + 7 * 24 * 60 * 60 * 1000);
        }

        // تحديد حالة المزاد
        const auctionStatus = startTime <= new Date() ? 'ACTIVE' : 'UPCOMING';

        // حساب سعر البداية بعامل مرن + تقريب لأقرب زيادة متدرجة
        // يستخدم الإعدادات المخصصة من صفحة الإعدادات
        const vehiclePrice = parseFloat(carData.price);
        const factor = getStartPriceFactorFromSettings(carData.bodyType, carData.condition);
        const baseIncrement = computeTieredIncrement(vehiclePrice, 500);
        const rawStart = Math.floor(vehiclePrice * factor);
        const startingPrice = roundToIncrement(rawStart, baseIncrement);
        const minIncrementToStore = baseIncrement;

        // إنشاء معرف فريد للمزاد (مطلوب حسب schema.prisma)
        const auctionId = `auction_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // استخدام أسماء الحقول الصحيحة حسب schema.prisma:
        // startPrice (ليس startingPrice), startDate (ليس startTime), endDate (ليس endTime), minimumBid (ليس minimumBidIncrement)
        const auctionData = {
          id: auctionId, // المعرف الفريد للمزاد - مطلوب
          title: title,
          description: carData.description || `مزاد مفتوح لسيارة ${title}`,
          carId: carId,
          sellerId: userId,
          startPrice: startingPrice, // اسم الحقل في schema: startPrice
          currentPrice: startingPrice,
          minimumBid: minIncrementToStore, // اسم الحقل في schema: minimumBid
          startDate: startTime, // اسم الحقل في schema: startDate
          endDate: endTime, // اسم الحقل في schema: endDate
          status: auctionStatus,
          // حقول الترويج - دائماً free عند الإنشاء (الدفع يتم لاحقاً)
          // ⚠️ مهم: المزاد يُنشر كـ free دائماً، والترويج يُفعّل فقط بعد الدفع
          featured: false,
          promotionPackage: 'free',
          promotionDays: 0,
          promotionStartDate: null,
          promotionEndDate: null,
          promotionPriority: 0,
          updatedAt: new Date(), // مطلوب في schema
        };

        console.log('[المزاد] بيانات المزاد للإنشاء:', auctionData);

        auction = await prisma.auctions.create({
          data: auctionData,
        });

        console.log('[المزاد] ✅ تم إنشاء المزاد بنجاح:', {
          auctionId: auction.id,
          carId,
          status: auction.status
        });

      } catch (auctionError) {
        console.error('[المزاد] ❌ فشل في إنشاء المزاد:', auctionError);
        console.error('[المزاد] تفاصيل الخطأ:', {
          errorMessage: auctionError.message,
          errorCode: auctionError.code,
          carId: carId,
          userId: userId
        });

        // رمي الخطأ لإيقاف العملية إذا فشل المزاد
        throw new Error(`فشل في إنشاء المزاد: ${auctionError.message}`);
      }
    }

    // إرجاع الاستجابة

    // تحديد معرف الإعلان الصحيح حسب نوع الإعلان
    const listingId = normalizedListingType === 'auction' && auction ? auction.id : carId;

    console.log('معرف الإعلان المرجع:', {
      listingType: carData.listingType,
      carId,
      auctionId: auction?.id,
      finalListingId: listingId,
    });

    const responseData = {
      car: safeCar,
      images: carImages,
      auction: auction,
      listingId: listingId,
      listingType: normalizedListingType,
      // ⚠️ معلومات الترويج المطلوبة - للتوجيه لصفحة الدفع إذا كانت باقة مدفوعة
      requestedPackage: carData.promotionPackage || 'free',
      requestedDays: carData.promotionDays || 0,
      requiresPayment: carData.promotionPackage && carData.promotionPackage !== 'free',
    };

    // إبطال الكاش لضمان ظهور الإعلان فوراً في /marketplace
    try {
      await invalidateCacheOnUpdate('car'); // يمسح كاش SSR الموسوم بـ CAR_LIST
    } catch (e) {
      console.warn('[cache] failed to invalidate advanced cache by tag', e);
    }

    // إبطال الكاش بالأسماء الصحيحة (namespace) لضمان حذف مفاتيح KeyDB أيضاً
    try {
      await advancedCache.invalidateByTag(CacheTags.CAR_LIST, CacheNamespaces.CAR);
    } catch (e) {
      console.warn('[cache] failed to invalidate namespaced CAR_LIST cache', e);
    }

    try {
      // مسح مفاتيح الكاش البسيط للدوال التي تستخدم getOrSetCache
      // مسح جميع مفاتيح الكاش المتعلقة بالسوق الفوري - تحسين الأنماط
      const cachePatterns = [
        'marketplace:cars:*', // كاش getMarketplaceCars
        'marketplace:ssr:*',  // كاش SSR للصفحة
        'cars:featured:*',    // السيارات المميزة
        'car_*',              // نمط عام للسيارات
        'cars:*',             // نمط إضافي للسيارات
        // إضافة أنماط محددة أكثر لضمان التنظيف الشامل
        'marketplace:cars:%7B%*', // النمط المُرمز من encodeURIComponent
        'marketplace:ssr:page:*', // كاش SSR بالصفحات
        'api:cars:*'              // كاش API
      ];

      for (const pattern of cachePatterns) {
        try {
          const deletedCount = await invalidateCache(pattern);
          console.log(`[Cache] تم مسح نمط الكاش: ${pattern} - عدد المفاتيح المحذوفة: ${deletedCount}`);
        } catch (patternError) {
          console.warn(`[Cache] فشل في مسح النمط ${pattern}:`, patternError);
        }
      }
    } catch (e) {
      console.warn('[cache] failed to invalidate simple cache keys', e);
    }

    // إضافة آلية فورية لمسح جميع أنواع الكاش المتعلقة
    try {
      // مسح كاش الدوال المحددة
      const specificCacheKeys = [
        `marketplace:cars:${encodeURIComponent(JSON.stringify({}))}`, // المفتاح الافتراضي
        `marketplace:cars:${encodeURIComponent(JSON.stringify({ limit: 20 }))}`, // صفحة 20 عنصر
        `marketplace:cars:${encodeURIComponent(JSON.stringify({ limit: 50 }))}`, // صفحة 50 عنصر
        'marketplace:ssr:page:1:limit:20', // كاش SSR للصفحة الأولى
      ];

      for (const key of specificCacheKeys) {
        try {
          await invalidateCache(key);
          console.log(`[Cache] تم مسح المفتاح المحدد: ${key}`);
        } catch (keyError) {
          console.warn(`[Cache] فشل في مسح المفتاح ${key}:`, keyError);
        }
      }
    } catch (e) {
      console.warn('[cache] failed to clear specific cache keys', e);
    }

    return sendSuccessResponse(res, 201, responseData, 'تم نشر الإعلان بنجاح');
  } catch (error) {
    // استخدام معالج الأخطاء الموحد
    return handleApiError(res, error, 'إنشاء الإعلان');
  } finally {
    // لا نقوم بإغلاق اتصال Prisma هنا لأننا نستخدم عميل Singleton للتطبيق كله
  }
}
