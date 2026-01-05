/**
 * 🎯 نظام لوحة التحكم الموحد
 * Unified Admin Dashboard System
 * 
 * يوفر مكونات وأدوات موحدة لجميع صفحات لوحة التحكم
 */

import type React from 'react';

// ================== TYPES ==================

export type EntityStatus =
    | 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'BLOCKED' | 'SUSPENDED'
    | 'SOLD' | 'EXPIRED' | 'ENDED' | 'LIVE' | 'UPCOMING' | 'CANCELLED'
    | 'APPROVED' | 'REJECTED' | 'DRAFT';

export type EntityType =
    | 'user' | 'admin' | 'auction' | 'listing' | 'transport'
    | 'showroom' | 'promotion' | 'support' | 'report';

export interface BaseEntity {
    id: string;
    createdAt?: string | Date;
    updatedAt?: string | Date;
}

export interface ImageableEntity extends BaseEntity {
    images?: string | string[] | null;
    image?: string | null;
    profileImage?: string | null;
    avatar?: string | null;
    logo?: string | null;
    thumbnail?: string | null;
}

export interface StatusableEntity extends BaseEntity {
    status: EntityStatus;
}

// ================== STATUS SYSTEM ==================

export interface StatusConfig {
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    icon?: string;
}

export const STATUS_CONFIG: Record<EntityStatus, StatusConfig> = {
    ACTIVE: {
        label: 'نشط',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/30',
    },
    INACTIVE: {
        label: 'غير نشط',
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20',
        borderColor: 'border-slate-500/30',
    },
    PENDING: {
        label: 'قيد المراجعة',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/20',
        borderColor: 'border-amber-500/30',
    },
    BLOCKED: {
        label: 'محظور',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
    },
    SUSPENDED: {
        label: 'موقوف',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        borderColor: 'border-orange-500/30',
    },
    SOLD: {
        label: 'مباع',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        borderColor: 'border-blue-500/30',
    },
    EXPIRED: {
        label: 'منتهي',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
    },
    ENDED: {
        label: 'انتهى',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        borderColor: 'border-gray-500/30',
    },
    LIVE: {
        label: 'مباشر',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
        borderColor: 'border-green-500/30',
    },
    UPCOMING: {
        label: 'قادم',
        color: 'text-cyan-400',
        bgColor: 'bg-cyan-500/20',
        borderColor: 'border-cyan-500/30',
    },
    CANCELLED: {
        label: 'ملغي',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
    },
    APPROVED: {
        label: 'موافق عليه',
        color: 'text-emerald-400',
        bgColor: 'bg-emerald-500/20',
        borderColor: 'border-emerald-500/30',
    },
    REJECTED: {
        label: 'مرفوض',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        borderColor: 'border-red-500/30',
    },
    DRAFT: {
        label: 'مسودة',
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20',
        borderColor: 'border-slate-500/30',
    },
};

export function getStatusConfig(status: string): StatusConfig {
    return STATUS_CONFIG[status as EntityStatus] || {
        label: status || 'غير محدد',
        color: 'text-slate-400',
        bgColor: 'bg-slate-500/20',
        borderColor: 'border-slate-500/30',
    };
}

export function getStatusClasses(status: string): string {
    const config = getStatusConfig(status);
    return `${config.bgColor} ${config.color} ${config.borderColor}`;
}

// ================== IMAGE SYSTEM ==================

const WEB_APP_URL = process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3021';

export interface ImageConfig {
    fallbackIcon?: 'user' | 'car' | 'truck' | 'building' | 'image' | 'package';
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
    showCount?: boolean;
    className?: string;
}

export const IMAGE_SIZES = {
    xs: 'h-8 w-8',
    sm: 'h-10 w-10',
    md: 'h-14 w-14',
    lg: 'h-20 w-20',
    xl: 'h-32 w-32',
};

export const IMAGE_ROUNDED = {
    none: 'rounded-none',
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
};

/**
 * تحليل الصور من أي تنسيق
 * يدعم: JSON array, comma-separated string, single path
 */
export function parseImages(images: unknown): string[] {
    if (!images) return [];

    let imageArray: string[] = [];

    if (Array.isArray(images)) {
        imageArray = images;
    } else if (typeof images === 'string') {
        const trimmed = images.trim();

        // محاولة تحليل JSON أولاً
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                    imageArray = parsed;
                }
            } catch {
                // ليس JSON صالح، سنتعامل معه كنص
            }
        }

        // إذا لم يكن JSON array، تحقق من الفواصل
        if (imageArray.length === 0) {
            // تقسيم بالفواصل (يدعم كلا الصيغتين: path1,path2 أو path1, path2)
            if (trimmed.includes(',')) {
                imageArray = trimmed.split(',').map(s => s.trim()).filter(s => s.length > 0);
            } else if (trimmed.length > 0) {
                imageArray = [trimmed];
            }
        }
    }

    return imageArray
        .filter((img): img is string => typeof img === 'string' && img.trim() !== '')
        .map(img => {
            let cleanPath = img.trim();
            if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://')) {
                return cleanPath;
            }
            if (!cleanPath.startsWith('/')) {
                cleanPath = '/' + cleanPath;
            }
            return cleanPath;
        });
}

/**
 * الحصول على أول صورة من الكيان
 */
export function getEntityImage(entity: ImageableEntity): string | null {
    // تحقق من جميع حقول الصور المحتملة
    const possibleFields = ['images', 'image', 'profileImage', 'avatar', 'logo', 'thumbnail'];

    for (const field of possibleFields) {
        const value = (entity as unknown as Record<string, unknown>)[field];
        if (value) {
            const images = parseImages(value);
            if (images.length > 0) {
                return images[0];
            }
        }
    }

    return null;
}

/**
 * الحصول على URL كامل للصورة
 */
export function getImageUrl(imagePath: string | null, useProxy = false): string {
    if (!imagePath) return '';

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    if (useProxy) {
        const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
        return `/api/proxy/images?path=${encodeURIComponent(cleanPath)}`;
    }

    return `${WEB_APP_URL}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}

/**
 * الحصول على جميع صور الكيان
 */
export function getAllEntityImages(entity: ImageableEntity): string[] {
    const possibleFields = ['images', 'image', 'profileImage', 'avatar', 'logo', 'thumbnail'];
    const allImages: string[] = [];

    for (const field of possibleFields) {
        const value = (entity as unknown as Record<string, unknown>)[field];
        if (value) {
            const images = parseImages(value);
            allImages.push(...images);
        }
    }

    return [...new Set(allImages)]; // إزالة التكرار
}

// ================== STATS SYSTEM ==================

export interface StatCard {
    id: string;
    label: string;
    value: number | string;
    icon: string;
    color: 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'cyan' | 'orange' | 'slate';
    trend?: {
        value: number;
        direction: 'up' | 'down';
    };
}

export const STAT_COLORS = {
    blue: {
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        text: 'text-blue-400',
        icon: 'text-blue-500/50',
    },
    emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        icon: 'text-emerald-500/50',
    },
    amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        text: 'text-amber-400',
        icon: 'text-amber-500/50',
    },
    red: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        text: 'text-red-400',
        icon: 'text-red-500/50',
    },
    purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/30',
        text: 'text-purple-400',
        icon: 'text-purple-500/50',
    },
    cyan: {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        text: 'text-cyan-400',
        icon: 'text-cyan-500/50',
    },
    orange: {
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        text: 'text-orange-400',
        icon: 'text-orange-500/50',
    },
    slate: {
        bg: 'bg-slate-500/10',
        border: 'border-slate-500/30',
        text: 'text-slate-400',
        icon: 'text-slate-500/50',
    },
};

// ================== TABLE SYSTEM ==================

export interface TableColumn<T = unknown> {
    id: string;
    header: string;
    accessor: keyof T | ((row: T) => unknown);
    type?: 'text' | 'image' | 'status' | 'date' | 'price' | 'phone' | 'badge' | 'actions' | 'custom';
    sortable?: boolean;
    width?: string;
    align?: 'left' | 'center' | 'right';
    truncate?: boolean;
    maxLength?: number;
    render?: (value: unknown, row: T) => React.ReactNode;
    imageConfig?: ImageConfig;
}

export const DEFAULT_TABLE_TEXT_MAX_LENGTH = 25;

export function truncateText(text: unknown, maxLength: number = DEFAULT_TABLE_TEXT_MAX_LENGTH): string {
    const normalized = String(text ?? '');
    return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

export interface TableConfig<T = unknown> {
    columns: TableColumn<T>[];
    data: T[];
    loading?: boolean;
    emptyMessage?: string;
    emptyIcon?: string;
    onRowClick?: (row: T) => void;
    selectable?: boolean;
    onSelectionChange?: (selected: T[]) => void;
    pagination?: {
        page: number;
        pageSize: number;
        total: number;
        onPageChange: (page: number) => void;
    };
}

// ================== SEARCH & FILTER SYSTEM ==================

export interface FilterOption {
    value: string;
    label: string;
}

export interface SearchFilterConfig {
    searchPlaceholder?: string;
    searchFields?: string[];
    filters?: {
        id: string;
        label: string;
        options: FilterOption[];
        defaultValue?: string;
    }[];
}

// ================== TOAST SYSTEM ==================

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastConfig {
    message: string;
    type: ToastType;
    duration?: number;
}

export const TOAST_CONFIG: Record<ToastType, { bg: string; icon: string; }> = {
    success: { bg: 'bg-green-600', icon: 'CheckCircleIcon' },
    error: { bg: 'bg-red-600', icon: 'XCircleIcon' },
    warning: { bg: 'bg-amber-600', icon: 'ExclamationTriangleIcon' },
    info: { bg: 'bg-blue-600', icon: 'InformationCircleIcon' },
};

// ================== FORMATTING UTILITIES ==================

/**
 * تنسيق رقم الهاتف
 */
export function formatPhoneNumber(phone: string): string {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('218')) {
        return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5)}`;
    }
    return phone;
}

/**
 * تنسيق التاريخ
 */
export function formatDate(date: string | Date | null | undefined, format: 'short' | 'long' | 'relative' = 'short'): string {
    if (!date) return '-';

    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';

    if (format === 'relative') {
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'اليوم';
        if (diffDays === 1) return 'أمس';
        if (diffDays < 7) return `منذ ${diffDays} أيام`;
        if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
        if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} شهور`;
        return `منذ ${Math.floor(diffDays / 365)} سنوات`;
    }

    return d.toLocaleDateString('ar-LY', {
        year: 'numeric',
        month: format === 'long' ? 'long' : '2-digit',
        day: '2-digit',
    });
}

/**
 * تنسيق السعر
 */
export function formatPrice(price: number | string | null | undefined): string {
    if (price === null || price === undefined) return '-';
    const num = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(num)) return '-';
    return new Intl.NumberFormat('ar-LY', {
        style: 'currency',
        currency: 'LYD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(num);
}

/**
 * تنسيق الأرقام
 */
export function formatNumber(num: number | string | null | undefined): string {
    if (num === null || num === undefined) return '-';
    const n = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(n)) return '-';
    return new Intl.NumberFormat('ar-LY').format(n);
}

// ================== EXPORT CONSTANTS ==================

export const ENTITY_LABELS: Record<EntityType, string> = {
    user: 'مستخدم',
    admin: 'مدير',
    auction: 'مزاد',
    listing: 'إعلان',
    transport: 'خدمة نقل',
    showroom: 'معرض',
    promotion: 'ترويج',
    support: 'دعم',
    report: 'بلاغ',
};

export const ROLE_LABELS: Record<string, string> = {
    USER: 'مستخدم',
    ADMIN: 'مدير',
    MODERATOR: 'مشرف',
    SUPER_ADMIN: 'مدير عام',
    REGULAR_USER: 'مستخدم عادي',
    TRANSPORT_OWNER: 'صاحب نقل',
    COMPANY: 'شركة',
    SHOWROOM: 'معرض',
};

export const SERVICE_TYPE_LABELS: Record<string, string> = {
    // أنواع بأحرف كبيرة
    FLATBED: 'سطحة مسطحة',
    WINCH: 'ونش',
    RECOVERY: 'استرداد',
    HEAVY: 'نقل ثقيل',
    CAR_CARRIER: 'ناقلة سيارات',
    ENCLOSED: 'سطحة مغلقة',
    LOWBED: 'سطحة منخفضة',
    CRANE: 'رافعة',
    MULTI_CAR: 'ناقلة متعددة',
    HEAVY_DUTY: 'ساحبة ثقيلة',
    REFRIGERATED: 'مبردة',
    TANKER: 'صهريج',
    CONTAINER: 'حاوية',
    PICKUP: 'بيك أب',
    VAN: 'فان',
    TOW_TRUCK: 'ونش سحب',
    OTHER: 'أخرى',
    // أنواع بأحرف صغيرة
    flatbed: 'سطحة مسطحة',
    winch: 'ونش',
    recovery: 'استرداد',
    heavy: 'نقل ثقيل',
    'car-carrier': 'ناقلة سيارات',
    enclosed: 'سطحة مغلقة',
    lowbed: 'سطحة منخفضة',
    crane: 'رافعة',
    multi_car: 'ناقلة متعددة',
    'heavy-duty': 'ساحبة ثقيلة',
    refrigerated: 'مبردة',
    tanker: 'صهريج',
    container: 'حاوية',
    pickup: 'بيك أب',
    van: 'فان',
    tow_truck: 'ونش سحب',
    other: 'أخرى',
};
