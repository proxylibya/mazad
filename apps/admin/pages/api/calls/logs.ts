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

        // جلب السجلات
        let logs: Array<{
            id: string;
            callerId: string;
            calleeId: string;
            callerName: string;
            calleeName: string;
            callerPhone: string | null;
            calleePhone: string | null;
            type: string;
            status: string;
            duration: number;
            startTime: Date;
            endTime: Date | null;
        }> = [];
        let total = 0;

        try {
            // محاولة جلب البيانات من قاعدة البيانات
            const [logsResult, totalResult] = await Promise.all([
                prisma.$queryRaw`
          SELECT 
            id, 
            caller_id as "callerId", 
            callee_id as "calleeId",
            caller_name as "callerName",
            callee_name as "calleeName",
            caller_phone as "callerPhone",
            callee_phone as "calleePhone",
            type, 
            status, 
            duration,
            start_time as "startTime",
            end_time as "endTime"
          FROM call_logs
          ORDER BY start_time DESC
          LIMIT ${limitNum} OFFSET ${skip}
        ` as Promise<typeof logs>,
                prisma.$queryRaw`SELECT COUNT(*) as count FROM call_logs` as Promise<[{ count: bigint; }]>,
            ]);

            logs = logsResult;
            total = Number(totalResult[0]?.count || 0);
        } catch {
            // إذا لم يكن الجدول موجوداً، نعيد بيانات فارغة
            console.log('Call logs table not found, returning empty data');
        }

        // إحصائيات
        let stats = {
            total: 0,
            completed: 0,
            missed: 0,
            rejected: 0,
            totalDuration: 0,
            voiceCalls: 0,
            videoCalls: 0,
        };

        try {
            const statsResult = await prisma.$queryRaw`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
          COALESCE(SUM(duration), 0) as "totalDuration",
          SUM(CASE WHEN type = 'voice' THEN 1 ELSE 0 END) as "voiceCalls",
          SUM(CASE WHEN type = 'video' THEN 1 ELSE 0 END) as "videoCalls"
        FROM call_logs
      ` as [{ total: bigint; completed: bigint; missed: bigint; rejected: bigint; totalDuration: number; voiceCalls: bigint; videoCalls: bigint; }];

            if (statsResult[0]) {
                stats = {
                    total: Number(statsResult[0].total),
                    completed: Number(statsResult[0].completed),
                    missed: Number(statsResult[0].missed),
                    rejected: Number(statsResult[0].rejected),
                    totalDuration: Number(statsResult[0].totalDuration),
                    voiceCalls: Number(statsResult[0].voiceCalls),
                    videoCalls: Number(statsResult[0].videoCalls),
                };
            }
        } catch {
            console.log('Could not fetch call stats');
        }

        return res.status(200).json({
            success: true,
            data: {
                logs: logs.map((log) => ({
                    ...log,
                    startTime: log.startTime?.toISOString?.() || new Date().toISOString(),
                    endTime: log.endTime?.toISOString?.() || null,
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
        console.error('Error fetching call logs:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في جلب سجل المكالمات',
        });
    }
}
