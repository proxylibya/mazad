import { prisma } from '@/lib/prisma';
import type { NextApiRequest, NextApiResponse } from 'next';

type NormalizedAuctionStatus =
  | 'PENDING'
  | 'UPCOMING'
  | 'ACTIVE'
  | 'ENDED'
  | 'CANCELLED'
  | 'SUSPENDED';

function normalizeAuctionStatus(input: unknown): NormalizedAuctionStatus | undefined {
  if (typeof input !== 'string') return undefined;
  const value = input.trim();
  if (!value) return undefined;

  const upper = value.toUpperCase();
  if (upper === 'ALL') return undefined;
  if (upper === 'LIVE') return 'ACTIVE';
  if (upper === 'COMPLETED') return 'ENDED';
  if (upper === 'CANCELED') return 'CANCELLED';

  switch (upper) {
    case 'PENDING':
    case 'UPCOMING':
    case 'ACTIVE':
    case 'ENDED':
    case 'CANCELLED':
    case 'SUSPENDED':
      return upper;
    default:
      return undefined;
  }
}

type AuctionSortField = 'createdAt' | 'startDate' | 'endDate' | 'currentPrice' | 'startPrice' | 'views';

function normalizeSortField(input: unknown): AuctionSortField {
  if (typeof input !== 'string') return 'createdAt';
  const value = input.trim();
  if (!value) return 'createdAt';

  const lower = value.toLowerCase();
  if (lower === 'starttime' || lower === 'startdate') return 'startDate';
  if (lower === 'endtime' || lower === 'enddate') return 'endDate';
  if (lower === 'currentbid' || lower === 'currentprice') return 'currentPrice';
  if (lower === 'startingbid' || lower === 'startprice') return 'startPrice';
  if (lower === 'views') return 'views';
  if (lower === 'createdat' || lower === 'newest') return 'createdAt';

  return 'createdAt';
}

function normalizeSortOrder(input: unknown): 'asc' | 'desc' {
  if (typeof input !== 'string') return 'desc';
  return input.toLowerCase() === 'asc' ? 'asc' : 'desc';
}

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed =
    typeof value === 'string' ? parseInt(value, 10) : typeof value === 'number' ? value : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function normalizeImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http') || trimmed.startsWith('/')) return trimmed;
  return `/images/cars/listings/${trimmed}`;
}

function parseLegacyImages(images: unknown): string[] {
  if (!images) return [];

  if (Array.isArray(images)) {
    return images
      .filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
      .map((img) => normalizeImageUrl(img));
  }

  if (typeof images !== 'string') return [];
  const raw = images.trim();
  if (!raw) return [];

  if (raw.startsWith('[')) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
          .map((img) => normalizeImageUrl(img));
      }
    } catch (_) { }
  }

  return raw
    .split(',')
    .map((img) => img.trim())
    .filter(Boolean)
    .map((img) => normalizeImageUrl(img));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      page = '1',
      pageSize = '20',
      sortBy = 'startTime',
      sortOrder = 'desc',
      search,
      status,
      minPrice,
      maxPrice,
      city,
      category,
      isLive,
      hasReserve,
      featured, // فلتر المميزة فقط
    } = req.query;

    const pageNum = parsePositiveInt(page, 1);
    const pageSizeNum = Math.min(100, parsePositiveInt(pageSize, 20));
    const sortField = normalizeSortField(sortBy);
    const sortDirection = normalizeSortOrder(sortOrder);

    // بناء filters
    // ✅ استبعاد مزادات الساحات - تظهر فقط في /yards/[slug]
    const filters: Record<string, any> = {
      yardId: null, // مزادات أونلاين فقط
    };

    const carWhere: Record<string, any> = {};

    if (search && typeof search === 'string' && search.trim()) {
      const searchValue = search.trim();
      carWhere.OR = [
        { title: { contains: searchValue, mode: 'insensitive' } },
        { brand: { contains: searchValue, mode: 'insensitive' } },
        { model: { contains: searchValue, mode: 'insensitive' } },
      ];
    }

    if (city && typeof city === 'string' && city.trim()) {
      carWhere.location = city.trim();
    }

    if (category && typeof category === 'string' && category.trim()) {
      carWhere.bodyType = category.trim();
    }

    if (Object.keys(carWhere).length > 0) {
      filters.cars = { is: carWhere };
    }

    const normalizedStatus = normalizeAuctionStatus(status);
    if (normalizedStatus) {
      filters.status = normalizedStatus;
    }

    const isLiveFlag = isLive === 'true' || isLive === '1';
    if (!normalizedStatus && !isLiveFlag) {
      filters.status = { not: 'CANCELLED' };
    }

    if (minPrice || maxPrice) {
      filters.currentPrice = {};
      if (typeof minPrice === 'string') {
        const parsedMin = parseFloat(minPrice);
        if (!Number.isNaN(parsedMin)) filters.currentPrice.gte = parsedMin;
      }
      if (typeof maxPrice === 'string') {
        const parsedMax = parseFloat(maxPrice);
        if (!Number.isNaN(parsedMax)) filters.currentPrice.lte = parsedMax;
      }
    }

    if (isLiveFlag) {
      const now = new Date();
      filters.startDate = { lte: now };
      filters.endDate = { gte: now };
      filters.status = 'ACTIVE';
    }

    // فلتر المميزة فقط
    if (featured === 'true') {
      filters.featured = true;
    }

    // استدعاء pagination مع include للـ car
    const { skip, take } = {
      skip: (pageNum - 1) * pageSizeNum,
      take: pageSizeNum,
    };

    // ترتيب المزادات المميزة أولاً، ثم حسب الترتيب المطلوب
    const orderBy: any = [{ featured: 'desc' as const }, { [sortField]: sortDirection }];

    const where = filters;

    const [data, total] = await Promise.all([
      prisma.auctions.findMany({
        skip,
        take,
        where,
        orderBy,
        include: {
          cars: {
            select: {
              id: true,
              title: true,
              brand: true,
              model: true,
              year: true,
              images: true,
              location: true,
              bodyType: true,
              condition: true,
              mileage: true,
              car_images: {
                take: 5,
                orderBy: { isPrimary: 'desc' },
                select: {
                  fileUrl: true,
                  isPrimary: true,
                },
              },
            },
          },
          users: {
            select: {
              id: true,
              name: true,
              phone: true,
              verified: true,
            },
          },
          _count: {
            select: {
              bids: true,
            },
          },
        },
      }),
      prisma.auctions.count({ where }),
    ]);

    const transformedAuctions = (data as any[]).map((auction: any) => {
      const carImagesArray = Array.isArray(auction.cars?.car_images) ? auction.cars.car_images : [];
      let imageUrls: string[] = carImagesArray
        .map((img: any) => (typeof img?.fileUrl === 'string' ? normalizeImageUrl(img.fileUrl) : ''))
        .filter((url: string) => Boolean(url));

      if (imageUrls.length === 0) {
        imageUrls = parseLegacyImages(auction.cars?.images);
      }

      if (imageUrls.length === 0) {
        imageUrls = ['/images/cars/default-car.svg'];
      }

      const normalizedCarImages = carImagesArray
        .filter((img: any) => img && typeof img.fileUrl === 'string' && img.fileUrl.trim())
        .map((img: any) => ({ ...img, fileUrl: normalizeImageUrl(img.fileUrl) }));

      const car = auction.cars
        ? {
          ...auction.cars,
          carImages: normalizedCarImages,
          images: imageUrls,
          car_images: undefined,
          city: auction.cars.location || '',
        }
        : null;

      return {
        ...auction,
        car,
        seller: auction.users || null,
        auctionStartTime: auction.startDate?.toISOString?.() || auction.startDate || null,
        auctionEndTime: auction.endDate?.toISOString?.() || auction.endDate || null,
        startTime: auction.startDate?.toISOString?.() || auction.startDate || null,
        endTime: auction.endDate?.toISOString?.() || auction.endDate || null,
        currentBid: auction.currentPrice || 0,
        startingBid: auction.startPrice || auction.currentPrice || 0,
        cars: undefined,
        users: undefined,
      };
    });

    const totalPages = Math.max(1, Math.ceil(total / pageSizeNum));

    const result = {
      data: transformedAuctions,
      total,
      page: pageNum,
      pageSize: pageSizeNum,
      totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
    };

    // إضافة cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching paginated auctions:', error);
    return res.status(500).json({ error: 'Failed to fetch auctions' });
  }
}
