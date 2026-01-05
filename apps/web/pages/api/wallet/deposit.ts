import { prisma } from '@/lib/prisma';
import { generateUniqueId } from '@/lib/wallet/wallet-utils';
import { NextApiRequest, NextApiResponse } from 'next';
import { RateLimitConfigs, withApiRateLimit } from '../../../utils/rateLimiter';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'طريقة غير مدعومة',
    });
  }

  try {
    const { userId, amount, currency, walletType, paymentMethodId, paymentReference, metadata } =
      req.body;

    // التحقق من البيانات المطلوبة
    if (!userId || !amount || !currency || !walletType || !paymentMethodId) {
      return res.status(400).json({
        success: false,
        message: 'بيانات مطلوبة مفقودة',
        error: 'MISSING_REQUIRED_FIELDS',
      });
    }

    // التحقق من صحة نوع المحفظة
    const validWalletTypes = ['LOCAL', 'GLOBAL', 'CRYPTO'];
    if (!validWalletTypes.includes(walletType)) {
      return res.status(400).json({
        success: false,
        message: 'نوع محفظة غير صحيح',
        error: 'INVALID_WALLET_TYPE',
      });
    }

    // التحقق من صحة العملة حسب نوع المحفظة
    const currencyValidation = {
      LOCAL: ['LYD'],
      GLOBAL: ['USD'],
      CRYPTO: ['USDT-TRC20'],
    };

    if (!currencyValidation[walletType as keyof typeof currencyValidation].includes(currency)) {
      return res.status(400).json({
        success: false,
        message: 'عملة غير مدعومة لهذا النوع من المحفظة',
        error: 'INVALID_CURRENCY_FOR_WALLET_TYPE',
      });
    }

    // التحقق من الحدود
    const limits = {
      LOCAL: { min: 50, max: 50000 },
      GLOBAL: { min: 5, max: 10000 },
      CRYPTO: { min: 10, max: 100000 },
    };

    const walletLimits = limits[walletType as keyof typeof limits];
    if (amount < walletLimits.min || amount > walletLimits.max) {
      return res.status(400).json({
        success: false,
        message: `المبلغ يجب أن يكون بين ${walletLimits.min} و ${walletLimits.max} ${currency}`,
        error: 'AMOUNT_OUT_OF_RANGE',
      });
    }

    // البحث عن المحفظة الرئيسية أو إنشاؤها
    let wallet = await prisma.wallets.findUnique({
      where: { userId },
      include: {
        local_wallets: true,
        global_wallets: true,
        crypto_wallets: true,
      },
    });

    if (!wallet) {
      const now = new Date();
      wallet = await prisma.wallets.create({
        data: {
          id: generateUniqueId('wallet'),
          userId,
          local_wallets: {
            create: {
              id: generateUniqueId('local'),
              balance: 0,
              currency: 'LYD',
              updatedAt: now,
            },
          },
          global_wallets: {
            create: {
              id: generateUniqueId('global'),
              balance: 0,
              currency: 'USD',
              updatedAt: now,
            },
          },
          crypto_wallets: {
            create: {
              id: generateUniqueId('crypto'),
              balance: 0,
              currency: 'USDT-TRC20',
              network: 'TRC20',
              updatedAt: now,
            },
          },
          updatedAt: now,
        },
        include: {
          local_wallets: true,
          global_wallets: true,
          crypto_wallets: true,
        },
      });
    }

    // إنشاء مرجع فريد للإيداع
    const reference = `${walletType}-DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // حساب الرسوم
    const feeRates = {
      LOCAL: 0.02, // 2% للمحفظة المحلية
      GLOBAL: 0.034, // 3.4% للمحفظة العالمية
      CRYPTO: 0.01, // 1% للعملة الرقمية
    };

    const feeRate = feeRates[walletType as keyof typeof feeRates];
    const fees = amount * feeRate;
    const netAmount = amount - fees;

    // إنشاء سجل الإيداع
    const deposit = await prisma.deposits.create({
      data: {
        id: reference,
        userId,
        paymentMethodId,
        amount,
        currency,
        walletType: walletType as any,
        status: 'INITIATED',
        reference,
        paymentReference,
        fees,
        netAmount,
        metadata: metadata || {},
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // إنشاء معاملة
    const transactionId = generateUniqueId('txn');
    const transaction = await prisma.transactions.create({
      data: {
        id: transactionId,
        walletId: wallet.id,
        amount: netAmount,
        type: 'DEPOSIT',
        status: 'PENDING',
        currency,
        walletType: walletType as any,
        description: `إيداع ${amount} ${currency} عبر ${paymentMethodId}`,
        reference,
        fees,
        originalAmount: amount,
        originalCurrency: currency,
        paymentMethodId,
        metadata: metadata || {},
        updatedAt: new Date(),
      },
    });

    // إنشاء إشعار
    await prisma.notifications.create({
      data: {
        id: `notif-${reference}`,
        userId,
        type: 'DEPOSIT_INITIATED',
        title: 'طلب إيداع جديد',
        message: `تم إنشاء طلب إيداع بقيمة ${amount} ${currency}`,
        isRead: false,
        depositId: deposit.id,
        transactionId: transaction.id,
        createdAt: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      message: 'تم إنشاء طلب الإيداع بنجاح',
      data: {
        depositId: deposit.id,
        transactionId: transaction.id,
        reference,
        amount,
        currency,
        walletType,
        fees,
        netAmount,
        status: 'INITIATED',
        estimatedProcessingTime:
          walletType === 'LOCAL' ? '1-3 أيام عمل' : walletType === 'GLOBAL' ? 'فوري' : '5-10 دقائق',
      },
    });
  } catch (error) {
    console.error('خطأ في API الإيداع:', error);

    res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم',
      error: 'INTERNAL_SERVER_ERROR',
    });
  } finally {
    // لا نقوم بقطع الاتصال هنا لأننا نستخدم Prisma Singleton على مستوى التطبيق
  }
}

export default withApiRateLimit(handler, RateLimitConfigs.API_GENERAL);
