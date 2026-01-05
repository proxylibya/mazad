/**
 * Marketplace API - Enterprise Edition
 * API إدارة السوق الفوري (السيارات) - مع Prisma
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

// واجهة بيانات الموقع
interface LocationData {
    latitude?: number;
    longitude?: number;
    address?: string;
}

// واجهة بيانات السيارة المستلمة من النموذج
interface CarFormData {
    brand?: string;
    model?: string;
    year?: string | number;
    condition?: string;
    mileage?: string | number;
    price?: string | number;
    city?: string;
    area?: string;
    title?: string;
    description?: string;
    bodyType?: string;
    fuelType?: string;
    transmission?: string;
    exteriorColor?: string;
    color?: string;
    contactPhone?: string;
    features?: string[] | string;
    featured?: boolean;
    location?: LocationData | string;
    listingType?: string;
}

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

/**
 * تسجيل نشاط المدير بشكل آمن - لا يفشل العملية الرئيسية إذا فشل التسجيل
 */
async function safeLogAdminActivity(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId: string,
    success: boolean = true,
    errorMessage?: string
): Promise<void> {
    try {
        // التحقق من وجود المدير في جدول admins قبل تسجيل النشاط
        const adminExists = await prisma.admins.findUnique({
            where: { id: adminId },
            select: { id: true }
        });

        if (!adminExists) {
            console.log(`[Marketplace API] تخطي تسجيل النشاط - المدير ${adminId} غير موجود في جدول admins`);
            return;
        }

        await prisma.admin_activities.create({
            data: {
                id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                admin_id: adminId,
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                success,
                error_message: errorMessage,
            },
        });
        console.log(`[Marketplace API] تم تسجيل النشاط: ${action} على ${resourceType}/${resourceId}`);
    } catch (logError) {
        // لا نفشل العملية الرئيسية إذا فشل تسجيل النشاط
        console.warn('[Marketplace API] فشل تسجيل النشاط (غير حرج):', logError);
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Verify authentication
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        switch (req.method) {
            case 'GET': {
                const page = parseInt(req.query.page as string) || 1;
                const limit = parseInt(req.query.limit as string) || 20;
                const skip = (page - 1) * limit;
                const status = req.query.status as string;
                const search = req.query.search as string;
                const featured = req.query.featured === 'true';
                const deleted = req.query.deleted === 'true';

                // Build where clause - فقط السيارات غير المزادية
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const where: any = {
                    isAuction: false, // ⚠️ مهم: استبعاد سيارات المزاد
                };

                // فلترة حسب حالة الحذف بشكل صريح
                if (deleted) {
                    // صفحة المحذوفات: فقط الإعلانات المحذوفة
                    where.isDeleted = true;
                } else {
                    // الصفحة الرئيسية: استثناء جميع المحذوفات
                    // ملاحظة: isDeleted له قيمة افتراضية false في schema لذا لا حاجة للـ OR مع null
                    where.isDeleted = false;
                }

                if (status && status !== 'all') {
                    where.status = status;
                }

                if (featured) {
                    where.featured = true;
                }

                if (search) {
                    // إضافة شرط البحث - استخدام OR للبحث في عدة حقول
                    where.OR = [
                        { title: { contains: search, mode: 'insensitive' } },
                        { brand: { contains: search, mode: 'insensitive' } },
                        { model: { contains: search, mode: 'insensitive' } },
                    ];
                }

                // تسجيل الشروط للتشخيص
                console.log('[Marketplace API] WHERE conditions:', JSON.stringify(where, null, 2));

                const [cars, total] = await Promise.all([
                    prisma.cars.findMany({
                        where,
                        include: {
                            users: {
                                select: {
                                    id: true,
                                    name: true,
                                    phone: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: limit,
                    }),
                    prisma.cars.count({ where }),
                ]);

                console.log(`[Marketplace API] Found ${cars.length} cars, total: ${total}`);

                // حساب الإحصائيات - فقط للسيارات غير المزادية وغير المحذوفة
                const statsWhere = {
                    isAuction: false,
                    isDeleted: false,
                };
                const stats = await prisma.cars.groupBy({
                    by: ['status'],
                    where: statsWhere,
                    _count: { status: true },
                });

                const featuredCount = await prisma.cars.count({
                    where: {
                        featured: true,
                        isAuction: false,
                        isDeleted: false,
                    }
                });

                const statsMap = stats.reduce((acc, s) => {
                    acc[s.status] = s._count.status;
                    return acc;
                }, {} as Record<string, number>);

                return res.status(200).json({
                    success: true,
                    listings: cars.map(car => ({
                        id: car.id,
                        title: car.title,
                        brand: car.brand,
                        model: car.model,
                        year: car.year,
                        price: car.price,
                        mileage: car.mileage,
                        status: car.status,
                        featured: car.featured,
                        views: car.views,
                        seller: car.users?.name || 'غير معروف',
                        sellerId: car.sellerId,
                        category: 'سيارات',
                        images: car.images,
                        createdAt: car.createdAt,
                        deletedAt: (car as { deletedAt?: Date; }).deletedAt || null,
                        deletedBy: (car as { deletedBy?: string; }).deletedBy || null,
                    })),
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                    stats: {
                        total,
                        active: statsMap['AVAILABLE'] || 0,
                        pending: statsMap['PENDING'] || 0,
                        sold: statsMap['SOLD'] || 0,
                        featured: featuredCount,
                    },
                });
            }

            case 'POST': {
                // إنشاء إعلان جديد
                console.log('[Marketplace API] بدء إنشاء إعلان جديد...');
                const { carData: rawCarData, images, seller } = req.body;
                const carData = rawCarData as CarFormData;

                if (!carData) {
                    return res.status(400).json({ success: false, message: 'بيانات السيارة مطلوبة' });
                }

                // === نظام البائع المحسن ===
                let sellerId: string;
                let sellerName: string = 'البائع';

                const isSiteTeamSeller = Boolean(seller?.isSiteTeam) || seller?.id === SITE_TEAM_USER_ID;
                const siteTeamSettings = isSiteTeamSeller ? await readSiteTeamSettings() : null;
                const siteTeamPhone = siteTeamSettings ? pickSiteTeamPhone(siteTeamSettings) : '';

                if (isSiteTeamSeller) {
                    await ensureSiteTeamUserExists(siteTeamSettings?.teamName || seller?.name || 'فريق مزاد', siteTeamPhone);
                    sellerId = SITE_TEAM_USER_ID;
                    sellerName = siteTeamSettings?.teamName || seller?.name || 'فريق مزاد';
                    console.log(`[Marketplace API] استخدام فريق الموقع كبائع: ${sellerName} (${sellerId})`);
                } else if (seller && seller.phone) {
                    // التحقق من وجود مستخدم بنفس رقم الهاتف
                    console.log('[Marketplace API] البحث عن البائع المحدد...');
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
                        sellerId = existingSeller.id;
                        sellerName = existingSeller.name || seller.name || 'البائع';
                        console.log(`[Marketplace API] استخدام بائع موجود: ${sellerName} (${sellerId})`);
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
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                        });
                        sellerId = newSeller.id;
                        sellerName = newSeller.name || 'البائع';
                        console.log(`[Marketplace API] تم إنشاء بائع جديد: ${sellerName} (${sellerId})`);
                    } else if (seller.id) {
                        sellerId = seller.id;
                        sellerName = seller.name || 'البائع';
                        console.log(`[Marketplace API] استخدام بائع محدد: ${sellerName} (${sellerId})`);
                    } else {
                        // إنشاء مستخدم جديد
                        const newSeller = await prisma.users.create({
                            data: {
                                id: `seller_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                                name: seller.name || 'بائع',
                                phone: seller.phone,
                                role: 'USER',
                                status: 'ACTIVE',
                                accountType: 'REGULAR_USER',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            },
                        });
                        sellerId = newSeller.id;
                        sellerName = newSeller.name || 'البائع';
                    }
                } else {
                    // النظام القديم للتوافق - البحث عن أول مستخدم ADMIN
                    console.warn('[Marketplace API] تحذير: لم يتم تحديد بائع، استخدام النظام القديم');
                    const existingUser = await prisma.users.findFirst({
                        where: { status: 'ACTIVE' },
                        orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
                        select: { id: true, name: true }
                    });

                    if (existingUser) {
                        sellerId = existingUser.id;
                        sellerName = existingUser.name || 'البائع';
                        console.log(`[Marketplace API] استخدام مستخدم موجود: ${sellerId}`);
                    } else {
                        // إنشاء مستخدم نظام إذا لم يوجد أي مستخدم
                        const uniqueId = `system_admin_${Date.now()}`;
                        const uniquePhone = `+218900000${Date.now().toString().slice(-6)}`;
                        const systemUser = await prisma.users.create({
                            data: {
                                id: uniqueId,
                                phone: uniquePhone,
                                name: 'نظام الإدارة',
                                role: 'ADMIN',
                                status: 'ACTIVE',
                                createdAt: new Date(),
                                updatedAt: new Date(),
                            }
                        });
                        sellerId = systemUser.id;
                        sellerName = systemUser.name || 'نظام الإدارة';
                    }
                }

                console.log(`[Marketplace API] البائع النهائي: ${sellerName} (${sellerId})`);

                // إنشاء معرف فريد
                const carId = `car_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

                // تجهيز روابط الصور
                const imageUrls = images?.map((img: { url?: string; serverUrl?: string; }) => img.serverUrl || img.url || '').filter(Boolean).join(',') || '';

                // تجهيز البيانات مع التحقق من القيم الفارغة
                const safeString = (val: unknown): string => {
                    if (val === null || val === undefined) return '';
                    if (Array.isArray(val)) return val.filter(Boolean).join(',');
                    return String(val).trim();
                };

                const safeStringOrNull = (val: unknown): string | null => {
                    const result = safeString(val);
                    return result.length > 0 ? result : null;
                };

                // تجهيز وإنشاء السيارة
                console.log(`[Marketplace API] إنشاء سيارة ${carId}...`);
                console.log('[Marketplace API] بيانات السيارة المستلمة:', JSON.stringify(carData, null, 2));

                // التحقق من الحقول المطلوبة
                const brand = safeString(carData.brand) || 'غير محدد';
                const model = safeString(carData.model) || 'غير محدد';
                const yearStr = safeString(carData.year);
                const year = parseInt(yearStr) || new Date().getFullYear();
                const title = safeString(carData.title) || `${brand} ${model} ${year}`;

                // معالجة الموقع - قد يكون string أو object
                let locationStr = 'غير محدد';
                if (typeof carData.city === 'string' && carData.city.trim()) {
                    locationStr = carData.city.trim();
                } else if (typeof carData.location === 'string' && carData.location.trim()) {
                    locationStr = carData.location.trim();
                } else if (carData.location && typeof carData.location === 'object' && carData.location.address) {
                    locationStr = String(carData.location.address).trim() || 'غير محدد';
                }

                // استخراج إحداثيات الموقع إذا وجدت
                let locationLat: number | null = null;
                let locationLng: number | null = null;
                let locationAddress: string | null = null;
                if (carData.location && typeof carData.location === 'object') {
                    if (typeof carData.location.latitude === 'number') {
                        locationLat = carData.location.latitude;
                    }
                    if (typeof carData.location.longitude === 'number') {
                        locationLng = carData.location.longitude;
                    }
                    if (typeof carData.location.address === 'string') {
                        locationAddress = carData.location.address.trim() || null;
                    }
                }

                const features = Array.isArray(carData.features) ? carData.features.filter(Boolean).join(',') : safeString(carData.features);

                console.log('[Marketplace API] البيانات المجهزة:', {
                    brand, model, year, title, locationStr, features: features.substring(0, 50),
                    locationLat, locationLng, hasLocationAddress: !!locationAddress
                });

                const finalContactPhone = isSiteTeamSeller
                    ? (siteTeamPhone || safeStringOrNull(carData.contactPhone) || '')
                    : (safeStringOrNull(seller?.phone) || safeStringOrNull(carData.contactPhone));

                let newCar;
                try {
                    newCar = await prisma.cars.create({
                        data: {
                            id: carId,
                            title: title,
                            brand: brand,
                            model: model,
                            year: year,
                            price: parseFloat(String(carData.price || '0')) || 0,
                            mileage: carData.mileage ? parseInt(String(carData.mileage), 10) : null,
                            condition: carData.condition === 'جديدة' || carData.condition === 'جديد' ? 'NEW' : 'USED',
                            description: safeString(carData.description),
                            location: locationStr,
                            locationLat: locationLat,
                            locationLng: locationLng,
                            locationAddress: locationAddress,
                            status: 'AVAILABLE',
                            isAuction: false,
                            featured: Boolean(carData.featured),
                            views: 0,
                            images: imageUrls || '',
                            features: features || '',
                            bodyType: safeStringOrNull(carData.bodyType),
                            fuelType: safeStringOrNull(carData.fuelType),
                            transmission: safeStringOrNull(carData.transmission),
                            color: safeStringOrNull(carData.exteriorColor) || safeStringOrNull(carData.color),
                            // استخدام رقم الهاتف من البائع أو من بيانات السيارة
                            contactPhone: finalContactPhone,
                            area: safeStringOrNull(carData.area),
                            sellerId: sellerId,
                            updatedAt: new Date(),
                        },
                    });
                    console.log(`[Marketplace API] تم إنشاء السيارة بنجاح: ${carId}`);
                } catch (carError) {
                    console.error('[Marketplace API] فشل إنشاء السيارة:', carError);
                    return res.status(500).json({
                        success: false,
                        message: 'فشل في إنشاء الإعلان. تأكد من صحة البيانات.',
                        error: process.env.NODE_ENV === 'development' ? String(carError) : undefined,
                    });
                }

                // إضافة الصور إذا وجدت
                console.log('[Marketplace API] بيانات الصور المستلمة:', images?.length || 0, images?.map((img: any) => img?.serverUrl || img?.url || 'فارغ'));
                if (images && Array.isArray(images) && images.length > 0) {
                    console.log(`[Marketplace API] إضافة ${images.length} صورة...`);
                    try {
                        const imageRecords = images
                            .map((img: { url?: string; serverUrl?: string; fileName?: string; fileSize?: number; id?: string; }, index: number) => {
                                // التأكد من وجود URL صالح
                                const imageUrl = safeString(img?.serverUrl) || safeString(img?.url);
                                if (!imageUrl) {
                                    console.warn(`[Marketplace API] تخطي صورة ${index} - لا يوجد URL`);
                                    return null;
                                }

                                // استخراج اسم الملف بأمان
                                let fileName = safeString(img?.fileName);
                                if (!fileName && imageUrl) {
                                    const urlParts = imageUrl.split('/');
                                    fileName = urlParts[urlParts.length - 1] || `image_${index}.jpg`;
                                }
                                if (!fileName) {
                                    fileName = `image_${index}.jpg`;
                                }

                                return {
                                    id: `img_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                                    carId: carId,
                                    fileName: fileName,
                                    fileUrl: imageUrl,
                                    fileSize: typeof img?.fileSize === 'number' ? img.fileSize : 0,
                                    isPrimary: index === 0,
                                    uploadedBy: sellerId,
                                    category: 'listings',
                                    createdAt: new Date(),
                                    updatedAt: new Date(),
                                };
                            })
                            .filter((record): record is NonNullable<typeof record> => record !== null);

                        if (imageRecords.length > 0) {
                            await prisma.car_images.createMany({
                                data: imageRecords,
                            });
                            console.log(`[Marketplace API] تم إضافة ${imageRecords.length} صورة بنجاح`);
                        } else {
                            console.warn('[Marketplace API] لم يتم العثور على صور صالحة للإضافة');
                        }
                    } catch (imageError) {
                        // لا نفشل العملية إذا فشل إضافة الصور - السيارة تم إنشاؤها بنجاح
                        console.warn('[Marketplace API] فشل إضافة الصور (غير حرج):', imageError);
                    }
                }

                // تسجيل النشاط بشكل آمن
                await safeLogAdminActivity(auth.adminId, 'CREATE_CAR', 'car', carId, true);

                console.log(`[Marketplace API] تم نشر الإعلان بنجاح: ${carId}`);
                return res.status(201).json({
                    success: true,
                    message: 'تم إنشاء الإعلان بنجاح',
                    car: newCar,
                    carId: carId,
                });
            }

            case 'PUT': {
                const { id } = req.query;
                const { status, featured, price } = req.body;

                if (!id) {
                    return res.status(400).json({ success: false, message: 'معرف السيارة مطلوب' });
                }

                const updatedCar = await prisma.cars.update({
                    where: { id: id as string },
                    data: {
                        ...(status && { status }),
                        ...(featured !== undefined && { featured }),
                        ...(price !== undefined && { price }),
                        updatedAt: new Date(),
                    },
                });

                // تسجيل النشاط بشكل آمن
                await safeLogAdminActivity(auth.adminId, 'UPDATE_CAR', 'car', id as string, true);

                return res.status(200).json({
                    success: true,
                    message: 'تم تحديث السيارة',
                    car: updatedCar,
                });
            }

            case 'DELETE': {
                const { id, permanent } = req.query;

                if (!id) {
                    return res.status(400).json({ success: false, message: 'معرف السيارة مطلوب' });
                }

                if (permanent === 'true') {
                    // حذف نهائي - حذف فعلي من قاعدة البيانات
                    // حذف الصور المرتبطة أولاً
                    await prisma.car_images.deleteMany({
                        where: { carId: id as string },
                    });

                    await prisma.cars.delete({
                        where: { id: id as string },
                    });

                    await safeLogAdminActivity(auth.adminId, 'PERMANENT_DELETE_CAR', 'car', id as string, true);

                    return res.status(200).json({
                        success: true,
                        message: 'تم حذف الإعلان نهائياً',
                    });
                }

                // Soft delete - تعليم كمحذوف
                await prisma.cars.update({
                    where: { id: id as string },
                    data: {
                        isDeleted: true,
                        deletedAt: new Date(),
                        deletedBy: auth.adminId,
                        updatedAt: new Date(),
                    },
                });

                // تسجيل النشاط بشكل آمن
                await safeLogAdminActivity(auth.adminId, 'DELETE_CAR', 'car', id as string, true);

                return res.status(200).json({
                    success: true,
                    message: 'تم نقل الإعلان إلى المحذوفات',
                });
            }

            case 'PATCH': {
                // استعادة إعلان محذوف
                const { id: restoreId, action } = req.query;

                if (!restoreId) {
                    return res.status(400).json({ success: false, message: 'معرف السيارة مطلوب' });
                }

                if (action === 'restore') {
                    await prisma.cars.update({
                        where: { id: restoreId as string },
                        data: {
                            isDeleted: false,
                            deletedAt: null,
                            deletedBy: null,
                            updatedAt: new Date(),
                        },
                    });

                    await safeLogAdminActivity(auth.adminId, 'RESTORE_CAR', 'car', restoreId as string, true);

                    return res.status(200).json({
                        success: true,
                        message: 'تم استعادة الإعلان بنجاح',
                    });
                }

                return res.status(400).json({ success: false, message: 'إجراء غير صالح' });
            }

            default:
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Marketplace API error:', error);

        // تحديد نوع الخطأ وإرجاع رسالة مناسبة
        let errorMessage = 'حدث خطأ في الخادم';
        let statusCode = 500;

        if (error instanceof Error) {
            // أخطاء Prisma المعروفة
            if (error.message.includes('Foreign key constraint')) {
                errorMessage = 'خطأ في العلاقات: تأكد من وجود البائع';
                statusCode = 400;
            } else if (error.message.includes('Unique constraint')) {
                errorMessage = 'هذا السجل موجود مسبقاً';
                statusCode = 409;
            } else if (error.message.includes('Record to update not found')) {
                errorMessage = 'السجل غير موجود';
                statusCode = 404;
            } else {
                errorMessage = `خطأ: ${error.message}`;
            }

            console.error('Error details:', error.message);
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? String(error) : undefined,
        });
    }
}
