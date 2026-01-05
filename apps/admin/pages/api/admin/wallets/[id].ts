/**
 * Wallet Details API - تفاصيل المحفظة
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
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ success: false, message: 'معرف المحفظة مطلوب' });
        }

        if (req.method === 'GET') {
            try {
                const wallet = await prisma.wallets.findUnique({
                    where: { id },
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
                });

                if (!wallet) {
                    return res.status(404).json({ success: false, message: 'المحفظة غير موجودة' });
                }

                return res.status(200).json({
                    success: true,
                    wallet: {
                        id: wallet.id,
                        publicId: wallet.publicId,
                        isActive: wallet.isActive,
                        createdAt: wallet.createdAt,
                        updatedAt: wallet.updatedAt,
                        user: wallet.users,
                        localWallet: wallet.local_wallets ? {
                            balance: wallet.local_wallets.balance,
                            currency: wallet.local_wallets.currency,
                        } : null,
                        globalWallet: wallet.global_wallets ? {
                            balance: wallet.global_wallets.balance,
                            currency: wallet.global_wallets.currency,
                        } : null,
                        cryptoWallet: wallet.crypto_wallets ? {
                            balance: wallet.crypto_wallets.balance,
                            currency: wallet.crypto_wallets.currency,
                            address: wallet.crypto_wallets.address,
                            network: wallet.crypto_wallets.network,
                        } : null,
                    },
                });
            } catch (dbError) {
                console.error('Database error:', dbError);
                return res.status(500).json({ success: false, message: 'خطأ في قاعدة البيانات' });
            }
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (error) {
        console.error('Wallet Details API error:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
}
