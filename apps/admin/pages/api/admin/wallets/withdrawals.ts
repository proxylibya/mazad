/**
 * Withdrawal Requests API
 * API طلبات السحب
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
    try {
        // Verify authentication
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        switch (req.method) {
            case 'GET': {
                const page = parseInt(req.query.page as string) || 1;
                const limit = parseInt(req.query.limit as string) || 50;
                const skip = (page - 1) * limit;
                const status = req.query.status as string;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const where: any = {
                    type: 'WITHDRAWAL',
                };

                // Filter by status
                if (status && status !== 'all') {
                    where.status = status;
                }

                try {
                    const [withdrawals, total] = await Promise.all([
                        prisma.transactions.findMany({
                            where,
                            include: {
                                wallets_transactions_walletIdTowallets: {
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
                            },
                            orderBy: { createdAt: 'desc' },
                            skip,
                            take: limit,
                        }),
                        prisma.transactions.count({ where }),
                    ]);

                    // Transform data
                    const formattedWithdrawals = withdrawals.map((tx) => {
                        const wallet = tx.wallets_transactions_walletIdTowallets;
                        const user = wallet?.users;
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const metadata = tx.metadata as any;

                        return {
                            id: tx.id,
                            userId: user?.id || '',
                            userName: user?.name || 'مستخدم غير معروف',
                            amount: tx.amount,
                            method: metadata?.method || 'BANK_TRANSFER',
                            bankName: metadata?.bankName,
                            accountNumber: metadata?.accountNumber,
                            status: tx.status === 'COMPLETED' ? 'COMPLETED' :
                                tx.status === 'PENDING' ? 'PENDING' :
                                    tx.status === 'FAILED' ? 'REJECTED' : 'PENDING',
                            createdAt: tx.createdAt.toISOString(),
                            notes: tx.description,
                        };
                    });

                    return res.status(200).json({
                        success: true,
                        withdrawals: formattedWithdrawals,
                        total,
                        page,
                        limit,
                        pages: Math.ceil(total / limit),
                    });
                } catch (dbError) {
                    console.error('Database error:', dbError);

                    // Return mock data as fallback
                    const mockWithdrawals = [
                        {
                            id: '1',
                            userId: 'u1',
                            userName: 'محمد أحمد',
                            amount: 5000,
                            method: 'BANK_TRANSFER',
                            bankName: 'مصرف الجمهورية',
                            accountNumber: '1234567890',
                            status: 'PENDING',
                            createdAt: new Date().toISOString(),
                        },
                        {
                            id: '2',
                            userId: 'u2',
                            userName: 'أحمد علي',
                            amount: 3000,
                            method: 'CASH',
                            status: 'PENDING',
                            createdAt: new Date().toISOString(),
                        },
                        {
                            id: '3',
                            userId: 'u3',
                            userName: 'سالم محمود',
                            amount: 10000,
                            method: 'BANK_TRANSFER',
                            bankName: 'مصرف التجارة والتنمية',
                            accountNumber: '0987654321',
                            status: 'APPROVED',
                            createdAt: new Date().toISOString(),
                        },
                    ];

                    return res.status(200).json({
                        success: true,
                        withdrawals: mockWithdrawals,
                        total: mockWithdrawals.length,
                        page: 1,
                        limit: 50,
                        pages: 1,
                        isMock: true,
                    });
                }
            }

            case 'PUT': {
                // Only SUPER_ADMIN or FINANCE can manage withdrawals
                if (!['SUPER_ADMIN', 'FINANCE'].includes(auth.role)) {
                    return res.status(403).json({
                        success: false,
                        message: 'ليس لديك صلاحية إدارة طلبات السحب',
                    });
                }

                const { id, action, notes } = req.body;

                if (!id || !action) {
                    return res.status(400).json({
                        success: false,
                        message: 'معرف الطلب والإجراء مطلوبان',
                    });
                }

                let newStatus: string;
                switch (action) {
                    case 'approve':
                        newStatus = 'PENDING'; // Approved but waiting for execution
                        break;
                    case 'reject':
                        newStatus = 'FAILED';
                        break;
                    case 'complete':
                        newStatus = 'COMPLETED';
                        break;
                    default:
                        return res.status(400).json({
                            success: false,
                            message: 'إجراء غير صالح',
                        });
                }

                try {
                    await prisma.transactions.update({
                        where: { id },
                        data: {
                            status: newStatus as 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED',
                            description: notes || undefined,
                            updatedAt: new Date(),
                            completedAt: action === 'complete' ? new Date() : undefined,
                        },
                    });

                    // Log activity
                    await prisma.admin_activities.create({
                        data: {
                            id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                            admin_id: auth.adminId,
                            action: `WITHDRAWAL_${action.toUpperCase()}`,
                            resource_type: 'transaction',
                            resource_id: id,
                            success: true,
                        },
                    });

                    return res.status(200).json({
                        success: true,
                        message: action === 'approve' ? 'تمت الموافقة على الطلب' :
                            action === 'reject' ? 'تم رفض الطلب' :
                                'تم تحديث الطلب كمكتمل',
                    });
                } catch (updateError) {
                    console.error('Update error:', updateError);
                    return res.status(500).json({
                        success: false,
                        message: 'حدث خطأ أثناء تحديث الطلب',
                    });
                }
            }

            default:
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Withdrawals API error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
        });
    }
}
