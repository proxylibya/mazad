import { verifyToken } from '@/lib/auth/jwtUtils';
import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

// محاولة استيراد keydb بشكل آمن
let keydb: any = null;
try {
  keydb = require('@/lib/cache/keydb-unified').keydb;
} catch {
  // keydb غير متاح - سنستمر بدونه
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

    const decoded = verifyToken(token);
    if (!decoded || !(decoded as any).userId) {
      return res.status(401).json({ success: false, error: 'توكن غير صالح' });
    }

    const userId = String((decoded as any).userId);
    const cacheKey = `wallet:balance:${userId}`;

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

    // الحصول على بيانات المحفظة من قاعدة البيانات
    const wallet = (await prisma.wallets.findUnique({
      where: { userId },
      include: {
        local_wallets: true,
        global_wallets: true,
        crypto_wallets: true
      }
    })) as any;

    // إذا لم توجد محفظة، أرجع قيم افتراضية
    if (!wallet) {
      const defaultBalance = {
        success: true,
        totalBalance: { local: 0, global: 0, crypto: 0 },
        wallets: {
          local: { balance: 0, currency: 'LYD', label: 'دينار ليبي', isActive: false },
          global: { balance: 0, currency: 'USD', label: 'دولار أمريكي', isActive: false },
          crypto: { balance: 0, currency: 'USDT', label: 'USDT (TRC20)', isActive: false }
        },
        isActive: false,
        updatedAt: new Date().toISOString()
      };
      return res.status(200).json(defaultBalance);
    }

    const balanceData = {
      success: true,
      totalBalance: {
        local: wallet.local_wallets?.balance || 0,
        global: wallet.global_wallets?.balance || 0,
        crypto: wallet.crypto_wallets?.balance || 0
      },
      wallets: {
        local: {
          balance: wallet.local_wallets?.balance || 0,
          currency: 'LYD',
          label: 'دينار ليبي',
          isActive: wallet.local_wallets?.isActive || false
        },
        global: {
          balance: wallet.global_wallets?.balance || 0,
          currency: 'USD',
          label: 'دولار أمريكي',
          isActive: wallet.global_wallets?.isActive || false
        },
        crypto: {
          balance: wallet.crypto_wallets?.balance || 0,
          currency: 'USDT',
          label: 'USDT (TRC20)',
          address: wallet.crypto_wallets?.address,
          isActive: wallet.crypto_wallets?.isActive || false
        }
      },
      isActive: wallet.isActive,
      updatedAt: wallet.updatedAt
    };

    // حفظ في الذاكرة المؤقتة لمدة 5 دقائق (آمن)
    if (keydb) {
      try {
        await keydb.set(cacheKey, balanceData, { ttl: 300 });
      } catch {
        // تجاهل أخطاء الـ cache
      }
    }

    return res.status(200).json(balanceData);
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
}
