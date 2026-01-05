/**
 * API عام لجلب إعدادات الموقع
 * يستخدم من قبل صفحات الموقع لمعرفة العناصر المخفية والظاهرة
 */

import { NextApiRequest, NextApiResponse } from 'next';

import prisma from '../../lib/prisma';

// Prisma client singleton

// البيانات الافتراضية للأقسام
const DEFAULT_SECTIONS: Record<string, { status: string; showInNavbar: boolean; }> = {
    'register': { status: 'ACTIVE', showInNavbar: false },
    'login': { status: 'ACTIVE', showInNavbar: false },
    'forgot-password': { status: 'ACTIVE', showInNavbar: false },
    'popups': { status: 'ACTIVE', showInNavbar: false },
};

// العناصر الافتراضية
const DEFAULT_ELEMENTS: Record<string, boolean> = {
    'register_account_personal': true,
    'register_account_company': true,
    'register_account_showroom': true,
    'register_account_transport': true,
    'register_social_google': true,
    'login_social_google': true,
    'login_remember_me': true,
    'login_forgot_password_link': true,
    'forgot_email_method': true,
    'forgot_phone_method': true,
    'popup_welcome': true,
    'popup_newsletter': true,
    'popup_cookies': true,
    'popup_app_download': true,
};

export interface SiteSettings {
    sections: Record<string, { status: string; enabled: boolean; }>;
    elements: Record<string, boolean>;
}

type ApiResponse = NextApiResponse & {
    status: (statusCode: number) => ApiResponse;
    json: (body: any) => ApiResponse;
};

export default async function handler(
    req: NextApiRequest,
    res: ApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // جلب الأقسام من قاعدة البيانات
        const sections: Record<string, { status: string; enabled: boolean; }> = {};
        const elements: Record<string, boolean> = { ...DEFAULT_ELEMENTS };

        try {
            const dbSections = await prisma.site_sections.findMany({
                where: {
                    slug: { in: ['register', 'login', 'forgot-password', 'popups'] }
                },
                select: {
                    slug: true,
                    status: true,
                }
            });

            // دمج الأقسام من قاعدة البيانات مع الافتراضية
            for (const slug of Object.keys(DEFAULT_SECTIONS)) {
                const dbSection = dbSections.find(s => s.slug === slug);
                sections[slug] = {
                    status: dbSection?.status || DEFAULT_SECTIONS[slug].status,
                    enabled: (dbSection?.status || DEFAULT_SECTIONS[slug].status) === 'ACTIVE',
                };
            }

            // جلب العناصر من قاعدة البيانات
            const dbElements = await prisma.site_elements.findMany({
                where: {
                    key: { in: Object.keys(DEFAULT_ELEMENTS) }
                },
                select: {
                    key: true,
                    isVisible: true,
                }
            });

            // تحديث العناصر من قاعدة البيانات
            for (const element of dbElements) {
                elements[element.key] = element.isVisible;
            }
        } catch (dbError) {
            console.warn('Database tables not found, using defaults:', dbError);
            // استخدام القيم الافتراضية
            for (const [slug, defaults] of Object.entries(DEFAULT_SECTIONS)) {
                sections[slug] = {
                    status: defaults.status,
                    enabled: defaults.status === 'ACTIVE',
                };
            }
        }

        // تخزين مؤقت للاستجابة
        res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

        return res.status(200).json({ sections, elements });
    } catch (error) {
        console.error('Error fetching site settings:', error);

        // إرجاع القيم الافتراضية في حالة الخطأ
        const sections: Record<string, { status: string; enabled: boolean; }> = {};
        for (const [slug, defaults] of Object.entries(DEFAULT_SECTIONS)) {
            sections[slug] = {
                status: defaults.status,
                enabled: defaults.status === 'ACTIVE',
            };
        }

        return res.status(200).json({
            sections,
            elements: DEFAULT_ELEMENTS,
        });
    }
}
