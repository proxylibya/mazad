import { prisma } from '@/lib/prisma';
import { DepositStatus } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // إعداد headers للاستجابة
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'طريقة غير مدعومة',
      error: 'METHOD_NOT_ALLOWED',
    });
  }

  try {
    const { userId } = req.query;
    const { page = '1', limit = '10', status, walletType } = req.query;

    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'معرف المستخدم مطلوب',
        error: 'MISSING_USER_ID',
      });
    }

    // تحويل المعاملات إلى أرقام
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // بناء شروط البحث
    const whereConditions: { userId: string; status?: DepositStatus; walletType?: string; } = {
      userId,
    };

    if (status && typeof status === 'string') {
      const normalizedStatus = status.toUpperCase() as keyof typeof DepositStatus;
      if (DepositStatus[normalizedStatus]) {
        whereConditions.status = DepositStatus[normalizedStatus];
      }
    }

    if (walletType && typeof walletType === 'string') {
      whereConditions.walletType = walletType;
    }

    // جلب الإيداعات مع التصفح
    const [deposits, totalCount] = await Promise.all([
      prisma.deposits.findMany({
        where: whereConditions,
        orderBy: {
          createdAt: 'desc',
        },
        skip: skip,
        take: limitNumber,
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.deposits.count({
        where: whereConditions,
      }),
    ]);

    // تنسيق البيانات للاستجابة
    type DepositRecord = {
      id: string;
      amount: unknown;
      currency: string;
      walletType: string;
      paymentMethod?: string | null;
      paymentReference?: string | null;
      status: string;
      createdAt: Date;
      verifiedAt?: Date | null;
      metadata?: unknown;
      users?: { id: string; name?: string | null; email?: string | null; } | null;
    };

    const formattedDeposits = (deposits as DepositRecord[]).map((deposit) => ({
      id: deposit.id,
      amount: parseFloat(String(deposit.amount)),
      currency: deposit.currency,
      walletType: deposit.walletType,
      paymentMethod: deposit.paymentMethod,
      paymentReference: deposit.paymentReference,
      status: deposit.status,
      createdAt: deposit.createdAt,
      verifiedAt: deposit.verifiedAt,
      metadata: deposit.metadata,
      user: deposit.users,
    }));

    // حساب معلومات التصفح
    const totalPages = Math.ceil(totalCount / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    return res.status(200).json({
      success: true,
      deposits: formattedDeposits,
      pagination: {
        currentPage: pageNumber,
        totalPages: totalPages,
        totalCount: totalCount,
        hasNextPage: hasNextPage,
        hasPrevPage: hasPrevPage,
        limit: limitNumber,
      },
      summary: {
        totalDeposits: totalCount,
        pendingCount: await prisma.deposits.count({
          where: { ...whereConditions, status: DepositStatus.PENDING },
        }),
        approvedCount: await prisma.deposits.count({
          where: { ...whereConditions, status: DepositStatus.APPROVED },
        }),
        rejectedCount: await prisma.deposits.count({
          where: { ...whereConditions, status: DepositStatus.REJECTED },
        }),
      },
    });
  } catch (error: unknown) {
    // تم إزالة console.error لأسباب أمنية

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: 'INTERNAL_SERVER_ERROR',
      details:
        process.env.NODE_ENV === 'development' && error instanceof Error
          ? error.message
          : undefined,
    });
  } finally {
    // Prisma Singleton: لا تقم بقطع الاتصال هنا
  }
}
