/**
 * API البحث عن المستخدمين - لوحة التحكم
 * User Search API - Admin Panel
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// التحقق من المصادقة
async function verifyAuth(req: NextApiRequest): Promise<boolean> {
    const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;
    if (!token) return false;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { type: string; };
        return decoded.type === 'admin';
    } catch {
        return false;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // التحقق من المصادقة
        const isAuth = await verifyAuth(req);
        if (!isAuth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        const { q, limit = '10' } = req.query;
        const searchQuery = String(q || '').trim();
        const limitNum = Math.min(parseInt(String(limit), 10) || 10, 50);

        if (!searchQuery || searchQuery.length < 2) {
            return res.status(200).json({
                success: true,
                users: [],
                message: 'يرجى إدخال حرفين على الأقل للبحث',
            });
        }

        // البحث في المستخدمين
        const users = await prisma.users.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { phone: { contains: searchQuery } },
                    { email: { contains: searchQuery, mode: 'insensitive' } },
                ],
            },
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                role: true,
                accountType: true,
                profileImage: true,
                verified: true,
                createdAt: true,
            },
            orderBy: [
                { role: 'asc' }, // ADMIN أولاً
                { name: 'asc' },
            ],
            take: limitNum,
        });

        return res.status(200).json({
            success: true,
            users,
            count: users.length,
        });
    } catch (error) {
        console.error('[User Search API] خطأ:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في البحث',
        });
    }
}
