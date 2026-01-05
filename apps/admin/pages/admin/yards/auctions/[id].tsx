/**
 * صفحة تفاصيل مزاد الساحة - Yard Auction Details
 * عرض تفاصيل المزاد المرتبط بساحة
 */

import {
  ArrowPathIcon,
  BanknotesIcon,
  BuildingStorefrontIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckBadgeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  FireIcon,
  MapPinIcon,
  PhoneIcon,
  SignalIcon,
  TrophyIcon,
  UserGroupIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../../components/AdminLayout';

interface Bid {
  id: string;
  amount: number;
  createdAt: string;
  bidder: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
  };
}

interface Car {
  id: string;
  title: string;
  description?: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  color: string;
  fuelType: string;
  transmission: string;
  engineSize?: string;
  location: string;
  price: number;
  images: { id: string; url: string; isPrimary: boolean }[];
}

interface Seller {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatar?: string;
  createdAt: string;
}

interface Yard {
  id: string;
  slug: string;
  name: string;
  description?: string;
  city: string;
  area?: string;
  address?: string;
  phone?: string;
  image?: string;
  images: string[];
  auctionDays: string[];
  auctionTimeFrom?: string;
  auctionTimeTo?: string;
  status: string;
  verified: boolean;
}

interface Auction {
  id: string;
  title: string;
  description?: string;
  startPrice: number;
  currentPrice: number;
  minimumBid: number;
  status: string;
  type: string;
  startDate: string;
  endDate: string;
  views: number;
  totalBids: number;
  bidsCount: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  location?: string;
  yardId?: string;
  yard: Yard | null;
  car: Car | null;
  seller: Seller | null;
  bids: Bid[];
  stats: {
    highestBid: {
      amount: number;
      bidder: { id: string; name: string } | null;
      time: string;
    } | null;
    uniqueBidders: number;
    avgBidAmount: number;
    totalBidsValue: number;
  };
}

export default function YardAuctionDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const [auction, setAuction] = useState<Auction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchAuction();
    }
  }, [id]);

  const fetchAuction = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/auctions/${id}`);
      const data = await res.json();

      if (data.success) {
        setAuction(data.auction);
      } else {
        setError(data.message || 'فشل في جلب بيانات المزاد');
      }
    } catch (err) {
      console.error('Failed to fetch auction:', err);
      setError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ar-LY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
      ACTIVE: {
        label: 'نشط',
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        icon: <SignalIcon className="h-5 w-5" />,
      },
      ENDED: {
        label: 'منتهي',
        color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
        icon: <ClockIcon className="h-5 w-5" />,
      },
      CANCELLED: {
        label: 'ملغي',
        color: 'bg-red-500/20 text-red-400 border-red-500/30',
        icon: <XCircleIcon className="h-5 w-5" />,
      },
      PENDING: {
        label: 'قيد المراجعة',
        color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        icon: <ClockIcon className="h-5 w-5" />,
      },
      UPCOMING: {
        label: 'قادم',
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: <CalendarDaysIcon className="h-5 w-5" />,
      },
      SOLD: {
        label: 'مباع',
        color: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
        icon: <TrophyIcon className="h-5 w-5" />,
      },
    };
    return statusMap[status] || statusMap.PENDING;
  };

  const handleCancelAuction = async () => {
    if (!confirm('هل أنت متأكد من إلغاء هذا المزاد؟')) return;

    try {
      const res = await fetch(`/api/admin/auctions/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        fetchAuction(); // إعادة تحميل البيانات
      } else {
        alert(data.message || 'فشل في إلغاء المزاد');
      }
    } catch (err) {
      console.error('Failed to cancel auction:', err);
      alert('حدث خطأ في الخادم');
    }
  };

  if (loading) {
    return (
      <AdminLayout title="تحميل...">
        <div className="flex items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !auction) {
    return (
      <AdminLayout title="خطأ">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-8 text-center">
          <XCircleIcon className="mx-auto h-12 w-12 text-red-400" />
          <p className="mt-4 text-lg text-red-400">{error || 'المزاد غير موجود'}</p>
          <Link
            href="/admin/yards/auctions"
            className="mt-4 inline-block rounded-lg bg-slate-700 px-4 py-2 text-white transition-colors hover:bg-slate-600"
          >
            العودة لمزادات الساحات
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const statusInfo = getStatusInfo(auction.status);

  return (
    <AdminLayout title={`تفاصيل مزاد الساحة: ${auction.title}`}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/yards/auctions"
            className="rounded-lg bg-slate-700 px-3 py-2 text-slate-300 transition-colors hover:bg-slate-600"
          >
            ← العودة
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-white">{auction.title}</h1>
              {auction.featured && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-400">
                  <FireIcon className="h-3 w-3" />
                  مميز
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">ID: {auction.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 ${statusInfo.color}`}
          >
            {statusInfo.icon}
            {statusInfo.label}
          </span>

          <button
            onClick={fetchAuction}
            className="rounded-lg bg-slate-700 p-2 text-slate-300 transition-colors hover:bg-slate-600"
            title="تحديث"
          >
            <ArrowPathIcon className="h-5 w-5" />
          </button>

          {/* يمكن إضافة زر التعديل لاحقاً إذا توفرت صفحة التعديل */}
          {/* <Link
            href={`/admin/yards/auctions/${auction.id}/edit`}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
          >
            <PencilSquareIcon className="h-5 w-5" />
            تعديل
          </Link> */}

          {auction.status === 'ACTIVE' && (
            <button
              onClick={handleCancelAuction}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
            >
              <XCircleIcon className="h-5 w-5" />
              إلغاء
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/20 p-2">
              <CurrencyDollarIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {auction.currentPrice.toLocaleString('ar-LY')} د.ل
              </p>
              <p className="text-sm text-slate-400">السعر الحالي</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/20 p-2">
              <UserGroupIcon className="h-6 w-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{auction.bidsCount}</p>
              <p className="text-sm text-slate-400">عدد المزايدات</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-amber-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/20 p-2">
              <ChartBarIcon className="h-6 w-6 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{auction.stats.uniqueBidders}</p>
              <p className="text-sm text-slate-400">عدد المزايدين</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-500/20 p-2">
              <EyeIcon className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{auction.views}</p>
              <p className="text-sm text-slate-400">المشاهدات</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2 columns */}
        <div className="space-y-6 lg:col-span-2">
          {/* Auction Info */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <BanknotesIcon className="h-5 w-5 text-blue-400" />
              معلومات المزاد
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg bg-slate-700/50 p-4">
                <p className="text-sm text-slate-400">سعر البداية</p>
                <p className="text-xl font-bold text-white">
                  {auction.startPrice.toLocaleString('ar-LY')} د.ل
                </p>
              </div>

              <div className="rounded-lg bg-slate-700/50 p-4">
                <p className="text-sm text-slate-400">الحد الأدنى للمزايدة</p>
                <p className="text-xl font-bold text-white">
                  {auction.minimumBid.toLocaleString('ar-LY')} د.ل
                </p>
              </div>

              <div className="rounded-lg bg-slate-700/50 p-4">
                <p className="text-sm text-slate-400">تاريخ البداية</p>
                <p className="text-lg font-medium text-white">{formatDate(auction.startDate)}</p>
              </div>

              <div className="rounded-lg bg-slate-700/50 p-4">
                <p className="text-sm text-slate-400">تاريخ الانتهاء</p>
                <p className="text-lg font-medium text-white">{formatDate(auction.endDate)}</p>
              </div>
            </div>

            {auction.description && (
              <div className="mt-4">
                <p className="text-sm text-slate-400">الوصف</p>
                <p className="mt-1 text-slate-300">{auction.description}</p>
              </div>
            )}

            {auction.location && (
              <div className="mt-4 flex items-center gap-2">
                <MapPinIcon className="h-5 w-5 text-slate-400" />
                <span className="text-slate-300">{auction.location}</span>
              </div>
            )}
          </div>

          {/* Yard Info - معلومات الساحة */}
          {auction.yard && (
            <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <BuildingStorefrontIcon className="h-5 w-5 text-orange-400" />
                معلومات الساحة
                {auction.yard.verified && (
                  <CheckBadgeIcon className="h-5 w-5 text-emerald-400" title="ساحة موثقة" />
                )}
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-slate-700/50 p-4">
                  <p className="text-sm text-slate-400">اسم الساحة</p>
                  <p className="text-lg font-bold text-white">{auction.yard.name}</p>
                </div>

                <div className="rounded-lg bg-slate-700/50 p-4">
                  <p className="text-sm text-slate-400">المدينة</p>
                  <p className="text-lg font-medium text-white">
                    {auction.yard.city}
                    {auction.yard.area ? ` - ${auction.yard.area}` : ''}
                  </p>
                </div>

                {auction.yard.phone && (
                  <div className="rounded-lg bg-slate-700/50 p-4">
                    <p className="text-sm text-slate-400">رقم الهاتف</p>
                    <p className="flex items-center gap-2 text-lg font-medium text-white">
                      <PhoneIcon className="h-4 w-4" />
                      {auction.yard.phone}
                    </p>
                  </div>
                )}

                {auction.yard.auctionDays && auction.yard.auctionDays.length > 0 && (
                  <div className="rounded-lg bg-slate-700/50 p-4">
                    <p className="text-sm text-slate-400">أيام المزاد</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {auction.yard.auctionDays.map((day) => (
                        <span
                          key={day}
                          className="rounded-full bg-orange-500/20 px-2 py-0.5 text-xs text-orange-400"
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(auction.yard.auctionTimeFrom || auction.yard.auctionTimeTo) && (
                  <div className="rounded-lg bg-slate-700/50 p-4">
                    <p className="text-sm text-slate-400">وقت المزاد</p>
                    <p className="flex items-center gap-2 text-lg font-medium text-white">
                      <ClockIcon className="h-4 w-4" />
                      {auction.yard.auctionTimeFrom || '?'} - {auction.yard.auctionTimeTo || '?'}
                    </p>
                  </div>
                )}

                {auction.yard.address && (
                  <div className="rounded-lg bg-slate-700/50 p-4 md:col-span-2">
                    <p className="text-sm text-slate-400">العنوان</p>
                    <p className="flex items-center gap-2 text-lg font-medium text-white">
                      <MapPinIcon className="h-4 w-4" />
                      {auction.yard.address}
                    </p>
                  </div>
                )}
              </div>

              {auction.yard.description && (
                <div className="mt-4">
                  <p className="text-sm text-slate-400">وصف الساحة</p>
                  <p className="mt-1 text-slate-300">{auction.yard.description}</p>
                </div>
              )}

              {/* صور الساحة */}
              {(auction.yard.image || (auction.yard.images && auction.yard.images.length > 0)) && (
                <div className="mt-4">
                  <p className="mb-2 text-sm text-slate-400">صور الساحة</p>
                  <div className="grid grid-cols-4 gap-2">
                    {auction.yard.image && (
                      <div className="aspect-video overflow-hidden rounded-lg border border-orange-500/30">
                        <img
                          src={auction.yard.image}
                          alt="الصورة الرئيسية"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      </div>
                    )}
                    {auction.yard.images.slice(0, auction.yard.image ? 3 : 4).map((imgUrl, idx) => (
                      <div
                        key={idx}
                        className="aspect-video overflow-hidden rounded-lg border border-slate-600"
                      >
                        <img
                          src={imgUrl}
                          alt={`صورة ${idx + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Link
                href={`/admin/yards/${auction.yard.slug || auction.yard.id}`}
                className="mt-4 block w-full rounded-lg bg-orange-600 px-4 py-2 text-center text-sm text-white transition-colors hover:bg-orange-700"
              >
                عرض تفاصيل الساحة
              </Link>
            </div>
          )}

          {/* Car Info */}
          {auction.car && (
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
                <svg
                  className="h-5 w-5 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                  />
                </svg>
                بيانات السيارة
              </h2>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm text-slate-400">النوع</p>
                  <p className="text-white">{auction.car.make}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">الموديل</p>
                  <p className="text-white">{auction.car.model}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">السنة</p>
                  <p className="text-white">{auction.car.year}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">المسافة المقطوعة</p>
                  <p className="text-white">{auction.car.mileage.toLocaleString()} كم</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">اللون</p>
                  <p className="text-white">{auction.car.color}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">ناقل الحركة</p>
                  <p className="text-white">{auction.car.transmission}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Bids List */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
              <UserGroupIcon className="h-5 w-5 text-blue-400" />
              آخر المزايدات
            </h2>

            {auction.bids && auction.bids.length > 0 ? (
              <div className="space-y-4">
                {auction.bids.map((bid, index) => (
                  <div
                    key={bid.id}
                    className={`flex items-center justify-between rounded-lg p-3 ${
                      index === 0
                        ? 'border border-emerald-500/20 bg-emerald-500/10'
                        : 'bg-slate-700/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 overflow-hidden rounded-full bg-slate-600">
                        {bid.bidder.avatar ? (
                          <img
                            src={bid.bidder.avatar}
                            alt={bid.bidder.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">
                            {bid.bidder.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{bid.bidder.name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(bid.createdAt).toLocaleTimeString('ar-LY')}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className={`font-bold ${index === 0 ? 'text-emerald-400' : 'text-white'}`}>
                        {bid.amount.toLocaleString('ar-LY')} د.ل
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400">لا توجد مزايدات حتى الآن</div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
