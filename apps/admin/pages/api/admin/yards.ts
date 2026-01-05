import type { NextApiRequest, NextApiResponse } from 'next';

// Prisma client singleton
import { prisma } from '@/lib/prisma';

// ===== API إدارة الساحات =====
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        switch (req.method) {
            case 'GET':
                return await getYards(req, res);
            case 'POST':
                return await createYard(req, res);
            case 'PUT':
                return await updateYard(req, res);
            case 'DELETE':
                return await deleteYard(req, res);
            default:
                return res.status(405).json({ success: false, error: 'Method not allowed' });
        }
    } catch (error) {
        console.error('[Yards API Error]:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'حدث خطأ في الخادم'
        });
    }
}

// جلب جميع الساحات أو ساحة واحدة بمعرفها
async function getYards(req: NextApiRequest, res: NextApiResponse) {
    const { id, status, city, search, page = '1', limit = '10' } = req.query;

    // إذا تم تمرير id، جلب ساحة واحدة
    if (id && typeof id === 'string') {
        const yard = await prisma.yards.findUnique({
            where: { id },
            include: {
                manager: {
                    select: { id: true, name: true, phone: true }
                },
                _count: {
                    select: { auctions: true }
                }
            },
        });

        if (!yard) {
            return res.status(404).json({ success: false, error: 'الساحة غير موجودة' });
        }

        return res.status(200).json({
            success: true,
            data: [{
                ...yard,
                auctionsCount: yard._count.auctions,
                _count: undefined,
            }],
        });
    }

    // جلب جميع الساحات مع فلاتر
    const where: any = {};

    if (status && status !== 'all') {
        where.status = status;
    }

    if (city && city !== 'all') {
        where.city = city as string;
    }

    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { city: { contains: search as string, mode: 'insensitive' } },
            { address: { contains: search as string, mode: 'insensitive' } },
        ];
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
    const take = parseInt(limit as string);

    const [yards, total] = await Promise.all([
        prisma.yards.findMany({
            where,
            include: {
                manager: {
                    select: { id: true, name: true, phone: true }
                },
                _count: {
                    select: { auctions: true }
                }
            },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            skip,
            take,
        }),
        prisma.yards.count({ where }),
    ]);

    // حساب الإحصائيات
    const stats = await prisma.yards.groupBy({
        by: ['status'],
        _count: true,
    });

    const statsMap = {
        total,
        active: stats.find(s => s.status === 'ACTIVE')?._count || 0,
        inactive: stats.find(s => s.status === 'INACTIVE')?._count || 0,
    };

    return res.status(200).json({
        success: true,
        data: yards.map(yard => ({
            ...yard,
            auctionsCount: yard._count.auctions,
            _count: undefined,
        })),
        pagination: {
            page: parseInt(page as string),
            limit: parseInt(limit as string),
            total,
            totalPages: Math.ceil(total / parseInt(limit as string)),
        },
        stats: statsMap,
    });
}

// إنشاء ساحة جديدة
async function createYard(req: NextApiRequest, res: NextApiResponse) {
    const {
        name,
        description,
        city,
        area,
        address,
        phone,
        phones,
        email,
        auctionDays,
        auctionTimeFrom,
        auctionTimeTo,
        workingHours,
        capacity,
        services,
        vehicleTypes,
        image,
        images,
        managerId,
        managerName,
        managerPhone,
        latitude,
        longitude,
    } = req.body;

    if (!name || !city) {
        return res.status(400).json({
            success: false,
            error: 'اسم الساحة والمدينة مطلوبان'
        });
    }

    // إنشاء slug من الاسم
    const slug = name
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\u0600-\u06FFa-z0-9-]/g, '')
        + '-' + Date.now().toString(36);

    const yard = await prisma.yards.create({
        data: {
            slug,
            name,
            description,
            city,
            area,
            address,
            phone,
            phones: phones || [],
            email,
            auctionDays: auctionDays || [],
            auctionTimeFrom,
            auctionTimeTo,
            workingHours,
            capacity: capacity ? parseInt(capacity) : null,
            services: services || [],
            vehicleTypes: vehicleTypes || [],
            image,
            images: images || [],
            managerId,
            managerName,
            managerPhone,
            latitude: latitude ? parseFloat(latitude) : null,
            longitude: longitude ? parseFloat(longitude) : null,
            status: 'ACTIVE', // المدير ينشئ الساحة - نشطة مباشرة
            verified: true, // موثقة تلقائياً من المدير
        },
    });

    return res.status(201).json({
        success: true,
        data: yard,
        message: 'تم إنشاء الساحة وتفعيلها بنجاح',
    });
}

// تحديث ساحة
async function updateYard(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const updateData = req.body;

    if (!id) {
        return res.status(400).json({ success: false, error: 'معرف الساحة مطلوب' });
    }

    // التحقق من وجود الساحة
    const existing = await prisma.yards.findUnique({ where: { id: id as string } });
    if (!existing) {
        return res.status(404).json({ success: false, error: 'الساحة غير موجودة' });
    }

    // تنظيف البيانات
    const cleanData: any = {};
    const allowedFields = [
        'name', 'description', 'city', 'area', 'address', 'phone', 'phones',
        'email', 'auctionDays', 'auctionTimeFrom', 'auctionTimeTo', 'workingHours',
        'capacity', 'services', 'vehicleTypes', 'image', 'images', 'status',
        'verified', 'featured', 'managerId', 'managerName', 'managerPhone',
        'latitude', 'longitude', 'sortOrder'
    ];

    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            cleanData[field] = updateData[field];
        }
    }

    // تحويل الأرقام
    if (cleanData.capacity) cleanData.capacity = parseInt(cleanData.capacity);
    if (cleanData.latitude) cleanData.latitude = parseFloat(cleanData.latitude);
    if (cleanData.longitude) cleanData.longitude = parseFloat(cleanData.longitude);
    if (cleanData.sortOrder !== undefined) cleanData.sortOrder = parseInt(cleanData.sortOrder);

    const yard = await prisma.yards.update({
        where: { id: id as string },
        data: cleanData,
    });

    return res.status(200).json({
        success: true,
        data: yard,
        message: 'تم تحديث الساحة بنجاح',
    });
}

// حذف ساحة
async function deleteYard(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;

    if (!id) {
        return res.status(400).json({ success: false, error: 'معرف الساحة مطلوب' });
    }

    // التحقق من وجود مزادات نشطة أو قادمة
    const activeAuctionsCount = await prisma.auctions.count({
        where: {
            yardId: id as string,
            status: { in: ['ACTIVE', 'PENDING', 'UPCOMING'] }
        }
    });

    if (activeAuctionsCount > 0) {
        return res.status(400).json({
            success: false,
            error: `لا يمكن حذف الساحة لأنها تحتوي على ${activeAuctionsCount} مزاد نشط أو قادم`
        });
    }

    // فك ارتباط المزادات المنتهية (إن وجدت)
    await prisma.auctions.updateMany({
        where: { yardId: id as string },
        data: { yardId: null }
    });

    await prisma.yards.delete({ where: { id: id as string } });

    return res.status(200).json({
        success: true,
        message: 'تم حذف الساحة بنجاح',
    });
}
