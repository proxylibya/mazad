/**
 * API جلب مزادات الساحات - لوحة التحكم
 * Get Yard Auctions API - Admin Panel
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

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
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // التحقق من المصادقة
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        const { status, yardId, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
        const take = parseInt(limit as string);

        // بناء شرط البحث - فقط المزادات المرتبطة بساحات
        const where: Record<string, unknown> = {
            yardId: { not: null }, // مزادات الساحات فقط (yardId موجود)
        };

        if (status && status !== 'all') {
            where.status = status;
        }

        if (yardId) {
            where.yardId = yardId;
        }

        // جلب المزادات
        const [auctions, total] = await Promise.all([
            prisma.auctions.findMany({
                where,
                skip,
                take,
                orderBy: [{ createdAt: 'desc' }],
                include: {
                    cars: {
                        select: {
                            id: true,
                            brand: true,
                            model: true,
                            year: true,
                            images: true,
                        },
                    },
                    yard: {
                        select: {
                            id: true,
                            name: true,
                            slug: true,
                        },
                    },
                    _count: {
                        select: { bids: true },
                    },
                },
            }),
            prisma.auctions.count({ where }),
        ]);

        // تحويل البيانات
        const transformedAuctions = auctions.map((auction: any) => ({
            id: auction.id,
            title: auction.title,
            description: auction.description,
            startPrice: auction.startPrice,
            currentPrice: auction.currentPrice,
            status: auction.status,
            startDate: auction.startDate,
            endDate: auction.endDate,
            views: auction.views || 0,
            totalBids: auction._count?.bids || auction.totalBids || 0,
            featured: auction.featured,
            yard: auction.yard,
            cars: auction.cars,
            createdAt: auction.createdAt,
        }));

        return res.status(200).json({
            success: true,
            auctions: transformedAuctions,
            pagination: {
                total,
                page: parseInt(page as string),
                limit: take,
                totalPages: Math.ceil(total / take),
            },
        });
    } catch (error) {
        console.error('خطأ في جلب مزادات الساحات:', error);

        // إرجاع بيانات فارغة في حالة الخطأ
        return res.status(200).json({
            success: true,
            auctions: [],
            pagination: {
                total: 0,
                page: 1,
                limit: 20,
                totalPages: 0,
            },
            message: 'لا توجد مزادات ساحات حالياً',
        });
    }
}
