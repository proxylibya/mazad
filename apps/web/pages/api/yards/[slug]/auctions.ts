/**
 * API مزادات الساحة المتقدم
 * Yard Auctions API with Tabs Support
 * يدعم التبويبات: مباشر، قادم، تم البيع، منتهي
 */

import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

// تحديد حالة المزاد بناءً على التواريخ والحالة
function getAuctionStatus(auction: {
    status: string;
    startDate: Date | null;
    endDate: Date | null;
    cars?: { status: string; } | null;
}): 'live' | 'upcoming' | 'sold' | 'ended' {
    const now = new Date();
    const startDate = auction.startDate ? new Date(auction.startDate) : null;
    const endDate = auction.endDate ? new Date(auction.endDate) : null;
    const status = auction.status?.toUpperCase() || '';
    const carStatus = auction.cars?.status || '';

    // ✅ أولاً: فحص الحالات المُحددة صراحة
    // السيارة مباعة
    if (status === 'SOLD' || status === 'COMPLETED' || carStatus === 'SOLD') {
        return 'sold';
    }

    // مزاد منتهي أو ملغي
    if (status === 'ENDED' || status === 'CANCELLED' || status === 'EXPIRED') {
        return 'ended';
    }

    // ✅ ثانياً: فحص التواريخ للمزادات النشطة/المعلقة
    // إذا كان المزاد قادم (لم يبدأ بعد)
    if (startDate && startDate > now) {
        return 'upcoming';
    }

    // إذا انتهى وقت المزاد ولكن الحالة لم تُحدث بعد
    if (endDate && endDate < now) {
        return 'ended';
    }

    // المزاد مباشر (نشط) - بدأ ولم ينتهِ
    if (status === 'ACTIVE' && startDate && startDate <= now && endDate && endDate > now) {
        return 'live';
    }

    // المزاد ACTIVE ولكن بدون تواريخ واضحة
    if (status === 'ACTIVE') {
        return 'live';
    }

    // المزاد PENDING أو UPCOMING أو SCHEDULED
    if (status === 'PENDING' || status === 'UPCOMING' || status === 'SCHEDULED') {
        return 'upcoming';
    }

    // افتراضي: قادم
    return 'upcoming';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { slug } = req.query;
    const {
        tab = 'all', // all, live, upcoming, sold, ended
        page = '1',
        limit = '20',
        search = '',
        brand = '',
        sortBy = 'createdAt',
        sortOrder = 'desc',
    } = req.query;

    if (!slug || typeof slug !== 'string') {
        return res.status(400).json({ success: false, error: 'معرف الساحة مطلوب' });
    }

    // Decode URL-encoded slug (handles Arabic characters)
    let decodedSlug: string;
    try {
        decodedSlug = decodeURIComponent(slug);
    } catch {
        decodedSlug = slug;
    }

    console.log('[Yard Auctions API] Looking for yard:', { slug, decodedSlug });

    try {
        // جلب الساحة أولاً - بحث مرن
        const yard = await prisma.yards.findFirst({
            where: {
                OR: [
                    { slug: decodedSlug },
                    { id: decodedSlug },
                    { slug: slug },
                    { slug: { contains: decodedSlug.split('-').pop() || '' } },
                ],
            },
        });

        console.log('[Yard Auctions API] Found yard:', yard?.id, yard?.name);

        if (!yard) {
            return res.status(404).json({ success: false, error: 'الساحة غير موجودة' });
        }

        // بناء شرط البحث
        const whereConditions: any[] = [{ yardId: yard.id }];

        // فلتر البحث
        if (search && typeof search === 'string' && search.trim()) {
            whereConditions.push({
                OR: [
                    { title: { contains: search, mode: 'insensitive' } },
                    { cars: { brand: { contains: search, mode: 'insensitive' } } },
                    { cars: { model: { contains: search, mode: 'insensitive' } } },
                ]
            });
        }

        // فلتر الماركة
        if (brand && typeof brand === 'string' && brand.trim()) {
            whereConditions.push({
                cars: { brand: { equals: brand, mode: 'insensitive' } }
            });
        }

        // جلب جميع المزادات لحساب الإحصائيات
        const allAuctions = await prisma.auctions.findMany({
            where: { yardId: yard.id },
            select: {
                id: true,
                status: true,
                startDate: true,
                endDate: true,
                cars: {
                    select: { status: true }
                }
            },
        });

        // حساب الإحصائيات حسب الحالة
        const stats = {
            total: allAuctions.length,
            live: 0,
            upcoming: 0,
            sold: 0,
            ended: 0,
        };

        allAuctions.forEach((auction) => {
            const status = getAuctionStatus(auction);
            stats[status]++;
        });

        // تحديد فلتر الحالة بناءً على التبويب
        const now = new Date();

        if (tab === 'live') {
            // ACTIVE auctions that have started and not ended
            whereConditions.push({
                status: 'ACTIVE',
                startDate: { lte: now },
                endDate: { gt: now }
            });
        } else if (tab === 'upcoming') {
            // PENDING/UPCOMING auctions that haven't started yet
            whereConditions.push({
                OR: [
                    { status: { in: ['PENDING', 'UPCOMING'] } },
                    {
                        status: 'ACTIVE',
                        startDate: { gt: now }
                    }
                ]
            });
        } else if (tab === 'sold') {
            // البحث عن السيارات المباعة أو المزادات المنتهية مع سيارة مباعة
            whereConditions.push({
                OR: [{ status: 'ENDED' }]
            });
            whereConditions.push({
                cars: { status: 'SOLD' }
            });
        } else if (tab === 'ended') {
            // المزادات المنتهية أو الملغاة والتي ليست مباعة
            whereConditions.push({
                status: { in: ['ENDED', 'CANCELLED', 'SUSPENDED'] }
            });
            whereConditions.push({
                cars: { status: { not: 'SOLD' } }
            });
        }
        // tab === 'all' لا يحتاج فلتر إضافي

        const baseWhere = { AND: whereConditions };

        // الترتيب
        const orderByField = sortBy === 'price' ? 'currentPrice' : sortBy === 'endDate' ? 'endDate' : 'createdAt';
        const orderByDirection = sortOrder === 'asc' ? 'asc' : 'desc';

        // الترقيم
        const pageNum = Math.max(1, parseInt(page as string) || 1);
        const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
        const skip = (pageNum - 1) * limitNum;

        // جلب المزادات مع التفاصيل
        const [auctions, totalCount] = await Promise.all([
            prisma.auctions.findMany({
                where: baseWhere,
                include: {
                    cars: {
                        select: {
                            id: true,
                            brand: true,
                            model: true,
                            year: true,
                            mileage: true,
                            condition: true,
                            images: true,
                            fuelType: true,
                            transmission: true,
                            location: true,
                        },
                    },
                    users: {
                        select: {
                            id: true,
                            name: true,
                            verified: true,
                        },
                    },
                    bids: {
                        orderBy: { amount: 'desc' },
                        take: 1,
                        select: {
                            amount: true,
                            users: {
                                select: { name: true },
                            },
                        },
                    },
                    _count: {
                        select: { bids: true },
                    },
                },
                orderBy: { [orderByField]: orderByDirection },
                skip,
                take: limitNum,
            }),
            prisma.auctions.count({ where: baseWhere }),
        ]);

        // تحويل البيانات للعرض
        const transformedAuctions = auctions.map((auction) => {
            // تحليل صور السيارة
            let carImages: string[] = [];
            if (auction.cars?.images) {
                try {
                    if (typeof auction.cars.images === 'string') {
                        carImages = JSON.parse(auction.cars.images);
                    } else if (Array.isArray(auction.cars.images)) {
                        carImages = auction.cars.images as string[];
                    }
                } catch {
                    carImages = [];
                }
            }

            const auctionStatus = getAuctionStatus(auction);
            const highestBid = auction.bids?.[0];

            return {
                id: auction.id,
                title: auction.title || `${auction.cars?.brand || ''} ${auction.cars?.model || ''}`.trim() || 'مزاد',
                description: auction.description,
                currentPrice: auction.currentPrice || auction.startPrice || 0,
                startPrice: auction.startPrice || 0,
                minimumBid: auction.minimumBid || 500,
                startDate: auction.startDate?.toISOString() || '',
                endDate: auction.endDate?.toISOString() || '',
                status: auction.status,
                displayStatus: auctionStatus,
                featured: auction.featured,
                views: auction.views || 0,
                totalBids: auction._count?.bids || auction.totalBids || 0,
                images: carImages.length > 0 ? carImages : ['/placeholder.svg'],
                highestBidder: highestBid?.users?.name || null,
                car: auction.cars
                    ? {
                        id: auction.cars.id,
                        brand: auction.cars.brand,
                        model: auction.cars.model,
                        year: auction.cars.year,
                        mileage: auction.cars.mileage,
                        condition: auction.cars.condition,
                        fuelType: auction.cars.fuelType,
                        transmission: auction.cars.transmission,
                        location: auction.cars.location,
                    }
                    : null,
                seller: auction.users
                    ? {
                        id: auction.users.id,
                        name: auction.users.name,
                        verified: auction.users.verified,
                    }
                    : null,
            };
        });

        // استخراج قائمة الماركات المتاحة
        const brands = await prisma.auctions.findMany({
            where: { yardId: yard.id },
            select: {
                cars: {
                    select: { brand: true },
                },
            },
            distinct: ['carId'],
        });

        const uniqueBrands = [...new Set(brands.map((a) => a.cars?.brand).filter(Boolean))];

        return res.status(200).json({
            success: true,
            data: {
                auctions: transformedAuctions,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total: totalCount,
                    totalPages: Math.ceil(totalCount / limitNum),
                },
                stats,
                filters: {
                    brands: uniqueBrands,
                },
                yard: {
                    id: yard.id,
                    slug: yard.slug,
                    name: yard.name,
                },
            },
        });
    } catch (error) {
        console.error('[Yard Auctions API Error]:', error);
        console.error('[Yard Auctions API] Slug:', slug);
        console.error('[Yard Auctions API] Decoded Slug:', decodeURIComponent(slug));

        const errorMessage = error instanceof Error ? error.message : String(error);

        return res.status(500).json({
            success: false,
            error: 'حدث خطأ في جلب البيانات',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        });
    }
}
