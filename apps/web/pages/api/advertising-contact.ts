/**
 * API طلبات الإعلانات والتواصل مع فريق الموقع
 * Enterprise-grade Advertising Requests API
 * 
 * Features:
 * - استقبال طلبات الخدمات الإعلانية
 * - استقبال مراسلات فريق الموقع
 * - التحقق من صحة البيانات
 * - حماية من الـ spam (rate limiting)
 * - تسجيل معلومات الطلب (IP, User Agent)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../lib/prisma';

// Prisma client singleton

// أنواع الخدمات الإعلانية المتاحة
const VALID_SERVICE_TYPES = [
    'عرض إعلان في الصفحة الرئيسية',
    'عرض إعلان في أغلب الموقع',
    'طلب عرض فيديو إعلاني',
    'شيء آخر',
    // الأنواع القديمة للتوافق مع الطلبات السابقة
    'الحزمة البرونزية (300-500 د.ل)',
    'الحزمة الفضية (800-1200 د.ل)',
    'الحزمة الذهبية (1500-2500 د.ل)',
    'صفحة شركة مدفوعة (1000-2000 د.ل)',
    'إعلان مرئي/صوتي (500-1000 د.ل)',
];

// أنواع استفسارات فريق الموقع
const VALID_TEAM_INQUIRY_TYPES = [
    'اقتراح تحسين',
    'شكوى',
    'استفسار عام',
    'مشكلة تقنية',
    'طلب شراكة',
    'أخرى',
];

// التحقق من صحة رقم الهاتف الليبي
function validateLibyanPhone(phone: string): boolean {
    // إزالة المسافات والرموز
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // أنماط أرقام الهواتف الليبية
    const patterns = [
        /^09[0-9]{8}$/,      // 09XXXXXXXX
        /^9[0-9]{8}$/,       // 9XXXXXXXX (بدون الصفر)
        /^\+2189[0-9]{8}$/,  // +2189XXXXXXXX
        /^002189[0-9]{8}$/,  // 002189XXXXXXXX
    ];

    return patterns.some(pattern => pattern.test(cleaned));
}

// الحصول على IP العميل
function getClientIP(req: NextApiRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown';
}

// Rate limiting بسيط (يمكن استبداله بـ Redis في الإنتاج)
const requestCounts = new Map<string, { count: number; resetTime: number; }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // ساعة واحدة
const MAX_REQUESTS_PER_WINDOW = 10; // 10 طلبات في الساعة

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; } {
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
        requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1 };
    }

    if (record.count >= MAX_REQUESTS_PER_WINDOW) {
        return { allowed: false, remaining: 0 };
    }

    record.count++;
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count };
}

interface RequestBody {
    name: string;
    phone: string;
    dialCode?: string;
    city: string;
    companyName?: string;
    serviceType: string;
    message?: string;
    requestType?: 'advertising' | 'team';
    packageType?: string;
    source?: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // السماح فقط بـ POST
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            message: 'Method not allowed',
        });
    }

    try {
        const clientIP = getClientIP(req);
        const userAgent = req.headers['user-agent'] || 'unknown';
        const referer = req.headers['referer'] || null;

        // فحص Rate Limit
        const rateLimit = checkRateLimit(clientIP);
        if (!rateLimit.allowed) {
            return res.status(429).json({
                success: false,
                message: 'تم تجاوز الحد المسموح من الطلبات. حاول بعد ساعة.',
                code: 'RATE_LIMIT_EXCEEDED',
            });
        }

        const body: RequestBody = req.body;
        const {
            name,
            phone,
            dialCode = '+218',
            city,
            companyName,
            serviceType,
            message,
            requestType = 'advertising',
            packageType,
            source,
        } = body;

        // التحقق من الحقول المطلوبة
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال الاسم الكامل',
                field: 'name',
            });
        }

        if (!phone || !phone.trim()) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء إدخال رقم الهاتف',
                field: 'phone',
            });
        }

        if (!city || !city.trim()) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء اختيار المدينة',
                field: 'city',
            });
        }

        if (!serviceType || !serviceType.trim()) {
            return res.status(400).json({
                success: false,
                message: 'الرجاء اختيار نوع الخدمة',
                field: 'serviceType',
            });
        }

        // التحقق من طول الاسم
        if (name.trim().length < 3) {
            return res.status(400).json({
                success: false,
                message: 'الاسم يجب أن يكون 3 أحرف على الأقل',
                field: 'name',
            });
        }

        // التحقق من صحة نوع الخدمة
        const isTeamRequest = requestType === 'team';
        const validTypes = isTeamRequest ? VALID_TEAM_INQUIRY_TYPES : VALID_SERVICE_TYPES;

        if (!validTypes.includes(serviceType) && serviceType !== 'أخرى') {
            // السماح بأنواع الباقات المحددة مسبقاً
            const packageTypes = [
                'الحزمة البرونزية (300-500 د.ل)',
                'الحزمة الفضية (800-1200 د.ل)',
                'الحزمة الذهبية (1500-2500 د.ل)',
                'صفحة شركة مدفوعة (1000-2000 د.ل)',
                'إعلان مرئي/صوتي (500-1000 د.ل)',
            ];

            if (!packageTypes.includes(serviceType)) {
                return res.status(400).json({
                    success: false,
                    message: 'نوع الخدمة غير صالح',
                    field: 'serviceType',
                });
            }
        }

        // التحقق من طول الرسالة (إن وجدت)
        if (message && message.length > 2000) {
            return res.status(400).json({
                success: false,
                message: 'الرسالة طويلة جداً (الحد الأقصى 2000 حرف)',
                field: 'message',
            });
        }

        // تحديد الأولوية بناءً على نوع الخدمة
        let priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' = 'NORMAL';
        if (serviceType.includes('ذهبية') || serviceType.includes('VIP')) {
            priority = 'HIGH';
        } else if (serviceType === 'مشكلة تقنية' || serviceType === 'شكوى') {
            priority = 'HIGH';
        } else if (serviceType === 'طلب شراكة') {
            priority = 'HIGH';
        }

        // إنشاء الطلب في قاعدة البيانات
        const newRequest = await prisma.advertising_requests.create({
            data: {
                name: name.trim(),
                phone: phone.trim(),
                dialCode: dialCode,
                city: city.trim(),
                companyName: companyName?.trim() || null,
                serviceType: serviceType,
                packageType: packageType || null,
                message: message?.trim() || null,
                requestType: isTeamRequest ? 'TEAM_CONTACT' : 'ADVERTISING_SERVICE',
                priority: priority,
                source: source || referer || 'direct',
                ipAddress: clientIP,
                userAgent: userAgent,
                referrer: referer,
                status: 'NEW',
            },
        });

        console.log(`[Advertising Request] New request created: ${newRequest.id} - ${serviceType} from ${city}`);

        // إرسال استجابة النجاح
        return res.status(201).json({
            success: true,
            message: isTeamRequest
                ? 'تم استلام رسالتك بنجاح. سنتواصل معك في أقرب وقت.'
                : 'تم استلام طلبك بنجاح. سنتواصل معك خلال 24 ساعة.',
            data: {
                id: newRequest.id,
                requestType: newRequest.requestType,
                status: newRequest.status,
                createdAt: newRequest.createdAt,
            },
            remaining: rateLimit.remaining,
        });

    } catch (error) {
        console.error('[Advertising Request] Error:', error);

        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم. الرجاء المحاولة لاحقاً.',
            code: 'SERVER_ERROR',
        });
    }
}
