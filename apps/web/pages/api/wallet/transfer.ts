import { verifyToken } from '@/lib/auth/jwtUtils';
import { prisma } from '@/lib/prisma';
import { generateUniqueId } from '@/lib/wallet/wallet-utils';
import { NextApiRequest, NextApiResponse } from 'next';

interface AuthTokenPayload {
  userId: string;
  [key: string]: unknown;
}

/**
 * API لتحويل رصيد بين المحافظ
 * POST /api/wallet/transfer
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // التحقق من المصادقة
    const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    const decoded = verifyToken<AuthTokenPayload>(token);
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: 'توكن غير صالح' });
    }

    const userId = decoded.userId;

    const { targetWalletId, amount, currency = 'LYD' } = req.body;

    // التحقق من البيانات
    if (!targetWalletId || !amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير صالحة'
      });
    }

    // البحث عن المحفظة المصدر
    const sourceWallet = await prisma.wallets.findUnique({
      where: { userId },
      include: { local_wallets: true }
    });

    if (!sourceWallet) {
      return res.status(404).json({
        success: false,
        message: 'محفظتك غير موجودة'
      });
    }

    // التحقق من الرصيد
    const sourceWalletWithLocal = sourceWallet as any;
    const balance = sourceWalletWithLocal.local_wallets?.balance || 0;
    if (balance < amount) {
      return res.status(400).json({
        success: false,
        message: `رصيد غير كافٍ. رصيدك الحالي: ${balance} ${currency}`
      });
    }

    // البحث عن المحفظة المستهدفة
    const targetWallet = await prisma.wallets.findUnique({
      where: { publicId: Number(targetWalletId) },
      include: {
        users: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!targetWallet) {
      return res.status(404).json({
        success: false,
        message: 'المحفظة المستهدفة غير موجودة'
      });
    }

    // منع التحويل لنفس المحفظة
    if (sourceWallet.id === targetWallet.id) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن التحويل لنفس المحفظة'
      });
    }

    // تنفيذ التحويل (Transaction)
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // خصم من المصدر
      await tx.local_wallets.update({
        where: { walletId: sourceWallet.id },
        data: { balance: { decrement: amount }, updatedAt: now }
      });

      // إضافة للمستهدف
      await tx.local_wallets.update({
        where: { walletId: targetWallet.id },
        data: { balance: { increment: amount }, updatedAt: now }
      });

      // إنشاء سجل المعاملة
      const transaction = await tx.transactions.create({
        data: {
          id: generateUniqueId('txn'),
          walletId: sourceWallet.id,
          amount,
          type: 'TRANSFER',
          status: 'COMPLETED',
          currency,
          description: `تحويل إلى ${targetWallet.users?.name || 'مستخدم'} (محفظة ${targetWallet.publicId})`,
          relatedWalletId: targetWallet.id,
          walletType: 'LOCAL',
          createdAt: now,
          updatedAt: now
        }
      });

      return transaction;
    });

    return res.status(200).json({
      success: true,
      message: 'تم التحويل بنجاح',
      transaction: {
        publicId: result.publicId,
        amount: result.amount,
        currency: result.currency,
        targetUser: targetWallet.users?.name || 'مستخدم'
      }
    });
  } catch (error) {
    console.error('خطأ في التحويل:', error);
    return res.status(500).json({
      success: false,
      message: 'خطأ في الخادم'
    });
  }
}
