import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET =
    process.env.ADMIN_JWT_SECRET ||
    process.env.JWT_SECRET ||
    'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

const DEFAULT_SITE_TEAM_SETTINGS = {
    enabled: false,
    userId: 'site_team',
    teamName: 'فريق مزاد',
    phones: [] as string[],
    whatsappPhone: '',
    allowCalls: true,
    allowMessages: true,
};

type SiteTeamSettings = typeof DEFAULT_SITE_TEAM_SETTINGS;

async function verifyAuth(req: NextApiRequest): Promise<{ adminId: string; role: string; } | null> {
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

async function ensureSiteTeamUser(settings: SiteTeamSettings) {
    const userId = settings.userId || DEFAULT_SITE_TEAM_SETTINGS.userId;
    const desiredName = settings.teamName || DEFAULT_SITE_TEAM_SETTINGS.teamName;
    const desiredPhone = (settings.phones || []).find((p) => String(p || '').trim()) || '+218900000000';

    const existing = await prisma.users.findUnique({ where: { id: userId } });
    if (existing) {
        const update: Record<string, unknown> = { updatedAt: new Date() };

        if (existing.name !== desiredName) update.name = desiredName;

        const phoneOwnedByOther = await prisma.users.findFirst({
            where: { phone: desiredPhone, NOT: { id: userId } },
            select: { id: true },
        });

        if (!phoneOwnedByOther && existing.phone !== desiredPhone) {
            update.phone = desiredPhone;
        }

        await prisma.users.update({ where: { id: userId }, data: update });
        return;
    }

    let phoneToUse = desiredPhone;
    for (let i = 0; i < 10; i += 1) {
        const occupied = await prisma.users.findFirst({ where: { phone: phoneToUse }, select: { id: true } });
        if (!occupied) break;
        phoneToUse = `+2189${Date.now().toString().slice(-9)}`;
    }

    await prisma.users.create({
        data: {
            id: userId,
            name: desiredName,
            phone: phoneToUse,
            role: 'USER',
            status: 'ACTIVE',
            accountType: 'REGULAR_USER',
            verified: true,
            updatedAt: new Date(),
            createdAt: new Date(),
        },
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (req.method === 'GET') {
            const record = await prisma.system_settings.findFirst({ where: { key: 'site_team' } });
            if (!record || !record.value) {
                return res.status(200).json({ success: true, settings: DEFAULT_SITE_TEAM_SETTINGS });
            }

            const value =
                typeof record.value === 'string'
                    ? (JSON.parse(record.value as string) as Partial<SiteTeamSettings>)
                    : (record.value as Partial<SiteTeamSettings>);

            return res.status(200).json({
                success: true,
                settings: {
                    ...DEFAULT_SITE_TEAM_SETTINGS,
                    ...value,
                },
            });
        }

        if (req.method === 'PUT') {
            const auth = await verifyAuth(req);
            const isDevelopment = process.env.NODE_ENV !== 'production';

            if (!auth && !isDevelopment) {
                return res.status(401).json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' });
            }

            const body = req.body as Partial<SiteTeamSettings> | undefined;
            if (!body || typeof body !== 'object') {
                return res.status(400).json({ success: false, message: 'بيانات الإعدادات غير صحيحة' });
            }

            const normalizedPhones = Array.isArray(body.phones)
                ? body.phones.map((p) => String(p || '').trim()).filter(Boolean)
                : DEFAULT_SITE_TEAM_SETTINGS.phones;

            const newSettings: SiteTeamSettings = {
                ...DEFAULT_SITE_TEAM_SETTINGS,
                ...body,
                userId: DEFAULT_SITE_TEAM_SETTINGS.userId,
                teamName: body.teamName || DEFAULT_SITE_TEAM_SETTINGS.teamName,
                phones: normalizedPhones,
                whatsappPhone: String(body.whatsappPhone || '').trim(),
                enabled: Boolean(body.enabled),
                allowCalls: body.allowCalls === undefined ? DEFAULT_SITE_TEAM_SETTINGS.allowCalls : Boolean(body.allowCalls),
                allowMessages:
                    body.allowMessages === undefined ? DEFAULT_SITE_TEAM_SETTINGS.allowMessages : Boolean(body.allowMessages),
            };

            await ensureSiteTeamUser(newSettings);

            await prisma.system_settings.upsert({
                where: { key: 'site_team' },
                create: { key: 'site_team', value: JSON.stringify(newSettings) },
                update: { value: JSON.stringify(newSettings), updated_by: auth?.adminId },
            });

            return res.status(200).json({
                success: true,
                message: 'تم حفظ إعدادات فريق الموقع',
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
