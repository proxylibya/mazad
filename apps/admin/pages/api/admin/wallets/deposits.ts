/**
 * Deposits API - إدارة الإيداعات
 */
import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

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
        const auth = await verifyAuth(req);

        if (req.method === 'GET') {
            const { walletType, status, page = '1', limit = '20' } = req.query;

            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const where: any = {};

                if (walletType && walletType !== 'ALL') {
                    where.walletType = walletType;
                }
                if (status && status !== 'ALL') {
                    where.status = status;
                }

                const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

                const [deposits, total] = await Promise.all([
                    prisma.deposits.findMany({
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
                            payment_method_configs: {
                                select: {
                                    name: true,
                                    nameAr: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: parseInt(limit as string),
                    }),
                    prisma.deposits.count({ where }),
                ]);

                // حساب الإحصائيات
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                // استخدام raw query لتجنب مشاكل الأنواع مع Prisma enums
                let pendingCount = 0;
                let todayCount = 0;
                try {
                    const pendingResult = await prisma.$queryRaw`
                        SELECT COUNT(*) as count FROM deposits 
                        WHERE status IN ('INITIATED', 'PENDING', 'PROCESSING')
                    ` as any[];
                    pendingCount = Number(pendingResult[0]?.count) || 0;

                    const todayResult = await prisma.$queryRaw`
                        SELECT COUNT(*) as count FROM deposits 
                        WHERE "createdAt" >= ${today}
                    ` as any[];
                    todayCount = Number(todayResult[0]?.count) || 0;
                } catch (e) {
                    // استخدم قيم افتراضية
                }

                // حساب المبالغ
                let pendingAmount = 0;
                let completedAmount = 0;
                try {
                    const pendingAgg = await prisma.$queryRaw`
                        SELECT COALESCE(SUM(amount), 0) as total FROM deposits 
                        WHERE status IN ('INITIATED', 'PENDING', 'PROCESSING')
                    ` as any[];
                    pendingAmount = Number(pendingAgg[0]?.total) || 0;

                    const completedAgg = await prisma.$queryRaw`
                        SELECT COALESCE(SUM(amount), 0) as total FROM deposits 
                        WHERE status = 'COMPLETED'
                    ` as any[];
                    completedAmount = Number(completedAgg[0]?.total) || 0;
                } catch (e) {
                    // إذا فشل، استخدم قيم افتراضية
                }

                const mappedDeposits = deposits.map(d => ({
                    id: d.id,
                    userId: d.userId,
                    userName: d.users?.name || 'مستخدم غير معروف',
                    userPhone: d.users?.phone || '',
                    amount: d.amount,
                    currency: d.currency,
                    walletType: d.walletType,
                    status: d.status,
                    paymentMethod: d.payment_method_configs?.nameAr || d.payment_method_configs?.name || 'غير محدد',
                    reference: d.reference,
                    paymentReference: d.paymentReference,
                    fees: d.fees || 0,
                    netAmount: d.netAmount || d.amount,
                    createdAt: d.createdAt,
                    updatedAt: d.updatedAt,
                }));

                return res.status(200).json({
                    success: true,
                    deposits: mappedDeposits,
                    total,
                    page: parseInt(page as string),
                    pages: Math.ceil(total / parseInt(limit as string)),
                    stats: {
                        totalDeposits: total,
                        pendingDeposits: pendingCount,
                        todayDeposits: todayCount,
                        todayAmount: 0, // سيتم حسابها لاحقاً
                        pendingAmount: pendingAmount,
                        completedAmount: completedAmount,
                    },
                });
            } catch (dbError) {
                console.error('Database error:', dbError);
                // Return mock data for development
                return res.status(200).json({
                    success: true,
                    deposits: [],
                    total: 0,
                    page: 1,
                    pages: 0,
                    stats: {
                        totalDeposits: 0,
                        pendingDeposits: 0,
                        todayDeposits: 0,
                        todayAmount: 0,
                        pendingAmount: 0,
                        completedAmount: 0,
                    },
                    isMockData: true,
                });
            }
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (error) {
        console.error('Deposits API error:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
}
