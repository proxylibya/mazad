/**
 * صفحة المزادات المنتهية - Ended Auctions (بدون بيع)
 * تعرض المزادات التي انتهت بدون فائز
 */

import {
  ArrowPathIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
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

export default function EndedAuctionsPage() {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    noBids: 0,
    cancelled: 0,
  });

  useEffect(() => {
    fetchAuctions();
  }, []);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      // جلب المزادات المنتهية بدون مزايدات + الملغاة
      const [endedRes, cancelledRes] = await Promise.all([
        fetch('/api/admin/auctions?status=ENDED'),
        fetch('/api/admin/auctions?status=CANCELLED'),
      ]);

      const [endedData, cancelledData] = await Promise.all([endedRes.json(), cancelledRes.json()]);

      // فلترة المزادات المنتهية بدون مزايدات (لم تُباع)
      const unsoldAuctions = (endedData.auctions || []).filter((a: Auction) => a.bidsCount === 0);

      const cancelledAuctions = cancelledData.auctions || [];

      // دمج القوائم
      const allEnded = [...unsoldAuctions, ...cancelledAuctions];
      setAuctions(allEnded);

      setStats({
        total: allEnded.length,
        noBids: unsoldAuctions.length,
        cancelled: cancelledAuctions.length,
      });
    } catch (err) {
      console.error('Failed to fetch ended auctions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAuctions = auctions.filter((auction) =>
    auction.title.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // تنسيق التاريخ
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // حساب المدة منذ الانتهاء
  const getTimeSinceEnd = (endDate: string) => {
    const end = new Date(endDate).getTime();
    const now = Date.now();
    const diff = now - end;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'اليوم';
    if (days === 1) return 'أمس';
    if (days < 7) return `منذ ${days} أيام`;
    if (days < 30) return `منذ ${Math.floor(days / 7)} أسابيع`;
    return `منذ ${Math.floor(days / 30)} شهر`;
  };

  // إعادة تفعيل المزاد
  const handleReactivateAuction = async (auctionId: string) => {
    if (!confirm('هل أنت متأكد من إعادة تفعيل هذا المزاد؟')) return;

    try {
      const res = await fetch(`/api/admin/auctions?id=${auctionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ACTIVE' }),
      });
      const data = await res.json();
      if (data.success) {
        alert('تم إعادة تفعيل المزاد بنجاح');
        fetchAuctions();
      } else {
        alert(data.message || 'فشل في إعادة تفعيل المزاد');
      }
    } catch {
      alert('خطأ في الاتصال بالخادم');
    }
  };

  return (
    <AdminLayout title="المزادات المنتهية">
      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-500/30 bg-gradient-to-br from-slate-500/10 to-slate-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-500/20 p-2">
              <ClockIcon className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-slate-400">إجمالي المنتهية</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2">
              <ExclamationTriangleIcon className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.noBids}</p>
              <p className="text-sm text-slate-400">بدون مزايدات</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-500/20 p-2">
              <XCircleIcon className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.cancelled}</p>
              <p className="text-sm text-slate-400">ملغاة</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <p className="text-slate-400">{filteredAuctions.length} مزاد منتهي</p>
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
            placeholder="البحث في المزادات المنتهية..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2.5 pl-4 pr-10 text-white placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/30"
          />
        </div>
      </div>

      {/* Auctions Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-500 border-t-transparent"></div>
        </div>
      ) : filteredAuctions.length === 0 ? (
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-12 text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-slate-600" />
          <p className="mt-4 text-lg text-slate-400">لا توجد مزادات منتهية</p>
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
                  الحالة
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  سعر البداية
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  المشاهدات
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  البائع
                </th>
                <th className="px-6 py-4 text-right text-xs font-medium uppercase text-slate-400">
                  انتهى في
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
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    {auction.status === 'CANCELLED' ? (
                      <span className="flex items-center gap-1 rounded-full bg-red-500/20 px-3 py-1 text-xs font-medium text-red-400">
                        <XCircleIcon className="h-3 w-3" />
                        ملغي
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-400">
                        <ExclamationTriangleIcon className="h-3 w-3" />
                        بدون مزايدات
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                    {auction.startPrice.toLocaleString('ar-LY')} د.ل
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-center text-slate-300">
                    {auction.views}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-slate-300">
                    <span title={auction.seller?.name || '-'}>
                      {truncateText(auction.seller?.name || '-')}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div>
                      <p className="text-slate-300">{formatDate(auction.endDate)}</p>
                      <p className="text-xs text-slate-500">{getTimeSinceEnd(auction.endDate)}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/auctions/${auction.id}`}
                        className="rounded-lg p-2 text-blue-400 transition-colors hover:bg-blue-500/10"
                        title="عرض التفاصيل"
                      >
                        <EyeIcon className="h-5 w-5" />
                      </Link>
                      {auction.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleReactivateAuction(auction.id)}
                          className="rounded-lg p-2 text-emerald-400 transition-colors hover:bg-emerald-500/10"
                          title="إعادة تفعيل"
                        >
                          <ArrowPathIcon className="h-5 w-5" />
                        </button>
                      )}
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
