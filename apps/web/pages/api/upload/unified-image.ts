/**
 * 🌍 API رفع الصور الموحد العالمي
 * 
 * يدعم جميع أنواع الرفع: سيارات، ملفات شخصية، نقل، رسائل، معارض
 * ضغط وتحسين تلقائي بمعايير Enterprise
 * 
 * @endpoint POST /api/upload/unified-image
 */

import { File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';
import sharp from 'sharp';
import { uploadBufferToBlob } from '../../../lib/blob';

// تعطيل parser الافتراضي
export const config = {
    api: {
        bodyParser: false,
        responseLimit: '15mb',
    },
};

type ApiResponse = {
    success: boolean;
    data?: ImageOptimizationResult;
    error?: string;
    code?: string;
};

type ImageCategory = 'cars' | 'profiles' | 'transport' | 'messages' | 'showrooms' | 'general';

type UploadedImage = {
    url: string;
    path: string;
    size: number;
    width: number;
    height: number;
    format: string;
};

type ImageOptimizationResult = {
    success: boolean;
    original: UploadedImage;
    optimized?: UploadedImage;
    sizes?: Record<string, UploadedImage>;
    formats?: Record<string, UploadedImage>;
    placeholder?: string;
    savings?: {
        bytes: number;
        percentage: number;
    };
    error?: string;
};

type UploadOptions = {
    category: ImageCategory;
    userId?: string;
    entityId?: string;
    optimize?: boolean;
    generateSizes?: boolean;
    generateFormats?: boolean;
    quality?: number;
    maxWidth?: number;
    maxHeight?: number;
    generatePlaceholder?: boolean;
};

/**
 * استخراج معرف المستخدم من التوكن
 */
function extractUserId(req: NextApiRequest): string | null {
    try {
        // التحقق من header Authorization
        const authHeader = req.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
            return decoded.userId || decoded.id || null;
        }

        // التحقق من cookie للمديرين
        const adminSession = req.cookies['admin-session'];
        if (adminSession) {
            const decoded = jwt.verify(adminSession, process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!') as any;
            return decoded.adminId || decoded.id || null;
        }

        return null;
    } catch {
        return null;
    }
}

/**
 * معالجة النموذج
 */
async function parseForm(req: NextApiRequest): Promise<{
    fields: Record<string, any>;
    files: Record<string, FormidableFile | FormidableFile[]>;
}> {
    return new Promise((resolve, reject) => {
        const uploadDir = path.join(os.tmpdir(), 'sooq-mazad', 'uploads', 'temp');

        // إنشاء مجلد مؤقت
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const form = new IncomingForm({
            uploadDir,
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024,
            multiples: true,
            allowEmptyFiles: false,
            minFileSize: 1,
        });

        form.parse(req, (err, fields, files) => {
            if (err) {
                console.error('[UnifiedUpload] خطأ في تحليل النموذج:', err);
                reject(new Error(err.message.includes('maxFileSize')
                    ? 'حجم الملف كبير جداً. الحد الأقصى 10 ميجابايت'
                    : 'خطأ في معالجة الطلب'));
            } else {
                // تحويل الحقول
                const parsedFields: Record<string, any> = {};
                for (const [key, value] of Object.entries(fields)) {
                    parsedFields[key] = Array.isArray(value) ? value[0] : value;
                }
                resolve({ fields: parsedFields, files: files as any });
            }
        });
    });
}

/**
 * استخراج الملف من النتائج
 */
function extractFile(files: Record<string, FormidableFile | FormidableFile[]>): FormidableFile | null {
    // البحث في المفاتيح المعروفة
    const keys = ['image', 'file', 'photo', 'upload'];

    for (const key of keys) {
        if (files[key]) {
            const file = files[key];
            return Array.isArray(file) ? file[0] : file;
        }
    }

    // أخذ أول ملف متاح
    const allFiles = Object.values(files).flat();
    return allFiles[0] || null;
}

/**
 * تنظيف الملف المؤقت
 */
function cleanupFile(filepath: string): void {
    try {
        if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
        }
    } catch (e) {
        console.warn('[UnifiedUpload] فشل تنظيف الملف المؤقت:', e);
    }
}

/**
 * المعالج الرئيسي
 */
async function handler(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<void> {
    // التحقق من الطريقة
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'طريقة غير مسموحة',
            code: 'METHOD_NOT_ALLOWED',
        });
    }

    let tempFilePath: string | null = null;

    try {
        // استخراج معرف المستخدم (اختياري لبعض الحالات)
        const userId = extractUserId(req);

        // تحليل النموذج
        const { fields, files } = await parseForm(req);

        // استخراج الملف
        const file = extractFile(files);
        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'لم يتم العثور على ملف الصورة',
                code: 'NO_FILE',
            });
        }

        tempFilePath = file.filepath;

        // قراءة الملف
        const buffer = fs.readFileSync(file.filepath);

        // استخراج الخيارات
        const category = (fields.category as ImageCategory) || 'general';
        const entityId = fields.entityId as string;
        const optimize = fields.optimize !== 'false';
        const generateSizes = fields.generateSizes === 'true';
        const generateFormats = fields.generateFormats === 'true';
        const generatePlaceholder = fields.generatePlaceholder === 'true';
        const quality = fields.quality ? parseInt(fields.quality as string, 10) : undefined;
        const maxWidth = fields.maxWidth ? parseInt(fields.maxWidth as string, 10) : undefined;
        const maxHeight = fields.maxHeight ? parseInt(fields.maxHeight as string, 10) : undefined;

        // تكوين الخيارات
        const options: UploadOptions = {
            category,
            userId: userId || undefined,
            entityId,
            optimize,
            generateSizes,
            generateFormats,
            generatePlaceholder,
            quality,
            maxWidth,
            maxHeight,
        };

        console.log('[UnifiedUpload] معالجة صورة:', {
            category,
            originalName: file.originalFilename,
            size: buffer.length,
            userId,
        });

        const folderBase = `uploads/${options.category}`;
        const baseName = `${options.category}_${options.userId || 'anon'}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        const originalMetadata = await sharp(buffer).metadata();
        const originalExt = path.extname(file.originalFilename || '') || '.jpg';
        const originalName = `${baseName}${originalExt}`;
        const originalUploaded = await uploadBufferToBlob({
            buffer,
            filename: originalName,
            contentType: file.mimetype || 'application/octet-stream',
            folder: folderBase,
        });

        const result: ImageOptimizationResult = {
            success: true,
            original: {
                url: originalUploaded.url,
                path: originalUploaded.pathname,
                size: buffer.length,
                width: originalMetadata.width || 0,
                height: originalMetadata.height || 0,
                format: originalMetadata.format || 'unknown',
            },
        };

        let optimizedBuffer: Buffer | null = null;
        if (options.optimize) {
            const targetFormat = 'webp';
            const resized = sharp(buffer).rotate();
            const resized2 = (options.maxWidth || options.maxHeight)
                ? resized.resize(options.maxWidth, options.maxHeight, { fit: 'inside', withoutEnlargement: true })
                : resized;
            optimizedBuffer = await resized2.webp({ quality: options.quality || 82 }).toBuffer();

            const optimizedName = `${baseName}.${targetFormat}`;
            const optimizedUploaded = await uploadBufferToBlob({
                buffer: optimizedBuffer,
                filename: optimizedName,
                contentType: 'image/webp',
                folder: folderBase,
            });

            const optimizedMeta = await sharp(optimizedBuffer).metadata();
            result.optimized = {
                url: optimizedUploaded.url,
                path: optimizedUploaded.pathname,
                size: optimizedBuffer.length,
                width: optimizedMeta.width || 0,
                height: optimizedMeta.height || 0,
                format: optimizedMeta.format || 'webp',
            };

            result.savings = {
                bytes: buffer.length - optimizedBuffer.length,
                percentage: buffer.length ? Math.round(((buffer.length - optimizedBuffer.length) / buffer.length) * 100) : 0,
            };
        }

        if (options.generateSizes) {
            const sizes = {
                thumbnail: { width: 150, height: 150 },
                small: { width: 320, height: 240 },
                medium: { width: 640, height: 480 },
                large: { width: 1024, height: 768 },
            };
            result.sizes = {};
            for (const [key, dims] of Object.entries(sizes)) {
                const sizedBuffer = await sharp(optimizedBuffer || buffer)
                    .rotate()
                    .resize(dims.width, dims.height, { fit: 'inside', withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
                const sizedName = `${baseName}_${key}.webp`;
                const uploaded = await uploadBufferToBlob({
                    buffer: sizedBuffer,
                    filename: sizedName,
                    contentType: 'image/webp',
                    folder: folderBase,
                });
                const meta = await sharp(sizedBuffer).metadata();
                result.sizes[key] = {
                    url: uploaded.url,
                    path: uploaded.pathname,
                    size: sizedBuffer.length,
                    width: meta.width || 0,
                    height: meta.height || 0,
                    format: meta.format || 'webp',
                };
            }
        }

        if (options.generateFormats) {
            const formats: Array<'webp' | 'avif'> = ['webp', 'avif'];
            result.formats = {};
            for (const fmt of formats) {
                const out = fmt === 'webp'
                    ? await sharp(buffer).rotate().webp({ quality: options.quality || 82 }).toBuffer()
                    : await sharp(buffer).rotate().avif({ quality: 75 }).toBuffer();
                const name = `${baseName}.${fmt}`;
                const uploaded = await uploadBufferToBlob({
                    buffer: out,
                    filename: name,
                    contentType: fmt === 'webp' ? 'image/webp' : 'image/avif',
                    folder: folderBase,
                });
                const meta = await sharp(out).metadata();
                result.formats[fmt] = {
                    url: uploaded.url,
                    path: uploaded.pathname,
                    size: out.length,
                    width: meta.width || 0,
                    height: meta.height || 0,
                    format: meta.format || fmt,
                };
            }
        }

        if (options.generatePlaceholder) {
            const placeholderBuf = await sharp(buffer)
                .rotate()
                .resize(24, 24, { fit: 'inside', withoutEnlargement: true })
                .webp({ quality: 50 })
                .toBuffer();
            result.placeholder = `data:image/webp;base64,${placeholderBuf.toString('base64')}`;
        }

        // تنظيف الملف المؤقت
        cleanupFile(file.filepath);
        tempFilePath = null;

        if (!result.success) {
            return res.status(400).json({
                success: false,
                error: result.error || 'فشل معالجة الصورة',
                code: 'PROCESSING_FAILED',
            });
        }

        console.log('[UnifiedUpload] نجاح:', {
            original: result.original.url,
            optimized: result.optimized?.url,
            savings: result.savings,
        });

        return res.status(200).json({
            success: true,
            data: result,
        });

    } catch (error) {
        console.error('[UnifiedUpload] خطأ:', error);

        // تنظيف في حالة الخطأ
        if (tempFilePath) {
            cleanupFile(tempFilePath);
        }

        const message = error instanceof Error ? error.message : 'خطأ في الخادم';

        return res.status(500).json({
            success: false,
            error: message,
            code: 'SERVER_ERROR',
        });
    }
}

export default handler;
