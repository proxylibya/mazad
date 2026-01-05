import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET =
    process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// Verify admin authentication
function verifyAuth(req: NextApiRequest): { valid: boolean; adminId?: string; } {
    const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;
    if (!token) return { valid: false };
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return { valid: true, adminId: decoded.adminId || decoded.userId };
    } catch {
        return { valid: false };
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // التحقق من المصادقة
    const auth = verifyAuth(req);
    if (!auth.valid) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    try {
        const { range = 'month' } = req.query;

        // حساب نطاق التاريخ
        const now = new Date();
        let startDate = new Date();
        let lastPeriodStart = new Date();
        let lastPeriodEnd = new Date();

        switch (range) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                lastPeriodStart.setDate(now.getDate() - 14);
                lastPeriodEnd.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                lastPeriodStart.setMonth(now.getMonth() - 2);
                lastPeriodEnd.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                lastPeriodStart.setMonth(now.getMonth() - 6);
                lastPeriodEnd.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                lastPeriodStart.setFullYear(now.getFullYear() - 2);
                lastPeriodEnd.setFullYear(now.getFullYear() - 1);
                break;
        }

        // إحصائيات أساسية
        const [
            totalServices,
            activeServices,
            inactiveServices,
            suspendedServices,
            featuredServices,
            thisMonthServices,
            lastMonthServices,
        ] = await Promise.all([
            prisma.transport_services.count(),
            prisma.transport_services.count({ where: { status: 'ACTIVE' } }),
            prisma.transport_services.count({ where: { status: 'INACTIVE' } }),
            prisma.transport_services.count({ where: { status: 'SUSPENDED' } }),
            prisma.transport_services.count({ where: { featured: true } }),
            prisma.transport_services.count({
                where: { createdAt: { gte: startDate } },
            }),
            prisma.transport_services.count({
                where: {
                    createdAt: { gte: lastPeriodStart, lt: lastPeriodEnd },
                },
            }),
        ]);

        // عدد مقدمي الخدمة الفريدين
        const providers = await prisma.transport_services.groupBy({
            by: ['userId'],
        });
        const totalProviders = providers.length;

        // أكثر المدن طلباً
        const services = await prisma.transport_services.findMany({
            select: { serviceArea: true },
        });

        const cityCounts: Record<string, number> = {};
        services.forEach((s) => {
            if (s.serviceArea) {
                s.serviceArea.split(',').forEach((city) => {
                    const trimmed = city.trim();
                    if (trimmed) {
                        cityCounts[trimmed] = (cityCounts[trimmed] || 0) + 1;
                    }
                });
            }
        });

        const topCities = Object.entries(cityCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([city, count]) => ({ city, count }));

        // أكثر أنواع المركبات
        const vehicleTypes = await prisma.transport_services.groupBy({
            by: ['truckType'],
            _count: { id: true },
            orderBy: { _count: { id: 'desc' } },
            take: 10,
        });

        const topVehicleTypes = vehicleTypes.map((v) => ({
            type: v.truckType,
            count: v._count.id,
        }));

        return res.status(200).json({
            success: true,
            stats: {
                totalServices,
                activeServices,
                inactiveServices,
                suspendedServices,
                featuredServices,
                totalProviders,
                thisMonthServices,
                lastMonthServices,
                topCities,
                topVehicleTypes,
            },
        });
    } catch (error) {
        console.error('Transport reports API error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
        });
    }
}
