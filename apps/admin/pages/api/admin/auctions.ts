/**
 * Auctions API - Enterprise Edition
 * API إدارة المزادات - مع Prisma
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

// بيانات وهمية للتطوير
const MOCK_AUCTIONS = [
    {
        id: 'auction-001',
        title: 'تويوتا كامري 2022',
        description: 'سيارة بحالة ممتازة',
        startPrice: 50000,
        currentPrice: 55000,
        minimumBid: 500,
        status: 'ACTIVE',
        type: 'PUBLIC',
        startDate: new Date(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        views: 150,
        totalBids: 5,
        bidsCount: 5,
        featured: false,
        car: { id: 'car-001', title: 'تويوتا كامري', brand: 'تويوتا', model: 'كامري', year: 2022 },
        seller: { id: 'user-001', name: 'محمد أحمد', phone: '+218912345678' },
        winner: null,
        createdAt: new Date(),
    },
    {
        id: 'auction-002',
        title: 'هوندا أكورد 2021',
        description: 'سيارة اقتصادية',
        startPrice: 45000,
        currentPrice: 48000,
        minimumBid: 500,
        status: 'ACTIVE',
        type: 'PUBLIC',
        startDate: new Date(),
        endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        views: 120,
        totalBids: 3,
        bidsCount: 3,
        featured: true,
        car: { id: 'car-002', title: 'هوندا أكورد', brand: 'هوندا', model: 'أكورد', year: 2021 },
        seller: { id: 'user-002', name: 'علي حسن', phone: '+218923456789' },
        winner: null,
        createdAt: new Date(),
    },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Verify authentication
        const auth = await verifyAuth(req);
        if (!auth) {
            // في بيئة التطوير، إرجاع بيانات وهمية
            if (process.env.NODE_ENV !== 'production' && req.method === 'GET') {
                return res.status(200).json({
                    success: true,
                    auctions: MOCK_AUCTIONS,
                    total: MOCK_AUCTIONS.length,
                    page: 1,
                    limit: 20,
                    pages: 1,
                    stats: { active: 2, upcoming: 0, ended: 0, cancelled: 0, pending: 0, featured: 1 },
                    isMockData: true,
                });
            }
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        switch (req.method) {
            case 'GET': {
                const page = parseInt(req.query.page as string) || 1;
                const limit = parseInt(req.query.limit as string) || 20;
                const skip = (page - 1) * limit;
                const status = req.query.status as string;
                const search = req.query.search as string;
                const sold = req.query.sold as string;
                const featured = req.query.featured as string;

                // Build where clause
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const where: any = {
                    // استبعاد مزادات الساحات - المزادات الأونلاين فقط (yardId = null)
                    yardId: null,
                };

                if (status) {
                    where.status = status;
                }

                // فلتر الإعلانات المميزة
                if (featured === 'true') {
                    where.featured = true;
                } else if (featured === 'false') {
                    where.featured = false;
                }

                if (search) {
                    where.OR = [
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                    ];
                }

                // تحديد الترتيب حسب الحالة
                let orderBy: { [key: string]: 'asc' | 'desc'; } = { createdAt: 'desc' };
                if (status === 'ACTIVE') {
                    orderBy = { endDate: 'asc' }; // المزادات المباشرة: الأقرب للانتهاء أولاً
                } else if (status === 'UPCOMING') {
                    orderBy = { startDate: 'asc' }; // القادمة: الأقرب للبدء أولاً
                } else if (status === 'ENDED') {
                    orderBy = { endDate: 'desc' }; // المنتهية: الأحدث أولاً
                }

                try {
                    const [auctions, total] = await Promise.all([
                        prisma.auctions.findMany({
                            where,
                            include: {
                                cars: {
                                    select: {
                                        id: true,
                                        title: true,
                                        brand: true,
                                        model: true,
                                        year: true,
                                        mileage: true,
                                        price: true,
                                        images: true,
                                        featured: true,
                                    },
                                },
                                users: {
                                    select: {
                                        id: true,
                                        name: true,
                                        phone: true,
                                    },
                                },
                                bids: {
                                    orderBy: { amount: 'desc' },
                                    take: 1,
                                    include: {
                                        users: {
                                            select: {
                                                id: true,
                                                name: true,
                                                phone: true,
                                            },
                                        },
                                    },
                                },
                                _count: {
                                    select: {
                                        bids: true,
                                    },
                                },
                            },
                            orderBy,
                            skip,
                            take: limit,
                        }),
                        prisma.auctions.count({ where }),
                    ]);

                    // حساب الإحصائيات (للمزادات الأونلاين فقط - بدون مزادات الساحات)
                    const onlineAuctionsFilter = { yardId: null };
                    const [stats, featuredCount] = await Promise.all([
                        prisma.auctions.groupBy({
                            by: ['status'],
                            where: onlineAuctionsFilter,
                            _count: { status: true },
                        }),
                        prisma.auctions.count({
                            where: { featured: true, yardId: null },
                        }),
                    ]);

                    const statsMap = stats.reduce((acc, s) => {
                        acc[s.status] = s._count.status;
                        return acc;
                    }, {} as Record<string, number>);

                    return res.status(200).json({
                        success: true,
                        auctions: auctions.map(a => {
                            // تحديد الفائز (أعلى مزايد)
                            const winner = a.bids[0]?.users || null;

                            return {
                                id: a.id,
                                title: a.title,
                                description: a.description,
                                startPrice: a.startPrice,
                                currentPrice: a.currentPrice,
                                minimumBid: a.minimumBid,
                                status: a.status,
                                type: a.type,
                                startDate: a.startDate,
                                endDate: a.endDate,
                                views: a.views,
                                totalBids: a.totalBids,
                                bidsCount: a._count.bids,
                                featured: a.featured,
                                car: a.cars,
                                seller: a.users,
                                winner: winner,
                                createdAt: a.createdAt,
                            };
                        }),
                        total,
                        page,
                        limit,
                        pages: Math.ceil(total / limit),
                        stats: {
                            active: statsMap['ACTIVE'] || 0,
                            upcoming: statsMap['UPCOMING'] || 0,
                            ended: statsMap['ENDED'] || 0,
                            cancelled: statsMap['CANCELLED'] || 0,
                            pending: statsMap['PENDING'] || 0,
                            featured: featuredCount,
                        },
                    });
                } catch (dbError) {
                    console.error('Database error fetching auctions:', dbError);
                    // إرجاع بيانات وهمية في حالة فشل قاعدة البيانات
                    return res.status(200).json({
                        success: true,
                        auctions: MOCK_AUCTIONS,
                        total: MOCK_AUCTIONS.length,
                        page: 1,
                        limit: 20,
                        pages: 1,
                        stats: { active: 2, upcoming: 0, ended: 0, cancelled: 0, pending: 0, featured: 1 },
                        isMockData: true,
                        dbError: process.env.NODE_ENV !== 'production' ? String(dbError) : undefined,
                    });
                }
            }

            case 'PUT': {
                const { id } = req.query;
                const { status, endDate, minimumBid, featured } = req.body;

                if (!id) {
                    return res.status(400).json({ success: false, message: 'معرف المزاد مطلوب' });
                }

                const updatedAuction = await prisma.auctions.update({
                    where: { id: id as string },
                    data: {
                        ...(status && { status }),
                        ...(endDate && { endDate: new Date(endDate) }),
                        ...(minimumBid !== undefined && { minimumBid }),
                        ...(featured !== undefined && { featured }),
                        updatedAt: new Date(),
                    },
                });

                // Log activity (بشكل آمن)
                try {
                    const adminExists = await prisma.admins.findUnique({
                        where: { id: auth.adminId },
                        select: { id: true }
                    });
                    if (adminExists) {
                        await prisma.admin_activities.create({
                            data: {
                                id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                                admin_id: auth.adminId,
                                action: 'UPDATE_AUCTION',
                                resource_type: 'auction',
                                resource_id: id as string,
                                success: true,
                                created_at: new Date(),
                            },
                        });
                    }
                } catch (logError) {
                    console.warn('[Auctions API] فشل تسجيل النشاط (غير حرج)');
                }

                return res.status(200).json({
                    success: true,
                    message: 'تم تحديث المزاد',
                    auction: updatedAuction,
                });
            }

            case 'DELETE': {
                const { id } = req.query;

                if (!id) {
                    return res.status(400).json({ success: false, message: 'معرف المزاد مطلوب' });
                }

                // Cancel auction instead of delete
                await prisma.auctions.update({
                    where: { id: id as string },
                    data: {
                        status: 'CANCELLED',
                        updatedAt: new Date(),
                    },
                });

                // Log activity (بشكل آمن)
                try {
                    const adminExists = await prisma.admins.findUnique({
                        where: { id: auth.adminId },
                        select: { id: true }
                    });
                    if (adminExists) {
                        await prisma.admin_activities.create({
                            data: {
                                id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                                admin_id: auth.adminId,
                                action: 'CANCEL_AUCTION',
                                resource_type: 'auction',
                                resource_id: id as string,
                                success: true,
                                created_at: new Date(),
                            },
                        });
                    }
                } catch (logError) {
                    console.warn('[Auctions API] فشل تسجيل النشاط (غير حرج)');
                }

                return res.status(200).json({
                    success: true,
                    message: 'تم إلغاء المزاد',
                });
            }

            default:
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Auctions API error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
        });
    }
}
