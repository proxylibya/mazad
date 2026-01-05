import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextApiRequest, NextApiResponse } from 'next';

interface ChangePasswordRequest {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

interface ChangePasswordResponse {
  success: boolean;
  message: string;
  data?: {
    changedAt: string;
    userId: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ChangePasswordResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    });
  }

  try {
    const { userId, currentPassword, newPassword }: ChangePasswordRequest = req.body;

    // التحقق من صحة البيانات
    if (!userId || !currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'جميع الحقول مطلوبة',
      });
    }

    // التحقق من قوة كلمة المرور الجديدة (نظام موحد)
    const { quickPasswordCheck } = await import('../../../utils/passwordValidation');
    const passwordError = quickPasswordCheck(newPassword, 6);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    // جلب المستخدم من قاعدة البيانات
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: { user_passwords: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'المستخدم غير موجود',
      });
    }

    if (!user.user_passwords) {
      return res.status(400).json({
        success: false,
        message: 'لم يتم تعيين كلمة مرور لهذا الحساب',
      });
    }

    // التحقق من كلمة المرور الحالية
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.user_passwords.hashedPassword,
    );

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الحالية غير صحيحة',
      });
    }

    // التأكد من أن كلمة المرور الجديدة مختلفة عن الحالية
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'كلمة المرور الجديدة يجب أن تكون مختلفة عن الحالية',
      });
    }

    // تشفير كلمة المرور الجديدة
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // تحديث كلمة المرور في قاعدة البيانات
    await prisma.user_passwords.update({
      where: { userId },
      data: {
        hashedPassword: hashedNewPassword,
      },
    });

    // تحديث تاريخ آخر تعديل للمستخدم
    await prisma.users.update({
      where: { id: userId },
      data: { updatedAt: new Date() },
    });

    console.log(`🔐 تم تغيير كلمة المرور للمستخدم: ${user.name} (${user.phone})`);

    return res.status(200).json({
      success: true,
      message: 'تم تغيير كلمة المرور بنجاح',
      data: {
        changedAt: new Date().toISOString(),
        userId,
      },
    });
  } catch (error) {
    console.error('خطأ في تغيير كلمة المرور:', error);
    return res.status(500).json({
      success: false,
      message: 'حدث خطأ في الخادم',
      error: error instanceof Error ? error.message : 'خطأ غير معروف',
    });
  }
}
