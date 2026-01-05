/**
 * Admin Auth Check API - Enterprise Edition (Fixed & Unified)
 * API التحقق من مصادقة المدير - نسخة موحدة ومصلحة
 * 
 * Features:
 * - معالجة أخطاء شاملة
 * - دعم حساب التطوير الافتراضي
 * - فحص قاعدة البيانات مع fallback
 * - تحديث نشاط الجلسة
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// حساب المدير الافتراضي للتطوير
const DEV_ADMIN = {
    id: 'dev_admin_001',
    username: 'admin',
    name: 'مدير النظام',
    role: 'SUPER_ADMIN',
    email: 'admin@sooq-mazad.com',
};

interface TokenPayload {
    adminId: string;
    username?: string;
    email?: string;
    role: string;
    sessionId: string;
    type: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, message: 'طريقة الطلب غير مسموحة' });
    }

    console.log('[Admin Me] فحص المصادقة...');

    try {
        // Get token from cookie or header
        const token = req.cookies[COOKIE_NAME] ||
            req.cookies.admin_token ||
            req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            console.log('[Admin Me] لا يوجد رمز مصادقة');
            return res.status(401).json({
                success: false,
                message: 'غير مصرح - لم يتم توفير رمز المصادقة',
                errorCode: 'NO_TOKEN'
            });
        }

        // Verify token
        let decoded: TokenPayload;
        try {
            decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
        } catch (jwtError) {
            console.log('[Admin Me] فشل التحقق من الرمز:', jwtError instanceof Error ? jwtError.message : jwtError);
            return res.status(401).json({
                success: false,
                message: 'رمز المصادقة غير صالح أو منتهي الصلاحية',
                errorCode: 'INVALID_TOKEN'
            });
        }

        // Check token type
        if (decoded.type !== 'admin') {
            console.log('[Admin Me] نوع الرمز غير صحيح:', decoded.type);
            return res.status(401).json({
                success: false,
                message: 'غير مصرح - نوع الرمز غير صحيح',
                errorCode: 'WRONG_TOKEN_TYPE'
            });
        }

        console.log('[Admin Me] معرف المدير:', decoded.adminId);

        // ========================================
        // فحص اتصال قاعدة البيانات
        // ========================================
        let dbConnected = false;
        try {
            await prisma.$queryRaw`SELECT 1`;
            dbConnected = true;
        } catch (dbError) {
            console.warn('[Admin Me] قاعدة البيانات غير متصلة:', dbError instanceof Error ? dbError.message : dbError);
        }

        // ========================================
        // البحث عن الجلسة في قاعدة البيانات
        // ========================================
        let session = null;
        let admin = null;

        if (dbConnected) {
            try {
                session = await prisma.admin_sessions.findFirst({
                    where: {
                        id: decoded.sessionId,
                        admin_id: decoded.adminId,
                        is_active: true,
                        expires_at: { gt: new Date() },
                    },
                    include: {
                        admins: {
                            include: {
                                admin_permissions: true,
                            },
                        },
                    },
                });

                if (session?.admins) {
                    admin = session.admins;

                    // تحديث نشاط الجلسة
                    try {
                        await prisma.admin_sessions.update({
                            where: { id: decoded.sessionId },
                            data: { last_activity: new Date() },
                        });
                    } catch (updateError) {
                        console.warn('[Admin Me] فشل تحديث نشاط الجلسة (غير حرج)');
                    }
                }
            } catch (searchError) {
                console.warn('[Admin Me] خطأ في البحث عن الجلسة:', searchError instanceof Error ? searchError.message : searchError);
            }
        }

        // ========================================
        // Fallback لحساب التطوير الافتراضي
        // ========================================
        if (!admin && decoded.adminId === DEV_ADMIN.id) {
            console.log('[Admin Me] استخدام بيانات حساب التطوير الافتراضي');
            admin = {
                id: DEV_ADMIN.id,
                username: DEV_ADMIN.username,
                email: DEV_ADMIN.email,
                name: DEV_ADMIN.name,
                phone: null,
                role: DEV_ADMIN.role,
                avatar: null,
                is_active: true,
                deleted_at: null,
                last_login: new Date(),
                created_at: new Date(),
                admin_permissions: [],
            };
        }

        // ========================================
        // التحقق من وجود المدير
        // ========================================
        if (!admin) {
            console.log('[Admin Me] الجلسة غير صالحة أو منتهية');
            return res.status(401).json({
                success: false,
                message: 'الجلسة غير صالحة أو منتهية',
                errorCode: 'INVALID_SESSION'
            });
        }

        // Check if admin is still active
        if (!admin.is_active || admin.deleted_at) {
            console.log('[Admin Me] الحساب معطل أو محذوف');
            return res.status(403).json({
                success: false,
                message: 'الحساب معطل أو محذوف',
                errorCode: 'ACCOUNT_DISABLED'
            });
        }

        console.log('[Admin Me] المصادقة ناجحة:', admin.name);

        // Return admin data
        return res.status(200).json({
            success: true,
            admin: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                name: admin.name,
                phone: admin.phone,
                role: admin.role,
                avatar: admin.avatar,
                permissions: admin.admin_permissions?.map((p: { permission: string; }) => p.permission) || [],
                lastLogin: admin.last_login,
                createdAt: admin.created_at,
            },
            session: session ? {
                id: session.id,
                loginAt: session.login_at,
                lastActivity: session.last_activity,
                expiresAt: session.expires_at,
                ipAddress: session.ip_address,
            } : {
                id: decoded.sessionId,
                loginAt: new Date(),
                lastActivity: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
                ipAddress: 'unknown',
            },
        });

    } catch (error) {
        console.error('[Admin Me] خطأ غير متوقع:', error);

        const errorDetails = error instanceof Error ? {
            name: error.name,
            message: error.message,
        } : String(error);

        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم. يرجى المحاولة مرة أخرى.',
            errorCode: 'SERVER_ERROR',
            debug: process.env.NODE_ENV === 'development' ? errorDetails : undefined
        });
    }
}
