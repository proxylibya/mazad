import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { page = '1', limit = '20', type, status, search } = req.query;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);
        const skip = (pageNum - 1) * limitNum;

        // بناء شروط البحث
        const where: Record<string, unknown> = {};

        if (type && type !== 'all') {
            where.type = type;
        }

        if (status && status !== 'all') {
            where.status = status;
        }

        if (search) {
            where.OR = [
                { phone: { contains: search as string } },
                { message: { contains: search as string } },
            ];
        }

        // جلب السجلات
        let logs: Array<{
            id: string;
            phone: string;
            message: string;
            type: string;
            status: string;
            cost: number;
            createdAt: Date;
            errorMessage?: string | null;
        }> = [];
        let total = 0;

        try {
            // محاولة جلب البيانات من قاعدة البيانات
            const [logsResult, totalResult] = await Promise.all([
                prisma.$queryRaw`
          SELECT id, phone, message, type, status, cost, created_at as "createdAt", error_message as "errorMessage"
          FROM sms_logs
          ORDER BY created_at DESC
          LIMIT ${limitNum} OFFSET ${skip}
        ` as Promise<typeof logs>,
                prisma.$queryRaw`SELECT COUNT(*) as count FROM sms_logs` as Promise<[{ count: bigint; }]>,
            ]);

            logs = logsResult;
            total = Number(totalResult[0]?.count || 0);
        } catch {
            // إذا لم يكن الجدول موجوداً، نعيد بيانات فارغة
            console.log('SMS logs table not found, returning empty data');
        }

        // إحصائيات
        let stats = {
            total: 0,
            delivered: 0,
            sent: 0,
            failed: 0,
            pending: 0,
            totalCost: 0,
        };

        try {
            const statsResult = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
          SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) as sent,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          COALESCE(SUM(cost), 0) as "totalCost"
        FROM sms_logs
      ` as [{ total: bigint; delivered: bigint; sent: bigint; failed: bigint; pending: bigint; totalCost: number; }];

            if (statsResult[0]) {
                stats = {
                    total: Number(statsResult[0].total),
                    delivered: Number(statsResult[0].delivered),
                    sent: Number(statsResult[0].sent),
                    failed: Number(statsResult[0].failed),
                    pending: Number(statsResult[0].pending),
                    totalCost: Number(statsResult[0].totalCost),
                };
            }
        } catch {
            console.log('Could not fetch SMS stats');
        }

        return res.status(200).json({
            success: true,
            data: {
                logs: logs.map((log) => ({
                    ...log,
                    createdAt: log.createdAt?.toISOString?.() || new Date().toISOString(),
                })),
                stats,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            },
        });
    } catch (error) {
        console.error('Error fetching SMS logs:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب سجل الرسائل',
        });
    }
}
