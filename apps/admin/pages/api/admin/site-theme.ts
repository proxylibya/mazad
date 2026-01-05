import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

type ThemeMode = 'light' | 'dark' | 'system';
type AnimationMode = 'normal' | 'disabled';
type LayoutWidth = 'normal' | 'wide' | 'full';
type FontScale = 'sm' | 'md' | 'lg';

const DEFAULT_THEME_SETTINGS = {
    mode: 'system' as ThemeMode,
    primaryColor: '',
    backgroundColor: '',
    accentColor: '',
    animations: 'normal' as AnimationMode,
    textColor: '',
    fontScale: 'md' as FontScale,
    layoutWidth: 'normal' as LayoutWidth,
};

type ThemeSettings = typeof DEFAULT_THEME_SETTINGS;

const JWT_SECRET =
    process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

async function verifyAuth(
    req: NextApiRequest,
): Promise<{ adminId: string; role: string; } | null> {
    const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;
    if (!token) return null;

    try {
        const decoded = (await import('jsonwebtoken')).default.verify(token, JWT_SECRET) as {
            adminId: string;
            role: string;
            type: string;
        };
        if (decoded.type !== 'admin') return null;
        return { adminId: decoded.adminId, role: decoded.role };
    } catch {
        return null;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === 'GET') {
            try {
                const record = await prisma.system_settings.findFirst({
                    where: { key: 'site_theme' },
                });

                if (!record || !record.value) {
                    return res.status(200).json({
                        success: true,
                        settings: DEFAULT_THEME_SETTINGS,
                    });
                }

                const value =
                    typeof record.value === 'string' ? JSON.parse(record.value as string) : (record.value as ThemeSettings);

                return res.status(200).json({
                    success: true,
                    settings: {
                        ...DEFAULT_THEME_SETTINGS,
                        ...value,
                    },
                });
            } catch {
                return res.status(200).json({
                    success: true,
                    settings: DEFAULT_THEME_SETTINGS,
                });
            }
        }

        if (req.method === 'PUT') {
            const auth = await verifyAuth(req);
            const isDevelopment = process.env.NODE_ENV !== 'production';

            if (!auth && !isDevelopment) {
                return res.status(401).json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' });
            }

            const body = req.body as Partial<ThemeSettings> | undefined;

            if (!body || typeof body !== 'object') {
                return res.status(400).json({
                    success: false,
                    message: 'بيانات الإعدادات غير صحيحة',
                });
            }

            const newSettings: ThemeSettings = {
                ...DEFAULT_THEME_SETTINGS,
                ...body,
            };

            await prisma.system_settings.upsert({
                where: { key: 'site_theme' },
                create: {
                    key: 'site_theme',
                    value: JSON.stringify(newSettings),
                },
                update: {
                    value: JSON.stringify(newSettings),
                },
            });

            return res.status(200).json({
                success: true,
                message: 'تم حفظ إعدادات المظهر بنجاح',
                settings: newSettings,
            });
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        });
    }
}

