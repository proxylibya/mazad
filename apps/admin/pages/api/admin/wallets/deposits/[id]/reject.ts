/**
 * API رفض الإيداع
 * Reject Deposit API
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

        // فقط SUPER_ADMIN و ADMIN و FINANCE يمكنهم الرفض
        if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(auth.role)) {
            return res.status(403).json({ success: false, message: 'لا تملك صلاحية رفض الإيداعات' });
        }

        const { id } = req.query;
        const { reason } = req.body;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ success: false, message: 'معرف الإيداع مطلوب' });
        }

        // جلب الإيداع
        const deposit = await prisma.deposits.findUnique({
            where: { id },
        });

        if (!deposit) {
            return res.status(404).json({ success: false, message: 'الإيداع غير موجود' });
        }

        // التحقق من حالة الإيداع
        if (deposit.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: 'لا يمكن رفض إيداع مكتمل' });
        }

        if (deposit.status === 'CANCELLED') {
            return res.status(400).json({ success: false, message: 'الإيداع ملغي بالفعل' });
        }

        // تحديث حالة الإيداع
        await prisma.deposits.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                failedAt: new Date(),
                failureReason: reason || 'تم الرفض من قبل الإدارة',
                updatedAt: new Date(),
            },
        });

        // تحديث المعاملة إذا وجدت
        if (deposit.transactionId) {
            await prisma.transactions.update({
                where: { id: deposit.transactionId },
                data: { status: 'FAILED' },
            });
        }

        // إنشاء إشعار للمستخدم
        await prisma.notifications.create({
            data: {
                id: `notif-deposit-rejected-${Date.now()}`,
                userId: deposit.userId,
                type: 'DEPOSIT_FAILED',
                title: 'تم رفض طلب الإيداع ❌',
                message: reason || 'تم رفض طلب الإيداع. يرجى التواصل مع الدعم للمزيد من المعلومات.',
                isRead: false,
                depositId: deposit.id,
                createdAt: new Date(),
            },
        });

        return res.status(200).json({
            success: true,
            message: 'تم رفض الإيداع',
            data: {
                depositId: id,
                reason: reason || 'تم الرفض من قبل الإدارة',
            },
        });
    } catch (error) {
        console.error('Error rejecting deposit:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
}
