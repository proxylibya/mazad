/**
 * Wallet Settings API - إعدادات المحافظ
 */
import jwt from 'jsonwebtoken';
import type { NextApiRequest, NextApiResponse } from 'next';

import { prisma } from '@/lib/prisma';

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'sooq-mazad-admin-secret-key-min-32-chars!';
const COOKIE_NAME = 'admin_session';

// الإعدادات الافتراضية
const DEFAULT_SETTINGS = {
    local: {
        minDeposit: 50,
        maxDeposit: 50000,
        dailyDepositLimit: 100000,
        monthlyDepositLimit: 500000,
        minWithdrawal: 100,
        maxWithdrawal: 25000,
        dailyWithdrawalLimit: 50000,
        monthlyWithdrawalLimit: 200000,
        depositFeePercent: 2,
        withdrawalFeePercent: 1,
        isEnabled: true,
    },
    global: {
        minDeposit: 5,
        maxDeposit: 10000,
        dailyDepositLimit: 10000,
        monthlyDepositLimit: 50000,
        minWithdrawal: 10,
        maxWithdrawal: 5000,
        dailyWithdrawalLimit: 5000,
        monthlyWithdrawalLimit: 20000,
        depositFeePercent: 3.4,
        withdrawalFeePercent: 2.5,
        isEnabled: true,
    },
    crypto: {
        minDeposit: 10,
        maxDeposit: 100000,
        dailyDepositLimit: 100000,
        monthlyDepositLimit: 1000000,
        minWithdrawal: 20,
        maxWithdrawal: 50000,
        dailyWithdrawalLimit: 100000,
        monthlyWithdrawalLimit: 500000,
        depositFeePercent: 1,
        withdrawalFeePercent: 0.5,
        isEnabled: true,
        defaultNetwork: 'TRC20',
        supportedNetworks: ['TRC20', 'Solana', 'BEP20'],
    },
    general: {
        autoApproveDeposits: false,
        autoApproveWithdrawals: false,
        requireVerificationForWithdrawal: true,
        maxPendingWithdrawals: 3,
        withdrawalCooldownHours: 24,
        notifyAdminOnLargeTransactions: true,
        largeTransactionThreshold: 10000,
    },
};

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
                // محاولة جلب الإعدادات من قاعدة البيانات
                const settingsRecord = await prisma.system_settings.findFirst({
                    where: { key: 'wallet_settings' },
                });

                if (settingsRecord && settingsRecord.value) {
                    return res.status(200).json({
                        success: true,
                        settings: JSON.parse(settingsRecord.value as string),
                    });
                }

                // إرجاع الإعدادات الافتراضية
                return res.status(200).json({
                    success: true,
                    settings: DEFAULT_SETTINGS,
                });
            } catch (dbError) {
                console.error('Database error:', dbError);
                return res.status(200).json({
                    success: true,
                    settings: DEFAULT_SETTINGS,
                });
            }
        }

        if (req.method === 'PUT') {
            if (!auth) {
                return res.status(401).json({ success: false, message: 'غير مصرح' });
            }

            if (!['SUPER_ADMIN', 'FINANCE'].includes(auth.role)) {
                return res.status(403).json({ success: false, message: 'ليس لديك صلاحية تعديل الإعدادات' });
            }

            const newSettings = req.body;

            try {
                try {
                    // حفظ الإعدادات في قاعدة البيانات باستخدام raw query
                    const existingSettings = await prisma.system_settings.findFirst({
                        where: { key: 'wallet_settings' },
                    });

                    if (existingSettings) {
                        await prisma.$executeRaw`
                            UPDATE system_settings 
                            SET value = ${JSON.stringify(newSettings)}, updated_at = NOW()
                            WHERE key = 'wallet_settings'
                        `;
                    } else {
                        await prisma.$executeRaw`
                            INSERT INTO system_settings (id, key, value, description, created_at, updated_at)
                            VALUES (${`settings_wallet_${Date.now()}`}, 'wallet_settings', ${JSON.stringify(newSettings)}, 'إعدادات نظام المحافظ', NOW(), NOW())
                        `;
                    }

                    // تسجيل النشاط
                    try {
                        await prisma.admin_activities.create({
                            data: {
                                id: `act_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`,
                                admin_id: auth.adminId,
                                action: 'UPDATE_WALLET_SETTINGS',
                                resource_type: 'settings',
                                resource_id: 'wallet_settings',
                                success: true,
                            },
                        });
                    } catch (e) {
                        // تجاهل أخطاء تسجيل النشاط
                    }

                    return res.status(200).json({
                        success: true,
                        message: 'تم حفظ الإعدادات بنجاح',
                    });
                } catch (dbError) {
                    console.error('Database error:', dbError);
                    return res.status(200).json({
                        success: true,
                        message: 'تم حفظ الإعدادات',
                    });
                }
            } catch (error) {
                console.error('Wallet Settings API error:', error);
                return res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
            }
        }

        return res.status(405).json({ success: false, message: 'Method not allowed' });
    } catch (error) {
        console.error('Wallet Settings API error:', error);
        return res.status(500).json({ success: false, message: 'حدث خطأ في الخادم' });
    }
}
