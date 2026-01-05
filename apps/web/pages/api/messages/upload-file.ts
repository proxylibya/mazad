import { Fields, Files, File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs';
import { NextApiRequest } from 'next';
import os from 'os';
import path from 'path';
import { uploadBufferToBlob } from '../../../lib/blob';
import { verifyToken } from '../../../middleware/auth';
import { NextApiResponseServerIO } from '../../../types/next';
import { withUploadRateLimit } from '../../../utils/rateLimiter';

// تعطيل body parser الافتراضي لـ Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

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
    const type = Array.isArray(fields.type) ? fields.type[0] : fields.type || 'file';

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
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف',
      });
    }

    // التحقق من صحة الملف
    const validationResult = validateFile(file as FormidableFile, type);
    if (!validationResult.isValid) {
      // حذف الملف المؤقت
      fs.unlinkSync((file as FormidableFile).filepath);

      return res.status(400).json({
        success: false,
        message: validationResult.error || 'الملف غير صحيح',
      });
    }

    // 🆕 معالجة المحادثات المؤقتة (temp-userId-timestamp)
    let finalConversationId = conversationId;
    if (String(conversationId).startsWith('temp-')) {
      console.log('[Upload File] 🔄 محادثة مؤقتة مكتشفة:', conversationId);
      const parts = String(conversationId).split('-');
      if (parts.length >= 2) {
        const extractedReceiverId = parts[1];
        console.log('[Upload File] 📋 استخراج معرف المستقبل:', extractedReceiverId);
        try {
          const { dbHelpers } = await import('../../../lib/prisma');
          const conversation = await dbHelpers.getOrCreateDirectConversation(
            userId,
            extractedReceiverId,
          );
          finalConversationId = conversation.id;
          console.log('[Upload File] ✅ تم إنشاء/جلب محادثة:', finalConversationId);
        } catch (convError) {
          console.error('[Upload File] ❌ خطأ في إنشاء المحادثة:', convError);
          fs.unlinkSync((file as FormidableFile).filepath);
          return res.status(500).json({
            success: false,
            message: 'فشل في إنشاء المحادثة',
          });
        }
      }
    }

    // معالجة الملف وحفظه
    const processedFile = await processFile(file as FormidableFile, userId, finalConversationId, type);

    // إنشاء رسالة ملف في قاعدة البيانات
    try {
      const { dbHelpers } = await import('../../../lib/prisma');

      const messageType = type === 'voice' ? 'VOICE' : 'FILE';
      const messageData = {
        senderId: userId,
        conversationId: finalConversationId,
        content: processedFile.fileUrl,
        type: messageType as 'VOICE' | 'FILE',
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
              type: type,
              content: processedFile.fileUrl,
              createdAt: new Date().toISOString(),
              fileUrl: processedFile.fileUrl,
              fileName: processedFile.fileName,
            },
          });
        }
      } catch (_) {
        // تجاهل أخطاء البث
      }

      return res.status(200).json({
        success: true,
        message: type === 'voice' ? 'تم رفع الرسالة الصوتية بنجاح' : 'تم رفع الملف بنجاح',
        data: {
          fileName: processedFile.fileName,
          fileUrl: processedFile.fileUrl,
          fileSize: processedFile.fileSize,
          uploadId: processedFile.uploadId,
          fileType: processedFile.fileType,
          messageId: savedMessage.id,
          message: savedMessage,
          conversationId: finalConversationId, // إرجاع معرف المحادثة الحقيقي
        },
      });
    } catch (dbError) {
      console.error('خطأ في حفظ رسالة الملف:', dbError);

      // إرجاع معلومات الملف حتى لو فشل حفظ الرسالة
      return res.status(200).json({
        success: true,
        message: 'تم رفع الملف بنجاح (لكن فشل في حفظ الرسالة)',
        data: {
          fileName: processedFile.fileName,
          fileUrl: processedFile.fileUrl,
          fileSize: processedFile.fileSize,
          uploadId: processedFile.uploadId,
          fileType: processedFile.fileType,
        },
        warning: 'فشل في حفظ الرسالة في قاعدة البيانات',
      });
    }
  } catch (error) {
    console.error('خطأ في رفع الملف:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفع الملف',
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
      maxFileSize: 50 * 1024 * 1024, // 50MB للملفات الصوتية والعامة
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

// دالة للتحقق من صحة الملف
function validateFile(
  file: FormidableFile,
  type: string
): {
  isValid: boolean;
  error?: string;
} {
  // أنواع الملفات المسموحة حسب النوع
  const allowedTypes: Record<string, string[]> = {
    voice: ['audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/m4a'],
    file: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/zip',
      'application/x-zip-compressed',
      'text/plain',
    ],
  };

  // حدود الحجم حسب النوع
  const sizeLimits: Record<string, number> = {
    voice: 20 * 1024 * 1024, // 20MB للصوت
    file: 50 * 1024 * 1024, // 50MB للملفات العامة
  };

  // التحقق من نوع الملف
  const allowed = allowedTypes[type] || [];
  if (!file.mimetype || !allowed.includes(file.mimetype)) {
    return {
      isValid: false,
      error:
        type === 'voice'
          ? 'نوع الملف الصوتي غير مدعوم. الصيغ المدعومة: WebM, OGG, MP3, WAV, M4A'
          : 'نوع الملف غير مدعوم. الصيغ المدعومة: PDF, Word, Excel, ZIP, TXT',
    };
  }

  // التحقق من حجم الملف
  const maxSize = sizeLimits[type] || 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return {
      isValid: false,
      error: `حجم الملف كبير جداً. الحد الأقصى ${Math.round(maxSize / (1024 * 1024))} ميجابايت`,
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

// دالة لمعالجة الملف وحفظه
async function processFile(
  file: FormidableFile,
  userId: string,
  conversationId: string,
  type: string
): Promise<{
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadId: string;
  fileType: string;
  filePath: string;
}> {
  // إنشاء معرف فريد للرفع
  const uploadId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // إنشاء اسم ملف فريد
  const timestamp = Date.now();
  const extension = path.extname(file.originalFilename || '');
  const fileName = `${type}_${conversationId}_${userId}_${timestamp}${extension}`;

  // رفع الملف إلى Vercel Blob
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

  // تحديد نوع الملف
  const fileType = file.mimetype?.split('/')[1] || 'unknown';

  const fileInfo = {
    fileName,
    fileUrl,
    fileSize: file.size,
    uploadId,
    fileType,
    filePath: uploaded.pathname,
    conversationId,
    uploadedBy: userId,
    uploadedAt: new Date().toISOString(),
    originalName: file.originalFilename || fileName,
  };

  console.log(`[تم بنجاح] تم حفظ ${type === 'voice' ? 'ملف صوتي' : 'ملف'} بنجاح:`, {
    fileName,
    fileUrl,
    fileSize: file.size,
    conversationId,
  });

  return fileInfo;
}

export default withUploadRateLimit(handler);
