/**
 * API Endpoint: رفع وتحسين الصور
 * POST /api/upload/image
 */

import formidable from 'formidable';
import fs from 'fs';
import type { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { uploadBufferToBlob } from '../../../lib/blob';
import type { UploadResult } from '../../../lib/image-optimization';

export const config = {
  api: {
    bodyParser: false,
  },
};

interface UploadResponse {
  success: boolean;
  data?: {
    original: UploadResult;
    optimized?: UploadResult;
    sizes?: { size: number; result: UploadResult; }[];
    formats?: Record<string, UploadResult>;
  };
  error?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<UploadResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'الطريقة غير مسموحة',
    });
  }

  try {
    // معالجة رفع الملف
    const uploadDir = path.join(os.tmpdir(), 'sooq-mazad', 'uploads', 'temp');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const form = formidable({
      uploadDir,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
      filter: (part) => {
        return part.mimetype?.startsWith('image/') || false;
      },
    });

    const [fields, files] = await form.parse(req);

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم رفع صورة',
      });
    }

    const file = fileArray[0];
    const fileBuffer = await fs.promises.readFile(file.filepath);
    const fileName = file.originalFilename || 'image.jpg';

    // قراءة الإعدادات
    const optimize = fields.optimize?.[0] === 'true';
    const generateSizes = fields.generateSizes?.[0] === 'true';
    const multiFormat = fields.multiFormat?.[0] === 'true';
    const format = (fields.format?.[0] || 'webp') as 'webp' | 'avif';
    const quality = parseInt(fields.quality?.[0] || '80', 10);
    const width = fields.width?.[0] ? parseInt(fields.width[0], 10) : undefined;
    const height = fields.height?.[0] ? parseInt(fields.height[0], 10) : undefined;

    async function uploadAsResult(params: {
      buffer: Buffer;
      filename: string;
      contentType: string;
      folder: string;
    }): Promise<UploadResult> {
      const meta = await sharp(params.buffer).metadata();
      const uploaded = await uploadBufferToBlob({
        buffer: params.buffer,
        filename: params.filename,
        contentType: params.contentType,
        folder: params.folder,
      });
      return {
        url: uploaded.url,
        cdnUrl: uploaded.url,
        fileName: params.filename,
        size: params.buffer.length,
        format: meta.format || 'unknown',
        width: meta.width || 0,
        height: meta.height || 0,
      };
    }

    const folder = 'uploads/images';
    const originalResult = await uploadAsResult({
      buffer: fileBuffer,
      filename: fileName,
      contentType: file.mimetype || 'image/jpeg',
      folder,
    });

    const responseData: UploadResponse['data'] = {
      original: originalResult,
    };

    // تحسين الصورة إذا مطلوب
    if (optimize) {
      let pipeline = sharp(fileBuffer).rotate();
      if (width || height) {
        pipeline = pipeline.resize(width, height, { fit: 'inside', withoutEnlargement: true });
      }
      const optimizedBuffer =
        format === 'avif'
          ? await pipeline.avif({ quality: 75 }).toBuffer()
          : await pipeline.webp({ quality }).toBuffer();

      const optimizedName = fileName.replace(/\.[^/.]+$/, `.${format}`);
      responseData.optimized = await uploadAsResult({
        buffer: optimizedBuffer,
        filename: optimizedName,
        contentType: format === 'avif' ? 'image/avif' : 'image/webp',
        folder,
      });
    }

    // إنشاء أحجام متعددة إذا مطلوب
    if (generateSizes) {
      const sizes = [320, 640, 768, 1024, 1280];
      const results: { size: number; result: UploadResult; }[] = [];
      for (const s of sizes) {
        const resized = await sharp(fileBuffer)
          .rotate()
          .resize(s, undefined, { fit: 'inside', withoutEnlargement: true })
          .toBuffer();

        const out =
          format === 'avif'
            ? await sharp(resized).avif({ quality: 75 }).toBuffer()
            : await sharp(resized).webp({ quality }).toBuffer();

        const sizedName = fileName.replace(/\.[^/.]+$/, `_${s}.${format}`);
        const r = await uploadAsResult({
          buffer: out,
          filename: sizedName,
          contentType: format === 'avif' ? 'image/avif' : 'image/webp',
          folder,
        });
        results.push({ size: s, result: r });
      }
      responseData.sizes = results;
    }

    // تحويل إلى صيغ متعددة إذا مطلوب
    if (multiFormat) {
      const webpBuf = await sharp(fileBuffer).rotate().webp({ quality }).toBuffer();
      const avifBuf = await sharp(fileBuffer).rotate().avif({ quality: 75 }).toBuffer();

      const webpName = fileName.replace(/\.[^/.]+$/, '.webp');
      const avifName = fileName.replace(/\.[^/.]+$/, '.avif');

      responseData.formats = {
        webp: await uploadAsResult({
          buffer: webpBuf,
          filename: webpName,
          contentType: 'image/webp',
          folder,
        }),
        avif: await uploadAsResult({
          buffer: avifBuf,
          filename: avifName,
          contentType: 'image/avif',
          folder,
        }),
      };
    }

    // حذف الملف المؤقت
    await fs.promises.unlink(file.filepath).catch(() => { });

    return res.status(200).json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.error('خطأ في رفع الصورة:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'فشل رفع الصورة',
    });
  }
}
