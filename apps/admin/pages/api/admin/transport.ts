/**
 * Transport Services API - Enterprise Edition
 * API إدارة خدمات النقل - مع Prisma
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

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const where: any = {};

                if (status) {
                    where.status = status;
                }

                if (search) {
                    where.OR = [
                        { title: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } },
                    ];
                }

                const [services, total] = await Promise.all([
                    prisma.transport_services.findMany({
                        where,
                        include: {
                            users: {
                                select: {
                                    id: true,
                                    name: true,
                                    phone: true,
                                    profileImage: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: limit,
                    }),
                    prisma.transport_services.count({ where }),
                ]);

                return res.status(200).json({
                    success: true,
                    services: services.map(s => ({
                        id: s.id,
                        title: s.title,
                        description: s.description,
                        truckType: s.truckType,
                        capacity: s.capacity,
                        serviceArea: s.serviceArea,
                        pricePerKm: s.pricePerKm,
                        availableDays: s.availableDays,
                        contactPhone: s.contactPhone,
                        images: s.images,
                        features: s.features,
                        status: s.status,
                        commission: s.commission,
                        provider: s.users,
                        createdAt: s.createdAt,
                    })),
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                });
            }

            case 'PUT': {
                const { id } = req.query;
                const { status } = req.body;

                if (!id) {
                    return res.status(400).json({ success: false, message: 'معرف الخدمة مطلوب' });
                }

                const updatedService = await prisma.transport_services.update({
                    where: { id: id as string },
                    data: {
                        ...(status && { status }),
                        updatedAt: new Date(),
                    },
                });

                try {
                    await prisma.admin_activities.create({
                        data: {
                            id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                            admin_id: auth.adminId,
                            action: 'UPDATE_TRANSPORT',
                            resource_type: 'transport_service',
                            resource_id: id as string,
                            success: true,
                        },
                    });
                } catch (activityError) {
                    console.warn('تعذر تسجيل النشاط:', activityError);
                }

                return res.status(200).json({
                    success: true,
                    message: 'تم تحديث الخدمة',
                    service: updatedService,
                });
            }

            case 'POST': {
                const {
                    companyName,
                    ownerName,
                    phone,
                    vehicleType,
                    vehicleCount,
                    cities,
                    description,
                    truckDescription,
                    address,
                    workingDays,
                    availableDays,
                    images,
                    imagesString,
                    promotionPackage,
                    promotionDays,
                    userId,
                } = req.body;

                const isSiteTeamOwner = String(userId || '') === SITE_TEAM_USER_ID;
                const siteTeamSettings = isSiteTeamOwner ? await readSiteTeamSettings() : null;
                const siteTeamPhone = siteTeamSettings ? pickSiteTeamPhone(siteTeamSettings) : '';

                if (!companyName || (!phone && !isSiteTeamOwner) || !cities || cities.length === 0) {
                    return res.status(400).json({
                        success: false,
                        message: 'الرجاء ملء جميع الحقول المطلوبة',
                    });
                }

                if (isSiteTeamOwner) {
                    await ensureSiteTeamUserExists(siteTeamSettings?.teamName || 'فريق مزاد', siteTeamPhone);
                }

                // إنشاء ID فريد
                const serviceId = `ts_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;

                // حساب تواريخ الترويج إذا تم اختيار باقة
                let promotionStartDate = null;
                let promotionEndDate = null;
                let promotionPriority = 0;

                if (promotionPackage && promotionPackage !== 'free' && promotionDays > 0) {
                    promotionStartDate = new Date();
                    promotionEndDate = new Date();
                    promotionEndDate.setDate(promotionEndDate.getDate() + promotionDays);

                    // تحديد الأولوية حسب الباقة (نفس باقات المزادات)
                    const priorityMap: Record<string, number> = {
                        'vip': 100,
                        'premium': 75,
                        'gold': 100,
                        'silver': 75,
                        'bronze': 50,
                        'basic': 50,
                        'free': 0,
                    };
                    promotionPriority = priorityMap[promotionPackage] || 0;
                }

                // البحث عن مستخدم بنوع TRANSPORT_OWNER أو إنشاء ارتباط
                let targetUserId = userId;

                if (!targetUserId) {
                    // البحث عن مستخدم موجود بالهاتف
                    const existingUser = await prisma.users.findFirst({
                        where: { phone },
                    });

                    if (existingUser) {
                        targetUserId = existingUser.id;
                        // تحديث نوع الحساب إذا لم يكن TRANSPORT_OWNER
                        if (existingUser.accountType !== 'TRANSPORT_OWNER') {
                            await prisma.users.update({
                                where: { id: existingUser.id },
                                data: { accountType: 'TRANSPORT_OWNER', updatedAt: new Date() },
                            });
                        }
                    } else {
                        // إنشاء مستخدم جديد بكل الحقول المطلوبة
                        const newUserId = `usr_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
                        const newUser = await prisma.users.create({
                            data: {
                                id: newUserId,
                                name: ownerName || companyName,
                                phone: phone,
                                accountType: 'TRANSPORT_OWNER',
                                status: 'ACTIVE',
                                role: 'USER',
                                verified: false,
                                updatedAt: new Date(),
                            },
                        });
                        targetUserId = newUser.id;
                    }
                }

                // معالجة أيام العمل
                const finalAvailableDays = availableDays
                    || (Array.isArray(workingDays) ? workingDays.join(',') : workingDays)
                    || 'السبت,الأحد,الاثنين,الثلاثاء,الأربعاء,الخميس';

                // معالجة الصور
                const finalImages = imagesString
                    || (Array.isArray(images) ? images.join(',') : images)
                    || '';

                // إنشاء الوصف النهائي
                const finalDescription = truckDescription || description || `خدمة نقل ${vehicleType} - ${cities.slice(0, 3).join(', ')}`;

                // إنشاء العنوان النهائي
                const finalAddress = address || `${vehicleType} - ${cities.slice(0, 3).join(' - ')}`;

                const finalContactPhone = isSiteTeamOwner ? (siteTeamPhone || phone || '') : phone;

                const newService = await prisma.transport_services.create({
                    data: {
                        id: serviceId,
                        userId: targetUserId,
                        title: companyName,
                        description: finalDescription,
                        truckType: vehicleType || 'flatbed',
                        capacity: vehicleCount || 1,
                        serviceArea: Array.isArray(cities) ? cities.join(',') : cities,
                        pricePerKm: null,
                        availableDays: finalAvailableDays,
                        contactPhone: finalContactPhone,
                        images: finalImages,
                        features: '',
                        commission: 0,
                        status: 'ACTIVE',
                        featured: !!(promotionPackage && promotionPackage !== 'free'),
                        promotionPackage: promotionPackage || 'free',
                        promotionDays: promotionDays ? parseInt(String(promotionDays)) : 0,
                        promotionStartDate,
                        promotionEndDate,
                        promotionPriority,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                });

                // تسجيل النشاط (اختياري - لا يفشل العملية الرئيسية)
                try {
                    await prisma.admin_activities.create({
                        data: {
                            id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                            admin_id: auth.adminId,
                            action: 'CREATE_TRANSPORT',
                            resource_type: 'transport_service',
                            resource_id: serviceId,
                            success: true,
                        },
                    });
                } catch (activityError) {
                    console.warn('تعذر تسجيل النشاط:', activityError);
                }

                return res.status(201).json({
                    success: true,
                    message: 'تم إنشاء خدمة النقل بنجاح',
                    service: newService,
                });
            }

            case 'DELETE': {
                const { id } = req.query;
                const { ids } = req.body || {};

                // حذف متعدد
                if (ids && Array.isArray(ids) && ids.length > 0) {
                    const result = await prisma.transport_services.updateMany({
                        where: { id: { in: ids } },
                        data: {
                            status: 'INACTIVE',
                            updatedAt: new Date(),
                        },
                    });

                    // تسجيل النشاط للحذف المتعدد
                    try {
                        await prisma.admin_activities.create({
                            data: {
                                id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                                admin_id: auth.adminId,
                                action: 'BULK_DEACTIVATE_TRANSPORT',
                                resource_type: 'transport_service',
                                resource_id: ids.join(','),
                                success: true,
                            },
                        });
                    } catch (activityError) {
                        console.warn('تعذر تسجيل النشاط:', activityError);
                    }

                    return res.status(200).json({
                        success: true,
                        message: `تم تعطيل ${result.count} خدمة`,
                        deletedCount: result.count,
                    });
                }

                // حذف فردي
                if (!id) {
                    return res.status(400).json({ success: false, message: 'معرف الخدمة مطلوب' });
                }

                await prisma.transport_services.update({
                    where: { id: id as string },
                    data: {
                        status: 'INACTIVE',
                        updatedAt: new Date(),
                    },
                });

                try {
                    await prisma.admin_activities.create({
                        data: {
                            id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                            admin_id: auth.adminId,
                            action: 'DEACTIVATE_TRANSPORT',
                            resource_type: 'transport_service',
                            resource_id: id as string,
                            success: true,
                        },
                    });
                } catch (activityError) {
                    console.warn('تعذر تسجيل النشاط:', activityError);
                }

                return res.status(200).json({
                    success: true,
                    message: 'تم تعطيل الخدمة',
                    deletedCount: 1,
                });
            }

            default:
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Transport API error:', error);
        // إرسال تفاصيل الخطأ في بيئة التطوير
        const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في الخادم';
        const errorStack = error instanceof Error ? error.stack : undefined;

        return res.status(500).json({
            success: false,
            message: errorMessage,
            ...(process.env.NODE_ENV === 'development' && { stack: errorStack }),
        });
    }
}
