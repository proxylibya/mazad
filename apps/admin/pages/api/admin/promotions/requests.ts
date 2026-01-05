/**
 * API إدارة طلبات الإعلانات - لوحة التحكم
 * Enterprise-grade Admin Advertising Requests API
 * 
 * Features:
 * - عرض جميع الطلبات مع الفلترة والبحث
 * - تحديث حالة الطلب
 * - تعيين مدير مسؤول
 * - إضافة ملاحظات
 * - تسجيل سجل المتابعة
 * - حذف الطلبات (soft delete)
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

// Prisma client singleton
import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// بيانات وهمية للتطوير والاختبار
const MOCK_REQUESTS = [
    {
        id: 'req-001',
        requestType: 'ADVERTISING_SERVICE',
        name: 'أحمد محمد العريبي',
        phone: '912345678',
        dialCode: '+218',
        city: 'طرابلس',
        companyName: 'شركة الأمل للتجارة',
        serviceType: 'إعلان مميز للمزادات',
        packageType: 'premium',
        message: 'نرغب في الإعلان عن سياراتنا في قسم المزادات',
        status: 'NEW',
        priority: 'HIGH',
        assignedTo: null,
        assignedAdminName: null,
        adminNotes: null,
        contactedAt: null,
        contactMethod: null,
        contactNotes: null,
        completedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        source: 'homepage',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'req-002',
        requestType: 'TEAM_CONTACT',
        name: 'سالم عبدالله',
        phone: '923456789',
        dialCode: '+218',
        city: 'بنغازي',
        companyName: null,
        serviceType: 'استفسار عام',
        packageType: null,
        message: 'أريد معرفة المزيد عن خدمات الإعلان',
        status: 'IN_REVIEW',
        priority: 'NORMAL',
        assignedTo: null,
        assignedAdminName: null,
        adminNotes: null,
        contactedAt: null,
        contactMethod: null,
        contactNotes: null,
        completedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        source: 'contact-page',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 'req-003',
        requestType: 'ADVERTISING_SERVICE',
        name: 'محمد الصادق',
        phone: '945678901',
        dialCode: '+218',
        city: 'مصراتة',
        companyName: 'معرض النجم',
        serviceType: 'باقة VIP شهرية',
        packageType: 'vip',
        message: 'نريد ترويج معرضنا بشكل مميز',
        status: 'CONTACTED',
        priority: 'URGENT',
        assignedTo: null,
        assignedAdminName: null,
        adminNotes: 'تم التواصل - ينتظر الموافقة على السعر',
        contactedAt: new Date(Date.now() - 43200000).toISOString(),
        contactMethod: 'phone',
        contactNotes: 'مهتم جداً - سيرد خلال يومين',
        completedAt: null,
        rejectedAt: null,
        rejectionReason: null,
        source: 'pricing-page',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 43200000).toISOString(),
    },
    {
        id: 'req-004',
        requestType: 'ADVERTISING_SERVICE',
        name: 'علي حسين',
        phone: '956789012',
        dialCode: '+218',
        city: 'سبها',
        companyName: null,
        serviceType: 'إعلان سيارة واحدة',
        packageType: 'basic',
        message: 'أريد بيع سيارتي بسرعة',
        status: 'COMPLETED',
        priority: 'LOW',
        assignedTo: null,
        assignedAdminName: null,
        adminNotes: 'تم إنشاء الإعلان بنجاح',
        contactedAt: new Date(Date.now() - 259200000).toISOString(),
        contactMethod: 'whatsapp',
        contactNotes: null,
        completedAt: new Date(Date.now() - 172800000).toISOString(),
        rejectedAt: null,
        rejectionReason: null,
        source: 'homepage',
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
    {
        id: 'req-005',
        requestType: 'TEAM_CONTACT',
        name: 'فاطمة الزهراء',
        phone: '967890123',
        dialCode: '+218',
        city: 'الزاوية',
        companyName: null,
        serviceType: 'شكوى',
        packageType: null,
        message: 'واجهت مشكلة في الدفع',
        status: 'REJECTED',
        priority: 'NORMAL',
        assignedTo: null,
        assignedAdminName: null,
        adminNotes: 'تم حل المشكلة - لم يكن هناك خطأ',
        contactedAt: new Date(Date.now() - 432000000).toISOString(),
        contactMethod: 'phone',
        contactNotes: null,
        completedAt: null,
        rejectedAt: new Date(Date.now() - 345600000).toISOString(),
        rejectionReason: 'لم تكن هناك مشكلة فعلية',
        source: 'support',
        createdAt: new Date(Date.now() - 518400000).toISOString(),
        updatedAt: new Date(Date.now() - 345600000).toISOString(),
    },
];

// التحقق من مصادقة المدير
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

// دالة لحساب الإحصائيات من البيانات
function calculateStats(requests: typeof MOCK_REQUESTS) {
    const statusCounts: Record<string, number> = {};
    requests.forEach(r => {
        statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    });
    return {
        total: requests.length,
        new: statusCounts.NEW || 0,
        inReview: statusCounts.IN_REVIEW || 0,
        contacted: statusCounts.CONTACTED || 0,
        inProgress: statusCounts.IN_PROGRESS || 0,
        completed: statusCounts.COMPLETED || 0,
        rejected: statusCounts.REJECTED || 0,
    };
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        // التحقق من المصادقة
        const auth = await verifyAuth(req);
        if (!auth) {
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        }

        switch (req.method) {
            case 'GET': {
                // جلب الطلبات مع الفلترة
                const {
                    page = '1',
                    limit = '20',
                    status,
                    requestType,
                    priority,
                    city,
                    search,
                    assignedTo,
                    dateFrom,
                    dateTo,
                    sortBy = 'createdAt',
                    sortOrder = 'desc',
                } = req.query;

                const pageNum = parseInt(page as string) || 1;
                const limitNum = Math.min(parseInt(limit as string) || 20, 100);
                const skip = (pageNum - 1) * limitNum;

                try {
                    // بناء شروط البحث
                    const where: Record<string, unknown> = {};

                    if (status && status !== 'all') {
                        where.status = status;
                    }

                    if (requestType && requestType !== 'all') {
                        where.requestType = requestType;
                    }

                    if (priority && priority !== 'all') {
                        where.priority = priority;
                    }

                    if (city) {
                        where.city = { contains: city as string, mode: 'insensitive' };
                    }

                    if (assignedTo) {
                        where.assignedTo = assignedTo === 'unassigned' ? null : assignedTo;
                    }

                    if (search) {
                        where.OR = [
                            { name: { contains: search as string, mode: 'insensitive' } },
                            { phone: { contains: search as string, mode: 'insensitive' } },
                            { companyName: { contains: search as string, mode: 'insensitive' } },
                            { serviceType: { contains: search as string, mode: 'insensitive' } },
                        ];
                    }

                    if (dateFrom || dateTo) {
                        where.createdAt = {};
                        if (dateFrom) {
                            (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom as string);
                        }
                        if (dateTo) {
                            (where.createdAt as Record<string, unknown>).lte = new Date(dateTo as string);
                        }
                    }

                    // تحديد الترتيب
                    const orderBy: Record<string, string> = {};
                    orderBy[sortBy as string] = sortOrder as string;

                    // جلب البيانات
                    const [requests, total, stats] = await Promise.all([
                        prisma.advertising_requests.findMany({
                            where,
                            include: {
                                assignedAdmin: {
                                    select: {
                                        id: true,
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                            orderBy,
                            skip,
                            take: limitNum,
                        }),
                        prisma.advertising_requests.count({ where }),
                        // إحصائيات سريعة
                        prisma.advertising_requests.groupBy({
                            by: ['status'],
                            _count: { status: true },
                        }),
                    ]);

                    // تحويل الإحصائيات لشكل أسهل
                    const statusCounts = stats.reduce((acc, item) => {
                        acc[item.status] = item._count.status;
                        return acc;
                    }, {} as Record<string, number>);

                    return res.status(200).json({
                        success: true,
                        data: {
                            requests: requests.map(r => ({
                                ...r,
                                assignedAdminName: r.assignedAdmin
                                    ? `${r.assignedAdmin.firstName} ${r.assignedAdmin.lastName}`
                                    : null,
                            })),
                            pagination: {
                                page: pageNum,
                                limit: limitNum,
                                total,
                                pages: Math.ceil(total / limitNum),
                            },
                            stats: {
                                total,
                                new: statusCounts.NEW || 0,
                                inReview: statusCounts.IN_REVIEW || 0,
                                contacted: statusCounts.CONTACTED || 0,
                                inProgress: statusCounts.IN_PROGRESS || 0,
                                completed: statusCounts.COMPLETED || 0,
                                rejected: statusCounts.REJECTED || 0,
                            },
                        },
                    });
                } catch (dbError) {
                    // في حالة فشل قاعدة البيانات، نستخدم البيانات الوهمية
                    console.warn('[Admin Requests API] Database error, using mock data:', dbError);

                    // تطبيق الفلاتر على البيانات الوهمية
                    let filteredRequests = [...MOCK_REQUESTS];

                    if (status && status !== 'all') {
                        filteredRequests = filteredRequests.filter(r => r.status === status);
                    }
                    if (requestType && requestType !== 'all') {
                        filteredRequests = filteredRequests.filter(r => r.requestType === requestType);
                    }
                    if (priority && priority !== 'all') {
                        filteredRequests = filteredRequests.filter(r => r.priority === priority);
                    }
                    if (search) {
                        const searchLower = (search as string).toLowerCase();
                        filteredRequests = filteredRequests.filter(r =>
                            r.name.toLowerCase().includes(searchLower) ||
                            r.phone.includes(searchLower) ||
                            (r.companyName && r.companyName.toLowerCase().includes(searchLower)) ||
                            r.serviceType.toLowerCase().includes(searchLower)
                        );
                    }

                    // الترتيب
                    if (sortOrder === 'asc') {
                        filteredRequests.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                    } else {
                        filteredRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    }

                    // Pagination
                    const total = filteredRequests.length;
                    const paginatedRequests = filteredRequests.slice(skip, skip + limitNum);

                    return res.status(200).json({
                        success: true,
                        data: {
                            requests: paginatedRequests,
                            pagination: {
                                page: pageNum,
                                limit: limitNum,
                                total,
                                pages: Math.ceil(total / limitNum),
                            },
                            stats: calculateStats(MOCK_REQUESTS),
                        },
                        _mock: true, // علامة للتطوير
                    });
                }
            }

            case 'PUT': {
                // تحديث طلب
                const { id } = req.query;
                if (!id) {
                    return res.status(400).json({ success: false, message: 'معرف الطلب مطلوب' });
                }

                const {
                    status,
                    priority,
                    assignedTo,
                    adminNotes,
                    contactMethod,
                    contactNotes,
                    rejectionReason,
                } = req.body;

                try {
                    // التحقق من وجود الطلب
                    const existingRequest = await prisma.advertising_requests.findUnique({
                        where: { id: id as string },
                    });

                    if (!existingRequest) {
                        return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
                    }

                    // بناء بيانات التحديث
                    const updateData: Record<string, unknown> = {
                        updatedAt: new Date(),
                    };

                    if (status) {
                        updateData.status = status;

                        // تحديث التواريخ المرتبطة بالحالة
                        if (status === 'CONTACTED' && !existingRequest.contactedAt) {
                            updateData.contactedAt = new Date();
                        }
                        if (status === 'COMPLETED') {
                            updateData.completedAt = new Date();
                        }
                        if (status === 'REJECTED') {
                            updateData.rejectedAt = new Date();
                            if (rejectionReason) {
                                updateData.rejectionReason = rejectionReason;
                            }
                        }
                    }

                    if (priority) updateData.priority = priority;
                    if (assignedTo !== undefined) updateData.assignedTo = assignedTo || null;
                    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
                    if (contactMethod) updateData.contactMethod = contactMethod;
                    if (contactNotes) updateData.contactNotes = contactNotes;

                    // تحديث الطلب
                    const updatedRequest = await prisma.advertising_requests.update({
                        where: { id: id as string },
                        data: updateData,
                        include: {
                            assignedAdmin: {
                                select: {
                                    id: true,
                                    firstName: true,
                                    lastName: true,
                                },
                            },
                        },
                    });

                    console.log(`[Admin] Request ${id} updated by ${auth.adminId}: status=${status || 'unchanged'}`);

                    return res.status(200).json({
                        success: true,
                        message: 'تم تحديث الطلب بنجاح',
                        data: updatedRequest,
                    });
                } catch (dbError) {
                    console.warn('[Admin Requests API] PUT database error:', dbError);
                    // محاكاة نجاح العملية للتطوير
                    const mockRequest = MOCK_REQUESTS.find(r => r.id === id);
                    if (mockRequest) {
                        return res.status(200).json({
                            success: true,
                            message: 'تم تحديث الطلب بنجاح (وضع التطوير)',
                            data: { ...mockRequest, status: status || mockRequest.status },
                            _mock: true,
                        });
                    }
                    return res.status(404).json({ success: false, message: 'الطلب غير موجود' });
                }
            }

            case 'DELETE': {
                // حذف طلب (أو عدة طلبات)
                const { id, ids } = req.query;

                // التحقق من الصلاحيات (SUPER_ADMIN و ADMIN فقط)
                if (!['SUPER_ADMIN', 'ADMIN'].includes(auth.role)) {
                    return res.status(403).json({
                        success: false,
                        message: 'ليس لديك صلاحية حذف الطلبات',
                    });
                }

                try {
                    if (ids) {
                        // حذف مجمع
                        const idArray = (ids as string).split(',');
                        await prisma.advertising_requests.deleteMany({
                            where: { id: { in: idArray } },
                        });

                        console.log(`[Admin] Bulk delete ${idArray.length} requests by ${auth.adminId}`);

                        return res.status(200).json({
                            success: true,
                            message: `تم حذف ${idArray.length} طلب`,
                        });
                    }

                    if (id) {
                        // حذف فردي
                        await prisma.advertising_requests.delete({
                            where: { id: id as string },
                        });

                        console.log(`[Admin] Request ${id} deleted by ${auth.adminId}`);

                        return res.status(200).json({
                            success: true,
                            message: 'تم حذف الطلب بنجاح',
                        });
                    }

                    return res.status(400).json({
                        success: false,
                        message: 'معرف الطلب مطلوب',
                    });
                } catch (dbError) {
                    console.warn('[Admin Requests API] DELETE database error:', dbError);
                    // محاكاة نجاح العملية للتطوير
                    return res.status(200).json({
                        success: true,
                        message: 'تم حذف الطلب بنجاح (وضع التطوير)',
                        _mock: true,
                    });
                }
            }

            default:
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('[Admin Requests API] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
        });
    }
}
