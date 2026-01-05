/**
 * صفحة المزادات المباشرة - Live Auctions
 * تعرض المزادات الجارية حالياً
 */

import {
  ArrowPathIcon,
  CurrencyDollarIcon,
  EyeIcon,
  FireIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  PhotoIcon,
  SignalIcon,
  StopCircleIcon,
  UserGroupIcon,
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

export default function LiveAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    totalBids: 0,
    totalValue: 0,
  });

  useEffect(() => {
    fetchAuctions();
    // تحديث كل 30 ثانية للمزادات المباشرة
    const interval = setInterval(fetchAuctions, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/auctions?status=ACTIVE');
      const data = await res.json();

      if (data.success) {
        setAuctions(data.auctions || []);
        // حساب الإحصائيات
        const totalBids =
          data.auctions?.reduce((sum: number, a: Auction) => sum + (a.bidsCount || 0), 0) || 0;
        const totalValue =
          data.auctions?.reduce((sum: number, a: Auction) => sum + (a.currentPrice || 0), 0) || 0;
        setStats({
          total: data.auctions?.length || 0,
          totalBids,
          totalValue,
        });
      }
    } catch (err) {
      console.error('Failed to fetch live auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAuctions = auctions.filter((auction) =>
    auction.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // حساب الوقت المتبقي
  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diff = end - now;

    if (diff <= 0) return 'انتهى';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} يوم`;
    }

    return `${hours}س ${minutes}د`;
  };

  // إيقاف المزاد
  const handleStopAuction = async (auctionId: string) => {
    if (!confirm('هل أنت متأكد من إيقاف هذا المزاد؟')) return;

    try {
      const res = await fetch(`/api/admin/auctions?id=${auctionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      });
      const data = await res.json();
      if (data.success) {
        alert('تم إيقاف المزاد بنجاح');
        fetchAuctions();
      } else {
        alert(data.message || 'فشل في إيقاف المزاد');
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  return (
    <AdminLayout title="المزادات المباشرة">
      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2">
              <SignalIcon className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-slate-400">مزاد مباشر الآن</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2">
              <UserGroupIcon className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalBids}</p>
              <p className="text-sm text-slate-400">إجمالي المزايدات</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <CurrencyDollarIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats.totalValue.toLocaleString('ar-LY')} د.ل
              </p>
              <p className="text-sm text-slate-400">إجمالي القيمة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
          </span>
          <p className="text-slate-400">{filteredAuctions.length} مزاد جاري الآن</p>
        </div>
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
            placeholder="البحث في المزادات المباشرة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2.5 pl-4 pr-10 text-white placeholder-slate-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
          />
        </div>
      </div>

      {/* Auctions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-red-500 border-t-transparent"></div>
        </div>
      ) : filteredAuctions.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-12 text-center">
          <SignalIcon className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-lg text-slate-400">لا توجد مزادات مباشرة حالياً</p>
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
                  السعر الحالي
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  المزايدات
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  الوقت المتبقي
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  المشاهدات
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
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-white" title={auction.title}>
                            {truncateText(auction.title)}
                          </p>
                          {auction.featured && (
                            <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                              <FireIcon className="h-3 w-3" />
                              مميز
                            </span>
                          )}
                        </div>
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
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center">
                    <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400">
                      {auction.bidsCount} مزايدة
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm font-medium text-amber-400">
                      {getTimeRemaining(auction.endDate)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-slate-300">
                    <div className="flex items-center gap-1">
                      <EyeIcon className="h-4 w-4" />
                      {auction.views}
                    </div>
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
                        onClick={() => handleStopAuction(auction.id)}
                        className="rounded-lg p-2 text-red-400 transition-colors hover:bg-red-500/10"
                        title="إيقاف المزاد"
                      >
                        <StopCircleIcon className="h-5 w-5" />
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
