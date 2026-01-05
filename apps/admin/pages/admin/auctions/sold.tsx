/**
 * صفحة المزادات المباعة - Sold Auctions
 * تعرض المزادات التي انتهت بنجاح مع فائز
 */

import {
  ArrowPathIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  CurrencyDollarIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  TrophyIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { parseImages, truncateText } from '../../../components/unified';

interface Auction {
  id: string;
  title: string;
  description?: string;
  currentPrice: number;
  startPrice: number;
  minimumBid: number;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  views: number;
  totalBids: number;
  bidsCount: number;
  featured: boolean;
  car?: {
    id: string;
    title: string;
    year: number;
    mileage: number;
    images?: string[];
  };
  seller?: {
    id: string;
    name: string;
    phone: string;
  };
  winner?: {
    id: string;
    name: string;
    phone: string;
  };
  createdAt: string;
}

export default function SoldAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    totalRevenue: 0,
    avgPrice: 0,
    thisMonth: 0,
  });

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      // جلب المزادات المباعة (ENDED مع مزايدات)
      const res = await fetch('/api/admin/auctions?status=ENDED&sold=true');
      const data = await res.json();

      if (data.success) {
        // فلترة المزادات التي لها مزايدات (تعتبر مباعة)
        const soldAuctions = (data.auctions || []).filter((a: Auction) => a.bidsCount > 0);
        setAuctions(soldAuctions);

        // حساب الإحصائيات
        const totalRevenue = soldAuctions.reduce(
          (sum: number, a: Auction) => sum + (a.currentPrice || 0),
          0,
        );
        const avgPrice = soldAuctions.length > 0 ? totalRevenue / soldAuctions.length : 0;

        // المبيعات هذا الشهر
        const thisMonth = new Date();
        thisMonth.setDate(1);
        thisMonth.setHours(0, 0, 0, 0);
        const thisMonthCount = soldAuctions.filter((a: Auction) => {
          return new Date(a.endDate) >= thisMonth;
        }).length;

        setStats({
          total: soldAuctions.length,
          totalRevenue,
          avgPrice,
          thisMonth: thisMonthCount,
        });
      }
    } catch (err) {
      console.error('Failed to fetch sold auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAuctions = auctions.filter((auction) => {
    const matchesSearch = auction.title.toLowerCase().includes(searchQuery.toLowerCase());

    if (dateFilter === 'all') return matchesSearch;

    const endDate = new Date(auction.endDate);
    const now = new Date();

    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return matchesSearch && endDate >= today;
    }

    if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return matchesSearch && endDate >= weekAgo;
    }

    if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return matchesSearch && endDate >= monthAgo;
    }

    return matchesSearch;
  });

  // تنسيق التاريخ
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <AdminLayout title="المزادات المباعة">
      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <TrophyIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-slate-400">إجمالي المبيعات</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <BanknotesIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.totalRevenue.toLocaleString('ar-LY')} د.ل
              </p>
              <p className="text-sm text-slate-400">إجمالي الإيرادات</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2">
              <CurrencyDollarIcon className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {Math.round(stats.avgPrice).toLocaleString('ar-LY')} د.ل
              </p>
              <p className="text-sm text-slate-400">متوسط سعر البيع</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <CheckBadgeIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.thisMonth}</p>
              <p className="text-sm text-slate-400">مبيعات هذا الشهر</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-400">{filteredAuctions.length} مزاد تم بيعه</p>
        <button
          onClick={fetchAuctions}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-600 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="البحث في المزادات المباعة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2.5 pl-4 pr-10 text-white placeholder-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            />
          </div>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-700 px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="all">جميع الفترات</option>
            <option value="today">اليوم</option>
            <option value="week">هذا الأسبوع</option>
            <option value="month">هذا الشهر</option>
          </select>
        </div>
      </div>

      {/* Auctions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
        </div>
      ) : filteredAuctions.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-12 text-center">
          <TrophyIcon className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-lg text-slate-400">لا توجد مزادات مباعة</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
          <table className="w-full">
            <thead className="border-b border-slate-700 bg-slate-700/50">
              <tr>
                <th className="px-4 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  الصورة
                </th>
                <th className="px-4 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  المزاد
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  سعر البيع
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  المزايدات
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  الفائز
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  البائع
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  تاريخ البيع
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredAuctions.map((auction) => (
                <tr key={auction.id} className="transition-colors hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    {(() => {
                      const imgs = parseImages(auction.car?.images);
                      return imgs.length > 0 ? (
                        <div className="relative h-14 w-20 overflow-hidden rounded-lg border border-slate-600">
                          <Image
                            src={imgs[0]}
                            alt={auction.title}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                          {imgs.length > 1 && (
                            <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                              +{imgs.length - 1}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex h-14 w-20 items-center justify-center rounded-lg border border-slate-600 bg-slate-700">
                          <PhotoIcon className="h-6 w-6 text-slate-500" />
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-500/20 p-2">
                        <CheckBadgeIcon className="h-5 w-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white" title={auction.title}>
                          {truncateText(auction.title)}
                        </p>
                        {auction.car && (
                          <p className="text-sm text-slate-400" title={auction.car.title}>
                            {truncateText(auction.car.title)} - {auction.car.year}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="text-lg font-bold text-emerald-400">
                      {auction.currentPrice.toLocaleString('ar-LY')} د.ل
                    </span>
                    <p className="text-xs text-slate-500">
                      من {auction.startPrice.toLocaleString('ar-LY')} د.ل
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400">
                      {auction.bidsCount} مزايدة
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-amber-500/20 p-1.5">
                        <TrophyIcon className="h-4 w-4 text-amber-400" />
                      </div>
                      <span
                        className="text-slate-300"
                        title={auction.winner?.name || 'غير محدد'}
                      >
                        {truncateText(auction.winner?.name || 'غير محدد')}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <UserIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-slate-300" title={auction.seller?.name || '-'}>
                        {truncateText(auction.seller?.name || '-')}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                    {formatDate(auction.endDate)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Link
                      href={`/admin/auctions/${auction.id}`}
                      className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-500/10"
                    >
                      <EyeIcon className="h-5 w-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
}
