import { File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';
import { uploadBufferToBlob } from '../../../lib/blob';
import { withUploadRateLimit } from '../../../utils/rateLimiter';

// تعطيل parser الافتراضي لـ Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

interface UploadResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  code?: string;
  details?: any;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<UploadResponse>) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'طريقة غير مدعومة',
    });
  }
  // متغيرات على مستوى الدالة ليتم استخدامها في finally
  let fields: any = {};
  let files: any = {};

  try {
    // التحقق من المصادقة
    const authHeader = req.headers.authorization;
    let verifiedUser = null;
    if (!authHeader || authHeader === 'undefined' || authHeader === 'null') {
      return res.status(401).json({
        success: false,
        error: 'مطلوب تسجيل الدخول لرفع الملفات',
        code: 'AUTH_REQUIRED',
      });
    }

    const authToken = authHeader.substring(7);
    try {
      const decoded = jwt.verify(authToken, process.env.JWT_SECRET!) as any;
      if (!decoded || !decoded.userId) {
        throw new Error('Invalid token payload');
      }
      verifiedUser = {
        id: decoded.userId,
        name: decoded.name || 'مستخدم',
        role: decoded.role || 'USER',
      };
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        error: 'رمز المصادقة غير صالح أو منتهي الصلاحية',
        code: 'INVALID_TOKEN',
      });
    }

    const userId = verifiedUser.id;

    // معالجة النموذج والملفات

    {
      const parsed = await parseForm(req);
      fields = parsed.fields;
      files = parsed.files;
    }

    console.log('[معلومات] الملفات المستلمة:', {
      filesKeys: Object.keys(files),
      fieldsKeys: Object.keys(fields),
      totalFiles: Object.keys(files).length,
    });

    // البحث عن الملف في جميع المفاتيح المحتملة
    let file: FormidableFile | null = null;

    if (files.image) {
      file = Array.isArray(files.image) ? files.image[0] : files.image;
    } else if (files.file) {
      file = Array.isArray(files.file) ? files.file[0] : files.file;
    } else {
      // البحث في جميع الملفات المرفوعة
      const allFiles = Object.values(files).flat();
      if (allFiles.length > 0) {
        file = allFiles[0] as FormidableFile;
      }
    }

    if (file) {
      console.log('[معلومات] تفاصيل الملف:', {
        originalFilename: file.originalFilename,
        mimetype: file.mimetype,
        size: file.size,
        filepath: file.filepath,
        newFilename: file.newFilename,
        exists: require('fs').existsSync(file.filepath),
      });
    } else {
      console.log('لم يتم العثور على ملف صورة في الطلب');
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم العثور على ملف الصورة',
      });
    }

    // التحقق من صحة الصورة
    const validationResult = validateImage(file);
    if (!validationResult.isValid) {
      // حذف الملف المؤقت
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }

      return res.status(400).json({
        success: false,
        error: validationResult.error || 'الصورة غير صحيحة',
      });
    }

    // إنشاء اسم ملف فريد
    const timestamp = Date.now();
    let fileExtension = '';

    // محاولة الحصول على الامتداد من اسم الملف الأصلي
    if (file.originalFilename) {
      fileExtension = path.extname(file.originalFilename);
    }

    // إذا لم نجد امتداد، نحاول استنتاجه من نوع MIME
    if (!fileExtension && file.mimetype) {
      switch (file.mimetype) {
        case 'image/jpeg':
        case 'image/jpg':
          fileExtension = '.jpg';
          break;
        case 'image/png':
          fileExtension = '.png';
          break;
        case 'image/webp':
          fileExtension = '.webp';
          break;
        case 'image/gif':
          fileExtension = '.gif';
          break;
        default:
          fileExtension = '.jpg'; // افتراضي
      }
    }

    // إذا لم نجد امتداد بعد، نحاول قراءة بداية الملف لتحديد النوع
    if (!fileExtension) {
      try {
        const fd = fs.openSync(file.filepath, 'r');
        const buffer = Buffer.alloc(10);
        fs.readSync(fd, buffer, 0, 10, 0);
        fs.closeSync(fd);
        const header = buffer.toString('hex').toUpperCase();

        if (header.startsWith('FFD8FF')) {
          fileExtension = '.jpg';
          console.log('تم اكتشاف JPG من header');
        } else if (header.startsWith('89504E47')) {
          fileExtension = '.png';
          console.log('تم اكتشاف PNG من header');
        } else if (header.startsWith('47494638')) {
          fileExtension = '.gif';
          console.log('تم اكتشاف GIF من header');
        } else if (header.includes('57454250')) {
          fileExtension = '.webp';
          console.log('تم اكتشاف WEBP من header');
        } else {
          fileExtension = '.jpg'; // افتراضي
          console.log('استخدام الامتداد الافتراضي .jpg');
        }
      } catch (error) {
        console.warn('فشل في قراءة header الملف:', error);
        fileExtension = '.jpg'; // افتراضي
      }
    }

    const fileName = `transport_${timestamp}_${userId}${fileExtension}`;
    const upload = await fs.promises.readFile(file.filepath);
    const contentType = file.mimetype || 'application/octet-stream';
    const uploaded = await uploadBufferToBlob({
      buffer: upload,
      filename: fileName,
      contentType,
      folder: 'uploads/transport',
    });
    const imageUrl = uploaded.url;

    console.log('معلومات اسم الملف:', {
      originalFilename: file.originalFilename,
      detectedExtension: fileExtension,
      finalFileName: fileName,
      mimetype: file.mimetype,
    });

    await fs.promises.unlink(file.filepath).catch(() => { });

    console.log('[نجح] عملية رفع الصورة مكتملة:', {
      imageUrl,
      fileSize: file.size,
    });

    return res.status(200).json({
      success: true,
      imageUrl,
    });
  } catch (error) {
    console.error('[فشل] خطأ في رفع صورة النقل:', {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      type: typeof error,
    });

    // تحديد نوع الخطأ ورسالة مناسبة
    let statusCode = 500;
    let friendlyMessage = 'خطأ في الخادم أثناء رفع الصورة';

    if (error instanceof Error) {
      if (error.message.includes('EACCES') || error.message.includes('صلاحيات')) {
        statusCode = 403;
        friendlyMessage = 'لا توجد صلاحيات كافية لحفظ الملف';
      } else if (error.message.includes('ENOSPC')) {
        statusCode = 507;
        friendlyMessage = 'لا توجد مساحة كافية على الخادم';
      } else if (error.message.includes('ENOENT')) {
        statusCode = 404;
        friendlyMessage = 'مجلد الحفظ غير موجود';
      } else if (error.message.includes('حجم الملف') || error.message.includes('maxFileSize')) {
        statusCode = 413;
        friendlyMessage = 'حجم الملف كبير جداً';
      }
    }

    return res.status(statusCode).json({
      success: false,
      error: friendlyMessage,
      details:
        process.env.NODE_ENV === 'development'
          ? error instanceof Error
            ? error.message
            : error
          : undefined,
    });
  } finally {
    // تنظيف الملفات المؤقتة في حالة وجود خطأ
    try {
      if (files && typeof files === 'object') {
        const allFiles = Object.values(files).flat() as Array<FormidableFile>;
        for (const f of allFiles) {
          if (f && (f as any).filepath && fs.existsSync((f as any).filepath)) {
            try {
              fs.unlinkSync((f as any).filepath);
              console.log('تم حذف الملف المؤقت:', (f as any).filepath);
            } catch (cleanupError) {
              console.error('خطأ في حذف الملف المؤقت:', cleanupError);
            }
          }
        }
      }
    } catch (e) {
      console.warn('تحذير أثناء تنظيف الملفات المؤقتة:', e);
    }
  }
};

// دالة لمعالجة النموذج والملفات
async function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any; }> {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(os.tmpdir(), 'sooq-mazad', 'uploads', 'temp');

    // إنشاء مجلد الرفع المؤقت إذا لم يكن موجوداً
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB لصور النقل
      multiples: false,
      allowEmptyFiles: false,
      minFileSize: 1, // على الأقل 1 بايت
      maxFields: 10,
      maxFieldsSize: 2 * 1024 * 1024, // 2MB للحقول
      filename: (name, ext, part, form) => {
        // الحفاظ على اسم الملف الأصلي مع timestamp
        const timestamp = Date.now();
        const originalName = part.originalFilename || 'unknown';
        return `${timestamp}_${originalName}`;
      },
    });

    form.parse(req, (err, fields, files) => {
      console.log('[تحليل] نتيجة تحليل النموذج:', {
        hasError: !!err,
        errorMessage: err?.message,
        fieldsKeys: fields ? Object.keys(fields) : 'لا توجد حقول',
        filesKeys: files ? Object.keys(files) : 'لا توجد ملفات',
        filesCount: files ? Object.keys(files).length : 0,
      });

      if (err) {
        console.error('[فشل] خطأ في تحليل النموذج:', {
          message: err.message,
          code: err.code,
          stack: err.stack,
        });

        // تحديد نوع الخطأ وإرجاع رسالة مناسبة
        let friendlyError = 'خطأ في معالجة الملف';
        if (err.message.includes('maxFileSize')) {
          friendlyError = 'حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)';
        } else if (err.message.includes('aborted')) {
          friendlyError = 'تم إلغاء رفع الملف';
        } else if (err.message.includes('ENOENT')) {
          friendlyError = 'مشكلة في مجلد الرفع المؤقت';
        }

        reject(new Error(friendlyError));
      } else {
        if (!files || Object.keys(files).length === 0) {
        }
        resolve({ fields, files });
      }
    });

    // إضافة معالجات للأحداث
    form.on('error', (err) => {
      console.error('[فشل] خطأ في النموذج:', err);
    });

    form.on('fileBegin', (name, file) => {
      console.log('[بداية] بدء استقبال ملف:', {
        name,
        originalFilename: file.originalFilename,
      });
    });

    form.on('file', (name, file) => {
      console.log('[انتهاء] انتهاء استقبال ملف:', {
        name,
        originalFilename: file.originalFilename,
        size: file.size,
        filepath: file.filepath,
      });
    });
  });
}

// دالة للتحقق من صحة الصورة
function validateImage(file: FormidableFile): {
  isValid: boolean;
  error?: string;
} {
  console.log('تفاصيل التحقق من الملف:', {
    mimetype: file.mimetype,
    originalFilename: file.originalFilename,
    size: file.size,
    filepath: file.filepath,
  });

  // التحقق من وجود اسم الملف (مرن - يمكن أن يكون مفقود)
  if (!file.originalFilename || file.originalFilename.trim() === '') {
    console.warn('اسم الملف مفقود، سيتم استخدام اسم افتراضي:', {
      originalFilename: file.originalFilename,
      mimetype: file.mimetype,
      size: file.size,
    });
    // لا نرفض الملف، بل نتابع مع اسم افتراضي
  }

  // التحقق من حجم الملف (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت',
    };
  }

  // التحقق من امتداد الملف أولاً (أكثر موثوقية)
  const fileName = file.originalFilename || '';
  const fileExtension = fileName.split('.').pop()?.toLowerCase();
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

  // إذا كان الامتداد صحيح، نقبل الملف
  if (fileExtension && allowedExtensions.includes(fileExtension)) {
    return { isValid: true };
  }

  // التحقق من نوع MIME كبديل ثانوي
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/jpg', // بعض المتصفحات قد ترسل هذا
    'image/pjpeg', // Internet Explorer
    'image/x-png', // بعض المتصفحات القديمة
  ];

  if (file.mimetype && allowedTypes.includes(file.mimetype)) {
    return { isValid: true };
  }

  // إذا لم نتمكن من تحديد النوع، نقبل الملف افتراضياً (مع تحذير)
  // هذا يحدث عندما يكون originalFilename و mimetype غير محددين
  if (!fileName && !file.mimetype) {
    console.warn('تم قبول الملف افتراضياً (لا يوجد اسم أو نوع MIME):', {
      size: file.size,
      filepath: file.filepath,
    });
    return { isValid: true };
  }

  return {
    isValid: false,
    error: `نوع الصورة غير مدعوم. اسم الملف: ${fileName}, النوع المرسل: ${file.mimetype || 'غير محدد'}. الصيغ المدعومة: JPG, PNG, WebP, GIF`,
  };
}

export default withUploadRateLimit(handler);
