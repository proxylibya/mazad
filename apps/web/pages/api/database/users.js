import { prisma } from '@/lib/prisma';
import { decodeApiResponse } from '@/utils/universalNameDecoder';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { page = 1, limit = 10, search = '', accountType = '', verified = '' } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // بناء شروط البحث
    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    if (accountType) {
      where.accountType = accountType;
    }

    if (verified !== '') {
      where.verified = verified === 'true';
    }

    // جلب المستخدمين مع البيانات المرتبطة
    const users = await prisma.users.findMany({
      where,
      skip,
      take,
      include: {
        wallets: {
          include: {
            local_wallets: true,
            global_wallets: true,
            crypto_wallets: true,
          },
        },
        user_settings: {
          select: {
            profileName: true,
            profileBio: true,
            profileCity: true,
            profileAvatar: true,
            theme: true,
            timezone: true,
          },
        },
        transport_profiles: {
          select: {
            truckNumber: true,
            truckType: true,
            capacity: true,
            serviceArea: true,
            verified: true,
          },
        },
        _count: {
          select: {
            cars: true,
            auctions: true,
            bids: true,
            messages: true,
            transport_services: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // جلب العدد الإجمالي للمستخدمين
    const totalUsers = await prisma.users.count({ where });

    // تنسيق البيانات
    const formattedUsers = users.map((user) => ({
      id: user.id,
      name: user.name,
      phone: user.phone,
      role: user.role,
      accountType: user.accountType,
      verified: user.verified,
      status: user.status,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,

      // بيانات المحفظة
      wallet: user.wallets
        ? {
            id: user.wallets.id,
            isActive: user.wallets.isActive,
            localBalance: user.wallets.local_wallets?.balance || 0,
            globalBalance: user.wallets.global_wallets?.balance || 0,
            cryptoBalance: user.wallets.crypto_wallets?.balance || 0,
            totalBalance: {
              LYD: user.wallets.local_wallets?.balance || 0,
              USD: user.wallets.global_wallets?.balance || 0,
              USDT: user.wallets.crypto_wallets?.balance || 0,
            },
          }
        : null,

      // الإعدادات الشخصية
      profile: user.user_settings
        ? {
            name: user.user_settings.profileName,
            bio: user.user_settings.profileBio,
            city: user.user_settings.profileCity,
            avatar: user.user_settings.profileAvatar,
            theme: user.user_settings.theme,
            timezone: user.user_settings.timezone,
          }
        : null,

      // بيانات النقل (إن وجدت)
      transport: user.transport_profiles
        ? {
            truckNumber: user.transport_profiles.truckNumber,
            truckType: user.transport_profiles.truckType,
            capacity: user.transport_profiles.capacity,
            serviceArea: user.transport_profiles.serviceArea,
            verified: user.transport_profiles.verified,
          }
        : null,

      // الإحصائيات
      stats: {
        cars: user._count.cars,
        auctions: user._count.auctions,
        bids: user._count.bids,
        messages: user._count.messages,
        transportServices: user._count.transport_services,
        totalActivity:
          user._count.cars + user._count.auctions + user._count.bids + user._count.messages,
      },
    }));

    // معلومات التصفح
    const pagination = {
      currentPage: parseInt(page),
      totalPages: Math.ceil(totalUsers / take),
      totalUsers,
      hasNextPage: skip + take < totalUsers,
      hasPrevPage: parseInt(page) > 1,
    };

    // فك تشفير جميع أسماء المستخدمين قبل الإرجاع
    const response = {
      success: true,
      data: formattedUsers,
      pagination,
      filters: {
        search,
        accountType,
        verified,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        recordsReturned: formattedUsers.length,
      },
    };

    const decodedResponse = decodeApiResponse(response);
    res.status(200).json(decodedResponse);
  } catch (error) {
    console.error('خطأ في جلب بيانات المستخدمين:', error);
    res.status(500).json({
      success: false,
      error: 'خطأ في جلب بيانات المستخدمين',
      details: error.message,
    });
  }
}
