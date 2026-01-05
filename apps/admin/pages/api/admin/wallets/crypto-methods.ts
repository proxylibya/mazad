/**
 * API إدارة وسائل الدفع الرقمية (كريبتو) - متكامل مع قاعدة البيانات
 * Cryptocurrency Payment Methods Management API - Database Integrated
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

// البيانات الافتراضية للعملات الرقمية
const DEFAULT_CRYPTO_METHODS = [
    {
        id: 'usdt',
        name: 'Tether USDT',
        nameEn: 'Tether USDT',
        nameAr: 'تيثر USDT',
        type: 'CRYPTOCURRENCY',
        category: 'stablecoin',
        icon: 'usdt',
        description: 'العملة المستقرة الأكثر استخداماً - مرتبطة بالدولار 1:1',
        isActive: true,
        isPopular: true,
        minAmount: 10,
        maxAmount: 100000,
        percentageFee: 0,
        fixedFee: 1,
        processingTime: '5-30 دقيقة',
        metadata: {
            symbol: 'USDT',
            networks: [
                { id: 'trc20', name: 'TRON (TRC20)', nameAr: 'شبكة ترون', symbol: 'TRC20', avgFee: '$1-2', avgConfirmationTime: '3-5 دقائق', isActive: true },
                { id: 'bep20', name: 'BNB Chain (BEP20)', nameAr: 'شبكة بينانس', symbol: 'BEP20', avgFee: '$0.5-1', avgConfirmationTime: '5-15 دقيقة', isActive: true },
                { id: 'solana', name: 'Solana', nameAr: 'شبكة سولانا', symbol: 'SOL', avgFee: '$0.001', avgConfirmationTime: '1-2 دقيقة', isActive: true },
                { id: 'erc20', name: 'Ethereum (ERC20)', nameAr: 'شبكة إيثريوم', symbol: 'ERC20', avgFee: '$5-50', avgConfirmationTime: '10-30 دقيقة', isActive: false },
            ],
            defaultNetwork: 'trc20',
            walletAddress: '',
            apiProvider: 'TronGrid',
            status: 'active',
            dailyLimit: 100000,
            monthlyLimit: 1000000,
        },
    },
    {
        id: 'usdc',
        name: 'USD Coin',
        nameEn: 'USD Coin',
        nameAr: 'يو اس دي كوين',
        type: 'CRYPTOCURRENCY',
        category: 'stablecoin',
        icon: 'usdc',
        description: 'عملة مستقرة من Circle - مدعومة بالكامل بالدولار',
        isActive: false,
        isPopular: false,
        minAmount: 10,
        maxAmount: 50000,
        percentageFee: 0,
        fixedFee: 0.5,
        processingTime: '2-15 دقيقة',
        metadata: {
            symbol: 'USDC',
            networks: [
                { id: 'solana', name: 'Solana', nameAr: 'شبكة سولانا', symbol: 'SOL', avgFee: '$0.001', avgConfirmationTime: '1-2 دقيقة', isActive: true },
                { id: 'polygon', name: 'Polygon', nameAr: 'شبكة بوليجون', symbol: 'MATIC', avgFee: '$0.01', avgConfirmationTime: '2-5 دقائق', isActive: true },
            ],
            defaultNetwork: 'solana',
            walletAddress: '',
            status: 'disabled',
            dailyLimit: 50000,
            monthlyLimit: 500000,
        },
    },
    {
        id: 'btc',
        name: 'Bitcoin',
        nameEn: 'Bitcoin',
        nameAr: 'بيتكوين',
        type: 'CRYPTOCURRENCY',
        category: 'cryptocurrency',
        icon: 'btc',
        description: 'العملة الرقمية الأولى والأكثر شهرة',
        isActive: false,
        isPopular: true,
        minAmount: 0.0001,
        maxAmount: 10,
        percentageFee: 0,
        fixedFee: 0.0001,
        processingTime: '10-60 دقيقة',
        metadata: {
            symbol: 'BTC',
            networks: [
                { id: 'btc-mainnet', name: 'Bitcoin Mainnet', nameAr: 'الشبكة الرئيسية', symbol: 'BTC', avgFee: '$1-20', avgConfirmationTime: '10-60 دقيقة', isActive: true },
                { id: 'btc-lightning', name: 'Lightning Network', nameAr: 'شبكة البرق', symbol: 'LN-BTC', avgFee: '$0.001', avgConfirmationTime: 'فوري', isActive: false },
            ],
            defaultNetwork: 'btc-mainnet',
            walletAddress: '',
            status: 'disabled',
            dailyLimit: 10,
            monthlyLimit: 50,
        },
    },
    {
        id: 'eth',
        name: 'Ethereum',
        nameEn: 'Ethereum',
        nameAr: 'إيثريوم',
        type: 'CRYPTOCURRENCY',
        category: 'cryptocurrency',
        icon: 'eth',
        description: 'منصة العقود الذكية الأشهر',
        isActive: false,
        isPopular: true,
        minAmount: 0.01,
        maxAmount: 100,
        percentageFee: 0,
        fixedFee: 0.001,
        processingTime: '5-30 دقيقة',
        metadata: {
            symbol: 'ETH',
            networks: [
                { id: 'eth-mainnet', name: 'Ethereum Mainnet', nameAr: 'الشبكة الرئيسية', symbol: 'ETH', avgFee: '$5-50', avgConfirmationTime: '5-30 دقيقة', isActive: true },
            ],
            defaultNetwork: 'eth-mainnet',
            walletAddress: '',
            status: 'disabled',
            dailyLimit: 100,
            monthlyLimit: 500,
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
        console.error('[CRYPTO METHODS API] خطأ:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ داخلي' });
    }
}

// جلب العملات الرقمية
async function handleGetMethods(req: NextApiRequest, res: NextApiResponse) {
    const { active, type } = req.query;

    try {
        // محاولة جلب من قاعدة البيانات
        const dbMethods = await prisma.payment_method_configs.findMany({
            where: {
                type: 'CRYPTOCURRENCY' as any,
                ...(type && type !== 'all' ? { category: type as string } : {}),
                ...(active === 'true' ? { isActive: true } : {}),
            },
            orderBy: [{ isPopular: 'desc' }, { createdAt: 'asc' }],
        });

        if (dbMethods.length > 0) {
            const stats = {
                total: dbMethods.length,
                active: dbMethods.filter(m => m.isActive).length,
                stablecoins: dbMethods.filter(m => m.category === 'stablecoin').length,
                crypto: dbMethods.filter(m => m.category === 'cryptocurrency').length,
            };

            return res.status(200).json({ success: true, methods: dbMethods, stats });
        }
    } catch (error) {
        console.error('[CRYPTO METHODS] خطأ في الجلب من DB:', error);
    }

    // استخدام البيانات الافتراضية
    let methods = [...DEFAULT_CRYPTO_METHODS];
    if (active === 'true') {
        methods = methods.filter(m => m.isActive);
    }
    if (type && type !== 'all') {
        methods = methods.filter(m => m.category === type);
    }

    return res.status(200).json({
        success: true,
        methods,
        stats: {
            total: DEFAULT_CRYPTO_METHODS.length,
            active: DEFAULT_CRYPTO_METHODS.filter(m => m.isActive).length,
            stablecoins: DEFAULT_CRYPTO_METHODS.filter(m => m.category === 'stablecoin').length,
            crypto: DEFAULT_CRYPTO_METHODS.filter(m => m.category === 'cryptocurrency').length,
        },
    });
}

// إنشاء عملة رقمية جديدة
async function handleCreateMethod(req: NextApiRequest, res: NextApiResponse) {
    const data = req.body;

    if (!data.symbol || !data.name) {
        return res.status(400).json({ success: false, message: 'البيانات غير مكتملة' });
    }

    try {
        const method = await prisma.payment_method_configs.create({
            data: {
                id: `crypto-${Date.now()}`,
                name: data.name,
                nameEn: data.nameEn || data.name,
                nameAr: data.nameAr || data.name,
                type: 'CRYPTOCURRENCY' as any,
                category: data.category || 'cryptocurrency',
                icon: data.icon || data.symbol?.toLowerCase(),
                description: data.description,
                isActive: data.isActive ?? false,
                isPopular: data.isPopular ?? false,
                minAmount: data.minAmount || 0,
                maxAmount: data.maxAmount,
                percentageFee: data.percentageFee || 0,
                fixedFee: data.fixedFee || 0,
                processingTime: data.processingTime,
                metadata: {
                    symbol: data.symbol,
                    networks: data.networks || [],
                    defaultNetwork: data.defaultNetwork,
                    walletAddress: data.walletAddress || '',
                    apiProvider: data.apiProvider || '',
                    apiKey: '',
                    status: 'disabled',
                    dailyLimit: data.dailyLimit || 10000,
                    monthlyLimit: data.monthlyLimit || 100000,
                },
                updatedAt: new Date(),
            },
        });

        console.log('[CRYPTO METHOD CREATED]:', method.nameAr);
        return res.status(201).json({ success: true, message: 'تم الإنشاء بنجاح', method });
    } catch (error) {
        console.error('[CRYPTO METHODS] خطأ في الإنشاء:', error);
        return res.status(500).json({ success: false, message: 'خطأ في إنشاء العملة الرقمية' });
    }
}

// تحديث عملة رقمية
async function handleUpdateMethod(req: NextApiRequest, res: NextApiResponse) {
    const { id, ...data } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, message: 'معرف العملة مطلوب' });
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
                metadata: {
                    ...currentMetadata,
                    ...(data.networks && { networks: data.networks }),
                    ...(data.defaultNetwork && { defaultNetwork: data.defaultNetwork }),
                    ...(data.walletAddress !== undefined && { walletAddress: data.walletAddress }),
                    ...(data.apiProvider && { apiProvider: data.apiProvider }),
                    ...(data.apiKey && { apiKey: data.apiKey }),
                    ...(data.status && { status: data.status }),
                    ...(data.dailyLimit !== undefined && { dailyLimit: data.dailyLimit }),
                    ...(data.monthlyLimit !== undefined && { monthlyLimit: data.monthlyLimit }),
                },
                updatedAt: new Date(),
            },
        });

        console.log('[CRYPTO METHOD UPDATED]:', method.id);
        return res.status(200).json({ success: true, message: 'تم التحديث بنجاح', method });
    } catch (error) {
        console.error('[CRYPTO METHODS] خطأ في التحديث:', error);
        return res.status(500).json({ success: false, message: 'خطأ في تحديث العملة الرقمية' });
    }
}

// حذف عملة رقمية
async function handleDeleteMethod(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, message: 'معرف العملة مطلوب' });
    }

    try {
        await prisma.payment_method_configs.delete({ where: { id: id as string } });
        console.log('[CRYPTO METHOD DELETED]:', id);
        return res.status(200).json({ success: true, message: 'تم الحذف بنجاح' });
    } catch (error) {
        console.error('[CRYPTO METHODS] خطأ في الحذف:', error);
        return res.status(500).json({ success: false, message: 'خطأ في حذف العملة الرقمية' });
    }
}

// التحقق من رصيد المحفظة
export async function checkWalletBalance(methodId: string, network: string): Promise<{ balance: number; pendingDeposits: number; }> {
    // في الإنتاج، هنا يتم الاتصال بـ blockchain API
    return {
        balance: Math.random() * 10000,
        pendingDeposits: Math.floor(Math.random() * 5),
    };
}
