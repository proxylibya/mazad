/**
 * API جلب نشاطات المديرين
 * Admin Activities API
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// بيانات وهمية للتطوير
const MOCK_ACTIVITIES = [
    {
        id: 'act-001',
        admin_id: 'adm_lem895rd4kbmiwbvnju',
        action: 'LOGIN',
        resource_type: 'auth',
        resource_id: null,
        success: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 'act-002',
        admin_id: 'adm_lem895rd4kbmiwbvnju',
        action: 'UPDATE_USER',
        resource_type: 'user',
        resource_id: 'user-abc123',
        success: true,
        created_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
        id: 'act-003',
        admin_id: 'adm_lem895rd4kbmiwbvnju',
        action: 'APPROVE_AUCTION',
        resource_type: 'auction',
        resource_id: 'auc-xyz789',
        success: true,
        created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
        id: 'act-004',
        admin_id: 'adm_dev_001',
        action: 'CREATE_ADMIN',
        resource_type: 'admin',
        resource_id: 'adm_lem895rd4kbmiwbvnju',
        success: true,
        created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 'act-005',
        admin_id: 'adm_dev_001',
        action: 'UPDATE_SETTINGS',
        resource_type: 'settings',
        resource_id: null,
        success: true,
        created_at: new Date(Date.now() - 172800000).toISOString(),
    },
];

// التحقق من المصادقة
function verifyAuth(req: NextApiRequest): { adminId: string; role: string; } | null {
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
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    // التحقق من المصادقة
    const auth = verifyAuth(req);

    // في بيئة التطوير، إرجاع بيانات وهمية
    if (!auth && process.env.NODE_ENV !== 'production') {
        const { adminId, limit = '10' } = req.query;
        const limitNum = parseInt(limit as string) || 10;

        const filteredActivities = adminId
            ? MOCK_ACTIVITIES.filter(a => a.admin_id === adminId)
            : MOCK_ACTIVITIES;

        return res.status(200).json({
            success: true,
            activities: filteredActivities.slice(0, limitNum),
            total: filteredActivities.length,
            isMockData: true,
        });
    }

    if (!auth) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    try {
        const { adminId, limit = '10', offset = '0' } = req.query;
        const limitNum = parseInt(limit as string) || 10;
        const offsetNum = parseInt(offset as string) || 0;

        // بناء شروط البحث
        const where: Record<string, unknown> = {};
        if (adminId) {
            where.admin_id = adminId;
        }

        // جلب النشاطات من قاعدة البيانات
        const [activities, total] = await Promise.all([
            prisma.admin_activities.findMany({
                where,
                orderBy: { created_at: 'desc' },
                take: limitNum,
                skip: offsetNum,
                select: {
                    id: true,
                    admin_id: true,
                    action: true,
                    resource_type: true,
                    resource_id: true,
                    success: true,
                    created_at: true,
                },
            }),
            prisma.admin_activities.count({ where }),
        ]);

        // تحويل النتائج لتتوافق مع interface
        const formattedActivities = activities.map(a => ({
            id: a.id,
            action: a.action,
            resource_type: a.resource_type,
            resource_id: a.resource_id,
            success: a.success,
            created_at: a.created_at?.toISOString() || new Date().toISOString(),
        }));

        return res.status(200).json({
            success: true,
            activities: formattedActivities,
            total,
        });
    } catch (error) {
        console.error('Error fetching admin activities:', error);

        // إرجاع بيانات وهمية في حالة الخطأ
        const { adminId, limit = '10' } = req.query;
        const limitNum = parseInt(limit as string) || 10;

        const filteredActivities = adminId
            ? MOCK_ACTIVITIES.filter(a => a.admin_id === adminId)
            : MOCK_ACTIVITIES;

        return res.status(200).json({
            success: true,
            activities: filteredActivities.slice(0, limitNum),
            total: filteredActivities.length,
            isMockData: true,
        });
    }
}
