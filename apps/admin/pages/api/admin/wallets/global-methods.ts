/**
 * API إدارة وسائل الدفع العالمية - متكامل مع قاعدة البيانات
 * Global Payment Methods Management API - Database Integrated
 */
import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';
const JWT_SECRET = process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';

// التحقق من صلاحيات المدير
function getAdminFromToken(req: NextApiRequest): { adminId: string; role: string; } | null {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
        ? authHeader.substring(7)
        : req.cookies.admin_session || req.cookies['admin-session'];

    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload & { adminId?: string; userId?: string; role?: string; };
        const adminId = decoded.adminId || decoded.userId;
        if (!adminId) return null;
        return { adminId, role: decoded.role || 'ADMIN' };
    } catch {
        return null;
    }
}

// البيانات الافتراضية لوسائل الدفع العالمية
const DEFAULT_GLOBAL_METHODS = [
    {
        id: 'paypal',
        name: 'PayPal',
        nameEn: 'PayPal',
        nameAr: 'باي بال',
        type: 'INTERNATIONAL_WALLET',
        category: 'wallet',
        icon: 'paypal',
        description: 'استقبال المدفوعات العالمية عبر PayPal',
        isActive: true,
        isPopular: true,
        minAmount: 5,
        maxAmount: 10000,
        percentageFee: 3.4,
        fixedFee: 0.3,
        processingTime: 'فوري - 24 ساعة',
        metadata: {
            provider: 'PayPal',
            testMode: true,
            supportedCurrencies: ['USD', 'EUR', 'GBP'],
            status: 'disconnected',
            apiClientId: '',
            apiSecret: '',
            webhookUrl: '/api/webhooks/paypal',
        },
    },
    {
        id: 'wise',
        name: 'Wise',
        nameEn: 'Wise',
        nameAr: 'وايز',
        type: 'INTERNATIONAL_WALLET',
        category: 'transfer',
        icon: 'wise',
        description: 'تحويلات مصرفية دولية بأسعار صرف حقيقية',
        isActive: true,
        isPopular: true,
        minAmount: 10,
        maxAmount: 50000,
        percentageFee: 0.5,
        fixedFee: 1,
        processingTime: '1-3 أيام عمل',
        metadata: {
            provider: 'Wise',
            testMode: true,
            supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD'],
            status: 'disconnected',
            apiKey: '',
            profileId: '',
        },
    },
    {
        id: 'payoneer',
        name: 'Payoneer',
        nameEn: 'Payoneer',
        nameAr: 'بايونير',
        type: 'INTERNATIONAL_WALLET',
        category: 'wallet',
        icon: 'payoneer',
        description: 'استقبال المدفوعات من الشركات والأفراد',
        isActive: true,
        isPopular: false,
        minAmount: 20,
        maxAmount: 10000,
        percentageFee: 2,
        fixedFee: 0,
        processingTime: '1-2 يوم عمل',
        metadata: {
            provider: 'Payoneer',
            testMode: true,
            supportedCurrencies: ['USD', 'EUR'],
            status: 'disconnected',
        },
    },
    {
        id: 'stripe',
        name: 'Stripe',
        nameEn: 'Stripe',
        nameAr: 'سترايب',
        type: 'INTERNATIONAL_WALLET',
        category: 'card',
        icon: 'stripe',
        description: 'بوابة دفع شاملة للبطاقات والمحافظ',
        isActive: false,
        isPopular: true,
        minAmount: 1,
        maxAmount: 100000,
        percentageFee: 2.9,
        fixedFee: 0.3,
        processingTime: 'فوري',
        metadata: {
            provider: 'Stripe',
            testMode: true,
            supportedCurrencies: ['USD', 'EUR', 'GBP'],
            status: 'disconnected',
            publishableKey: '',
            secretKey: '',
            webhookSecret: '',
        },
    },
    {
        id: 'skrill',
        name: 'Skrill',
        nameEn: 'Skrill',
        nameAr: 'سكريل',
        type: 'INTERNATIONAL_WALLET',
        category: 'wallet',
        icon: 'skrill',
        description: 'محفظة إلكترونية عالمية',
        isActive: false,
        isPopular: false,
        minAmount: 10,
        maxAmount: 5000,
        percentageFee: 1.9,
        fixedFee: 0,
        processingTime: 'فوري - 1 ساعة',
        metadata: {
            provider: 'Skrill',
            testMode: true,
            supportedCurrencies: ['USD', 'EUR'],
            status: 'disconnected',
        },
    },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const admin = getAdminFromToken(req);

    // في بيئة التطوير، السماح بالـ GET بدون مصادقة
    if (!admin && !(process.env.NODE_ENV !== 'production' && req.method === 'GET')) {
        return res.status(401).json({ success: false, message: 'غير مصرح - يرجى تسجيل الدخول' });
    }

    try {
        switch (req.method) {
            case 'GET':
                return await handleGetMethods(req, res);
            case 'POST':
                return await handleCreateMethod(req, res);
            case 'PUT':
                return await handleUpdateMethod(req, res);
            case 'DELETE':
                return await handleDeleteMethod(req, res);
            default:
                return res.status(405).json({ success: false, message: 'طريقة غير مدعومة' });
        }
    } catch (error) {
        console.error('[GLOBAL METHODS API] خطأ:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
}

// جلب وسائل الدفع العالمية
async function handleGetMethods(req: NextApiRequest, res: NextApiResponse) {
    const { active, provider, category } = req.query;

    try {
        // محاولة جلب من قاعدة البيانات
        const dbMethods = await prisma.payment_method_configs.findMany({
            where: {
                type: 'INTERNATIONAL_WALLET' as any,
                ...(category ? { category: category as string } : {}),
                ...(active === 'true' ? { isActive: true } : {}),
            },
            orderBy: [{ isPopular: 'desc' }, { createdAt: 'asc' }],
        });

        if (dbMethods.length > 0) {
            let filtered = dbMethods;
            if (provider) {
                filtered = filtered.filter((m: any) => m.metadata?.provider === provider);
            }

            const stats = {
                total: filtered.length,
                active: filtered.filter(m => m.isActive).length,
                connected: filtered.filter((m: any) => m.metadata?.status === 'connected').length,
            };

            return res.status(200).json({ success: true, methods: filtered, stats });
        }
    } catch (error) {
        console.error('[GLOBAL METHODS] خطأ في الجلب من DB:', error);
    }

    // استخدام البيانات الافتراضية
    let methods = [...DEFAULT_GLOBAL_METHODS];
    if (active === 'true') {
        methods = methods.filter(m => m.isActive);
    }
    if (provider) {
        methods = methods.filter(m => m.metadata.provider === provider);
    }
    if (category) {
        methods = methods.filter(m => m.category === category);
    }

    return res.status(200).json({
        success: true,
        methods,
        stats: {
            total: DEFAULT_GLOBAL_METHODS.length,
            active: DEFAULT_GLOBAL_METHODS.filter(m => m.isActive).length,
            connected: DEFAULT_GLOBAL_METHODS.filter(m => m.metadata.status === 'connected').length,
        },
    });
}

// إنشاء وسيلة دفع جديدة
async function handleCreateMethod(req: NextApiRequest, res: NextApiResponse) {
    const data = req.body;

    if (!data.name || !data.category) {
        return res.status(400).json({ success: false, message: 'البيانات غير مكتملة' });
    }

    try {
        const method = await prisma.payment_method_configs.create({
            data: {
                id: `global-${Date.now()}`,
                name: data.name,
                nameEn: data.nameEn || data.name,
                nameAr: data.nameAr || data.name,
                type: 'INTERNATIONAL_WALLET' as any,
                category: data.category,
                icon: data.icon,
                description: data.description,
                isActive: data.isActive ?? false,
                isPopular: data.isPopular ?? false,
                minAmount: data.minAmount || 0,
                maxAmount: data.maxAmount,
                percentageFee: data.percentageFee || 0,
                fixedFee: data.fixedFee || 0,
                processingTime: data.processingTime,
                supportedCurrencies: data.supportedCurrencies?.join(','),
                metadata: {
                    provider: data.provider || data.name,
                    testMode: data.testMode ?? true,
                    supportedCurrencies: data.supportedCurrencies || [],
                    status: 'disconnected',
                    ...data.apiCredentials,
                },
                updatedAt: new Date(),
            },
        });

        console.log('[GLOBAL METHOD CREATED]:', method.nameAr);
        return res.status(201).json({ success: true, message: 'تم الإنشاء بنجاح', method });
    } catch (error) {
        console.error('[GLOBAL METHODS] خطأ في الإنشاء:', error);
        return res.status(500).json({ success: false, message: 'خطأ في إنشاء وسيلة الدفع' });
    }
}

// تحديث وسيلة دفع
async function handleUpdateMethod(req: NextApiRequest, res: NextApiResponse) {
    const { id, ...data } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'معرف الوسيلة مطلوب' });
    }

    try {
        // جلب البيانات الحالية
        const existing = await prisma.payment_method_configs.findUnique({ where: { id } });
        const currentMetadata = (existing?.metadata as any) || {};

        const method = await prisma.payment_method_configs.update({
            where: { id },
            data: {
                ...(data.name && { name: data.name }),
                ...(data.nameAr && { nameAr: data.nameAr }),
                ...(data.nameEn && { nameEn: data.nameEn }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.isPopular !== undefined && { isPopular: data.isPopular }),
                ...(data.minAmount !== undefined && { minAmount: data.minAmount }),
                ...(data.maxAmount !== undefined && { maxAmount: data.maxAmount }),
                ...(data.percentageFee !== undefined && { percentageFee: data.percentageFee }),
                ...(data.fixedFee !== undefined && { fixedFee: data.fixedFee }),
                ...(data.processingTime !== undefined && { processingTime: data.processingTime }),
                ...(data.metadata && { metadata: { ...currentMetadata, ...data.metadata } }),
                ...(data.apiCredentials && {
                    metadata: { ...currentMetadata, ...data.apiCredentials },
                }),
                ...(data.status && {
                    metadata: { ...currentMetadata, status: data.status },
                }),
                updatedAt: new Date(),
            },
        });

        console.log('[GLOBAL METHOD UPDATED]:', method.id);
        return res.status(200).json({ success: true, message: 'تم التحديث بنجاح', method });
    } catch (error) {
        console.error('[GLOBAL METHODS] خطأ في التحديث:', error);
        return res.status(500).json({ success: false, message: 'خطأ في تحديث وسيلة الدفع' });
    }
}

// حذف وسيلة دفع
async function handleDeleteMethod(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, message: 'معرف الوسيلة مطلوب' });
    }

    try {
        await prisma.payment_method_configs.delete({ where: { id: id as string } });
        console.log('[GLOBAL METHOD DELETED]:', id);
        return res.status(200).json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (error) {
        console.error('[GLOBAL METHODS] خطأ في الحذف:', error);
        return res.status(500).json({ success: false, message: 'خطأ في حذف وسيلة الدفع' });
    }
}

// اختبار اتصال وسيلة الدفع
export async function testConnection(methodId: string): Promise<{ success: boolean; latency?: number; error?: string; }> {
    // محاكاة اختبار الاتصال
    const startTime = Date.now();

    try {
        // في الإنتاج، هنا يتم الاتصال الفعلي بـ API
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));

        const latency = Date.now() - startTime;
        const success = Math.random() > 0.2; // 80% نجاح

        if (success) {
            return { success: true, latency };
        } else {
            return { success: false, error: 'فشل في الاتصال بالخادم' };
        }
    } catch (error) {
        return { success: false, error: 'خطأ في الاتصال' };
    }
}
