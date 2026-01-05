/**
 * API إدارة وسائل الدفع المحلية - متكامل مع قاعدة البيانات
 * Local Payment Methods Management API - Database Integrated
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

// البيانات الافتراضية لوسائل الدفع المحلية
const DEFAULT_LOCAL_METHODS = [
    {
        id: 'bank-jumhuriya',
        name: 'Jumhuriya Bank',
        nameEn: 'Jumhuriya Bank',
        nameAr: 'مصرف الجمهورية',
        type: 'LOCAL',
        category: 'bank',
        icon: 'bank',
        description: 'تحويل بنكي عبر مصرف الجمهورية',
        isActive: true,
        isPopular: true,
        minAmount: 50,
        maxAmount: 50000,
        dailyLimit: 100000,
        monthlyLimit: 500000,
        percentageFee: 0,
        fixedFee: 5,
        processingTime: '1-3 أيام عمل',
        metadata: {
            bankCode: 'JMB',
            accountNumber: '',
            iban: '',
            swiftCode: 'JMBKLYTT',
            branches: ['طرابلس', 'بنغازي', 'مصراتة'],
        },
    },
    {
        id: 'bank-wahda',
        name: 'Wahda Bank',
        nameEn: 'Wahda Bank',
        nameAr: 'مصرف الوحدة',
        type: 'LOCAL',
        category: 'bank',
        icon: 'bank',
        description: 'تحويل بنكي عبر مصرف الوحدة',
        isActive: true,
        isPopular: false,
        minAmount: 50,
        maxAmount: 50000,
        dailyLimit: 100000,
        monthlyLimit: 500000,
        percentageFee: 0,
        fixedFee: 5,
        processingTime: '1-3 أيام عمل',
        metadata: { bankCode: 'WHD', swiftCode: 'WHDALYTT' },
    },
    {
        id: 'card-libyana',
        name: 'Libyana Cards',
        nameEn: 'Libyana Cards',
        nameAr: 'كروت ليبيانا',
        type: 'LOCAL',
        category: 'card',
        icon: 'credit-card',
        description: 'إيداع فوري عبر كروت شحن ليبيانا',
        isActive: true,
        isPopular: true,
        minAmount: 10,
        maxAmount: 1000,
        dailyLimit: 5000,
        monthlyLimit: 20000,
        percentageFee: 3,
        fixedFee: 0,
        processingTime: 'فوري',
        metadata: { provider: 'Libyana', cardTypes: ['10', '20', '50', '100'] },
    },
    {
        id: 'card-madar',
        name: 'Madar Cards',
        nameEn: 'Madar Cards',
        nameAr: 'كروت مدار',
        type: 'LOCAL',
        category: 'card',
        icon: 'credit-card',
        description: 'إيداع فوري عبر كروت شحن مدار',
        isActive: true,
        isPopular: true,
        minAmount: 10,
        maxAmount: 1000,
        dailyLimit: 5000,
        monthlyLimit: 20000,
        percentageFee: 3,
        fixedFee: 0,
        processingTime: 'فوري',
        metadata: { provider: 'Madar', cardTypes: ['10', '20', '50', '100'] },
    },
    {
        id: 'mobile-sadad',
        name: 'Sadad',
        nameEn: 'Sadad',
        nameAr: 'سداد',
        type: 'LOCAL',
        category: 'mobile',
        icon: 'device-mobile',
        description: 'الدفع عبر تطبيق سداد الإلكتروني',
        isActive: true,
        isPopular: false,
        minAmount: 5,
        maxAmount: 10000,
        dailyLimit: 20000,
        monthlyLimit: 100000,
        percentageFee: 2,
        fixedFee: 0,
        processingTime: 'فوري - 30 دقيقة',
        metadata: { provider: 'Sadad', apiEndpoint: '' },
    },
    {
        id: 'mobile-moamalat',
        name: 'Moamalat',
        nameEn: 'Moamalat',
        nameAr: 'معاملات',
        type: 'LOCAL',
        category: 'mobile',
        icon: 'device-mobile',
        description: 'الدفع عبر تطبيق معاملات',
        isActive: true,
        isPopular: false,
        minAmount: 5,
        maxAmount: 5000,
        dailyLimit: 10000,
        monthlyLimit: 50000,
        percentageFee: 2.5,
        fixedFee: 0,
        processingTime: 'فوري - 1 ساعة',
        metadata: { provider: 'Moamalat' },
    },
    {
        id: 'pos-tadawul',
        name: 'Tadawul POS',
        nameEn: 'Tadawul POS',
        nameAr: 'تداول POS',
        type: 'LOCAL',
        category: 'pos',
        icon: 'device-tablet',
        description: 'نقاط البيع عبر شبكة تداول',
        isActive: false,
        isPopular: false,
        minAmount: 10,
        maxAmount: 10000,
        dailyLimit: 50000,
        monthlyLimit: 200000,
        percentageFee: 1.5,
        fixedFee: 0,
        processingTime: 'فوري',
        metadata: { provider: 'Tadawul', terminalId: '' },
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
        console.error('[LOCAL METHODS API] خطأ:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
}

// جلب وسائل الدفع المحلية
async function handleGetMethods(req: NextApiRequest, res: NextApiResponse) {
    const { type, active } = req.query;

    try {
        // أنواع الدفع المحلية
        const localTypes = ['LOCAL_CARD', 'BANK_TRANSFER', 'MOBILE_PAYMENT'];

        // محاولة جلب من قاعدة البيانات
        const dbMethods = await prisma.payment_method_configs.findMany({
            where: {
                type: { in: localTypes as any },
                ...(type && type !== 'all' ? { category: type as string } : {}),
                ...(active === 'true' ? { isActive: true } : {}),
            },
            orderBy: [{ isPopular: 'desc' }, { createdAt: 'asc' }],
        });

        if (dbMethods.length > 0) {
            const stats = {
                total: dbMethods.length,
                active: dbMethods.filter(m => m.isActive).length,
                bank: dbMethods.filter(m => m.category === 'bank').length,
                card: dbMethods.filter(m => m.category === 'card').length,
                mobile: dbMethods.filter(m => m.category === 'mobile').length,
                pos: dbMethods.filter(m => m.category === 'pos').length,
            };

            return res.status(200).json({ success: true, methods: dbMethods, stats });
        }
    } catch (error) {
        console.error('[LOCAL METHODS] خطأ في الجلب من DB:', error);
    }

    // استخدام البيانات الافتراضية
    let methods = [...DEFAULT_LOCAL_METHODS];
    if (type && type !== 'all') {
        methods = methods.filter(m => m.category === type);
    }
    if (active === 'true') {
        methods = methods.filter(m => m.isActive);
    }

    return res.status(200).json({
        success: true,
        methods,
        stats: {
            total: DEFAULT_LOCAL_METHODS.length,
            active: DEFAULT_LOCAL_METHODS.filter(m => m.isActive).length,
            bank: DEFAULT_LOCAL_METHODS.filter(m => m.category === 'bank').length,
            card: DEFAULT_LOCAL_METHODS.filter(m => m.category === 'card').length,
            mobile: DEFAULT_LOCAL_METHODS.filter(m => m.category === 'mobile').length,
            pos: DEFAULT_LOCAL_METHODS.filter(m => m.category === 'pos').length,
        },
    });
}

// إنشاء وسيلة دفع جديدة
async function handleCreateMethod(req: NextApiRequest, res: NextApiResponse) {
    const data = req.body;

    if (!data.name || !data.category) {
        return res.status(400).json({ success: false, message: 'البيانات غير مكتملة' });
    }

    // تحديد نوع الدفع بناءً على الفئة
    const typeMap: Record<string, string> = {
        bank: 'BANK_TRANSFER',
        card: 'LOCAL_CARD',
        mobile: 'MOBILE_PAYMENT',
        pos: 'LOCAL_CARD',
    };
    const paymentType = typeMap[data.category] || 'LOCAL_CARD';

    try {
        const method = await prisma.payment_method_configs.create({
            data: {
                id: `local-${Date.now()}`,
                name: data.name,
                nameEn: data.nameEn || data.name,
                nameAr: data.nameAr || data.name,
                type: paymentType as any,
                category: data.category,
                icon: data.icon,
                description: data.description,
                isActive: data.isActive ?? true,
                isPopular: data.isPopular ?? false,
                minAmount: data.minAmount || 0,
                maxAmount: data.maxAmount,
                dailyLimit: data.dailyLimit,
                monthlyLimit: data.monthlyLimit,
                percentageFee: data.percentageFee || 0,
                fixedFee: data.fixedFee || 0,
                processingTime: data.processingTime,
                metadata: data.metadata || {},
                updatedAt: new Date(),
            },
        });

        console.log('[LOCAL METHOD CREATED]:', method.nameAr);
        return res.status(201).json({ success: true, message: 'تم الإنشاء بنجاح', method });
    } catch (error) {
        console.error('[LOCAL METHODS] خطأ في الإنشاء:', error);
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
                ...(data.dailyLimit !== undefined && { dailyLimit: data.dailyLimit }),
                ...(data.monthlyLimit !== undefined && { monthlyLimit: data.monthlyLimit }),
                ...(data.percentageFee !== undefined && { percentageFee: data.percentageFee }),
                ...(data.fixedFee !== undefined && { fixedFee: data.fixedFee }),
                ...(data.processingTime !== undefined && { processingTime: data.processingTime }),
                ...(data.metadata && { metadata: data.metadata }),
                updatedAt: new Date(),
            },
        });

        console.log('[LOCAL METHOD UPDATED]:', method.id);
        return res.status(200).json({ success: true, message: 'تم التحديث بنجاح', method });
    } catch (error) {
        console.error('[LOCAL METHODS] خطأ في التحديث:', error);
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
        console.log('[LOCAL METHOD DELETED]:', id);
        return res.status(200).json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (error) {
        console.error('[LOCAL METHODS] خطأ في الحذف:', error);
        return res.status(500).json({ success: false, message: 'خطأ في حذف وسيلة الدفع' });
    }
}
