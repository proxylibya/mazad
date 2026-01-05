/**
 * API إدارة معاملات الترويج المدفوعة
 * Promotion Transactions Management API
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// أنواع الباقات
const PROMOTION_PACKAGES: Record<string, { name: string; price: number; days: number; priority: number; }> = {
    basic: { name: 'أساسي', price: 25, days: 7, priority: 1 },
    premium: { name: 'مميز', price: 50, days: 14, priority: 2 },
    vip: { name: 'VIP', price: 100, days: 30, priority: 3 },
};

// التحقق من المصادقة
async function verifyAuth(req: NextApiRequest): Promise<{ adminId: string; role: string; } | null> {
    const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; role: string; type: string; };
        if (decoded.type !== 'admin') return null;
        return { adminId: decoded.adminId, role: decoded.role };
    } catch {
        return null;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const auth = await verifyAuth(req);
    if (!auth) {
        return res.status(401).json({ success: false, error: 'غير مصرح' });
    }

    try {
        switch (req.method) {
            case 'GET':
                return await handleGet(req, res);
            case 'PUT':
                return await handleUpdate(req, res);
            case 'DELETE':
                return await handleDelete(req, res);
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('خطأ في API معاملات الترويج:', error);
        return res.status(500).json({ error: 'حدث خطأ في الخادم' });
    }
}

// جلب معاملات الترويج
async function handleGet(req: NextApiRequest, res: NextApiResponse) {
    const {
        page = '1',
        limit = '20',
        status,
        entityType,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // بناء الفلتر
    const where: any = {};

    if (status && status !== 'all') {
        where.status = status;
    }

    if (entityType && entityType !== 'all') {
        where.entityType = entityType;
    }

    if (search) {
        where.OR = [
            { entityId: { contains: search as string, mode: 'insensitive' } },
            { users: { name: { contains: search as string, mode: 'insensitive' } } },
            { users: { phone: { contains: search as string, mode: 'insensitive' } } },
        ];
    }

    // جلب البيانات
    const [transactions, total] = await Promise.all([
        prisma.promotion_transactions.findMany({
            where,
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        phone: true,
                        email: true,
                    },
                },
            },
            orderBy: { [sortBy as string]: sortOrder },
            skip,
            take: limitNum,
        }),
        prisma.promotion_transactions.count({ where }),
    ]);

    // إحصائيات
    const stats = await prisma.promotion_transactions.groupBy({
        by: ['status'],
        _count: { status: true },
        _sum: { amount: true },
    });

    const statsMap: Record<string, { count: number; revenue: number; }> = {
        PENDING: { count: 0, revenue: 0 },
        ACTIVE: { count: 0, revenue: 0 },
        EXPIRED: { count: 0, revenue: 0 },
        CANCELLED: { count: 0, revenue: 0 },
    };

    stats.forEach((s) => {
        statsMap[s.status] = {
            count: s._count.status,
            revenue: s._sum.amount || 0,
        };
    });

    // ترجمات
    const entityTypeNames: Record<string, string> = {
        car: 'سيارة',
        auction: 'مزاد',
        showroom: 'معرض',
        transport: 'خدمة نقل',
    };

    const statusNames: Record<string, string> = {
        PENDING: 'معلق',
        ACTIVE: 'نشط',
        EXPIRED: 'منتهي',
        CANCELLED: 'ملغي',
    };

    // تحسين البيانات للعرض
    const enhancedTransactions = transactions.map((t) => ({
        ...t,
        packageName: PROMOTION_PACKAGES[t.packageType]?.name || t.packageType,
        entityTypeName: entityTypeNames[t.entityType] || t.entityType,
        statusName: statusNames[t.status] || t.status,
        isExpired: t.endDate ? new Date(t.endDate) < new Date() : false,
        daysRemaining: t.endDate
            ? Math.max(0, Math.ceil((new Date(t.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
            : null,
    }));

    return res.status(200).json({
        success: true,
        data: enhancedTransactions,
        pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum),
        },
        stats: {
            pending: statsMap.PENDING,
            active: statsMap.ACTIVE,
            expired: statsMap.EXPIRED,
            cancelled: statsMap.CANCELLED,
            totalRevenue: Object.values(statsMap).reduce((sum, s) => sum + s.revenue, 0),
        },
    });
}

// تحديث معاملة ترويج
async function handleUpdate(req: NextApiRequest, res: NextApiResponse) {
    const { id, action, days } = req.body;

    if (!id || !action) {
        return res.status(400).json({ error: 'معرف المعاملة والإجراء مطلوبان' });
    }

    const transaction = await prisma.promotion_transactions.findUnique({
        where: { id },
    });

    if (!transaction) {
        return res.status(404).json({ error: 'المعاملة غير موجودة' });
    }

    let updateData: any = { updatedAt: new Date() };

    switch (action) {
        case 'activate': {
            // تفعيل ترويج معلق
            const startDate = new Date();
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + transaction.days);

            updateData = {
                ...updateData,
                status: 'ACTIVE',
                startDate,
                endDate,
            };

            // تحديث الإعلان المرتبط
            const pkgConfig = PROMOTION_PACKAGES[transaction.packageType];
            await updateEntityPromotion(transaction.entityType, transaction.entityId, {
                featured: true,
                promotionPackage: transaction.packageType,
                promotionDays: transaction.days,
                promotionStartDate: startDate,
                promotionEndDate: endDate,
                promotionPriority: pkgConfig?.priority || 1,
            });
            break;
        }

        case 'extend': {
            // تمديد ترويج نشط
            if (!days || days <= 0) {
                return res.status(400).json({ error: 'عدد أيام التمديد مطلوب' });
            }
            const newEndDate = new Date(transaction.endDate || new Date());
            newEndDate.setDate(newEndDate.getDate() + parseInt(days));

            updateData = {
                ...updateData,
                endDate: newEndDate,
                days: transaction.days + parseInt(days),
            };

            // تحديث تاريخ انتهاء الإعلان
            await updateEntityPromotionEndDate(transaction.entityType, transaction.entityId, newEndDate);
            break;
        }

        case 'cancel':
        case 'expire': {
            updateData = {
                ...updateData,
                status: action === 'cancel' ? 'CANCELLED' : 'EXPIRED',
            };

            // إلغاء الترويج من الإعلان
            await cancelEntityPromotion(transaction.entityType, transaction.entityId);
            break;
        }

        default:
            return res.status(400).json({ error: 'إجراء غير صالح' });
    }

    const updated = await prisma.promotion_transactions.update({
        where: { id },
        data: updateData,
    });

    const actionMessages: Record<string, string> = {
        activate: 'تفعيل',
        extend: 'تمديد',
        cancel: 'إلغاء',
        expire: 'إنهاء',
    };

    return res.status(200).json({
        success: true,
        message: `تم ${actionMessages[action] || 'تحديث'} الترويج بنجاح`,
        data: updated,
    });
}

// حذف معاملة ترويج
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ error: 'معرف المعاملة مطلوب' });
    }

    const transaction = await prisma.promotion_transactions.findUnique({
        where: { id: id as string },
    });

    if (!transaction) {
        return res.status(404).json({ error: 'المعاملة غير موجودة' });
    }

    // إلغاء الترويج من الإعلان أولاً
    await cancelEntityPromotion(transaction.entityType, transaction.entityId);

    // حذف سجل المعاملة
    await prisma.promotion_transactions.delete({
        where: { id: id as string },
    });

    return res.status(200).json({
        success: true,
        message: 'تم حذف المعاملة بنجاح',
    });
}

// تحديث ترويج الإعلان
async function updateEntityPromotion(
    entityType: string,
    entityId: string,
    data: {
        featured: boolean;
        promotionPackage: string;
        promotionDays: number;
        promotionStartDate: Date;
        promotionEndDate: Date;
        promotionPriority: number;
    },
) {
    try {
        switch (entityType) {
            case 'car':
                await prisma.cars.update({
                    where: { id: entityId },
                    data,
                });
                break;
            case 'auction':
                await prisma.auctions.update({
                    where: { id: entityId },
                    data,
                });
                break;
            case 'showroom':
                await prisma.showrooms.update({
                    where: { id: entityId },
                    data: {
                        featured: data.featured,
                        promotionPackage: data.promotionPackage,
                        promotionDays: data.promotionDays,
                        promotionStartDate: data.promotionStartDate,
                        promotionEndDate: data.promotionEndDate,
                    },
                });
                break;
            case 'transport':
                await prisma.transport_services.update({
                    where: { id: entityId },
                    data: {
                        featured: data.featured,
                        promotionPackage: data.promotionPackage,
                        promotionStartDate: data.promotionStartDate,
                        promotionEndDate: data.promotionEndDate,
                    },
                });
                break;
        }
    } catch (error) {
        console.error('خطأ في تحديث ترويج الإعلان:', error);
    }
}

// تحديث تاريخ انتهاء الترويج
async function updateEntityPromotionEndDate(entityType: string, entityId: string, endDate: Date) {
    try {
        switch (entityType) {
            case 'car':
                await prisma.cars.update({ where: { id: entityId }, data: { promotionEndDate: endDate } });
                break;
            case 'auction':
                await prisma.auctions.update({ where: { id: entityId }, data: { promotionEndDate: endDate } });
                break;
            case 'showroom':
                await prisma.showrooms.update({ where: { id: entityId }, data: { promotionEndDate: endDate } });
                break;
            case 'transport':
                await prisma.transport_services.update({ where: { id: entityId }, data: { promotionEndDate: endDate } });
                break;
        }
    } catch (error) {
        console.error('خطأ في تحديث تاريخ انتهاء الترويج:', error);
    }
}

// إلغاء ترويج الإعلان
async function cancelEntityPromotion(entityType: string, entityId: string) {
    try {
        const resetData = {
            featured: false,
            promotionPackage: 'free',
            promotionDays: 0,
            promotionStartDate: null,
            promotionEndDate: null,
            promotionPriority: 0,
        };

        switch (entityType) {
            case 'car':
                await prisma.cars.update({ where: { id: entityId }, data: resetData });
                break;
            case 'auction':
                await prisma.auctions.update({ where: { id: entityId }, data: resetData });
                break;
            case 'showroom':
                await prisma.showrooms.update({
                    where: { id: entityId },
                    data: {
                        featured: false,
                        promotionPackage: 'free',
                        promotionDays: 0,
                        promotionStartDate: null,
                        promotionEndDate: null,
                    },
                });
                break;
            case 'transport':
                await prisma.transport_services.update({
                    where: { id: entityId },
                    data: {
                        featured: false,
                        promotionPackage: 'free',
                        promotionStartDate: null,
                        promotionEndDate: null,
                    },
                });
                break;
        }
    } catch (error) {
        console.error('خطأ في إلغاء ترويج الإعلان:', error);
    }
}
