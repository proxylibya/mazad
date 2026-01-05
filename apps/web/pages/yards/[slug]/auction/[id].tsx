/**
 * صفحة تفاصيل مزاد الساحة - تصميم مطابق لصفحة المزاد الرئيسية
 * Yard Auction Details Page - Matching main auction page design
 * تعرض تفاصيل المزاد مع معلومات الساحة - بدون نظام مزايدة أونلاين
 */

import CarFeaturesDisplay from '@/components/CarFeaturesDisplay';
import EnhancedImageGallery from '@/components/EnhancedImageGallery';
import { OpensooqNavbar } from '@/components/common';
import ReviewsAndRatings from '@/components/common/ReviewsAndRatings';
import { SimpleCircularAuctionTimer } from '@/components/features/auctions';
import SimpleSpinner from '@/components/ui/SimpleSpinner';
import { useFavorites } from '@/hooks/useFavorites';
import { useGlobalSecondTick } from '@/hooks/useGlobalSecondTick';
import { translateToArabic } from '@/utils/formatters';
import {
  BuildingOfficeIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ChevronLeftIcon,
  ClockIcon,
  EyeIcon,
  HandRaisedIcon,
  HeartIcon,
  InformationCircleIcon,
  MapPinIcon,
  PhoneIcon,
  ShareIcon,
  SparklesIcon,
  TruckIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon } from '@heroicons/react/24/solid';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

// ============================================
// دالة ترجمة أيام الأسبوع من الإنجليزية للعربية
// ============================================
const DAY_TRANSLATIONS: Record<string, string> = {
  SAT: 'السبت',
  SUN: 'الأحد',
  MON: 'الإثنين',
  TUE: 'الثلاثاء',
  WED: 'الأربعاء',
  THU: 'الخميس',
  FRI: 'الجمعة',
  SATURDAY: 'السبت',
  SUNDAY: 'الأحد',
  MONDAY: 'الإثنين',
  TUESDAY: 'الثلاثاء',
  WEDNESDAY: 'الأربعاء',
  THURSDAY: 'الخميس',
  FRIDAY: 'الجمعة',
};

/**
 * تحويل نص الأيام المتصل إلى قائمة مفصولة بالعربية
 * مثال: "SATSUNMONTUEWEDTHUFRI" => "السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس، الجمعة"
 */
const formatAuctionDays = (daysString: string | string[] | null | undefined): string => {
  if (!daysString) return 'غير محدد';

  // إذا كانت مصفوفة، نحولها إلى نص
  if (Array.isArray(daysString)) {
    const arabicDays = daysString.map((day) => {
      const upperDay = typeof day === 'string' ? day.toUpperCase() : String(day);
      return DAY_TRANSLATIONS[upperDay] || day;
    });
    return arabicDays.join('، ');
  }

  // التأكد من أن القيمة نص
  if (typeof daysString !== 'string') {
    return 'غير محدد';
  }

  // إذا كان النص يحتوي على فواصل مسبقاً
  if (daysString.includes(',') || daysString.includes('،')) {
    const parts = daysString.split(/[,،]/g).map((d) => d.trim());
    const arabicDays = parts.map((day) => DAY_TRANSLATIONS[day.toUpperCase()] || day);
    return arabicDays.join('، ');
  }

  // استخراج الأيام من النص المتصل (مثل SATSUNMON...)
  const dayPatterns = [
    'SATURDAY',
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SAT',
    'SUN',
    'MON',
    'TUE',
    'WED',
    'THU',
    'FRI',
  ];
  const foundDays: string[] = [];
  let remaining = daysString.toUpperCase();

  // ترتيب الأيام من الأطول للأقصر لتجنب التطابق الجزئي
  const sortedPatterns = dayPatterns.sort((a, b) => b.length - a.length);

  while (remaining.length > 0) {
    let matched = false;
    for (const pattern of sortedPatterns) {
      if (remaining.startsWith(pattern)) {
        const arabicDay = DAY_TRANSLATIONS[pattern];
        if (arabicDay && !foundDays.includes(arabicDay)) {
          foundDays.push(arabicDay);
        }
        remaining = remaining.slice(pattern.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // تخطي حرف واحد إذا لم يتطابق شيء
      remaining = remaining.slice(1);
    }
  }

  if (foundDays.length === 0) {
    return daysString; // إرجاع النص الأصلي إذا لم يتم العثور على أيام
  }

  // ترتيب الأيام بالترتيب الصحيح للأسبوع
  const dayOrder = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
  const sortedDays = foundDays.sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

  return sortedDays.join('، ');
};

// Dynamic imports
const ShareModal = dynamic(() => import('@/components/ShareModal'), {
  ssr: false,
  loading: () => <div className="h-48 animate-pulse rounded-lg bg-gray-200" />,
});

const SafetyTips = dynamic(() => import('@/components/SafetyTips'), {
  ssr: false,
  loading: () => <div className="h-32 animate-pulse rounded-lg bg-gray-200" />,
});

// أنواع البيانات
interface Car {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  mileage?: number;
  condition?: string;
  fuelType?: string;
  transmission?: string;
  color?: string;
  interiorColor?: string;
  bodyType?: string;
  engineSize?: string;
  chassisNumber?: string;
  engineNumber?: string;
  manufacturingCountry?: string;
  customsStatus?: string;
  licenseStatus?: string;
  seatCount?: number;
  regionalSpecs?: string;
  features?: {
    general?: string[];
    interior?: string[];
    exterior?: string[];
    safety?: string[];
    technology?: string[];
  };
  description?: string;
  images: string[];
  locationAddress?: string;
}

interface Yard {
  id: string;
  slug: string;
  name: string;
  city: string;
  area?: string;
  address?: string;
  phone?: string;
  phones?: string;
  email?: string;
  auctionDays?: string;
  auctionTimeFrom?: string;
  auctionTimeTo?: string;
  workingHours?: string;
  latitude?: number;
  longitude?: number;
  image?: string;
  services?: string;
  verified?: boolean;
  rating?: number;
  reviewsCount?: number;
}

interface Auction {
  id: string;
  title: string;
  description?: string;
  startPrice: number;
  currentPrice: number;
  minimumBid: number;
  startDate: string;
  endDate: string;
  status: string;
  displayStatus: 'live' | 'upcoming' | 'sold' | 'ended';
  featured: boolean;
  views: number;
  totalBids: number;
  location?: string;
  isYardAuction: boolean;
  reservePrice?: number;
  buyerName?: string;
  finalBid?: number;
}

interface Seller {
  id: string;
  name: string;
  phone?: string;
  verified?: boolean;
}

interface RecentBid {
  id: string;
  amount: number;
  bidderName: string;
  time: string;
}

interface PageData {
  auction: Auction;
  car: Car | null;
  yard: Yard;
  seller: Seller;
  recentBids: RecentBid[];
}

// ألوان الحالات
const statusColors = {
  live: { bg: 'bg-green-500', text: 'text-green-500', label: 'مزاد مباشر' },
  upcoming: { bg: 'bg-blue-500', text: 'text-blue-500', label: 'قادم' },
  sold: { bg: 'bg-purple-500', text: 'text-purple-500', label: 'تم البيع' },
  ended: { bg: 'bg-gray-500', text: 'text-gray-500', label: 'منتهي' },
};

// تنسيق السعر
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('ar-LY', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
};

// تنسيق التاريخ
const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('ar-LY', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// تنسيق الوقت المتبقي
const getTimeRemaining = (endDate: string): string => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) return 'انتهى';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} يوم ${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة ${minutes} دقيقة`;
  return `${minutes} دقيقة`;
};

export default function YardAuctionPage() {
  const router = useRouter();
  const { slug, id } = router.query;
  const globalTick = useGlobalSecondTick(true);

  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'specs' | 'features'>('details');

  const { isFavorite, toggleFavorite } = useFavorites();
  const isFav = data?.auction?.id ? isFavorite(undefined, data.auction.id) : false;

  // حالة المزاد الحالية
  const currentAuctionStatus = useMemo(() => {
    if (!data?.auction) return 'upcoming';
    return data.auction.displayStatus;
  }, [data?.auction]);

  // جلب البيانات
  useEffect(() => {
    if (!slug || !id) return;

    const fetchData = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await fetch(`/api/yards/${slug}/auction/${id}`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || 'حدث خطأ في جلب البيانات');
        }
      } catch (err) {
        console.error('Error fetching yard auction:', err);
        setError('خطأ في الاتصال بالخادم');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug, id]);

  // مشاركة
  const handleShare = async () => {
    setShowShareModal(true);
  };

  // نسخ الرابط
  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  // تنسيق رقم الهاتف الليبي للصيغة الدولية
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // إزالة المسافات والرموز
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    // إذا بدأ بصفر، نزيله ونضيف +218
    if (cleaned.startsWith('0')) {
      cleaned = '+218' + cleaned.substring(1);
    }
    // إذا لم يبدأ بـ +، نضيف +218
    if (!cleaned.startsWith('+')) {
      cleaned = '+218' + cleaned;
    }
    return cleaned;
  };

  // نسخ رقم الهاتف
  const handleCopyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      // fallback للمتصفحات القديمة
      const textArea = document.createElement('textarea');
      textArea.value = phone;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  // التعامل مع المفضلة
  const handleFavorite = async () => {
    if (data?.auction?.id) {
      await toggleFavorite(undefined, data.auction.id);
    }
  };

  // حالة التحميل
  if (loading) {
    return (
      <>
        <Head>
          <title>جاري التحميل... | سوق المزاد</title>
        </Head>
        <OpensooqNavbar />
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <SimpleSpinner />
        </div>
      </>
    );
  }

  // حالة الخطأ
  if (error || !data) {
    return (
      <>
        <Head>
          <title>خطأ | سوق المزاد</title>
        </Head>
        <OpensooqNavbar />
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4">
          <div className="text-center">
            <h1 className="mb-4 text-2xl font-bold text-gray-800">{error || 'المزاد غير موجود'}</h1>
            <Link href={`/yards/${slug}`} className="text-blue-600 hover:underline">
              العودة للساحة
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { auction, car, yard, seller, recentBids } = data;
  const statusStyle = statusColors[auction.displayStatus];
  const images = car?.images?.length ? car.images : ['/placeholder.svg'];

  return (
    <>
      <Head>
        <title>
          {auction.title} | {yard.name} | سوق المزاد
        </title>
        <meta name="description" content={`مزاد ${auction.title} في ${yard.name} - ${yard.city}`} />
      </Head>

      <OpensooqNavbar />

      <main className="min-h-screen bg-gray-50 pb-24">
        {/* شريط التنقل */}
        <div className="border-b border-gray-200 bg-white">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <Link href="/yards" className="text-gray-500 hover:text-blue-600">
                الساحات
              </Link>
              <ChevronLeftIcon className="h-4 w-4 text-gray-400" />
              <Link href={`/yards/${yard.slug}`} className="text-gray-500 hover:text-blue-600">
                {yard.name}
              </Link>
              <ChevronLeftIcon className="h-4 w-4 text-gray-400" />
              <span className="text-gray-800">{auction.title}</span>
            </div>
          </div>
        </div>

        {/* شارة مزاد على أرض الواقع */}
        <div className="border-b border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white">
                <BuildingOfficeIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-orange-800">🏢 مزاد على أرض الواقع</p>
                <p className="text-sm text-orange-600">
                  المزايدة تتم في الساحة مباشرة - اتصل للمشاركة
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* العمود الأيسر - الصور والتفاصيل */}
            <div className="space-y-6 lg:col-span-2">
              {/* ===== بطاقة عداد المزاد - تظهر أولاً في الجوال (قبل الصور) ===== */}
              <div className="relative block rounded-lg border border-gray-200 bg-white shadow-sm lg:hidden">
                {/* شارة إعلان مميز */}
                {auction.featured && (
                  <div className="absolute left-3 top-3 z-10">
                    <div className="inline-flex items-center justify-center gap-1 rounded-lg border-2 border-yellow-300 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 px-2 py-1 font-bold text-white shadow-xl">
                      <svg className="h-3 w-3 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
                      </svg>
                      <span className="text-xs font-bold drop-shadow">إعلان مميز</span>
                    </div>
                  </div>
                )}

                <div className="px-4 py-6">
                  {/* العداد الدائري */}
                  <div className="mb-3 flex min-h-[240px] items-center justify-center">
                    <SimpleCircularAuctionTimer
                      endTime={auction.endDate}
                      startTime={auction.startDate}
                      currentBid={String(auction.currentPrice)}
                      bidCount={auction.totalBids}
                      startingBid={String(auction.startPrice)}
                      auctionStatus={currentAuctionStatus}
                      externalTick={globalTick}
                    />
                  </div>

                  {/* معلومات الأسعار */}
                  <div className="rounded-xl border border-gray-200 bg-white p-2">
                    <div className="mb-2 grid grid-cols-2 gap-1 text-center">
                      <div className="rounded-lg bg-gray-50 p-1.5">
                        <div className="text-xs text-gray-500">الحد الأدنى للزيادة</div>
                        <div className="text-sm font-semibold text-gray-800">
                          {formatPrice(auction.minimumBid || 500)} د.ل
                        </div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-1.5">
                        <div className="text-xs text-gray-500">السعر الابتدائي</div>
                        <div className="text-sm font-semibold text-gray-800">
                          {formatPrice(auction.startPrice)} د.ل
                        </div>
                      </div>
                    </div>

                    {/* تنبيه مزاد على أرض الواقع */}
                    <div className="mb-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="h-5 w-5 flex-shrink-0 text-orange-500" />
                        <div>
                          <p className="text-sm font-semibold text-orange-800">
                            مزاد على أرض الواقع
                          </p>
                          <p className="text-xs text-orange-600">
                            للمشاركة، احضر للساحة أو اتصل بهم
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* زر الاتصال للمزايدة */}
                    {yard.phone && (
                      <button
                        onClick={() => setShowCallModal(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                      >
                        <PhoneIcon className="h-4 w-4" />
                        اتصل للمزايدة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* معرض الصور */}
              <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                <EnhancedImageGallery
                  images={images.map((url: string) => ({ url, alt: auction.title }))}
                  title={auction.title}
                  itemId={String(id || auction.id || '')}
                  itemType="auction"
                  onRequireLogin={() => router.push('/login')}
                  featured={auction.featured}
                />
              </div>

              {/* ===== باقي قسم الجوال - يظهر فقط عند عرض ≤1023px ===== */}
              <div className="block space-y-4 lg:hidden">
                {/* قائمة آخر المزايدات - نسخة الجوال */}
                {recentBids.length > 0 && (
                  <div className="relative">
                    <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
                      <div className="flex-shrink-0 border-b border-gray-200 p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                            <HandRaisedIcon className="h-6 w-6 text-blue-600" />
                            قائمة المزايدين
                          </h3>
                          <div className="text-sm text-gray-500">{auction.totalBids} مزايد</div>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4">
                        <div className="space-y-2">
                          {recentBids.slice(0, 5).map((bid, index) => (
                            <div
                              key={bid.id}
                              className={`flex items-center justify-between rounded-lg p-3 ${
                                index === 0 ? 'border border-green-200 bg-green-50' : 'bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                    index === 0
                                      ? 'bg-green-500 text-white'
                                      : 'bg-gray-300 text-gray-600'
                                  }`}
                                >
                                  {index + 1}
                                </div>
                                <span className="font-medium text-gray-800">{bid.bidderName}</span>
                              </div>
                              <div className="text-left">
                                <p
                                  className={`font-bold ${index === 0 ? 'text-green-600' : 'text-gray-700'}`}
                                >
                                  {formatPrice(bid.amount)} د.ل
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(bid.time).toLocaleTimeString('ar-LY')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* بطاقة معلومات الساحة - نسخة الجوال */}
                <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      <BuildingOfficeIcon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="flex items-center gap-2 font-bold text-gray-900">
                        {yard.name}
                        {yard.verified && <CheckBadgeIcon className="h-4 w-4 text-blue-500" />}
                      </h3>
                      <p className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPinIcon className="h-3 w-3" />
                        {yard.city}
                        {yard.area ? ` - ${yard.area}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* التقييم */}
                  {yard.rating && (
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <StarIcon
                            key={star}
                            className={`h-4 w-4 ${
                              star <= (yard.rating || 0)
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-gray-500">
                        ({yard.reviewsCount || 0} تقييم)
                      </span>
                    </div>
                  )}

                  {/* أوقات المزاد */}
                  <div className="mb-3 space-y-1 rounded-lg bg-gray-50 p-3">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <CalendarDaysIcon className="h-4 w-4 text-blue-500" />
                      أوقات المزاد
                    </h4>
                    {yard.auctionDays && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">الأيام:</span>{' '}
                        {formatAuctionDays(yard.auctionDays)}
                      </p>
                    )}
                    {(yard.auctionTimeFrom || yard.auctionTimeTo) && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">الوقت:</span>{' '}
                        {yard.auctionTimeFrom || '09:00'} - {yard.auctionTimeTo || '18:00'}
                      </p>
                    )}
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="space-y-2">
                    <Link
                      href={`/yards/${yard.slug}`}
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500 py-2 text-sm font-medium text-blue-500 transition hover:bg-blue-50"
                    >
                      <BuildingOfficeIcon className="h-4 w-4" />
                      عرض جميع مزادات الساحة
                    </Link>

                    {yard.latitude && yard.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${yard.latitude},${yard.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                      >
                        <MapPinIcon className="h-4 w-4" />
                        عرض الموقع على الخريطة
                      </a>
                    )}
                  </div>
                </div>
              </div>
              {/* ===== نهاية قسم الجوال ===== */}

              {/* معلومات المزاد */}
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span
                        className={`rounded-full ${statusStyle.bg} px-3 py-1 text-xs font-medium text-white`}
                      >
                        {statusStyle.label}
                      </span>
                      {auction.featured && (
                        <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-700">
                          <SparklesIcon className="h-3 w-3" />
                          مميز
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">{auction.title}</h1>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleFavorite}
                      className="rounded-full bg-gray-100 p-2 hover:bg-gray-200"
                    >
                      {isFav ? (
                        <HeartSolidIcon className="h-5 w-5 text-red-500" />
                      ) : (
                        <HeartIcon className="h-5 w-5 text-gray-500" />
                      )}
                    </button>
                    <button
                      onClick={handleShare}
                      className="rounded-full bg-gray-100 p-2 hover:bg-gray-200"
                    >
                      <ShareIcon className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                </div>

                {/* السعر والمزايدات */}
                <div className="mb-6 grid grid-cols-2 gap-4 rounded-xl bg-gray-50 p-4 md:grid-cols-4">
                  <div className="text-center">
                    <p className="text-xs text-gray-500">السعر الحالي</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatPrice(auction.currentPrice)} د.ل
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">سعر البداية</p>
                    <p className="text-lg font-medium text-gray-700">
                      {formatPrice(auction.startPrice)} د.ل
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">عدد المزايدات</p>
                    <p className="flex items-center justify-center gap-1 text-lg font-medium text-gray-700">
                      <UserGroupIcon className="h-4 w-4" />
                      {auction.totalBids}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-500">المشاهدات</p>
                    <p className="flex items-center justify-center gap-1 text-lg font-medium text-gray-700">
                      <EyeIcon className="h-4 w-4" />
                      {auction.views}
                    </p>
                  </div>
                </div>

                {/* الوقت المتبقي */}
                {auction.displayStatus !== 'ended' && auction.displayStatus !== 'sold' && (
                  <div className="mb-6 flex items-center gap-3 rounded-lg bg-blue-50 p-4">
                    <ClockIcon className="h-6 w-6 text-blue-500" />
                    <div>
                      <p className="text-sm text-blue-600">الوقت المتبقي</p>
                      <p className="text-lg font-bold text-blue-800">
                        {getTimeRemaining(auction.endDate)}
                      </p>
                    </div>
                  </div>
                )}

                {/* وصف السيارة */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <InformationCircleIcon className="h-5 w-5 text-blue-600" />
                    الوصف
                  </h3>
                  <p className="leading-relaxed text-gray-700">
                    {auction.description || car?.description || 'لا يوجد وصف متاح لهذه السيارة'}
                  </p>
                </div>

                {/* قسم المواصفات الشامل - تصميم مطابق لصفحة المزاد الرئيسية */}
                {car && (
                  <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="h-5 w-5 text-blue-600"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21m-1.5 0H12m-8.457 3.077 1.41-.513m14.095-5.13 1.41-.513M5.106 17.785l1.15-.964m11.49-9.642 1.149-.964M7.501 19.795l.75-1.3m7.5-12.99.75-1.3m-6.063 16.658.26-1.477m2.605-14.772.26-1.477m0 17.726-.26-1.477M10.698 4.614l-.26-1.477M16.5 19.794l-.75-1.299M7.5 4.205 12 12m6.894 5.785-1.149-.964M6.256 7.178l-1.15-.964m15.352 8.864-1.41-.513M4.954 9.435l-1.41-.514M12.002 12l-3.75 6.495"
                        ></path>
                      </svg>
                      المواصفات
                    </h3>

                    <div className="car-specifications-grid">
                      {/* الماركة */}
                      <div className="car-spec-card spec-basic">
                        <div className="car-spec-label">
                          <TruckIcon className="car-spec-icon" />
                          <span>الماركة</span>
                        </div>
                        <div className="car-spec-value">{car.brand || 'غير محدد'}</div>
                      </div>

                      {/* الموديل */}
                      <div className="car-spec-card spec-basic">
                        <div className="car-spec-label">
                          <TruckIcon className="car-spec-icon" />
                          <span>الموديل</span>
                        </div>
                        <div className="car-spec-value">{car.model || 'غير محدد'}</div>
                      </div>

                      {/* سنة الصنع */}
                      <div className="car-spec-card spec-basic">
                        <div className="car-spec-label">
                          <CalendarDaysIcon className="car-spec-icon" />
                          <span>سنة الصنع</span>
                        </div>
                        <div className="car-spec-value">{car.year || 'غير محدد'}</div>
                      </div>

                      {/* حالة السيارة */}
                      <div className="car-spec-card spec-basic">
                        <div className="car-spec-label">
                          <SparklesIcon className="car-spec-icon" />
                          <span>حالة السيارة</span>
                        </div>
                        <div className="car-spec-value">
                          {translateToArabic(car.condition || 'غير محدد')}
                        </div>
                      </div>

                      {/* المسافة المقطوعة */}
                      <div className="car-spec-card spec-basic">
                        <div className="car-spec-label">
                          <ClockIcon className="car-spec-icon" />
                          <span>المسافة المقطوعة</span>
                        </div>
                        <div className="car-spec-value">
                          {car.mileage ? `${formatPrice(car.mileage)} كم` : 'غير محدد'}
                        </div>
                      </div>

                      {/* نوع الوقود */}
                      <div className="car-spec-card spec-general">
                        <div className="car-spec-label">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="car-spec-icon"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
                            />
                          </svg>
                          <span>نوع الوقود</span>
                        </div>
                        <div className="car-spec-value">
                          {translateToArabic(car.fuelType || 'غير محدد')}
                        </div>
                      </div>

                      {/* ناقل الحركة */}
                      <div className="car-spec-card spec-general">
                        <div className="car-spec-label">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="car-spec-icon"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M4.5 12a7.5 7.5 0 0 0 15 0m-15 0a7.5 7.5 0 1 1 15 0m-15 0H3m16.5 0H21"
                            />
                          </svg>
                          <span>ناقل الحركة</span>
                        </div>
                        <div className="car-spec-value">
                          {translateToArabic(car.transmission || 'غير محدد')}
                        </div>
                      </div>

                      {/* نوع الهيكل */}
                      {car.bodyType && (
                        <div className="car-spec-card spec-general">
                          <div className="car-spec-label">
                            <TruckIcon className="car-spec-icon" />
                            <span>نوع الهيكل</span>
                          </div>
                          <div className="car-spec-value">{translateToArabic(car.bodyType)}</div>
                        </div>
                      )}

                      {/* اللون الخارجي */}
                      <div className="car-spec-card spec-general">
                        <div className="car-spec-label">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="car-spec-icon"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42"
                            />
                          </svg>
                          <span>اللون الخارجي</span>
                        </div>
                        <div className="car-spec-value">
                          {translateToArabic(car.color || 'غير محدد')}
                        </div>
                      </div>

                      {/* اللون الداخلي */}
                      {car.interiorColor && (
                        <div className="car-spec-card spec-general">
                          <div className="car-spec-label">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="car-spec-icon"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819"
                              />
                            </svg>
                            <span>اللون الداخلي</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic(car.interiorColor)}
                          </div>
                        </div>
                      )}

                      {/* عدد المقاعد */}
                      {car.seatCount !== undefined && car.seatCount !== null && (
                        <div className="car-spec-card spec-general">
                          <div className="car-spec-label">
                            <UserGroupIcon className="car-spec-icon" />
                            <span>عدد المقاعد</span>
                          </div>
                          <div className="car-spec-value">{car.seatCount} مقعد</div>
                        </div>
                      )}

                      {/* المواصفات الإقليمية */}
                      {car.regionalSpecs && (
                        <div className="car-spec-card spec-general">
                          <div className="car-spec-label">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="car-spec-icon"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582"
                              />
                            </svg>
                            <span>المواصفات الإقليمية</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic(car.regionalSpecs)}
                          </div>
                        </div>
                      )}

                      {/* المعلومات التقنية */}
                      {car.chassisNumber && (
                        <div className="car-spec-card spec-technical">
                          <div className="car-spec-label">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="car-spec-icon"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5Z"
                              />
                            </svg>
                            <span>رقم الشاصي</span>
                          </div>
                          <div className="car-spec-value">{car.chassisNumber}</div>
                        </div>
                      )}

                      {car.engineNumber && (
                        <div className="car-spec-card spec-technical">
                          <div className="car-spec-label">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="car-spec-icon"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M21.75 6.75a4.5 4.5 0 0 1-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 1 1-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 0 1 6.336-4.486l-3.276 3.276a3.004 3.004 0 0 0 2.25 2.25l3.276-3.276c.256.565.365 1.19.398 1.836Z"
                              />
                            </svg>
                            <span>رقم المحرك</span>
                          </div>
                          <div className="car-spec-value">{car.engineNumber}</div>
                        </div>
                      )}

                      {car.engineSize && (
                        <div className="car-spec-card spec-technical">
                          <div className="car-spec-label">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="car-spec-icon"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047"
                              />
                            </svg>
                            <span>سعة المحرك</span>
                          </div>
                          <div className="car-spec-value">{car.engineSize} لتر</div>
                        </div>
                      )}

                      {car.manufacturingCountry && (
                        <div className="car-spec-card spec-technical">
                          <div className="car-spec-label">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="car-spec-icon"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5"
                              />
                            </svg>
                            <span>بلد التصنيع</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic(car.manufacturingCountry)}
                          </div>
                        </div>
                      )}

                      {car.customsStatus && (
                        <div className="car-spec-card spec-technical">
                          <div className="car-spec-label">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="car-spec-icon"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21"
                              />
                            </svg>
                            <span>حالة الجمارك</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic(car.customsStatus)}
                          </div>
                        </div>
                      )}

                      {car.licenseStatus && (
                        <div className="car-spec-card spec-technical">
                          <div className="car-spec-label">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="car-spec-icon"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12"
                              />
                            </svg>
                            <span>حالة الرخصة</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic(car.licenseStatus)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* قسم المميزات والكماليات */}
                {car?.features && (
                  <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <SparklesIcon className="h-5 w-5 text-purple-600" />
                      المميزات والكماليات
                    </h3>

                    {(() => {
                      const hasGeneralFeatures =
                        car.features?.general && car.features.general.length > 0;
                      const hasInteriorFeatures =
                        car.features?.interior && car.features.interior.length > 0;
                      const hasExteriorFeatures =
                        car.features?.exterior && car.features.exterior.length > 0;
                      const hasSafetyFeatures =
                        car.features?.safety && car.features.safety.length > 0;
                      const hasTechnologyFeatures =
                        car.features?.technology && car.features.technology.length > 0;

                      const hasAnyFeatures =
                        hasGeneralFeatures ||
                        hasInteriorFeatures ||
                        hasExteriorFeatures ||
                        hasSafetyFeatures ||
                        hasTechnologyFeatures;

                      if (!hasAnyFeatures) {
                        return (
                          <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-6">
                            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                              <SparklesIcon className="h-6 w-6 text-gray-400" />
                            </div>
                            <div className="flex-1">
                              <div className="mb-1 font-medium text-gray-900">
                                لا توجد مميزات محددة
                              </div>
                              <div className="text-sm text-gray-500">
                                يمكنك التواصل مع الساحة للاستفسار عن المميزات المتاحة في هذه السيارة
                              </div>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {hasGeneralFeatures && (
                            <CarFeaturesDisplay
                              features={car.features.general}
                              title="المميزات العامة"
                              iconColor="text-blue-500"
                            />
                          )}

                          {hasInteriorFeatures && (
                            <CarFeaturesDisplay
                              features={car.features.interior}
                              title="المميزات الداخلية"
                              iconColor="text-green-500"
                            />
                          )}

                          {hasExteriorFeatures && (
                            <CarFeaturesDisplay
                              features={car.features.exterior}
                              title="المميزات الخارجية"
                              iconColor="text-purple-500"
                            />
                          )}

                          {hasSafetyFeatures && (
                            <CarFeaturesDisplay
                              features={car.features.safety}
                              title="مميزات الأمان"
                              iconColor="text-red-500"
                            />
                          )}

                          {hasTechnologyFeatures && (
                            <CarFeaturesDisplay
                              features={car.features.technology}
                              title="التقنيات المتقدمة"
                              iconColor="text-orange-500"
                            />
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* قسم موقع السيارة */}
                {car?.locationAddress && (
                  <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                    <div className="border-b border-gray-100 p-4">
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-5 w-5 text-red-500" />
                        <h3 className="font-semibold text-gray-900">موقع السيارة</h3>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                          <MapPinIcon className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 font-medium text-gray-900">
                            {car.locationAddress}
                          </div>
                          <div className="text-sm text-gray-500">
                            السيارة موجودة في {yard.name} - {yard.city}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(car.locationAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                        >
                          <MapPinIcon className="h-4 w-4" />
                          فتح في خرائط جوجل
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* قسم التقييمات */}
                <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-6 flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <StarIcon className="h-6 w-6 text-yellow-500" />
                    التقييمات
                  </h3>

                  <ReviewsAndRatings
                    itemId={String(id)}
                    itemType="auction"
                    itemTitle={auction?.title || car?.title || 'مزاد سيارة'}
                    targetUserId={seller?.id}
                    canQuickReview={true}
                    showQuickRating={true}
                    showRatingStats={true}
                  />
                </div>

                {/* نصائح الأمان */}
                <SafetyTips />
              </div>

              {/* آخر المزايدات */}
              {recentBids.length > 0 && (
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-bold text-gray-800">آخر المزايدات</h3>
                  <div className="space-y-3">
                    {recentBids.map((bid, index) => (
                      <div
                        key={bid.id}
                        className={`flex items-center justify-between rounded-lg p-3 ${
                          index === 0 ? 'bg-green-50' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${
                              index === 0 ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'
                            }`}
                          >
                            {index + 1}
                          </div>
                          <span className="font-medium">{bid.bidderName}</span>
                        </div>
                        <div className="text-left">
                          <p
                            className={`font-bold ${index === 0 ? 'text-green-600' : 'text-gray-700'}`}
                          >
                            {formatPrice(bid.amount)} د.ل
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(bid.time).toLocaleTimeString('ar-LY')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* العمود الأيمن - القسم الجانبي المحسن - يظهر من 1024px وما فوق */}
            <div className="desktop-auction-sidebar hidden space-y-4 lg:block">
              {/* بطاقة عداد المزاد والأسعار */}
              <div className="relative rounded-lg border border-gray-200 bg-white shadow-sm">
                {/* شارة إعلان مميز */}
                {auction.featured && (
                  <div className="absolute left-3 top-3 z-10">
                    <div className="inline-flex items-center justify-center gap-1 rounded-lg border-2 border-yellow-300 bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-400 px-2 py-1 font-bold text-white shadow-xl">
                      <svg className="h-3 w-3 drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"></path>
                      </svg>
                      <span className="text-xs font-bold drop-shadow">إعلان مميز</span>
                    </div>
                  </div>
                )}

                <div className="px-4 py-6">
                  {/* العداد الدائري */}
                  <div className="mb-3 flex min-h-[240px] items-center justify-center">
                    <SimpleCircularAuctionTimer
                      endTime={auction.endDate}
                      startTime={auction.startDate}
                      currentBid={String(auction.currentPrice)}
                      bidCount={auction.totalBids}
                      startingBid={String(auction.startPrice)}
                      auctionStatus={currentAuctionStatus}
                      externalTick={globalTick}
                    />
                  </div>

                  {/* معلومات الأسعار */}
                  <div className="rounded-xl border border-gray-200 bg-white p-2">
                    <div className="mb-2 grid grid-cols-2 gap-1 text-center">
                      <div className="rounded-lg bg-gray-50 p-1.5">
                        <div className="text-xs text-gray-500">الحد الأدنى للزيادة</div>
                        <div className="text-sm font-semibold text-gray-800">
                          {formatPrice(auction.minimumBid || 500)} د.ل
                        </div>
                      </div>
                      <div className="rounded-lg bg-gray-50 p-1.5">
                        <div className="text-xs text-gray-500">السعر الابتدائي</div>
                        <div className="text-sm font-semibold text-gray-800">
                          {formatPrice(auction.startPrice)} د.ل
                        </div>
                      </div>
                    </div>

                    {/* تنبيه مزاد على أرض الواقع */}
                    <div className="mb-2 rounded-lg border border-orange-200 bg-orange-50 p-3">
                      <div className="flex items-center gap-2">
                        <BuildingOfficeIcon className="h-5 w-5 flex-shrink-0 text-orange-500" />
                        <div>
                          <p className="text-sm font-semibold text-orange-800">
                            مزاد على أرض الواقع
                          </p>
                          <p className="text-xs text-orange-600">
                            للمشاركة، احضر للساحة أو اتصل بهم
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* زر الاتصال للمزايدة */}
                    {yard.phone && (
                      <button
                        onClick={() => setShowCallModal(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                      >
                        <PhoneIcon className="h-4 w-4" />
                        اتصل للمزايدة
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* قائمة آخر المزايدات */}
              <div className="relative">
                <div className="flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="flex-shrink-0 border-b border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                        <HandRaisedIcon className="h-6 w-6 text-blue-600" />
                        قائمة المزايدين
                      </h3>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-gray-500">{auction.totalBids} مزايد</div>
                      </div>
                    </div>
                  </div>

                  {recentBids.length > 0 ? (
                    <div className="flex-1 overflow-y-auto p-4">
                      <div className="space-y-2">
                        {recentBids.map((bid, index) => (
                          <div
                            key={bid.id}
                            className={`flex items-center justify-between rounded-lg p-3 ${
                              index === 0 ? 'border border-green-200 bg-green-50' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                                  index === 0
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-300 text-gray-600'
                                }`}
                              >
                                {index + 1}
                              </div>
                              <span className="font-medium text-gray-800">{bid.bidderName}</span>
                            </div>
                            <div className="text-left">
                              <p
                                className={`font-bold ${index === 0 ? 'text-green-600' : 'text-gray-700'}`}
                              >
                                {formatPrice(bid.amount)} د.ل
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(bid.time).toLocaleTimeString('ar-LY')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
                      <UserGroupIcon className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                      <p className="text-gray-500">لا توجد مزايدات حتى الآن</p>
                      <p className="mt-1 text-sm text-gray-400">احضر للساحة لتكون أول من يزايد</p>
                    </div>
                  )}
                </div>
              </div>

              {/* بطاقة معلومات الساحة */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <BuildingOfficeIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="flex items-center gap-2 font-bold text-gray-900">
                      {yard.name}
                      {yard.verified && <CheckBadgeIcon className="h-4 w-4 text-blue-500" />}
                    </h3>
                    <p className="flex items-center gap-1 text-sm text-gray-500">
                      <MapPinIcon className="h-3 w-3" />
                      {yard.city}
                      {yard.area ? ` - ${yard.area}` : ''}
                    </p>
                  </div>
                </div>

                {/* التقييم */}
                {yard.rating && (
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <StarIcon
                          key={star}
                          className={`h-4 w-4 ${
                            star <= (yard.rating || 0)
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-500">({yard.reviewsCount || 0} تقييم)</span>
                  </div>
                )}

                {/* أوقات المزاد */}
                <div className="mb-3 space-y-1 rounded-lg bg-gray-50 p-3">
                  <h4 className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <CalendarDaysIcon className="h-4 w-4 text-blue-500" />
                    أوقات المزاد
                  </h4>
                  {yard.auctionDays && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">الأيام:</span>{' '}
                      {formatAuctionDays(yard.auctionDays)}
                    </p>
                  )}
                  {(yard.auctionTimeFrom || yard.auctionTimeTo) && (
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">الوقت:</span> {yard.auctionTimeFrom || '09:00'}{' '}
                      - {yard.auctionTimeTo || '18:00'}
                    </p>
                  )}
                </div>

                {/* أزرار الإجراءات */}
                <div className="space-y-2">
                  <Link
                    href={`/yards/${yard.slug}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-blue-500 py-2 text-sm font-medium text-blue-500 transition hover:bg-blue-50"
                  >
                    <BuildingOfficeIcon className="h-4 w-4" />
                    عرض جميع مزادات الساحة
                  </Link>

                  {yard.latitude && yard.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${yard.latitude},${yard.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <MapPinIcon className="h-4 w-4" />
                      عرض الموقع على الخريطة
                    </a>
                  )}
                </div>
              </div>

              {/* معلومات عامة */}
              <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
                  <InformationCircleIcon className="h-4 w-4 text-blue-600" />
                  معلومات عامة
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                    <span className="text-xs text-gray-600">المشاهدات</span>
                    <div className="flex items-center gap-1">
                      <EyeIcon className="h-3 w-3 text-purple-500" />
                      <span className="text-sm font-semibold">{auction.views}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                    <span className="text-xs text-gray-600">رقم المزاد</span>
                    <span className="font-mono text-xs font-semibold">#{auction.id}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                    <span className="text-xs text-gray-600">تاريخ الانتهاء</span>
                    <span className="text-xs font-medium">{formatDate(auction.endDate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* نافذة المشاركة */}
        <ShareModal
          isOpen={showShareModal}
          onClose={() => setShowShareModal(false)}
          title={auction.title}
          description={`${car?.brand || ''} ${car?.model || ''} ${car?.year || ''} - السعر الحالي: ${formatPrice(auction.currentPrice)} د.ل`}
          url={typeof window !== 'undefined' ? window.location.href : ''}
          imageUrl={images[0]}
        />

        {/* نافذة الاتصال */}
        {showCallModal && yard.phone && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              {/* الرأس */}
              <div className="mb-6 text-center">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                  <PhoneIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">اتصل بالساحة</h3>
                <p className="mt-1 text-sm text-gray-500">{yard.name}</p>
              </div>

              {/* رقم الهاتف */}
              <div className="mb-6 rounded-xl bg-gray-50 p-4 text-center">
                <p className="dir-ltr text-2xl font-bold tracking-wide text-gray-900">
                  {yard.phone}
                </p>
              </div>

              {/* الأزرار */}
              <div className="space-y-3">
                {/* اتصال مباشر */}
                <a
                  href={`tel:${formatPhoneNumber(yard.phone)}`}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-3.5 text-base font-semibold text-white transition-all hover:bg-green-700 active:scale-[0.98]"
                >
                  <PhoneIcon className="h-5 w-5" />
                  اتصال مباشر
                </a>

                {/* واتساب */}
                <a
                  href={`https://wa.me/${formatPhoneNumber(yard.phone).replace('+', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3.5 text-base font-semibold text-white transition-all hover:bg-[#20bd5a] active:scale-[0.98]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                  واتساب
                </a>

                {/* نسخ الرقم */}
                <button
                  onClick={() => handleCopyPhone(yard.phone || '')}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white py-3.5 text-base font-semibold text-gray-700 transition-all hover:border-gray-300 hover:bg-gray-50 active:scale-[0.98]"
                >
                  {copiedPhone ? (
                    <>
                      <svg
                        className="h-5 w-5 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-green-600">تم النسخ!</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      نسخ الرقم
                    </>
                  )}
                </button>
              </div>

              {/* زر الإغلاق */}
              <button
                onClick={() => {
                  setShowCallModal(false);
                  setCopiedPhone(false);
                }}
                className="mt-4 w-full py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-700"
              >
                إغلاق
              </button>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
