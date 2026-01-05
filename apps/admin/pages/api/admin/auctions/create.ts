/**
 * API إنشاء مزاد جديد - لوحة التحكم
 * Create New Auction API - Admin Panel
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

// Prisma client singleton

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

const SITE_TEAM_USER_ID = 'site_team';

type SiteTeamSettings = {
    enabled: boolean;
    userId: string;
    teamName: string;
    phones: string[];
    whatsappPhone: string;
    allowCalls: boolean;
    allowMessages: boolean;
};

const DEFAULT_SITE_TEAM_SETTINGS: SiteTeamSettings = {
    enabled: false,
    userId: SITE_TEAM_USER_ID,
    teamName: 'فريق مزاد',
    phones: [],
    whatsappPhone: '',
    allowCalls: true,
    allowMessages: true,
};

async function readSiteTeamSettings(): Promise<SiteTeamSettings> {
    const record = await prisma.system_settings.findFirst({ where: { key: 'site_team' } });
    if (!record || record.value === null || record.value === undefined) return DEFAULT_SITE_TEAM_SETTINGS;

    const raw =
        typeof record.value === 'string'
            ? (JSON.parse(record.value as string) as Partial<SiteTeamSettings>)
            : (record.value as Partial<SiteTeamSettings>);

    return {
        ...DEFAULT_SITE_TEAM_SETTINGS,
        ...raw,
        userId: SITE_TEAM_USER_ID,
    };
}

function pickSiteTeamPhone(settings: SiteTeamSettings): string {
    const first = Array.isArray(settings.phones)
        ? settings.phones.map((p) => String(p || '').trim()).find(Boolean)
        : '';
    return first || String(settings.whatsappPhone || '').trim() || '';
}

async function ensureSiteTeamUserExists(teamName: string, preferredPhone?: string) {
    const existing = await prisma.users.findUnique({ where: { id: SITE_TEAM_USER_ID } });
    if (existing) return;

    let phoneToUse = String(preferredPhone || '').trim();
    if (!phoneToUse) {
        phoneToUse = `+2189${Date.now().toString().slice(-9)}`;
    }

    for (let i = 0; i < 10; i += 1) {
        const occupied = await prisma.users.findFirst({ where: { phone: phoneToUse }, select: { id: true } });
        if (!occupied) break;
        phoneToUse = `+2189${Date.now().toString().slice(-9)}`;
    }

    await prisma.users.create({
        data: {
            id: SITE_TEAM_USER_ID,
            name: teamName || 'فريق مزاد',
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

// حساب تاريخ النهاية
function calculateEndDate(startDate: Date, duration: string): Date {
    const durationMs: Record<string, number> = {
        '1_minute': 60 * 1000,
        '1_day': 24 * 60 * 60 * 1000,
        '3_days': 3 * 24 * 60 * 60 * 1000,
        '1_week': 7 * 24 * 60 * 60 * 1000,
        '1_month': 30 * 24 * 60 * 60 * 1000,
    };

    return new Date(startDate.getTime() + (durationMs[duration] || durationMs['1_week']));
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
            // yardId محذوف - المزادات الأونلاين لا ترتبط بساحات (استخدم /api/admin/yards/auctions/create لمزادات الساحات)
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
            // معلومات البائع - جديد
            seller,
        } = req.body;

        // التحقق من الحقول المطلوبة
        if (!brand || !model || !year || !condition || !city || !area || !title || !price) {
            return res.status(400).json({
                success: false,
                message: 'يرجى ملء جميع الحقول المطلوبة',
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
        const endDate = calculateEndDate(startDate, auctionDuration);
        const status = determineAuctionStatus(startDate);

        // إنشاء معرفات فريدة
        const carId = `car_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
        const auctionId = `auc_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

        // === نظام البائع المحسن ===
        // إذا تم تحديد بائع من واجهة الإنشاء، نستخدمه
        // وإلا نستخدم النظام القديم (للتوافق)
        let sellerId: string;
        let sellerName: string = 'البائع';

        const isSiteTeamSeller = Boolean(seller?.isSiteTeam) || seller?.id === SITE_TEAM_USER_ID;
        const siteTeamSettings = isSiteTeamSeller ? await readSiteTeamSettings() : null;
        const siteTeamPhone = siteTeamSettings ? pickSiteTeamPhone(siteTeamSettings) : '';

        if (isSiteTeamSeller) {
            await ensureSiteTeamUserExists(siteTeamSettings?.teamName || seller?.name || 'فريق مزاد', siteTeamPhone);
            sellerId = SITE_TEAM_USER_ID;
            sellerName = siteTeamSettings?.teamName || seller?.name || 'فريق مزاد';
            console.log(`[CreateAuction] استخدام فريق الموقع كبائع: ${sellerName} (${sellerId})`);
        } else if (seller && seller.phone) {
            // التحقق من وجود مستخدم بنفس رقم الهاتف
            let existingSeller = await prisma.users.findFirst({
                where: {
                    phone: {
                        in: [
                            seller.phone,
                            seller.phone.replace(/\s/g, ''),
                            seller.phone.replace('+218', '0'),
                            seller.phone.replace('00218', '0'),
                        ],
                    },
                },
            });

            if (existingSeller) {
                // استخدام المستخدم الموجود
                sellerId = existingSeller.id;
                sellerName = existingSeller.name || seller.name || 'البائع';
                console.log(`[CreateAuction] استخدام بائع موجود: ${sellerName} (${sellerId})`);
            } else if (seller.isNew) {
                // إنشاء مستخدم جديد للبائع
                const newSeller = await prisma.users.create({
                    data: {
                        id: `seller_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        name: seller.name || 'بائع',
                        phone: seller.phone,
                        role: 'USER',
                        status: 'ACTIVE',
                        accountType: 'REGULAR_USER',
                        updatedAt: new Date(),
                    },
                });
                sellerId = newSeller.id;
                sellerName = newSeller.name || 'البائع';
                console.log(`[CreateAuction] تم إنشاء بائع جديد: ${sellerName} (${sellerId})`);
            } else if (seller.id) {
                // استخدام معرف البائع المحدد
                sellerId = seller.id;
                sellerName = seller.name || 'البائع';
                console.log(`[CreateAuction] استخدام بائع محدد: ${sellerName} (${sellerId})`);
            } else {
                // fallback: إنشاء مستخدم جديد
                const newSeller = await prisma.users.create({
                    data: {
                        id: `seller_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        name: seller.name || 'بائع',
                        phone: seller.phone,
                        role: 'USER',
                        status: 'ACTIVE',
                        accountType: 'REGULAR_USER',
                        updatedAt: new Date(),
                    },
                });
                sellerId = newSeller.id;
                sellerName = newSeller.name || 'البائع';
            }
        } else {
            // النظام القديم للتوافق - البحث عن أول مستخدم ADMIN
            console.warn('[CreateAuction] تحذير: لم يتم تحديد بائع، استخدام النظام القديم');
            const adminUser = await prisma.users.findFirst({
                where: { role: 'ADMIN' },
            });

            if (!adminUser) {
                const newAdminUser = await prisma.users.create({
                    data: {
                        id: `admin_user_${Date.now()}`,
                        name: 'نظام الإدارة',
                        phone: contactPhone || '+218910000000',
                        role: 'ADMIN',
                        status: 'ACTIVE',
                        accountType: 'REGULAR_USER',
                        updatedAt: new Date(),
                    },
                });
                sellerId = newAdminUser.id;
                sellerName = newAdminUser.name || 'نظام الإدارة';
            } else {
                sellerId = adminUser.id;
                sellerName = adminUser.name || 'نظام الإدارة';
            }
        }

        const finalContactPhone = isSiteTeamSeller ? (siteTeamPhone || contactPhone || '') : (contactPhone || '');

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
                contactPhone: finalContactPhone,
                images: JSON.stringify(images),
                features: JSON.stringify(features || []),
                chassisNumber: chassisNumber || null,
                engineNumber: engineNumber || null,
                sellerId: sellerId,
                status: 'AVAILABLE',
                updatedAt: new Date(),
                isAuction: true,
            },
        });

        // إضافة الصور في جدول car_images للتوافق مع النظام الحديث
        if (images && images.length > 0) {
            const carImagesData = images.map((imageUrl: string, index: number) => {
                // استخراج اسم الملف من URL
                const fileName = imageUrl.split('/').pop() || `image_${index}.jpg`;

                return {
                    id: `img_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}_${index}`,
                    carId: car.id,
                    fileName: fileName,
                    fileUrl: imageUrl,
                    fileSize: 0, // حجم افتراضي
                    isPrimary: index === 0, // الصورة الأولى هي الرئيسية
                    uploadedBy: sellerId,
                    category: 'auctions',
                    updatedAt: new Date(),
                };
            });

            await prisma.car_images.createMany({
                data: carImagesData,
            });

            console.log(`[CreateAuction] تم إضافة ${carImagesData.length} صورة في جدول car_images للسيارة ${car.id}`);
        }

        // إنشاء المزاد
        const auction = await prisma.auctions.create({
            data: {
                id: auctionId,
                title,
                description: description || '',
                startPrice: parseFloat(price),
                currentPrice: parseFloat(price),
                minimumBid: Math.max(500, Math.floor(parseFloat(price) * 0.01)), // 1% أو 500 دينار كحد أدنى
                startDate,
                endDate,
                status,
                type: 'PUBLIC',
                cars: { connect: { id: car.id } },
                users: { connect: { id: sellerId } },
                // yardId: null - المزادات الأونلاين تظهر في /auctions فقط (لمزادات الساحات استخدم API منفصل)
                views: 0,
                totalBids: 0,
                featured: featured || false,
                location: detailedAddress || null,
                updatedAt: new Date(),
            },
        });

        // إنشاء ترويج في جدول featured_ads إذا تم اختيار باقة
        // ملاحظة: ترويج المزادات ينتهي مع انتهاء المزاد (وليس بعدد أيام محدد)
        let promotion = null;
        if (promotionPackage && promotionPackage !== 'NONE') {
            try {
                // ترويج المزاد ينتهي مع انتهاء المزاد نفسه
                const promotionEndDate = endDate; // تاريخ انتهاء المزاد

                // تحديد الأولوية بناءً على الباقة (VIP أعلى ظهوراً)
                const priorityMap: Record<string, number> = { 'BASIC': 1, 'PREMIUM': 2, 'VIP': 3 };
                const priority = priorityMap[promotionPackage] || 1;

                promotion = await prisma.featured_ads.create({
                    data: {
                        id: `promo_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        title: `ترويج: ${title}`,
                        description: `مزاد ${brand} ${model} ${year}`,
                        imageUrl: images && images.length > 0 ? images[0] : null,
                        linkUrl: `/auction/${auction.id}`,
                        adType: 'AUCTION_LISTING',
                        sourceId: auction.id,
                        sourceType: 'auction',
                        position: priority,
                        priority,
                        isActive: true,
                        startDate: startDate,
                        endDate: promotionEndDate, // ينتهي مع المزاد
                        location: city || null,
                        createdBy: sellerId,
                        updatedAt: new Date(),
                    },
                });

                console.log(`[CreateAuction] تم إنشاء ترويج ${promotionPackage} للمزاد ${auction.id} (ينتهي مع المزاد: ${endDate})`);
            } catch (promoError) {
                console.error('خطأ في إنشاء الترويج:', promoError);
            }
        }

        // تسجيل النشاط
        try {
            await prisma.admin_activities.create({
                data: {
                    id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                    admin_id: auth.adminId,
                    action: 'CREATE_AUCTION',
                    resource_type: 'auction',
                    resource_id: auction.id,
                    success: true,
                    details: JSON.stringify({
                        title,
                        brand,
                        model,
                        price,
                        status,
                        promotionPackage: promotionPackage || 'NONE',
                        promotionDays: promotionDays || 0,
                    }),
                },
            });
        } catch (logError) {
            console.warn('فشل تسجيل النشاط:', logError);
        }

        return res.status(201).json({
            success: true,
            message: 'تم إنشاء المزاد بنجاح',
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
        });
    } catch (error) {
        console.error('خطأ في إنشاء المزاد:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في إنشاء المزاد',
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        });
    }
}
