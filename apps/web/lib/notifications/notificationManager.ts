// Notification Manager - نظام إدارة الإشعارات والاشتراكات
import crypto from 'crypto';
import logger from '../logger';
import { prisma } from '../prisma';

// دالة لإنشاء مفتاح فريد من endpoint
function createEndpointKey(endpoint: string): string {
  try {
    const hash = crypto.createHash('sha1').update(endpoint).digest('hex');
    return `web_push:${hash}`;
  } catch {
    return `web_push:${endpoint.slice(-24)}`;
  }
}

// حفظ اشتراك Push في قاعدة البيانات
export const subscribeToPush = async (subscription: unknown, userId?: string) => {
  try {
    if (!subscription || typeof subscription !== 'object') {
      throw new Error('Invalid subscription object');
    }

    const sub = subscription as { endpoint: string; keys?: Record<string, unknown>; };
    if (!sub.endpoint) {
      throw new Error('Subscription endpoint is required');
    }

    const key = createEndpointKey(sub.endpoint);

    await prisma.system_settings.upsert({
      where: { key },
      create: {
        key,
        value: {
          userId: userId || null,
          subscription,
          createdAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        },
      },
      update: {
        value: {
          userId: userId || null,
          subscription,
          updatedAt: new Date().toISOString(),
          lastSeenAt: new Date().toISOString(),
        },
      },
    });

    // فهرس لكل مستخدم
    if (userId) {
      const userKey = `web_push_user:${userId}`;
      const existing = await prisma.system_settings.findUnique({
        where: { key: userKey },
      });
      const existingValue = (existing?.value as unknown as Record<string, unknown> | null) || null;
      const endpointsVal = existingValue ? (existingValue['endpoints'] as unknown) : undefined;
      const list: string[] = Array.isArray(endpointsVal) ? (endpointsVal as string[]) : [];
      if (!list.includes(key)) list.push(key);

      if (existing) {
        await prisma.system_settings.update({
          where: { key: userKey },
          data: {
            value: { endpoints: list, updatedAt: new Date().toISOString() },
          },
        });
      } else {
        await prisma.system_settings.create({
          data: {
            key: userKey,
            value: { endpoints: list, createdAt: new Date().toISOString() },
          },
        });
      }
    }

    logger.info('Push subscription saved successfully', { userId, endpoint: sub.endpoint });
    return { success: true };
  } catch (error) {
    logger.error('Error subscribing to push', { error });
    return { success: false, error: (error as Error).message };
  }
};

// إلغاء اشتراك Push من قاعدة البيانات
export const unsubscribeFromPush = async (endpoint: string, userId?: string) => {
  try {
    if (!endpoint) {
      throw new Error('Endpoint is required');
    }

    const key = createEndpointKey(endpoint);

    // حذف الاشتراك
    await prisma.system_settings.deleteMany({
      where: { key },
    });

    // إزالة من فهرس المستخدم
    if (userId) {
      const userKey = `web_push_user:${userId}`;
      const existing = await prisma.system_settings.findUnique({
        where: { key: userKey },
      });

      const existingValue = (existing?.value as unknown as Record<string, unknown> | null) || null;
      const endpointsVal = existingValue ? (existingValue['endpoints'] as unknown) : undefined;

      if (existing && Array.isArray(endpointsVal)) {
        const list = (endpointsVal as string[]).filter((k) => k !== key);
        await prisma.system_settings.update({
          where: { key: userKey },
          data: {
            value: { endpoints: list, updatedAt: new Date().toISOString() },
          },
        });
      }
    }

    logger.info('Push unsubscription successful', { userId, endpoint });
    return { success: true };
  } catch (error) {
    logger.error('Error unsubscribing from push', { error });
    return { success: false, error: (error as Error).message };
  }
};

// الحصول على جميع اشتراكات Push لمستخدم معين
export const getUserPushSubscriptions = async (userId: string) => {
  try {
    const userKey = `web_push_user:${userId}`;
    const userData = await prisma.system_settings.findUnique({
      where: { key: userKey },
    });

    const userValue = (userData?.value as unknown as Record<string, unknown> | null) || null;
    const endpointsVal = userValue ? (userValue['endpoints'] as unknown) : undefined;

    if (!userData || !Array.isArray(endpointsVal)) {
      return [];
    }

    const endpoints = endpointsVal as string[];
    const subscriptions = await prisma.system_settings.findMany({
      where: {
        key: { in: endpoints },
      },
    });

    return subscriptions
      .map((s) => {
        const v = (s.value as unknown as Record<string, unknown> | null) || null;
        return v ? (v['subscription'] as unknown) : undefined;
      })
      .filter((s): s is NonNullable<typeof s> => s !== null && s !== undefined);
  } catch (error) {
    logger.error('Error getting user push subscriptions', { error, userId });
    return [];
  }
};

// مدير الإشعارات
export const notificationManager = {
  async savePushSubscription(userId: string, subscription: unknown) {
    logger.info('Saving push subscription', { userId });
    return subscribeToPush(subscription, userId);
  },

  async removePushSubscription(userId: string, endpoint?: string) {
    logger.info('Removing push subscription', { userId });
    if (endpoint) {
      return unsubscribeFromPush(endpoint, userId);
    }

    // حذف جميع اشتراكات المستخدم
    try {
      const userKey = `web_push_user:${userId}`;
      const userData = await prisma.system_settings.findUnique({
        where: { key: userKey },
      });

      const userValue = (userData?.value as unknown as Record<string, unknown> | null) || null;
      const endpointsVal = userValue ? (userValue['endpoints'] as unknown) : undefined;

      if (userData && Array.isArray(endpointsVal)) {
        const endpoints = endpointsVal as string[];
        await prisma.system_settings.deleteMany({
          where: { key: { in: endpoints } },
        });
        await prisma.system_settings.delete({
          where: { key: userKey },
        });
      }

      return { success: true };
    } catch (error) {
      logger.error('Error removing all push subscriptions', { error, userId });
      return { success: false, error: (error as Error).message };
    }
  },

  async getUserSubscriptions(userId: string) {
    return getUserPushSubscriptions(userId);
  },

  async cleanupExpiredSubscriptions(daysOld = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const allPushKeys = await prisma.system_settings.findMany({
        where: {
          key: { startsWith: 'web_push:' },
        },
      });

      let deletedCount = 0;
      for (const setting of allPushKeys) {
        const v = (setting.value as unknown as Record<string, unknown> | null) || null;
        const lastSeen = v ? (v['lastSeenAt'] as unknown) : undefined;
        if (lastSeen && new Date(lastSeen as string) < cutoffDate) {
          await prisma.system_settings.delete({ where: { key: setting.key } });
          deletedCount++;
        }
      }

      logger.info('Cleaned up expired push subscriptions', { deletedCount, daysOld });
      return { success: true, deletedCount };
    } catch (error) {
      logger.error('Error cleaning up push subscriptions', { error });
      return { success: false, error: (error as Error).message };
    }
  },
};

export default { subscribeToPush, unsubscribeFromPush, notificationManager };
