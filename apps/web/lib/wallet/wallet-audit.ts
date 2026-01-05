/**
 * خدمة تسجيل نشاط المحفظة
 * Wallet Audit Service
 *
 * @description تسجيل جميع العمليات المالية للمراجعة والأمان
 */

import { prisma } from '@/lib/prisma';
import type { ActivitySeverity, Prisma } from '@prisma/client';
import type { Currency, WalletType } from './wallet-types';

// ============================================
// Types
// ============================================

export type AuditAction =
    | 'BALANCE_CHECK'
    | 'TRANSFER_INITIATED'
    | 'TRANSFER_COMPLETED'
    | 'TRANSFER_FAILED'
    | 'SWAP_INITIATED'
    | 'SWAP_COMPLETED'
    | 'SWAP_FAILED'
    | 'DEPOSIT_INITIATED'
    | 'DEPOSIT_COMPLETED'
    | 'DEPOSIT_FAILED'
    | 'WITHDRAWAL_INITIATED'
    | 'WITHDRAWAL_COMPLETED'
    | 'WITHDRAWAL_FAILED'
    | 'SUSPICIOUS_ACTIVITY'
    | 'RATE_LIMIT_EXCEEDED'
    | 'AUTH_FAILED'
    | 'WALLET_CREATED';

export interface AuditLog {
    userId: string;
    action: AuditAction;
    details: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
}

export interface SuspiciousActivity {
    userId: string;
    type: 'UNUSUAL_AMOUNT' | 'RAPID_TRANSACTIONS' | 'UNUSUAL_LOCATION' | 'PATTERN_DETECTED';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    details: Record<string, unknown>;
}

// ============================================
// Audit Service
// ============================================

class WalletAuditService {
    private static instance: WalletAuditService;

    private constructor() { }

    static getInstance(): WalletAuditService {
        if (!WalletAuditService.instance) {
            WalletAuditService.instance = new WalletAuditService();
        }
        return WalletAuditService.instance;
    }

    /**
     * تسجيل نشاط في سجل المراجعة
     */
    async log(audit: AuditLog): Promise<void> {
        try {
            await prisma.activity_logs.create({
                data: {
                    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    userId: audit.userId,
                    entityType: 'WALLET',
                    entityId: 'wallet',
                    action: 'UPDATE',
                    description: audit.action,
                    metadata: {
                        auditAction: audit.action,
                        details: audit.details,
                        success: audit.success,
                        errorMessage: audit.errorMessage,
                    },
                    ipAddress: audit.ipAddress,
                    userAgent: audit.userAgent,
                    status: audit.success ? 'SUCCESS' : 'FAILED',
                    severity: this.getSeverity(audit.action),
                },
            });

            // Check for suspicious activity
            if (this.isSuspicious(audit)) {
                await this.flagSuspiciousActivity(audit);
            }
        } catch (error) {
            // Don't throw - audit failures shouldn't break operations
            console.error('Audit log failed:', error);
        }
    }

    /**
     * تسجيل عملية تحويل
     */
    async logTransfer(
        userId: string,
        recipientId: string,
        amount: number,
        currency: Currency,
        walletType: WalletType,
        success: boolean,
        transactionId?: string,
        errorMessage?: string,
        ipAddress?: string
    ): Promise<void> {
        await this.log({
            userId,
            action: success ? 'TRANSFER_COMPLETED' : 'TRANSFER_FAILED',
            details: {
                recipientId,
                amount,
                currency,
                walletType,
                transactionId,
            },
            success,
            errorMessage,
            ipAddress,
        });
    }

    /**
     * تسجيل عملية تبديل
     */
    async logSwap(
        userId: string,
        fromCurrency: Currency,
        toCurrency: Currency,
        fromAmount: number,
        toAmount: number,
        rate: number,
        success: boolean,
        transactionId?: string,
        errorMessage?: string,
        ipAddress?: string
    ): Promise<void> {
        await this.log({
            userId,
            action: success ? 'SWAP_COMPLETED' : 'SWAP_FAILED',
            details: {
                fromCurrency,
                toCurrency,
                fromAmount,
                toAmount,
                rate,
                transactionId,
            },
            success,
            errorMessage,
            ipAddress,
        });
    }

    /**
     * تسجيل عملية إيداع
     */
    async logDeposit(
        userId: string,
        amount: number,
        currency: Currency,
        walletType: WalletType,
        paymentMethod: string,
        success: boolean,
        transactionId?: string,
        errorMessage?: string,
        ipAddress?: string
    ): Promise<void> {
        await this.log({
            userId,
            action: success ? 'DEPOSIT_COMPLETED' : 'DEPOSIT_FAILED',
            details: {
                amount,
                currency,
                walletType,
                paymentMethod,
                transactionId,
            },
            success,
            errorMessage,
            ipAddress,
        });
    }

    /**
     * تسجيل تجاوز حد الطلبات
     */
    async logRateLimitExceeded(
        userId: string,
        action: string,
        ipAddress?: string
    ): Promise<void> {
        await this.log({
            userId,
            action: 'RATE_LIMIT_EXCEEDED',
            details: {
                attemptedAction: action,
                timestamp: new Date().toISOString(),
            },
            success: false,
            ipAddress,
        });
    }

    /**
     * تسجيل فشل المصادقة
     */
    async logAuthFailure(
        identifier: string,
        reason: string,
        ipAddress?: string
    ): Promise<void> {
        await this.log({
            userId: identifier,
            action: 'AUTH_FAILED',
            details: {
                reason,
                timestamp: new Date().toISOString(),
            },
            success: false,
            ipAddress,
        });
    }

    /**
     * الحصول على سجل نشاط المستخدم
     */
    async getUserAuditLog(
        userId: string,
        options?: {
            limit?: number;
            offset?: number;
            action?: AuditAction;
            startDate?: Date;
            endDate?: Date;
        }
    ): Promise<unknown[]> {
        try {
            const where: Prisma.activity_logsWhereInput = {
                userId,
                entityType: 'WALLET',
            };

            if (options?.action) {
                where.action = options.action;
            }

            if (options?.startDate || options?.endDate) {
                where.createdAt = {} as any;
                if (options.startDate) {
                    (where.createdAt as any).gte = options.startDate;
                }
                if (options.endDate) {
                    (where.createdAt as any).lte = options.endDate;
                }
            }

            return await prisma.activity_logs.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: options?.limit || 50,
                skip: options?.offset || 0,
            });
        } catch (error) {
            console.error('Failed to get audit log:', error);
            return [];
        }
    }

    // ============================================
    // Private Methods
    // ============================================

    /**
     * تحديد مستوى الخطورة للعملية
     */
    private getSeverity(action: AuditAction): ActivitySeverity {
        const highSeverity = [
            'TRANSFER_FAILED',
            'SWAP_FAILED',
            'DEPOSIT_FAILED',
            'WITHDRAWAL_FAILED',
            'SUSPICIOUS_ACTIVITY',
            'AUTH_FAILED',
        ];

        const mediumSeverity = ['RATE_LIMIT_EXCEEDED'];

        if (highSeverity.includes(action)) return 'WARNING';
        if (mediumSeverity.includes(action)) return 'INFO';
        return 'LOW';
    }

    /**
     * التحقق من النشاط المشبوه
     */
    private isSuspicious(audit: AuditLog): boolean {
        // Check for unusual amounts
        const amount = audit.details.amount as number;
        if (amount && amount > 50000) {
            return true;
        }

        // Check for rapid failures
        if (!audit.success && audit.action.includes('FAILED')) {
            return true;
        }

        // Check for rate limit abuse
        if (audit.action === 'RATE_LIMIT_EXCEEDED') {
            return true;
        }

        return false;
    }

    /**
     * تسجيل النشاط المشبوه
     */
    private async flagSuspiciousActivity(audit: AuditLog): Promise<void> {
        try {
            // Create notification for admin
            await prisma.notifications.create({
                data: {
                    id: `notify_suspicious_${Date.now()}`,
                    userId: audit.userId,
                    type: 'SYSTEM',
                    title: 'نشاط مشبوه',
                    message: `تم اكتشاف نشاط مشبوه: ${audit.action}`,
                    isRead: false,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            });

            // Log additional alert
            console.warn('SUSPICIOUS_ACTIVITY:', {
                userId: audit.userId,
                action: audit.action,
                details: audit.details,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            console.error('Failed to flag suspicious activity:', error);
        }
    }
}

// Export singleton instance
export const walletAuditService = WalletAuditService.getInstance();
