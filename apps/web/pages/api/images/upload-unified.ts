/**
 * API موحد ومحدث لرفع صور السيارات
 * متوافق مع النظام الموحد والخدمات الجديدة
 */

import { File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import apiResponse from '../../../lib/api/response';
import { uploadBufferToBlob } from '../../../lib/blob';
import { logger } from '../../../lib/core/logging/UnifiedLogger';
import prisma from '../../../lib/prisma';

// تعطيل body parser والإعدادات المحسنة
export const config = {
  api: {
    bodyParser: false,
    responseLimit: '50mb',
    externalResolver: true,
  },
  maxDuration: 300, // 5 دقائق
};

interface ImageProcessResult {
  success: boolean;
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  logger.startPerformanceTracking('upload-image-unified');

  try {
    logger.info('API رفع الصور الموحد - طلب جديد', {
      method: req.method,
      userAgent: req.headers['user-agent'],
      contentType: req.headers['content-type'],
      contentLength: req.headers['content-length'],
    });

    // إعداد CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // معالجة OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // التحقق من الطريقة
    if (req.method !== 'POST') {
      return apiResponse.methodNotAllowed(res, ['POST']);
    }

    // التحقق من Content-Type
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return apiResponse.badRequest(
        res,
        'يجب أن يكون Content-Type من نوع multipart/form-data',
        null,
        { contentType },
        'INVALID_CONTENT_TYPE',
      );
    }

    return await processImageUpload(req, res);
  } catch (error) {
    logger.error('خطأ عام في API رفع الصور:', error);
    return apiResponse.serverError(
      res,
      'خطأ في الخادم',
      error instanceof Error ? error.message : 'خطأ غير محدد',
      { route: 'api/images/upload-unified' },
      'SERVER_ERROR',
    );
  } finally {
    logger.endPerformanceTracking('upload-image-unified', 'API رفع الصور مكتمل');
  }
}

async function processImageUpload(req: NextApiRequest, res: NextApiResponse) {
  try {
    // تحليل النموذج والملفات
    const { fields, files } = await parseMultipartForm(req);

    logger.info('تم تحليل النموذج بنجاح', {
      fieldsCount: Object.keys(fields).length,
      filesCount: Object.keys(files).length,
    });

    // التحقق من وجود الملف
    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) {
      return apiResponse.badRequest(
        res,
        'لم يتم العثور على ملف الصورة',
        null,
        {},
        'MISSING_IMAGE_FILE',
      );
    }

    // الحصول على المعلومات الإضافية
    const category = getFieldValue(fields.category, 'listings');
    const userId = getFieldValue(fields.userId);
    const carId = getFieldValue(fields.carId);

    logger.info('معلومات رفع الصورة', {
      category,
      userId: userId || 'غير محدد',
      carId: carId || 'غير محدد',
      fileName: file.originalFilename,
      fileSize: file.size,
      mimetype: file.mimetype,
    });

    // التحقق من صحة الصورة
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      // حذف الملف المؤقت
      await cleanupTempFile(file.filepath);
      return apiResponse.badRequest(res, validation.error!, null, {}, 'INVALID_IMAGE');
    }

    // معالجة وحفظ الصورة
    const processResult = await processAndSaveImage(file, category, userId, carId);

    if (!processResult.success) {
      return apiResponse.serverError(
        res,
        processResult.error || 'فشل في معالجة الصورة',
        null,
        { route: 'upload-unified' },
        'IMAGE_PROCESSING_ERROR',
      );
    }

    // إنشاء الاستجابة
    const responseData = {
      fileName: processResult.fileName!,
      fileUrl: processResult.fileUrl!,
      url: processResult.fileUrl!, // للتوافق مع النظام القديم
      fileSize: processResult.fileSize || 0,
      category,
      uploadId: generateUploadId(),
    };

    logger.info('تم رفع الصورة بنجاح', responseData);

    return apiResponse.ok(
      res,
      responseData,
      {
        route: 'api/images/upload-unified',
        message: 'تم رفع الصورة بنجاح',
      },
      'IMAGE_UPLOADED',
    );
  } catch (error) {
    logger.error('خطأ في معالجة رفع الصورة:', error);

    let statusCode = 500;
    let message = 'خطأ في معالجة الصورة';

    if (error instanceof Error) {
      if (error.message.includes('LIMIT_FILE_SIZE')) {
        statusCode = 413;
        message = 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت';
      } else if (error.message.includes('timeout')) {
        statusCode = 408;
        message = 'انتهت مهلة معالجة الطلب';
      } else if (error.message.includes('ENOSPC')) {
        statusCode = 507;
        message = 'مساحة التخزين ممتلئة';
      } else if (error.message.includes('EACCES') || error.message.includes('EPERM')) {
        statusCode = 403;
        message = 'لا توجد صلاحيات كافية';
      }
    }

    return res.status(statusCode).json({
      success: false,
      error: message,
      code: 'IMAGE_PROCESSING_ERROR',
    });
  }
}

/**
 * تحليل النموذج متعدد الأجزاء
 */
async function parseMultipartForm(req: NextApiRequest): Promise<{
  fields: Record<string, string | string[]>;
  files: Record<string, FormidableFile | FormidableFile[]>;
}> {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(os.tmpdir(), 'sooq-mazad', 'uploads', 'temp');

    // إنشاء المجلد إذا لم يكن موجوداً
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxFiles: 1,
      allowEmptyFiles: false,
      minFileSize: 1024, // 1KB
      hashAlgorithm: false,
    });

    const timeout = setTimeout(() => {
      reject(new Error('انتهت مهلة تحليل النموذج'));
    }, 30000); // 30 ثانية

    form.parse(req, (err, fields, files) => {
      clearTimeout(timeout);

      if (err) {
        logger.error('خطأ في تحليل النموذج:', err);

        let message = 'خطأ في تحليل النموذج';
        if (err.code === 'LIMIT_FILE_SIZE') {
          message = 'حجم الملف كبير جداً';
        } else if (err.code === 'ENOENT') {
          message = 'مشكلة في حفظ الملف المؤقت';
        }

        reject(new Error(message));
      } else {
        resolve({
          fields: fields as Record<string, string | string[]>,
          files: files as Record<string, FormidableFile | FormidableFile[]>,
        });
      }
    });
  });
}

/**
 * الحصول على قيمة الحقل
 */
function getFieldValue(
  field: string | string[] | undefined,
  defaultValue?: string,
): string | undefined {
  if (Array.isArray(field)) {
    return field[0] || defaultValue;
  }
  return field || defaultValue;
}

/**
 * التحقق من صحة ملف الصورة
 */
function validateImageFile(file: FormidableFile): { isValid: boolean; error?: string; } {
  // التحقق من النوع
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: `نوع الملف غير مدعوم. الأنواع المسموحة: ${allowedTypes.join(', ')}`,
    };
  }

  // التحقق من الحجم
  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت',
    };
  }

  // التحقق من الحد الأدنى للحجم
  if (file.size < 1024) {
    return {
      isValid: false,
      error: 'حجم الملف صغير جداً',
    };
  }

  // التحقق من وجود الملف
  if (!fs.existsSync(file.filepath)) {
    return {
      isValid: false,
      error: 'الملف المؤقت غير موجود',
    };
  }

  return { isValid: true };
}

/**
 * معالجة وحفظ الصورة
 */
async function processAndSaveImage(
  file: FormidableFile,
  category: string,
  userId?: string,
  carId?: string,
): Promise<ImageProcessResult> {
  try {
    // إنشاء اسم ملف فريد
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(file.originalFilename || '') || '.jpg';
    const fileName = `${category}_${timestamp}_${randomString}${extension}`;

    // رفع الصورة إلى Vercel Blob
    const inputBuffer = await fs.promises.readFile(file.filepath);

    const processedBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(1200, 900, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer();

    const folder = `images/cars/${category}`;
    const uploaded = await uploadBufferToBlob({
      buffer: processedBuffer,
      filename: fileName,
      contentType: 'image/jpeg',
      folder,
    });

    // حذف الملف المؤقت
    await cleanupTempFile(file.filepath);

    // إنشاء URL للصورة
    const fileUrl = uploaded.url;

    // حفظ معلومات الصورة في قاعدة البيانات
    if (userId) {
      try {
        await prisma.car_images.create({
          data: {
            fileName,
            fileUrl,
            fileSize: file.size,
            category,
            uploadedBy: userId,
            carId: carId || null,
            isPrimary: false,
          },
        });

        logger.info('تم حفظ معلومات الصورة في قاعدة البيانات', { fileName, fileUrl });
      } catch (dbError) {
        logger.warn('تحذير: فشل في حفظ معلومات الصورة في قاعدة البيانات', dbError);
        // لا نوقف العملية
      }
    }

    return {
      success: true,
      fileName,
      fileUrl,
      fileSize: file.size,
    };
  } catch (error) {
    logger.error('خطأ في معالجة الصورة:', error);

    // حذف الملف المؤقت في حالة الخطأ
    await cleanupTempFile(file.filepath);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ في معالجة الصورة',
    };
  }
}

/**
 * حذف الملف المؤقت
 */
async function cleanupTempFile(filepath: string): Promise<void> {
  try {
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    logger.warn('تحذير: فشل في حذف الملف المؤقت', error);
  }
}

/**
 * إنشاء معرف رفع فريد
 */
function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}
