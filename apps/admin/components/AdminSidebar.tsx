'use client';

import {
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ChevronLeftIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  HomeIcon,
  PhoneIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TagIcon,
  TicketIcon,
  TruckIcon,
  UserGroupIcon,
  UsersIcon,
  WalletIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { hasSectionAccess } from '../lib/permissions/admin-permissions-system';
import { AnimatedPresence, AnimatedSection } from './unified';

// نوع الإحصائيات
interface NotificationStats {
  users: { pending: number; banned: number; deleted: number };
  auctions: { active: number; pending: number; ended: number };
  support: { open: number; urgent: number; unassigned: number };
  wallets: { pendingWithdrawals: number; pendingDeposits: number };
  showrooms: { pending: number };
  transport: { pending: number };
  security: { alerts: number; failedLogins: number };
  messages: { unread: number };
  promotions: { newRequests: number; urgent: number };
}

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  badge?: number;
  children?: MenuItem[];
}

const MENU_ICON_STYLES: Record<
  string,
  {
    bg: string;
    text: string;
    ring: string;
    hoverBg: string;
  }
> = {
  dashboard: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    ring: 'ring-blue-500/25',
    hoverBg: 'group-hover:bg-blue-500/15',
  },
  users: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    ring: 'ring-cyan-500/25',
    hoverBg: 'group-hover:bg-cyan-500/15',
  },
  auctions: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    ring: 'ring-amber-500/25',
    hoverBg: 'group-hover:bg-amber-500/15',
  },
  marketplace: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/25',
    hoverBg: 'group-hover:bg-emerald-500/15',
  },
  yards: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    ring: 'ring-orange-500/25',
    hoverBg: 'group-hover:bg-orange-500/15',
  },
  transport: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    ring: 'ring-purple-500/25',
    hoverBg: 'group-hover:bg-purple-500/15',
  },
  showrooms: {
    bg: 'bg-fuchsia-500/10',
    text: 'text-fuchsia-400',
    ring: 'ring-fuchsia-500/25',
    hoverBg: 'group-hover:bg-fuchsia-500/15',
  },
  wallets: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    ring: 'ring-pink-500/25',
    hoverBg: 'group-hover:bg-pink-500/15',
  },
  managers: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    ring: 'ring-indigo-500/25',
    hoverBg: 'group-hover:bg-indigo-500/15',
  },
  support: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-400',
    ring: 'ring-rose-500/25',
    hoverBg: 'group-hover:bg-rose-500/15',
  },
  communications: {
    bg: 'bg-sky-500/10',
    text: 'text-sky-400',
    ring: 'ring-sky-500/25',
    hoverBg: 'group-hover:bg-sky-500/15',
  },
  reports: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    ring: 'ring-slate-500/25',
    hoverBg: 'group-hover:bg-slate-500/15',
  },
  promotions: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    ring: 'ring-yellow-500/25',
    hoverBg: 'group-hover:bg-yellow-500/15',
  },
  security: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    ring: 'ring-red-500/25',
    hoverBg: 'group-hover:bg-red-500/15',
  },
  'site-content': {
    bg: 'bg-violet-500/10',
    text: 'text-violet-400',
    ring: 'ring-violet-500/25',
    hoverBg: 'group-hover:bg-violet-500/15',
  },
  settings: {
    bg: 'bg-zinc-500/10',
    text: 'text-zinc-300',
    ring: 'ring-zinc-500/25',
    hoverBg: 'group-hover:bg-zinc-500/15',
  },
  default: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    ring: 'ring-slate-500/25',
    hoverBg: 'group-hover:bg-slate-500/15',
  },
};

const getMenuIconStyle = (menuId: string) => {
  return MENU_ICON_STYLES[menuId] || MENU_ICON_STYLES.default;
};

const menuItems: MenuItem[] = [
  {
    id: 'dashboard',
    label: 'لوحة التحكم',
    icon: HomeIcon,
    href: '/admin',
  },
  {
    id: 'users',
    label: 'المستخدمون',
    icon: UsersIcon,
    children: [
      { id: 'all-users', label: 'جميع المستخدمين', href: '/admin/users' },
      { id: 'add-user', label: 'إضافة مستخدم', href: '/admin/users/add' },
      { id: 'banned', label: 'المحظورين', href: '/admin/users/banned' },
      { id: 'deleted', label: 'المحذوفين', href: '/admin/users/deleted' },
    ],
  },
  {
    id: 'auctions',
    label: 'المزادات',
    icon: TagIcon,
    children: [
      { id: 'all-auctions', label: 'جميع المزادات', href: '/admin/auctions' },
      { id: 'create-auction', label: 'إنشاء مزاد', href: '/admin/auctions/create' },
      { id: 'featured-auctions', label: 'الإعلانات المميزة', href: '/admin/auctions/featured' },
      { id: 'live-auctions', label: 'مزاد مباشر', href: '/admin/auctions/live' },
      { id: 'upcoming-auctions', label: 'مزاد قادم', href: '/admin/auctions/upcoming' },
      { id: 'sold-auctions', label: 'مزاد تم البيع', href: '/admin/auctions/sold' },
      { id: 'ended-auctions', label: 'مزاد منتهي', href: '/admin/auctions/ended' },
      { id: 'auction-settings', label: 'الإعدادات', href: '/admin/auctions/settings' },
    ],
  },
  {
    id: 'marketplace',
    label: 'السوق الفوري',
    icon: ShoppingBagIcon,
    children: [
      { id: 'all-listings', label: 'جميع الإعلانات', href: '/admin/marketplace' },
      { id: 'marketplace-featured', label: 'المميزة', href: '/admin/marketplace/featured' },
      { id: 'marketplace-deleted', label: 'المحذوفات', href: '/admin/marketplace/deleted' },
      { id: 'marketplace-settings', label: 'الإعدادات', href: '/admin/marketplace/settings' },
    ],
  },
  {
    id: 'yards',
    label: 'الساحات',
    icon: BuildingOfficeIcon,
    children: [
      { id: 'all-yards', label: 'جميع الساحات', href: '/admin/yards' },
      { id: 'add-yard', label: 'إضافة ساحة', href: '/admin/yards/add' },
      { id: 'yards-auctions', label: 'مزادات الساحات', href: '/admin/yards/auctions' },
      { id: 'create-yard-auction', label: 'إنشاء مزاد ساحة', href: '/admin/yards/auctions/create' },
    ],
  },
  {
    id: 'transport',
    label: 'خدمات النقل',
    icon: TruckIcon,
    children: [
      { id: 'all-transport', label: 'جميع الخدمات', href: '/admin/transport' },
      { id: 'add-transport', label: 'إضافة خدمة', href: '/admin/transport/add' },
      { id: 'transport-bookings', label: 'طلبات النقل', href: '/admin/transport/bookings' },
      { id: 'active-transport', label: 'النشطة', href: '/admin/transport/active' },
      { id: 'inactive-transport', label: 'غير النشطة', href: '/admin/transport/inactive' },
      { id: 'transport-reports', label: 'التقارير', href: '/admin/transport/reports' },
      {
        id: 'booking-settings',
        label: 'إعدادات الرسائل',
        href: '/admin/transport/booking-settings',
      },
      { id: 'transport-settings', label: 'الإعدادات', href: '/admin/transport/settings' },
    ],
  },
  {
    id: 'showrooms',
    label: 'المعارض',
    icon: BuildingStorefrontIcon,
    children: [
      { id: 'all-showrooms', label: 'جميع المعارض', href: '/admin/showrooms' },
      { id: 'pending-showrooms', label: 'قيد المراجعة', href: '/admin/showrooms/pending' },
    ],
  },
  {
    id: 'wallets',
    label: 'المحافظ',
    icon: WalletIcon,
    children: [
      { id: 'wallet-overview', label: 'نظرة عامة', href: '/admin/wallets' },
      { id: 'deposits', label: 'الإيداعات', href: '/admin/wallets/deposits' },
      { id: 'withdrawals', label: 'طلبات السحب', href: '/admin/wallets/withdrawals' },
      { id: 'transactions', label: 'سجل المعاملات', href: '/admin/wallets/transactions' },
      { id: 'payment-methods', label: 'طرق الدفع', href: '/admin/wallets/payment-methods' },
      { id: 'deposit-methods', label: 'وسائل الإيداع', href: '/admin/wallets/deposit-methods' },
      { id: 'local-methods', label: 'الدفع المحلي', href: '/admin/wallets/local-methods' },
      { id: 'global-methods', label: 'الدفع العالمي', href: '/admin/wallets/global-methods' },
      { id: 'crypto-methods', label: 'العملات الرقمية', href: '/admin/wallets/crypto-methods' },
      { id: 'integrations', label: 'التكاملات', href: '/admin/wallets/integrations' },
      { id: 'monitoring', label: 'المراقبة', href: '/admin/wallets/monitoring' },
      { id: 'wallet-settings', label: 'الإعدادات', href: '/admin/wallets/settings' },
    ],
  },
  {
    id: 'managers',
    label: 'المديرون',
    icon: UserGroupIcon,
    children: [
      { id: 'all-managers', label: 'جميع المديرين', href: '/admin/admins' },
      { id: 'create-manager', label: 'إضافة مدير', href: '/admin/admins/add' },
    ],
  },
  {
    id: 'support',
    label: 'الدعم الفني',
    icon: TicketIcon,
    children: [
      { id: 'all-tickets', label: 'جميع التذاكر', href: '/admin/support/tickets' },
      { id: 'open-tickets', label: 'المفتوحة', href: '/admin/support/open' },
    ],
  },
  {
    id: 'communications',
    label: 'الاتصال و SMS',
    icon: PhoneIcon,
    children: [
      { id: 'comm-overview', label: 'نظرة عامة', href: '/admin/communications' },
      { id: 'calls-log', label: 'سجل المكالمات', href: '/admin/communications/calls' },
      { id: 'sms-messages', label: 'رسائل SMS', href: '/admin/communications/sms' },
      { id: 'site-team-inbox', label: 'صندوق فريق الموقع', href: '/admin/site-team/inbox' },
      { id: 'comm-settings', label: 'الإعدادات', href: '/admin/communications/settings' },
    ],
  },
  {
    id: 'reports',
    label: 'التقارير',
    icon: ChartBarIcon,
    href: '/admin/reports',
  },
  {
    id: 'promotions',
    label: 'الترويج والإعلانات',
    icon: SparklesIcon,
    children: [
      { id: 'promotions-overview', label: 'الإعلانات المميزة', href: '/admin/promotions' },
      { id: 'advertising-requests', label: 'طلبات الإعلانات', href: '/admin/promotions/requests' },
    ],
  },
  {
    id: 'security',
    label: 'الحماية',
    icon: ShieldCheckIcon,
    children: [
      { id: 'security-overview', label: 'نظرة عامة', href: '/admin/security' },
      { id: 'login-logs', label: 'سجل الدخول', href: '/admin/security/login-logs' },
    ],
  },
  {
    id: 'site-content',
    label: 'إدارة المحتوى',
    icon: DocumentTextIcon,
    href: '/admin/site-content',
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    icon: Cog6ToothIcon,
    href: '/admin/settings',
  },
];

interface AdminSidebarProps {
  adminName?: string;
  adminRole?: string;
  adminPermissions?: string[];
  onLogout?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function AdminSidebar({
  adminName = 'مدير',
  adminRole = 'ADMIN',
  adminPermissions = [],
  onLogout,
  isOpen = true,
  onClose,
}: AdminSidebarProps) {
  const router = useRouter();
  const pathname = router.pathname;
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);

  // تحويل ID القائمة إلى ID القسم في نظام الصلاحيات
  const mapMenuIdToSectionId = (menuId: string): string => {
    const mapping: Record<string, string> = {
      managers: 'admins',
      'site-content': 'content',
    };
    return mapping[menuId] || menuId;
  };

  // فلترة الأقسام حسب الصلاحيات
  const filteredMenuItems = useMemo(() => {
    // SUPER_ADMIN يرى كل شيء
    if (adminRole === 'SUPER_ADMIN' || adminPermissions.includes('*')) {
      return menuItems;
    }

    // فلترة الأقسام حسب الصلاحيات
    const filtered = menuItems.filter((item) => {
      // لوحة التحكم الرئيسية متاحة للجميع
      if (item.id === 'dashboard') return true;

      // تحويل ID القائمة إلى ID القسم في نظام الصلاحيات
      const sectionId = mapMenuIdToSectionId(item.id);

      // التحقق من وجود صلاحية لهذا القسم
      return hasSectionAccess(adminPermissions, sectionId);
    });

    return filtered;
  }, [adminRole, adminPermissions]);

  // جلب إحصائيات الإشعارات
  const statsRequestControllerRef = useRef<AbortController | null>(null);
  const fetchStats = useCallback(async () => {
    try {
      statsRequestControllerRef.current?.abort();
      const controller = new AbortController();
      statsRequestControllerRef.current = controller;

      const res = await fetch('/api/admin/notifications/stats', { signal: controller.signal });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      if ((err as any)?.name !== 'AbortError') {
        console.error('Failed to fetch notification stats:', err);
      }
    }
  }, []);

  // جلب الإحصائيات عند التحميل وكل 30 ثانية
  useEffect(() => {
    void fetchStats();
    const interval = setInterval(() => {
      void fetchStats();
    }, 30000);
    return () => {
      clearInterval(interval);
      statsRequestControllerRef.current?.abort();
    };
  }, [fetchStats]);

  // الحصول على badge لقسم معين
  const getBadge = (sectionId: string): number => {
    if (!stats) return 0;
    switch (sectionId) {
      case 'users':
        return stats.users.pending;
      case 'support':
        return stats.support.open;
      case 'wallets':
        return stats.wallets.pendingWithdrawals;
      case 'showrooms':
        return stats.showrooms.pending;
      case 'transport':
        return stats.transport.pending;
      case 'security':
        return stats.security.alerts;
      case 'auctions':
        return stats.auctions.pending;
      case 'promotions':
        return stats.promotions?.newRequests || 0;
      default:
        return 0;
    }
  };

  // Auto-expand active menu items
  useEffect(() => {
    const activeItems: string[] = [];
    menuItems.forEach((item) => {
      if (item.children) {
        item.children.forEach((child) => {
          if (child.href && pathname.startsWith(child.href)) {
            activeItems.push(item.id);
          }
        });
      }
    });
    setExpandedItems((prev) => [...new Set([...prev, ...activeItems])]);
  }, [pathname]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId],
    );
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === '/admin') return pathname === '/admin';

    // معالجة خاصة للصفحات التي تستخدم redirect مع query parameters
    // مثل /admin/marketplace/featured → /admin/marketplace?featured=true
    const redirectMappings: Record<string, { path: string; query: Record<string, string> }> = {
      '/admin/marketplace/featured': { path: '/admin/marketplace', query: { featured: 'true' } },
      '/admin/auctions/featured': { path: '/admin/auctions', query: { featured: 'true' } },
      '/admin/transport/active': { path: '/admin/transport', query: { status: 'ACTIVE' } },
      '/admin/transport/inactive': { path: '/admin/transport', query: { status: 'INACTIVE' } },
    };

    const mapping = redirectMappings[href];
    if (mapping) {
      // التحقق من أن المسار والـ query parameters متطابقة
      if (pathname === mapping.path) {
        const queryMatches = Object.entries(mapping.query).every(
          ([key, value]) => router.query[key] === value,
        );
        if (queryMatches) return true;
      }
    }

    // تجنب تحديد الصفحة الرئيسية عندما يكون هناك query parameter يشير لصفحة فرعية
    // مثلاً: /admin/marketplace لا يُحدد عندما نكون في /admin/marketplace?featured=true
    const basePages = ['/admin/marketplace', '/admin/auctions', '/admin/transport'];
    if (basePages.includes(href) && pathname === href) {
      // إذا كان هناك query parameter خاص بصفحة فرعية، لا تحدد الصفحة الرئيسية
      if (router.query.featured === 'true' || router.query.status) {
        return false;
      }
    }

    return pathname.startsWith(href);
  };

  const renderMenuItem = (item: MenuItem, depth = 0) => {
    const expanded = expandedItems.includes(item.id);
    const active = isActive(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const badge = getBadge(item.id);
    const iconStyle = getMenuIconStyle(item.id);

    return (
      <div key={item.id}>
        {hasChildren ? (
          <button
            onClick={() => toggleExpand(item.id)}
            className={`group flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-all ${
              depth > 0 ? 'pr-10' : ''
            } text-slate-300 hover:bg-slate-700/60 hover:text-white`}
          >
            <div className="flex items-center gap-3">
              {item.icon && (
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconStyle.bg} ${iconStyle.hoverBg} ring-1 ${iconStyle.ring} transition-colors`}
                >
                  <item.icon className={`h-5 w-5 ${iconStyle.text}`} />
                </span>
              )}
              <span>{item.label}</span>
              {badge > 0 && (
                <span className="min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
            <ChevronLeftIcon
              className={`h-4 w-4 transition-transform ${expanded ? '-rotate-90' : ''}`}
            />
          </button>
        ) : (
          <Link
            href={item.href || '#'}
            className={`group flex w-full items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 ${depth > 0 ? 'pr-10' : ''} ${
              active
                ? 'border-l-4 border-blue-500 bg-gradient-to-l from-blue-600/30 to-blue-500/10 text-blue-400'
                : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
            } `}
          >
            {item.icon && (
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconStyle.bg} ${iconStyle.hoverBg} ring-1 ${iconStyle.ring} transition-colors`}
              >
                <item.icon className={`h-5 w-5 ${iconStyle.text}`} />
              </span>
            )}
            <span>{item.label}</span>
            {badge > 0 && (
              <span className="min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5 text-center text-xs font-bold text-white">
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </Link>
        )}

        {hasChildren && (
          <AnimatedPresence show={expanded} className="bg-slate-800/40">
            <div>
              {item.children!.map((child, index) => (
                <AnimatedSection key={child.id} delay={40 * index} className="border-slate-800/40">
                  <Link
                    href={child.href || '#'}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 pr-12 text-sm transition-all ${
                      isActive(child.href)
                        ? 'bg-blue-600/15 text-blue-400'
                        : 'text-slate-400 hover:bg-slate-700/40 hover:text-white'
                    } `}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                    <span>{child.label}</span>
                    {child.badge && (
                      <span className="rounded-full bg-blue-600/30 px-1.5 py-0.5 text-xs text-blue-400">
                        {child.badge}
                      </span>
                    )}
                  </Link>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedPresence>
        )}
      </div>
    );
  };

  return (
    <div>
      <AnimatedPresence
        show={isOpen}
        variant="fade"
        duration="fast"
        className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm lg:hidden"
      >
        <div className="h-full w-full" onClick={onClose} />
      </AnimatedPresence>

      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-64 flex-col border-l border-slate-700 bg-slate-900 transition-transform duration-500 ${
          isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.19, 1, 0.22, 1)',
        }}
      >
        <div className="flex items-center justify-between border-b border-slate-700 p-5">
          <div>
            <h1 className="text-xl font-bold text-white">لوحة التحكم</h1>
            <p className="mt-1 text-sm text-slate-400">سوق المزاد</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {filteredMenuItems.map((item) => renderMenuItem(item))}
        </nav>

        <div className="border-t border-slate-700/50 bg-gradient-to-t from-slate-950/50 to-transparent p-4">
          <div className="mb-3 rounded-xl bg-slate-800/60 p-3 ring-1 ring-slate-700/50 backdrop-blur-sm transition-all duration-300 hover:bg-slate-800/80 hover:ring-slate-600/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 shadow-lg shadow-blue-500/25 ring-2 ring-blue-400/20">
                  <span className="text-base font-bold text-white drop-shadow-sm">
                    {adminName.charAt(0)}
                  </span>
                </div>
                <span className="absolute -bottom-0.5 -left-0.5 h-3 w-3 rounded-full border-2 border-slate-800 bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{adminName}</p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span className="inline-flex items-center rounded-md bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
                    {adminRole === 'SUPER_ADMIN'
                      ? 'مدير عام'
                      : adminRole === 'ADMIN'
                        ? 'مدير'
                        : 'مشرف'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {onLogout && (
            <button
              onClick={onLogout}
              className="group flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2.5 text-sm font-medium text-red-400 transition-all duration-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 hover:shadow-lg hover:shadow-red-500/10"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
              <span>تسجيل الخروج</span>
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
