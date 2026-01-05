import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../lib/prisma';

// محاكاة إرسال SMS (للاختبار)
async function sendSMSLocal(phone: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; }> {
    // محاكاة تأخير الإرسال
    await new Promise((resolve) => setTimeout(resolve, 500));

    // محاكاة نجاح الإرسال بنسبة 95%
    const isSuccess = Math.random() > 0.05;

    if (isSuccess) {
        return {
            success: true,
            messageId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
    } else {
        return {
            success: false,
            error: 'فشل في الإرسال - خطأ محاكاة',
        };
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { phone, message, type = 'notification' } = req.body;

        // التحقق من البيانات
        if (!phone || !message) {
            return res.status(400).json({
                success: false,
                message: 'رقم الهاتف والرسالة مطلوبان',
            });
        }

        // تنظيف رقم الهاتف
        const cleanPhone = phone.replace(/\s/g, '').replace(/^00/, '+');

        // حساب التكلفة (تقريبية)
        const cost = Math.ceil(message.length / 160) * 0.05;

        // إرسال الرسالة
        const result = await sendSMSLocal(cleanPhone, message);

        // تسجيل في قاعدة البيانات
        try {
            await prisma.$executeRaw`
        INSERT INTO sms_logs (id, phone, message, type, status, cost, provider, message_id, error_message, created_at)
        VALUES (
          ${`sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`},
          ${cleanPhone},
          ${message},
          ${type},
          ${result.success ? 'sent' : 'failed'},
          ${cost},
          ${'local'},
          ${result.messageId || null},
          ${result.error || null},
          NOW()
        )
      `;
        } catch (dbError) {
            console.error('Error logging SMS to database:', dbError);
            // نستمر حتى لو فشل التسجيل
        }

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'تم إرسال الرسالة بنجاح',
                data: {
                    messageId: result.messageId,
                    phone: cleanPhone,
                    cost,
                },
            });
        } else {
            return res.status(500).json({
                success: false,
                message: result.error || 'فشل في إرسال الرسالة',
            });
        }
    } catch (error) {
        console.error('Error sending SMS:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في إرسال الرسالة',
        });
    }
}
