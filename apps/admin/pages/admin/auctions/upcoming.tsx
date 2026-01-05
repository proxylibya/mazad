/**
 * صفحة المزادات القادمة - Upcoming Auctions
 * تعرض المزادات التي لم تبدأ بعد
 */

import {
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  FireIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PhotoIcon,
  PlayCircleIcon,
  XCircleIcon,
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
  createdAt: string;
}

export default function UpcomingAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    startingToday: 0,
    startingThisWeek: 0,
  });

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auctions?status=UPCOMING');
      const data = await res.json();

      if (data.success) {
        setAuctions(data.auctions || []);

        // حساب الإحصائيات
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

        const startingToday =
          data.auctions?.filter((a: Auction) => {
            const startDate = new Date(a.startDate);
            return (
              startDate >= today && startDate < new Date(today.getTime() + 24 * 60 * 60 * 1000)
            );
          }).length || 0;

        const startingThisWeek =
          data.auctions?.filter((a: Auction) => {
            const startDate = new Date(a.startDate);
            return startDate >= today && startDate < nextWeek;
          }).length || 0;

        setStats({
          total: data.auctions?.length || 0,
          startingToday,
          startingThisWeek,
        });
      }
    } catch (err) {
      console.error('Failed to fetch upcoming auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAuctions = auctions.filter((auction) =>
    auction.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // حساب الوقت حتى البدء
  const getTimeUntilStart = (startDate: string) => {
    const start = new Date(startDate).getTime();
    const now = Date.now();
    const diff = start - now;

    if (diff <= 0) return 'يبدأ الآن';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days} يوم ${hours}س`;
    }

    return `${hours}س ${minutes}د`;
  };

  // تنسيق التاريخ
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-LY', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // بدء المزاد الآن
  const handleStartNow = async (auctionId: string) => {
    if (!confirm('هل أنت متأكد من بدء هذا المزاد الآن؟')) return;

    try {
      const res = await fetch(`/api/admin/auctions?id=${auctionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      const data = await res.json();
      if (data.success) {
        alert('تم بدء المزاد بنجاح');
        fetchAuctions();
      } else {
        alert(data.message || 'فشل في بدء المزاد');
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  // إلغاء المزاد
  const handleCancelAuction = async (auctionId: string) => {
    if (!confirm('هل أنت متأكد من إلغاء هذا المزاد؟')) return;

    try {
      const res = await fetch(`/api/admin/auctions?id=${auctionId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        alert('تم إلغاء المزاد بنجاح');
        fetchAuctions();
      } else {
        alert(data.message || 'فشل في إلغاء المزاد');
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  return (
    <AdminLayout title="المزادات القادمة">
      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <CalendarDaysIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-slate-400">إجمالي المزادات القادمة</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <PlayCircleIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.startingToday}</p>
              <p className="text-sm text-slate-400">تبدأ اليوم</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <ClockIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.startingThisWeek}</p>
              <p className="text-sm text-slate-400">تبدأ هذا الأسبوع</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-400">{filteredAuctions.length} مزاد في الانتظار</p>
        <button
          onClick={fetchAuctions}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-slate-300 transition-colors hover:bg-slate-600 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          تحديث
        </button>
      </div>

      {/* Search */}
      <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800 p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-3 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder="البحث في المزادات القادمة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2.5 pl-4 pr-10 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>

      {/* Auctions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        </div>
      ) : filteredAuctions.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-12 text-center">
          <CalendarDaysIcon className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-lg text-slate-400">لا توجد مزادات قادمة</p>
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
                  سعر البداية
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  يبدأ في
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  الوقت المتبقي
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  البائع
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
                      {auction.featured && <FireIcon className="h-5 w-5 text-amber-400" />}
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
                    <div className="flex items-center gap-2">
                      <CurrencyDollarIcon className="h-5 w-5 text-emerald-400" />
                      <span className="font-bold text-emerald-400">
                        {auction.startPrice.toLocaleString('ar-LY')} د.ل
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-300">{formatDate(auction.startDate)}</p>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400">
                      {getTimeUntilStart(auction.startDate)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                    <span title={auction.seller?.name || '-'}>
                      {truncateText(auction.seller?.name || '-')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/admin/auctions/${auction.id}`}
                        className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-500/10"
                        title="عرض التفاصيل"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                      <Link
                        href={`/admin/auctions/${auction.id}/edit`}
                        className="rounded-lg p-2 text-amber-400 transition-colors hover:bg-amber-500/10"
                        title="تعديل المزاد"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleStartNow(auction.id)}
                        className="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10"
                        title="بدء المزاد الآن"
                      >
                        <PlayCircleIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleCancelAuction(auction.id)}
                        className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10"
                        title="إلغاء المزاد"
                      >
                        <XCircleIcon className="h-5 w-5" />
                      </button>
                    </div>
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
