import { prisma } from '@/lib/prisma';
import { NextApiRequest, NextApiResponse } from 'next';

interface ManageStatusRequest {
  action: 'upcoming' | 'live' | 'ended' | 'sold' | 'pause' | 'resume' | 'end' | 'cancel';
  reason?: string;
}

interface ManageStatusResponse {
  success: boolean;
  message: string;
  data?: {
    auctionId: string;
    newStatus: string;
    updatedAt: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ManageStatusResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
      error: 'Only POST method is allowed',
    });
  }

  try {
    const { id: auctionId } = req.query;
    const { action, reason }: ManageStatusRequest = req.body;

    const auctionIdStr = Array.isArray(auctionId) ? auctionId[0] : auctionId;
    const actionStr = String(action || '').toLowerCase();

    // التحقق من صحة البيانات
    if (!auctionIdStr || !actionStr) {
      return res.status(400).json({
        success: false,
        message: 'بيانات غير مكتملة',
        error: 'Missing required fields: auctionId, action',
      });
    }

    // التحقق من صحة العملية
    const validActions = ['upcoming', 'live', 'ended', 'sold', 'pause', 'resume', 'end', 'cancel'];
    if (!validActions.includes(actionStr)) {
      return res.status(400).json({
        success: false,
        message: 'عملية غير صحيحة',
        error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
      });
    }

    // جلب بيانات المزاد
    const auction = await prisma.auctions.findUnique({
      where: { id: String(auctionIdStr) },
      include: {
        bids: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                verified: true,
              },
            },
          },
          orderBy: {
            amount: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!auction) {
      return res.status(404).json({
        success: false,
        message: 'المزاد غير موجود',
        error: 'Auction not found',
      });
    }

    // التحقق من أن المستخدم هو صاحب المزاد
    // ملاحظة: يجب إضافة نظام المصادقة هنا للتحقق من هوية المستخدم
    // const userId = req.user?.id; // من نظام المصادقة
    // if (auction.car.userId !== userId) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'غير مصرح لك بإدارة هذا المزاد',
    //     error: 'Unauthorized'
    //   });
    // }

    // التحقق من إمكانية تنفيذ العملية
    const canPerformAction = validateAction(auction.status, actionStr);
    if (!canPerformAction.valid) {
      return res.status(400).json({
        success: false,
        message: canPerformAction.message,
        error: canPerformAction.error,
      });
    }

    const now = new Date();
    let newStatus: string;
    let shouldSetEndDate = false;
    let shouldMarkCarSold = false;

    switch (actionStr) {
      case 'upcoming':
        newStatus = 'UPCOMING';
        break;
      case 'live':
        newStatus = 'ACTIVE';
        break;
      case 'ended':
        newStatus = 'ENDED';
        shouldSetEndDate = true;
        break;
      case 'sold':
        newStatus = 'ENDED';
        shouldSetEndDate = true;
        shouldMarkCarSold = true;
        break;
      case 'pause':
        newStatus = 'SUSPENDED';
        break;
      case 'resume':
        newStatus = 'ACTIVE';
        break;
      case 'end':
        newStatus = 'ENDED';
        shouldSetEndDate = true;
        break;
      case 'cancel':
        newStatus = 'CANCELLED';
        shouldSetEndDate = true;
        break;
      default:
        throw new Error('Invalid action');
    }

    const updateData: any = {
      updatedAt: now,
      status: newStatus,
      ...(shouldSetEndDate ? { endDate: now } : {}),
    };

    // تحديث المزاد
    await prisma.auctions.update({
      where: { id: String(auctionIdStr) },
      data: updateData,
    });

    if (shouldMarkCarSold && auction.carId) {
      await prisma.cars.update({
        where: { id: auction.carId },
        data: { status: 'SOLD' },
      });
    }

    // إرسال إشعارات للمزايدين (يمكن تطويرها لاحقاً)
    if (auction.bids.length > 0) {
      await notifyBiddersOfStatusChange(auction.bids, actionStr, auction.title);
    }

    console.log(`[تم بنجاح] تم ${getActionText(action)} للمزاد ${auctionId}`);

    return res.status(200).json({
      success: true,
      message: `تم ${getActionText(actionStr)} بنجاح`,
      data: {
        auctionId: String(auctionIdStr),
        newStatus,
        updatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error(`[فشل] خطأ في إدارة المزاد:`, error);

    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم أثناء إدارة المزاد',
      error:
        process.env.NODE_ENV === 'development' ? (error as Error).message : 'Internal server error',
    });
  }
}

// دالة للتحقق من إمكانية تنفيذ العملية
function validateAction(currentStatus: string, action: string) {
  const a = String(action || '').toLowerCase();
  if (a === 'cancel' && ['ENDED', 'CANCELLED'].includes(String(currentStatus))) {
    return {
      valid: false,
      message: 'لا يمكن إلغاء مزاد منتهي أو ملغي مسبقاً',
      error: 'Cannot cancel already ended or cancelled auctions',
    };
  }
  return { valid: true };
}

// دالة لتحويل العملية إلى نص عربي
function getActionText(action: string): string {
  switch (action) {
    case 'upcoming':
      return 'تحديث المزاد إلى قادم';
    case 'live':
      return 'تحديث المزاد إلى مباشر';
    case 'ended':
      return 'إنهاء المزاد';
    case 'sold':
      return 'تأكيد البيع';
    case 'pause':
      return 'تعليق المزاد';
    case 'resume':
      return 'استئناف المزاد';
    case 'end':
      return 'إنهاء المزاد';
    case 'cancel':
      return 'إلغاء المزاد';
    default:
      return 'تحديث المزاد';
  }
}

// دالة لإشعار المزايدين بتغيير الحالة (يمكن تطويرها لاحقاً)
async function notifyBiddersOfStatusChange(bids: any[], action: string, auctionTitle: string) {
  console.log(
    `📧 إرسال إشعارات لـ ${bids.length} مزايد حول ${getActionText(action)} للمزاد: ${auctionTitle}`,
  );
}
