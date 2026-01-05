import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

// استخدام singleton pattern لـ Prisma

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'طريقة غير مدعومة',
    });
  }

  try {
    // التحقق من المصادقة
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'غير مصرح لك بالوصول',
      });
    }

    let userId: string;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      userId = decoded.userId || decoded.id;

      if (!userId) {
        throw new Error('معرف المستخدم غير موجود في الرمز المميز');
      }
    } catch (error) {
      console.error('خطأ في التحقق من الرمز المميز:', error);
      return res.status(401).json({
        success: false,
        error: 'رمز المصادقة غير صحيح',
      });
    }

    // الحصول على البيانات من body أو query حسب نوع الطلب
    const data = req.method === 'POST' ? req.body : req.query;
    const { carId, auctionId, type, id } = data;

    // دعم النظام الجديد مع type و id
    let itemId, itemType;
    if (type && id) {
      itemType = type;
      itemId = id;
    } else if (carId) {
      itemType = 'car';
      itemId = carId;
    } else if (auctionId) {
      itemType = 'auction';
      itemId = auctionId;
    } else {
      return res.status(400).json({
        success: false,
        error: 'يجب تحديد معرف العنصر ونوعه',
      });
    }

    // التحقق من وجود العنصر في المفضلة
    let favorite;

    if (itemType === 'transport') {
      favorite = await prisma.favorites.findFirst({
        where: {
          userId: userId,
          transportServiceId: itemId,
        },
      });
    } else if (itemType === 'showroom') {
      favorite = await prisma.favorites.findFirst({
        where: {
          userId: userId,
          showroomId: itemId,
        },
      });
    } else {
      // للسيارات والمزادات
      favorite = await prisma.favorites.findFirst({
        where: {
          userId: userId,
          ...(itemType === 'car' ? { carId: itemId } : { auctionId: itemId }),
        },
      });
    }

    return res.status(200).json({
      success: true,
      isFavorite: !!favorite,
      favoriteId: favorite?.id || null,
    });
  } catch (error) {
    console.error('خطأ في التحقق من المفضلة:', error);
    return res.status(500).json({
      success: false,
      error: 'خطأ في الخادم',
    });
  }
}
