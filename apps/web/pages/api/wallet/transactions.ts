import { verifyToken } from '@/lib/auth/jwtUtils';
import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface AuthTokenPayload {
  userId: string;
  [key: string]: unknown;
}

// محاولة استيراد keydb بشكل آمن
let keydb: any = null;
try {
  keydb = require('@/lib/cache/keydb-unified').keydb;
} catch {
  // keydb غير متاح
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    // التحقق من المصادقة باستخدام JWT
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'غير مصرح - سجل الدخول أولاً' });
    }

    const decoded = verifyToken<AuthTokenPayload>(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, error: 'توكن غير صالح' });
    }

    const userId = decoded.userId;
    const { walletType, limit = 10, page = 1 } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const cacheKey = `wallet:transactions:${userId}:${walletType || 'all'}:${page}`;

    // محاولة الحصول على البيانات من الذاكرة المؤقتة (آمن)
    if (keydb) {
      try {
        const cached = await keydb.get(cacheKey);
        if (cached) {
          return res.status(200).json({ success: true, ...cached });
        }
      } catch {
        // تجاهل أخطاء الـ cache
      }
    }

    // بناء شروط البحث
    const where: any = {};

    // الحصول على المعاملات من قاعدة البيانات
    const wallet = await prisma.wallets.findUnique({
      where: { userId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            publicId: true,
          },
        },
      },
    });

    if (!wallet) {
      return res.status(404).json({ success: false, error: 'المحفظة غير موجودة' });
    }

    where.walletId = wallet.id;
    if (walletType) {
      where.walletType = walletType;
    }

    const [transactions, total] = await Promise.all([
      prisma.transactions.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.transactions.count({ where }),
    ]);

    const result = {
      transactions: transactions.map(t => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        currency: t.currency,
        walletType: t.walletType,
        status: t.status,
        description: t.description,
        reference: t.reference,
        createdAt: t.createdAt,
        user: wallet.users
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    };

    // حفظ في الذاكرة المؤقتة لمدة دقيقة واحدة (آمن)
    if (keydb) {
      try {
        await keydb.set(cacheKey, result, { ttl: 60 });
      } catch {
        // تجاهل أخطاء الـ cache
      }
    }

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('Error fetching wallet transactions:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}
