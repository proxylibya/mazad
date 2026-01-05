/**
 * API إحصائيات الترويج للوحة التحكم
 */

import { NextApiRequest, NextApiResponse } from 'next';

// Prisma client singleton
import { prisma } from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // جلب إحصائيات الإعلانات المميزة (باستخدام الحقول الموجودة فقط)
        const [activeCars, activeAuctions, activeShowrooms] = await Promise.all([
            // سيارات مميزة نشطة
            prisma.cars.count({
                where: { featured: true },
            }),
            // مزادات مميزة نشطة
            prisma.auctions.count({
                where: { featured: true },
            }),
            // معارض مميزة نشطة
            prisma.showrooms.count({
                where: { featured: true },
            }),
        ]);

        // حساب الإحصائيات
        const totalActive = activeCars + activeAuctions + activeShowrooms;

        // TODO: تفعيل بعد تشغيل الـ migration
        // const promotionTransactions = await prisma.promotion_transactions.findMany({...});

        return res.status(200).json({
            success: true,
            data: {
                totalActive,
                totalRevenue: 0, // سيتم تحديثه بعد الـ migration
                byPackage: { basic: 0, premium: 0, vip: 0 },
                byType: {
                    cars: activeCars,
                    auctions: activeAuctions,
                    showrooms: activeShowrooms,
                    transport: 0,
                },
            },
        });
    } catch (error) {
        console.error('خطأ في جلب إحصائيات الترويج:', error);
        return res.status(500).json({
            success: false,
            error: 'خطأ في الخادم',
        });
    }
}
