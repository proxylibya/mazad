/**
 * لوحة التحكم الرئيسية
 * Admin Dashboard
 */

import {
  BuildingStorefrontIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  TruckIcon,
  UsersIcon,
  WalletIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout';

const DASHBOARD_ICON_STYLES: Record<
  string,
  {
    bg: string;
    text: string;
    ring: string;
    hoverBg: string;
  }
> = {
  users: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    ring: 'ring-cyan-500/25',
    hoverBg: 'group-hover:bg-cyan-500/15',
  },
  auctions: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    ring: 'ring-emerald-500/25',
    hoverBg: 'group-hover:bg-emerald-500/15',
  },
  transport: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    ring: 'ring-amber-500/25',
    hoverBg: 'group-hover:bg-amber-500/15',
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
  admins: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    ring: 'ring-indigo-500/25',
    hoverBg: 'group-hover:bg-indigo-500/15',
  },
  default: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    ring: 'ring-blue-500/25',
    hoverBg: 'group-hover:bg-blue-500/15',
  },
};

const getDashboardIconStyle = (id: string) => {
  return DASHBOARD_ICON_STYLES[id] || DASHBOARD_ICON_STYLES.default;
};

interface DashboardStats {
  totalUsers: number;
  totalAuctions: number;
  totalTransport: number;
  totalRevenue: number;
  totalShowrooms: number;
  totalWallets: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalAuctions: 0,
    totalTransport: 0,
    totalRevenue: 0,
    totalShowrooms: 0,
    totalWallets: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/stats');
      if (res.ok) {
        const data = await res.json();
        setStats((prev) => ({
          ...prev,
          totalUsers: data.totalUsers ?? 0,
          totalAuctions: data.totalAuctions ?? 0,
          totalTransport: data.totalTransport ?? 0,
          totalRevenue: data.totalRevenue ?? 0,
          totalShowrooms: data.totalShowrooms ?? 0,
          totalWallets: data.totalWallets ?? 0,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const statCards = [
    {
      id: 'users',
      name: 'المستخدمين',
      href: '/admin/users',
      icon: UsersIcon,
      count: stats.totalUsers,
      color: 'from-blue-600 to-blue-700',
      bgLight: 'bg-blue-500/10',
    },
    {
      id: 'auctions',
      name: 'المزادات',
      href: '/admin/auctions',
      icon: CurrencyDollarIcon,
      count: stats.totalAuctions,
      color: 'from-emerald-600 to-emerald-700',
      bgLight: 'bg-emerald-500/10',
    },
    {
      id: 'transport',
      name: 'خدمات النقل',
      href: '/admin/transport',
      icon: TruckIcon,
      count: stats.totalTransport,
      color: 'from-amber-600 to-amber-700',
      bgLight: 'bg-amber-500/10',
    },
    {
      id: 'showrooms',
      name: 'المعارض',
      href: '/admin/showrooms',
      icon: BuildingStorefrontIcon,
      count: stats.totalShowrooms,
      color: 'from-purple-600 to-purple-700',
      bgLight: 'bg-purple-500/10',
    },
    {
      id: 'wallets',
      name: 'المحافظ',
      href: '/admin/wallets',
      icon: WalletIcon,
      count: stats.totalWallets,
      color: 'from-pink-600 to-pink-700',
      bgLight: 'bg-pink-500/10',
    },
    {
      id: 'admins',
      name: 'المديرين',
      href: '/admin/admins',
      icon: ShieldCheckIcon,
      count: 0,
      color: 'from-indigo-600 to-indigo-700',
      bgLight: 'bg-indigo-500/10',
    },
  ];

  const quickActions = [
    { name: 'إضافة مستخدم', href: '/admin/users/add', color: 'bg-blue-600 hover:bg-blue-700' },
    {
      name: 'إضافة خدمة نقل',
      href: '/admin/transport/add',
      color: 'bg-emerald-600 hover:bg-emerald-700',
    },
    { name: 'إدارة المزادات', href: '/admin/auctions', color: 'bg-amber-600 hover:bg-amber-700' },
    { name: 'عرض التقارير', href: '/admin/reports', color: 'bg-red-600 hover:bg-red-700' },
  ];

  return (
    <AdminLayout title="لوحة التحكم الرئيسية">
      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="group cursor-pointer rounded-xl border border-slate-700 bg-slate-800 p-6 transition-all duration-200 hover:border-slate-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">{item.name}</p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {(item.count ?? 0).toLocaleString('ar-LY')}
                  </p>
                </div>
                {(() => {
                  const style = getDashboardIconStyle(item.id);
                  return (
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-xl ${style.bg} ${style.hoverBg} ring-1 ${style.ring} transition-all duration-200 group-hover:scale-110`}
                    >
                      <item.icon className={`h-7 w-7 ${style.text}`} />
                    </div>
                  );
                })()}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-8 rounded-xl border border-slate-700 bg-slate-800 p-6">
        <h2 className="mb-4 text-xl font-bold text-white">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className={`${action.color} rounded-lg p-4 text-center text-white transition-all duration-200 hover:scale-105`}
            >
              {action.name}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-bold text-white">آخر المستخدمين</h2>
          <div className="space-y-3">
            <p className="py-8 text-center text-sm text-slate-400">لا توجد بيانات حالياً</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 text-lg font-bold text-white">آخر المزادات</h2>
          <div className="space-y-3">
            <p className="py-8 text-center text-sm text-slate-400">لا توجد بيانات حالياً</p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
