/**
 * API جلب الإعلانات المميزة النشطة للوحة التحكم
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Prisma client singleton
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // جلب الإعلانات المميزة من كل الأنواع
        const [featuredCars, featuredAuctions, featuredShowrooms] = await Promise.all([
            // سيارات مميزة
            prisma.cars.findMany({
                where: { featured: true },
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    users: { select: { name: true } },
                },
                take: 50,
                orderBy: { createdAt: 'desc' },
            }),
            // مزادات مميزة
            prisma.auctions.findMany({
                where: { featured: true },
                select: {
                    id: true,
                    title: true,
                    createdAt: true,
                    users: { select: { name: true } },
                },
                take: 50,
                orderBy: { createdAt: 'desc' },
            }),
            // معارض مميزة
            prisma.showrooms.findMany({
                where: { featured: true },
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    users: { select: { name: true } },
                },
                take: 50,
                orderBy: { createdAt: 'desc' },
            }),
        ]);

        // تحويل البيانات لصيغة موحدة
        const activePromotions = [
            ...featuredCars.map((car) => ({
                id: car.id,
                entityType: 'car',
                entityId: car.id,
                entityTitle: car.title,
                packageType: 'premium', // افتراضي حتى يتم تفعيل الحقول الجديدة
                startDate: car.createdAt.toISOString(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                daysRemaining: 7,
                amount: 35,
                userName: car.users?.name || 'غير معروف',
            })),
            ...featuredAuctions.map((auction) => ({
                id: auction.id,
                entityType: 'auction',
                entityId: auction.id,
                entityTitle: auction.title,
                packageType: 'premium',
                startDate: auction.createdAt.toISOString(),
                endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                daysRemaining: 7,
                amount: 35,
                userName: auction.users?.name || 'غير معروف',
            })),
            ...featuredShowrooms.map((showroom) => ({
                id: showroom.id,
                entityType: 'showroom',
                entityId: showroom.id,
                entityTitle: showroom.name,
                packageType: 'vip',
                startDate: showroom.createdAt.toISOString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                daysRemaining: 30,
                amount: 65,
                userName: showroom.users?.name || 'غير معروف',
            })),
        ];

        return res.status(200).json({
            success: true,
            data: activePromotions,
        });
    } catch (error) {
        console.error('خطأ في جلب الإعلانات المميزة:', error);
        return res.status(500).json({
            success: false,
            error: 'خطأ في الخادم',
        });
    }
}
