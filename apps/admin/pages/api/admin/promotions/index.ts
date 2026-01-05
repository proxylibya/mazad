/**
 * API إدارة الترويج والباقات المميزة
 * GET - جلب جميع الإعلانات المميزة
 * POST - إنشاء ترويج جديد
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

// Prisma client singleton
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// Verify admin authentication
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

// تعريف باقات الترويج
export const PROMOTION_PACKAGES = {
    BASIC: {
        name: 'الباقة الأساسية',
        nameEn: 'BASIC',
        days: 7,
        price: 50,
        features: ['شارة مميز', 'أولوية في البحث'],
        color: 'blue',
        priority: 1,
    },
    PREMIUM: {
        name: 'الباقة المتقدمة',
        nameEn: 'PREMIUM',
        days: 14,
        price: 100,
        features: ['شارة مميز', 'أولوية في البحث', 'ظهور في الصفحة الرئيسية', 'إشعارات للمتابعين'],
        color: 'purple',
        priority: 2,
    },
    VIP: {
        name: 'باقة VIP',
        nameEn: 'VIP',
        days: 30,
        price: 200,
        features: [
            'شارة VIP ذهبية',
            'أعلى أولوية في البحث',
            'ظهور دائم في الصفحة الرئيسية',
            'إشعارات لجميع المستخدمين',
            'تقرير إحصائيات مفصل',
            'دعم فني مخصص',
        ],
        color: 'amber',
        priority: 3,
    },
};

export type PromotionPackageType = keyof typeof PROMOTION_PACKAGES;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // التحقق من صلاحيات الأدمن
    const auth = await verifyAuth(req);
    if (!auth) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    switch (req.method) {
        case 'GET': {
            try {
                const {
                    page = '1',
                    limit = '20',
                    adType,
                    isActive,
                    search,
                    sortBy = 'createdAt',
                    sortOrder = 'desc'
                } = req.query;

                const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

                // بناء شروط الفلترة
                const where: any = {};

                if (adType && adType !== 'all') {
                    where.adType = adType;
                }

                if (isActive !== undefined && isActive !== 'all') {
                    where.isActive = isActive === 'true';
                }

                if (search) {
                    where.OR = [
                        { title: { contains: search as string, mode: 'insensitive' } },
                        { description: { contains: search as string, mode: 'insensitive' } },
                    ];
                }

                // جلب الإعلانات المميزة
                const [promotions, total] = await Promise.all([
                    prisma.featured_ads.findMany({
                        where,
                        include: {
                            users: {
                                select: { id: true, name: true, phone: true },
                            },
                        },
                        orderBy: { [sortBy as string]: sortOrder },
                        skip,
                        take: parseInt(limit as string),
                    }),
                    prisma.featured_ads.count({ where }),
                ]);

                // جلب بيانات المصادر (السيارات/المزادات)
                const enrichedPromotions = await Promise.all(
                    promotions.map(async (promo) => {
                        let sourceData = null;

                        if (promo.sourceId && promo.sourceType) {
                            try {
                                if (promo.sourceType === 'car') {
                                    sourceData = await prisma.cars.findUnique({
                                        where: { id: promo.sourceId },
                                        select: {
                                            id: true,
                                            title: true,
                                            brand: true,
                                            model: true,
                                            year: true,
                                            price: true,
                                            images: true,
                                        },
                                    });
                                } else if (promo.sourceType === 'auction') {
                                    sourceData = await prisma.auctions.findUnique({
                                        where: { id: promo.sourceId },
                                        select: {
                                            id: true,
                                            title: true,
                                            currentPrice: true,
                                            status: true,
                                            endDate: true,
                                            cars: {
                                                select: {
                                                    title: true,
                                                    brand: true,
                                                    model: true,
                                                    images: true,
                                                },
                                            },
                                        },
                                    });
                                }
                            } catch (e) {
                                console.error('خطأ في جلب بيانات المصدر:', e);
                            }
                        }

                        return {
                            ...promo,
                            sourceData,
                            creator: promo.users,
                        };
                    })
                );

                // إحصائيات
                const stats = await prisma.featured_ads.groupBy({
                    by: ['adType', 'isActive'],
                    _count: true,
                });

                const totalActive = stats
                    .filter(s => s.isActive)
                    .reduce((sum, s) => sum + s._count, 0);

                const totalViews = await prisma.featured_ads.aggregate({
                    _sum: { views: true, clicks: true },
                });

                return res.status(200).json({
                    success: true,
                    promotions: enrichedPromotions,
                    pagination: {
                        page: parseInt(page as string),
                        limit: parseInt(limit as string),
                        total,
                        totalPages: Math.ceil(total / parseInt(limit as string)),
                    },
                    stats: {
                        total,
                        active: totalActive,
                        inactive: total - totalActive,
                        totalViews: totalViews._sum.views || 0,
                        totalClicks: totalViews._sum.clicks || 0,
                    },
                    packages: PROMOTION_PACKAGES,
                });
            } catch (error) {
                console.error('خطأ في جلب الترويجات:', error);
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            }
        }

        case 'POST': {
            try {
                const {
                    title,
                    description,
                    imageUrl,
                    linkUrl,
                    adType = 'AUCTION_LISTING',
                    sourceId,
                    sourceType,
                    position = 1,
                    priority = 1,
                    packageType = 'BASIC',
                    customDays,
                    startDate,
                    endDate,
                    budget,
                    targetAudience,
                    location,
                } = req.body;

                // التحقق من الحقول المطلوبة
                if (!title) {
                    return res.status(400).json({ success: false, message: 'عنوان الترويج مطلوب' });
                }

                // حساب تاريخ الانتهاء بناءً على الباقة
                const pkg = PROMOTION_PACKAGES[packageType as PromotionPackageType];
                const days = customDays || (pkg ? pkg.days : 7);
                const start = startDate ? new Date(startDate) : new Date();
                const end = endDate ? new Date(endDate) : new Date(start.getTime() + days * 24 * 60 * 60 * 1000);

                // الحصول على معرف المستخدم الأدمن
                const adminUser = await prisma.users.findFirst({
                    where: {
                        OR: [
                            { role: 'ADMIN' },
                            { role: 'SUPER_ADMIN' }
                        ]
                    },
                });

                if (!adminUser) {
                    return res.status(400).json({ success: false, message: 'لم يتم العثور على مستخدم أدمن' });
                }

                const promotion = await prisma.featured_ads.create({
                    data: {
                        id: `promo_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        title,
                        description,
                        imageUrl,
                        linkUrl,
                        adType,
                        sourceId,
                        sourceType,
                        position,
                        priority: pkg ? pkg.priority : priority,
                        isActive: true,
                        startDate: start,
                        endDate: end,
                        budget,
                        targetAudience,
                        location,
                        createdBy: adminUser.id,
                        updatedAt: new Date(),
                    },
                });

                // تسجيل النشاط
                await prisma.admin_activities.create({
                    data: {
                        id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        admin_id: auth.adminId,
                        action: 'CREATE_PROMOTION',
                        resource_type: 'featured_ad',
                        resource_id: promotion.id,
                        details: {
                            title,
                            packageType,
                            days,
                            adType,
                            sourceId,
                        },
                        success: true,
                    },
                });

                // إذا كان مرتبط بمزاد، تحديث حالة المزاد
                if (sourceType === 'auction' && sourceId) {
                    await prisma.auctions.update({
                        where: { id: sourceId },
                        data: { featured: true, updatedAt: new Date() },
                    });
                }

                return res.status(201).json({
                    success: true,
                    message: 'تم إنشاء الترويج بنجاح',
                    promotion,
                });
            } catch (error) {
                console.error('خطأ في إنشاء الترويج:', error);
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            }
        }

        default:
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).json({ success: false, message: `الطريقة ${req.method} غير مسموحة` });
    }
}
