/**
 * API الموافقة على الإيداع
 * Approve Deposit API
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
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        // فقط SUPER_ADMIN و ADMIN و FINANCE يمكنهم الموافقة
        if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(auth.role)) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية الموافقة على الإيداعات' });
        }

        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ success: false, message: 'معرف الإيداع مطلوب' });
        }

        // جلب الإيداع
        const deposit = await prisma.deposits.findUnique({
            where: { id },
            include: {
                users: true,
            },
        });

        if (!deposit) {
            return res.status(404).json({ success: false, message: 'الإيداع غير موجود' });
        }

        // التحقق من حالة الإيداع
        if (deposit.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'الإيداع مكتمل بالفعل' });
        }

        if (deposit.status === 'CANCELLED' || deposit.status === 'FAILED') {
            return res.status(400).json({ success: false, message: 'لا يمكن الموافقة على إيداع ملغي أو فاشل' });
        }

        // جلب محفظة المستخدم
        let wallet = await prisma.wallets.findUnique({
            where: { userId: deposit.userId },
            include: {
                local_wallets: true,
                global_wallets: true,
                crypto_wallets: true,
            },
        });

        if (!wallet) {
            // إنشاء المحفظة الرئيسية
            wallet = await prisma.wallets.create({
                data: {
                    userId: deposit.userId,
                },
            }) as any;

            // إنشاء المحافظ الفرعية
            await prisma.local_wallets.create({
                data: {
                    wallets: { connect: { id: wallet.id } },
                    balance: 0,
                    currency: 'LYD',
                },
            });
            await prisma.global_wallets.create({
                data: {
                    wallets: { connect: { id: wallet.id } },
                    balance: 0,
                    currency: 'USD',
                },
            });
            await prisma.crypto_wallets.create({
                data: {
                    wallets: { connect: { id: wallet.id } },
                    balance: 0,
                    currency: 'USDT-TRC20',
                    network: 'TRC20',
                },
            });

            // إعادة جلب المحفظة مع العلاقات
            wallet = await prisma.wallets.findUnique({
                where: { id: wallet.id },
                include: {
                    local_wallets: true,
                    global_wallets: true,
                    crypto_wallets: true,
                },
            }) as any;
        }

        // تحديث الرصيد حسب نوع المحفظة
        const netAmount = deposit.netAmount || deposit.amount;

        if (deposit.walletType === 'LOCAL') {
            if (!wallet.local_wallets) {
                await prisma.local_wallets.create({
                    data: {
                        wallets: { connect: { id: wallet.id } },
                        balance: netAmount,
                        currency: 'LYD',
                    },
                });
            } else {
                await prisma.local_wallets.update({
                    where: { walletId: wallet.id },
                    data: { balance: { increment: netAmount } },
                });
            }
        } else if (deposit.walletType === 'GLOBAL') {
            if (!wallet.global_wallets) {
                await prisma.global_wallets.create({
                    data: {
                        wallets: { connect: { id: wallet.id } },
                        balance: netAmount,
                        currency: 'USD',
                    },
                });
            } else {
                await prisma.global_wallets.update({
                    where: { walletId: wallet.id },
                    data: { balance: { increment: netAmount } },
                });
            }
        } else if (deposit.walletType === 'CRYPTO') {
            if (!wallet.crypto_wallets) {
                await prisma.crypto_wallets.create({
                    data: {
                        wallets: { connect: { id: wallet.id } },
                        balance: netAmount,
                        currency: 'USDT-TRC20',
                        network: 'TRC20',
                    },
                });
            } else {
                await prisma.crypto_wallets.update({
                    where: { walletId: wallet.id },
                    data: { balance: { increment: netAmount } },
                });
            }
        }

        // تحديث حالة الإيداع
        await prisma.deposits.update({
            where: { id },
            data: {
                status: 'COMPLETED',
                confirmedAt: new Date(),
                updatedAt: new Date(),
            },
        });

        // تحديث المعاملة إذا وجدت
        if (deposit.transactionId) {
            await prisma.transactions.update({
                where: { id: deposit.transactionId },
                data: { status: 'COMPLETED' },
            });
        } else {
            // إنشاء معاملة جديدة
            await prisma.transactions.create({
                data: {
                    id: `TX-DEP-${Date.now()}`,
                    walletId: wallet.id,
                    type: 'DEPOSIT',
                    amount: netAmount,
                    currency: deposit.currency,
                    status: 'COMPLETED',
                    description: `إيداع - ${deposit.reference}`,
                    reference: deposit.reference,
                    fees: deposit.fees,
                    originalAmount: deposit.amount,
                    originalCurrency: deposit.currency,
                },
            });
        }

        // إنشاء إشعار للمستخدم
        await prisma.notifications.create({
            data: {
                id: `notif-deposit-approved-${Date.now()}`,
                userId: deposit.userId,
                type: 'DEPOSIT_COMPLETED',
                title: 'تم تأكيد الإيداع ✅',
                message: `تم إضافة ${netAmount} ${deposit.currency === 'LYD' ? 'د.ل' : deposit.currency} إلى محفظتك`,
                isRead: false,
                depositId: deposit.id,
                createdAt: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message: 'تم تأكيد الإيداع وإضافة الرصيد بنجاح',
            data: {
                depositId: id,
                amount: netAmount,
                currency: deposit.currency,
                walletType: deposit.walletType,
            },
        });
    } catch (error) {
        console.error('Error approving deposit:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
}
