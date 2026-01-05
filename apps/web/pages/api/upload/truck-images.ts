import { File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';
import { uploadBufferToBlob } from '../../../lib/blob';

// تعطيل parser الافتراضي لـ Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

interface UploadResponse {
  success: boolean;
  imageUrl?: string;
  position?: string;
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<UploadResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'طريقة غير مدعومة',
    });
  }

  try {
    // التحقق من المصادقة
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.substring(7);
        const secret = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
        const decoded = jwt.verify(token, secret) as JwtPayload & { userId?: string; id?: string; };
        userId = decoded.userId || decoded.id || 'temp_user';
      } catch (error) {
        userId = 'temp_user';
      }
    } else {
      userId = 'temp_user';
    }

    // معالجة النموذج والملفات
    const { fields, files } = await parseForm(req);
    const file = files.image as FormidableFile;
    const position = Array.isArray(fields.position)
      ? fields.position[0]
      : (fields.position as string);

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم العثور على ملف الصورة',
      });
    }

    if (!position) {
      return res.status(400).json({
        success: false,
        error: 'موضع الصورة مطلوب',
      });
    }

    // التحقق من صحة موضع الصورة
    const validPositions = ['front', 'back', 'side', 'interior'];
    if (!validPositions.includes(position)) {
      return res.status(400).json({
        success: false,
        error: 'موضع الصورة غير صحيح',
      });
    }

    // التحقق من صحة الصورة
    const validationResult = validateTruckImageFile(file);
    if (!validationResult.isValid) {
      // حذف الملف المؤقت
      fs.unlinkSync(file.filepath);

      return res.status(400).json({
        success: false,
        error: validationResult.error || 'الصورة غير صحيحة',
      });
    }

    // معالجة الصورة وحفظها
    const processedImage = await processTruckImage(file, userId, position);

    return res.status(200).json({
      success: true,
      imageUrl: processedImage.imageUrl,
      position: position,
    });
  } catch (error) {
    console.error('خطأ في رفع صورة الساحبة:', error);
    return res.status(500).json({
      success: false,
      error: 'حدث خطأ في الخادم',
    });
  }
}

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
      maxFileSize: 10 * 1024 * 1024, // 10MB لصور الساحبة
      multiples: false,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields, files });
      }
    });
  });
}

// دالة للتحقق من صحة ملف صورة الساحبة
function validateTruckImageFile(file: FormidableFile): {
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

  // التحقق من حجم الملف (10MB للساحبة)
  if (file.size > 10 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت',
    };
  }

  // التحقق من امتداد الملف
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const fileExtension = path.extname(file.originalFilename).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: 'امتداد الملف غير مدعوم' };
  }

  return { isValid: true };
}

// دالة لمعالجة ملف صورة الساحبة وحفظه
async function processTruckImage(
  file: FormidableFile,
  userId: string,
  position: string,
): Promise<{ imageUrl: string; fileName: string; }> {
  // إنشاء اسم ملف فريد
  const timestamp = Date.now();
  const extension = path.extname(file.originalFilename || '');
  const fileName = `truck_${userId}_${position}_${timestamp}${extension}`;

  const buffer = await fs.promises.readFile(file.filepath);
  const contentType = file.mimetype || 'application/octet-stream';
  const uploaded = await uploadBufferToBlob({
    buffer,
    filename: fileName,
    contentType,
    folder: `images/trucks/${userId}`,
  });

  await fs.promises.unlink(file.filepath).catch(() => { });

  const imageUrl = uploaded.url;

  return {
    imageUrl,
    fileName,
  };
}
