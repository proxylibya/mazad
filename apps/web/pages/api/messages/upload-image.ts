import { Fields, Files, File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs';
import { NextApiRequest } from 'next';
import os from 'os';
import path from 'path';
import { NextApiResponseServerIO } from '../../../types/next';
// Removed unused imports
import { uploadBufferToBlob } from '../../../lib/blob';
import { verifyToken } from '../../../middleware/auth';
import { withUploadRateLimit } from '../../../utils/rateLimiter';

// تعطيل body parser الافتراضي لـ Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

// Note: response body type is inferred dynamically in this handler; explicit interface removed to avoid unused lint.

const handler = async (req: NextApiRequest, res: NextApiResponseServerIO) => {
  // التحقق من أن الطريقة هي POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed',
    });
  }

  // التحقق من المصادقة الإجبارية
  const user = await verifyToken(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }

  try {
    // معالجة الملف المرفوع
    const { fields, files } = await parseForm(req);

    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId;
    const conversationId = Array.isArray(fields.conversationId)
      ? fields.conversationId[0]
      : fields.conversationId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب',
      });
    }

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المحادثة مطلوب',
      });
    }

    // التحقق من وجود الملف
    const file = Array.isArray(files.image) ? files.image[0] : files.image;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي صورة',
      });
    }

    // التحقق من صحة الصورة
    const validationResult = validateImageFile(file as FormidableFile);
    if (!validationResult.isValid) {
      // حذف الملف المؤقت
      fs.unlinkSync((file as FormidableFile).filepath);

      return res.status(400).json({
        success: false,
        message: validationResult.error || 'الصورة غير صحيحة',
      });
    }

    // 🆕 معالجة المحادثات المؤقتة (temp-userId-timestamp)
    let finalConversationId = conversationId;
    if (String(conversationId).startsWith('temp-')) {
      console.log('[Upload Image] 🔄 محادثة مؤقتة مكتشفة:', conversationId);
      const parts = String(conversationId).split('-');
      if (parts.length >= 2) {
        const extractedReceiverId = parts[1];
        console.log('[Upload Image] 📋 استخراج معرف المستقبل:', extractedReceiverId);
        try {
          const { dbHelpers } = await import('../../../lib/prisma');
          const conversation = await dbHelpers.getOrCreateDirectConversation(
            userId,
            extractedReceiverId,
          );
          finalConversationId = conversation.id;
          console.log('[Upload Image] ✅ تم إنشاء/جلب محادثة:', finalConversationId);
        } catch (convError) {
          console.error('[Upload Image] ❌ خطأ في إنشاء المحادثة:', convError);
          fs.unlinkSync((file as FormidableFile).filepath);
          return res.status(500).json({
            success: false,
            message: 'فشل في إنشاء المحادثة',
          });
        }
      }
    }

    // معالجة الصورة وحفظها
    const processedImage = await processImageFile(file as FormidableFile, userId, finalConversationId);

    // إنشاء رسالة صورة في قاعدة البيانات
    try {
      const { dbHelpers } = await import('../../../lib/prisma');

      const messageData = {
        senderId: userId,
        conversationId: finalConversationId,
        content: processedImage.fileUrl,
        type: 'IMAGE' as const,
        status: 'SENT' as const,
      };

      const savedMessage = await dbHelpers.createMessage(messageData);

      // بث الرسالة الجديدة لغرفة المحادثة عبر Socket.IO
      try {
        const io = res.socket?.server?.io as any;
        if (io && finalConversationId) {
          io.to(`chat:${finalConversationId}`).emit('chat:message:new', {
            conversationId: String(finalConversationId),
            message: {
              id: String(savedMessage.id),
              senderId: String(userId),
              type: 'image',
              content: processedImage.fileUrl,
              createdAt: new Date().toISOString(),
              imageUrl: processedImage.fileUrl,
            },
          });
        }
      } catch (_) {
        // تجاهل أخطاء البث
      }

      return res.status(200).json({
        success: true,
        message: 'تم رفع الصورة وإرسالها بنجاح',
        data: {
          fileName: processedImage.fileName,
          fileUrl: processedImage.fileUrl,
          fileSize: processedImage.fileSize,
          uploadId: processedImage.uploadId,
          imageType: processedImage.imageType,
          messageId: savedMessage.id,
          message: savedMessage,
          conversationId: finalConversationId, // إرجاع معرف المحادثة الحقيقي
        },
      });
    } catch (dbError) {
      console.error('خطأ في حفظ رسالة الصورة:', dbError);

      // إرجاع معلومات الصورة حتى لو فشل حفظ الرسالة
      return res.status(200).json({
        success: true,
        message: 'تم رفع الصورة بنجاح (لكن فشل في حفظ الرسالة)',
        data: {
          fileName: processedImage.fileName,
          fileUrl: processedImage.fileUrl,
          fileSize: processedImage.fileSize,
          uploadId: processedImage.uploadId,
          imageType: processedImage.imageType,
        },
        warning: 'فشل في حفظ الرسالة في قاعدة البيانات',
      });
    }
  } catch (error) {
    console.error('خطأ في رفع الصورة:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفع الصورة',
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
};

// دالة لمعالجة النموذج والملفات
async function parseForm(req: NextApiRequest): Promise<{ fields: Fields; files: Files; }> {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(os.tmpdir(), 'sooq-mazad', 'messages', 'temp');

    // إنشاء مجلد الرفع المؤقت إذا لم يكن موجوداً
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB للصور
      multiples: false,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
      } else {
        resolve({ fields: fields as Fields, files: files as Files });
      }
    });
  });
}

// دالة للتحقق من صحة ملف الصورة
function validateImageFile(file: FormidableFile): {
  isValid: boolean;
  error?: string;
} {
  // التحقق من نوع الملف - دعم جميع صيغ الصور الشائعة
  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'image/svg+xml',
    'image/ico',
    'image/heic',
    'image/heif',
  ];

  if (!file.mimetype || !allowedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error:
        'نوع الصورة غير مدعوم. الصيغ المدعومة: JPG, PNG, GIF, WebP, BMP, TIFF, SVG, ICO, HEIC, HEIF',
    };
  }

  // التحقق من حجم الملف (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'حجم الصورة كبير جداً. الحد الأقصى 10 ميجابايت',
    };
  }

  // التحقق من اسم الملف
  if (!file.originalFilename || file.originalFilename.length > 255) {
    return {
      isValid: false,
      error: 'اسم الملف غير صحيح',
    };
  }

  // التحقق من أن الملف ليس فارغاً
  if (file.size === 0) {
    return {
      isValid: false,
      error: 'الملف فارغ',
    };
  }

  return { isValid: true };
}

// دالة لمعالجة ملف الصورة وحفظه
async function processImageFile(
  file: FormidableFile,
  userId: string,
  conversationId: string,
): Promise<{
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadId: string;
  imageType: string;
  filePath: string;
}> {
  // إنشاء معرف فريد للرفع
  const uploadId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // إنشاء اسم ملف فريد
  const timestamp = Date.now();
  const extension = path.extname(file.originalFilename || '');
  const fileName = `message_${conversationId}_${userId}_${timestamp}${extension}`;

  // رفع الصورة إلى Vercel Blob
  const buffer = await fs.promises.readFile(file.filepath);
  const contentType = file.mimetype || 'application/octet-stream';
  const uploaded = await uploadBufferToBlob({
    buffer,
    filename: fileName,
    contentType,
    folder: `uploads/messages/${conversationId}`,
  });

  // حذف الملف المؤقت
  await fs.promises.unlink(file.filepath).catch(() => { });

  // إنشاء URL للملف
  const fileUrl = uploaded.url;

  // تحديد نوع الصورة
  const imageType = file.mimetype?.split('/')[1] || 'unknown';

  // معلومات إضافية عن الصورة
  const imageInfo = {
    fileName,
    fileUrl,
    fileSize: file.size,
    uploadId,
    imageType,
    filePath: uploaded.pathname,
    conversationId,
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
    originalName: file.originalFilename || fileName,
  };

  console.log('[تم بنجاح] تم حفظ صورة المراسلة بنجاح:', {
    fileName,
    fileUrl,
    fileSize: file.size,
    conversationId,
  });

  return imageInfo;
}

export default withUploadRateLimit(handler);
