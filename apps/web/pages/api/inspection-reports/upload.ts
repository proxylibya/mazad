import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import { uploadBufferToBlob } from '../../../lib/blob';

// تعطيل body parser الافتراضي لـ Next.js
export const config = {
  api: {
    bodyParser: false,
  },
};

interface ParsedFile {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
}

interface ParsedFormData {
  file: ParsedFile | null;
  userId: string;
}

// دالة لقراءة البيانات من الطلب
async function parseFormData(req: NextApiRequest): Promise<ParsedFormData> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let userId = 'temp_user';

    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks);
        const contentType = req.headers['content-type'] || '';
        const boundaryMatch = contentType.match(/boundary=(.+)/);

        if (!boundaryMatch) {
          console.log('[API] لم يتم العثور على boundary');
          resolve({ file: null, userId });
          return;
        }

        const boundary = boundaryMatch[1];
        const parts = buffer.toString('binary').split(`--${boundary}`);
        let parsedFile: ParsedFile | null = null;

        for (const part of parts) {
          if (part.includes('Content-Disposition')) {
            const nameMatch = part.match(/name="([^"]+)"/);
            const filenameMatch = part.match(/filename="([^"]+)"/);
            const contentTypeMatch = part.match(/Content-Type:\s*([^\r\n]+)/);

            if (nameMatch) {
              const fieldName = nameMatch[1];

              if (fieldName === 'file' && filenameMatch) {
                const fileName = filenameMatch[1];
                const mimeType = contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream';

                // استخراج محتوى الملف
                const contentStart = part.indexOf('\r\n\r\n') + 4;
                const contentEnd = part.lastIndexOf('\r\n');

                if (contentStart > 4 && contentEnd > contentStart) {
                  const fileContent = part.slice(contentStart, contentEnd);
                  parsedFile = {
                    buffer: Buffer.from(fileContent, 'binary'),
                    fileName,
                    mimeType,
                  };
                }
              } else if (fieldName === 'userId') {
                const valueStart = part.indexOf('\r\n\r\n') + 4;
                const valueEnd = part.lastIndexOf('\r\n');
                if (valueStart > 4 && valueEnd > valueStart) {
                  userId = part.slice(valueStart, valueEnd).trim();
                }
              }
            }
          }
        }

        resolve({ file: parsedFile, userId });
      } catch (error) {
        console.error('[API] خطأ في تحليل البيانات:', error);
        reject(error);
      }
    });

    req.on('error', (error) => {
      console.error('[API] خطأ في قراءة الطلب:', error);
      reject(error);
    });
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // إضافة headers
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'طريقة غير مدعومة',
    });
  }

  try {
    console.log('[API] بدء معالجة طلب رفع تقرير الفحص');

    // تحليل البيانات المرسلة
    const { file, userId } = await parseFormData(req);

    console.log('[API] معلومات الملف:', {
      hasFile: !!file,
      fileName: file?.fileName,
      mimeType: file?.mimeType,
      userId,
      fileSize: file?.buffer?.length,
    });

    if (!file || !file.buffer) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم رفع أي ملف',
        message: 'يرجى اختيار ملف للرفع',
      });
    }

    // التحقق من نوع الملف
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.mimeType)) {
      return res.status(400).json({
        success: false,
        error: 'نوع الملف غير مدعوم. يرجى رفع ملف PDF أو صورة',
      });
    }

    // التحقق من حجم الملف (5MB)
    if (file.buffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({
        success: false,
        error: 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت',
      });
    }

    // إنشاء اسم ملف فريد
    const timestamp = Date.now();
    const extension = path.extname(file.fileName) || '.jpg';
    const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const newFileName = `inspection_report_${safeUserId}_${timestamp}${extension}`;

    // رفع الملف إلى Vercel Blob
    const uploaded = await uploadBufferToBlob({
      buffer: file.buffer,
      filename: newFileName,
      contentType: file.mimeType,
      folder: `uploads/inspection-reports/${safeUserId}`,
    });

    const uploadId = `inspection_${timestamp}_${Math.random().toString(36).substr(2, 9)}`;
    const fileUrl = uploaded.url;
    const fileType = file.mimeType.startsWith('image/') ? 'image' : 'pdf';

    console.log('[API] تم حفظ الملف بنجاح:', {
      fileName: newFileName,
      fileUrl,
      fileSize: file.buffer.length,
      fileType,
    });

    return res.status(200).json({
      success: true,
      message: 'تم رفع ملف تقرير الفحص بنجاح',
      data: {
        fileName: newFileName,
        fileUrl,
        fileSize: file.buffer.length,
        uploadId,
        fileType,
      },
    });
  } catch (error) {
    console.error('[API] خطأ في رفع ملف تقرير الفحص:', error);

    return res.status(500).json({
      success: false,
      error: 'فشل في رفع الملف. يرجى المحاولة مرة أخرى',
      message: process.env.NODE_ENV === 'development' ? String(error) : undefined,
    });
  }
}
