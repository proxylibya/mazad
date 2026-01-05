/**
 * نظام قاعدة البيانات الموحد العالمي
 * Unified Global Database Service
 * 
 * نظام قوي للتعامل مع قاعدة البيانات بشكل موحد وآمن
 * يدعم: Transactions, Caching, Query Optimization, Error Handling
 */

import { keydb } from '@/lib/cache/keydb-unified';
import type { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';

import prismaClient from '@/lib/prisma';

/**
 * فئة خدمة قاعدة البيانات الموحدة
 */
export class UnifiedDatabaseService {
  private static instance: UnifiedDatabaseService;
  private prisma: PrismaClient;

  private constructor() {
    this.prisma = prismaClient;
    this.setupMiddleware();
  }

  /**
   * الحصول على مثيل واحد من الخدمة
   */
  public static getInstance(): UnifiedDatabaseService {
    if (!UnifiedDatabaseService.instance) {
      UnifiedDatabaseService.instance = new UnifiedDatabaseService();
    }
    return UnifiedDatabaseService.instance;
  }

  /**
   * إعداد Middleware
   */
  private setupMiddleware() {
    // Query logging in development
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$use(async (params, next) => {
        const before = Date.now();
        const result = await next(params);
        const after = Date.now();

        console.log(`Query ${params.model}.${params.action} took ${after - before}ms`);
        return result;
      });
    }

    // Soft delete middleware
    this.prisma.$use(async (params, next) => {
      // عمليات البحث - استبعاد المحذوف
      if (params.action === 'findMany' || params.action === 'findFirst') {
        if (!params.args) params.args = {};
        if (!params.args.where) params.args.where = {};

        if (!params.args.where.isDeleted) {
          params.args.where.isDeleted = false;
        }
      }

      // عمليات الحذف - تحويل إلى soft delete
      if (params.action === 'delete') {
        params.action = 'update';
        if (!params.args) params.args = {};
        params.args.data = {
          isDeleted: true,
          deletedAt: new Date()
        };
      }

      if (params.action === 'deleteMany') {
        params.action = 'updateMany';
        if (!params.args) params.args = {};
        params.args.data = {
          isDeleted: true,
          deletedAt: new Date()
        };
      }

      return next(params);
    });
  }

  /**
   * الحصول على Prisma Client
   */
  public getClient(): PrismaClient {
    return this.prisma;
  }

  /**
   * تنفيذ معاملة
   */
  public async transaction<T>(
    fn: (tx: Prisma.TransactionClient) => Promise<T>
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(fn, {
        maxWait: 5000,
        timeout: 10000,
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable
      });
    } catch (error) {
      console.error('Transaction error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * البحث مع التخزين المؤقت
   */
  public async findWithCache<T>(
    model: string,
    key: string,
    findFn: () => Promise<T>,
    ttl = 300
  ): Promise<T> {
    try {
      // محاولة الحصول من الذاكرة المؤقتة
      const cacheKey = `db:${model}:${key}`;
      const cached = await keydb.get<T>(cacheKey);

      if (cached) {
        return cached;
      }

      // تنفيذ الاستعلام
      const result = await findFn();

      // حفظ في الذاكرة المؤقتة
      if (result) {
        await keydb.set(cacheKey, result, { ttl });
      }

      return result;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * مسح الذاكرة المؤقتة للنموذج
   */
  public async invalidateCache(model: string, key?: string): Promise<void> {
    try {
      if (key) {
        await keydb.del(`db:${model}:${key}`);
      } else {
        const keys = await keydb.keys(`db:${model}:*`);
        if (keys.length > 0) {
          await keydb.del(keys);
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * معالجة الأخطاء
   */
  private handleError(error: any): Error {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          return new Error('البيانات موجودة مسبقاً');
        case 'P2025':
          return new Error('البيانات المطلوبة غير موجودة');
        case 'P2003':
          return new Error('خطأ في المفتاح الأجنبي');
        case 'P2014':
          return new Error('انتهاك قيد العلاقة');
        default:
          return new Error('خطأ في قاعدة البيانات');
      }
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
      return new Error('بيانات غير صالحة');
    }

    return error;
  }

  /**
   * خدمات المستخدمين
   */
  public users = {
    /**
     * إنشاء مستخدم جديد
     */
    create: async (data: {
      name: string;
      phone: string;
      email?: string;
      password: string;
      accountType?: string;
    }) => {
      return await this.transaction(async (tx) => {
        // إنشاء المستخدم
        const user = await tx.users.create({
          data: {
            name: data.name,
            phone: data.phone,
            email: data.email,
            accountType: data.accountType as any || 'REGULAR_USER',
            loginIdentifier: data.phone
          }
        });

        // إنشاء كلمة المرور
        const { authSystem } = await import('@/lib/auth/unified-auth-system');
        const hashedPassword = await authSystem.hashPassword(data.password);

        await tx.user_passwords.create({
          data: {
            userId: user.id,
            hashedPassword
          }
        });

        // إنشاء المحافظ
        const wallet = await tx.wallets.create({
          data: {
            userId: user.id
          }
        });

        await tx.local_wallets.create({
          data: {
            walletId: wallet.id,
            balance: 0
          }
        });

        await tx.global_wallets.create({
          data: {
            walletId: wallet.id,
            balance: 0
          }
        });

        await tx.crypto_wallets.create({
          data: {
            walletId: wallet.id,
            balance: 0
          }
        });

        return user;
      });
    },

    /**
     * البحث عن مستخدم
     */
    findById: async (id: string) => {
      return await this.findWithCache(
        'user',
        id,
        () => prismaClient.users.findUnique({
          where: { id },
          include: {
            wallet: {
              include: {
                localWallet: true,
                globalWallet: true,
                cryptoWallet: true
              }
            }
          }
        })
      );
    },

    /**
     * تحديث مستخدم
     */
    update: async (id: string, data: any) => {
      const result = await prismaClient.users.update({
        where: { id },
        data
      });

      // مسح الذاكرة المؤقتة
      await this.invalidateCache('user', id);

      return result;
    },

    /**
     * حذف مستخدم (soft delete)
     */
    delete: async (id: string) => {
      const result = await prismaClient.users.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      // مسح الذاكرة المؤقتة
      await this.invalidateCache('user', id);

      return result;
    }
  };

  /**
   * خدمات السيارات
   */
  public cars = {
    /**
     * إنشاء سيارة جديدة
     */
    create: async (data: any) => {
      return await prismaClient.cars.create({
        data
      });
    },

    /**
     * البحث عن السيارات
     */
    findMany: async (options: {
      where?: any;
      orderBy?: any;
      skip?: number;
      take?: number;
    }) => {
      const cacheKey = `cars:${JSON.stringify(options)}`;

      return await this.findWithCache(
        'cars',
        cacheKey,
        () => prismaClient.cars.findMany({
          ...options,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                publicId: true
              }
            },
            images: true
          }
        }),
        60 // دقيقة واحدة
      );
    },

    /**
     * البحث عن سيارة بالمعرف
     */
    findById: async (id: string) => {
      return await this.findWithCache(
        'car',
        id,
        () => prismaClient.cars.findUnique({
          where: { id },
          include: {
            user: true,
            images: true,
            bids: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    publicId: true
                  }
                }
              },
              orderBy: {
                amount: 'desc'
              }
            }
          }
        })
      );
    }
  };

  /**
   * خدمات المزادات
   */
  public auctions = {
    /**
     * إنشاء مزاد جديد
     */
    create: async (data: any) => {
      return await this.transaction(async (tx) => {
        const auction = await tx.auctions.create({
          data
        });

        // تحديث حالة السيارة
        await tx.cars.update({
          where: { id: data.carId },
          data: {
            status: 'AUCTION',
            auctionId: auction.id
          }
        });

        return auction;
      });
    },

    /**
     * المزايدة على مزاد
     */
    placeBid: async (auctionId: string, userId: string, amount: number) => {
      return await this.transaction(async (tx) => {
        // التحقق من المزاد
        const auction = await tx.auctions.findUnique({
          where: { id: auctionId }
        });

        if (!auction) {
          throw new Error('المزاد غير موجود');
        }

        if (auction.status !== 'ACTIVE') {
          throw new Error('المزاد غير نشط');
        }

        if (amount <= auction.currentPrice) {
          throw new Error('المبلغ يجب أن يكون أكبر من السعر الحالي');
        }

        // إنشاء المزايدة مع توليد ID فريد
        const bidId = `bid_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const bid = await tx.bids.create({
          data: {
            id: bidId,
            auctionId,
            bidderId: userId,
            carId: auction.carId,
            amount,
          }
        });

        // تحديث المزاد
        await tx.auctions.update({
          where: { id: auctionId },
          data: {
            currentPrice: amount,
            highestBidderId: userId,
            totalBids: {
              increment: 1
            }
          }
        });

        // مسح الذاكرة المؤقتة
        await this.invalidateCache('auction', auctionId);

        return bid;
      });
    }
  };

  /**
   * خدمات المعاملات المالية
   */
  public transactions = {
    /**
     * إنشاء معاملة مالية
     */
    create: async (data: {
      userId: string;
      type: 'DEPOSIT' | 'WITHDRAW' | 'TRANSFER' | 'PAYMENT' | 'REFUND';
      amount: number;
      currency: string;
      walletType: 'LOCAL' | 'GLOBAL' | 'CRYPTO';
      description?: string;
    }) => {
      return await this.transaction(async (tx) => {
        // إنشاء المعاملة
        const transaction = await tx.transactions.create({
          data: {
            ...data,
            status: 'PENDING',
            reference: `TRX-${Date.now()}`
          }
        });

        // تحديث رصيد المحفظة
        const wallet = await tx.wallets.findUnique({
          where: { userId: data.userId },
          include: {
            localWallet: true,
            globalWallet: true,
            cryptoWallet: true
          }
        });

        if (!wallet) {
          throw new Error('المحفظة غير موجودة');
        }

        // تحديث الرصيد حسب نوع المحفظة
        let updateData = {};
        if (data.type === 'DEPOSIT') {
          updateData = { increment: data.amount };
        } else if (data.type === 'WITHDRAW' || data.type === 'PAYMENT') {
          updateData = { decrement: data.amount };
        }

        switch (data.walletType) {
          case 'LOCAL':
            await tx.local_wallets.update({
              where: { id: wallet.localWallet.id },
              data: { balance: updateData }
            });
            break;
          case 'GLOBAL':
            await tx.global_wallets.update({
              where: { id: wallet.globalWallet.id },
              data: { balance: updateData }
            });
            break;
          case 'CRYPTO':
            await tx.crypto_wallets.update({
              where: { id: wallet.cryptoWallet.id },
              data: { balance: updateData }
            });
            break;
        }

        // تحديث حالة المعاملة
        await tx.transactions.update({
          where: { id: transaction.id },
          data: { status: 'COMPLETED' }
        });

        return transaction;
      });
    }
  };

  /**
   * خدمات الإحصائيات
   */
  public stats = {
    /**
     * إحصائيات عامة
     */
    getOverview: async () => {
      return await this.findWithCache(
        'stats',
        'overview',
        async () => {
          const [
            usersCount,
            carsCount,
            auctionsCount,
            transactionsVolume
          ] = await Promise.all([
            prismaClient.users.count({ where: { isDeleted: false } }),
            prismaClient.cars.count(),
            prismaClient.auctions.count({ where: { status: 'ACTIVE' } }),
            prismaClient.transactions.aggregate({
              where: { status: 'COMPLETED' },
              _sum: { amount: true }
            })
          ]);

          return {
            users: usersCount,
            cars: carsCount,
            activeAuctions: auctionsCount,
            transactionVolume: transactionsVolume._sum.amount || 0
          };
        },
        300 // 5 دقائق
      );
    }
  };
}

// تصدير مثيل واحد من الخدمة
export const db = UnifiedDatabaseService.getInstance();

// تصدير Prisma Client مباشرة للحالات الخاصة
export default prismaClient;
