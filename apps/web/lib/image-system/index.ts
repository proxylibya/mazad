/**
 * 🌍 نظام الصور الموحد العالمي - Enterprise Image System
 * 
 * نظام متكامل لإدارة وتحسين الصور بمعايير الشركات الكبرى
 * يدعم: WebP, AVIF, ضغط متقدم, أحجام متعددة, CDN
 * 
 * @author سوق مزاد
 * @version 2.0.0
 */

import { existsSync, mkdirSync } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

// ============================================
// 📋 التكوين والثوابت
// ============================================

export const IMAGE_CONFIG = {
    // الحجم الأقصى للرفع (10 ميجابايت)
    MAX_FILE_SIZE: 10 * 1024 * 1024,

    // الحجم الأدنى للرفع (1 كيلوبايت)
    MIN_FILE_SIZE: 1024,

    // الصيغ المسموحة
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'],
    ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'],

    // جودة الضغط الافتراضية
    DEFAULT_QUALITY: 82,
    THUMBNAIL_QUALITY: 75,

    // الأحجام المعيارية
    SIZES: {
        thumbnail: { width: 150, height: 150, suffix: '_thumb' },
        small: { width: 320, height: 240, suffix: '_sm' },
        medium: { width: 640, height: 480, suffix: '_md' },
        large: { width: 1024, height: 768, suffix: '_lg' },
        xlarge: { width: 1920, height: 1440, suffix: '_xl' },
    } as const,

    // مسارات التخزين
    PATHS: {
        uploads: 'public/uploads',
        optimized: 'public/uploads/optimized',
        temp: 'uploads/temp',
        cars: 'public/uploads/cars',
        profiles: 'public/uploads/profiles',
        transport: 'public/uploads/transport',
        messages: 'public/uploads/messages',
        showrooms: 'public/uploads/showrooms',
    } as const,

    // إعدادات CDN
    CDN: {
        enabled: !!process.env.CDN_URL,
        url: process.env.CDN_URL || '',
        cloudflare: process.env.CLOUDFLARE_IMAGES_URL || '',
        s3Bucket: process.env.AWS_S3_BUCKET || '',
    },
} as const;

// ============================================
// 📦 الأنواع والواجهات
// ============================================

export type ImageSize = keyof typeof IMAGE_CONFIG.SIZES;
export type ImageFormat = 'webp' | 'avif' | 'jpeg' | 'png';
export type ImageCategory = 'cars' | 'profiles' | 'transport' | 'messages' | 'showrooms' | 'general';

export interface ImageMetadata {
    width: number;
    height: number;
    format: string;
    size: number;
    hasAlpha: boolean;
}

export interface OptimizedImage {
    url: string;
    path: string;
    size: number;
    width: number;
    height: number;
    format: ImageFormat;
}

export interface ImageOptimizationResult {
    success: boolean;
    original: OptimizedImage;
    optimized?: OptimizedImage;
    sizes?: Record<ImageSize, OptimizedImage>;
    formats?: Record<ImageFormat, OptimizedImage>;
    placeholder?: string;
    metadata: ImageMetadata;
    savings?: {
        bytes: number;
        percentage: number;
    };
    error?: string;
}

export interface UploadOptions {
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
}

// ============================================
// 🔧 الأدوات المساعدة
// ============================================

/**
 * إنشاء المجلدات المطلوبة
 */
export async function ensureDirectories(): Promise<void> {
    const dirs = Object.values(IMAGE_CONFIG.PATHS);
    for (const dir of dirs) {
        const fullPath = path.join(process.cwd(), dir);
        if (!existsSync(fullPath)) {
            mkdirSync(fullPath, { recursive: true });
        }
    }
}

/**
 * توليد اسم ملف فريد
 */
export function generateFileName(
    originalName: string,
    category: ImageCategory,
    userId?: string
): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(originalName).toLowerCase() || '.jpg';
    const allowedExt = ext as (typeof IMAGE_CONFIG.ALLOWED_EXTENSIONS)[number];
    const safeExt = IMAGE_CONFIG.ALLOWED_EXTENSIONS.includes(allowedExt) ? allowedExt : '.jpg';

    const parts = [category, timestamp, random];
    if (userId) parts.splice(1, 0, userId);

    return `${parts.join('_')}${safeExt}`;
}

/**
 * الحصول على مسار التخزين حسب الفئة
 */
export function getStoragePath(category: ImageCategory): string {
    const pathMap: Record<ImageCategory, string> = {
        cars: IMAGE_CONFIG.PATHS.cars,
        profiles: IMAGE_CONFIG.PATHS.profiles,
        transport: IMAGE_CONFIG.PATHS.transport,
        messages: IMAGE_CONFIG.PATHS.messages,
        showrooms: IMAGE_CONFIG.PATHS.showrooms,
        general: IMAGE_CONFIG.PATHS.uploads,
    };
    return pathMap[category] || IMAGE_CONFIG.PATHS.uploads;
}

/**
 * تحويل المسار المحلي إلى URL
 */
export function pathToUrl(localPath: string): string {
    const relativePath = localPath.replace(/^public[\\/]/, '/').replace(/\\/g, '/');

    if (IMAGE_CONFIG.CDN.enabled && IMAGE_CONFIG.CDN.url) {
        return `${IMAGE_CONFIG.CDN.url}${relativePath}`;
    }

    return relativePath;
}

/**
 * التحقق من صحة الملف
 */
export function validateImageFile(
    buffer: Buffer,
    mimetype?: string,
    filename?: string
): { valid: boolean; error?: string; format?: string; } {
    // التحقق من الحجم
    if (buffer.length > IMAGE_CONFIG.MAX_FILE_SIZE) {
        return { valid: false, error: `حجم الملف كبير جداً. الحد الأقصى ${IMAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024} ميجابايت` };
    }

    if (buffer.length < IMAGE_CONFIG.MIN_FILE_SIZE) {
        return { valid: false, error: 'حجم الملف صغير جداً' };
    }

    // التحقق من التوقيع (magic bytes)
    const header = buffer.subarray(0, 12).toString('hex').toUpperCase();
    let detectedFormat = '';

    if (header.startsWith('FFD8FF')) {
        detectedFormat = 'jpeg';
    } else if (header.startsWith('89504E47')) {
        detectedFormat = 'png';
    } else if (header.startsWith('47494638')) {
        detectedFormat = 'gif';
    } else if (buffer.subarray(8, 12).toString() === 'WEBP') {
        detectedFormat = 'webp';
    } else if (header.includes('66747970')) {
        detectedFormat = 'avif';
    }

    if (!detectedFormat) {
        return { valid: false, error: 'صيغة الصورة غير مدعومة' };
    }

    return { valid: true, format: detectedFormat };
}

// ============================================
// 🖼️ معالجة الصور
// ============================================

/**
 * الحصول على metadata الصورة
 */
export async function getImageMetadata(buffer: Buffer): Promise<ImageMetadata> {
    const metadata = await sharp(buffer).metadata();

    return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: buffer.length,
        hasAlpha: metadata.hasAlpha || false,
    };
}

/**
 * ضغط وتحسين صورة واحدة
 */
export async function optimizeImage(
    buffer: Buffer,
    options: {
        format?: ImageFormat;
        quality?: number;
        width?: number;
        height?: number;
        fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
    } = {}
): Promise<{ buffer: Buffer; metadata: ImageMetadata; }> {
    const {
        format = 'webp',
        quality = IMAGE_CONFIG.DEFAULT_QUALITY,
        width,
        height,
        fit = 'cover',
    } = options;

    let pipeline = sharp(buffer);

    // تغيير الحجم إذا طُلب
    if (width || height) {
        pipeline = pipeline.resize(width, height, {
            fit,
            withoutEnlargement: true,
            position: 'center',
        });
    }

    // تطبيق التحسينات الأساسية
    pipeline = pipeline
        .rotate() // تصحيح الاتجاه من EXIF
        .normalize() // تحسين التباين
        .sharpen({ sigma: 0.5 }); // شحذ خفيف

    // تحويل الصيغة والضغط
    switch (format) {
        case 'webp':
            pipeline = pipeline.webp({
                quality,
                effort: 4,
                smartSubsample: true,
            });
            break;
        case 'avif':
            pipeline = pipeline.avif({
                quality,
                effort: 4,
                chromaSubsampling: '4:2:0',
            });
            break;
        case 'jpeg':
            pipeline = pipeline.jpeg({
                quality,
                progressive: true,
                mozjpeg: true,
            });
            break;
        case 'png':
            pipeline = pipeline.png({
                quality,
                progressive: true,
                compressionLevel: 9,
            });
            break;
    }

    const outputBuffer = await pipeline.toBuffer();
    const metadata = await getImageMetadata(outputBuffer);

    return { buffer: outputBuffer, metadata };
}

/**
 * توليد أحجام متعددة
 */
export async function generateMultipleSizes(
    buffer: Buffer,
    outputDir: string,
    baseName: string,
    sizes: ImageSize[] = ['thumbnail', 'small', 'medium', 'large']
): Promise<Record<ImageSize, OptimizedImage>> {
    const results: Record<string, OptimizedImage> = {};

    for (const sizeName of sizes) {
        const sizeConfig = IMAGE_CONFIG.SIZES[sizeName];
        const fileName = `${baseName}${sizeConfig.suffix}.webp`;
        const filePath = path.join(outputDir, fileName);

        const { buffer: optimized, metadata } = await optimizeImage(buffer, {
            format: 'webp',
            width: sizeConfig.width,
            height: sizeConfig.height,
            quality: sizeName === 'thumbnail' ? IMAGE_CONFIG.THUMBNAIL_QUALITY : IMAGE_CONFIG.DEFAULT_QUALITY,
        });

        await fs.writeFile(filePath, optimized);

        results[sizeName] = {
            url: pathToUrl(filePath),
            path: filePath,
            size: optimized.length,
            width: metadata.width,
            height: metadata.height,
            format: 'webp',
        };
    }

    return results as Record<ImageSize, OptimizedImage>;
}

/**
 * توليد صيغ متعددة
 */
export async function generateMultipleFormats(
    buffer: Buffer,
    outputDir: string,
    baseName: string,
    formats: ImageFormat[] = ['webp', 'avif', 'jpeg']
): Promise<Record<ImageFormat, OptimizedImage>> {
    const results: Record<string, OptimizedImage> = {};

    for (const format of formats) {
        const fileName = `${baseName}.${format}`;
        const filePath = path.join(outputDir, fileName);

        const { buffer: optimized, metadata } = await optimizeImage(buffer, {
            format,
            quality: IMAGE_CONFIG.DEFAULT_QUALITY,
        });

        await fs.writeFile(filePath, optimized);

        results[format] = {
            url: pathToUrl(filePath),
            path: filePath,
            size: optimized.length,
            width: metadata.width,
            height: metadata.height,
            format,
        };
    }

    return results as Record<ImageFormat, OptimizedImage>;
}

/**
 * توليد placeholder صغير جداً
 */
export async function generatePlaceholder(
    buffer: Buffer,
    size: number = 20
): Promise<string> {
    const tiny = await sharp(buffer)
        .resize(size, size, { fit: 'cover' })
        .blur(2)
        .jpeg({ quality: 20 })
        .toBuffer();

    return `data:image/jpeg;base64,${tiny.toString('base64')}`;
}

// ============================================
// 📤 الرفع والحفظ
// ============================================

/**
 * معالجة ورفع صورة كاملة
 */
export async function processAndSaveImage(
    buffer: Buffer,
    originalName: string,
    options: UploadOptions
): Promise<ImageOptimizationResult> {
    try {
        // التحقق من الصورة
        const validation = validateImageFile(buffer);
        if (!validation.valid) {
            return {
                success: false,
                original: {} as OptimizedImage,
                metadata: {} as ImageMetadata,
                error: validation.error,
            };
        }

        // إنشاء المجلدات
        await ensureDirectories();

        // الحصول على metadata الأصلية
        const originalMetadata = await getImageMetadata(buffer);

        // توليد اسم الملف
        const fileName = generateFileName(originalName, options.category, options.userId);
        const baseName = path.parse(fileName).name;
        const storagePath = getStoragePath(options.category);
        const outputDir = path.join(process.cwd(), storagePath);

        // حفظ الصورة الأصلية
        const originalPath = path.join(outputDir, fileName);
        await fs.writeFile(originalPath, buffer);

        const original: OptimizedImage = {
            url: pathToUrl(originalPath),
            path: originalPath,
            size: buffer.length,
            width: originalMetadata.width,
            height: originalMetadata.height,
            format: validation.format as ImageFormat,
        };

        const result: ImageOptimizationResult = {
            success: true,
            original,
            metadata: originalMetadata,
        };

        // تحسين الصورة إذا طُلب
        if (options.optimize !== false) {
            const { buffer: optimized, metadata } = await optimizeImage(buffer, {
                format: 'webp',
                quality: options.quality || IMAGE_CONFIG.DEFAULT_QUALITY,
                width: options.maxWidth,
                height: options.maxHeight,
            });

            const optimizedPath = path.join(outputDir, `${baseName}_optimized.webp`);
            await fs.writeFile(optimizedPath, optimized);

            result.optimized = {
                url: pathToUrl(optimizedPath),
                path: optimizedPath,
                size: optimized.length,
                width: metadata.width,
                height: metadata.height,
                format: 'webp',
            };

            // حساب التوفير
            result.savings = {
                bytes: buffer.length - optimized.length,
                percentage: Math.round(((buffer.length - optimized.length) / buffer.length) * 100),
            };
        }

        // توليد أحجام متعددة إذا طُلب
        if (options.generateSizes) {
            result.sizes = await generateMultipleSizes(buffer, outputDir, baseName);
        }

        // توليد صيغ متعددة إذا طُلب
        if (options.generateFormats) {
            result.formats = await generateMultipleFormats(buffer, outputDir, baseName);
        }

        // توليد placeholder إذا طُلب
        if (options.generatePlaceholder) {
            result.placeholder = await generatePlaceholder(buffer);
        }

        return result;
    } catch (error) {
        console.error('[ImageSystem] خطأ في معالجة الصورة:', error);
        return {
            success: false,
            original: {} as OptimizedImage,
            metadata: {} as ImageMetadata,
            error: error instanceof Error ? error.message : 'خطأ غير معروف',
        };
    }
}

// ============================================
// 🗑️ إدارة الملفات
// ============================================

/**
 * حذف صورة ومشتقاتها
 */
export async function deleteImage(imagePath: string): Promise<boolean> {
    try {
        const dir = path.dirname(imagePath);
        const baseName = path.parse(imagePath).name.replace(/_thumb|_sm|_md|_lg|_xl|_optimized/, '');

        // البحث عن جميع الملفات المرتبطة
        const files = await fs.readdir(dir);
        const relatedFiles = files.filter(f => f.startsWith(baseName));

        // حذف جميع الملفات
        for (const file of relatedFiles) {
            const filePath = path.join(dir, file);
            await fs.unlink(filePath).catch(() => { });
        }

        return true;
    } catch (error) {
        console.error('[ImageSystem] خطأ في حذف الصورة:', error);
        return false;
    }
}

/**
 * تنظيف الملفات المؤقتة
 */
export async function cleanupTempFiles(maxAgeMs: number = 3600000): Promise<number> {
    let cleaned = 0;

    try {
        const tempDir = path.join(process.cwd(), IMAGE_CONFIG.PATHS.temp);
        if (!existsSync(tempDir)) return 0;

        const files = await fs.readdir(tempDir);
        const now = Date.now();

        for (const file of files) {
            const filePath = path.join(tempDir, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtimeMs > maxAgeMs) {
                await fs.unlink(filePath);
                cleaned++;
            }
        }
    } catch (error) {
        console.error('[ImageSystem] خطأ في تنظيف الملفات:', error);
    }

    return cleaned;
}

// ============================================
// 🎨 أدوات HTML
// ============================================

/**
 * توليد srcset للصور المتجاوبة
 */
export function generateSrcSet(
    sizes: Record<ImageSize, OptimizedImage>
): string {
    const entries = Object.entries(sizes)
        .map(([, img]) => `${img.url} ${img.width}w`)
        .join(', ');

    return entries;
}

/**
 * توليد عنصر picture HTML
 */
export function generatePictureElement(
    result: ImageOptimizationResult,
    alt: string,
    className?: string
): string {
    const sources: string[] = [];

    // AVIF source
    if (result.formats?.avif) {
        sources.push(`<source type="image/avif" srcset="${result.formats.avif.url}" />`);
    }

    // WebP source
    if (result.formats?.webp) {
        sources.push(`<source type="image/webp" srcset="${result.formats.webp.url}" />`);
    }

    // srcset للأحجام
    let srcset = '';
    if (result.sizes) {
        srcset = `srcset="${generateSrcSet(result.sizes)}"`;
    }

    // الصورة الافتراضية
    const fallback = result.optimized || result.original;

    return `
<picture>
  ${sources.join('\n  ')}
  <img 
    src="${fallback.url}" 
    alt="${alt}"
    width="${fallback.width}"
    height="${fallback.height}"
    ${srcset}
    ${className ? `class="${className}"` : ''}
    loading="lazy"
    decoding="async"
  />
</picture>
  `.trim();
}

// ============================================
// 📊 الإحصائيات
// ============================================

/**
 * الحصول على إحصائيات التخزين
 */
export async function getStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byCategory: Record<ImageCategory, { files: number; size: number; }>;
}> {
    const stats = {
        totalFiles: 0,
        totalSize: 0,
        byCategory: {} as Record<ImageCategory, { files: number; size: number; }>,
    };

    const categories: ImageCategory[] = ['cars', 'profiles', 'transport', 'messages', 'showrooms', 'general'];

    for (const category of categories) {
        const dirPath = path.join(process.cwd(), getStoragePath(category));

        if (!existsSync(dirPath)) {
            stats.byCategory[category] = { files: 0, size: 0 };
            continue;
        }

        try {
            const files = await fs.readdir(dirPath);
            let categorySize = 0;

            for (const file of files) {
                const filePath = path.join(dirPath, file);
                const fileStat = await fs.stat(filePath);
                if (fileStat.isFile()) {
                    categorySize += fileStat.size;
                }
            }

            stats.byCategory[category] = { files: files.length, size: categorySize };
            stats.totalFiles += files.length;
            stats.totalSize += categorySize;
        } catch {
            stats.byCategory[category] = { files: 0, size: 0 };
        }
    }

    return stats;
}

// ============================================
// 📤 التصدير الموحد
// ============================================

export const ImageSystem = {
    // التكوين
    CONFIG: IMAGE_CONFIG,

    // الأدوات
    ensureDirectories,
    generateFileName,
    getStoragePath,
    pathToUrl,
    validateImageFile,

    // المعالجة
    getImageMetadata,
    optimizeImage,
    generateMultipleSizes,
    generateMultipleFormats,
    generatePlaceholder,
    processAndSaveImage,

    // الإدارة
    deleteImage,
    cleanupTempFiles,

    // HTML
    generateSrcSet,
    generatePictureElement,

    // الإحصائيات
    getStorageStats,
};

export default ImageSystem;
