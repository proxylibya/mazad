import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET =
    process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// Verify admin authentication
function verifyAuth(req: NextApiRequest): { valid: boolean; adminId?: string; } {
    const token = req.cookies[COOKIE_NAME] || req.cookies.admin_token;
    if (!token) return { valid: false };
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        return { valid: true, adminId: decoded.adminId || decoded.userId };
    } catch {
        return { valid: false };
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // التحقق من المصادقة
    const auth = verifyAuth(req);
    if (!auth.valid) {
        return res.status(401).json({ success: false, message: 'غير مصرح' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
        return res.status(400).json({ success: false, message: 'معرف الخدمة مطلوب' });
    }

    try {
        switch (req.method) {
            case 'GET': {
                const service = await prisma.transport_services.findUnique({
                    where: { id },
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                email: true,
                                verified: true,
                                accountType: true,
                                profileImage: true,
                            },
                        },
                    },
                });

                if (!service) {
                    return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
                }

                return res.status(200).json({
                    success: true,
                    service: {
                        ...service,
                        user: service.users,
                    },
                });
            }

            case 'PUT': {
                const {
                    title,
                    description,
                    truckType,
                    capacity,
                    serviceArea,
                    pricePerKm,
                    availableDays,
                    contactPhone,
                    images,
                    features,
                    status,
                    featured,
                    promotionPackage,
                    promotionDays,
                } = req.body;

                const updateData: any = { updatedAt: new Date() };

                if (title !== undefined) updateData.title = title;
                if (description !== undefined) updateData.description = description;
                if (truckType !== undefined) updateData.truckType = truckType;
                if (capacity !== undefined) updateData.capacity = Number(capacity);
                if (serviceArea !== undefined) {
                    updateData.serviceArea = Array.isArray(serviceArea) ? serviceArea.join(',') : serviceArea;
                }
                if (pricePerKm !== undefined) {
                    updateData.pricePerKm = pricePerKm ? parseFloat(pricePerKm) : null;
                }
                if (availableDays !== undefined) {
                    updateData.availableDays = Array.isArray(availableDays)
                        ? availableDays.join(',')
                        : availableDays;
                }
                if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
                if (images !== undefined) {
                    updateData.images = Array.isArray(images) ? images.join(',') : images;
                }
                if (features !== undefined) {
                    updateData.features = Array.isArray(features) ? features.join(',') : features;
                }
                if (status !== undefined) updateData.status = status;
                if (featured !== undefined) updateData.featured = Boolean(featured);
                if (promotionPackage !== undefined) updateData.promotionPackage = promotionPackage;
                if (promotionDays !== undefined) updateData.promotionDays = Number(promotionDays);

                const updatedService = await prisma.transport_services.update({
                    where: { id },
                    data: updateData,
                    include: {
                        users: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                email: true,
                                verified: true,
                                accountType: true,
                            },
                        },
                    },
                });

                // تسجيل النشاط (اختياري)
                try {
                    await prisma.admin_activities.create({
                        data: {
                            id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                            admin_id: auth.adminId,
                            action: 'UPDATE_TRANSPORT_SERVICE',
                            resource_type: 'transport_service',
                            resource_id: id,
                            success: true,
                        },
                    });
                } catch (activityError) {
                    console.warn('تعذر تسجيل النشاط:', activityError);
                }

                return res.status(200).json({
                    success: true,
                    message: 'تم تحديث الخدمة بنجاح',
                    service: {
                        ...updatedService,
                        user: updatedService.users,
                    },
                });
            }

            case 'DELETE': {
                // بدلاً من الحذف الفعلي، نقوم بتعطيل الخدمة
                await prisma.transport_services.update({
                    where: { id },
                    data: {
                        status: 'INACTIVE',
                        updatedAt: new Date(),
                    },
                });

                // تسجيل النشاط (اختياري)
                try {
                    await prisma.admin_activities.create({
                        data: {
                            id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                            admin_id: auth.adminId,
                            action: 'DELETE_TRANSPORT_SERVICE',
                            resource_type: 'transport_service',
                            resource_id: id,
                            success: true,
                        },
                    });
                } catch (activityError) {
                    console.warn('تعذر تسجيل النشاط:', activityError);
                }

                return res.status(200).json({
                    success: true,
                    message: 'تم حذف الخدمة بنجاح',
                });
            }

            default:
                res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Transport service API error:', error);
        const errorMessage = error instanceof Error ? error.message : 'حدث خطأ في الخادم';
        return res.status(500).json({
            success: false,
            message: errorMessage,
        });
    }
}
