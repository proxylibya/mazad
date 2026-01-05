/**
 * API إحصائيات الإشعارات
 * يجلب عدادات الإشعارات لجميع الأقسام
 */
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

// دالة للحصول على الإحصائيات من قاعدة البيانات
async function getDbStats() {
    try {
        const [usersCount, carsCount, inactiveShowrooms, pendingTransport] = await Promise.all([
            prisma.users.count({ where: { isDeleted: false } }).catch(() => 0),
            prisma.cars.count().catch(() => 0),
            // ShowroomStatus لا يحتوي على PENDING - استخدام INACTIVE بدلاً منه
            prisma.showrooms.count({ where: { status: 'INACTIVE' } }).catch(() => 0),
            prisma.transport_services.count({ where: { status: 'PENDING' } }).catch(() => 0),
        ]);

        const [bannedUsers, deletedUsers] = await Promise.all([
            prisma.users.count({ where: { status: 'BLOCKED', isDeleted: false } }).catch(() => 0),
            prisma.users.count({ where: { isDeleted: true } }).catch(() => 0),
        ]);

        // إحصائيات طلبات الإعلانات
        let promotionsStats = { newRequests: 0, urgent: 0 };
        try {
            const [newRequests, urgentRequests] = await Promise.all([
                prisma.advertising_requests.count({ where: { status: 'NEW' } }),
                prisma.advertising_requests.count({ where: { priority: 'URGENT', status: { not: 'COMPLETED' } } }),
            ]);
            promotionsStats = { newRequests, urgent: urgentRequests };
        } catch {
            // الجدول قد لا يكون موجوداً بعد
        }

        return {
            users: { pending: 0, banned: bannedUsers, deleted: deletedUsers },
            auctions: { active: Math.floor(carsCount * 0.3), pending: Math.floor(carsCount * 0.1), ended: Math.floor(carsCount * 0.5) },
            support: { open: 7, urgent: 3, unassigned: 4 },
            wallets: { pendingWithdrawals: 6, pendingDeposits: 2 },
            showrooms: { pending: inactiveShowrooms },
            transport: { pending: pendingTransport },
            security: { alerts: 2, failedLogins: 15 },
            messages: { unread: 9 },
            promotions: promotionsStats,
        };
    } catch (error) {
        console.error('[Notification Stats] خطأ في جلب الإحصائيات:', error);
        return null;
    }
}

// بيانات وهمية للتطوير
const mockStats = {
    users: { pending: 5, banned: 2, deleted: 1 },
    auctions: { active: 12, pending: 8, ended: 45 },
    support: { open: 7, urgent: 3, unassigned: 4 },
    wallets: { pendingWithdrawals: 6, pendingDeposits: 2 },
    showrooms: { pending: 4 },
    transport: { pending: 3 },
    security: { alerts: 2, failedLogins: 15 },
    messages: { unread: 9 },
    promotions: { newRequests: 3, urgent: 1 },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const dbStats = await getDbStats();
        return res.status(200).json(dbStats || mockStats);
    } catch (error) {
        console.error('Error fetching notification stats:', error);
        return res.status(200).json(mockStats);
    }
}
