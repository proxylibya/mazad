/**
 * Single Auction API - Enterprise Edition
 * API للمزاد الفردي - جلب/تحديث/حذف
 */
// @ts-nocheck - Prisma include types are complex

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

// Safe activity logging - won't fail the main operation if admin doesn't exist
async function safeLogActivity(adminId: string, action: string, resourceType: string, resourceId: string) {
    try {
        // Check if admin exists in admins table
        const adminExists = await prisma.admins.findUnique({
            where: { id: adminId },
            select: { id: true }
        });

        if (!adminExists) {
            console.log(`تخطي تسجيل النشاط - المدير غير موجود في جدول admins: ${adminId}`);
            return;
        }

        await prisma.admin_activities.create({
            data: {
                id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                admin_id: adminId,
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                success: true,
            },
        });
    } catch (error) {
        // Don't fail the main operation
        console.warn('فشل تسجيل النشاط (غير حرج):', error);
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        // Verify authentication
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ success: false, message: 'معرف المزاد مطلوب' });
        }

        switch (req.method) {
            case 'GET': {
                // جلب تفاصيل المزاد الكاملة مع الساحة
                const auction = await prisma.auctions.findUnique({
                    where: { id },
                    include: {
                        cars: {
                            include: {
                                car_images: true,
                            },
                        },
                        yard: true, // جلب بيانات الساحة إن وجدت
                        users: {
                            select: {
                                id: true,
                                name: true,
                                phone: true,
                                email: true,
                                profileImage: true,
                                createdAt: true,
                            },
                        },
                        bids: {
                            orderBy: { createdAt: 'desc' },
                            take: 50,
                            include: {
                                users: {
                                    select: {
                                        id: true,
                                        name: true,
                                        phone: true,
                                        profileImage: true,
                                    },
                                },
                            },
                        },
                        _count: {
                            select: {
                                bids: true,
                            },
                        },
                    },
                });

                if (!auction) {
                    return res.status(404).json({ success: false, message: 'المزاد غير موجود' });
                }

                // حساب إحصائيات إضافية
                const highestBid = auction.bids[0] || null;
                const uniqueBidders = new Set(auction.bids.map((b) => b.bidderId)).size;
                const avgBidAmount =
                    auction.bids.length > 0
                        ? auction.bids.reduce((sum, b) => sum + b.amount, 0) / auction.bids.length
                        : 0;

                // معالجة الصور - جلب من car_images أو images field أو الساحة
                const processImages = () => {
                    const images: { id: string; url: string; isPrimary: boolean; }[] = [];

                    // 1. صور من car_images relation
                    if (auction.cars?.car_images && auction.cars.car_images.length > 0) {
                        auction.cars.car_images.forEach((img: any, idx: number) => {
                            images.push({
                                id: img.id || `img-${idx}`,
                                url: img.url || img.imageUrl || img.path || '',
                                isPrimary: img.isPrimary || idx === 0,
                            });
                        });
                    }

                    // 2. صور من حقل images في السيارة (array of strings)
                    if (auction.cars?.images && Array.isArray(auction.cars.images)) {
                        auction.cars.images.forEach((url: string, idx: number) => {
                            if (url && !images.some(i => i.url === url)) {
                                images.push({
                                    id: `car-img-${idx}`,
                                    url: url,
                                    isPrimary: images.length === 0 && idx === 0,
                                });
                            }
                        });
                    }

                    // 3. الصورة الرئيسية للسيارة
                    if (auction.cars?.mainImage && !images.some(i => i.url === auction.cars?.mainImage)) {
                        images.unshift({
                            id: 'main-car-img',
                            url: auction.cars.mainImage,
                            isPrimary: true,
                        });
                    }

                    // 4. صور من الساحة إذا كان مزاد ساحة
                    if (auction.yard) {
                        if (auction.yard.image && !images.some(i => i.url === auction.yard?.image)) {
                            images.push({
                                id: 'yard-main-img',
                                url: auction.yard.image,
                                isPrimary: images.length === 0,
                            });
                        }
                        if (auction.yard.images && Array.isArray(auction.yard.images)) {
                            auction.yard.images.forEach((url: string, idx: number) => {
                                if (url && !images.some(i => i.url === url)) {
                                    images.push({
                                        id: `yard-img-${idx}`,
                                        url: url,
                                        isPrimary: false,
                                    });
                                }
                            });
                        }
                    }

                    return images;
                };

                const processedImages = processImages();

                return res.status(200).json({
                    success: true,
                    auction: {
                        id: auction.id,
                        title: auction.title,
                        description: auction.description,
                        startPrice: auction.startPrice,
                        currentPrice: auction.currentPrice,
                        minimumBid: auction.minimumBid,
                        status: auction.status,
                        type: auction.type,
                        startDate: auction.startDate,
                        endDate: auction.endDate,
                        views: auction.views,
                        totalBids: auction.totalBids,
                        bidsCount: auction._count.bids,
                        featured: auction.featured,
                        createdAt: auction.createdAt,
                        updatedAt: auction.updatedAt,
                        location: auction.location || auction.cars?.location || auction.yard?.city || null,
                        yardId: auction.yardId,
                        // بيانات الساحة
                        yard: auction.yard ? {
                            id: auction.yard.id,
                            slug: auction.yard.slug,
                            name: auction.yard.name,
                            description: auction.yard.description,
                            city: auction.yard.city,
                            area: auction.yard.area,
                            address: auction.yard.address,
                            phone: auction.yard.phone,
                            image: auction.yard.image,
                            images: auction.yard.images || [],
                            auctionDays: auction.yard.auctionDays || [],
                            auctionTimeFrom: auction.yard.auctionTimeFrom,
                            auctionTimeTo: auction.yard.auctionTimeTo,
                            status: auction.yard.status,
                            verified: auction.yard.verified,
                        } : null,
                        // بيانات السيارة
                        car: auction.cars
                            ? {
                                id: auction.cars.id,
                                title: auction.cars.title || `${auction.cars.make} ${auction.cars.model} ${auction.cars.year}`,
                                description: auction.cars.description,
                                make: auction.cars.make || 'غير محدد',
                                model: auction.cars.model || 'غير محدد',
                                year: auction.cars.year || new Date().getFullYear(),
                                mileage: auction.cars.mileage || 0,
                                color: auction.cars.color || 'غير محدد',
                                fuelType: auction.cars.fuelType || 'غير محدد',
                                transmission: auction.cars.transmission || 'غير محدد',
                                engineSize: auction.cars.engineSize,
                                location: auction.cars.location || auction.yard?.city || 'غير محدد',
                                price: auction.cars.price || auction.startPrice,
                                images: processedImages,
                            }
                            : {
                                // بيانات افتراضية للمزادات بدون سيارة مرتبطة
                                id: null,
                                title: auction.title,
                                description: auction.description,
                                make: 'غير محدد',
                                model: 'غير محدد',
                                year: new Date().getFullYear(),
                                mileage: 0,
                                color: 'غير محدد',
                                fuelType: 'غير محدد',
                                transmission: 'غير محدد',
                                engineSize: null,
                                location: auction.location || auction.yard?.city || 'غير محدد',
                                price: auction.startPrice,
                                images: processedImages,
                            },
                        seller: auction.users ? {
                            id: auction.users.id,
                            name: auction.users.name || 'مستخدم',
                            phone: auction.users.phone || '-',
                            email: auction.users.email,
                            avatar: auction.users.profileImage,
                            createdAt: auction.users.createdAt,
                        } : null,
                        bids: auction.bids.map((b) => ({
                            id: b.id,
                            amount: b.amount,
                            createdAt: b.createdAt,
                            bidder: b.users ? {
                                id: b.users.id,
                                name: b.users.name || 'مزايد',
                                phone: b.users.phone || '-',
                                avatar: b.users.profileImage,
                            } : null,
                        })),
                        stats: {
                            highestBid: highestBid
                                ? {
                                    amount: highestBid.amount,
                                    bidder: highestBid.users ? {
                                        id: highestBid.users.id,
                                        name: highestBid.users.name || 'مزايد',
                                    } : null,
                                    time: highestBid.createdAt,
                                }
                                : null,
                            uniqueBidders: uniqueBidders || 0,
                            avgBidAmount: Math.round(avgBidAmount),
                            totalBidsValue: auction.bids.reduce((sum, b) => sum + b.amount, 0),
                        },
                    },
                });
            }

            case 'PUT': {
                const { title, description, status, endDate, minimumBid, featured, startPrice } = req.body;

                // Helper to safely parse number
                const toNumber = (val: unknown): number | undefined => {
                    if (val === undefined || val === null || val === '') return undefined;
                    const num = typeof val === 'number' ? val : parseFloat(String(val));
                    return isNaN(num) ? undefined : num;
                };

                // تحديث المزاد
                const updatedAuction = await prisma.auctions.update({
                    where: { id },
                    data: {
                        ...(title && { title }),
                        ...(description !== undefined && { description }),
                        ...(status && { status }),
                        ...(endDate && { endDate: new Date(endDate) }),
                        ...(toNumber(minimumBid) !== undefined && { minimumBid: toNumber(minimumBid) }),
                        ...(featured !== undefined && { featured }),
                        ...(toNumber(startPrice) !== undefined && { startPrice: toNumber(startPrice) }),
                        updatedAt: new Date(),
                    },
                });

                // Log activity (safe - won't fail if admin doesn't exist)
                await safeLogActivity(auth.adminId, 'UPDATE_AUCTION', 'auction', id);

                return res.status(200).json({
                    success: true,
                    message: 'تم تحديث المزاد بنجاح',
                    auction: updatedAuction,
                });
            }

            case 'DELETE': {
                // Soft delete - تغيير الحالة إلى ملغي
                await prisma.auctions.update({
                    where: { id },
                    data: {
                        status: 'CANCELLED',
                        updatedAt: new Date(),
                    },
                });

                // Log activity (safe - won't fail if admin doesn't exist)
                await safeLogActivity(auth.adminId, 'CANCEL_AUCTION', 'auction', id);

                return res.status(200).json({
                    success: true,
                    message: 'تم إلغاء المزاد بنجاح',
                });
            }

            default:
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('Single Auction API error:', error);
        console.error('Auction ID:', req.query.id);
        console.error('Method:', req.method);
        console.error('Request Body:', JSON.stringify(req.body, null, 2));

        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
            error: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
            stack: process.env.NODE_ENV === 'development' ? errorStack : undefined,
        });
    }
}
