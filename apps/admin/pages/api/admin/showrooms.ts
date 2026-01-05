/**
 * Showrooms API - Enterprise Edition
 * API إدارة المعارض - مع Prisma
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// Verify admin authentication
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
        // Verify authentication
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        switch (req.method) {
            case 'GET': {
                const page = parseInt(req.query.page as string) || 1;
                const limit = parseInt(req.query.limit as string) || 20;
                const skip = (page - 1) * limit;
                const status = req.query.status as string;
                const search = req.query.search as string;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const where: any = {};

                if (status) {
                    where.status = status;
                }

                if (search) {
                    where.OR = [
                        { name: { contains: search, mode: 'insensitive' } },
                        { city: { contains: search, mode: 'insensitive' } },
                        { address: { contains: search, mode: 'insensitive' } },
                    ];
                }

                const [showrooms, total] = await Promise.all([
                    prisma.showrooms.findMany({
                        where,
                        include: {
                            users: {
                                select: {
                                    id: true,
                                    name: true,
                                    phone: true,
                                    email: true,
                                },
                            },
                            _count: {
                                select: {
                                    cars: true,
                                },
                            },
                        },
                        orderBy: { createdAt: 'desc' },
                        skip,
                        take: limit,
                    }),
                    prisma.showrooms.count({ where }),
                ]);

                return res.status(200).json({
                    success: true,
                    showrooms: showrooms.map(s => ({
                        id: s.id,
                        name: s.name,
                        description: s.description,
                        vehicleTypes: s.vehicleTypes,
                        city: s.city,
                        area: s.area,
                        address: s.address,
                        images: s.images,
                        phone: s.phone,
                        email: s.email,
                        website: s.website,
                        openingHours: s.openingHours,
                        status: s.status,
                        verified: s.verified,
                        featured: s.featured,
                        rating: s.rating,
                        reviewsCount: s.reviewsCount,
                        totalCars: s.totalCars,
                        activeCars: s.activeCars,
                        soldCars: s.soldCars,
                        carsCount: s._count.cars,
                        owner: s.users,
                        views: s.views,
                        createdAt: s.createdAt,
                    })),
                    total,
                    page,
                    limit,
                    pages: Math.ceil(total / limit),
                });
            }

            case 'PUT': {
                const { id } = req.query;
                const { status, verified, featured } = req.body;

                if (!id) {
                    return res.status(400).json({ success: false, message: 'معرف المعرض مطلوب' });
                }

                const updatedShowroom = await prisma.showrooms.update({
                    where: { id: id as string },
                    data: {
                        ...(status && { status }),
                        ...(verified !== undefined && { verified }),
                        ...(featured !== undefined && { featured }),
                        updatedAt: new Date(),
                    },
                });

                await prisma.admin_activities.create({
                    data: {
                        id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        admin_id: auth.adminId,
                        action: 'UPDATE_SHOWROOM',
                        resource_type: 'showroom',
                        resource_id: id as string,
                        success: true,
                    },
                });

                return res.status(200).json({
                    success: true,
                    message: 'تم تحديث المعرض',
                    showroom: updatedShowroom,
                });
            }

            case 'DELETE': {
                const { id } = req.query;

                if (!id) {
                    return res.status(400).json({ success: false, message: 'معرف المعرض مطلوب' });
                }

                // Suspend showroom instead of delete
                await prisma.showrooms.update({
                    where: { id: id as string },
                    data: {
                        status: 'SUSPENDED',
                        updatedAt: new Date(),
                    },
                });

                await prisma.admin_activities.create({
                    data: {
                        id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                        admin_id: auth.adminId,
                        action: 'SUSPEND_SHOWROOM',
                        resource_type: 'showroom',
                        resource_id: id as string,
                        success: true,
                    },
                });

                return res.status(200).json({
                    success: true,
                    message: 'تم تعليق المعرض',
                });
            }

            default:
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Showrooms API error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
        });
    }
}
