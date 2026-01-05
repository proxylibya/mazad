/**
 * أنواع الإشعارات الموحدة - نظام مركزي لتوحيد الأنواع بين UI و Prisma
 * تم الإنشاء: 2025-01-22
 */

import { NotificationType as PrismaNotificationType } from '@prisma/client';

// أنواع الإشعارات في واجهة المستخدم
export type UINotificationType =
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'bid'
  | 'auction'
  | 'price'
  | 'sale_confirmed'
  | 'payment_reminder'
  | 'payment_overdue'
  | 'new_bid'
  | 'auction_ended'
  | 'buyer_contact';

// أنواع الإشعارات من Prisma
export type DBNotificationType = PrismaNotificationType;

// خريطة تطابق بين أنواع UI و Prisma
export const NotificationTypeMap: Record<UINotificationType, DBNotificationType> = {
  success: 'SUCCESS',
  error: 'WARNING',
  warning: 'WARNING',
  info: 'INFO',
  bid: 'BID_ACCEPTED',
  auction: 'AUCTION_STARTED',
  price: 'INFO',
  sale_confirmed: 'SALE_CONFIRMED',
  payment_reminder: 'PAYMENT_REMINDER',
  payment_overdue: 'PAYMENT_REMINDER',
  new_bid: 'NEW_BID_ON_YOUR_AUCTION',
  auction_ended: 'AUCTION_ENDED',
  buyer_contact: 'INFO',
};

// خريطة عكسية من Prisma إلى UI
export const DBToUITypeMap: Partial<Record<DBNotificationType, UINotificationType>> = {
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info',
  BID_ACCEPTED: 'bid',
  AUCTION_STARTED: 'auction',
  SALE_CONFIRMED: 'sale_confirmed',
  PAYMENT_REMINDER: 'payment_reminder',
  NEW_BID_ON_YOUR_AUCTION: 'new_bid',
  AUCTION_ENDED: 'auction_ended',
  AUCTION_WON: 'auction',
  BID_OUTBID: 'bid',
  AUCTION_ENDING: 'auction',
};

// دالة تحويل من UI Type إلى DB Type
export function uiToDBType(uiType: UINotificationType): DBNotificationType {
  return NotificationTypeMap[uiType] || 'INFO';
}

// دالة تحويل من DB Type إلى UI Type
export function dbToUIType(dbType: DBNotificationType): UINotificationType {
  return DBToUITypeMap[dbType] || 'info';
}

// أولويات الإشعارات
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// واجهة الإشعار الموحدة
export interface UnifiedNotification {
  id: string;
  userId: string;
  type: DBNotificationType;
  uiType?: UINotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  isRead: boolean;
  metadata?: Record<string, any>;
  auctionId?: string;
  carId?: string;
  bidderId?: string;
  transactionId?: string;
  depositId?: string;
  createdAt: Date;
  readAt?: Date;
}

// خيارات إنشاء الإشعار
export interface CreateNotificationOptions {
  userId: string;
  type: UINotificationType | DBNotificationType;
  title: string;
  message: string;
  priority?: NotificationPriority;
  metadata?: Record<string, any>;
  auctionId?: string;
  carId?: string;
  bidderId?: string;
  transactionId?: string;
  depositId?: string;
}

// أولوية الإشعارات حسب النوع
export const NotificationPriorityByType: Record<DBNotificationType, NotificationPriority> = {
  DEPOSIT_INITIATED: 'medium',
  DEPOSIT_COMPLETED: 'high',
  DEPOSIT_FAILED: 'high',
  PAYMENT_RECEIVED: 'high',
  VERIFICATION_REQUIRED: 'urgent',
  SYSTEM_MAINTENANCE: 'medium',
  INFO: 'low',
  WARNING: 'medium',
  SUCCESS: 'medium',
  ADMIN_MESSAGE: 'high',
  AUCTION_WON: 'urgent',
  BID_OUTBID: 'high',
  AUCTION_ENDING: 'high',
  PAYMENT_REMINDER: 'urgent',
  PAYMENT_OVERDUE: 'urgent',
  SALE_CONFIRMED: 'urgent',
  BID_ACCEPTED: 'high',
  NEW_BID_ON_YOUR_AUCTION: 'high',
  AUCTION_STARTED: 'medium',
  AUCTION_ENDED: 'medium',
  AUCTION_CANCELLED: 'high',
  MESSAGE: 'medium',
};

// دالة الحصول على الأولوية التلقائية
export function getNotificationPriority(type: DBNotificationType | UINotificationType): NotificationPriority {
  if (typeof type === 'string' && type in NotificationTypeMap) {
    const dbType = NotificationTypeMap[type as UINotificationType];
    return NotificationPriorityByType[dbType] || 'medium';
  }
  return NotificationPriorityByType[type as DBNotificationType] || 'medium';
}
