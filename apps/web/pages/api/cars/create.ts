import { Prisma } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';
import { invalidateCache } from '../../../lib/cache';
import { dbHelpers } from '../../../lib/prisma';
import { CacheNamespaces, CacheTags, advancedCache, invalidateCacheOnUpdate } from '../../../utils/advancedCaching';
import { convertConditionToEnum } from '../../../utils/carConditionConverter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  try {
    const { carData, images, userId } = req.body;

    console.log('🔍 تسجيل مفصل لبيانات الطلب:', {
      hasCarData: !!carData,
      carDataType: typeof carData,
      carDataKeys: carData ? Object.keys(carData) : null,
      hasImages: !!images,
      imagesType: typeof images,
      imagesLength: Array.isArray(images) ? images.length : 'ليس مصفوفة',
      hasUserId: !!userId,
      userIdType: typeof userId,
      userIdValue: userId,
      fullRequestBody: req.body ? Object.keys(req.body) : null,
    });

    console.log('إرسال بيانات الإعلان:', {
      carData,
      images: images?.length,
      userId,
    });

    // التحقق من البيانات المطلوبة
    if (!carData || !userId) {
      return res.status(400).json({
        success: false,
        error: 'بيانات الطلب غير مكتملة',
        code: 'MISSING_DATA',
      });
    }

    // التحقق من البيانات الأساسية للسيارة
    const requiredFields = ['brand', 'model', 'year', 'price', 'location'];

    console.log('🔍 فحص الحقول المطلوبة:', {
      brand: carData.brand,
      model: carData.model,
      year: carData.year,
      price: carData.price,
      location: carData.location,
      city: carData.city,
    });

    const missingFields = requiredFields.filter((field) => {
      const fieldValue = carData[field];
      const isEmpty = !fieldValue || fieldValue.toString().trim() === '';
      if (isEmpty) {
        console.log(`⚠️ حقل مفقود: ${field} - القيمة: ${fieldValue}`);
      }
      return isEmpty;
    });

    // التعامل مع حقل الموقع - تحويل city إلى location إذا كان مفقوداً
    if (!carData.location && carData.city) {
      console.log('🔄 تحويل city إلى location:', carData.city);
      carData.location = carData.city;
    }

    // إنشاء title تلقائياً إذا لم يتم توفيره
    if (!carData.title || carData.title.trim() === '') {
      carData.title = `${carData.brand || ''} ${carData.model || ''} ${carData.year || ''}`.trim();
    }

    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        error: `بيانات مطلوبة مفقودة: ${missingFields.join(', ')}`,
        code: 'MISSING_REQUIRED_FIELDS',
        details: { missingFields },
      });
    }

    // التحقق من رقم الهاتف أولاً
    if (!carData.contactPhone || carData.contactPhone.toString().trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'رقم الهاتف مطلوب',
        code: 'MISSING_CONTACT_PHONE',
      });
    }

    // تنظيف رقم الهاتف
    let cleanContactPhone = carData.contactPhone.toString().trim();
    if (!cleanContactPhone.startsWith('+218') && cleanContactPhone.length === 9) {
      // إضافة رمز البلد الليبي إذا كان مفقوداً
      cleanContactPhone = '+218' + cleanContactPhone;
    }

    // التحقق من وجود المستخدم أو إنشاؤه
    let user;
    try {
      // البحث أولاً بالمعرّف
      if (userId) {
        user = await dbHelpers.prisma.users.findUnique({ where: { id: userId } });
      }

      // إن لم يوجد، البحث برقم الهاتف
      if (!user && cleanContactPhone) {
        user = await dbHelpers.prisma.users.findFirst({
          where: { phone: cleanContactPhone },
        });
      }

      // إن لم يوجد، أنشئ مستخدماً جديداً
      if (!user) {
        try {
          user = await dbHelpers.prisma.users.create({
            data: {
              id: userId,
              name: 'مستخدم افتراضي',
              phone: cleanContactPhone,
              email: `user_${Date.now()}@example.com`,
              role: 'USER',
              accountType: 'REGULAR_USER',
              verified: true,
              status: 'ACTIVE',
            },
          });
        } catch (createError: unknown) {
          const prismaErr = createError as Prisma.PrismaClientKnownRequestError;
          if (prismaErr?.code === 'P2002') {
            if (cleanContactPhone) {
              const existingByPhone = await dbHelpers.prisma.users.findFirst({
                where: { phone: cleanContactPhone },
              });
              if (existingByPhone) {
                user = existingByPhone;
              }
            }

            if (!user) {
              user = await dbHelpers.prisma.users.create({
                data: {
                  name: 'مستخدم افتراضي',
                  phone: `phone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                  email: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`,
                  role: 'USER',
                  accountType: 'REGULAR_USER',
                  verified: true,
                  status: 'ACTIVE',
                },
              });
            }
          } else {
            throw createError;
          }
        }
      }

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'تعذّر العثور على المستخدم أو إنشاؤه',
          code: 'USER_NOT_FOUND',
        });
      }
    } catch (error) {
      console.error('❌ خطأ في التحقق/إنشاء المستخدم:', error);
      return res.status(500).json({
        success: false,
        error: 'خطأ في إعداد المستخدم',
        code: 'USER_SETUP_ERROR',
        details: {
          originalError: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
      });
    }

    // التحقق من صحة البيانات الرقمية
    const currentYear = new Date().getFullYear();
    const yearNum = parseInt(carData.year);
    const priceNum = parseFloat(carData.price);
    const mileageNum = carData.mileage ? parseInt(carData.mileage) : null;

    // التحقق من صحة السنة
    if (isNaN(yearNum) || yearNum < 1990 || yearNum > currentYear + 1) {
      return res.status(400).json({
        success: false,
        error: `سنة الصنع غير صحيحة. يجب أن تكون بين 1990 و ${currentYear + 1}`,
        code: 'INVALID_YEAR',
      });
    }

    // التحقق من صحة السعر
    if (isNaN(priceNum) || priceNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'السعر غير صحيح. يجب أن يكون رقماً موجباً',
        code: 'INVALID_PRICE',
      });
    }

    // التحقق من صحة المسافة المقطوعة
    if (carData.mileage && (isNaN(mileageNum!) || mileageNum! < 0)) {
      return res.status(400).json({
        success: false,
        error: 'المسافة المقطوعة غير صحيحة',
        code: 'INVALID_MILEAGE',
      });
    }

    // معالجة حقل الصور بشكل صحيح
    const processedImages = (() => {
      if (Array.isArray(images) && images.length > 0) {
        // فلترة الصور الصالحة وإزالة المسارات الفارغة
        const validImages = images.filter(
          (img) => img && typeof img === 'string' && img.trim() !== '',
        );
        return validImages.length > 0 ? validImages.join(',') : 'placeholder.jpg';
      }
      if (typeof images === 'string' && images.trim()) {
        return images.trim();
      }
      // إذا لم توجد صور، استخدم placeholder
      return 'placeholder.jpg';
    })();

    // معالجة حقل المزايا بشكل صحيح - يجب أن يكون غير فارغ
    const processedFeatures = (() => {
      if (Array.isArray(carData.features) && carData.features.length > 0) {
        return JSON.stringify(carData.features);
      }
      if (typeof carData.features === 'string' && carData.features.trim()) {
        return carData.features.trim();
      }
      // قيمة افتراضية لمصفوفة فارغة (لا يمكن أن تكون فارغة في قاعدة البيانات)
      return JSON.stringify([]);
    })();

    // إعداد بيانات السيارة مع التحقق من جميع الحقول المطلوبة
    const carCreateData: Prisma.CarUncheckedCreateInput = {
      title: carData.title?.trim() || `${carData.brand} ${carData.model} ${carData.year}`,
      brand: carData.brand?.trim() || '',
      model: carData.model?.trim() || '',
      year: yearNum,
      price: priceNum,
      condition: convertConditionToEnum(carData.condition || 'مستعمل'),
      mileage: mileageNum,
      location: carData.location?.trim() || '',
      description: carData.description?.trim() || '',
      features: processedFeatures,
      images: processedImages,
      // إعداد الحقول الاختيارية بشكل آمن
      fuelType: carData.fuelType?.trim() || undefined,
      transmission: carData.transmission?.trim() || undefined,
      bodyType: carData.bodyType?.trim() || undefined,
      color: carData.exteriorColor?.trim() || undefined,
      interiorColor: carData.interiorColor?.trim() || undefined,
      seatCount: carData.seatCount ? String(carData.seatCount) : undefined,
      regionalSpecs: carData.regionalSpec?.trim() || undefined,
      vehicleType: carData.vehicleType?.trim() || undefined,
      manufacturingCountry: carData.manufacturingCountry?.trim() || undefined,
      chassisNumber: carData.chassisNumber?.trim() || undefined,
      engineNumber: carData.engineNumber?.trim() || undefined,
      customsStatus: carData.customsStatus?.trim() || undefined,
      licenseStatus: carData.licenseStatus?.trim() || undefined,
      insuranceStatus: carData.insuranceStatus?.trim() || undefined,
      paymentMethod: carData.paymentMethod?.trim() || undefined,
      contactPhone: cleanContactPhone,
      sellerId: user.id,
      status: 'AVAILABLE',
      isAuction: carData.listingType === 'auction' ? true : false, // صريح: true للمزادات، false للسوق الفوري
    };

    // سجل البيانات المرسلة للتشخيص
    console.log('🚀 [Create Car] بيانات السيارة المعدة للإنشاء:', {
      title: carCreateData.title,
      brand: carCreateData.brand,
      model: carCreateData.model,
      year: carCreateData.year,
      price: carCreateData.price,
      condition: carCreateData.condition,
      location: carCreateData.location,
      sellerId: carCreateData.sellerId,
      status: carCreateData.status,
      isAuction: carCreateData.isAuction,
      listingType: carData.listingType,
      featuresLength: carCreateData.features?.length || 0,
      imagesLength: carCreateData.images?.length || 0,
    });

    // التحقق من صحة البيانات قبل الإنشاء
    console.log('التحقق من البيانات قبل إنشاء السيارة:', {
      hasTitle: !!carCreateData.title,
      hasBrand: !!carCreateData.brand,
      hasModel: !!carCreateData.model,
      hasYear: !!carCreateData.year,
      hasPrice: !!carCreateData.price,
      hasLocation: !!carCreateData.location,
      hasSellerId: !!carCreateData.sellerId,
      hasImages: !!carCreateData.images,
      hasFeatures: !!carCreateData.features,
      condition: carCreateData.condition,
    });

    // إنشاء السيارة
    let newCar;
    try {
      // تسجيل إضافي للتشخيص
      console.log('✅ محاولة إنشاء السيارة مع البيانات:', {
        title: carCreateData.title?.substring(0, 50),
        brand: carCreateData.brand,
        model: carCreateData.model,
        year: carCreateData.year,
        price: carCreateData.price,
        condition: carCreateData.condition,
        status: carCreateData.status,
        location: carCreateData.location,
        sellerId: carCreateData.sellerId,
        imagesLength: carCreateData.images?.length || 0,
        imagesPreview: carCreateData.images?.substring(0, 100),
        featuresLength: carCreateData.features?.length || 0,
        featuresPreview: carCreateData.features?.substring(0, 100),
        isAuction: carCreateData.isAuction,
        contactPhone: carCreateData.contactPhone?.substring(0, 8) + '...',
        allFieldsNonNull: {
          title: !!carCreateData.title,
          brand: !!carCreateData.brand,
          model: !!carCreateData.model,
          year: !!carCreateData.year,
          price: !!carCreateData.price,
          condition: !!carCreateData.condition,
          status: !!carCreateData.status,
          location: !!carCreateData.location,
          sellerId: !!carCreateData.sellerId,
          images: !!carCreateData.images,
          features: !!carCreateData.features,
        },
      });

      // التحقق من أن جميع الحقول المطلوبة موجودة
      const missingCarFields = [];
      if (!carCreateData.title || carCreateData.title.trim() === '')
        missingCarFields.push('العنوان');
      if (!carCreateData.brand || carCreateData.brand.trim() === '')
        missingCarFields.push('الماركة');
      if (!carCreateData.model || carCreateData.model.trim() === '')
        missingCarFields.push('الموديل');
      if (!carCreateData.year || carCreateData.year <= 0) missingCarFields.push('سنة الصنع');
      if (!carCreateData.price || carCreateData.price <= 0) missingCarFields.push('السعر');
      if (!carCreateData.location || carCreateData.location.trim() === '')
        missingCarFields.push('الموقع');
      if (!carCreateData.sellerId) missingCarFields.push('معرف البائع');
      if (!carCreateData.images || carCreateData.images.trim() === '')
        missingCarFields.push('الصور');
      if (!carCreateData.features || carCreateData.features.trim() === '')
        missingCarFields.push('المزايا');

      if (missingCarFields.length > 0) {
        console.error('🚨 حقول مطلوبة مفقودة:', missingCarFields);
        throw new Error(`حقول مطلوبة مفقودة: ${missingCarFields.join(', ')}`);
      }

      console.log(
        '🚀 البيانات الكاملة قبل الإرسال لقاعدة البيانات:',
        JSON.stringify(carCreateData, null, 2),
      );

      // التحقق من صحة enum values
      const validConditions = ['NEW', 'USED', 'NEEDS_REPAIR'];
      if (!validConditions.includes(carCreateData.condition)) {
        console.error('❌ حالة السيارة غير صحيحة:', carCreateData.condition);
        throw new Error(
          `حالة السيارة غير صحيحة: ${carCreateData.condition}. القيم المسموحة: ${validConditions.join(', ')}`,
        );
      }

      const validStatuses = ['AVAILABLE', 'SOLD', 'PENDING', 'SUSPENDED'];
      if (!validStatuses.includes(carCreateData.status)) {
        console.error('❌ حالة الإعلان غير صحيحة:', carCreateData.status);
        throw new Error(
          `حالة الإعلان غير صحيحة: ${carCreateData.status}. القيم المسموحة: ${validStatuses.join(', ')}`,
        );
      }

      console.log('🔄 بدء عملية إنشاء السيارة في قاعدة البيانات...');
      newCar = await dbHelpers.createCar(carCreateData);
      console.log('✅ تم إنشاء السيارة في قاعدة البيانات بنجاح');

      if (!newCar) {
        throw new Error('فشل في إنشاء السيارة - لم يتم إرجاع بيانات من قاعدة البيانات');
      }

      console.log('✅ تم إنشاء السيارة بنجاح:', {
        carId: newCar.id,
        title: newCar.title,
        brand: newCar.brand,
        model: newCar.model,
      });
    } catch (error: unknown) {
      console.error('❌ خطأ في إنشاء السيارة:', error);

      // استخراج تفاصيل Prisma إن توفرت
      const prismaErr = error as Partial<Prisma.PrismaClientKnownRequestError> & {
        message?: string;
      };
      const prismaCode = prismaErr?.code;
      const prismaMeta = (prismaErr as Prisma.PrismaClientKnownRequestError)?.meta;
      const prismaMessage = prismaErr?.message;

      // تسجيل تفصيلي محسّن للخطأ
      console.error('❌ تفاصيل خطأ إنشاء السيارة:', {
        // بيانات الخطأ
        prismaCode,
        prismaMeta,
        prismaMessage,
        errorName: error instanceof Error ? error.name : 'Unknown',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        stack:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.stack?.split('\n').slice(0, 5)
            : undefined,

        // بيانات السيارة للتشخيص
        carDataSnapshot: {
          title: carCreateData.title?.substring(0, 50),
          brand: carCreateData.brand,
          model: carCreateData.model,
          year: carCreateData.year,
          price: carCreateData.price,
          condition: carCreateData.condition,
          location: carCreateData.location?.substring(0, 30),
          sellerId: carCreateData.sellerId?.substring(0, 8) + '...',
          contactPhone: carCreateData.contactPhone?.substring(0, 8) + '...',
          hasImages: !!carCreateData.images,
          imagesLength: carCreateData.images?.length,
          imagesPreview: carCreateData.images?.substring(0, 50) + '...',
          hasFeatures: !!carCreateData.features,
          featuresLength: carCreateData.features?.length,
          featuresPreview: carCreateData.features?.substring(0, 50) + '...',
          isAuction: carCreateData.isAuction,
        },

        // بيانات الطلب الأصلي
        requestSnapshot: {
          originalImagesType: typeof images,
          originalImagesLength: Array.isArray(images) ? images.length : 0,
          originalFeaturesType: typeof carData?.features,
          timestamp: new Date().toISOString(),
        },
      });

      // تحديد رسالة الخطأ المناسبة بناءً على نوع الخطأ
      let errorMessage = 'خطأ في إنشاء الإعلان';
      let errorCode = 'CAR_CREATION_ERROR';

      if (prismaCode === 'P2002') {
        const meta = (prismaErr as Prisma.PrismaClientKnownRequestError)?.meta;
        const target = (meta as { target?: string[]; })?.target;
        if (target && Array.isArray(target)) {
          errorMessage = `يوجد إعلان مشابه بالفعل في الحقول: ${target.join(', ')}`;
        } else {
          errorMessage = 'يبدو أن هناك إعلان مشابه موجود بالفعل';
        }
        errorCode = 'DUPLICATE_ENTRY';
      } else if (prismaCode === 'P2003') {
        errorMessage = 'خطأ في ربط البيانات - تأكد من صحة معلومات المستخدم';
        errorCode = 'FOREIGN_KEY_ERROR';
      } else if (prismaCode === 'P2025') {
        errorMessage = 'لم يتم العثور على البيانات المطلوبة';
        errorCode = 'RECORD_NOT_FOUND';
      } else if (prismaCode === 'P2000') {
        errorMessage = 'قيمة في حقل مطلوب أطول من المسموح';
        errorCode = 'VALUE_TOO_LONG';
      } else if (prismaCode === 'P2001') {
        errorMessage = 'السجل المطلوب غير موجود';
        errorCode = 'RECORD_NOT_FOUND';
      } else if (error instanceof Error) {
        if (error.message.includes('مطلوبة')) {
          errorMessage = error.message;
          errorCode = 'MISSING_REQUIRED_FIELDS';
        } else if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
          errorMessage = 'خطأ في الاتصال بقاعدة البيانات';
          errorCode = 'DATABASE_CONNECTION_ERROR';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى';
          errorCode = 'TIMEOUT_ERROR';
        }
      }

      return res.status(500).json({
        success: false,
        error: errorMessage,
        code: errorCode,
        timestamp: new Date().toISOString(),
        details:
          process.env.NODE_ENV === 'development'
            ? {
              prismaCode,
              prismaMeta,
              prismaMessage,
              originalError:
                prismaErr?.message || (error instanceof Error ? error.message : 'Unknown error'),
              requestId: req.headers['x-request-id'] || 'unknown',
            }
            : {
              code: prismaCode || 'UNKNOWN',
              requestId: req.headers['x-request-id'] || 'unknown',
            },
      });
    }

    // إنشاء صور السيارة إذا كانت موجودة
    if (images && Array.isArray(images) && images.length > 0) {
      try {
        console.log(`محاولة إنشاء ${images.length} صورة للسيارة ${newCar.id}`);

        for (let i = 0; i < images.length; i++) {
          const imagePath = images[i];
          if (imagePath && imagePath.trim() !== '') {
            await dbHelpers.prisma.car_images.create({
              data: {
                carId: newCar.id,
                fileName: imagePath.split('/').pop() || `image_${i + 1}`,
                fileUrl: imagePath,
                fileSize: 0, // سيتم تحديثه لاحقاً
                isPrimary: i === 0, // الصورة الأولى تكون أساسية
                uploadedBy: user.id,
                category: 'listings',
              },
            });

            console.log(`✅ تم إنشاء الصورة ${i + 1}: ${imagePath.substring(0, 50)}...`);
          }
        }
      } catch (error) {
        console.error('تحذير: خطأ في إنشاء صور السيارة:', error);
        // لا نُوقف العملية، فقط نسجل التحذير
      }
    } else {
      console.log('تحذير: لا توجد صور لرفعها أو المصفوفة فارغة');
    }

    // التحقق من نوع الإعلان وإنشاء مزاد إذا لزم الأمر
    let newAuction = null;
    if (carData.listingType === 'auction') {
      try {
        // حساب وقت البداية والنهاية
        let startTime = new Date();
        const auctionStartTime = carData.auctionStartTime || 'now';

        if (auctionStartTime === 'after_30_seconds') {
          startTime = new Date(Date.now() + 30 * 1000); // بعد 30 ثانية
        } else if (auctionStartTime === 'after_1_hour') {
          startTime = new Date(Date.now() + 60 * 60 * 1000);
        } else if (auctionStartTime === 'after_24_hours') {
          startTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
        } else if (auctionStartTime === 'custom' && carData.auctionCustomStartTime) {
          startTime = new Date(carData.auctionCustomStartTime);
        }

        // حساب وقت النهاية بناءً على المدة
        const duration = carData.auctionDuration || '1_week';
        let endTime = new Date(startTime);

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
        const now = new Date();
        let auctionStatus: 'UPCOMING' | 'ACTIVE' | 'ENDED' = 'UPCOMING';
        if (startTime <= now && endTime > now) {
          auctionStatus = 'ACTIVE';
        } else if (endTime <= now) {
          auctionStatus = 'ENDED';
        }

        // إنشاء معرف فريد للمزاد (مطلوب حسب schema.prisma)
        const auctionId = `auction_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

        // إنشاء المزاد - استخدام أسماء الحقول الصحيحة من schema.prisma
        newAuction = await dbHelpers.prisma.auctions.create({
          data: {
            id: auctionId, // المعرف الفريد للمزاد - مطلوب
            title: carData.title || `${carData.brand} ${carData.model} ${carData.year}`,
            description: carData.description || '',
            carId: newCar.id,
            sellerId: user.id,
            startPrice: priceNum, // اسم الحقل في schema
            currentPrice: priceNum,
            minimumBid: 500.0, // اسم الحقل في schema
            startDate: startTime, // اسم الحقل في schema
            endDate: endTime, // اسم الحقل في schema
            status: auctionStatus,
            featured: false,
            updatedAt: new Date(), // مطلوب في schema
          },
        });

        console.log('✅ تم إنشاء المزاد بنجاح:', {
          auctionId: newAuction.id,
          carId: newCar.id,
          status: auctionStatus,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          listingType: carData.listingType,
          redirectUrl: `/auctions?new=true&id=${newAuction.id}`,
        });

        console.log('📍 للتحقق من المزاد، اذهب إلى:', `http://localhost:3021/auctions?new=true&id=${newAuction.id}`);
      } catch (auctionError) {
        console.error('❌ خطأ في إنشاء المزاد:', auctionError);
      }
    }

    // Invalidate marketplace caches so the new listing appears immediately
    try {
      // تنظيف كاش SSR وواجهات السوق الفوري لضمان ظهور الإعلان الجديد فوراً
      await invalidateCacheOnUpdate('car');
      await advancedCache.invalidateByTag(CacheTags.CAR_LIST, CacheNamespaces.CAR);
      await invalidateCache('marketplace:cars*');
      await invalidateCache('marketplace:ssr*');
      await invalidateCache('cars:featured*');
      await invalidateCache('cars:recent*');

      // تنظيف cache المزادات أيضاً إذا كان النوع مزاد
      if (carData.listingType === 'auction') {
        await invalidateCache('api:auctions:list:*');
        await invalidateCache('auctions:*');
        console.log('✅ تم تنظيف cache المزادات بعد إنشاء مزاد جديد');
      }
    } catch (e) {
      console.warn('[cache] failed to invalidate cache', e);
    }

    return res.status(201).json({
      success: true,
      message: newAuction ? 'تم إنشاء المزاد بنجاح' : 'تم إنشاء إعلان السيارة بنجاح',
      data: {
        car: newCar,
        auction: newAuction,
        listingId: newAuction ? newAuction.id : newCar.id,
        listingType: carData.listingType || 'marketplace',
        redirectUrl: newAuction
          ? `/auctions?new=true&id=${newAuction.id}`
          : `/marketplace/${newCar.id}`,
        user: {
          id: user.id,
          name: user.name,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ خطأ عام غير متوقع في إنشاء الإعلان:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack:
        process.env.NODE_ENV === 'development' && error instanceof Error
          ? error.stack?.split('\n').slice(0, 10)
          : undefined,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      requestId: req.headers['x-request-id'] || 'unknown',
    });

    return res.status(500).json({
      success: false,
      error: 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني',
      code: 'INTERNAL_SERVER_ERROR',
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
      details:
        process.env.NODE_ENV === 'development'
          ? {
            originalError: error instanceof Error ? error.message : 'Unknown error',
            errorType: error instanceof Error ? error.constructor.name : typeof error,
            stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
          }
          : {
            message: 'للحصول على تفاصيل أكثر، يرجى التواصل مع الدعم الفني',
          },
    });
  }
}
