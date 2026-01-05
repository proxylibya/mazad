/**
 * API إدارة ترويج واحد
 * GET - جلب تفاصيل الترويج
 * PUT - تحديث الترويج
 * DELETE - حذف/إيقاف الترويج
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // التحقق من صلاحيات الأدمن
    const auth = await verifyAuth(req);
    if (!auth) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, message: 'معرف الترويج مطلوب' });
    }

    switch (req.method) {
        case 'GET': {
            try {
                const promotion = await prisma.featured_ads.findUnique({
                    where: { id },
                    include: {
                        users: {
                            select: { id: true, name: true, phone: true },
                        },
                    },
                });

                if (!promotion) {
                    return res.status(404).json({ success: false, message: 'الترويج غير موجود' });
                }

                // جلب بيانات المصدر
                let sourceData = null;
                if (promotion.sourceId && promotion.sourceType) {
                    if (promotion.sourceType === 'car') {
                        sourceData = await prisma.cars.findUnique({
                            where: { id: promotion.sourceId },
                            select: {
                                id: true,
                                title: true,
                                brand: true,
                                model: true,
                                year: true,
                                price: true,
                                images: true,
                                location: true,
                            },
                        });
                    } else if (promotion.sourceType === 'auction') {
                        sourceData = await prisma.auctions.findUnique({
                            where: { id: promotion.sourceId },
                            include: {
                                cars: {
                                    select: {
                                        title: true,
                                        brand: true,
                                        model: true,
                                        year: true,
                                        images: true,
                                    },
                                },
                                bids: {
                                    take: 5,
                                    orderBy: { createdAt: 'desc' },
                                },
                                _count: { select: { bids: true } },
                            },
                        });
                    }
                }

                return res.status(200).json({
                    success: true,
                    promotion: {
                        ...promotion,
                        sourceData,
                        creator: promotion.users,
                    },
                });
            } catch (error) {
                console.error('خطأ في جلب الترويج:', error);
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            }
        }

        case 'PUT': {
            try {
                const {
                    title,
                    description,
                    imageUrl,
                    linkUrl,
                    position,
                    priority,
                    isActive,
                    startDate,
                    endDate,
                    extendDays,
                    budget,
                    targetAudience,
                    location,
                } = req.body;

                // جلب الترويج الحالي
                const existingPromo = await prisma.featured_ads.findUnique({
                    where: { id },
                });

                if (!existingPromo) {
                    return res.status(404).json({ success: false, message: 'الترويج غير موجود' });
                }

                // حساب تاريخ الانتهاء الجديد إذا تم تمديده
                let newEndDate = endDate ? new Date(endDate) : existingPromo.endDate;
                if (extendDays && extendDays > 0) {
                    const currentEnd = existingPromo.endDate || new Date();
                    newEndDate = new Date(currentEnd.getTime() + extendDays * 24 * 60 * 60 * 1000);
                }

                const updatedPromotion = await prisma.featured_ads.update({
                    where: { id },
                    data: {
                        ...(title !== undefined && { title }),
                        ...(description !== undefined && { description }),
                        ...(imageUrl !== undefined && { imageUrl }),
                        ...(linkUrl !== undefined && { linkUrl }),
                        ...(position !== undefined && { position }),
                        ...(priority !== undefined && { priority }),
                        ...(isActive !== undefined && { isActive }),
                        ...(startDate && { startDate: new Date(startDate) }),
                        ...(newEndDate && { endDate: newEndDate }),
                        ...(budget !== undefined && { budget }),
                        ...(targetAudience !== undefined && { targetAudience }),
                        ...(location !== undefined && { location }),
                        updatedAt: new Date(),
                    },
                });

                // تسجيل النشاط
                await prisma.admin_activities.create({
                    data: {
                        id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        admin_id: auth.adminId,
                        action: 'UPDATE_PROMOTION',
                        resource_type: 'featured_ad',
                        resource_id: id,
                        details: {
                            changes: req.body,
                            extendDays,
                        },
                        success: true,
                    },
                });

                // تحديث حالة المزاد إذا تم إيقاف/تفعيل الترويج
                if (isActive !== undefined && existingPromo.sourceType === 'auction' && existingPromo.sourceId) {
                    await prisma.auctions.update({
                        where: { id: existingPromo.sourceId },
                        data: { featured: isActive, updatedAt: new Date() },
                    });
                }

                return res.status(200).json({
                    success: true,
                    message: 'تم تحديث الترويج بنجاح',
                    promotion: updatedPromotion,
                });
            } catch (error) {
                console.error('خطأ في تحديث الترويج:', error);
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            }
        }

        case 'DELETE': {
            try {
                const { permanent } = req.query;

                const promotion = await prisma.featured_ads.findUnique({
                    where: { id },
                });

                if (!promotion) {
                    return res.status(404).json({ success: false, message: 'الترويج غير موجود' });
                }

                if (permanent === 'true') {
                    // حذف نهائي
                    await prisma.featured_ads.delete({ where: { id } });
                } else {
                    // إيقاف فقط
                    await prisma.featured_ads.update({
                        where: { id },
                        data: { isActive: false, updatedAt: new Date() },
                    });
                }

                // تحديث حالة المزاد
                if (promotion.sourceType === 'auction' && promotion.sourceId) {
                    await prisma.auctions.update({
                        where: { id: promotion.sourceId },
                        data: { featured: false, updatedAt: new Date() },
                    });
                }

                // تسجيل النشاط
                await prisma.admin_activities.create({
                    data: {
                        id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        admin_id: auth.adminId,
                        action: permanent === 'true' ? 'DELETE_PROMOTION' : 'DEACTIVATE_PROMOTION',
                        resource_type: 'featured_ad',
                        resource_id: id,
                        success: true,
                    },
                });

                return res.status(200).json({
                    success: true,
                    message: permanent === 'true' ? 'تم حذف الترويج نهائياً' : 'تم إيقاف الترويج',
                });
            } catch (error) {
                console.error('خطأ في حذف الترويج:', error);
                return res.status(500).json({ success: false, message: 'خطأ في الخادم' });
            }
        }

        default:
            res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
            return res.status(405).json({ success: false, message: `الطريقة ${req.method} غير مسموحة` });
    }
}
