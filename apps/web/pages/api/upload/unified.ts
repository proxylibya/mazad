/**
 * 🌍 API رفع الصور الموحد - Enterprise Unified Upload API
 * 
 * نقطة نهاية واحدة لجميع عمليات رفع الصور في المشروع
 * يدعم: السيارات، المزادات، الملفات الشخصية، النقل، الرسائل
 */

import { File, IncomingForm } from 'formidable';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import sharp from 'sharp';
import { uploadBufferToBlob } from '../../../lib/blob';

// تعطيل bodyParser الافتراضي
export const config = {
    api: {
        bodyParser: false,
        responseLimit: '15mb',
    },
};

// ============================================
// التكوين
// ============================================

const CONFIG = {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    MIN_FILE_SIZE: 1024, // 1KB
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    QUALITY: 82,
    SIZES: {
        thumb: { width: 150, height: 150 },
        small: { width: 320, height: 240 },
        medium: { width: 640, height: 480 },
        large: { width: 1024, height: 768 },
    },
    PATHS: {
        cars: 'public/uploads/cars',
        profiles: 'public/uploads/profiles',
        transport: 'public/uploads/transport',
        messages: 'public/uploads/messages',
        showrooms: 'public/uploads/showrooms',
        auctions: 'public/uploads/auctions',
        general: 'public/uploads',
        temp: 'uploads/temp',
    } as Record<string, string>,
};

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-in-production';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || JWT_SECRET;

// ============================================
// الأنواع
// ============================================

interface UploadResult {
    success: boolean;
    url?: string;
    urls?: {
        original: string;
        optimized?: string;
        thumb?: string;
        small?: string;
        medium?: string;
        large?: string;
    };
    metadata?: {
        width: number;
        height: number;
        format: string;
        size: number;
        originalSize: number;
        savings: number;
    };
    error?: string;
}

interface AuthResult {
    authenticated: boolean;
    userId?: string;
    isAdmin?: boolean;
    error?: string;
}

// ============================================
// المصادقة
// ============================================

async function verifyAuth(req: NextApiRequest): Promise<AuthResult> {
    // فحص token المستخدم العادي
    const userToken = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

    // فحص token المدير
    const adminToken = req.cookies.admin_session || req.cookies.admin_token;

    // محاولة التحقق من المدير أولاً
    if (adminToken) {
        try {
            const decoded = jwt.verify(adminToken, ADMIN_JWT_SECRET) as { adminId: string; type: string; };
            if (decoded.type === 'admin') {
                return { authenticated: true, userId: decoded.adminId, isAdmin: true };
            }
        } catch {
            // تجاهل - سنحاول token المستخدم
        }
    }

    // محاولة التحقق من المستخدم العادي
    if (userToken) {
        try {
            const decoded = jwt.verify(userToken, JWT_SECRET) as { userId: string; };
            return { authenticated: true, userId: decoded.userId, isAdmin: false };
        } catch {
            return { authenticated: false, error: 'جلسة منتهية' };
        }
    }

    return { authenticated: false, error: 'مطلوب تسجيل الدخول' };
}

// ============================================
// معالجة الصور
// ============================================

async function processImage(
    buffer: Buffer,
    options: {
        quality?: number;
        width?: number;
        height?: number;
        format?: 'webp' | 'jpeg';
    } = {}
): Promise<Buffer> {
    const { quality = CONFIG.QUALITY, width, height, format = 'webp' } = options;

    let pipeline = sharp(buffer)
        .rotate() // تصحيح الاتجاه
        .normalize(); // تحسين التباين

    if (width || height) {
        pipeline = pipeline.resize(width, height, {
            fit: 'cover',
            withoutEnlargement: true,
            position: 'center',
        });
    }

    if (format === 'webp') {
        pipeline = pipeline.webp({ quality, effort: 4 });
    } else {
        pipeline = pipeline.jpeg({ quality, progressive: true, mozjpeg: true });
    }

    return pipeline.toBuffer();
}

async function validateImage(buffer: Buffer): Promise<{ valid: boolean; error?: string; metadata?: sharp.Metadata; }> {
    // التحقق من الحجم
    if (buffer.length > CONFIG.MAX_FILE_SIZE) {
        return { valid: false, error: `الحد الأقصى للحجم ${CONFIG.MAX_FILE_SIZE / 1024 / 1024} ميجابايت` };
    }

    if (buffer.length < CONFIG.MIN_FILE_SIZE) {
        return { valid: false, error: 'الملف صغير جداً' };
    }

    // التحقق باستخدام sharp
    try {
        const metadata = await sharp(buffer).metadata();
        if (!metadata.format || !['jpeg', 'png', 'webp', 'gif'].includes(metadata.format)) {
            return { valid: false, error: 'صيغة الصورة غير مدعومة' };
        }
        return { valid: true, metadata };
    } catch {
        return { valid: false, error: 'ملف صورة غير صالح' };
    }
}

// ============================================
// الأدوات المساعدة
// ============================================

function generateFileName(category: string, userId: string, ext: string = '.webp'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${category}_${userId}_${timestamp}_${random}${ext}`;
}

async function ensureDir(dirPath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), dirPath);
    await fs.mkdir(fullPath, { recursive: true });
}

function pathToUrl(filePath: string): string {
    return filePath.replace(/^public/, '').replace(/\\/g, '/');
}

// ============================================
// Handler الرئيسي
// ============================================

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // السماح بـ OPTIONS للـ CORS
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' } as UploadResult);
    }

    try {
        // التحقق من المصادقة
        const auth = await verifyAuth(req);
        if (!auth.authenticated) {
            return res.status(401).json({ success: false, error: auth.error || 'غير مصرح' } as UploadResult);
        }

        // قراءة الفئة من query
        const category = (req.query.category as string) || 'general';
        const generateSizes = req.query.sizes === 'true';
        const optimize = req.query.optimize !== 'false';

        // التأكد من صحة الفئة
        const uploadPath = CONFIG.PATHS[category] || CONFIG.PATHS.general;
        const blobFolder = CONFIG.PATHS[category] ? `uploads/${category}` : 'uploads/general';

        // تحليل الملف
        const form = new IncomingForm({
            maxFileSize: CONFIG.MAX_FILE_SIZE,
            keepExtensions: true,
            filter: ({ mimetype }) => CONFIG.ALLOWED_TYPES.includes(mimetype || ''),
        });

        const [, files] = await form.parse(req);
        const uploadedFile = (files.file?.[0] || files.image?.[0]) as File | undefined;

        if (!uploadedFile) {
            return res.status(400).json({ success: false, error: 'لم يتم إرسال ملف' });
        }

        // قراءة الملف
        const buffer = await fs.readFile(uploadedFile.filepath);

        // التحقق من الصورة
        const validation = await validateImage(buffer);
        if (!validation.valid) {
            await fs.unlink(uploadedFile.filepath).catch(() => { });
            return res.status(400).json({ success: false, error: validation.error });
        }

        const userId = auth.userId || 'anonymous';
        const baseName = generateFileName(category, userId, '');

        const result: UploadResult = {
            success: true,
            urls: {} as UploadResult['urls'],
            metadata: {
                width: validation.metadata?.width || 0,
                height: validation.metadata?.height || 0,
                format: validation.metadata?.format || 'unknown',
                size: 0,
                originalSize: buffer.length,
                savings: 0,
            },
        };

        // حفظ الصورة الأصلية (إذا طُلب عدم التحسين)
        if (!optimize) {
            const originalFormat = validation.metadata?.format || 'jpeg';
            const originalExt = originalFormat === 'jpeg' ? 'jpg' : originalFormat;
            const originalContentType = uploadedFile.mimetype || `image/${originalExt}`;

            const uploadedOriginal = await uploadBufferToBlob({
                buffer,
                filename: `${baseName}.${originalExt}`,
                contentType: originalContentType,
                folder: blobFolder,
            });

            result.url = uploadedOriginal.url;
            result.urls!.original = uploadedOriginal.url;
        } else {
            // تحسين وحفظ الصورة
            const optimizedBuffer = await processImage(buffer);

            const originalFormat = validation.metadata?.format || 'jpeg';
            const originalExt = originalFormat === 'jpeg' ? 'jpg' : originalFormat;
            const originalContentType = uploadedFile.mimetype || `image/${originalExt}`;

            const [uploadedOriginal, uploadedOptimized] = await Promise.all([
                uploadBufferToBlob({
                    buffer,
                    filename: `${baseName}_original.${originalExt}`,
                    contentType: originalContentType,
                    folder: blobFolder,
                }),
                uploadBufferToBlob({
                    buffer: optimizedBuffer,
                    filename: `${baseName}.webp`,
                    contentType: 'image/webp',
                    folder: blobFolder,
                }),
            ]);

            result.url = uploadedOptimized.url;
            result.urls!.original = uploadedOriginal.url;
            result.urls!.optimized = uploadedOptimized.url;
            result.metadata!.size = optimizedBuffer.length;
            result.metadata!.savings = Math.round(((buffer.length - optimizedBuffer.length) / buffer.length) * 100);

            // توليد أحجام متعددة إذا طُلب
            if (generateSizes) {
                for (const [sizeName, dimensions] of Object.entries(CONFIG.SIZES)) {
                    const sizedBuffer = await processImage(buffer, dimensions);
                    const uploadedSized = await uploadBufferToBlob({
                        buffer: sizedBuffer,
                        filename: `${baseName}_${sizeName}.webp`,
                        contentType: 'image/webp',
                        folder: blobFolder,
                    });
                    (result.urls as Record<string, string>)[sizeName] = uploadedSized.url;
                }
            }
        }

        // حذف الملف المؤقت
        await fs.unlink(uploadedFile.filepath).catch(() => { });

        return res.status(200).json(result);
    } catch (error) {
        console.error('[Unified Upload] Error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'خطأ في رفع الصورة',
        });
    }
}
