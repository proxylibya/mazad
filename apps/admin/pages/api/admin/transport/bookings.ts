/**
 * API إدارة طلبات/حجوزات خدمات النقل
 * Transport Bookings Management API
 */

import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
const JWT_SECRET = process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';

// حالات الحجز
export const BOOKING_STATUS = {
    PENDING: 'PENDING',
    ACCEPTED: 'ACCEPTED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    REJECTED: 'REJECTED',
} as const;

export const BOOKING_STATUS_LABELS: Record<string, string> = {
    PENDING: 'في انتظار القبول',
    ACCEPTED: 'تم القبول',
    IN_PROGRESS: 'جاري التنفيذ',
    COMPLETED: 'مكتمل',
    CANCELLED: 'ملغي',
    REJECTED: 'مرفوض',
};

// التحقق من صلاحيات المدير
function getAdminFromToken(req: NextApiRequest): { adminId: string; role: string; } | null {
    const authHeader = req.headers.authorization;
    // البحث في Authorization header أو cookies (admin_session أو admin_token)
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : req.cookies.admin_session || req.cookies.admin_token;

    if (!token) {
        console.log('[Bookings API] لا يوجد token - Headers:', !!authHeader, 'Cookie admin_session:', !!req.cookies.admin_session);
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

// بيانات وهمية للتطوير
const MOCK_BOOKINGS = [
    {
        id: 'booking-001',
        customerName: 'محمد أحمد',
        customerPhone: '+218912345678',
        fromCity: 'طرابلس',
        toCity: 'بنغازي',
        preferredDate: new Date().toISOString(),
        preferredTime: '10:00 صباحاً',
        status: 'PENDING',
        estimatedPrice: 500,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        service: { id: 'srv-001', title: 'ساحبة مسطحة', truckType: 'FLATBED' },
        customer: { id: 'user-001', name: 'محمد أحمد', phone: '+218912345678' },
        provider: { id: 'prov-001', name: 'خدمات النقل السريع', phone: '+218911111111' },
    },
    {
        id: 'booking-002',
        customerName: 'علي حسن',
        customerPhone: '+218923456789',
        fromCity: 'مصراتة',
        toCity: 'سرت',
        preferredDate: new Date().toISOString(),
        preferredTime: '14:00 مساءً',
        status: 'ACCEPTED',
        estimatedPrice: 350,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        service: { id: 'srv-002', title: 'شاحنة نقل', truckType: 'TRUCK' },
        customer: { id: 'user-002', name: 'علي حسن', phone: '+218923456789' },
        provider: { id: 'prov-002', name: 'النقل الموثوق', phone: '+218922222222' },
    },
    {
        id: 'booking-003',
        customerName: 'أحمد سالم',
        customerPhone: '+218934567890',
        fromCity: 'طرابلس',
        toCity: 'الزاوية',
        preferredDate: new Date().toISOString(),
        status: 'COMPLETED',
        estimatedPrice: 200,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        service: { id: 'srv-001', title: 'ساحبة مسطحة', truckType: 'FLATBED' },
    },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // التحقق من المصادقة
    const admin = getAdminFromToken(req);
    if (!admin) {
        // في بيئة التطوير، إرجاع بيانات وهمية للـ GET
        if (process.env.NODE_ENV !== 'production' && req.method === 'GET') {
            console.log('[Bookings API] بيئة تطوير - إرجاع بيانات وهمية');
            return res.status(200).json({
                success: true,
                data: {
                    bookings: MOCK_BOOKINGS,
                    pagination: { page: 1, limit: 20, total: MOCK_BOOKINGS.length, totalPages: 1 },
                    stats: {
                        total: MOCK_BOOKINGS.length,
                        pending: MOCK_BOOKINGS.filter(b => b.status === 'PENDING').length,
                        accepted: MOCK_BOOKINGS.filter(b => b.status === 'ACCEPTED').length,
                        inProgress: MOCK_BOOKINGS.filter(b => b.status === 'IN_PROGRESS').length,
                        completed: MOCK_BOOKINGS.filter(b => b.status === 'COMPLETED').length,
                        cancelled: MOCK_BOOKINGS.filter(b => b.status === 'CANCELLED').length,
                        rejected: MOCK_BOOKINGS.filter(b => b.status === 'REJECTED').length,
                    },
                },
            });
        }
        return res.status(401).json({ success: false, error: 'غير مصرح - يجب تسجيل الدخول كمدير' });
    }

    try {
        switch (req.method) {
            case 'GET':
                return await getBookings(req, res);
            case 'PUT':
                return await updateBooking(req, res);
            case 'DELETE':
                return await deleteBooking(req, res);
            default:
                return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('[Admin Bookings API] خطأ:', error);
        return res.status(500).json({ success: false, error: 'خطأ في الخادم' });
    }
}

// جلب الحجوزات
async function getBookings(req: NextApiRequest, res: NextApiResponse) {
    const {
        page = '1',
        limit = '20',
        status,
        search,
        serviceId,
        providerId,
        customerId,
        fromDate,
        toDate,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // بناء شروط البحث
    const where: any = {};

    if (status && status !== 'all') {
        where.status = status;
    }

    if (serviceId) {
        where.serviceId = serviceId;
    }

    if (providerId) {
        where.providerId = providerId;
    }

    if (customerId) {
        where.customerId = customerId;
    }

    if (search) {
        where.OR = [
            { customerName: { contains: search as string, mode: 'insensitive' } },
            { customerPhone: { contains: search as string } },
            { fromCity: { contains: search as string, mode: 'insensitive' } },
            { toCity: { contains: search as string, mode: 'insensitive' } },
            { id: { contains: search as string } },
        ];
    }

    if (fromDate) {
        where.createdAt = { ...where.createdAt, gte: new Date(fromDate as string) };
    }

    if (toDate) {
        where.createdAt = { ...where.createdAt, lte: new Date(toDate as string) };
    }

    try {
        const [bookings, total] = await Promise.all([
            prisma.transport_bookings.findMany({
                where,
                include: {
                    service: {
                        select: {
                            id: true,
                            title: true,
                            truckType: true,
                            pricePerKm: true,
                            images: true,
                        },
                    },
                    customer: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            profileImage: true,
                        },
                    },
                    provider: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            profileImage: true,
                            verified: true,
                        },
                    },
                },
                orderBy: { [sortBy as string]: sortOrder },
                skip: offset,
                take: limitNum,
            }),
            prisma.transport_bookings.count({ where }),
        ]);

        // إحصائيات سريعة
        const stats = await prisma.transport_bookings.groupBy({
            by: ['status'],
            _count: { id: true },
        });

        const statsMap = stats.reduce((acc, s) => {
            acc[s.status] = s._count.id;
            return acc;
        }, {} as Record<string, number>);

        return res.status(200).json({
            success: true,
            data: {
                bookings,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
                stats: {
                    total,
                    pending: statsMap.PENDING || 0,
                    accepted: statsMap.ACCEPTED || 0,
                    inProgress: statsMap.IN_PROGRESS || 0,
                    completed: statsMap.COMPLETED || 0,
                    cancelled: statsMap.CANCELLED || 0,
                    rejected: statsMap.REJECTED || 0,
                },
            },
        });
    } catch (error) {
        console.error('[Admin Bookings] خطأ في جلب الحجوزات:', error);

        // إرجاع بيانات وهمية للتطوير
        return res.status(200).json({
            success: true,
            data: {
                bookings: [],
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: 0,
                    totalPages: 0,
                },
                stats: {
                    total: 0,
                    pending: 0,
                    accepted: 0,
                    inProgress: 0,
                    completed: 0,
                    cancelled: 0,
                    rejected: 0,
                },
            },
        });
    }
}

// تحديث حجز
async function updateBooking(req: NextApiRequest, res: NextApiResponse) {
    const { id, status, notes, adminNotes } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, error: 'معرف الحجز مطلوب' });
    }

    try {
        const booking = await prisma.transport_bookings.update({
            where: { id },
            data: {
                ...(status && { status }),
                ...(notes !== undefined && { specialInstructions: notes }),
                updatedAt: new Date(),
            },
            include: {
                service: { select: { title: true } },
                customer: { select: { name: true, phone: true } },
                provider: { select: { name: true, phone: true } },
            },
        });

        console.log(`[Admin Bookings] تم تحديث الحجز ${id} - الحالة: ${status}`);

        return res.status(200).json({
            success: true,
            message: 'تم تحديث الحجز بنجاح',
            data: booking,
        });
    } catch (error) {
        console.error('[Admin Bookings] خطأ في تحديث الحجز:', error);
        return res.status(500).json({ success: false, error: 'خطأ في تحديث الحجز' });
    }
}

// حذف حجز
async function deleteBooking(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, error: 'معرف الحجز مطلوب' });
    }

    try {
        await prisma.transport_bookings.delete({
            where: { id: id as string },
        });

        console.log(`[Admin Bookings] تم حذف الحجز ${id}`);

        return res.status(200).json({
            success: true,
            message: 'تم حذف الحجز بنجاح',
        });
    } catch (error) {
        console.error('[Admin Bookings] خطأ في حذف الحجز:', error);
        return res.status(500).json({ success: false, error: 'خطأ في حذف الحجز' });
    }
}
