/**
 * 🗄️ نظام قاعدة البيانات الموحد العالمي
 * UNIFIED DATABASE SYSTEM
 * ========================================
 * الملف الوحيد لـ PrismaClient في المشروع
 * جميع الملفات الأخرى يجب أن تستورد من هنا
 */

import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import prismaClient from '../prisma';

// ============================================
// Singleton Pattern
// ============================================

export const prisma = prismaClient;

// ============================================
// Database Helpers
// ============================================

export const db = {
    /**
     * تنفيذ معاملة
     */
    async transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
        return prisma.$transaction(fn, {
            maxWait: 5000,
            timeout: 10000,
        });
    },

    /**
     * فحص صحة الاتصال
     */
    async healthCheck(): Promise<{ healthy: boolean; latency: number; }> {
        const start = Date.now();
        try {
            await prisma.$queryRaw`SELECT 1`;
            return { healthy: true, latency: Date.now() - start };
        } catch {
            return { healthy: false, latency: Date.now() - start };
        }
    },

    /**
     * قطع الاتصال
     */
    async disconnect(): Promise<void> {
        if (process.env.PRISMA_MANUAL_CONNECTION !== 'true') return;
        await prisma.$disconnect();
    },

    /**
     * إعادة الاتصال
     */
    async reconnect(): Promise<void> {
        if (process.env.PRISMA_MANUAL_CONNECTION !== 'true') return;
        await prisma.$disconnect();
        await prisma.$connect();
    },
};

// ============================================
// Query Helpers
// ============================================

export const queryHelpers = {
    /**
     * البحث مع pagination
     */
    async paginate<T>(
        model: any,
        options: {
            where?: any;
            orderBy?: any;
            page?: number;
            limit?: number;
            include?: any;
            select?: any;
        }
    ): Promise<{ data: T[]; total: number; page: number; totalPages: number; }> {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            model.findMany({
                where: options.where,
                orderBy: options.orderBy,
                skip,
                take: limit,
                include: options.include,
                select: options.select,
            }),
            model.count({ where: options.where }),
        ]);

        return {
            data,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    },

    /**
     * Soft delete
     */
    async softDelete(model: any, id: string): Promise<any> {
        return model.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });
    },

    /**
     * استعادة محذوف
     */
    async restore(model: any, id: string): Promise<any> {
        return model.update({
            where: { id },
            data: {
                isDeleted: false,
                deletedAt: null,
            },
        });
    },
};

// ============================================
// Error Handling
// ============================================

export function handlePrismaError(error: unknown): {
    code: string;
    message: string;
    statusCode: number;
} {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
            case 'P2002':
                return { code: 'DUPLICATE', message: 'البيانات موجودة مسبقاً', statusCode: 409 };
            case 'P2025':
                return { code: 'NOT_FOUND', message: 'البيانات غير موجودة', statusCode: 404 };
            case 'P2003':
                return { code: 'FK_ERROR', message: 'خطأ في المفتاح الأجنبي', statusCode: 400 };
            case 'P2014':
                return { code: 'RELATION_ERROR', message: 'خطأ في العلاقة', statusCode: 400 };
            default:
                return { code: 'DB_ERROR', message: 'خطأ في قاعدة البيانات', statusCode: 500 };
        }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        return { code: 'VALIDATION', message: 'بيانات غير صالحة', statusCode: 400 };
    }

    return { code: 'UNKNOWN', message: 'خطأ غير متوقع', statusCode: 500 };
}

// ============================================
// Exports
// ============================================

export { Prisma };
export type { PrismaClient };
export default prisma;
