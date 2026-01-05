import crypto from 'crypto';
import { File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs';
import { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';
import { uploadBufferToBlob } from '../../../lib/blob';
import { verifyToken } from '../../../middleware/auth';
import { DocumentType } from '../../../types/verification';
import { withUploadRateLimit } from '../../../utils/rateLimiter';

// تعطيل body parser الافتراضي لـ Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

interface UploadDocumentResponse {
  success: boolean;
  message: string;
  data?: {
    fileName: string;
    fileUrl: string;
    fileSize: number;
    documentType: DocumentType;
    uploadId: string;
  };
  error?: string;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<UploadDocumentResponse>) => {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Method not allowed',
    });
  }

  // التحقق من المصادقة الإجبارية
  const user = await verifyToken(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      error: 'Authentication required',
    });
  }

  try {
    // معالجة الملف المرفوع
    const { fields, files } = await parseForm(req);

    const userId = Array.isArray(fields.userId) ? fields.userId[0] : fields.userId;
    const documentType = Array.isArray(fields.documentType)
      ? (fields.documentType[0] as DocumentType)
      : (fields.documentType as DocumentType);

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب',
      });
    }

    if (!documentType) {
      return res.status(400).json({
        success: false,
        message: 'نوع الوثيقة مطلوب',
      });
    }

    // التحقق من وجود الملف
    const file = Array.isArray(files.document) ? files.document[0] : files.document;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم رفع أي ملف',
      });
    }

    // التحقق من صحة الملف
    const validationResult = validateFile(file as FormidableFile, documentType);
    if (!validationResult.isValid) {
      // حذف الملف المؤقت
      fs.unlinkSync((file as FormidableFile).filepath);

      return res.status(400).json({
        success: false,
        message: validationResult.error || 'الملف غير صحيح',
      });
    }

    // معالجة الملف وحفظه
    const processedFile = await processFile(file as FormidableFile, userId, documentType);

    // محاكاة تحليل الوثيقة بالذكاء الاصطناعي
    const analysisResult = await analyzeDocument(processedFile);

    return res.status(200).json({
      success: true,
      message: 'تم رفع الوثيقة بنجاح',
      data: {
        fileName: processedFile.fileName,
        fileUrl: processedFile.fileUrl,
        fileSize: processedFile.fileSize,
        documentType: documentType,
        uploadId: processedFile.uploadId,
      },
    });
  } catch (error) {
    console.error('خطأ في رفع الوثيقة:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء رفع الوثيقة',
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
};

// دالة لمعالجة النموذج والملفات
async function parseForm(req: NextApiRequest): Promise<{ fields: any; files: any; }> {
  return new Promise((resolve, reject) => {
    const uploadDir = path.join(os.tmpdir(), 'sooq-mazad', 'verification', 'temp');

    // إنشاء مجلد الرفع المؤقت إذا لم يكن موجوداً
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = new IncomingForm({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // 5MB
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

// دالة للتحقق من صحة الملف
function validateFile(
  file: FormidableFile,
  documentType: DocumentType,
): { isValid: boolean; error?: string; } {
  // التحقق من وجود الملف
  if (!file || !file.originalFilename) {
    return { isValid: false, error: 'لم يتم العثور على الملف' };
  }

  // التحقق من أنواع الملفات المدعومة
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!file.mimetype || !supportedTypes.includes(file.mimetype)) {
    return {
      isValid: false,
      error: 'نوع الملف غير مدعوم. الأنواع المدعومة: JPG, PNG, PDF',
    };
  }

  // التحقق من حجم الملف
  if (file.size > 5 * 1024 * 1024) {
    return {
      isValid: false,
      error: 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت',
    };
  }

  // التحقق من حجم الملف الأدنى
  if (file.size < 1024) {
    return {
      isValid: false,
      error: 'حجم الملف صغير جداً',
    };
  }

  // التحقق من امتداد الملف
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf'];
  const fileExtension = path.extname(file.originalFilename).toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return {
      isValid: false,
      error: 'امتداد الملف غير مدعوم',
    };
  }

  // التحقق من نوع الوثيقة المحدد
  if (!Object.values(DocumentType).includes(documentType)) {
    return {
      isValid: false,
      error: 'نوع الوثيقة غير صحيح',
    };
  }

  return { isValid: true };
}

// دالة لمعالجة الملف وحفظه
async function processFile(
  file: FormidableFile,
  userId: string,
  documentType: DocumentType,
): Promise<{
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadId: string;
  filePath: string;
}> {
  // إنشاء معرف فريد للرفع
  const uploadId = `upload_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;

  // إنشاء اسم ملف فريد
  const timestamp = Date.now();
  const extension = path.extname(file.originalFilename || '');
  const fileName = `${documentType}_${userId}_${timestamp}${extension}`;

  // رفع الملف إلى Vercel Blob
  const buffer = await fs.promises.readFile(file.filepath);
  const contentType = file.mimetype || 'application/octet-stream';
  const uploaded = await uploadBufferToBlob({
    buffer,
    filename: fileName,
    contentType,
    folder: `uploads/verification/${userId}`,
  });

  // حذف الملف المؤقت
  await fs.promises.unlink(file.filepath).catch(() => { });

  // إنشاء URL للملف
  const fileUrl = uploaded.url;

  return {
    fileName,
    fileUrl,
    fileSize: file.size,
    uploadId,
    filePath: uploaded.pathname,
  };
}

// دالة لتحليل الوثيقة بالذكاء الاصطناعي (محاكاة)
async function analyzeDocument(processedFile: {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadId: string;
  filePath: string;
}): Promise<{
  success: boolean;
  confidence: number;
  extractedData: any;
  issues: string[];
}> {
  // محاكاة تحليل الذكاء الاصطناعي

  // في التطبيق الحقيقي، ستتم معالجة الوثيقة باستخدام:
  // - OCR لاستخراج النصوص
  // - التحقق من جودة الصورة
  // - كشف التزوير
  // - استخراج البيانات الشخصية

  // محاكاة النتائج
  const mockAnalysis = {
    success: true,
    confidence: Math.random() * 30 + 70, // 70-100%
    extractedData: {
      documentQuality: {
        brightness: Math.random() * 20 + 80,
        contrast: Math.random() * 20 + 80,
        sharpness: Math.random() * 20 + 80,
        resolution: Math.random() * 20 + 80,
      },
      textDetection: {
        textFound: true,
        readability: Math.random() * 20 + 80,
        language: 'ar',
      },
      securityFeatures: {
        watermarkDetected: Math.random() > 0.5,
        hologramDetected: Math.random() > 0.7,
        microtextDetected: Math.random() > 0.6,
      },
    },
    issues: [],
  };

  // إضافة مشاكل محتملة بناءً على التحليل
  if (mockAnalysis.extractedData.documentQuality.brightness < 85) {
    mockAnalysis.issues.push('الإضاءة غير كافية');
  }

  if (mockAnalysis.extractedData.documentQuality.sharpness < 85) {
    mockAnalysis.issues.push('الصورة غير واضحة');
  }

  if (mockAnalysis.confidence < 80) {
    mockAnalysis.issues.push('جودة الوثيقة منخفضة');
  }

  console.log(
    `تم تحليل الوثيقة: ${processedFile.fileName}، الثقة: ${mockAnalysis.confidence.toFixed(1)}%`,
  );

  return mockAnalysis;
}

// دالة للحصول على معلومات نوع الوثيقة
function getDocumentTypeInfo(documentType: DocumentType) {
  const documentTypeMap = {
    [DocumentType.PASSPORT]: {
      name: 'جواز السفر',
      expectedFields: ['fullName', 'passportNumber', 'dateOfBirth', 'nationality', 'expiryDate'],
      processingTime: '24 ساعة',
      requiredSides: 1,
    },
    [DocumentType.NATIONAL_ID]: {
      name: 'البطاقة الشخصية',
      expectedFields: ['fullName', 'idNumber', 'dateOfBirth', 'nationality'],
      processingTime: '24 ساعة',
      requiredSides: 2,
    },
    [DocumentType.DRIVING_LICENSE]: {
      name: 'رخصة القيادة',
      expectedFields: ['fullName', 'licenseNumber', 'dateOfBirth', 'expiryDate'],
      processingTime: '24 ساعة',
      requiredSides: 2,
    },
  };

  return (
    documentTypeMap[documentType] || {
      name: 'وثيقة غير معروفة',
      expectedFields: [],
      processingTime: '48 ساعة',
      requiredSides: 1,
    }
  );
}

export default withUploadRateLimit(handler);
