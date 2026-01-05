/**
 * API إنشاء مزاد ساحة جديد - لوحة التحكم
 * Create New Yard Auction API - Admin Panel
 * المزاد سيظهر في صفحة الساحة على الموقع الرئيسي
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// Verify admin authentication
async function verifyAuth(req: NextApiRequest): Promise<{ adminId: string; role: string; } | null> {
    const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; role: string; type: string; };
        if (decoded.type !== 'admin') return null;
        return { adminId: decoded.adminId, role: decoded.role };
    } catch {
        return null;
    }
}

// حساب تاريخ البداية
function calculateStartDate(startTime: string, customTime?: string): Date {
    const now = new Date();

    switch (startTime) {
        case 'now':
            return now;
        case 'after_30_seconds':
            return new Date(now.getTime() + 30 * 1000);
        case 'after_1_hour':
            return new Date(now.getTime() + 60 * 60 * 1000);
        case 'after_24_hours':
            return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        case 'custom':
            return customTime ? new Date(customTime) : now;
        default:
            return now;
    }
}

// حساب تاريخ النهاية من duration object
function calculateEndDateFromDuration(startDate: Date, duration: { totalMinutes?: number; } | string): Date {
    // إذا كان duration كائن (من AuctionDurationSelector)
    if (typeof duration === 'object' && duration.totalMinutes) {
        return new Date(startDate.getTime() + duration.totalMinutes * 60 * 1000);
    }

    // إذا كان string (للتوافق مع الإصدارات القديمة)
    const durationMs: Record<string, number> = {
        '1_minute': 60 * 1000,
        '1_day': 24 * 60 * 60 * 1000,
        '3_days': 3 * 24 * 60 * 60 * 1000,
        '1_week': 7 * 24 * 60 * 60 * 1000,
        '1_month': 30 * 24 * 60 * 60 * 1000,
    };

    return new Date(startDate.getTime() + (durationMs[String(duration)] || durationMs['1_week']));
}

// تحديد حالة المزاد
function determineAuctionStatus(startDate: Date): 'ACTIVE' | 'UPCOMING' {
    const now = new Date();
    return startDate <= now ? 'ACTIVE' : 'UPCOMING';
}

// تحويل حالة السيارة
function mapCondition(condition: string): 'NEW' | 'USED' | 'NEEDS_REPAIR' {
    const conditionMap: Record<string, 'NEW' | 'USED' | 'NEEDS_REPAIR'> = {
        'جديدة': 'NEW',
        'ممتازة': 'USED',
        'جيدة جداً': 'USED',
        'جيدة': 'USED',
        'مقبولة': 'USED',
        'تحتاج صيانة': 'NEEDS_REPAIR',
    };
    return conditionMap[condition] || 'USED';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        // التحقق من المصادقة
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        const {
            brand,
            model,
            year,
            condition,
            mileage,
            price,
            bodyType,
            fuelType,
            transmission,
            engineSize,
            regionalSpec,
            exteriorColor,
            interiorColor,
            seatCount,
            city,
            area,
            yardId,
            contactPhone,
            title,
            description,
            chassisNumber,
            engineNumber,
            features,
            auctionStartTime,
            auctionCustomStartTime,
            auctionDuration,
            images,
            inspectionReport,
            featured,
            promotionPackage,
            promotionDays,
            coordinates,
            detailedAddress,
            isYardAuction,
            yardName,
            yardSlug,
        } = req.body;

        // التحقق من الحقول المطلوبة
        if (!brand || !model || !year || !condition || !city || !area || !title || !price) {
            return res.status(400).json({
                success: false,
                message: 'يرجى ملء جميع الحقول المطلوبة',
            });
        }

        // التحقق من وجود الساحة - إجباري لمزادات الساحات
        if (!yardId) {
            return res.status(400).json({
                success: false,
                message: 'يرجى اختيار الساحة - هذا الحقل إجباري لمزادات الساحات',
            });
        }

        // التحقق من وجود الساحة في قاعدة البيانات
        const yard = await prisma.yards.findUnique({
            where: { id: yardId },
        });

        if (!yard) {
            return res.status(400).json({
                success: false,
                message: 'الساحة المختارة غير موجودة',
            });
        }

        if (!images || images.length < 3) {
            return res.status(400).json({
                success: false,
                message: 'يرجى رفع 3 صور على الأقل',
            });
        }

        // حساب التواريخ
        const startDate = calculateStartDate(auctionStartTime, auctionCustomStartTime);
        const endDate = calculateEndDateFromDuration(startDate, auctionDuration);
        const status = determineAuctionStatus(startDate);

        // إنشاء معرفات فريدة
        const carId = `car_yard_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
        const auctionId = `auc_yard_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

        // البحث عن مستخدم admin أو إنشاء واحد
        let adminUser = await prisma.users.findFirst({
            where: { role: 'ADMIN' },
        });

        if (!adminUser) {
            adminUser = await prisma.users.create({
                data: {
                    id: `admin_user_${Date.now()}`,
                    name: 'مدير النظام',
                    phone: '+218000000000',
                    role: 'ADMIN',
                    status: 'ACTIVE',
                    accountType: 'REGULAR_USER',
                    updatedAt: new Date(),
                },
            });
        }

        // إنشاء السيارة
        const car = await prisma.cars.create({
            data: {
                id: carId,
                title,
                description: description || '',
                brand,
                model,
                year: parseInt(year),
                price: parseFloat(price),
                mileage: mileage ? parseInt(mileage) : null,
                condition: mapCondition(condition),
                bodyType: bodyType || null,
                fuelType: fuelType || null,
                transmission: transmission || null,
                color: exteriorColor || null,
                interiorColor: interiorColor || null,
                regionalSpecs: regionalSpec || null,
                location: `${city}${area ? ', ' + area : ''}`,
                area: area || null,
                contactPhone: contactPhone || '',
                images: JSON.stringify(images),
                features: JSON.stringify(features || []),
                chassisNumber: chassisNumber || null,
                engineNumber: engineNumber || null,
                sellerId: adminUser.id,
                status: 'AVAILABLE',
                updatedAt: new Date(),
                isAuction: true,
            },
        });

        // إضافة الصور في جدول car_images
        if (images && images.length > 0) {
            const carImagesData = images.map((imageUrl: string, index: number) => {
                const fileName = imageUrl.split('/').pop() || `image_${index}.jpg`;
                return {
                    id: `img_yard_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}_${index}`,
                    carId: car.id,
                    fileName: fileName,
                    fileUrl: imageUrl,
                    fileSize: 0,
                    isPrimary: index === 0,
                    uploadedBy: adminUser.id,
                    category: 'yard_auctions',
                    updatedAt: new Date(),
                };
            });

            await prisma.car_images.createMany({
                data: carImagesData,
            });

            console.log(`[CreateYardAuction] تم إضافة ${carImagesData.length} صورة للسيارة ${car.id}`);
        }

        // إنشاء المزاد مع ربطه بالساحة
        const auction = await prisma.auctions.create({
            data: {
                id: auctionId,
                title,
                description: description || '',
                startPrice: parseFloat(price),
                currentPrice: parseFloat(price),
                minimumBid: Math.max(500, Math.floor(parseFloat(price) * 0.01)),
                startDate,
                endDate,
                status,
                type: 'PUBLIC',
                cars: { connect: { id: car.id } },
                users: { connect: { id: adminUser.id } },
                yard: { connect: { id: yardId } }, // ربط المزاد بالساحة - إجباري
                views: 0,
                totalBids: 0,
                featured: featured || false,
                location: detailedAddress || yard.city || null,
                updatedAt: new Date(),
            },
        });

        // إنشاء ترويج إذا تم اختيار باقة
        let promotion = null;
        if (promotionPackage && promotionPackage !== 'NONE') {
            try {
                const promotionEndDate = endDate;
                const priorityMap: Record<string, number> = { 'BASIC': 1, 'PREMIUM': 2, 'VIP': 3 };
                const priority = priorityMap[promotionPackage] || 1;

                promotion = await prisma.featured_ads.create({
                    data: {
                        id: `promo_yard_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        title: `ترويج مزاد ساحة: ${title}`,
                        description: `مزاد ${brand} ${model} ${year} في ${yard.name}`,
                        imageUrl: images && images.length > 0 ? images[0] : null,
                        linkUrl: `/auction/${auction.id}`,
                        adType: 'AUCTION_LISTING',
                        sourceId: auction.id,
                        sourceType: 'yard_auction',
                        position: priority,
                        priority,
                        isActive: true,
                        startDate: startDate,
                        endDate: promotionEndDate,
                        location: yard.city || city || null,
                        createdBy: adminUser.id,
                        updatedAt: new Date(),
                    },
                });

                console.log(`[CreateYardAuction] تم إنشاء ترويج ${promotionPackage} للمزاد ${auction.id}`);
            } catch (promoError) {
                console.error('خطأ في إنشاء الترويج:', promoError);
            }
        }

        // تسجيل النشاط
        try {
            await prisma.admin_activities.create({
                data: {
                    id: `act_yard_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                    admin_id: auth.adminId,
                    action: 'CREATE_YARD_AUCTION',
                    resource_type: 'yard_auction',
                    resource_id: auction.id,
                    success: true,
                    details: JSON.stringify({
                        title,
                        brand,
                        model,
                        price,
                        status,
                        yardId,
                        yardName: yard.name,
                        promotionPackage: promotionPackage || 'NONE',
                    }),
                },
            });
        } catch (logError) {
            console.warn('فشل تسجيل النشاط:', logError);
        }

        // تسجيل ربط المزاد بالساحة
        console.log(`[CreateYardAuction] تم ربط المزاد ${auction.id} بالساحة ${yard.name} (${yard.id})`);

        return res.status(201).json({
            success: true,
            message: 'تم إنشاء مزاد الساحة بنجاح',
            auction: {
                id: auction.id,
                title: auction.title,
                status: auction.status,
                startDate: auction.startDate,
                endDate: auction.endDate,
                startPrice: auction.startPrice,
            },
            car: {
                id: car.id,
                title: car.title,
            },
            yard: {
                id: yard.id,
                name: yard.name,
                slug: yard.slug,
            },
        });
    } catch (error) {
        console.error('خطأ في إنشاء مزاد الساحة:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في إنشاء مزاد الساحة',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        });
    }
}
