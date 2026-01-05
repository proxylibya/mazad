/**
 * Admin Logout API - Enterprise Edition (Fixed & Unified)
 * API تسجيل خروج المدير - نسخة موحدة ومصلحة
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // Get token from cookie
        const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;

        if (token) {
            try {
                // Decode token to get session ID
                const decoded = jwt.verify(token, JWT_SECRET) as {
                    adminId: string;
                    sessionId: string;
                };

                // Invalidate session in database
                await prisma.admin_sessions.updateMany({
                    where: {
                        id: decoded.sessionId,
                        admin_id: decoded.adminId,
                        is_active: true,
                    },
                    data: {
                        is_active: false,
                        logout_at: new Date(),
                    },
                });

                // Log logout activity
                await prisma.admin_activities.create({
                    data: {
                        id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        admin_id: decoded.adminId,
                        action: 'LOGOUT',
                        success: true,
                        ip_address: getClientIP(req),
                        user_agent: req.headers['user-agent'] || null,
                    },
                });

            } catch (error) {
                // Token invalid or expired, still clear cookies
                console.log('Logout: Token verification failed, clearing cookies anyway');
            }
        }

        // Clear cookies
        res.setHeader('Set-Cookie', [
            `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
            'admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
            'admin_logged_in=; Path=/; SameSite=Lax; Max-Age=0'
        ]);

        return res.status(200).json({
            success: true,
            message: 'تم تسجيل الخروج بنجاح'
        });

    } catch (error) {
        console.error('Logout error:', error);

        // Still clear cookies even on error
        res.setHeader('Set-Cookie', [
            `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
            'admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
            'admin_logged_in=; Path=/; SameSite=Lax; Max-Age=0'
        ]);

        return res.status(200).json({
            success: true,
            message: 'تم تسجيل الخروج'
        });
    }
}

function getClientIP(req: NextApiRequest): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown';
}
