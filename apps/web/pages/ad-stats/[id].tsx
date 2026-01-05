import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import ArrowTrendingDownIcon from '@heroicons/react/24/outline/ArrowTrendingDownIcon';
import ArrowTrendingUpIcon from '@heroicons/react/24/outline/ArrowTrendingUpIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import ChartBarIcon from '@heroicons/react/24/outline/ChartBarIcon';
import ChatBubbleLeftIcon from '@heroicons/react/24/outline/ChatBubbleLeftIcon';
import ComputerDesktopIcon from '@heroicons/react/24/outline/ComputerDesktopIcon';
import DevicePhoneMobileIcon from '@heroicons/react/24/outline/DevicePhoneMobileIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import GlobeAltIcon from '@heroicons/react/24/outline/GlobeAltIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { OpensooqNavbar } from '../../components/common';
import useAuth from '../../hooks/useAuth';

// أنواع البيانات
interface AdStats {
  id: string;
  title: string;
  type: 'marketplace' | 'auction';
  price: number;
  location: string;
  createdAt: string;
  image: string;
  status: 'active' | 'sold' | 'expired';

  // إحصائيات المشاهدات
  totalViews: number;
  todayViews: number;
  weekViews: number;
  monthViews: number;
  viewsGrowth: number;

  // إحصائيات التفاعل
  favorites: number;
  shares: number;
  contacts: number;
  messages: number;

  // توزيع الأجهزة
  deviceStats: {
    mobile: number;
    desktop: number;
    tablet: number;
  };

  // مصادر الزيارات
  sourceStats: {
    direct: number;
    search: number;
    social: number;
    referral: number;
  };

  // إحصائيات زمنية
  dailyViews: Array<{
    date: string;
    views: number;
  }>;

  // المواقع الجغرافية
  locationStats: Array<{
    city: string;
    views: number;
    percentage: number;
  }>;
}

const AdStatsPage = () => {
  const router = useRouter();
  const { id } = router.query;
  // استخدام نظام المصادقة الحقيقي
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [adStats, setAdStats] = useState<AdStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('7'); // أيام
  const [isLoadingStats, setIsLoadingStats] = useState(false); // منع الطلبات المتكررة

  // التحقق من تسجيل الدخول
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/?callbackUrl=' + encodeURIComponent(router.asPath));
      return;
    }

    if (id && !adStats && !isLoadingStats) {
      loadAdStats(id as string);
    }
  }, [id, authLoading, isAuthenticated]); // تبسيط dependencies لتجنب infinite loop

  // تحميل إحصائيات الإعلان من قاعدة البيانات
  const loadAdStats = async (adId: string) => {
    // منع الطلبات المتكررة
    if (isLoadingStats) {
      console.warn('طلب تحميل إحصائيات قيد التنفيذ بالفعل، تجاهل الطلب الجديد');
      return;
    }

    setIsLoadingStats(true);
    setLoading(true);
    setError(null);

    try {
      console.log(`[جلب] جاري تحميل إحصائيات الإعلان: ${adId}`);

      const response = await fetch(`/api/listings/stats/${adId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        console.log('[نجح] تم جلب الإحصائيات بنجاح:', data.stats);
        setAdStats(data.stats);
        setError(null);
      } else {
        console.error('[فشل] فشل في جلب الإحصائيات:', data.error);
        setError(data.error || 'فشل في جلب إحصائيات الإعلان');
        setAdStats(null);
      }
    } catch (err) {
      console.error('[خطأ] خطأ في تحميل إحصائيات الإعلان:', err);
      setError('حدث خطأ في الاتصال بالخادم');
      setAdStats(null);
    } finally {
      setLoading(false);
      setIsLoadingStats(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'LYD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getGrowthIcon = (growth: number) => {
    if (growth > 0) return <ArrowTrendingUpIcon className="h-4 w-4" />;
    if (growth < 0) return <ArrowTrendingDownIcon className="h-4 w-4" />;
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-600';
      case 'sold':
        return 'bg-blue-100 text-blue-600';
      case 'expired':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'نشط';
      case 'sold':
        return 'مباع';
      case 'expired':
        return 'منتهي الصلاحية';
      default:
        return status;
    }
  };

  // حالة التحميل
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div
            className="mx-auto animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
            style={{ width: 48, height: 48 }}
            role="status"
            aria-label="جاري التحميل"
          />
          <p className="mt-4 text-gray-600">جاري تحميل الإحصائيات...</p>
        </div>
      </div>
    );
  }

  // حالة الخطأ
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto mb-4 h-16 w-16 text-red-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">حدث خطأ</h3>
            <p className="mb-6 text-gray-500">{error}</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => loadAdStats(id as string)}
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                إعادة المحاولة
              </button>
              <Link
                href="/my-account"
                className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                العودة للحساب
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // الإعلان غير موجود
  if (!adStats) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="text-center">
            <ChartBarIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">لم يتم العثور على الإعلان</h3>
            <p className="mb-6 text-gray-500">الإعلان المطلوب غير موجود أو تم حذفه</p>
            <Link
              href="/my-account"
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              العودة للحساب
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>إحصائيات الإعلان - {adStats.title}</title>
        <meta name="description" content={`إحصائيات مفصلة للإعلان: ${adStats.title}`} />
      </Head>

      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <Link href="/my-account/active-ads" className="text-gray-500 hover:text-gray-700">
                <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-900">إحصائيات الإعلان</h1>
            </div>
          </div>

          {/* Ad Info */}
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-start gap-4">
              <img
                src={adStats.image}
                alt={adStats.title}
                className="h-24 w-24 rounded-lg object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (target.src !== '/images/cars/default-car.svg') {
                    target.src = '/images/cars/default-car.svg';
                  }
                }}
              />
              <div className="flex-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="mb-2 text-xl font-semibold text-gray-900">{adStats.title}</h2>
                    <div className="mb-2 flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{adStats.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{formatDate(adStats.createdAt)}</span>
                      </div>
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${getStatusColor(adStats.status)}`}
                      >
                        {getStatusText(adStats.status)}
                      </span>
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatPrice(adStats.price)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/${adStats.type === 'auction' ? 'auction' : 'marketplace'}/${adStats.id}`}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
                    >
                      عرض الإعلان
                    </Link>
                    <Link
                      href={`/sell-car/edit/${adStats.id}`}
                      className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      تعديل
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Stats */}
          <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي المشاهدات</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(adStats.totalViews)}
                  </p>
                  <div
                    className={`flex items-center gap-1 text-sm ${getGrowthColor(adStats.viewsGrowth)}`}
                  >
                    {getGrowthIcon(adStats.viewsGrowth)}
                    {adStats.viewsGrowth > 0 ? '+' : ''}
                    {adStats.viewsGrowth.toFixed(1)}%
                  </div>
                </div>
                <EyeIcon className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المفضلة</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(adStats.favorites)}
                  </p>
                  <p className="text-sm text-gray-500">إضافة للمفضلة</p>
                </div>
                <HeartIcon className="h-8 w-8 text-red-600" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">جهات الاتصال</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(adStats.contacts)}
                  </p>
                  <p className="text-sm text-gray-500">طلبات التواصل</p>
                </div>
                <PhoneIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">الرسائل</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatNumber(adStats.messages)}
                  </p>
                  <p className="text-sm text-gray-500">رسائل مباشرة</p>
                </div>
                <ChatBubbleLeftIcon className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">المشاهدات حسب الوقت</h3>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2 focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">آخر 7 أيام</option>
                <option value="30">آخر 30 يوم</option>
                <option value="90">آخر 3 أشهر</option>
              </select>
            </div>

            {/* Daily Views Chart */}
            <div className="mt-6">
              <div className="grid grid-cols-7 gap-2">
                {adStats.dailyViews.map((day, index) => (
                  <div key={index} className="text-center">
                    <div className="mb-2 text-xs text-gray-500">
                      {new Date(day.date).toLocaleDateString('ar-LY', {
                        weekday: 'short',
                      })}
                    </div>
                    <div className="rounded-lg bg-blue-100 p-3 transition-colors hover:bg-blue-200">
                      <div className="text-lg font-bold text-blue-600">{day.views}</div>
                      <div className="text-xs text-blue-700">مشاهدة</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Device & Source Analytics */}
          <div className="mb-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Device Breakdown */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">توزيع الأجهزة</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DevicePhoneMobileIcon className="h-6 w-6 text-blue-600" />
                    <span className="font-medium">الهاتف المحمول</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {((adStats.deviceStats.mobile / adStats.totalViews) * 100).toFixed(1)}%
                    </span>
                    <span className="font-bold">{formatNumber(adStats.deviceStats.mobile)}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{
                      width: `${(adStats.deviceStats.mobile / adStats.totalViews) * 100}%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ComputerDesktopIcon className="h-6 w-6 text-green-600" />
                    <span className="font-medium">سطح المكتب</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {((adStats.deviceStats.desktop / adStats.totalViews) * 100).toFixed(1)}%
                    </span>
                    <span className="font-bold">{formatNumber(adStats.deviceStats.desktop)}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{
                      width: `${(adStats.deviceStats.desktop / adStats.totalViews) * 100}%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-6 w-6 text-purple-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                    <span className="font-medium">الجهاز اللوحي</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {((adStats.deviceStats.tablet / adStats.totalViews) * 100).toFixed(1)}%
                    </span>
                    <span className="font-bold">{formatNumber(adStats.deviceStats.tablet)}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-purple-600"
                    style={{
                      width: `${(adStats.deviceStats.tablet / adStats.totalViews) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Source Breakdown */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h3 className="mb-6 text-lg font-semibold text-gray-900">مصادر الزيارات</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GlobeAltIcon className="h-6 w-6 text-blue-600" />
                    <span className="font-medium">مباشر</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {((adStats.sourceStats.direct / adStats.totalViews) * 100).toFixed(1)}%
                    </span>
                    <span className="font-bold">{formatNumber(adStats.sourceStats.direct)}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{
                      width: `${(adStats.sourceStats.direct / adStats.totalViews) * 100}%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <MagnifyingGlassIcon className="h-6 w-6 text-green-600" />
                    <span className="font-medium">محركات البحث</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {((adStats.sourceStats.search / adStats.totalViews) * 100).toFixed(1)}%
                    </span>
                    <span className="font-bold">{formatNumber(adStats.sourceStats.search)}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{
                      width: `${(adStats.sourceStats.search / adStats.totalViews) * 100}%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ShareIcon className="h-6 w-6 text-purple-600" />
                    <span className="font-medium">وسائل التواصل</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {((adStats.sourceStats.social / adStats.totalViews) * 100).toFixed(1)}%
                    </span>
                    <span className="font-bold">{formatNumber(adStats.sourceStats.social)}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-purple-600"
                    style={{
                      width: `${(adStats.sourceStats.social / adStats.totalViews) * 100}%`,
                    }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-6 w-6 text-yellow-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                      />
                    </svg>
                    <span className="font-medium">مواقع أخرى</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">
                      {((adStats.sourceStats.referral / adStats.totalViews) * 100).toFixed(1)}%
                    </span>
                    <span className="font-bold">{formatNumber(adStats.sourceStats.referral)}</span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-yellow-600"
                    style={{
                      width: `${(adStats.sourceStats.referral / adStats.totalViews) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Geographic Distribution */}
          <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-lg font-semibold text-gray-900">التوزيع الجغرافي للمشاهدات</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {adStats.locationStats.map((location, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg bg-gray-50 p-4"
                >
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="h-5 w-5 text-blue-600" />
                    <span className="font-medium">{location.city}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{formatNumber(location.views)}</div>
                    <div className="text-sm text-gray-500">{location.percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Tips */}
          <div className="rounded-lg border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <h3 className="mb-4 text-lg font-semibold text-blue-900">نصائح لتحسين الأداء</h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3">
                <div className="mt-2 h-2 w-2 rounded-full bg-blue-600"></div>
                <div>
                  <h4 className="font-medium text-blue-900">تحسين العنوان</h4>
                  <p className="text-sm text-blue-700">استخدم كلمات مفتاحية واضحة ومحددة</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-2 h-2 w-2 rounded-full bg-blue-600"></div>
                <div>
                  <h4 className="font-medium text-blue-900">إضافة صور عالية الجودة</h4>
                  <p className="text-sm text-blue-700">الصور الواضحة تزيد من معدل التفاعل</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-2 h-2 w-2 rounded-full bg-blue-600"></div>
                <div>
                  <h4 className="font-medium text-blue-900">تحديث السعر</h4>
                  <p className="text-sm text-blue-700">راجع الأسعار المنافسة بانتظام</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-2 h-2 w-2 rounded-full bg-blue-600"></div>
                <div>
                  <h4 className="font-medium text-blue-900">الرد السريع</h4>
                  <p className="text-sm text-blue-700">الرد السريع على الاستفسارات يزيد الثقة</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdStatsPage;
