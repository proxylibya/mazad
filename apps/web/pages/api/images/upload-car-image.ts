import { File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { uploadBufferToBlob } from '../../../lib/blob';
import prisma from '../../../lib/prisma';
import { verifyToken } from '../../../middleware/auth';
import { imageManager } from '../../../utils/imageManager';
import { logger } from '../../../utils/logger';
import { withUploadRateLimit } from '../../../utils/rateLimiter';
import { UPLOAD_CONFIG } from '../../../utils/uploadConfig';

// استخدام عميل Prisma الموحّد (Singleton) لتجنّب فتح اتصالات متعددة

// تعطيل parser الافتراضي لـ Next.js وإعدادات محسنة لرفع الملفات
export const config = {
  api: {
    bodyParser: false,
    // زيادة حد حجم الطلب إلى 50MB
    responseLimit: '50mb',
    // زيادة timeout إلى 5 دقائق
    externalResolver: true,
  },
  // إعدادات إضافية للأداء
  maxDuration: 300, // 5 دقائق
};

// تمت إزالة النوع غير المستخدم UploadResponse لتفادي تحذير اللينتر

interface ImageUploadResult {
  success: boolean;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // إعداد cache control لتجنب التخزين المؤقت
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // إعداد CORS headers آمنة - تقييد للنطاق المحلي فقط
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:3000',
    'https://localhost:3000',
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  ].filter(Boolean);

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // التعامل مع preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // التحقق من أن الطريقة هي POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // التحقق من المصادقة - مرن في وضع التطوير
  const user = await verifyToken(req);
  const isDevelopment = process.env.NODE_ENV === 'development';

  let isAuthenticated = !!user;

  if (!isAuthenticated) {

  }

  if (!isAuthenticated && !isDevelopment) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  if (!isAuthenticated && isDevelopment) {
    console.warn('⚠️ [تحذير] رفع صورة بدون مصادقة في وضع التطوير');
  }

  // إضافة headers للاستجابة أولاً لضمان إرجاع JSON
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // إضافة معالج خطأ عام لضمان إرجاع JSON دائماً
  const sendErrorResponse = (statusCode: number, message: string, error?: string) => {
    try {
      return res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? error : undefined,
      });
    } catch (jsonError) {
      // في حالة فشل إرسال JSON، أرسل نص بسيط
      res.setHeader('Content-Type', 'text/plain');
      return res.status(statusCode).send(`Error: ${message}`);
    }
  };

  logger.info('🚀 بدء معالجة طلب رفع الصورة', {
    requestId,
    method: req.method,
    url: req.url,
    headers: Object.keys(req.headers),
    contentType: req.headers['content-type'],
    contentLength: req.headers['content-length'],
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString(),
  });

  // لا حاجة لتكرار فحص OPTIONS/POST هنا لأنه تم أعلاه

  // التحقق من Content-Type
  const contentType = req.headers['content-type'] || '';

  if (!contentType.includes('multipart/form-data')) {
    return sendErrorResponse(
      400,
      'يجب أن يكون Content-Type من نوع multipart/form-data',
      `Invalid Content-Type: ${contentType}`,
    );
  }

  try {
    // تحليل النموذج والملفات مع معالجة أفضل للأخطاء
    const { fields, files } = await parseForm(req);

    console.log(`[تم بنجاح] [${requestId}] تم تحليل النموذج بنجاح:`, {
      fieldsKeys: Object.keys(fields),
      filesKeys: Object.keys(files),
      fieldsData: fields,
      filesCount: Object.keys(files).length,
      parseTime: `${Date.now() - startTime}ms`,
    });

    // التحقق من وجود الملف
    console.log('[البحث] فحص الملفات المرفوعة:', {
      imageFile: files.image ? 'موجود' : 'غير موجود',
      imageType: typeof files.image,
      isArray: Array.isArray(files.image),
      allFiles: Object.keys(files),
    });

    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) {
      return sendErrorResponse(400, 'لم يتم العثور على ملف الصورة');
    }

    console.log('[تم بنجاح] تم العثور على ملف الصورة:', {
      originalFilename: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      filepath: file.filepath,
    });

    // الحصول على معلومات إضافية - التعامل مع Arrays
    const category = Array.isArray(fields.category)
      ? fields.category[0]
      : (fields.category as string) || 'listings';
    const userId = Array.isArray(fields.userId)
      ? fields.userId[0]
      : (fields.userId as string) || user?.id || 'anonymous';
    const listingId = Array.isArray(fields.listingId)
      ? fields.listingId[0]
      : (fields.listingId as string);

    const formidableFile = file as FormidableFile;

    console.log('📤 معلومات رفع الصورة:', {
      category,
      userId: userId || 'غير محدد',
      listingId: listingId || 'غير محدد',
      fileName: formidableFile.originalFilename,
      fileSize: formidableFile.size,
      mimetype: formidableFile.mimetype,
      filepath: formidableFile.filepath,
    });

    // التحقق من صحة الصورة
    const validationResult = imageManager.validateImage(formidableFile);
    if (!validationResult.isValid) {
      // حذف الملف المؤقت
      if (fs.existsSync(formidableFile.filepath)) {
        fs.unlinkSync(formidableFile.filepath);
      }

      return res.status(400).json({
        success: false,
        message: validationResult.error || 'الصورة غير صحيحة',
      });
    }

    // معالجة الصورة وحفظها

    const processedImage = await processCarImage(formidableFile, category, userId, listingId);

    if (!processedImage.success) {
      // تحديد نوع الخطأ لإرجاع رمز حالة مناسب
      let statusCode = 500;
      if (processedImage.error?.includes('صلاحيات') || processedImage.error?.includes('الوصول')) {
        statusCode = 403;
      } else if (processedImage.error?.includes('مجلد') || processedImage.error?.includes('نقل')) {
        statusCode = 507; // Insufficient Storage
      }

      return sendErrorResponse(
        statusCode,
        processedImage.error || 'فشل في معالجة الصورة',
        processedImage.error,
      );
    }

    const uploadId = generateUploadId();

    // التأكد من وجود البيانات المطلوبة
    if (!processedImage.fileName || !processedImage.fileUrl) {
      return sendErrorResponse(
        500,
        'فشل في معالجة الصورة - بيانات غير مكتملة',
        'Missing fileName or fileUrl in processed image',
      );
    }

    const processingTime = Date.now() - startTime;

    // التأكد من صحة URL الصورة
    const finalFileUrl =
      processedImage.fileUrl.startsWith('http://') || processedImage.fileUrl.startsWith('https://')
        ? processedImage.fileUrl
        : processedImage.fileUrl.startsWith('/')
          ? processedImage.fileUrl
          : `/${processedImage.fileUrl}`;

    const responseData = {
      success: true,
      message: 'تم رفع الصورة بنجاح',
      fileName: processedImage.fileName,
      fileUrl: finalFileUrl,
      url: finalFileUrl, // إضافة url كخيار احتياطي
      fileSize: processedImage.fileSize || 0,
      uploadId,
      category,
      processingTime: `${processingTime}ms`,
      data: {
        fileName: processedImage.fileName,
        fileUrl: finalFileUrl,
        url: finalFileUrl, // إضافة url كخيار احتياطي
        fileSize: processedImage.fileSize || 0,
        uploadId,
        category,
      },
    };

    console.log(`[تم بنجاح] [${requestId}] إرسال استجابة نجاح رفع الصورة:`, {
      ...responseData,
      totalTime: processingTime,
    });

    // التأكد من إرسال الاستجابة بشكل صحيح
    try {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      return res.status(200).json(responseData);
    } catch (responseError) {
      console.error('خطأ في إرسال الاستجابة:', responseError);
      return sendErrorResponse(500, 'خطأ في إرسال الاستجابة');
    }
  } catch (error) {
    const processingTime = Date.now() - startTime;

    logger.error(`[فشل] [${requestId}] خطأ عام في رفع الصورة`, {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: `${processingTime}ms`,
      requestId,
    });

    console.error(`[فشل] [${requestId}] خطأ عام في رفع الصورة:`, {
      error: error instanceof Error ? error.message : error,
      processingTime: `${processingTime}ms`,
    });

    // تحديد نوع الخطأ ورسالة مناسبة
    let statusCode = 500;
    let friendlyMessage = 'حدث خطأ في الخادم أثناء رفع الصورة';

    if (error instanceof Error) {
      if (error.message.includes('حجم الملف') || error.message.includes('LIMIT_FILE_SIZE')) {
        statusCode = 413;
        friendlyMessage = 'حجم الملف كبير جداً. الحد الأقصى 50 ميجابايت';
      } else if (error.message.includes('نوع الملف') || error.message.includes('نوع الصورة')) {
        statusCode = 415;
        friendlyMessage = 'نوع الملف غير مدعوم. استخدم JPG، PNG، أو WebP';
      } else if (error.message.includes('انتهت مهلة') || error.message.includes('timeout')) {
        statusCode = 408;
        friendlyMessage = 'انتهت مهلة معالجة الطلب. جرب مرة أخرى';
      } else if (
        error.message.includes('مجلد') ||
        error.message.includes('نقل') ||
        error.message.includes('ENOSPC')
      ) {
        statusCode = 507;
        friendlyMessage = 'مساحة التخزين ممتلئة أو مشكلة في نظام الملفات';
      } else if (
        error.message.includes('صلاحيات') ||
        error.message.includes('EACCES') ||
        error.message.includes('EPERM')
      ) {
        statusCode = 403;
        friendlyMessage = 'لا توجد صلاحيات كافية لحفظ الملف';
      } else if (
        error.message.includes('الخادم مشغول') ||
        error.message.includes('EMFILE') ||
        error.message.includes('ENFILE')
      ) {
        statusCode = 503;
        friendlyMessage = 'الخادم مشغول حالياً. يرجى المحاولة بعد قليل';
      }
    }

    return sendErrorResponse(
      statusCode,
      friendlyMessage,
      error instanceof Error ? error.message : 'خطأ غير معروف',
    );
  } finally {
    // نستخدم عميل Prisma الموحّد على مستوى التطبيق؛ لا نقوم بإغلاق الاتصال لكل طلب
  }
};

// دالة لتحليل النموذج والملفات - محسنة
async function parseForm(req: NextApiRequest): Promise<{
  fields: Record<string, string | string[]>;
  files: Record<string, FormidableFile | FormidableFile[]>;
}> {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(os.tmpdir(), 'sooq-mazad', 'uploads', 'temp');

    try {
      // إنشاء مجلد الرفع المؤقت إذا لم يكن موجوداً
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });

        // التحقق من صلاحيات الكتابة
        try {
          fs.accessSync(uploadDir, fs.constants.W_OK);
        } catch (accessError) {
          console.error('[فشل] لا توجد صلاحيات كتابة في مجلد الرفع:', accessError);
          reject(new Error('لا توجد صلاحيات كتابة في مجلد الرفع'));
          return;
        }
      } else {
      }
    } catch (dirError) {
      console.error('[فشل] خطأ في إنشاء مجلد الرفع:', dirError);
      reject(
        new Error(
          `فشل في إنشاء مجلد الرفع المؤقت: ${dirError instanceof Error ? dirError.message : dirError}`,
        ),
      );
      return;
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
      multiples: false,
      // إضافة إعدادات إضافية لتحسين الأداء
      maxFields: 10,
      maxFieldsSize: 2 * 1024 * 1024, // 2MB للحقول
      // إضافة إعدادات لحل مشكلة الرفع
      allowEmptyFiles: false,
      minFileSize: UPLOAD_CONFIG.MIN_FILE_SIZE,
      // تعطيل hashing لتسريع الرفع
      hashAlgorithm: false,
    });

    // استخدام timeout من التكوين
    const parseTimeout = setTimeout(() => {
      console.error(`⏰ انتهت مهلة تحليل النموذج (${UPLOAD_CONFIG.TIMEOUTS.PARSE / 1000} ثانية)`);
      reject(new Error(UPLOAD_CONFIG.ERROR_MESSAGES.TIMEOUT_ERROR));
    }, UPLOAD_CONFIG.TIMEOUTS.PARSE);

    form.parse(req, (err, fields, files) => {
      clearTimeout(parseTimeout);

      if (err) {
        console.error('[فشل] خطأ في تحليل النموذج:', {
          error: err.message,
          code: err.code,
          httpCode: err.httpCode,
        });

        // تحويل أخطاء formidable إلى رسائل مفهومة باستخدام التكوين
        let friendlyMessage = UPLOAD_CONFIG.ERROR_MESSAGES.PARSE_ERROR;
        if (err.code === 'LIMIT_FILE_SIZE' || err.message.includes('maxFileSize')) {
          friendlyMessage = UPLOAD_CONFIG.ERROR_MESSAGES.FILE_TOO_LARGE;
        } else if (err.code === 'ENOENT') {
          friendlyMessage = 'مشكلة في حفظ الملف المؤقت. يرجى المحاولة مرة أخرى';
        } else if (err.code === 'EMFILE' || err.code === 'ENFILE') {
          friendlyMessage = 'الخادم مشغول حالياً. يرجى المحاولة بعد قليل';
        } else if (err.code === 'EACCES' || err.code === 'EPERM') {
          friendlyMessage = 'لا توجد صلاحيات كافية لحفظ الملف';
        } else if (err.code === 'ENOSPC') {
          friendlyMessage = 'مساحة التخزين ممتلئة. يرجى المحاولة لاحقاً';
        } else if (err.message.includes('aborted')) {
          friendlyMessage = 'تم إلغاء رفع الملف. يرجى المحاولة مرة أخرى';
        } else if (err.message.includes('timeout')) {
          friendlyMessage = UPLOAD_CONFIG.ERROR_MESSAGES.TIMEOUT_ERROR;
        }

        reject(new Error(friendlyMessage));
      } else {
        console.log('[تم بنجاح] تم تحليل النموذج بنجاح:', {
          fieldsCount: Object.keys(fields).length,
          filesCount: Object.keys(files).length,
          fields: fields,
          fileNames: Object.keys(files),
        });
        resolve({
          fields: fields as Record<string, string | string[]>,
          files: files as Record<string, FormidableFile | FormidableFile[]>,
        });
      }
    });

    // معالجة أخطاء الاتصال
    form.on('error', (err) => {
      clearTimeout(parseTimeout);
      console.error('[فشل] خطأ في form parsing:', err);
      reject(err);
    });

    form.on('aborted', () => {
      clearTimeout(parseTimeout);
      console.error('[فشل] تم إلغاء رفع الملف');
      reject(new Error('تم إلغاء رفع الملف'));
    });
  });
}

// دالة لمعالجة صورة السيارة وحفظها
async function processCarImage(
  file: FormidableFile,
  category: string,
  userId?: string,
  listingId?: string,
): Promise<ImageUploadResult> {
  try {
    console.log('[التحديث] بدء معالجة الصورة:', {
      originalFilename: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      filepath: file.filepath,
    });

    // التحقق من وجود الملف المؤقت
    if (!fs.existsSync(file.filepath)) {
      throw new Error('الملف المؤقت غير موجود');
    }

    // التحقق من حجم الملف
    const stats = fs.statSync(file.filepath);
    if (stats.size === 0) {
      throw new Error('الملف فارغ');
    }

    // إنشاء اسم ملف فريد
    const timestamp = Date.now();
    const extension = path.extname(file.originalFilename || '') || '.jpg';
    const fileName = `${category}_${userId || 'user'}_${listingId || 'listing'}_${timestamp}${extension}`;

    const originalBuffer = await fs.promises.readFile(file.filepath);
    const originalContentType = file.mimetype || 'application/octet-stream';

    const baseName = path.parse(fileName).name;
    const webpName = `${baseName}.webp`;
    const thumbName = `${baseName}-thumb.webp`;

    const [webpBuffer, thumbBuffer] = await Promise.all([
      sharp(originalBuffer).rotate().webp({ quality: 80 }).toBuffer(),
      sharp(originalBuffer)
        .rotate()
        .resize(480, 360, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer(),
    ]);

    const folder = `images/cars/${category}`;

    const uploadedWebp = await uploadBufferToBlob({
      buffer: webpBuffer,
      filename: webpName,
      contentType: 'image/webp',
      folder,
    });

    await fs.promises.unlink(file.filepath).catch(() => { });

    // نعتمد نسخة WebP كرابط أساسي للعرض
    const fileUrl = uploadedWebp.url;

    // حفظ معلومات الصورة في قاعدة البيانات (اختياري)
    if (userId) {
      try {
        const carImage = await prisma.car_images.create({
          data: {
            fileName,
            fileUrl,
            fileSize: file.size,
            category,
            uploadedBy: userId,
            carId: listingId || null,
            isPrimary: false, // يمكن تعديلها لاحقاً
          },
        });

        console.log('[تم بنجاح] تم حفظ معلومات الصورة في قاعدة البيانات:', carImage.id);
      } catch (dbError) {
        console.error('[فشل] خطأ في حفظ معلومات الصورة في قاعدة البيانات:', dbError);
        console.error('تفاصيل الخطأ:', {
          error: dbError instanceof Error ? dbError.message : dbError,
          userId,
          listingId,
          fileName,
          fileUrl,
        });
        // لا نفشل العملية إذا فشل حفظ قاعدة البيانات
        // لكن نسجل الخطأ للمراجعة
      }
    } else {
    }

    return {
      success: true,
      fileName,
      fileUrl,
      fileSize: file.size,
    };
  } catch (error) {
    console.error('[فشل] خطأ في معالجة صورة السيارة:', error);

    // تحديد نوع الخطأ لإرجاع رسالة مناسبة
    let errorMessage = 'فشل في معالجة الصورة';
    if (error instanceof Error) {
      if (error.message.includes('ENOSPC')) {
        errorMessage = 'مساحة التخزين ممتلئة';
      } else if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
        errorMessage = 'لا توجد صلاحيات كافية لحفظ الملف';
      } else if (error.message.includes('EMFILE') || error.message.includes('ENFILE')) {
        errorMessage = 'الخادم مشغول حالياً';
      } else {
        errorMessage = error.message;
      }
    }

    // تنظيف الملف المؤقت في حالة الخطأ
    try {
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
    } catch (cleanupError) {
      console.error('خطأ في تنظيف الملف المؤقت:', cleanupError);
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// دالة لإنشاء معرف فريد للرفع
function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// دالة لتنظيف الملفات المؤقتة القديمة (يمكن استدعاؤها دورياً)
export function cleanupOldTempFiles(): void {
  try {
    const tempDir = path.join(process.cwd(), 'uploads', 'temp');
    if (!fs.existsSync(tempDir)) return;

    const files = fs.readdirSync(tempDir);
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000; // 24 ساعة

    files.forEach((file) => {
      const filePath = path.join(tempDir, file);
      const stats = fs.statSync(filePath);

      if (stats.mtime.getTime() < cutoffTime) {
        fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    console.error('خطأ في تنظيف الملفات المؤقتة:', error);
  }
}

export default withUploadRateLimit(handler);
