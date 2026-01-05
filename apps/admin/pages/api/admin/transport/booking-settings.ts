/**
 * API إعدادات رسائل وإشعارات طلبات النقل
 * Transport Booking Settings API
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
const JWT_SECRET = process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';

// الإعدادات الافتراضية
const DEFAULT_SETTINGS = {
    // نموذج الرسالة
    messageTemplate: `طلب نقل جديد

الخدمة: {{serviceTitle}}
العميل: {{customerName}}
من: {{fromCity}}
إلى: {{toCity}}
التاريخ: {{preferredDate}}

رقم الطلب: #{{bookingId}}`,

    // نموذج الإشعار
    notificationTitle: 'طلب نقل جديد',
    notificationTemplate: 'لديك طلب نقل جديد من {{customerName}} - من {{fromCity}} إلى {{toCity}}',

    // إعدادات الإشعارات
    enablePushNotification: true,
    enableSmsNotification: false,
    enableEmailNotification: false,

    // إعدادات الرسالة
    showCustomerPhone: true,
    showCallButton: true,
    showChatButton: true,
    showCopyPhoneButton: true,
    showAcceptRejectButtons: true,

    // إعدادات البطاقة
    cardStyle: 'modern', // modern, classic, minimal
    cardColor: 'blue', // blue, green, gray

    // إعدادات الحجز التلقائي
    autoAcceptBookings: false,
    autoRejectAfterHours: 0, // 0 = معطل

    // رسائل الحالات
    statusMessages: {
        PENDING: 'طلبك قيد المراجعة',
        ACCEPTED: 'تم قبول طلبك! سنتواصل معك قريباً',
        REJECTED: 'عذراً، لم نتمكن من قبول طلبك',
        IN_PROGRESS: 'جاري تنفيذ طلبك',
        COMPLETED: 'تم إكمال طلب النقل بنجاح',
        CANCELLED: 'تم إلغاء الطلب',
    },
};

// التحقق من صلاحيات المدير
function getAdminFromToken(req: NextApiRequest): { adminId: string; role: string; } | null {
    const authHeader = req.headers.authorization;
    // البحث في Authorization header أو cookies (admin_session أو admin_token)
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : req.cookies.admin_session || req.cookies.admin_token;

    if (!token) {
        console.log('[Booking Settings API] لا يوجد token');
        return null;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { adminId?: string; userId?: string; role?: string; };
        const adminId = decoded.adminId || decoded.userId;
        if (!adminId) return null;
        return { adminId, role: decoded.role || 'ADMIN' };
    } catch {
        return null;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // التحقق من المصادقة
    const admin = getAdminFromToken(req);

    // في بيئة التطوير، السماح بالوصول للـ GET بدون مصادقة
    if (!admin) {
        if (process.env.NODE_ENV !== 'production' && req.method === 'GET') {
            console.log('[Booking Settings API] بيئة تطوير - إرجاع الإعدادات الافتراضية');
            return res.status(200).json({
                success: true,
                data: DEFAULT_SETTINGS,
            });
        }
        return res.status(401).json({ success: false, error: 'غير مصرح - يجب تسجيل الدخول كمدير' });
    }

    try {
        switch (req.method) {
            case 'GET':
                return await getSettings(req, res);
            case 'PUT':
                return await updateSettings(req, res, admin);
            case 'POST':
                return await resetSettings(req, res, admin);
            default:
                return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('[Booking Settings API] خطأ:', error);
        return res.status(500).json({ success: false, error: 'خطأ في الخادم' });
    }
}

// جلب الإعدادات
async function getSettings(req: NextApiRequest, res: NextApiResponse) {
    try {
        // محاولة جلب الإعدادات من قاعدة البيانات
        const settings = await prisma.system_settings.findFirst({
            where: { key: 'transport_booking_settings' },
        });

        if (settings?.value) {
            const parsedSettings = typeof settings.value === 'string'
                ? JSON.parse(settings.value)
                : settings.value;

            return res.status(200).json({
                success: true,
                data: { ...DEFAULT_SETTINGS, ...parsedSettings },
            });
        }

        // إرجاع الإعدادات الافتراضية
        return res.status(200).json({
            success: true,
            data: DEFAULT_SETTINGS,
        });
    } catch (error) {
        console.error('[Booking Settings] خطأ في جلب الإعدادات:', error);

        // إرجاع الإعدادات الافتراضية في حالة الخطأ
        return res.status(200).json({
            success: true,
            data: DEFAULT_SETTINGS,
        });
    }
}

// تحديث الإعدادات
async function updateSettings(
    req: NextApiRequest,
    res: NextApiResponse,
    admin: { adminId: string; role: string; }
) {
    const updates = req.body;

    if (!updates || typeof updates !== 'object') {
        return res.status(400).json({ success: false, error: 'بيانات الإعدادات غير صحيحة' });
    }

    try {
        // دمج الإعدادات الجديدة مع الافتراضية
        const newSettings = { ...DEFAULT_SETTINGS, ...updates };

        // حفظ في قاعدة البيانات
        await prisma.system_settings.upsert({
            where: { key: 'transport_booking_settings' },
            create: {
                key: 'transport_booking_settings',
                value: JSON.stringify(newSettings),
            },
            update: {
                value: JSON.stringify(newSettings),
            },
        });

        console.log(`[Booking Settings] تم تحديث الإعدادات بواسطة المدير ${admin.adminId}`);

        return res.status(200).json({
            success: true,
            message: 'تم حفظ الإعدادات بنجاح',
            data: newSettings,
        });
    } catch (error) {
        console.error('[Booking Settings] خطأ في حفظ الإعدادات:', error);
        return res.status(500).json({ success: false, error: 'خطأ في حفظ الإعدادات' });
    }
}

// إعادة تعيين الإعدادات للافتراضية
async function resetSettings(
    req: NextApiRequest,
    res: NextApiResponse,
    admin: { adminId: string; role: string; }
) {
    const { action } = req.body;

    if (action !== 'reset') {
        return res.status(400).json({ success: false, error: 'إجراء غير صحيح' });
    }

    try {
        // حذف الإعدادات المخصصة
        await prisma.system_settings.deleteMany({
            where: { key: 'transport_booking_settings' },
        });

        console.log(`[Booking Settings] تم إعادة تعيين الإعدادات بواسطة المدير ${admin.adminId}`);

        return res.status(200).json({
            success: true,
            message: 'تم إعادة تعيين الإعدادات للقيم الافتراضية',
            data: DEFAULT_SETTINGS,
        });
    } catch (error) {
        console.error('[Booking Settings] خطأ في إعادة تعيين الإعدادات:', error);
        return res.status(500).json({ success: false, error: 'خطأ في إعادة تعيين الإعدادات' });
    }
}

// تصدير الإعدادات الافتراضية للاستخدام الخارجي
export { DEFAULT_SETTINGS };

