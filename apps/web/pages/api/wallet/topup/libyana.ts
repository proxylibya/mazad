import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const ENCRYPTION_KEY = process.env.CARD_ENCRYPTION_KEY || 'sooq-mazad-card-encryption-32ch';

interface TopupRequest {
  cardNumber: string;
  provider: 'LIBYANA' | 'MADAR';
}

interface TopupResponse {
  success: boolean;
  message: string;
  data?: {
    amount: number;
    currency: string;
    transactionId: string;
    newBalance: number;
  };
  error?: string;
  code?: string;
}

// إنشاء hash للكرت للبحث السريع
function hashCardNumber(cardNumber: string): string {
  return crypto.createHash('sha256').update(cardNumber).digest('hex');
}

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

// الحصول على المستخدم من التوكن
async function getUserFromRequest(req: NextApiRequest): Promise<{ id: string; } | null> {
  try {
    const tokenFromCookie = req.cookies?.token;
    const authHeader = req.headers.authorization;
    const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const token = tokenFromCookie || tokenFromHeader;

    if (!token) return null;

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; };
    if (!decoded?.userId) return null;

    return { id: decoded.userId };
  } catch {
    return null;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TopupResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only POST method is allowed',
    });
  }

  try {
    // الحصول على المستخدم من التوكن
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'يجب تسجيل الدخول أولاً',
        error: 'Unauthorized',
        code: 'UNAUTHORIZED',
      });
    }

    const { cardNumber, provider }: TopupRequest = req.body;

    // التحقق من صحة البيانات
    if (!cardNumber || !provider) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير مكتملة',
        error: 'رقم الكرت ونوع المزود مطلوبان',
        code: 'INVALID_DATA',
      });
    }

    // تنظيف رقم الكرت
    const cleanCardNumber = cardNumber.replace(/\s/g, '');

    // التحقق من صحة رقم الكرت
    if (!/^\d{10,16}$/.test(cleanCardNumber)) {
      return res.status(400).json({
        success: false,
        message: 'رقم الكرت غير صالح',
        error: 'يجب أن يكون رقم الكرت بين 10 و 16 رقم',
        code: 'INVALID_CARD_NUMBER',
      });
    }

    // إنشاء hash للبحث عن الكرت
    const cardHash = hashCardNumber(cleanCardNumber);

    // البحث عن الكرت في قاعدة البيانات
    const card = await prisma.recharge_cards.findUnique({
      where: { cardHash },
    });

    // التحقق من وجود الكرت
    if (!card) {
      return res.status(400).json({
        success: false,
        message: 'رقم الكرت غير صحيح',
        error: 'الكرت غير موجود في النظام',
        code: 'CARD_NOT_FOUND',
      });
    }

    // التحقق من أن الكرت من نفس المزود
    if (card.provider !== provider) {
      return res.status(400).json({
        success: false,
        message: `هذا الكرت تابع لـ ${card.provider === 'LIBYANA' ? 'ليبيانا' : 'مدار'}`,
        error: 'Provider mismatch',
        code: 'PROVIDER_MISMATCH',
      });
    }

    // التحقق من حالة الكرت
    if (card.status === 'USED') {
      return res.status(400).json({
        success: false,
        message: 'هذا الكرت مستخدم مسبقاً',
        error: 'Card already used',
        code: 'CARD_ALREADY_USED',
      });
    }

    if (card.status === 'EXPIRED') {
      return res.status(400).json({
        success: false,
        message: 'انتهت صلاحية هذا الكرت',
        error: 'Card expired',
        code: 'CARD_EXPIRED',
      });
    }

    if (card.status === 'DISABLED') {
      return res.status(400).json({
        success: false,
        message: 'هذا الكرت معطل',
        error: 'Card disabled',
        code: 'CARD_DISABLED',
      });
    }

    if (card.status !== 'AVAILABLE') {
      return res.status(400).json({
        success: false,
        message: 'الكرت غير متاح حالياً',
        error: 'Card not available',
        code: 'CARD_NOT_AVAILABLE',
      });
    }

    // التحقق من صلاحية الكرت
    if (card.expiresAt && new Date(card.expiresAt) < new Date()) {
      // تحديث حالة الكرت إلى منتهي
      await prisma.recharge_cards.update({
        where: { id: card.id },
        data: { status: 'EXPIRED' },
      });
      return res.status(400).json({
        success: false,
        message: 'انتهت صلاحية هذا الكرت',
        error: 'Card expired',
        code: 'CARD_EXPIRED',
      });
    }

    const cardValue = card.value;

    // البحث عن المحفظة الرئيسية والمحلية
    let wallet = await prisma.wallets.findUnique({
      where: { userId: user.id },
      include: { local_wallets: true },
    });

    if (!wallet) {
      const now = new Date();
      wallet = await prisma.wallets.create({
        data: {
          id: genId('wallet'),
          userId: user.id,
          local_wallets: {
            create: { id: genId('local'), balance: 0, currency: 'LYD', updatedAt: now },
          },
          global_wallets: {
            create: { id: genId('global'), balance: 0, currency: 'USD', updatedAt: now },
          },
          crypto_wallets: {
            create: { id: genId('crypto'), balance: 0, currency: 'USDT-TRC20', network: 'TRC20', updatedAt: now },
          },
          updatedAt: now,
        },
        include: { local_wallets: true },
      });
    }

    if (!wallet.local_wallets) {
      await prisma.local_wallets.create({
        data: { id: genId('local'), walletId: wallet.id, balance: 0, currency: 'LYD', updatedAt: new Date() },
      });
      wallet = await prisma.wallets.findUnique({
        where: { id: wallet.id },
        include: { local_wallets: true },
      });
    }

    // تحديث رصيد المحفظة
    const currentBalance = wallet!.local_wallets?.balance || 0;
    const newBalance = currentBalance + cardValue;

    await prisma.local_wallets.update({
      where: { walletId: wallet!.id },
      data: { balance: newBalance },
    });

    // تحديث حالة الكرت إلى مستخدم
    await prisma.recharge_cards.update({
      where: { id: card.id },
      data: {
        status: 'USED',
        usedBy: user.id,
        usedAt: new Date(),
      },
    });

    // تحديث إحصائيات الدفعة
    if (card.batchId) {
      await prisma.card_batches.update({
        where: { id: card.batchId },
        data: {
          usedCards: { increment: 1 },
          usedValue: { increment: cardValue },
        },
      });
    }

    // إنشاء سجل المعاملة
    const transactionId = `${provider}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await prisma.transactions.create({
      data: {
        id: transactionId,
        walletId: wallet!.id,
        type: 'DEPOSIT',
        amount: cardValue,
        currency: 'LYD',
        walletType: 'LOCAL',
        status: 'COMPLETED',
        description: `شحن من كرت ${provider === 'LIBYANA' ? 'ليبيانا' : 'مدار'}`,
        metadata: {
          provider,
          cardId: card.id,
          cardLastFour: cleanCardNumber.slice(-4),
          denomination: card.denomination,
          processingTime: 'instant',
        },
        updatedAt: new Date(),
      },
    });

    // إنشاء إشعار للمستخدم
    try {
      await prisma.notifications.create({
        data: {
          id: genId('notif'),
          userId: user.id,
          title: 'تم شحن المحفظة بنجاح ✅',
          message: `تم إضافة ${cardValue} د.ل إلى محفظتك من كرت ${provider === 'LIBYANA' ? 'ليبيانا' : 'مدار'}`,
          type: 'DEPOSIT_COMPLETED',
          isRead: false,
          createdAt: new Date(),
        },
      });
    } catch (notificationError) {
      // تجاهل أخطاء الإشعارات
    }

    return res.status(200).json({
      success: true,
      message: 'تم شحن المحفظة بنجاح',
      data: {
        amount: cardValue,
        currency: 'LYD',
        transactionId,
        newBalance,
      },
    });
  } catch (error) {
    console.error('خطأ في شحن المحفظة:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في الخادم',
      error: 'حدث خطأ غير متوقع أثناء معالجة الطلب',
      code: 'SERVER_ERROR',
    });
  }
}
