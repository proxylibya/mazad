/**
 * Payment Methods API - إدارة طرق الدفع
 */
import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

async function verifyAuth(req: NextApiRequest): Promise<{ adminId: string; role: string; } | null> {
    const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;
    if (!token) return null;

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; role: string; type: string; };
        if (decoded.type !== 'admin') return null;
        return { adminId: decoded.adminId, role: decoded.role };
    } catch {
        return null;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const auth = await verifyAuth(req);

        if (req.method === 'GET') {
            try {
                const methods = await prisma.payment_method_configs.findMany({
                    orderBy: [
                        { category: 'asc' },
                        { isPopular: 'desc' },
                        { createdAt: 'asc' },
                    ],
                });

                const mappedMethods = methods.map(m => ({
                    id: m.id,
                    name: m.name,
                    nameAr: m.nameAr,
                    type: m.type,
                    category: m.category,
                    description: m.description,
                    icon: m.icon,
                    isActive: m.isActive,
                    isPopular: m.isPopular,
                    minAmount: m.minAmount,
                    maxAmount: m.maxAmount,
                    dailyLimit: m.dailyLimit,
                    monthlyLimit: m.monthlyLimit,
                    percentageFee: m.percentageFee,
                    fixedFee: m.fixedFee,
                    processingTime: m.processingTime,
                    supportedCurrencies: m.supportedCurrencies,
                }));

                return res.status(200).json({
                    success: true,
                    methods: mappedMethods,
                });
            } catch (dbError) {
                console.error('Database error:', dbError);
                return res.status(200).json({
                    success: true,
                    methods: [],
                    isMockData: true,
                });
            }
        }

        if (req.method === 'PUT') {
            if (!auth) {
                return res.status(401).json({ success: false, message: 'غير مصرح' });
            }

            if (!['SUPER_ADMIN', 'FINANCE', 'ADMIN'].includes(auth.role)) {
                return res.status(403).json({ success: false, message: 'ليس لديك صلاحية' });
            }

            const { id } = req.query;
            const updateData = req.body;

            if (!id) {
                return res.status(400).json({ success: false, message: 'معرف طريقة الدفع مطلوب' });
            }

            try {
                const updated = await prisma.payment_method_configs.update({
                    where: { id: id as string },
                    data: {
                        ...(updateData.name !== undefined && { name: updateData.name }),
                        ...(updateData.nameAr !== undefined && { nameAr: updateData.nameAr }),
                        ...(updateData.description !== undefined && { description: updateData.description }),
                        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
                        ...(updateData.isPopular !== undefined && { isPopular: updateData.isPopular }),
                        ...(updateData.minAmount !== undefined && { minAmount: updateData.minAmount }),
                        ...(updateData.maxAmount !== undefined && { maxAmount: updateData.maxAmount }),
                        ...(updateData.dailyLimit !== undefined && { dailyLimit: updateData.dailyLimit }),
                        ...(updateData.monthlyLimit !== undefined && { monthlyLimit: updateData.monthlyLimit }),
                        ...(updateData.percentageFee !== undefined && { percentageFee: updateData.percentageFee }),
                        ...(updateData.fixedFee !== undefined && { fixedFee: updateData.fixedFee }),
                        ...(updateData.processingTime !== undefined && { processingTime: updateData.processingTime }),
                        updatedAt: new Date(),
                    },
                });

                return res.status(200).json({
                    success: true,
                    message: 'تم تحديث طريقة الدفع',
                    method: updated,
                });
            } catch (dbError) {
                console.error('Database error:', dbError);
                return res.status(500).json({ success: false, message: 'خطأ في قاعدة البيانات' });
            }
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (error) {
        console.error('Payment Methods API error:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
}
