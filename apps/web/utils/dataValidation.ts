/**
 * أدوات التحقق من البيانات
 * Data Validation Utilities
 */

/**
 * التحقق من البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * التحقق من رقم الهاتف الليبي
 */
export function isValidLibyanPhone(phone: string): boolean {
    const cleaned = phone.replace(/[\s-]/g, '');
    const libyanPhoneRegex = /^(\+?218|0)?9[0-9]\d{7}$/;
    return libyanPhoneRegex.test(cleaned);
}

/**
 * التحقق من النص الفارغ
 */
export function isNotEmpty(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value).length > 0;
    return true;
}

/**
 * التحقق من الرقم الموجب
 */
export function isPositiveNumber(value: unknown): boolean {
    const num = Number(value);
    return !isNaN(num) && num > 0;
}

/**
 * التحقق من النطاق
 */
export function isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}

/**
 * التحقق من الطول
 */
export function hasMinLength(value: string, minLength: number): boolean {
    return value.length >= minLength;
}

export function hasMaxLength(value: string, maxLength: number): boolean {
    return value.length <= maxLength;
}

/**
 * التحقق من السنة
 */
export function isValidYear(year: number, minYear: number = 1900): boolean {
    const currentYear = new Date().getFullYear();
    return year >= minYear && year <= currentYear + 1;
}

/**
 * التحقق من السعر
 */
export function isValidPrice(price: number, min: number = 0, max: number = 100000000): boolean {
    return isPositiveNumber(price) && isInRange(price, min, max);
}

/**
 * تنظيف النص من الأحرف الخاصة
 */
export function sanitizeText(text: string): string {
    return text
        .replace(/<[^>]*>/g, '') // إزالة HTML
        .replace(/[<>'"]/g, '') // إزالة أحرف خاصة
        .trim();
}

/**
 * تنظيف رقم الهاتف
 */
export function sanitizePhone(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
}

/**
 * التحقق من URL
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * التحقق من صورة URL
 */
export function isImageUrl(url: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
    const lowercaseUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowercaseUrl.includes(ext));
}

/**
 * ضمان أن القيمة مصفوفة
 */
export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
    if (value === null || value === undefined) return [];
    if (Array.isArray(value)) return value;
    return [value];
}

/**
 * ضمان أن القيمة نص
 */
export function ensureString(value: unknown, defaultValue: string = ''): string {
    if (typeof value === 'string') return value;
    if (value === null || value === undefined) return defaultValue;
    return String(value);
}

/**
 * ضمان أن القيمة رقم
 */
export function ensureNumber(value: unknown, defaultValue: number = 0): number {
    if (typeof value === 'number' && !isNaN(value)) return value;
    const parsed = Number(value);
    return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * ضمان أن القيمة boolean
 */
export function ensureBoolean(value: unknown, defaultValue: boolean = false): boolean {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === 1) return true;
    if (value === 'false' || value === 0) return false;
    return defaultValue;
}

/**
 * تنظيف بيانات السيارة
 */
export interface CarListing {
    id?: string;
    title?: string;
    brand?: string;
    model?: string;
    year?: number;
    price?: number;
    mileage?: number;
    location?: string;
    description?: string;
    images?: string[] | string; // قد تكون مصفوفة أو نص مفصول بفواصل
    views?: number;
    favorites?: number;
    date?: string;
    // حقول الإعلان المميز والترويج
    featured?: boolean;
    promotionPackage?: 'free' | 'basic' | 'premium' | 'vip' | string;
    promotionDays?: number;
    promotionStartDate?: string | Date;
    promotionEndDate?: string | Date;
    promotionPriority?: number;
    seller?: {
        id?: string;
        name?: string;
        phone?: string;
        rating?: number;
        reviews?: number;
        verified?: boolean;
        memberSince?: string;
        activeListings?: number;
        avatar?: string;
        accountType?: string;
    };
    contact?: {
        phone?: string;
        email?: string;
    };
    specifications?: Record<string, unknown>;
    features?: Record<string, unknown>;
    [key: string]: unknown;
}

// Alias للتوافق مع الكود الحالي
export type SafeCarListing = CarListing;

export function sanitizeCarListing(car: CarListing): CarListing {
    // معالجة الصور - التأكد من أنها مصفوفة دائماً
    let images: string[] = [];

    // 1. التحقق من carImages أولاً (من جدول car_images)
    const carImages = (car as any).carImages || (car as any).car_images;
    if (carImages && Array.isArray(carImages) && carImages.length > 0) {
        images = carImages
            .map((img: any) => typeof img === 'string' ? img : img?.fileUrl)
            .filter((img: string | undefined): img is string => typeof img === 'string' && img.trim() !== '');
    }

    // 2. إذا لم توجد، التحقق من images
    if (images.length === 0 && car.images) {
        if (Array.isArray(car.images)) {
            images = car.images.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
        } else if (typeof car.images === 'string') {
            // قد تكون الصور نص مفصول بفواصل أو JSON
            const imagesStr = car.images.trim();
            if (imagesStr.startsWith('[')) {
                try {
                    const parsed = JSON.parse(imagesStr);
                    if (Array.isArray(parsed)) {
                        images = parsed.filter((img): img is string => typeof img === 'string' && img.trim() !== '');
                    }
                } catch {
                    // إذا فشل التحليل، اعتبرها نص عادي
                    images = imagesStr.split(',').map(s => s.trim()).filter(s => s !== '');
                }
            } else if (imagesStr.includes(',')) {
                // نص مفصول بفواصل
                images = imagesStr.split(',').map(s => s.trim()).filter(s => s !== '');
            } else if (imagesStr !== '') {
                // صورة واحدة
                images = [imagesStr];
            }
        }
    }

    // إزالة الصور الافتراضية من المصفوفة
    images = images.filter(img => !img.includes('default-car.svg'));

    // إذا لم توجد صور صالحة، استخدم الصورة الافتراضية
    if (images.length === 0) {
        images = ['/images/cars/default-car.svg'];
    }

    console.log('[sanitizeCarListing] الصور المعالجة:', images.length, images);

    return {
        ...car,
        title: car.title ? sanitizeText(car.title) : 'سيارة للبيع',
        brand: car.brand ? sanitizeText(car.brand) : '',
        model: car.model ? sanitizeText(car.model) : '',
        year: ensureNumber(car.year),
        price: ensureNumber(car.price),
        mileage: ensureNumber(car.mileage),
        location: car.location ? sanitizeText(car.location) : 'غير محدد',
        description: car.description ? sanitizeText(car.description) : '',
        images,
        views: ensureNumber(car.views),
        favorites: ensureNumber(car.favorites),
    };
}

export type SafeAuctionData = Record<string, any>;

export function sanitizeAuctionData(auction: any): SafeAuctionData {
    return auction as SafeAuctionData;
}

export default {
    isValidEmail,
    isValidLibyanPhone,
    isNotEmpty,
    isPositiveNumber,
    isInRange,
    hasMinLength,
    hasMaxLength,
    isValidYear,
    isValidPrice,
    sanitizeText,
    sanitizePhone,
    isValidUrl,
    isImageUrl,
    ensureArray,
    ensureString,
    ensureNumber,
    ensureBoolean,
    sanitizeCarListing,
    sanitizeAuctionData,
};
