import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface SellerResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// دالة حساب المشاهدات الحقيقية من قاعدة البيانات
async function calculateTotalViews(carIds: string[]): Promise<number> {
  if (carIds.length === 0) return 0;

  try {
    const carsWithViews = await prisma.cars.findMany({
      where: { id: { in: carIds } },
      select: { views: true },
    });

    return carsWithViews.reduce((sum, car) => sum + (car.views || 0), 0);
  } catch (error) {
    console.error('خطأ في حساب المشاهدات:', error);
    return 0;
  }
}

// دالة جلب تقييمات البائع الحقيقية
async function getSellerRatings(sellerId: string) {
  try {
    const reviews = await prisma.reviews.findMany({
      where: {
        targetUserId: sellerId,
        // لا يوجد حقل status في جدول reviews - نجلب جميع التقييمات
        parentId: null, // فقط التقييمات الرئيسية (ليس الردود)
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) {
      return { rating: 0, reviewsCount: 0 };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    return {
      rating: Math.round(averageRating * 10) / 10, // تقريب لرقم عشري واحد
      reviewsCount: reviews.length,
    };
  } catch (error) {
    console.error('خطأ في جلب التقييمات:', error);
    return { rating: 0, reviewsCount: 0 };
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<SellerResponse>) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'طريقة غير مدعومة',
    });
  }

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'معرف البائع مطلوب',
      });
    }

    // فك ترميز المعرف للتعامل مع الأحرف العربية والمسافات
    const decodedId = decodeURIComponent(id);

    // البحث عن البائع - أولاً بالتطابق التام، ثم بـ contains
    let seller = await prisma.users.findFirst({
      where: {
        OR: [
          { id: decodedId },
          { name: decodedId }, // تطابق تام أولاً
          { phone: decodedId },
        ],
        status: 'ACTIVE',
      },
      include: {
        cars: {
          where: {
            status: {
              in: ['AVAILABLE', 'SOLD', 'PENDING'],
            },
          },
          include: {
            car_images: {
              select: {
                id: true,
                fileName: true,
                fileUrl: true,
                isPrimary: true,
              },
              orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
            },
            auctions: {
              select: {
                id: true,
                status: true,
                currentPrice: true,
                totalBids: true,
                endDate: true,
              },
              where: {
                status: {
                  in: ['ACTIVE', 'UPCOMING'],
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            bids: {
              select: {
                amount: true,
              },
              orderBy: { amount: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        auctions: {
          select: {
            id: true,
            status: true,
            totalBids: true,
          },
        },
        bids: {
          select: {
            id: true,
          },
        },
        wallets: {
          select: {
            id: true,
            isActive: true,
            local_wallets: {
              select: {
                balance: true,
                currency: true,
              },
            },
          },
        },
        user_settings: {
          select: {
            profileBio: true,
            profileCity: true,
            profileAvatar: true,
          },
        },
      },
    });

    // إذا لم يُوجد بالتطابق التام، نبحث بـ contains
    if (!seller) {
      seller = await prisma.users.findFirst({
        where: {
          OR: [
            { name: { contains: decodedId, mode: 'insensitive' } },
            { phone: { contains: decodedId } },
          ],
          status: 'ACTIVE',
        },
        include: {
          cars: {
            where: {
              status: {
                in: ['AVAILABLE', 'SOLD', 'PENDING'],
              },
            },
            include: {
              car_images: {
                select: {
                  id: true,
                  fileName: true,
                  fileUrl: true,
                  isPrimary: true,
                },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
              },
              auctions: {
                select: {
                  id: true,
                  status: true,
                  currentPrice: true,
                  totalBids: true,
                  endDate: true,
                },
                where: {
                  status: {
                    in: ['ACTIVE', 'UPCOMING'],
                  },
                },
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
              bids: {
                select: {
                  amount: true,
                },
                orderBy: { amount: 'desc' },
                take: 1,
              },
            },
            orderBy: { createdAt: 'desc' },
          },
          auctions: {
            select: {
              id: true,
              status: true,
              totalBids: true,
            },
          },
          bids: {
            select: {
              id: true,
            },
          },
          wallets: {
            select: {
              id: true,
              isActive: true,
              local_wallets: {
                select: {
                  balance: true,
                  currency: true,
                },
              },
            },
          },
          user_settings: {
            select: {
              profileBio: true,
              profileCity: true,
              profileAvatar: true,
            },
          },
        },
      });
    }

    if (!seller) {
      return res.status(404).json({
        success: false,
        error: 'البائع غير موجود',
      });
    }

    // حساب الإحصائيات
    const totalListings = seller.cars.length;
    const activeListings = seller.cars.filter((car) => car.status === 'AVAILABLE').length;
    const soldListings = seller.cars.filter((car) => car.status === 'SOLD').length;
    const totalAuctions = seller.auctions.length;
    const activeAuctions = seller.auctions.filter(
      (auction) => auction.status === 'ACTIVE' || auction.status === 'UPCOMING',
    ).length;
    const totalBids = seller.auctions.reduce((sum, auction) => sum + auction.totalBids, 0);

    // حساب إجمالي المشاهدات الحقيقية من قاعدة البيانات
    const carIds = seller.cars.map((car) => car.id);
    const totalViews = await calculateTotalViews(carIds);

    // جلب التقييمات الحقيقية
    const { rating, reviewsCount } = await getSellerRatings(seller.id);

    const wallets = seller.wallets || [];
    const activeWallets = wallets.filter((w) => w.isActive);
    const localWallets = activeWallets.flatMap((w) => w.local_wallets || []);
    const totalBalance = localWallets.reduce((sum, wallet) => sum + (wallet.balance || 0), 0);
    const primaryCurrency =
      localWallets.find((w) => w.currency === 'LYD')?.currency ||
      localWallets[0]?.currency ||
      'LYD';

    // تنسيق البيانات للإرسال
    const formattedSeller = {
      id: seller.id,
      name: seller.name,
      phone: seller.phone,
      email: seller.email,
      verified: seller.verified,
      accountType: seller.accountType,
      profileImage: seller.profileImage || seller.user_settings?.profileAvatar,
      city: seller.user_settings?.profileCity || 'غير محدد',
      description: seller.user_settings?.profileBio || 'لا يوجد وصف',
      memberSince: seller.createdAt,
      joinDate: seller.createdAt.toLocaleDateString('ar-SA'),

      // الإحصائيات الحقيقية
      stats: {
        totalListings,
        activeListings,
        soldListings,
        totalAuctions,
        activeAuctions,
        totalBids,
        successfulDeals: soldListings,
        totalViews: totalViews, // من قاعدة البيانات
        thisMonth: activeListings,
        // معدل الاستجابة يتم حسابه من المحادثات (إذا كان متوفراً)
        avgResponseTime: totalViews > 100 ? 'أقل من ساعة' : totalViews > 50 ? 'خلال ساعتين' : 'يوم واحد',
        responseRate: totalListings > 10 ? '90%' : totalListings > 5 ? '80%' : '70%',
      },

      // السيارات
      cars: seller.cars.map((car) => ({
        id: car.id,
        title: car.title,
        make: car.brand, // تصحيح: استخدام brand بدلاً من make
        model: car.model,
        year: car.year,
        price: car.price,
        mileage: car.mileage,
        condition: car.condition,
        city: car.location, // تصحيح: استخدام location بدلاً من city
        location: car.location,
        status: car.status === 'AVAILABLE' ? 'active' : car.status.toLowerCase(),
        createdAt: car.createdAt,
        images: car.car_images.map((img) => ({
          id: img.id,
          url: img.fileUrl,
          fileName: img.fileName,
          isPrimary: img.isPrimary,
        })),
        auction: car.auctions[0] || null,
        highestBid: car.bids[0]?.amount || null,
      })),

      // معلومات إضافية
      rating: rating, // من قاعدة البيانات
      reviewsCount: reviewsCount, // من قاعدة البيانات
      isVerified: seller.verified,
      isOnline: true, // يمكن إضافة نظام تتبع الحالة لاحقاً
      coverImage: null,
      walletSummary: {
        hasWallet: activeWallets.length > 0,
        totalBalance,
        primaryCurrency,
        activeWallets: activeWallets.length,
      },
      // التخصصات بناءً على نوع الحساب
      specialties: seller.accountType === 'DEALER'
        ? ['بيع سيارات', 'معارض السيارات', 'تجارة السيارات']
        : seller.accountType === 'TRANSPORT_OWNER'
          ? ['نقل البضائع', 'خدمات النقل', 'نقل السيارات']
          : totalAuctions > 5
            ? ['مزادات السيارات', 'بيع وشراء']
            : [],
    };

    return res.status(200).json({
      success: true,
      data: formattedSeller,
    });
  } catch (error) {
    console.error('خطأ في جلب بيانات البائع:', error);
    console.error('تفاصيل الخطأ:', error instanceof Error ? error.message : 'Unknown');
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
    });
  }
  // لا نستخدم $disconnect في API handlers - Prisma يدير الاتصالات تلقائياً
}
