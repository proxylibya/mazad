/**
 * Real-time Bidding Engine
 * محرك المزايدة المباشرة
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { BidData, SocketUser } from '../types/socket';
import { getAuctionRoomManager } from './auctionRoomManager';

export interface BidValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string; // SocketErrorCodes, // غير مستخدم حالياً
  minimumBid?: number;
  userBalance?: number;
}

export interface BidProcessingResult {
  success: boolean;
  bid?: BidData;
  error?: string;
  errorCode?: string; // SocketErrorCodes, // غير مستخدم حالياً
  outbidData?: {
    previousBidderId: string;
    previousBidAmount: number;
  };
}

export class BiddingEngine {
  private auctionRoomManager = getAuctionRoomManager();
  private bidHistory = new Map<string, BidData[]>(); // auctionId -> bids
  private pendingBids = new Map<string, Set<string>>(); // auctionId -> set of userIds with pending bids

  /**
   * معالجة عرض مزايدة جديد
   */
  async processBid(
    auctionId: string,
    userId: string,
    amount: number,
    user: SocketUser,
    socketId: string,
  ): Promise<BidProcessingResult> {
    // التحقق من عدم وجود عرض معلق للمستخدم
    if (this.hasPendingBid(auctionId, userId)) {
      return {
        success: false,
        error: 'لديك عرض قيد المعالجة، يرجى الانتظار',
        // errorCode: SocketErrorCodes.RATE_LIMITED, // غير مستخدم حالياً
      };
    }

    // إضافة العرض للقائمة المعلقة
    this.addPendingBid(auctionId, userId);

    try {
      // التحقق من صحة العرض
      const validation = await this.validateBid(auctionId, userId, amount, user);
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error,
          errorCode: validation.errorCode,
        };
      }

      // إنشاء كائن العرض
      const bidData: BidData = {
        auctionId,
        userId,
        amount,
        timestamp: Date.now(),
        bidId: uuidv4(),
      };

      // معالجة العرض في غرفة المزاد
      const roomResult = await this.auctionRoomManager.processBid(auctionId, bidData, user);
      if (!roomResult.success) {
        return {
          success: false,
          error: roomResult.error,
          // errorCode: SocketErrorCodes.SYSTEM_ERROR, // غير مستخدم حالياً
        };
      }

      // حفظ العرض في السجل المحلي
      this.addToHistory(auctionId, bidData);

      // تحديث المحفظة إذا كان هناك نظام حجز أموال
      await this.handleWalletUpdate(auctionId, userId, amount);

      // العثور على العرض السابق لإشعار المزايد السابق
      const outbidData = await this.getOutbidData(auctionId, bidData);

      console.log(`تم قبول العرض: ${user.name} - ${amount} دينار في المزاد ${auctionId}`);

      return {
        success: true,
        bid: bidData,
        outbidData,
      };
    } catch (error) {
      console.error('خطأ في معالجة العرض:', error);
      return {
        success: false,
        error: 'خطأ في الخادم أثناء معالجة العرض',
        // errorCode: SocketErrorCodes.SYSTEM_ERROR, // غير مستخدم حالياً
      };
    } finally {
      // إزالة العرض من القائمة المعلقة
      this.removePendingBid(auctionId, userId);
    }
  }

  /**
   * التحقق من صحة العرض
   */
  private async validateBid(
    auctionId: string,
    userId: string,
    amount: number,
    user: SocketUser,
  ): Promise<BidValidationResult> {
    try {
      // التحقق من وجود المزاد وحالته
      const auction = await prisma.auctions.findUnique({
        where: { id: auctionId },
        include: {
          bids: {
            orderBy: { amount: 'desc' },
            take: 1,
          },
        },
      });

      if (!auction) {
        return {
          isValid: false,
          error: 'المزاد غير موجود',
          // errorCode: SocketErrorCodes.AUCTION_NOT_FOUND, // غير مستخدم حالياً
        };
      }

      // التحقق من حالة المزاد
      const now = new Date();
      if (auction.status === 'ENDED' || auction.endDate < now) {
        return {
          isValid: false,
          error: 'المزاد قد انتهى',
          // errorCode: SocketErrorCodes.AUCTION_ENDED, // غير مستخدم حالياً
        };
      }

      if (auction.status !== 'ACTIVE') {
        return {
          isValid: false,
          error: 'المزاد غير نشط حالياً',
          // errorCode: SocketErrorCodes.AUCTION_NOT_STARTED, // غير مستخدم حالياً
        };
      }

      // التحقق من صحة المبلغ
      if (amount <= 0 || !Number.isFinite(amount)) {
        return {
          isValid: false,
          error: 'مبلغ العرض غير صحيح',
          // errorCode: SocketErrorCodes.INVALID_DATA, // غير مستخدم حالياً
        };
      }

      // الحصول على العرض الحالي الأعلى
      const currentBid = auction.bids[0];
      const currentPrice = currentBid?.amount || auction.startPrice;
      const minimumBid = currentPrice + 100; // استخدام قيمة افتراضية

      // التحقق من الحد الأدنى للعرض
      if (amount < minimumBid) {
        return {
          isValid: false,
          error: `العرض يجب أن يكون ${minimumBid} دينار على الأقل`,
          // errorCode: SocketErrorCodes.BID_TOO_LOW, // غير مستخدم حالياً
          minimumBid,
        };
      }

      // التحقق من أن المزايد ليس هو نفسه آخر مزايد
      if (currentBid && currentBid.bidderId === userId) {
        return {
          isValid: false,
          error: 'لا يمكنك المزايدة على عرضك الحالي',
          // errorCode: SocketErrorCodes.INVALID_DATA, // غير مستخدم حالياً
        };
      }

      // التحقق من رصيد المحفظة (إذا كان مفعلاً)
      const walletCheck = await this.checkUserWallet(userId, amount);
      if (!walletCheck.isValid) {
        return walletCheck;
      }

      // التحقق من عدم حظر المستخدم من المزاد
      const banCheck = await this.checkUserBan(auctionId, userId);
      if (!banCheck.isValid) {
        return banCheck;
      }

      return { isValid: true };
    } catch (error) {
      console.error('خطأ في التحقق من صحة العرض:', error);
      return {
        isValid: false,
        error: 'خطأ في الخادم أثناء التحقق من العرض',
        // errorCode: SocketErrorCodes.SYSTEM_ERROR, // غير مستخدم حالياً
      };
    }
  }

  /**
   * التحقق من رصيد المحفظة
   */
  private async checkUserWallet(userId: string, bidAmount: number): Promise<BidValidationResult> {
    try {
      const userWallet = await prisma.wallets.findUnique({
        where: { userId },
        include: {
          local_wallets: true,
        },
      });

      if (!userWallet || !userWallet.isActive) {
        return {
          isValid: false,
          error: 'المحفظة غير مفعلة',
          // errorCode: SocketErrorCodes.INSUFFICIENT_FUNDS, // غير مستخدم حالياً
        };
      }

      const localWallet = userWallet.local_wallets;
      if (!localWallet || !localWallet.isActive) {
        return {
          isValid: false,
          error: 'المحفظة المحلية غير متوفرة',
          // errorCode: SocketErrorCodes.INSUFFICIENT_FUNDS, // غير مستخدم حالياً
        };
      }

      // التحقق من كفاية الرصيد (مع هامش أمان 10%)
      const requiredAmount = bidAmount * 1.1; // 10% هامش أمان
      if (localWallet.balance < requiredAmount) {
        return {
          isValid: false,
          error: `رصيد غير كافي. المطلوب: ${requiredAmount} دينار، المتوفر: ${localWallet.balance} دينار`,
          // errorCode: SocketErrorCodes.INSUFFICIENT_FUNDS, // غير مستخدم حالياً
          userBalance: localWallet.balance,
        };
      }

      return { isValid: true, userBalance: localWallet.balance };
    } catch (error) {
      console.error('خطأ في التحقق من رصيد المحفظة:', error);
      return {
        isValid: false,
        error: 'خطأ في التحقق من الرصيد',
        // errorCode: SocketErrorCodes.SYSTEM_ERROR, // غير مستخدم حالياً
      };
    }
  }

  /**
   * التحقق من حظر المستخدم
   */
  private async checkUserBan(auctionId: string, userId: string): Promise<BidValidationResult> {
    try {
      // يمكن إضافة جدول bans لاحقاً
      // const ban = await prisma.auctionBan.findFirst({
      //   where: {
      //     auctionId,
      //     userId,
      //     isActive: true,
      //     expiresAt: { gt: new Date() }
      //   }
      // });

      // if (ban) {
      //   return {
      //     isValid: false,
      //     error: 'تم حظرك من هذا المزاد',
      //     errorCode: // SocketErrorCodes, // غير مستخدم حالياً.USER_BANNED
      //   };
      // }

      return { isValid: true };
    } catch (error) {
      console.error('خطأ في التحقق من حظر المستخدم:', error);
      return { isValid: true }; // في حالة الخطأ، لا نمنع المزايدة
    }
  }

  /**
   * تحديث المحفظة عند المزايدة
   */
  private async handleWalletUpdate(
    auctionId: string,
    userId: string,
    bidAmount: number,
  ): Promise<void> {
    try {
      // في النسخة المبسطة، لا نحجز المال فوراً
      // سيتم تطوير نظام الحجز في مرحلة لاحقة

      console.log(`تحديث المحفظة للمستخدم ${userId} - العرض: ${bidAmount} دينار`);

      // يمكن إضافة منطق حجز الأموال هنا لاحقاً
      // await prisma.walletReservation.create({
      //   data: {
      //     userId,
      //     auctionId,
      //     amount: bidAmount,
      //     type: 'BID_HOLD',
      //     expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 ساعة
      //   }
      // });
    } catch (error) {
      console.error('خطأ في تحديث المحفظة:', error);
      // لا نرمي خطأ هنا لأن العرض تم قبوله بالفعل
    }
  }

  /**
   * الحصول على بيانات المزايد المتجاوز
   */
  private async getOutbidData(
    auctionId: string,
    newBid: BidData,
  ): Promise<
    | {
      previousBidderId: string;
      previousBidAmount: number;
    }
    | undefined
  > {
    try {
      const previousBid = await prisma.bids.findFirst({
        where: {
          auctionId,
          amount: { lt: newBid.amount },
        },
        orderBy: { amount: 'desc' },
        take: 1,
      });

      if (previousBid && previousBid.bidderId !== newBid.userId) {
        return {
          previousBidderId: previousBid.bidderId,
          previousBidAmount: previousBid.amount,
        };
      }

      return undefined;
    } catch (error) {
      console.error('خطأ في الحصول على بيانات المزايد المتجاوز:', error);
      return undefined;
    }
  }

  /**
   * إدارة العروض المعلقة
   */
  private hasPendingBid(auctionId: string, userId: string): boolean {
    const pendingBids = this.pendingBids.get(auctionId);
    return pendingBids ? pendingBids.has(userId) : false;
  }

  private addPendingBid(auctionId: string, userId: string): void {
    if (!this.pendingBids.has(auctionId)) {
      this.pendingBids.set(auctionId, new Set());
    }
    this.pendingBids.get(auctionId)!.add(userId);
  }

  private removePendingBid(auctionId: string, userId: string): void {
    const pendingBids = this.pendingBids.get(auctionId);
    if (pendingBids) {
      pendingBids.delete(userId);
      if (pendingBids.size === 0) {
        this.pendingBids.delete(auctionId);
      }
    }
  }

  /**
   * إدارة سجل العروض
   */
  private addToHistory(auctionId: string, bid: BidData): void {
    if (!this.bidHistory.has(auctionId)) {
      this.bidHistory.set(auctionId, []);
    }

    const history = this.bidHistory.get(auctionId)!;
    history.push(bid);

    // الاحتفاظ بآخر 100 عرض فقط لتوفير الذاكرة
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * الحصول على سجل العروض الأخيرة
   */
  getRecentBids(auctionId: string, limit: number = 10): BidData[] {
    const history = this.bidHistory.get(auctionId) || [];
    return history.slice(-limit).reverse();
  }

  /**
   * مسح سجل العروض للمزاد المنتهي
   */
  clearAuctionHistory(auctionId: string): void {
    this.bidHistory.delete(auctionId);
    this.pendingBids.delete(auctionId);
    console.log(`تم مسح سجل العروض للمزاد ${auctionId}`);
  }

  /**
   * الحصول على إحصائيات المزايدة
   */
  getBiddingStats(auctionId: string): {
    totalBids: number;
    uniqueBidders: number;
    averageBidIncrement: number;
    biddingIntensity: number; // عدد العروض في الدقيقة الأخيرة
  } {
    const history = this.bidHistory.get(auctionId) || [];
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    const uniqueBidders = new Set(history.map((bid) => bid.userId)).size;

    const recentBids = history.filter((bid) => bid.timestamp > oneMinuteAgo);

    let totalIncrement = 0;
    for (let i = 1; i < history.length; i++) {
      totalIncrement += history[i].amount - history[i - 1].amount;
    }
    const averageBidIncrement = history.length > 1 ? totalIncrement / (history.length - 1) : 0;

    return {
      totalBids: history.length,
      uniqueBidders,
      averageBidIncrement,
      biddingIntensity: recentBids.length,
    };
  }
}

// Singleton instance
let biddingEngineInstance: BiddingEngine | null = null;

export function getBiddingEngine(): BiddingEngine {
  if (!biddingEngineInstance) {
    biddingEngineInstance = new BiddingEngine();
  }
  return biddingEngineInstance;
}
