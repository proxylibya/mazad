/**
 * نظام الإشعارات الموحد - Enterprise Global Notification System
 * يدير جميع الإشعارات والعدادات في لوحة التحكم
 */

export interface NotificationCount {
    id: string;
    label: string;
    count: number;
    urgent: boolean;
    path: string;
    icon?: string;
    color?: string;
}

export interface NotificationItem {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: Date;
    read: boolean;
    actionUrl?: string;
    actionLabel?: string;
    category: string;
}

export interface NotificationStats {
    users: { pending: number; banned: number; deleted: number; };
    auctions: { active: number; pending: number; ended: number; };
    support: { open: number; urgent: number; unassigned: number; };
    wallets: { pendingWithdrawals: number; pendingDeposits: number; };
    showrooms: { pending: number; };
    transport: { pending: number; };
    security: { alerts: number; failedLogins: number; };
    messages: { unread: number; };
    total: number;
}

// الحالة الافتراضية
const defaultStats: NotificationStats = {
    users: { pending: 0, banned: 0, deleted: 0 },
    auctions: { active: 0, pending: 0, ended: 0 },
    support: { open: 0, urgent: 0, unassigned: 0 },
    wallets: { pendingWithdrawals: 0, pendingDeposits: 0 },
    showrooms: { pending: 0 },
    transport: { pending: 0 },
    security: { alerts: 0, failedLogins: 0 },
    messages: { unread: 0 },
    total: 0,
};

class NotificationService {
    private stats: NotificationStats = { ...defaultStats };
    private notifications: NotificationItem[] = [];
    private listeners: Set<(stats: NotificationStats) => void> = new Set();
    private notificationListeners: Set<(notifications: NotificationItem[]) => void> = new Set();
    private statsRequestController: AbortController | null = null;

    // جلب الإحصائيات من الخادم
    async fetchStats(): Promise<NotificationStats> {
        try {
            this.statsRequestController?.abort();
            const controller = new AbortController();
            this.statsRequestController = controller;

            const res = await fetch('/api/admin/notifications/stats', { signal: controller.signal });
            if (res.ok) {
                const data = await res.json();
                this.stats = {
                    ...defaultStats,
                    ...data,
                    total: this.calculateTotal(data),
                };
            }
        } catch (error) {
            if ((error as any)?.name !== 'AbortError') {
                console.error('Failed to fetch notification stats:', error);
            }
            // استخدام بيانات وهمية للتطوير
            this.stats = this.getMockStats();
        }
        this.notifyListeners();
        return this.stats;
    }

    // بيانات وهمية للتطوير
    private getMockStats(): NotificationStats {
        return {
            users: { pending: 5, banned: 2, deleted: 1 },
            auctions: { active: 12, pending: 8, ended: 45 },
            support: { open: 7, urgent: 3, unassigned: 4 },
            wallets: { pendingWithdrawals: 6, pendingDeposits: 2 },
            showrooms: { pending: 4 },
            transport: { pending: 3 },
            security: { alerts: 2, failedLogins: 15 },
            messages: { unread: 9 },
            total: 0,
        };
    }

    private calculateTotal(stats: Partial<NotificationStats>): number {
        let total = 0;
        if (stats.users) total += stats.users.pending || 0;
        if (stats.support) total += stats.support.open || 0;
        if (stats.wallets) total += stats.wallets.pendingWithdrawals || 0;
        if (stats.showrooms) total += stats.showrooms.pending || 0;
        if (stats.transport) total += stats.transport.pending || 0;
        if (stats.security) total += stats.security.alerts || 0;
        if (stats.messages) total += stats.messages.unread || 0;
        return total;
    }

    // الاشتراك في التحديثات
    subscribe(listener: (stats: NotificationStats) => void): () => void {
        this.listeners.add(listener);
        listener(this.stats);
        return () => this.listeners.delete(listener);
    }

    // الاشتراك في الإشعارات
    subscribeToNotifications(listener: (notifications: NotificationItem[]) => void): () => void {
        this.notificationListeners.add(listener);
        listener(this.notifications);
        return () => this.notificationListeners.delete(listener);
    }

    private notifyListeners() {
        this.listeners.forEach(listener => listener(this.stats));
    }

    private notifyNotificationListeners() {
        this.notificationListeners.forEach(listener => listener(this.notifications));
    }

    // الحصول على الإحصائيات الحالية
    getStats(): NotificationStats {
        return this.stats;
    }

    // الحصول على عداد لقسم معين
    getCountForSection(section: string): number {
        switch (section) {
            case 'users':
                return this.stats.users.pending;
            case 'auctions':
                return this.stats.auctions.pending;
            case 'support':
                return this.stats.support.open;
            case 'wallets':
                return this.stats.wallets.pendingWithdrawals;
            case 'showrooms':
                return this.stats.showrooms.pending;
            case 'transport':
                return this.stats.transport.pending;
            case 'security':
                return this.stats.security.alerts;
            case 'messages':
                return this.stats.messages.unread;
            default:
                return 0;
        }
    }

    // الحصول على عدادات الأقسام الفرعية
    getSubSectionCounts(section: string): NotificationCount[] {
        switch (section) {
            case 'users':
                return [
                    { id: 'pending', label: 'قيد الانتظار', count: this.stats.users.pending, urgent: this.stats.users.pending > 5, path: '/admin/users?status=pending', color: 'yellow' },
                    { id: 'banned', label: 'محظورين', count: this.stats.users.banned, urgent: false, path: '/admin/users/banned', color: 'red' },
                    { id: 'deleted', label: 'محذوفين', count: this.stats.users.deleted, urgent: false, path: '/admin/users/deleted', color: 'gray' },
                ];
            case 'support':
                return [
                    { id: 'open', label: 'تذاكر مفتوحة', count: this.stats.support.open, urgent: this.stats.support.open > 10, path: '/admin/support/open', color: 'blue' },
                    { id: 'urgent', label: 'عاجلة', count: this.stats.support.urgent, urgent: true, path: '/admin/support/tickets?priority=high', color: 'red' },
                    { id: 'unassigned', label: 'غير مسندة', count: this.stats.support.unassigned, urgent: false, path: '/admin/support/tickets?assigned=false', color: 'yellow' },
                ];
            case 'wallets':
                return [
                    { id: 'withdrawals', label: 'طلبات السحب', count: this.stats.wallets.pendingWithdrawals, urgent: this.stats.wallets.pendingWithdrawals > 5, path: '/admin/wallets/withdrawals', color: 'orange' },
                    { id: 'deposits', label: 'إيداعات معلقة', count: this.stats.wallets.pendingDeposits, urgent: false, path: '/admin/wallets/transactions?type=deposit&status=pending', color: 'green' },
                ];
            default:
                return [];
        }
    }

    // إضافة إشعار جديد
    addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): void {
        const newNotification: NotificationItem = {
            ...notification,
            id: `notif-${Date.now()}`,
            timestamp: new Date(),
            read: false,
        };
        this.notifications.unshift(newNotification);
        this.notifyNotificationListeners();
    }

    // تحديد إشعار كمقروء
    markAsRead(notificationId: string): void {
        const notification = this.notifications.find(n => n.id === notificationId);
        if (notification) {
            notification.read = true;
            this.notifyNotificationListeners();
        }
    }

    // تحديد جميع الإشعارات كمقروءة
    markAllAsRead(): void {
        this.notifications.forEach(n => n.read = true);
        this.notifyNotificationListeners();
    }

    // حذف إشعار
    removeNotification(notificationId: string): void {
        this.notifications = this.notifications.filter(n => n.id !== notificationId);
        this.notifyNotificationListeners();
    }

    // مسح جميع الإشعارات
    clearAll(): void {
        this.notifications = [];
        this.notifyNotificationListeners();
    }

    // الحصول على الإشعارات غير المقروءة
    getUnreadCount(): number {
        return this.notifications.filter(n => !n.read).length;
    }

    // بدء التحديث التلقائي
    startAutoRefresh(intervalMs: number = 30000): () => void {
        const interval = setInterval(() => {
            void this.fetchStats();
        }, intervalMs);
        return () => {
            clearInterval(interval);
            this.statsRequestController?.abort();
        };
    }
}

// Singleton instance
export const notificationService = new NotificationService();

// React Hook للاستخدام في المكونات
export function useNotifications() {
    return notificationService;
}

export default notificationService;
