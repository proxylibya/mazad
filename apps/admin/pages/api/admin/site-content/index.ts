/**
 * API إدارة محتوى الموقع - لوحة التحكم
 * GET - جلب جميع الأقسام والعناصر
 * POST - إنشاء قسم جديد
 * PUT - تحديث قسم
 * DELETE - حذف قسم
 */

import { verify } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

// Prisma client singleton

// يجب أن يتطابق مع المفتاح المستخدم في login.ts
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';

// التحقق من المصادقة الإدارية
async function verifyAdmin(req: NextApiRequest): Promise<{ success: boolean; adminId?: string; error?: string; }> {
    try {
        // جلب token من cookies مختلفة (للتوافق)
        const token = req.cookies['admin-session'] ||
            req.cookies['admin_session'] ||
            req.cookies['admin_token'];

        if (!token) {
            return { success: false, error: 'غير مصرح - سجل الدخول' };
        }

        const decoded = verify(token, JWT_SECRET) as { adminId: string; type?: string; };
        return { success: true, adminId: decoded.adminId };
    } catch {
        return { success: false, error: 'جلسة منتهية - سجل الدخول مجدداً' };
    }
}

// البيانات الافتراضية للأقسام
const DEFAULT_SECTIONS = [
    {
        id: 'default-1',
        slug: 'auctions',
        name: 'سوق المزاد',
        description: 'مزادات السيارات المباشرة',
        icon: 'ScaleIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: true,
        showInMobileMenu: true,
        showInFooter: true,
        showInHomepage: true,
        showHomeButton: true,
        showHomeCard: true,
        navbarOrder: 1,
        footerOrder: 1,
        homepageOrder: 1,
        pageUrl: '/auctions',
        primaryColor: '#f59e0b',
        secondaryColor: '#d97706',
    },
    {
        id: 'default-2',
        slug: 'marketplace',
        name: 'السوق الفوري',
        description: 'بيع وشراء السيارات مباشرة',
        icon: 'ShoppingBagIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: true,
        showInMobileMenu: true,
        showInFooter: true,
        showInHomepage: true,
        showHomeButton: true,
        showHomeCard: true,
        navbarOrder: 2,
        footerOrder: 2,
        homepageOrder: 2,
        pageUrl: '/marketplace',
        primaryColor: '#3b82f6',
        secondaryColor: '#2563eb',
    },
    {
        id: 'default-3',
        slug: 'yards',
        name: 'الساحات',
        description: 'ساحات عرض السيارات',
        icon: 'MapPinIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: true,
        showInMobileMenu: true,
        showInFooter: true,
        showInHomepage: true,
        showHomeButton: true,
        showHomeCard: true,
        navbarOrder: 3,
        footerOrder: 3,
        homepageOrder: 3,
        pageUrl: '/yards',
        primaryColor: '#10b981',
        secondaryColor: '#059669',
    },
    {
        id: 'default-4',
        slug: 'showrooms',
        name: 'المعارض',
        description: 'معارض السيارات',
        icon: 'BuildingStorefrontIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: true,
        showInMobileMenu: true,
        showInFooter: true,
        showInHomepage: true,
        showHomeButton: true,
        showHomeCard: true,
        navbarOrder: 4,
        footerOrder: 4,
        homepageOrder: 4,
        pageUrl: '/showrooms',
        primaryColor: '#14b8a6',
        secondaryColor: '#0d9488',
    },
    {
        id: 'default-5',
        slug: 'transport',
        name: 'خدمات النقل',
        description: 'خدمات نقل السيارات',
        icon: 'TruckIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: true,
        showInMobileMenu: true,
        showInFooter: true,
        showInHomepage: true,
        showHomeButton: true,
        showHomeCard: true,
        navbarOrder: 5,
        footerOrder: 5,
        homepageOrder: 5,
        pageUrl: '/transport',
        primaryColor: '#f97316',
        secondaryColor: '#ea580c',
    },
    {
        id: 'default-6',
        slug: 'companies',
        name: 'الشركات',
        description: 'شركات السيارات',
        icon: 'BuildingOfficeIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: false,
        showInMobileMenu: false,
        showInFooter: false,
        showInHomepage: false,
        showHomeButton: false,
        showHomeCard: false,
        navbarOrder: 6,
        footerOrder: 6,
        homepageOrder: 6,
        pageUrl: '/companies',
        primaryColor: '#8b5cf6',
        secondaryColor: '#7c3aed',
    },
    {
        id: 'default-7',
        slug: 'premium-cars',
        name: 'السيارات المميزة',
        description: 'سيارات VIP',
        icon: 'SparklesIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: false,
        showInMobileMenu: false,
        showInFooter: false,
        showInHomepage: false,
        showHomeButton: false,
        showHomeCard: false,
        navbarOrder: 7,
        footerOrder: 7,
        homepageOrder: 7,
        pageUrl: '/premium-cars',
        primaryColor: '#eab308',
        secondaryColor: '#ca8a04',
    },
    {
        id: 'default-8',
        slug: 'register',
        name: 'إنشاء حساب',
        description: 'صفحة تسجيل حساب جديد وخيارات التسجيل',
        icon: 'UserPlusIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: false,
        showInMobileMenu: false,
        showInFooter: false,
        showInHomepage: false,
        showHomeButton: false,
        showHomeCard: false,
        navbarOrder: 8,
        footerOrder: 8,
        homepageOrder: 8,
        pageUrl: '/register',
        primaryColor: '#3b82f6',
        secondaryColor: '#2563eb',
    },
    {
        id: 'default-9',
        slug: 'login',
        name: 'تسجيل الدخول',
        description: 'صفحة الدخول للنظام',
        icon: 'ArrowRightOnRectangleIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: false,
        showInMobileMenu: false,
        showInFooter: false,
        showInHomepage: false,
        showHomeButton: false,
        showHomeCard: false,
        navbarOrder: 9,
        footerOrder: 9,
        homepageOrder: 9,
        pageUrl: '/login',
        primaryColor: '#6366f1',
        secondaryColor: '#4f46e5',
    },
    {
        id: 'default-10',
        slug: 'forgot-password',
        name: 'نسيت كلمة المرور',
        description: 'صفحة استعادة كلمة المرور',
        icon: 'KeyIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: false,
        showInMobileMenu: false,
        showInFooter: false,
        showInHomepage: false,
        showHomeButton: false,
        showHomeCard: false,
        navbarOrder: 10,
        footerOrder: 10,
        homepageOrder: 10,
        pageUrl: '/forgot-password',
        primaryColor: '#ef4444',
        secondaryColor: '#dc2626',
    },
    {
        id: 'default-11',
        slug: 'popups',
        name: 'القوائم المنبثقة',
        description: 'التحكم في النوافذ المنبثقة والإشعارات',
        icon: 'WindowIcon',
        status: 'ACTIVE',
        message: null,
        showInNavbar: false,
        showInMobileMenu: false,
        showInFooter: false,
        showInHomepage: false,
        showHomeButton: false,
        showHomeCard: false,
        navbarOrder: 11,
        footerOrder: 11,
        homepageOrder: 11,
        pageUrl: '#',
        primaryColor: '#8b5cf6',
        secondaryColor: '#7c3aed',
    },
];

// العناصر الافتراضية
const DEFAULT_ELEMENTS = [
    // عناصر صفحة التسجيل
    { key: 'register_account_personal', name: 'حساب شخصي', sectionSlug: 'register', pageType: 'register', elementType: 'option', category: 'account_type', isVisible: true },
    { key: 'register_account_company', name: 'حساب شركة', sectionSlug: 'register', pageType: 'register', elementType: 'option', category: 'account_type', isVisible: true },
    { key: 'register_account_showroom', name: 'حساب معرض', sectionSlug: 'register', pageType: 'register', elementType: 'option', category: 'account_type', isVisible: true },
    { key: 'register_account_transport', name: 'حساب نقل', sectionSlug: 'register', pageType: 'register', elementType: 'option', category: 'account_type', isVisible: true },
    { key: 'register_social_google', name: 'تسجيل عبر جوجل', sectionSlug: 'register', pageType: 'register', elementType: 'button', category: 'social_login', isVisible: true },

    // عناصر صفحة الدخول
    { key: 'login_social_google', name: 'دخول عبر جوجل', sectionSlug: 'login', pageType: 'login', elementType: 'button', category: 'social_login', isVisible: true },
    { key: 'login_remember_me', name: 'تذكرني', sectionSlug: 'login', pageType: 'login', elementType: 'checkbox', category: 'options', isVisible: true },
    { key: 'login_forgot_password_link', name: 'رابط نسيت كلمة المرور', sectionSlug: 'login', pageType: 'login', elementType: 'link', category: 'options', isVisible: true },

    // عناصر صفحة نسيت كلمة المرور
    { key: 'forgot_email_method', name: 'استعادة عبر البريد', sectionSlug: 'forgot-password', pageType: 'forgot-password', elementType: 'option', category: 'recovery_method', isVisible: true },
    { key: 'forgot_phone_method', name: 'استعادة عبر الهاتف', sectionSlug: 'forgot-password', pageType: 'forgot-password', elementType: 'option', category: 'recovery_method', isVisible: true },

    // عناصر القوائم المنبثقة
    { key: 'popup_welcome', name: 'نافذة الترحيب', sectionSlug: 'popups', pageType: 'global', elementType: 'popup', category: 'marketing', isVisible: true },
    { key: 'popup_newsletter', name: 'اشتراك النشرة البريدية', sectionSlug: 'popups', pageType: 'global', elementType: 'popup', category: 'marketing', isVisible: true },
    { key: 'popup_cookies', name: 'إشعار الكوكيز', sectionSlug: 'popups', pageType: 'global', elementType: 'popup', category: 'legal', isVisible: true },
    { key: 'popup_app_download', name: 'تحميل التطبيق', sectionSlug: 'popups', pageType: 'global', elementType: 'popup', category: 'marketing', isVisible: true },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // التحقق من المصادقة
    const auth = await verifyAdmin(req);
    if (!auth.success) {
        return res.status(401).json({ success: false, error: auth.error });
    }

    try {
        switch (req.method) {
            case 'GET':
                return await handleGet(res);
            case 'POST':
                return await handlePost(req, res, auth.adminId!);
            case 'PUT':
                return await handlePut(req, res, auth.adminId!);
            case 'DELETE':
                return await handleDelete(req, res);
            default:
                return res.status(405).json({ error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('خطأ في API إدارة المحتوى:', error);
        return res.status(500).json({ success: false, error: 'خطأ في الخادم' });
    }
}

// جلب جميع الأقسام
async function handleGet(res: NextApiResponse) {
    try {
        let sections = [];
        let dbElements = [];

        try {
            sections = await prisma.site_sections.findMany({
                orderBy: { navbarOrder: 'asc' },
                include: { elements: true },
            });

            dbElements = await prisma.site_elements.findMany({
                orderBy: { displayOrder: 'asc' },
            });
        } catch {
            console.warn('جدول site_sections غير موجود، استخدام البيانات الافتراضية');
        }

        // دمج الأقسام الافتراضية مع الموجودة في قاعدة البيانات
        if (sections.length === 0) {
            sections = DEFAULT_SECTIONS as any;
        } else {
            // التأكد من وجود الأقسام الافتراضية الجديدة
            const existingSlugs = new Set(sections.map((s: any) => s.slug));
            const missingDefaults = DEFAULT_SECTIONS.filter(ds => !existingSlugs.has(ds.slug));

            if (missingDefaults.length > 0) {
                // إضافة الأقسام المفقودة (بدون حفظها في قاعدة البيانات حتى يتم تعديلها)
                sections = [...sections, ...missingDefaults] as any;
            }
        }

        // دمج العناصر الافتراضية
        const existingElementKeys = new Set(dbElements.map(e => e.key));
        const missingDefaultElements = DEFAULT_ELEMENTS.filter(de => !existingElementKeys.has(de.key));

        // تحويل العناصر الافتراضية إلى شكل يطابق قاعدة البيانات (مع معرف مؤقت)
        const virtualElements = missingDefaultElements.map(de => ({
            ...de,
            id: `virtual-${de.key}`,
            displayOrder: 0,
            updatedAt: new Date(),
            createdAt: new Date(),
            updatedBy: null,
            sectionId: null, // سيتم ربطه عند الحفظ
            isInteractive: true
        }));

        const allElements = [...dbElements, ...virtualElements];

        return res.status(200).json({
            success: true,
            sections,
            elements: allElements,
            source: sections === DEFAULT_SECTIONS ? 'default' : 'database',
        });
    } catch (error) {
        console.error('Error in handleGet:', error);
        return res.status(200).json({
            success: true,
            sections: DEFAULT_SECTIONS,
            elements: DEFAULT_ELEMENTS.map(de => ({ ...de, id: `virtual-${de.key}` })),
            source: 'default',
        });
    }
}

// إنشاء قسم جديد
async function handlePost(req: NextApiRequest, res: NextApiResponse, adminId: string) {
    const data = req.body;

    if (!data.slug || !data.name || !data.pageUrl) {
        return res.status(400).json({ success: false, error: 'البيانات المطلوبة: slug, name, pageUrl' });
    }

    try {
        const section = await prisma.site_sections.create({
            data: {
                slug: data.slug,
                name: data.name,
                description: data.description,
                icon: data.icon,
                status: data.status || 'ACTIVE',
                message: data.message,
                showInNavbar: data.showInNavbar ?? true,
                showInMobileMenu: data.showInMobileMenu ?? true,
                showInFooter: data.showInFooter ?? true,
                showInHomepage: data.showInHomepage ?? true,
                showHomeButton: data.showHomeButton ?? true,
                showHomeCard: data.showHomeCard ?? true,
                navbarOrder: data.navbarOrder ?? 0,
                footerOrder: data.footerOrder ?? 0,
                homepageOrder: data.homepageOrder ?? 0,
                pageUrl: data.pageUrl,
                primaryColor: data.primaryColor,
                secondaryColor: data.secondaryColor,
                updatedBy: adminId,
            },
        });

        return res.status(201).json({ success: true, section });
    } catch (error: any) {
        if (error.code === 'P2002') {
            return res.status(400).json({ success: false, error: 'هذا الـ slug موجود مسبقاً' });
        }
        throw error;
    }
}

// تحديث قسم أو عنصر
async function handlePut(req: NextApiRequest, res: NextApiResponse, adminId: string) {
    const { type, ...data } = req.body;

    // إذا كان التحديث لعنصر
    if (type === 'element') {
        return handleUpdateElement(req, res, adminId);
    }

    // تحديث قسم (المنطق السابق)
    const { id, slug, ...sectionData } = data;

    // ... (rest of handlePut logic for section)
    if (!id && !slug) {
        return res.status(400).json({ success: false, error: 'معرف القسم أو الـ slug مطلوب' });
    }

    try {
        // إذا كان ID يبدأ بـ default- فهذا قسم افتراضي، نستخدم upsert
        const isDefaultSection = id?.startsWith('default-');

        if (isDefaultSection && slug) {
            // إنشاء أو تحديث القسم باستخدام slug كمعرف فريد
            const section = await prisma.site_sections.upsert({
                where: { slug },
                update: {
                    name: sectionData.name,
                    description: sectionData.description,
                    icon: sectionData.icon,
                    status: sectionData.status,
                    message: sectionData.message,
                    showInNavbar: sectionData.showInNavbar,
                    showInMobileMenu: sectionData.showInMobileMenu,
                    showInFooter: sectionData.showInFooter,
                    showInHomepage: sectionData.showInHomepage,
                    showHomeButton: sectionData.showHomeButton,
                    showHomeCard: sectionData.showHomeCard,
                    navbarOrder: sectionData.navbarOrder,
                    footerOrder: sectionData.footerOrder,
                    homepageOrder: sectionData.homepageOrder,
                    pageUrl: sectionData.pageUrl,
                    primaryColor: sectionData.primaryColor,
                    secondaryColor: sectionData.secondaryColor,
                    updatedBy: adminId,
                    updatedAt: new Date(),
                },
                create: {
                    slug,
                    name: sectionData.name,
                    description: sectionData.description,
                    icon: sectionData.icon,
                    status: sectionData.status || 'ACTIVE',
                    message: sectionData.message,
                    showInNavbar: sectionData.showInNavbar ?? true,
                    showInMobileMenu: sectionData.showInMobileMenu ?? true,
                    showInFooter: sectionData.showInFooter ?? true,
                    showInHomepage: sectionData.showInHomepage ?? true,
                    showHomeButton: sectionData.showHomeButton ?? true,
                    showHomeCard: sectionData.showHomeCard ?? true,
                    navbarOrder: sectionData.navbarOrder ?? 0,
                    footerOrder: sectionData.footerOrder ?? 0,
                    homepageOrder: sectionData.homepageOrder ?? 0,
                    pageUrl: sectionData.pageUrl,
                    primaryColor: sectionData.primaryColor,
                    secondaryColor: sectionData.secondaryColor,
                    updatedBy: adminId,
                },
            });

            return res.status(200).json({ success: true, section });
        }

        // تحديث عادي للأقسام الموجودة
        const section = await prisma.site_sections.update({
            where: { id },
            data: {
                name: sectionData.name,
                description: sectionData.description,
                icon: sectionData.icon,
                status: sectionData.status,
                message: sectionData.message,
                showInNavbar: sectionData.showInNavbar,
                showInMobileMenu: sectionData.showInMobileMenu,
                showInFooter: sectionData.showInFooter,
                showInHomepage: sectionData.showInHomepage,
                showHomeButton: sectionData.showHomeButton,
                showHomeCard: sectionData.showHomeCard,
                navbarOrder: sectionData.navbarOrder,
                footerOrder: sectionData.footerOrder,
                homepageOrder: sectionData.homepageOrder,
                pageUrl: sectionData.pageUrl,
                primaryColor: sectionData.primaryColor,
                secondaryColor: sectionData.secondaryColor,
                updatedBy: adminId,
                updatedAt: new Date(),
            },
        });

        return res.status(200).json({ success: true, section });
    } catch (error: any) {
        console.error('خطأ في تحديث القسم:', error);
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, error: 'القسم غير موجود' });
        }
        throw error;
    }
}

// تحديث عنصر (أو إنشاؤه إذا لم يكن موجوداً)
async function handleUpdateElement(req: NextApiRequest, res: NextApiResponse, adminId: string) {
    const { key, sectionSlug, ...data } = req.body;

    if (!key) {
        return res.status(400).json({ success: false, error: 'مفتاح العنصر مطلوب' });
    }

    try {
        // البحث عن القسم المرتبط لربط العنصر به
        let sectionId = null;
        if (sectionSlug) {
            const section = await prisma.site_sections.findUnique({
                where: { slug: sectionSlug },
                select: { id: true }
            });

            // إذا لم يكن القسم موجوداً، نقوم بإنشائه من الإعدادات الافتراضية
            if (!section) {
                const defaultSection = DEFAULT_SECTIONS.find(s => s.slug === sectionSlug);
                if (defaultSection) {
                    const newSection = await prisma.site_sections.create({
                        data: {
                            slug: defaultSection.slug,
                            name: defaultSection.name,
                            description: defaultSection.description,
                            icon: defaultSection.icon,
                            status: defaultSection.status as any,
                            pageUrl: defaultSection.pageUrl,
                            primaryColor: defaultSection.primaryColor,
                            secondaryColor: defaultSection.secondaryColor,
                            updatedBy: adminId
                        }
                    });
                    sectionId = newSection.id;
                }
            } else {
                sectionId = section.id;
            }
        }

        // تحديث أو إنشاء العنصر
        const element = await prisma.site_elements.upsert({
            where: { key },
            update: {
                isVisible: data.isVisible,
                name: data.name,
                updatedBy: adminId,
                updatedAt: new Date(),
                sectionId: sectionId // تحديث الربط إذا وجد
            },
            create: {
                key,
                name: data.name || key,
                pageType: data.pageType || 'global',
                elementType: data.elementType || 'option',
                category: data.category,
                isVisible: data.isVisible ?? true,
                sectionId: sectionId,
                updatedBy: adminId,
            }
        });

        return res.status(200).json({ success: true, element });
    } catch (error) {
        console.error('خطأ في تحديث العنصر:', error);
        return res.status(500).json({ success: false, error: 'فشل تحديث العنصر' });
    }
}

// حذف قسم
async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, error: 'معرف القسم مطلوب' });
    }

    try {
        await prisma.site_sections.delete({
            where: { id },
        });

        return res.status(200).json({ success: true, message: 'تم حذف القسم بنجاح' });
    } catch (error: any) {
        if (error.code === 'P2025') {
            return res.status(404).json({ success: false, error: 'القسم غير موجود' });
        }
        throw error;
    }
}
