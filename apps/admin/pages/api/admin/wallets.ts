/**
 * Wallets API - Enterprise Edition
 * API إدارة المحافظ - مع Prisma
 *
 * @description نقطة نهاية لإدارة محافظ المستخدمين من لوحة الأدمن
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// بيانات وهمية للتطوير
const MOCK_WALLETS = [
    {
        id: 'wallet-001',
        publicId: 1001,
        isActive: true,
        user: { id: 'user-001', name: 'محمد أحمد', phone: '+218912345678', email: 'mohammed@test.com', profileImage: null },
        localBalance: 5000,
        globalBalance: 0,
        cryptoBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'wallet-002',
        publicId: 1002,
        isActive: true,
        user: { id: 'user-002', name: 'علي حسن', phone: '+218923456789', email: 'ali@test.com', profileImage: null },
        localBalance: 12500,
        globalBalance: 0,
        cryptoBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
    {
        id: 'wallet-003',
        publicId: 1003,
        isActive: false,
        user: { id: 'user-003', name: 'أحمد سالم', phone: '+218934567890', email: 'ahmed@test.com', profileImage: null },
        localBalance: 0,
        globalBalance: 0,
        cryptoBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    },
];

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
    try {
        // Verify authentication
        const auth = await verifyAuth(req);
        if (!auth) {
            // في بيئة التطوير، إرجاع بيانات وهمية
            if (process.env.NODE_ENV !== 'production' && req.method === 'GET') {
                return res.status(200).json({
                    success: true,
                    wallets: MOCK_WALLETS,
                    total: MOCK_WALLETS.length,
                    page: 1,
                    limit: 20,
                    pages: 1,
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
                const search = req.query.search as string;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const where: any = {};

                if (search) {
                    where.users = {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { phone: { contains: search } },
                        ],
                    };
                }

                try {
                    const [wallets, total] = await Promise.all([
                        prisma.wallets.findMany({
                            where,
                            include: {
                                users: {
                                    select: {
                                        id: true,
                                        name: true,
                                        phone: true,
                                        email: true,
                                        profileImage: true,
                                    },
                                },
                                local_wallets: true,
                                global_wallets: true,
                                crypto_wallets: true,
                            },
                            orderBy: { createdAt: 'desc' },
                            skip,
                            take: limit,
                        }),
                        prisma.wallets.count({ where }),
                    ]);

                    return res.status(200).json({
                        success: true,
                        wallets: wallets.map(w => ({
                            id: w.id,
                            publicId: w.publicId,
                            isActive: w.isActive,
                            user: w.users,
                            localBalance: w.local_wallets?.balance || 0,
                            globalBalance: w.global_wallets?.balance || 0,
                            cryptoBalance: w.crypto_wallets?.balance || 0,
                            createdAt: w.createdAt,
                            updatedAt: w.updatedAt,
                        })),
                        total,
                        page,
                        limit,
                        pages: Math.ceil(total / limit),
                    });
                } catch (dbError) {
                    console.error('Database error fetching wallets:', dbError);
                    return res.status(200).json({
                        success: true,
                        wallets: MOCK_WALLETS,
                        total: MOCK_WALLETS.length,
                        page: 1,
                        limit: 20,
                        pages: 1,
                        isMockData: true,
                        dbError: process.env.NODE_ENV !== 'production' ? String(dbError) : undefined,
                    });
                }
            }

            case 'PUT': {
                // Only SUPER_ADMIN or FINANCE can modify wallets
                if (!['SUPER_ADMIN', 'FINANCE'].includes(auth.role)) {
                    return res.status(403).json({
                        success: false,
                        message: 'ليس لديك صلاحية تعديل المحافظ',
                    });
                }

                const { id } = req.query;
                const { isActive } = req.body;

                if (!id) {
                    return res.status(400).json({ success: false, message: 'معرف المحفظة مطلوب' });
                }

                const updatedWallet = await prisma.wallets.update({
                    where: { id: id as string },
                    data: {
                        ...(isActive !== undefined && { isActive }),
                        updatedAt: new Date(),
                    },
                });

                await prisma.admin_activities.create({
                    data: {
                        id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        admin_id: auth.adminId,
                        action: isActive ? 'ACTIVATE_WALLET' : 'DEACTIVATE_WALLET',
                        resource_type: 'wallet',
                        resource_id: id as string,
                        success: true,
                    },
                });

                return res.status(200).json({
                    success: true,
                    message: isActive ? 'تم تفعيل المحفظة' : 'تم تعطيل المحفظة',
                    wallet: updatedWallet,
                });
            }

            default:
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Wallets API error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
        });
    }
}
