/**
 * Wallet Transactions API
 * API سجل المعاملات المالية
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

// بيانات وهمية للتطوير
const MOCK_TRANSACTIONS = [
    {
        id: 'tx-001',
        userId: 'user-001',
        userName: 'محمد أحمد',
        type: 'DEPOSIT',
        amount: 5000,
        status: 'COMPLETED',
        method: 'بطاقة ائتمان',
        reference: 'TXN001',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'tx-002',
        userId: 'user-002',
        userName: 'علي حسن',
        type: 'WITHDRAWAL',
        amount: 3000,
        status: 'PENDING',
        method: 'تحويل بنكي',
        reference: 'TXN002',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'tx-003',
        userId: 'user-001',
        userName: 'محمد أحمد',
        type: 'FEE',
        amount: 50,
        status: 'COMPLETED',
        method: 'نظام',
        reference: 'TXN003',
        createdAt: new Date().toISOString(),
    },
    {
        id: 'tx-004',
        userId: 'user-003',
        userName: 'أحمد سالم',
        type: 'BID_DEPOSIT',
        amount: 1000,
        status: 'COMPLETED',
        method: 'المحفظة',
        reference: 'TXN004',
        createdAt: new Date().toISOString(),
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
                    transactions: MOCK_TRANSACTIONS,
                    total: MOCK_TRANSACTIONS.length,
                    page: 1,
                    limit: 50,
                    pages: 1,
                    isMockData: true,
                });
            }
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        if (req.method !== 'GET') {
            return res.status(405).json({ success: false, message: 'Method not allowed' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;
        const search = req.query.search as string;
        const type = req.query.type as string;
        const status = req.query.status as string;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        // Filter by type
        if (type && type !== 'all') {
            where.type = type;
        }

        // Filter by status
        if (status && status !== 'all') {
            where.status = status;
        }

        try {
            const [transactions, total] = await Promise.all([
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
            const formattedTransactions = transactions.map((tx) => {
                const wallet = tx.wallets_transactions_walletIdTowallets;
                const user = wallet?.users;

                return {
                    id: tx.id,
                    userId: user?.id || '',
                    userName: user?.name || 'مستخدم غير معروف',
                    type: tx.type,
                    amount: tx.amount,
                    status: tx.status,
                    method: tx.description || 'نظام',
                    reference: tx.reference || `TXN${tx.publicId}`,
                    createdAt: tx.createdAt.toISOString(),
                };
            });

            // Filter by search if provided
            let filteredTransactions = formattedTransactions;
            if (search) {
                const searchLower = search.toLowerCase();
                filteredTransactions = formattedTransactions.filter(
                    (tx) =>
                        tx.userName.toLowerCase().includes(searchLower) ||
                        tx.reference.toLowerCase().includes(searchLower)
                );
            }

            return res.status(200).json({
                success: true,
                transactions: filteredTransactions,
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            });
        } catch (dbError) {
            console.error('Database error:', dbError);

            // Return mock data as fallback
            const mockTransactions = [
                {
                    id: '1',
                    userId: 'u1',
                    userName: 'محمد أحمد',
                    type: 'DEPOSIT',
                    amount: 5000,
                    status: 'COMPLETED',
                    method: 'بطاقة ائتمان',
                    reference: 'TXN001',
                    createdAt: new Date().toISOString(),
                },
                {
                    id: '2',
                    userId: 'u2',
                    userName: 'أحمد علي',
                    type: 'WITHDRAWAL',
                    amount: 3000,
                    status: 'PENDING',
                    method: 'تحويل بنكي',
                    reference: 'TXN002',
                    createdAt: new Date().toISOString(),
                },
                {
                    id: '3',
                    userId: 'u1',
                    userName: 'محمد أحمد',
                    type: 'FEE',
                    amount: 50,
                    status: 'COMPLETED',
                    method: 'نظام',
                    reference: 'TXN003',
                    createdAt: new Date().toISOString(),
                },
            ];

            return res.status(200).json({
                success: true,
                transactions: mockTransactions,
                total: mockTransactions.length,
                page: 1,
                limit: 50,
                pages: 1,
                isMock: true,
            });
        }
    } catch (error) {
        console.error('Transactions API error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
        });
    }
}
