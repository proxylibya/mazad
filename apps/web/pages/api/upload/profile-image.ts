import { File as FormidableFile, IncomingForm } from 'formidable';
import * as fs from 'fs';
import * as jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import { uploadBufferToBlob } from '../../../lib/blob';
import { prisma } from '../../../lib/prisma';

// تعطيل parser لملفات POST، تفعيل للـ DELETE
export const config = {
  api: {
    bodyParser: false,
  },
};

interface UploadResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    return handleUpload(req, res);
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res);
  } else {
    return res.status(405).json({
      success: false,
      error: 'طريقة غير مدعومة',
    });
  }
}

// دالة لاستخراج userId من المصادقة
function extractUserId(req: NextApiRequest): string | null {
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

  // 1. محاولة الحصول من Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.substring(7);
      console.log('[رفع صورة] محاولة فك رمز من Authorization header');
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded.userId) return decoded.userId;
      if (decoded.id) return decoded.id;
    } catch (e: any) {
      console.log('[رفع صورة] فشل في فك رمز Authorization:', e?.message || e);
    }
  }

  // 2. محاولة الحصول من cookies (باستخدام req.cookies أولاً)
  const cookieToken = req.cookies?.token || req.cookies?.['auth-token'];
  if (cookieToken) {
    try {
      console.log('[رفع صورة] محاولة فك رمز من req.cookies');
      const decoded: any = jwt.verify(cookieToken, JWT_SECRET);
      if (decoded.userId) return decoded.userId;
      if (decoded.id) return decoded.id;
    } catch (e: any) {
      console.log('[رفع صورة] فشل في فك رمز req.cookies:', e?.message || e);
    }
  }

  // 3. fallback: محاولة الحصول من cookie header مباشرة
  const cookies = req.headers.cookie || '';
  const tokenMatch = cookies.match(/(?:auth-token|token)=([^;]+)/);
  if (tokenMatch) {
    try {
      const token = decodeURIComponent(tokenMatch[1]);
      console.log('[رفع صورة] محاولة فك رمز من cookie header');
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded.userId) return decoded.userId;
      if (decoded.id) return decoded.id;
    } catch (e: any) {
      console.log('[رفع صورة] فشل في فك رمز Cookie header:', e?.message || e);
    }
  }

  console.log('[رفع صورة] لم يتم العثور على token صالح');
  return null;
}

// دالة رفع الصورة
async function handleUpload(req: NextApiRequest, res: NextApiResponse) {
  try {
    // التحقق من المصادقة - دعم متعدد الطرق
    const userId = extractUserId(req);

    if (!userId) {
      console.log('[رفع صورة] لم يتم العثور على معرف المستخدم');
      return res.status(401).json({
        success: false,
        error: 'غير مصرح: يرجى تسجيل الدخول أولاً',
      });
    }

    console.log('[رفع صورة] تم التحقق من المستخدم:', userId);

    // معالجة النموذج والملفات
    console.log('تم استلام طلب رفع صورة الملف الشخصي');
    const { fields, files } = await parseForm(req);

    console.log('تم تحليل النموذج، الملفات:', Object.keys(files));

    // البحث عن ملف الصورة في جميع الملفات المرفوعة
    let file: FormidableFile | undefined;

    for (const [key, value] of Object.entries(files)) {
      if (Array.isArray(value)) {
        file = value[0] as FormidableFile;
      } else {
        file = value as FormidableFile;
      }
      break; // أخذ أول ملف
    }

    if (!file) {
      console.log('لم يتم العثور على ملف في الطلب. الملفات المتاحة:', Object.keys(files));
      return res.status(400).json({
        success: false,
        error: 'لم يتم العثور على ملف الصورة',
      });
    }

    console.log('[تم بنجاح] تم العثور على ملف الصورة:', {
      originalFilename: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      filepath: file.filepath,
    });

    // التحقق من صحة الصورة
    const validationResult = validateImageFile(file);
    if (!validationResult.isValid) {
      // حذف الملف المؤقت بطريقة آمنة
      try {
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      } catch (deleteError) {
        console.warn('تحذير: لم يتم حذف الملف المؤقت:', deleteError);
      }

      return res.status(400).json({
        success: false,
        error: validationResult.error || 'الصورة غير صحيحة',
      });
    }

    // تحقق من تواقيع الصورة (magic bytes) لحماية إضافية
    if (!isValidImageMagic(file.filepath, file.mimetype)) {
      try {
        if (fs.existsSync(file.filepath)) {
          fs.unlinkSync(file.filepath);
        }
      } catch (deleteError) {
        console.warn('تحذير: لم يتم حذف الملف المؤقت:', deleteError);
      }
      return res.status(400).json({ success: false, error: 'ملف صورة غير صالح' });
    }

    // معالجة الصورة وحفظها
    const processedImage = await processProfileImage(file, userId);

    // تحديث قاعدة البيانات بصورة المستخدم الجديدة
    try {
      // تحديث صورة المستخدم في جدول المستخدمين
      await prisma.users.update({
        where: { id: userId },
        data: { profileImage: processedImage.imageUrl },
      });
      console.log('تم تحديث صورة المستخدم في قاعدة البيانات:', processedImage.imageUrl);

      // تحديث صورة المستخدم في إعدادات المستخدم أيضاً (اختياري)
      try {
        await prisma.user_settings.updateMany({
          where: { userId },
          data: { profileAvatar: processedImage.imageUrl },
        });
        console.log('تم تحديث صورة المستخدم في الإعدادات');
      } catch (settingsError) {
        // لا نفشل العملية إذا فشل تحديث الإعدادات
      }
    } catch (dbError) {
      console.error('خطأ في تحديث قاعدة البيانات:', dbError);
      // لا نفشل العملية إذا فشل تحديث قاعدة البيانات
      // لكن نسجل الخطأ للمراجعة
    }

    return res.status(200).json({
      success: true,
      imageUrl: processedImage.imageUrl,
    });
  } catch (error) {
    console.error('خطأ في رفع الصورة الشخصية:', error);
    console.error('تفاصيل الخطأ:', {
      message: error instanceof Error ? error.message : 'خطأ غير معروف',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });

    return res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === 'development'
          ? `حدث خطأ في الخادم: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : 'حدث خطأ في الخادم',
    });
  } finally {
    // إغلاق اتصال Prisma
  }
}

// دالة لمعالجة النموذج والملفات
async function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any; }> {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(os.tmpdir(), 'sooq-mazad', 'uploads', 'temp');

    try {
      // إنشاء مجلد الرفع المؤقت إذا لم يكن موجوداً
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const form = new IncomingForm({
        uploadDir: uploadDir,
        keepExtensions: true,
        maxFileSize: 5 * 1024 * 1024, // 5MB للصور الشخصية
        multiples: false,
        filename: (name, ext, part, form) => {
          return Date.now() + '_' + part.originalFilename;
        },
      });

      form.parse(req, (err, fields, files) => {
        if (err) {
          console.error('خطأ في تحليل النموذج:', err);
          reject(err);
        } else {
          console.log('تم تحليل النموذج بنجاح:', {
            fields,
            files: Object.keys(files),
            fileDetails: files,
          });
          resolve({ fields, files });
        }
      });
    } catch (error) {
      console.error('خطأ في إعداد النموذج:', error);
      reject(error);
    }
  });
}

// دالة للتحقق من صحة ملف الصورة
function validateImageFile(file: FormidableFile): {
  isValid: boolean;
  error?: string;
} {
  // التحقق من وجود الملف
  if (!file || !file.originalFilename) {
    return { isValid: false, error: 'ملف غير صحيح' };
  }

  // التحقق من نوع الملف
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'نوع الملف غير مدعوم. يرجى استخدام JPG, PNG, أو WebP',
    };
  }

  // التحقق من حجم الملف
  if (file.size > 5 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت',
    };
  }

  // التحقق من امتداد الملف
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileExtension = path.extname(file.originalFilename || '').toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: 'امتداد الملف غير مدعوم' };
  }

  return { isValid: true };
}

// فحص تواقيع الملف للتحقق من النوع الحقيقي
function isValidImageMagic(filePath: string, mimetype?: string): boolean {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.length < 12) return false;

    // JPEG: FF D8 FF
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    const isPng =
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a;

    // WebP: RIFF....WEBP
    const isWebp =
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf[8] === 0x57 &&
      buf[9] === 0x45 &&
      buf[10] === 0x42 &&
      buf[11] === 0x50;

    const ok = isJpeg || isPng || isWebp;

    if (!ok) return false;

    // توافق بسيط مع mimetype المدخل
    if (!mimetype) return true;
    if (mimetype.includes('jpeg') || mimetype.includes('jpg')) return isJpeg;
    if (mimetype.includes('png')) return isPng;
    if (mimetype.includes('webp')) return isWebp;

    return false;
  } catch {
    return false;
  }
}

// دالة لمعالجة ملف الصورة الشخصية وحفظه
async function processProfileImage(
  file: FormidableFile,
  userId: string,
): Promise<{ imageUrl: string; fileName: string; }> {
  try {
    console.log('بدء معالجة الصورة الشخصية:', {
      originalFilename: file.originalFilename,
      size: file.size,
      mimetype: file.mimetype,
      filepath: file.filepath,
    });

    // إنشاء اسم ملف فريد
    const timestamp = Date.now();
    const fileName = `profile_${userId}_${timestamp}.webp`;

    console.log('تفاصيل الملف:', {
      originalFilename: file.originalFilename,
      extension: '.webp',
      fileName: fileName,
    });

    // التحقق من وجود الملف المؤقت
    if (!fs.existsSync(file.filepath)) {
      throw new Error(`الملف المؤقت غير موجود: ${file.filepath}`);
    }

    // إعادة ترميز الصورة وإزالة الميتاداتا وحماية من المحتوى الضار
    const webpBuffer = await sharp(file.filepath)
      .rotate()
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    const uploaded = await uploadBufferToBlob({
      buffer: webpBuffer,
      filename: fileName,
      contentType: 'image/webp',
      folder: 'images/profiles',
    });

    // حذف الملف المؤقت بطريقة آمنة
    try {
      if (fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
    } catch (deleteError) {
      console.warn('تحذير: لم يتم حذف الملف المؤقت:', deleteError);
      // لا نوقف العملية لأن المشكلة الرئيسية تمت (رفع الصورة)
    }

    // إنشاء URL للصورة
    const imageUrl = uploaded.url;

    return {
      imageUrl,
      fileName,
    };
  } catch (error) {
    console.error('خطأ في معالجة الصورة الشخصية:', error);

    // محاولة حذف الملف المؤقت في حالة الخطأ
    try {
      if (file.filepath && fs.existsSync(file.filepath)) {
        fs.unlinkSync(file.filepath);
      }
    } catch (cleanupError) {
      console.error('خطأ في حذف الملف المؤقت:', cleanupError);
    }

    throw error;
  }
}

// دالة لقراءة raw body
async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      resolve(body);
    });
    req.on('error', (error) => {
      reject(error);
    });
  });
}

// دالة حذف الصورة
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  try {
    // التحقق من المصادقة
    const authHeader = req.headers.authorization;

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        error: 'سوء تهيئة الخادم: المتغير JWT_SECRET غير مضبوط',
      });
    }

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح: مفقود رمز الوصول',
      });
    }

    let userId: string;
    try {
      const token = authHeader.substring(7);
      const decoded: any = jwt.verify(token, process.env.JWT_SECRET);
      userId = decoded.userId;
      if (!userId) throw new Error('missing userId in token');
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح: رمز الوصول غير صالح',
      });
    }

    // قراءة البيانات من raw body
    let requestBody: any = {};
    if (req.method === 'DELETE') {
      try {
        const body = await getRawBody(req);
        requestBody = JSON.parse(body);
      } catch (error) {
        // في حالة عدم وجود body، نستمر بدون بيانات إضافية
      }
    }

    const { imageUrl } = requestBody;

    // الحصول على معلومات المستخدم الحالية
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { profileImage: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'المستخدم غير موجود',
      });
    }

    // حذف الصورة من النظام إذا كانت موجودة
    if (user.profileImage && user.profileImage.startsWith('/images/profiles/')) {
      const imagePath = path.join(process.cwd(), 'public', user.profileImage);

      try {
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
          console.log('تم حذف الصورة من النظام:', imagePath);
        }
      } catch (fileError) {
        console.warn('تحذير: لم يتم حذف الصورة من النظام:', fileError);
        // لا نوقف العملية إذا فشل حذف الملف
      }
    }

    // تحديث قاعدة البيانات
    await prisma.users.update({
      where: { id: userId },
      data: { profileImage: null },
    });

    // تحديث إعدادات المستخدم أيضاً
    try {
      await prisma.user_settings.updateMany({
        where: { userId },
        data: { profileAvatar: null },
      });
    } catch (settingsError) {
      console.warn('تحذير: لم يتم تحديث إعدادات المستخدم:', settingsError);
    }

    return res.status(200).json({
      success: true,
      imageUrl: '',
    });
  } catch (error) {
    console.error('خطأ في حذف الصورة الشخصية:', error);

    return res.status(500).json({
      success: false,
      error:
        process.env.NODE_ENV === 'development'
          ? `حدث خطأ في الخادم: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
          : 'حدث خطأ في الخادم',
    });
  } finally {
  }
}
