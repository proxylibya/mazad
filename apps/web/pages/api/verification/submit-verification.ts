import { File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';
import { uploadBufferToBlob } from '../../../lib/blob';
import {
  DocumentType,
  VerificationHistoryItem,
  VerificationStatus,
} from '../../../types/verification';

// تعطيل body parser الافتراضي لـ Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

interface SubmitVerificationResponse {
  success: boolean;
  message: string;
  data?: {
    verificationId: string;
    status: VerificationStatus;
    estimatedReviewTime: string;
  };
  error?: string;
}

interface ProcessedDocument {
  type: DocumentType;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitVerificationResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    // معالجة الملفات المرفوعة
    const { fields, files } = await parseForm(req);

    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب',
      });
    }

    // معالجة الوثائق المرفوعة
    const processedDocuments = await processUploadedDocuments(files, fields);

    if (processedDocuments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'يرجى رفع وثيقة واحدة على الأقل',
      });
    }

    // التحقق من صحة الوثائق
    const validationResult = validateDocuments(processedDocuments);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: validationResult.error || 'الوثائق المرفوعة غير صحيحة',
      });
    }

    // إنشاء طلب التحقق
    const verificationRequest = await createVerificationRequest(userId, processedDocuments);

    // محاكاة معالجة الطلب (في التطبيق الحقيقي، سيتم حفظ البيانات في قاعدة البيانات)
    await simulateDocumentProcessing(verificationRequest);

    // إرسال إشعار للمستخدم
    await sendVerificationNotification(userId, verificationRequest.id);

    return res.status(200).json({
      success: true,
      message: 'تم إرسال طلب التحقق بنجاح',
      data: {
        verificationId: verificationRequest.id,
        status: VerificationStatus.UNDER_REVIEW,
        estimatedReviewTime: '24-48 ساعة',
      },
    });
  } catch (error) {
    console.error('خطأ في معالجة طلب التحقق:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء معالجة الطلب',
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
}

// دالة لمعالجة النموذج والملفات
async function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any; }> {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(os.tmpdir(), 'sooq-mazad', 'verification');

    // إنشاء مجلد الرفع إذا لم يكن موجوداً
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
      multiples: true,
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

// دالة لمعالجة الوثائق المرفوعة
async function processUploadedDocuments(files: any, fields: any): Promise<ProcessedDocument[]> {
  const processedDocuments: ProcessedDocument[] = [];

  // البحث عن الملفات والأنواع المقترنة
  const fileKeys = Object.keys(files).filter((key) => key.startsWith('document_'));

  for (const fileKey of fileKeys) {
    const index = fileKey.split('_')[1];
    const documentTypeKey = `documentType_${index}`;

    const file = Array.isArray(files[fileKey]) ? files[fileKey][0] : files[fileKey];
    const documentType = Array.isArray(fields[documentTypeKey])
      ? fields[documentTypeKey][0]
      : fields[documentTypeKey];

    if (file && documentType) {
      const formidableFile = file as FormidableFile;

      // إنشاء اسم ملف فريد
      const timestamp = Date.now();
      const extension = path.extname(formidableFile.originalFilename || '');
      const fileName = `${documentType}_${timestamp}${extension}`;
      const folder = `uploads/verification/${documentType}`;

      const buffer = await fs.promises.readFile(formidableFile.filepath);
      const contentType = formidableFile.mimetype || 'application/octet-stream';
      const uploaded = await uploadBufferToBlob({
        buffer,
        filename: fileName,
        contentType,
        folder,
      });

      await fs.promises.unlink(formidableFile.filepath).catch(() => { });

      processedDocuments.push({
        type: documentType as DocumentType,
        originalName: formidableFile.originalFilename || '',
        fileName,
        filePath: uploaded.url,
        fileSize: formidableFile.size,
        mimeType: formidableFile.mimetype || '',
      });
    }
  }

  return processedDocuments;
}

// دالة للتحقق من صحة الوثائق
function validateDocuments(documents: ProcessedDocument[]): {
  isValid: boolean;
  error?: string;
} {
  // التحقق من وجود وثيقة واحدة على الأقل
  if (documents.length === 0) {
    return { isValid: false, error: 'يرجى رفع وثيقة واحدة على الأقل' };
  }

  // التحقق من أنواع الملفات المدعومة
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];

  for (const doc of documents) {
    if (!supportedTypes.includes(doc.mimeType)) {
      return {
        isValid: false,
        error: `نوع الملف ${doc.originalName} غير مدعوم. الأنواع المدعومة: JPG, PNG, PDF`,
      };
    }

    // التحقق من حجم الملف
    if (doc.fileSize > 5 * 1024 * 1024) {
      return {
        isValid: false,
        error: `حجم الملف ${doc.originalName} كبير جداً. الحد الأقصى 5 ميجابايت`,
      };
    }
  }

  // التحقق من عدم تكرار نوع الوثيقة
  const documentTypes = documents.map((doc) => doc.type);
  const uniqueTypes = new Set(documentTypes);

  if (documentTypes.length !== uniqueTypes.size) {
    return { isValid: false, error: 'لا يمكن رفع أكثر من وثيقة من نفس النوع' };
  }

  return { isValid: true };
}

// دالة لإنشاء طلب التحقق
async function createVerificationRequest(
  userId: string,
  documents: ProcessedDocument[],
): Promise<VerificationHistoryItem> {
  const verificationId = `verify_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const verificationRequest: VerificationHistoryItem = {
    id: verificationId,
    userId,
    status: VerificationStatus.UNDER_REVIEW,
    documentType: documents.map((doc) => doc.type).join(','),
    submittedAt: new Date(),
    extractedData: {
      documentsCount: documents.length,
      documentTypes: documents.map((doc) => doc.type),
      totalSize: documents.reduce((sum, doc) => sum + doc.fileSize, 0),
    },
    aiAnalysis: {
      initialScan: {
        documentsDetected: documents.length,
        qualityCheck: 'pending',
        authenticityCheck: 'pending',
        dataExtraction: 'pending',
      },
      processingStarted: new Date().toISOString(),
    },
  };

  // في التطبيق الحقيقي، سيتم حفظ البيانات في قاعدة البيانات

  return verificationRequest;
}

// دالة لمحاكاة معالجة الوثائق
async function simulateDocumentProcessing(
  verificationRequest: VerificationHistoryItem,
): Promise<void> {
  // محاكاة معالجة الذكاء الاصطناعي

  // في التطبيق الحقيقي، ستتم معالجة الوثائق باستخدام:
  // - OCR لاستخراج النصوص
  // - التحقق من صحة الوثائق
  // - مقارنة البيانات
  // - كشف التزوير

  // محاكاة تحديث حالة المعالجة
  setTimeout(async () => {
    // هنا يمكن إرسال إشعار للمراجعين
  }, 1000);
}

// دالة لإرسال إشعار للمستخدم
async function sendVerificationNotification(userId: string, verificationId: string): Promise<void> {
  try {
    // في التطبيق الحقيقي، سيتم إرسال إشعار عبر:
    // - البريد الإلكتروني
    // - رسالة نصية
    // - إشعار داخل التطبيق

    console.log(`إرسال إشعار للمستخدم ${userId} بخصوص طلب التحقق ${verificationId}`);

    // محاكاة إرسال الإشعار
    const notificationData = {
      userId,
      type: 'verification_submitted',
      title: 'تم إرسال طلب التحقق',
      message: 'تم إرسال طلب التحقق من الهوية بنجاح. سيتم مراجعته خلال 24-48 ساعة.',
      data: {
        verificationId,
        status: VerificationStatus.UNDER_REVIEW,
      },
      createdAt: new Date(),
    };

    // في التطبيق الحقيقي، سيتم حفظ الإشعار في قاعدة البيانات
  } catch (error) {
    console.error('خطأ في إرسال الإشعار:', error);
    // لا نرمي خطأ هنا لأن فشل الإشعار لا يجب أن يؤثر على نجاح العملية الأساسية
  }
}

// دالة مساعدة للحصول على معلومات نوع الوثيقة
function getDocumentTypeInfo(documentType: DocumentType) {
  const documentTypeMap = {
    [DocumentType.PASSPORT]: {
      name: 'جواز السفر',
      requiredSides: 1,
      processingTime: '24 ساعة',
    },
    [DocumentType.NATIONAL_ID]: {
      name: 'البطاقة الشخصية',
      requiredSides: 2,
      processingTime: '24 ساعة',
    },
    [DocumentType.DRIVING_LICENSE]: {
      name: 'رخصة القيادة',
      requiredSides: 2,
      processingTime: '24 ساعة',
    },
    [DocumentType.SELFIE]: {
      name: 'صورة شخصية',
      requiredSides: 1,
      processingTime: '12 ساعة',
    },
  };

  return (
    documentTypeMap[documentType] || {
      name: 'وثيقة غير معروفة',
      requiredSides: 1,
      processingTime: '48 ساعة',
    }
  );
}
