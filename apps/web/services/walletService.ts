import { prisma } from '@/lib/prisma';

export interface WalletBalance {
  total: number;
  available: number;
  frozen: number;
  currency: string;
}

export const walletService = {
  async getWalletByUserId(userId: string) {
    const wallet = await prisma.wallets.findUnique({
      where: { userId },
      include: { local_wallets: true },
    });

    if (!wallet) {
      return null;
    }

    const local = wallet.local_wallets;

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: local?.balance ?? 0,
      currency: local?.currency ?? 'LYD',
    };
  },

  async getBalance(walletId: string): Promise<WalletBalance> {
    const wallet = await prisma.wallets.findUnique({
      where: { id: walletId },
      include: { local_wallets: true },
    });

    if (!wallet || !wallet.local_wallets) {
      throw new Error('المحفظة غير موجودة');
    }

    const local = wallet.local_wallets;

    return {
      total: local.balance,
      available: local.balance,
      frozen: 0,
      currency: local.currency,
    };
  },

  async freezeFunds(walletId: string, amount: number, reference: string, expiresAt: Date) {
    return {
      id: `FREEZE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      walletId,
      amount,
      reference,
      expiresAt,
    };
  },

  async releaseFrozenFunds(frozenFundsId?: string) {
    return { success: true, id: frozenFundsId };
  },

  async releaseFunds(frozenFundsId: string) {
    return this.releaseFrozenFunds(frozenFundsId);
  },

  async processPayment(walletId: string, amount: number, description: string, reference: string) {
    const wallet = await prisma.wallets.findUnique({
      where: { id: walletId },
      include: { local_wallets: true },
    });

    if (!wallet || !wallet.local_wallets) {
      throw new Error('المحفظة غير موجودة');
    }

    const now = new Date();

    await prisma.local_wallets.update({
      where: { walletId },
      data: { balance: { decrement: amount }, updatedAt: now },
    });

    const transactionId = `AUCT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const transaction = await prisma.transactions.create({
      data: {
        id: transactionId,
        walletId,
        amount,
        type: 'WITHDRAWAL',
        status: 'COMPLETED',
        currency: 'LYD',
        walletType: 'LOCAL',
        description,
        reference,
        createdAt: now,
        updatedAt: now,
      },
    });

    return transaction;
  },

  async deductFunds(walletId: string, amount: number, description: string) {
    await this.processPayment(walletId, amount, description, `DEDUCT_${Date.now()}`);
    return { success: true };
  },
};

export default walletService;
