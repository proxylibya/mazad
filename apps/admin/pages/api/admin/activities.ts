/**
 * Admin Activities API - Enterprise Edition
 * API سجل أنشطة المديرين
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

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

        if (req.method !== 'GET') {
            return res.status(405).json({ success: false, message: 'Method not allowed' });
        }

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 50;
        const skip = (page - 1) * limit;
        const adminId = req.query.adminId as string;
        const action = req.query.action as string;
        const resourceType = req.query.resourceType as string;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const where: any = {};

        if (adminId) {
            where.admin_id = adminId;
        }

        if (action) {
            where.action = action;
        }

        if (resourceType) {
            where.resource_type = resourceType;
        }

        const [activities, total] = await Promise.all([
            prisma.admin_activities.findMany({
                where,
                include: {
                    admins: {
                        select: {
                            id: true,
                            username: true,
                            firstName: true,
                            lastName: true,
                            role: true,
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit,
            }),
            prisma.admin_activities.count({ where }),
        ]);

        return res.status(200).json({
            success: true,
            activities: activities.map(a => ({
                id: a.id,
                action: a.action,
                resourceType: a.resource_type,
                resourceId: a.resource_id,
                details: a.details,
                ipAddress: a.ip_address,
                userAgent: a.user_agent,
                success: a.success,
                admin: a.admins,
                createdAt: a.created_at,
            })),
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        });
    } catch (error) {
        console.error('Activities API error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
        });
    }
}
