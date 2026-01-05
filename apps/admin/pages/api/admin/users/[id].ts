/**
 * API لإدارة مستخدم فردي
 * Single User Management API
 */

import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

// Prisma client singleton

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

        const { id } = req.query;
        if (!id || typeof id !== 'string') {
            return res.status(400).json({ success: false, message: 'معرف المستخدم مطلوب' });
        }

        switch (req.method) {
            case 'GET': {
                // Get user details
                const user = await prisma.users.findUnique({
                    where: { id },
                    select: {
                        id: true,
                        publicId: true,
                        name: true,
                        phone: true,
                        status: true,
                        role: true,
                        profileImage: true,
                        verified: true,
                        createdAt: true,
                        lastLogin: true,
                        rating: true,
                        totalReviews: true,
                        accountType: true,
                        isDeleted: true,
                        deletedAt: true,
                    },
                });

                if (!user) {
                    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
                }

                return res.status(200).json({ success: true, user });
            }

            case 'PATCH': {
                // Update user
                const { name, phone, status, role, verified, isDeleted } = req.body;

                // Build update data
                const updateData: Record<string, unknown> = { updatedAt: new Date() };

                // Handle restore from deleted
                if (isDeleted === false) {
                    updateData.isDeleted = false;
                    updateData.deletedAt = null;
                    updateData.status = 'ACTIVE';
                }

                if (name !== undefined) updateData.name = name;
                if (status !== undefined) updateData.status = status;
                if (role !== undefined) updateData.role = role;
                if (verified !== undefined) updateData.verified = verified;

                // Handle phone update
                if (phone !== undefined) {
                    // Normalize phone number
                    let normalizedPhone = phone.replace(/\s+/g, '').replace(/-/g, '');
                    if (normalizedPhone.startsWith('00218')) {
                        normalizedPhone = '+218' + normalizedPhone.slice(5);
                    } else if (normalizedPhone.startsWith('218')) {
                        normalizedPhone = '+' + normalizedPhone;
                    } else if (normalizedPhone.startsWith('0')) {
                        normalizedPhone = '+218' + normalizedPhone.slice(1);
                    } else if (!normalizedPhone.startsWith('+')) {
                        normalizedPhone = '+218' + normalizedPhone;
                    }

                    // Check if phone exists for another user
                    const existingPhone = await prisma.users.findFirst({
                        where: {
                            phone: normalizedPhone,
                            id: { not: id },
                        },
                    });

                    if (existingPhone) {
                        return res.status(400).json({
                            success: false,
                            message: 'رقم الهاتف مستخدم من مستخدم آخر',
                        });
                    }

                    updateData.phone = normalizedPhone;
                }

                const updatedUser = await prisma.users.update({
                    where: { id },
                    data: updateData,
                });

                // Log activity
                await logActivity(auth.adminId, 'UPDATE_USER', 'user', id);

                return res.status(200).json({
                    success: true,
                    message: 'تم تحديث المستخدم بنجاح',
                    user: updatedUser,
                });
            }

            case 'DELETE': {
                // Check permissions
                if (!['SUPER_ADMIN', 'ADMIN'].includes(auth.role)) {
                    return res.status(403).json({
                        success: false,
                        message: 'ليس لديك صلاحية حذف المستخدمين',
                    });
                }

                // Check if user exists
                const user = await prisma.users.findUnique({
                    where: { id },
                });

                if (!user) {
                    return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
                }

                // Check if permanent delete requested
                const isPermanent = req.query.permanent === 'true';

                if (isPermanent) {
                    // Permanent delete - actually remove from database
                    // First delete related records
                    try {
                        await prisma.user_passwords.deleteMany({ where: { userId: id } });
                    } catch {
                        // Ignore if table doesn't exist
                    }

                    await prisma.users.delete({ where: { id } });

                    // Log activity
                    await logActivity(auth.adminId, 'PERMANENT_DELETE_USER', 'user', id);

                    return res.status(200).json({
                        success: true,
                        message: 'تم الحذف النهائي للمستخدم بنجاح',
                    });
                } else {
                    // Soft delete - mark as deleted
                    await prisma.users.update({
                        where: { id },
                        data: {
                            isDeleted: true,
                            deletedAt: new Date(),
                            status: 'SUSPENDED',
                            updatedAt: new Date(),
                        },
                    });

                    // Log activity
                    await logActivity(auth.adminId, 'DELETE_USER', 'user', id);

                    return res.status(200).json({
                        success: true,
                        message: 'تم حذف المستخدم بنجاح',
                    });
                }
            }

            default:
                return res.status(405).json({ success: false, message: 'Method not allowed' });
        }
    } catch (error) {
        console.error('User API error:', error);
        return res.status(500).json({
            success: false,
            message: 'حدث خطأ في الخادم',
        });
    }
}

// Helper functions
function generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * تسجيل النشاط بشكل آمن
 * لا يسبب فشل العملية الرئيسية حتى لو فشل التسجيل
 */
async function logActivity(
    adminId: string,
    action: string,
    resourceType: string,
    resourceId: string
): Promise<void> {
    try {
        // التحقق من وجود المدير في قاعدة البيانات أولاً
        const adminExists = await prisma.admins.findUnique({
            where: { id: adminId },
            select: { id: true }
        });

        if (!adminExists) {
            console.log('[Users API] تخطي تسجيل النشاط - المدير غير موجود في DB:', adminId);
            return;
        }

        await prisma.admin_activities.create({
            data: {
                id: `act_${generateId()}`,
                admin_id: adminId,
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                success: true,
                created_at: new Date(),
            },
        });
        console.log('[Users API] تم تسجيل النشاط:', action);
    } catch (error) {
        // لا نفشل العملية الرئيسية بسبب فشل تسجيل النشاط
        console.warn('[Users API] تحذير: فشل تسجيل النشاط (غير حرج):',
            error instanceof Error ? error.message : error);
    }
}
