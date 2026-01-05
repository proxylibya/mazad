import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

/**
 * API لإعادة ترتيب الساحات
 * POST /api/admin/yards/reorder
 * Body: { yardId: string, direction: 'up' | 'down' }
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    try {
        const { yardId, direction } = req.body;

        if (!yardId || !direction) {
            return res.status(400).json({
                success: false,
                error: 'معرف الساحة والاتجاه مطلوبان'
            });
        }

        if (!['up', 'down'].includes(direction)) {
            return res.status(400).json({
                success: false,
                error: 'الاتجاه يجب أن يكون up أو down'
            });
        }

        // جلب الساحة الحالية
        const currentYard = await prisma.yards.findUnique({
            where: { id: yardId },
            select: { id: true, sortOrder: true, name: true }
        });

        if (!currentYard) {
            return res.status(404).json({ success: false, error: 'الساحة غير موجودة' });
        }

        // جلب جميع الساحات مرتبة
        const allYards = await prisma.yards.findMany({
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
            select: { id: true, sortOrder: true, name: true }
        });

        // البحث عن موقع الساحة الحالية
        const currentIndex = allYards.findIndex(y => y.id === yardId);

        if (currentIndex === -1) {
            return res.status(404).json({ success: false, error: 'الساحة غير موجودة في القائمة' });
        }

        // حساب الموقع الجديد
        const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        // التحقق من الحدود
        if (newIndex < 0) {
            return res.status(400).json({
                success: false,
                error: 'الساحة في أعلى القائمة بالفعل'
            });
        }

        if (newIndex >= allYards.length) {
            return res.status(400).json({
                success: false,
                error: 'الساحة في أسفل القائمة بالفعل'
            });
        }

        // الساحة المجاورة التي سنتبادل معها
        const adjacentYard = allYards[newIndex];

        // تبديل الترتيب
        const currentSortOrder = currentYard.sortOrder || currentIndex;
        const adjacentSortOrder = adjacentYard.sortOrder || newIndex;

        await prisma.$transaction([
            prisma.yards.update({
                where: { id: currentYard.id },
                data: { sortOrder: adjacentSortOrder }
            }),
            prisma.yards.update({
                where: { id: adjacentYard.id },
                data: { sortOrder: currentSortOrder }
            })
        ]);

        return res.status(200).json({
            success: true,
            message: `تم ${direction === 'up' ? 'رفع' : 'خفض'} ترتيب "${currentYard.name}" بنجاح`
        });

    } catch (error) {
        console.error('[Yards Reorder API Error]:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'حدث خطأ في الخادم'
        });
    }
}
