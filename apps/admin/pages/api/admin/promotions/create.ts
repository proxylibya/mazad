/**
 * API إنشاء ترويج موحد
 * Universal Promotion Create API
 * 
 * يدعم:
 * - المزادات (auction): ينتهي مع المزاد
 * - السوق الفوري (car/showroom/transport): بالأيام
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

// Prisma client singleton
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// التحقق من المصادقة
async function verifyAuth(req: NextApiRequest): Promise<{ adminId: string; role: string; } | null> {
    try {
        const token = req.cookies[COOKIE_NAME];
        if (!token) return null;

        const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; role: string; };
        if (!decoded?.adminId) return null;

        return { adminId: decoded.adminId, role: decoded.role };
    } catch {
        return null;
    }
}

// ═══════════════════════════════════════════════════════════════
// الأنواع
// ═══════════════════════════════════════════════════════════════

type SourceType = 'auction' | 'car' | 'showroom' | 'transport';
type PackageLevel = 'NONE' | 'BASIC' | 'PREMIUM' | 'VIP';

interface CreatePromotionRequest {
    sourceType: SourceType;
    sourceId: string;
    packageLevel: PackageLevel;
    title: string;
    description?: string;
    imageUrl?: string;
    location?: string;
    // للمزادات
    auctionEndDate?: string;
    // للسوق الفوري
    customDays?: number;
}

// ═══════════════════════════════════════════════════════════════
// الباقات
// ═══════════════════════════════════════════════════════════════

const AUCTION_PACKAGES = {
    NONE: { price: 0, priority: 0 },
    BASIC: { price: 30, priority: 1 },
    PREMIUM: { price: 60, priority: 2 },
    VIP: { price: 100, priority: 3 },
};

const MARKETPLACE_PACKAGES = {
    NONE: { price: 0, days: 0, priority: 0 },
    BASIC: { price: 50, days: 7, priority: 1 },
    PREMIUM: { price: 100, days: 14, priority: 2 },
    VIP: { price: 200, days: 30, priority: 3 },
};

// ═══════════════════════════════════════════════════════════════
// Handler
// ═══════════════════════════════════════════════════════════════

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        // التحقق من المصادقة
        const auth = await verifyAuth(req);
        if (!auth?.adminId) {
            return res.status(401).json({ success: false, error: 'غير مصرح' });
        }

        const body = req.body as CreatePromotionRequest;
        const {
            sourceType,
            sourceId,
            packageLevel,
            title,
            description,
            imageUrl,
            location,
            auctionEndDate,
            customDays,
        } = body;

        // التحقق من البيانات المطلوبة
        if (!sourceType || !sourceId || !packageLevel || !title) {
            return res.status(400).json({
                success: false,
                error: 'البيانات المطلوبة ناقصة: sourceType, sourceId, packageLevel, title',
            });
        }

        // بدون ترويج
        if (packageLevel === 'NONE') {
            return res.status(200).json({
                success: true,
                message: 'لم يتم إنشاء ترويج',
                promotion: null,
            });
        }

        // حساب تاريخ الانتهاء والسعر
        const isAuction = sourceType === 'auction';
        const packages = isAuction ? AUCTION_PACKAGES : MARKETPLACE_PACKAGES;
        const pkg = packages[packageLevel];

        let endDate: Date;
        let price: number;

        if (isAuction) {
            // المزاد: ينتهي مع المزاد
            if (!auctionEndDate) {
                return res.status(400).json({
                    success: false,
                    error: 'تاريخ انتهاء المزاد مطلوب للترويج',
                });
            }
            endDate = new Date(auctionEndDate);
            price = pkg.price;
        } else {
            // السوق الفوري: بالأيام
            const days = customDays || (pkg as any).days || 7;
            endDate = new Date();
            endDate.setDate(endDate.getDate() + days);

            // حساب السعر (إذا كانت أيام مخصصة)
            if (customDays && (pkg as any).days) {
                const pricePerDay = pkg.price / (pkg as any).days;
                price = Math.round(pricePerDay * customDays);
            } else {
                price = pkg.price;
            }
        }

        // تحديد نوع الإعلان
        const adTypeMap = {
            auction: 'AUCTION_LISTING' as const,
            car: 'CAR_LISTING' as const,
            showroom: 'SHOWROOM_AD' as const,
            transport: 'TRANSPORT_SERVICE' as const,
        };

        // بناء رابط الإعلان
        const linkUrlMap: Record<SourceType, string> = {
            auction: `/auction/${sourceId}`,
            car: `/car/${sourceId}`,
            showroom: `/showroom/${sourceId}`,
            transport: `/transport/${sourceId}`,
        };

        // إنشاء الترويج
        const promotion = await prisma.featured_ads.create({
            data: {
                id: `promo_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                title: `ترويج: ${title}`,
                description,
                imageUrl,
                linkUrl: linkUrlMap[sourceType],
                adType: adTypeMap[sourceType],
                sourceId,
                sourceType,
                position: pkg.priority,
                priority: pkg.priority,
                isActive: true,
                startDate: new Date(),
                endDate,
                location,
                createdBy: auth.adminId,
                updatedAt: new Date(),
            },
        });

        console.log(`[Promotion] تم إنشاء ترويج ${packageLevel} لـ ${sourceType}:${sourceId}`);

        return res.status(201).json({
            success: true,
            message: 'تم إنشاء الترويج بنجاح',
            promotion: {
                id: promotion.id,
                sourceType,
                sourceId,
                packageLevel,
                price,
                startDate: promotion.startDate,
                endDate: promotion.endDate,
                duration: isAuction ? 'حتى انتهاء المزاد' : `${customDays || (pkg as any).days} يوم`,
            },
        });
    } catch (error) {
        console.error('خطأ في إنشاء الترويج:', error);
        return res.status(500).json({
            success: false,
            error: 'خطأ في إنشاء الترويج',
        });
    }
}
