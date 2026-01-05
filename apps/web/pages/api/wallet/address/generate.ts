import CryptoSecurity from '@/lib/crypto-security';
import { prisma } from '@/lib/prisma';
import { generateUniqueId } from '@/lib/wallet/wallet-utils';
import {
  generateBep20Address,
  generateSolanaAddress,
  generateTRC20Address,
  generateWalletAttributes,
  validateBep20Address,
  validateSolanaAddress,
  validateTRC20Address,
} from '@/utils/walletUtils';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'طريقة غير مدعومة',
      error: 'METHOD_NOT_ALLOWED',
    });
  }

  try {
    const { userId, walletType = 'CRYPTO', regenerate = false, network = 'TRC20' } = req.body;

    // التحقق من البيانات المطلوبة
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب',
        error: 'MISSING_USER_ID',
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

    // التحقق من وجود المستخدم
    const user = await prisma.users.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
        error: 'USER_NOT_FOUND',
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
      const localAttributes = generateWalletAttributes('LOCAL', userId);
      const globalAttributes = generateWalletAttributes('GLOBAL', userId);
      const cryptoAttributes = generateWalletAttributes('CRYPTO', userId, network);

      wallet = await prisma.wallets.create({
        data: {
          id: generateUniqueId('wallet'),
          userId,
          createdAt: now,
          updatedAt: now,
          local_wallets: {
            create: {
              id: localAttributes.id,
              balance: 0,
              currency: localAttributes.currency,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            },
          },
          global_wallets: {
            create: {
              id: globalAttributes.id,
              balance: 0,
              currency: globalAttributes.currency,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            },
          },
          crypto_wallets: {
            create: {
              id: cryptoAttributes.id,
              balance: 0,
              currency: cryptoAttributes.currency,
              address: cryptoAttributes.address,
              network: cryptoAttributes.network,
              isActive: true,
              createdAt: now,
              updatedAt: now,
            },
          },
        },
        include: {
          local_wallets: true,
          global_wallets: true,
          crypto_wallets: true,
        },
      });
    }

    // معالجة طلب إنشاء عنوان للمحفظة الرقمية
    if (walletType === 'CRYPTO') {
      let cryptoWallet = wallet.crypto_wallets;

      // إذا لم تكن المحفظة الرقمية موجودة، أنشئها
      if (!cryptoWallet) {
        const cryptoAttributes = generateWalletAttributes('CRYPTO', userId, network);
        cryptoWallet = await prisma.crypto_wallets.create({
          data: {
            id: cryptoAttributes.id,
            walletId: wallet.id,
            balance: 0,
            currency: cryptoAttributes.currency,
            address: cryptoAttributes.address,
            network: cryptoAttributes.network,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        });
      }

      // إذا كان العنوان موجود ولم يطلب إعادة إنشاء، وتطابق الشبكة
      // If network matches, return existing. If network differs, we proceed to generate new one (switch network)
      if (cryptoWallet.address && !regenerate && cryptoWallet.network === network) {
        return res.status(200).json({
          success: true,
          message: 'عنوان المحفظة موجود بالفعل',
          data: {
            address: cryptoWallet.address,
            network: cryptoWallet.network,
            currency: cryptoWallet.currency,
            balance: cryptoWallet.balance,
            walletId: wallet.id,
            isNew: false,
          },
        });
      }

      // إنشاء عنوان جديد وزوج مفاتيح آمن بناءً على الشبكة
      let newAddress = '';
      let isValid = false;

      if (network === 'SOLANA') {
        newAddress = generateSolanaAddress(userId);
        isValid = validateSolanaAddress(newAddress);
      } else if (network === 'BEP20') {
        newAddress = generateBep20Address(userId);
        isValid = validateBep20Address(newAddress);
      } else {
        newAddress = generateTRC20Address(userId);
        isValid = validateTRC20Address(newAddress);
      }

      const newPrivateKey = CryptoSecurity.generateSecurePrivateKey();
      const encryptedPrivateKey = CryptoSecurity.encryptSensitiveData(newPrivateKey);

      // التحقق من صحة العنوان المُنشأ
      if (!isValid) {
        return res.status(500).json({
          success: false,
          message: 'فشل في إنشاء عنوان صحيح',
          error: 'INVALID_GENERATED_ADDRESS',
        });
      }

      // تحديث العنوان والمفتاح المشفر والشبكة في قاعدة البيانات
      const updatedCryptoWallet = await prisma.crypto_wallets.update({
        where: { id: cryptoWallet.id },
        data: {
          address: newAddress,
          network: network,
          currency: network === 'SOLANA' ? 'USDT-SOL' : network === 'BEP20' ? 'USDT-BEP20' : 'USDT-TRC20',
          // حفظ المفتاح المشفر في الحقل المتاح ضمن الschema
          privateKeyHash: encryptedPrivateKey,
          updatedAt: new Date(),
        },
      });

      await prisma.activity_logs.create({
        data: {
          id: generateUniqueId('activity'),
          action: 'UPDATE', // Changed from CREATE since we update usually
          entityType: 'CRYPTO_WALLET_ADDRESS',
          entityId: cryptoWallet.id,
          description: `تم تحديث عنوان محفظة رقمية جديد: ${newAddress} (${network})`,
          users: {
            connect: {
              id: userId,
            },
          },
          metadata: {
            address: newAddress,
            network: network,
            regenerated: regenerate,
            previousNetwork: cryptoWallet.network,
          },
        },
      });

      return res.status(201).json({
        success: true,
        message: regenerate ? 'تم إعادة إنشاء عنوان المحفظة بنجاح' : 'تم إنشاء عنوان المحفظة بنجاح',
        data: {
          address: newAddress,
          network: updatedCryptoWallet.network,
          currency: updatedCryptoWallet.currency,
          balance: updatedCryptoWallet.balance,
          walletId: wallet.id,
          isNew: true,
          regenerated: regenerate,
        },
      });
    }

    // معالجة أنواع المحافظ الأخرى
    const walletData = walletType === 'LOCAL' ? wallet.local_wallets : wallet.global_wallets;

    if (!walletData) {
      return res.status(404).json({
        success: false,
        message: 'نوع المحفظة غير متاح',
        error: 'WALLET_TYPE_NOT_FOUND',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'بيانات المحفظة',
      data: {
        currency: walletData.currency,
        balance: walletData.balance,
        walletId: wallet.id,
        isNew: false,
      },
    });
  } catch (error) {
    console.error('خطأ في API إنشاء عنوان المحفظة:', error);

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ داخلي في الخادم',
      error: 'INTERNAL_SERVER_ERROR',
      details: process.env.NODE_ENV === 'development' ? error : undefined,
    });
  } finally {
    // Prisma Singleton: لا تقم بقطع الاتصال هنا
  }
}
