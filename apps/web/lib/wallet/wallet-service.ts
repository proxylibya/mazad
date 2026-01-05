/**
 * خدمة المحفظة الموحدة
 * Unified Wallet Service
 *
 * @description خدمة مركزية لجميع عمليات المحفظة
 * @version 2.0.0
 */

import { prisma } from '@/lib/prisma';
import { walletCache } from './wallet-cache';
import {
    WALLET_ERROR_MESSAGES
} from './wallet-constants';
import type {
    Currency,
    FullWalletData,
    MultiWalletData,
    PrismaWallet,
    SwapRequest,
    SwapResponse,
    TransferRequest,
    TransferResponse,
    WalletTypeLower
} from './wallet-types';
import { WALLET_CONFIG } from './wallet-types';
import {
    calculateFees,
    convertCurrency,
    generateTRC20Address,
    generateTransactionReference,
    generateUniqueId,
    getCurrencyFromWalletType,
    toUpperWalletType,
} from './wallet-utils';
import {
    validateSwapRequest,
    validateTransferRequest,
} from './wallet-validation';

// ============================================
// Wallet Service Class
// ============================================

export class WalletService {
    private static instance: WalletService;

    private constructor() { }

    static getInstance(): WalletService {
        if (!WalletService.instance) {
            WalletService.instance = new WalletService();
        }
        return WalletService.instance;
    }

    // ============================================
    // Wallet Retrieval
    // ============================================

    /**
     * الحصول على محفظة المستخدم مع جميع المحافظ الفرعية
     */
    async getWalletByUserId(userId: string): Promise<FullWalletData | null> {
        try {
            const wallet = await prisma.wallets.findUnique({
                where: { userId },
                include: {
                    local_wallets: true,
                    global_wallets: true,
                    crypto_wallets: true,
                },
            });

            if (!wallet) return null;

            return this.mapPrismaWallet(wallet as unknown as PrismaWallet);
        } catch (error) {
            console.error('Error getting wallet:', error);
            return null;
        }
    }

    /**
     * الحصول على أرصدة المحافظ المتعددة
     */
    async getMultiWalletBalance(userId: string): Promise<MultiWalletData> {
        // Try cache first
        const cached = await walletCache.getWalletBalance(userId);
        if (cached) {
            return {
                local: { balance: cached.local, currency: 'LYD', isActive: true },
                global: { balance: cached.global, currency: 'USD', isActive: true },
                crypto: {
                    balance: cached.crypto,
                    currency: 'USDT',
                    isActive: true,
                    network: 'TRC20',
                },
            };
        }

        // Fetch from database
        const wallet = await this.getWalletByUserId(userId);

        const result: MultiWalletData = {
            local: {
                balance: wallet?.local?.balance || 0,
                currency: 'LYD',
                isActive: wallet?.local?.isActive ?? true,
            },
            global: {
                balance: wallet?.global?.balance || 0,
                currency: 'USD',
                isActive: wallet?.global?.isActive ?? true,
            },
            crypto: {
                balance: wallet?.crypto?.balance || 0,
                currency: 'USDT',
                isActive: wallet?.crypto?.isActive ?? true,
                address: wallet?.crypto?.address,
                network: wallet?.crypto?.network || 'TRC20',
            },
        };

        // Cache the result
        await walletCache.setWalletBalance(userId, {
            local: result.local.balance,
            global: result.global.balance,
            crypto: result.crypto.balance,
        });

        return result;
    }

    /**
     * الحصول على رصيد محفظة معينة
     */
    async getWalletBalance(
        userId: string,
        walletType: WalletTypeLower
    ): Promise<number> {
        const wallet = await this.getWalletByUserId(userId);
        if (!wallet) return 0;

        switch (walletType) {
            case 'local':
                return wallet.local?.balance || 0;
            case 'global':
                return wallet.global?.balance || 0;
            case 'crypto':
                return wallet.crypto?.balance || 0;
            default:
                return 0;
        }
    }

    // ============================================
    // Wallet Creation
    // ============================================

    /**
     * إنشاء محفظة جديدة للمستخدم
     */
    async createWallet(userId: string): Promise<FullWalletData | null> {
        try {
            const walletId = generateUniqueId('wallet');
            const now = new Date();

            // Create main wallet with sub-wallets in a transaction
            const wallet = await prisma.$transaction(async (tx) => {
                // Create main wallet
                const mainWallet = await tx.wallets.create({
                    data: {
                        id: walletId,
                        userId,
                        isActive: true,
                        createdAt: now,
                        updatedAt: now,
                    },
                });

                // Create local wallet
                await tx.local_wallets.create({
                    data: {
                        id: generateUniqueId('local'),
                        walletId: mainWallet.id,
                        balance: 0,
                        currency: 'LYD',
                        isActive: true,
                        createdAt: now,
                        updatedAt: now,
                    },
                });

                // Create global wallet
                await tx.global_wallets.create({
                    data: {
                        id: generateUniqueId('global'),
                        walletId: mainWallet.id,
                        balance: 0,
                        currency: 'USD',
                        isActive: true,
                        createdAt: now,
                        updatedAt: now,
                    },
                });

                // Create crypto wallet with address
                const cryptoAddress = generateTRC20Address(userId);
                await tx.crypto_wallets.create({
                    data: {
                        id: generateUniqueId('crypto'),
                        walletId: mainWallet.id,
                        balance: 0,
                        currency: 'USDT-TRC20',
                        address: cryptoAddress,
                        network: 'TRC20',
                        isActive: true,
                        createdAt: now,
                        updatedAt: now,
                    },
                });

                return mainWallet;
            });

            // Fetch the complete wallet with sub-wallets
            return this.getWalletByUserId(userId);
        } catch (error) {
            console.error('Error creating wallet:', error);
            return null;
        }
    }

    /**
     * الحصول على المحفظة أو إنشاؤها إذا لم تكن موجودة
     */
    async getOrCreateWallet(userId: string): Promise<FullWalletData | null> {
        let wallet = await this.getWalletByUserId(userId);
        if (!wallet) {
            wallet = await this.createWallet(userId);
        }
        return wallet;
    }

    // ============================================
    // Transfer Operations
    // ============================================

    /**
     * تحويل الأموال بين المستخدمين
     */
    async transfer(request: TransferRequest): Promise<TransferResponse> {
        // Validate request
        const validation = validateTransferRequest(request);
        if (!validation.isValid) {
            return {
                success: false,
                amount: request.amount,
                currency: getCurrencyFromWalletType(request.walletType),
                error: validation.error,
            };
        }

        try {
            // Find recipient user
            const recipientUser = await this.findUserByIdentifier(
                request.recipientIdentifier
            );
            if (!recipientUser) {
                return {
                    success: false,
                    amount: request.amount,
                    currency: getCurrencyFromWalletType(request.walletType),
                    error: WALLET_ERROR_MESSAGES.RECIPIENT_NOT_FOUND,
                };
            }

            // Check self-transfer
            if (recipientUser.id === request.senderId) {
                return {
                    success: false,
                    amount: request.amount,
                    currency: getCurrencyFromWalletType(request.walletType),
                    error: WALLET_ERROR_MESSAGES.SELF_TRANSFER_NOT_ALLOWED,
                };
            }

            // Get sender wallet
            const senderWallet = await this.getOrCreateWallet(request.senderId);
            if (!senderWallet) {
                return {
                    success: false,
                    amount: request.amount,
                    currency: getCurrencyFromWalletType(request.walletType),
                    error: WALLET_ERROR_MESSAGES.WALLET_NOT_FOUND,
                };
            }

            // Get sender balance
            const senderBalance = await this.getWalletBalance(
                request.senderId,
                request.walletType
            );
            if (senderBalance < request.amount) {
                return {
                    success: false,
                    amount: request.amount,
                    currency: getCurrencyFromWalletType(request.walletType),
                    error: WALLET_ERROR_MESSAGES.INSUFFICIENT_BALANCE,
                };
            }

            // Get or create recipient wallet
            const recipientWallet = await this.getOrCreateWallet(recipientUser.id);
            if (!recipientWallet) {
                return {
                    success: false,
                    amount: request.amount,
                    currency: getCurrencyFromWalletType(request.walletType),
                    error: 'فشل في إنشاء محفظة المستلم',
                };
            }

            // Calculate fees
            const feeCalc = calculateFees(
                request.amount,
                request.walletType,
                'TRANSFER'
            );
            const currency = getCurrencyFromWalletType(request.walletType);
            const walletType = toUpperWalletType(request.walletType);

            // Get the correct sub-wallet table and IDs
            const config = WALLET_CONFIG[request.walletType];
            const subWalletField = config.field;

            // Execute transfer in transaction
            const transactionId = generateUniqueId('txn');
            const now = new Date();
            const reference = generateTransactionReference(walletType, 'TRANSFER');

            await prisma.$transaction(async (tx) => {
                // Deduct from sender's sub-wallet
                if (subWalletField === 'local_wallets') {
                    await tx.local_wallets.update({
                        where: { walletId: senderWallet.id },
                        data: {
                            balance: { decrement: request.amount },
                            updatedAt: now,
                        },
                    });
                    await tx.local_wallets.update({
                        where: { walletId: recipientWallet.id },
                        data: {
                            balance: { increment: request.amount - feeCalc.feeAmount },
                            updatedAt: now,
                        },
                    });
                } else if (subWalletField === 'global_wallets') {
                    await tx.global_wallets.update({
                        where: { walletId: senderWallet.id },
                        data: {
                            balance: { decrement: request.amount },
                            updatedAt: now,
                        },
                    });
                    await tx.global_wallets.update({
                        where: { walletId: recipientWallet.id },
                        data: {
                            balance: { increment: request.amount - feeCalc.feeAmount },
                            updatedAt: now,
                        },
                    });
                } else if (subWalletField === 'crypto_wallets') {
                    await tx.crypto_wallets.update({
                        where: { walletId: senderWallet.id },
                        data: {
                            balance: { decrement: request.amount },
                            updatedAt: now,
                        },
                    });
                    await tx.crypto_wallets.update({
                        where: { walletId: recipientWallet.id },
                        data: {
                            balance: { increment: request.amount - feeCalc.feeAmount },
                            updatedAt: now,
                        },
                    });
                }

                await tx.transactions.create({
                    data: {
                        id: `${transactionId}_send`,
                        walletId: senderWallet.id,
                        type: 'WITHDRAWAL',
                        amount: -request.amount,
                        currency,
                        status: 'COMPLETED',
                        walletType,
                        description: `إرسال إلى ${recipientUser.name || recipientUser.phone}${request.note ? ` - ${request.note}` : ''}`,
                        reference,
                        createdAt: now,
                        updatedAt: now,
                    },
                });

                await tx.transactions.create({
                    data: {
                        id: `${transactionId}_recv`,
                        walletId: recipientWallet.id,
                        type: 'DEPOSIT',
                        amount: request.amount - feeCalc.feeAmount,
                        currency,
                        status: 'COMPLETED',
                        walletType,
                        description: `استلام من مستخدم${request.note ? ` - ${request.note}` : ''}`,
                        reference,
                        createdAt: now,
                        updatedAt: now,
                    },
                });
            });

            // Invalidate cache for both users
            await Promise.all([
                walletCache.invalidateWalletBalance(request.senderId),
                walletCache.invalidateWalletBalance(recipientUser.id),
                walletCache.invalidateTransactions(request.senderId),
                walletCache.invalidateTransactions(recipientUser.id),
            ]);

            return {
                success: true,
                transactionId,
                amount: request.amount,
                currency,
                recipient: {
                    id: recipientUser.id,
                    name: recipientUser.name || undefined,
                    phone: recipientUser.phone || undefined,
                },
                fee: feeCalc.feeAmount,
                message: 'تم الإرسال بنجاح',
            };
        } catch (error) {
            console.error('Transfer error:', error);
            return {
                success: false,
                amount: request.amount,
                currency: getCurrencyFromWalletType(request.walletType),
                error: error instanceof Error ? error.message : 'حدث خطأ أثناء الإرسال',
            };
        }
    }

    // ============================================
    // Swap Operations
    // ============================================

    /**
     * تبديل العملات بين المحافظ
     */
    async swap(request: SwapRequest): Promise<SwapResponse> {
        // Validate request
        const validation = validateSwapRequest(request);
        if (!validation.isValid) {
            return {
                success: false,
                fromAmount: request.amount,
                fromCurrency: getCurrencyFromWalletType(request.fromWallet),
                toAmount: 0,
                toCurrency: getCurrencyFromWalletType(request.toWallet),
                rate: 0,
                error: validation.error,
            };
        }

        try {
            // Get wallet
            const wallet = await this.getOrCreateWallet(request.userId);
            if (!wallet) {
                return {
                    success: false,
                    fromAmount: request.amount,
                    fromCurrency: getCurrencyFromWalletType(request.fromWallet),
                    toAmount: 0,
                    toCurrency: getCurrencyFromWalletType(request.toWallet),
                    rate: 0,
                    error: WALLET_ERROR_MESSAGES.WALLET_NOT_FOUND,
                };
            }

            // Check balance
            const fromBalance = await this.getWalletBalance(
                request.userId,
                request.fromWallet
            );
            if (fromBalance < request.amount) {
                return {
                    success: false,
                    fromAmount: request.amount,
                    fromCurrency: getCurrencyFromWalletType(request.fromWallet),
                    toAmount: 0,
                    toCurrency: getCurrencyFromWalletType(request.toWallet),
                    rate: 0,
                    error: WALLET_ERROR_MESSAGES.INSUFFICIENT_BALANCE,
                };
            }

            // Get exchange rate and calculate converted amount
            const fromCurrency = getCurrencyFromWalletType(request.fromWallet);
            const toCurrency = getCurrencyFromWalletType(request.toWallet);
            const { amount: convertedAmount, rate } = convertCurrency(
                request.amount,
                fromCurrency,
                toCurrency
            );

            // Calculate fees
            const fromConfig = WALLET_CONFIG[request.fromWallet];
            const toConfig = WALLET_CONFIG[request.toWallet];

            const now = new Date();
            const transactionId = generateUniqueId('swap');
            const reference = generateTransactionReference(
                toUpperWalletType(request.toWallet),
                'SWAP'
            );

            // Execute swap in transaction
            await prisma.$transaction(async (tx) => {
                // Deduct from source wallet
                if (fromConfig.field === 'local_wallets') {
                    await tx.local_wallets.update({
                        where: { walletId: wallet.id },
                        data: { balance: { decrement: request.amount }, updatedAt: now },
                    });
                } else if (fromConfig.field === 'global_wallets') {
                    await tx.global_wallets.update({
                        where: { walletId: wallet.id },
                        data: { balance: { decrement: request.amount }, updatedAt: now },
                    });
                } else if (fromConfig.field === 'crypto_wallets') {
                    await tx.crypto_wallets.update({
                        where: { walletId: wallet.id },
                        data: { balance: { decrement: request.amount }, updatedAt: now },
                    });
                }

                // Add to destination wallet
                if (toConfig.field === 'local_wallets') {
                    await tx.local_wallets.update({
                        where: { walletId: wallet.id },
                        data: { balance: { increment: convertedAmount }, updatedAt: now },
                    });
                } else if (toConfig.field === 'global_wallets') {
                    await tx.global_wallets.update({
                        where: { walletId: wallet.id },
                        data: { balance: { increment: convertedAmount }, updatedAt: now },
                    });
                } else if (toConfig.field === 'crypto_wallets') {
                    await tx.crypto_wallets.update({
                        where: { walletId: wallet.id },
                        data: { balance: { increment: convertedAmount }, updatedAt: now },
                    });
                }

                await tx.transactions.create({
                    data: {
                        id: transactionId,
                        walletId: wallet.id,
                        type: 'TRANSFER',
                        amount: convertedAmount,
                        currency: toCurrency,
                        status: 'COMPLETED',
                        walletType: toUpperWalletType(request.toWallet),
                        description: `تبديل ${request.amount} ${fromCurrency} إلى ${convertedAmount.toFixed(2)} ${toCurrency}`,
                        reference,
                        createdAt: now,
                        updatedAt: now,
                    },
                });
            });

            // Invalidate cache
            await walletCache.invalidateWalletBalance(request.userId);
            await walletCache.invalidateTransactions(request.userId);

            return {
                success: true,
                transactionId,
                fromAmount: request.amount,
                fromCurrency,
                toAmount: convertedAmount,
                toCurrency,
                rate,
                message: 'تم التبديل بنجاح',
            };
        } catch (error) {
            console.error('Swap error:', error);
            return {
                success: false,
                fromAmount: request.amount,
                fromCurrency: getCurrencyFromWalletType(request.fromWallet),
                toAmount: 0,
                toCurrency: getCurrencyFromWalletType(request.toWallet),
                rate: 0,
                error: error instanceof Error ? error.message : 'حدث خطأ أثناء التبديل',
            };
        }
    }

    // ============================================
    // Balance Operations
    // ============================================

    /**
     * إضافة رصيد إلى محفظة معينة
     */
    async addBalance(
        userId: string,
        walletType: WalletTypeLower,
        amount: number,
        description?: string
    ): Promise<boolean> {
        try {
            const wallet = await this.getOrCreateWallet(userId);
            if (!wallet) return false;

            const config = WALLET_CONFIG[walletType];
            const now = new Date();

            if (config.field === 'local_wallets') {
                await prisma.local_wallets.update({
                    where: { walletId: wallet.id },
                    data: { balance: { increment: amount }, updatedAt: now },
                });
            } else if (config.field === 'global_wallets') {
                await prisma.global_wallets.update({
                    where: { walletId: wallet.id },
                    data: { balance: { increment: amount }, updatedAt: now },
                });
            } else if (config.field === 'crypto_wallets') {
                await prisma.crypto_wallets.update({
                    where: { walletId: wallet.id },
                    data: { balance: { increment: amount }, updatedAt: now },
                });
            }

            await walletCache.invalidateWalletBalance(userId);
            return true;
        } catch (error) {
            console.error('Error adding balance:', error);
            return false;
        }
    }

    /**
     * خصم رصيد من محفظة معينة
     */
    async deductBalance(
        userId: string,
        walletType: WalletTypeLower,
        amount: number,
        description?: string
    ): Promise<boolean> {
        try {
            // Check balance first
            const balance = await this.getWalletBalance(userId, walletType);
            if (balance < amount) return false;

            const wallet = await this.getWalletByUserId(userId);
            if (!wallet) return false;

            const config = WALLET_CONFIG[walletType];
            const now = new Date();

            if (config.field === 'local_wallets') {
                await prisma.local_wallets.update({
                    where: { walletId: wallet.id },
                    data: { balance: { decrement: amount }, updatedAt: now },
                });
            } else if (config.field === 'global_wallets') {
                await prisma.global_wallets.update({
                    where: { walletId: wallet.id },
                    data: { balance: { decrement: amount }, updatedAt: now },
                });
            } else if (config.field === 'crypto_wallets') {
                await prisma.crypto_wallets.update({
                    where: { walletId: wallet.id },
                    data: { balance: { decrement: amount }, updatedAt: now },
                });
            }

            await walletCache.invalidateWalletBalance(userId);
            return true;
        } catch (error) {
            console.error('Error deducting balance:', error);
            return false;
        }
    }

    // ============================================
    // Helper Methods
    // ============================================

    /**
     * البحث عن مستخدم بالمعرف (هاتف، اسم مستخدم، أو معرف عام)
     */
    private async findUserByIdentifier(identifier: string): Promise<{
        id: string;
        name?: string | null;
        phone?: string | null;
    } | null> {
        try {
            const cleanIdentifier = identifier.trim();
            const publicId = parseInt(cleanIdentifier, 10);

            const user = await prisma.users.findFirst({
                where: {
                    OR: [
                        { phone: cleanIdentifier },
                        { username: cleanIdentifier.replace('@', '') },
                        ...(isNaN(publicId) ? [] : [{ publicId }]),
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    phone: true,
                },
            });

            return user;
        } catch (error) {
            console.error('Error finding user:', error);
            return null;
        }
    }

    /**
     * تحويل محفظة Prisma إلى FullWalletData
     */
    private mapPrismaWallet(wallet: PrismaWallet): FullWalletData {
        return {
            id: wallet.id,
            userId: wallet.userId,
            isActive: wallet.isActive,
            publicId: wallet.publicId,
            createdAt: wallet.createdAt,
            updatedAt: wallet.updatedAt,
            local: wallet.local_wallets
                ? {
                    id: wallet.local_wallets.id,
                    walletId: wallet.local_wallets.walletId,
                    balance: wallet.local_wallets.balance,
                    currency: wallet.local_wallets.currency as Currency,
                    isActive: wallet.local_wallets.isActive,
                    createdAt: wallet.local_wallets.createdAt,
                    updatedAt: wallet.local_wallets.updatedAt,
                }
                : null,
            global: wallet.global_wallets
                ? {
                    id: wallet.global_wallets.id,
                    walletId: wallet.global_wallets.walletId,
                    balance: wallet.global_wallets.balance,
                    currency: wallet.global_wallets.currency as Currency,
                    isActive: wallet.global_wallets.isActive,
                    createdAt: wallet.global_wallets.createdAt,
                    updatedAt: wallet.global_wallets.updatedAt,
                }
                : null,
            crypto: wallet.crypto_wallets
                ? {
                    id: wallet.crypto_wallets.id,
                    walletId: wallet.crypto_wallets.walletId,
                    balance: wallet.crypto_wallets.balance,
                    currency: wallet.crypto_wallets.currency as Currency,
                    isActive: wallet.crypto_wallets.isActive,
                    createdAt: wallet.crypto_wallets.createdAt,
                    updatedAt: wallet.crypto_wallets.updatedAt,
                    address: wallet.crypto_wallets.address || undefined,
                    network: wallet.crypto_wallets.network,
                    publicKey: wallet.crypto_wallets.publicKey || undefined,
                }
                : null,
        };
    }
}

// Export singleton instance
export const walletService = WalletService.getInstance();
