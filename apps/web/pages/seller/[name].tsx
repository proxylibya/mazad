import BuildingStorefrontIcon from '@heroicons/react/24/outline/BuildingStorefrontIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import ChartBarIcon from '@heroicons/react/24/outline/ChartBarIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import DevicePhoneMobileIcon from '@heroicons/react/24/outline/DevicePhoneMobileIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import FlagIcon from '@heroicons/react/24/outline/FlagIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import TrophyIcon from '@heroicons/react/24/outline/TrophyIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import WalletIcon from '@heroicons/react/24/outline/WalletIcon';
import {
  CheckCircleIcon as CheckCircleSolid,
  HeartIcon as HeartSolid,
  StarIcon as StarSolid,
} from '@heroicons/react/24/solid';
import Head from 'next/head';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import UserAvatar from '../../components/UserAvatar';
import LoginModal from '../../components/auth/LoginModal';
import { OpensooqNavbar } from '../../components/common';
import Loader from '../../components/ui/Loader';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import useAuthProtection from '../../hooks/useAuthProtection';
import { useFavorites } from '../../hooks/useFavorites';
import { convertSpecificText } from '../../utils/numberConverter';

// دالة تنسيق الأرقام بالأرقام الإنجليزية فقط
const formatNumber = (num: number | string): string => {
  const numValue = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(numValue)) return '0';
  return numValue.toLocaleString('en-US');
};

// دالة تنسيق الأرقام الكبيرة مع اختصارات
const formatLargeNumber = (num: number): string => {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return formatNumber(num);
};

interface SellerReview {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  reviewer?: {
    name?: string;
    profileImage?: string;
    verified?: boolean;
  };
}

interface SellerData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  profileImage?: string;
  coverImage?: string;
  verified: boolean;
  accountType?: string;
  rating?: number;
  reviewsCount?: number;
  city?: string;
  memberSince?: string;
  joinDate?: string;
  createdAt?: string;
  description?: string;
  isOnline?: boolean;
  stats: {
    totalListings: number;
    activeListings: number;
    soldListings?: number;
    totalAuctions?: number;
    activeAuctions?: number;
    totalViews: number;
    successfulDeals?: number;
    responseRate: string;
    avgResponseTime: string;
  };
  specialties?: string[];
  walletSummary?: {
    hasWallet: boolean;
    totalBalance: number;
    primaryCurrency: string;
    activeWallets: number;
  };
  cars?: Array<{
    id: string;
    title: string;
    make: string;
    model: string;
    year: number;
    price: number;
    mileage: number;
    city: string;
    location: string;
    status: string;
    images: Array<string | { id: string; url: string; fileName: string; isPrimary: boolean }>;
    auction?: {
      id: string;
      status: string;
      currentPrice: number;
      totalBids: number;
      endTime: Date;
    } | null;
  }>;
}

type SellerCar = NonNullable<SellerData['cars']>[number];
// مكون صفحة البائع الجديدة
const ModernSellerProfile: React.FC = () => {
  const router = useRouter();
  const { name } = router.query;

  // استخدام نظام الحماية
  const { isAuthenticated, showAuthModal, requireLogin, handleAuthClose } = useAuthProtection({
    showModal: true,
  });

  const [sellerData, setSellerData] = useState<SellerData | null>(null);
  const [sellerCars, setSellerCars] = useState<SellerCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [notification, setNotification] = useState({
    show: false,
    type: '',
    message: '',
  });

  const [reviews, setReviews] = useState<SellerReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  // استخدام hook المفضلة الموحد
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [isMessageLoading, setIsMessageLoading] = useState(false);
  const [isShareLoading, setIsShareLoading] = useState(false);

  // جلب بيانات البائع
  useEffect(() => {
    const fetchSellerData = async () => {
      if (!name) return;

      try {
        setLoading(true);
        setError(null);

        // ترميز الاسم للتعامل مع الأحرف العربية والمسافات
        const encodedName = encodeURIComponent(name as string);
        const sellerResponse = await fetch(`/api/sellers/${encodedName}`);
        if (!sellerResponse.ok) {
          throw new Error('فشل في جلب بيانات البائع');
        }
        const sellerResult = await sellerResponse.json();

        if (sellerResult.success) {
          const seller = sellerResult.data;

          // تأكد من وجود البيانات الأساسية
          const processedSeller = {
            ...seller,
            rating: seller.rating || 0,
            reviewsCount: seller.reviewsCount || 0,
            stats: {
              totalListings: seller.stats?.totalListings || 0,
              activeListings: seller.stats?.activeListings || 0,
              soldListings: seller.stats?.soldListings || 0,
              totalViews: seller.stats?.totalViews || 0,
              responseRate: seller.stats?.responseRate || '0%',
              avgResponseTime: seller.stats?.avgResponseTime || 'غير متاح',
              ...seller.stats,
            },
            description: seller.description || seller.profileBio || 'لا توجد معلومات إضافية متاحة',
            joinDate:
              seller.joinDate ||
              seller.memberSince ||
              new Date(seller.createdAt).toLocaleDateString('ar-SA'),
            isOnline: seller.isOnline !== undefined ? seller.isOnline : true,
          };

          setSellerData(processedSeller);
          setSellerCars(seller.cars || []);
        } else {
          throw new Error(sellerResult.error || 'خطأ في جلب البيانات');
        }
      } catch (err) {
        console.error('خطأ في جلب بيانات البائع:', err);
        setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
      } finally {
        setLoading(false);
      }
    };

    fetchSellerData();
  }, [name]);

  useEffect(() => {
    const fetchReviews = async () => {
      if (!sellerData?.id) return;

      try {
        setReviewsLoading(true);
        setReviewsError(null);

        const response = await fetch(
          `/api/reviews?userId=${encodeURIComponent(sellerData.id)}&type=received&limit=10`,
        );
        if (!response.ok) {
          throw new Error('فشل في جلب تقييمات البائع');
        }

        const result: {
          success: boolean;
          data?: {
            reviews?: Array<{
              id: string;
              rating: number;
              comment?: string;
              createdAt: string;
              reviewer?: {
                name?: string;
                profileImage?: string;
                verified?: boolean;
              };
            }>;
          };
          error?: string;
        } = await response.json();

        if (result.success) {
          setReviews(result.data?.reviews || []);
        } else {
          throw new Error(result.error || 'خطأ في جلب التقييمات');
        }
      } catch (err) {
        console.error('خطأ في جلب تقييمات البائع:', err);
        setReviewsError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع في التقييمات');
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [sellerData?.id]);

  // معالجات الأحداث
  const handleContactClick = async () => {
    if (isContactLoading) return;

    if (!isAuthenticated) {
      requireLogin('للاتصال بالبائع');
      return;
    }

    if (!sellerData?.phone) {
      setNotification({
        show: true,
        type: 'error',
        message: 'رقم الهاتف غير متوفر',
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      return;
    }

    setIsContactLoading(true);

    try {
      // تنظيف رقم الهاتف وإضافة رمز البلد إذا لزم الأمر
      const cleanPhone = sellerData.phone.replace(/[^\d+]/g, '');
      const phoneWithCountryCode = cleanPhone.startsWith('+')
        ? cleanPhone
        : `+218${cleanPhone.replace(/^0/, '')}`;

      window.open(`tel:${phoneWithCountryCode}`, '_self');

      setNotification({
        show: true,
        type: 'success',
        message: `جاري الاتصال بـ ${sellerData.name}`,
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 2000);
    } catch (error) {
      console.error('خطأ في الاتصال:', error);
      setNotification({
        show: true,
        type: 'error',
        message: 'فشل في فتح تطبيق الهاتف',
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
    } finally {
      setTimeout(() => setIsContactLoading(false), 1000);
    }
  };

  const handleSendMessage = async () => {
    if (isMessageLoading) return;

    if (!isAuthenticated) {
      requireLogin('لإرسال رسالة للبائع');
      return;
    }

    if (!sellerData) {
      setNotification({
        show: true,
        type: 'error',
        message: 'بيانات البائع غير متوفرة',
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      return;
    }

    setIsMessageLoading(true);

    // التوجه لصفحة الرسائل مع معلومات البائع
    try {
      const messageUrl = `/messages?contact=${encodeURIComponent(sellerData.name)}&sellerId=${sellerData.id}`;

      setNotification({
        show: true,
        type: 'success',
        message: `جاري فتح محادثة مع ${sellerData.name}`,
      });

      await router.push(messageUrl);
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 2000);
    } catch (error) {
      console.error('خطأ في فتح الرسائل:', error);
      setNotification({
        show: true,
        type: 'info',
        message: 'سيتم إضافة نظام الرسائل قريباً',
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
    } finally {
      setTimeout(() => setIsMessageLoading(false), 1000);
    }
  };

  const handleShareProfile = async () => {
    if (isShareLoading) return;

    if (!sellerData) {
      setNotification({
        show: true,
        type: 'error',
        message: 'بيانات البائع غير متوفرة',
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      return;
    }

    setIsShareLoading(true);

    const shareData = {
      title: `ملف البائع ${sellerData.name} - مزاد السيارات`,
      text: `تحقق من ملف البائع ${sellerData.name} على منصة مزاد السيارات - ${sellerData.stats.activeListings} إعلان نشط`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setNotification({
          show: true,
          type: 'success',
          message: 'تم مشاركة ملف البائع بنجاح',
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 2000);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('خطأ في المشاركة:', err);
          // الانتقال لنسخ الرابط في حالة فشل المشاركة
          fallbackToClipboard();
        }
      }
    } else {
      fallbackToClipboard();
    }

    function fallbackToClipboard() {
      try {
        navigator.clipboard.writeText(window.location.href);
        setNotification({
          show: true,
          type: 'success',
          message: 'تم نسخ رابط ملف البائع إلى الحافظة',
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      } catch (clipboardErr) {
        console.error('خطأ في نسخ الرابط:', clipboardErr);
        setNotification({
          show: true,
          type: 'error',
          message: 'فشل في نسخ الرابط',
        });
        setTimeout(() => setNotification({ show: false, type: '', message: '' }), 3000);
      }
    }

    setTimeout(() => setIsShareLoading(false), 1000);
  };

  const handleToggleFavorite = async (carId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      requireLogin();
      return;
    }

    const success = await toggleFavorite(carId);
    if (success) {
      const isNowFavorite = isFavorite(carId);
      setNotification({
        show: true,
        type: isNowFavorite ? 'success' : 'info',
        message: isNowFavorite ? 'تم إضافة السيارة للمفضلة' : 'تم إزالة السيارة من المفضلة',
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 2000);
    } else {
      setNotification({
        show: true,
        type: 'error',
        message: 'حدث خطأ في تحديث المفضلة',
      });
      setTimeout(() => setNotification({ show: false, type: '', message: '' }), 2000);
    }
  };

  // معالج إضافة البائع للمفضلة
  const handleToggleFavoriteSeller = () => {
    if (!isAuthenticated) {
      requireLogin('لإضافة البائع للمفضلة');
      return;
    }

    // هنا يمكن إضافة منطق حفظ البائع في المفضلة
    setNotification({
      show: true,
      type: 'success',
      message: 'تم إضافة البائع للمفضلة',
    });
    setTimeout(() => setNotification({ show: false, type: '', message: '' }), 2000);
  };

  // عرض حالة التحميل
  // تم إزالة spinner - UnifiedPageTransition يتولى ذلك
  if (loading)
    return (
      <>
        <Head>
          <title>تحميل ملف البائع | مزاد السيارات</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
          <OpensooqNavbar />
          <div className="flex min-h-[70vh] items-center justify-center">
            <Loader
              fullScreen={false}
              size="lg"
              variant="spinner"
              message="جاري تحميل ملف البائع..."
            />
          </div>
        </div>
      </>
    );

  // عرض حالة الخطأ
  if (error) {
    return (
      <>
        <Head>
          <title>خطأ في التحميل | مزاد السيارات</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
          <OpensooqNavbar />
          <div className="flex min-h-[70vh] items-center justify-center">
            <Card className="mx-4 w-full max-w-md border-red-200 bg-red-50">
              <CardContent className="p-8 text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                  <FlagIcon className="h-8 w-8 text-red-600" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-red-800">خطأ في تحميل البيانات</h2>
                <p className="mb-6 text-red-600">{error}</p>
                <div className="flex gap-3">
                  <Button onClick={() => window.location.reload()} className="flex-1">
                    إعادة المحاولة
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => router.push('/marketplace')}
                    className="flex-1"
                  >
                    العودة للسوق
                  </Button>
                </div>
              </CardContent>
            </Card>

            {sellerData.walletSummary && sellerData.walletSummary.hasWallet && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-emerald-100 p-3">
                      <WalletIcon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">محفظة البائع</h3>
                      <p className="text-sm text-gray-600">
                        عدد المحافظ النشطة: {sellerData.walletSummary.activeWallets}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <p className="text-xs text-gray-500">إجمالي الرصيد التقريبي</p>
                      <p className="mt-1 text-2xl font-bold text-emerald-600">
                        {formatNumber(sellerData.walletSummary.totalBalance || 0)}{' '}
                        <span className="text-sm font-semibold text-gray-600">
                          {sellerData.walletSummary.primaryCurrency}
                        </span>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </>
    );
  }

  // عرض رسالة عدم وجود البائع
  if (!sellerData) {
    return (
      <>
        <Head>
          <title>البائع غير موجود | مزاد السيارات</title>
        </Head>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
          <OpensooqNavbar />
          <div className="flex min-h-[70vh] items-center justify-center">
            <Card className="mx-4 w-full max-w-md">
              <CardContent className="p-8 text-center">
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <UserIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h2 className="mb-2 text-xl font-bold text-gray-800">البائع غير موجود</h2>
                <p className="mb-6 text-gray-600">لم يتم العثور على البائع المطلوب</p>
                <Button onClick={() => router.push('/marketplace')} className="w-full">
                  العودة للسوق
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>{sellerData.name} - ملف البائع | مزاد السيارات</title>
        <meta
          name="description"
          content={`ملف البائع ${sellerData.name} - تقييم ${sellerData.rating} نجوم، ${sellerData.stats.activeListings} إعلانات نشطة في ${sellerData.city}. ${sellerData.description}`}
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir="rtl">
        <OpensooqNavbar />

        {/* Notification */}
        {notification.show && (
          <div
            className={`fixed left-1/2 top-20 z-50 -translate-x-1/2 transform rounded-xl px-6 py-3 shadow-2xl backdrop-blur-sm ${
              notification.type === 'success'
                ? 'bg-green-500/90 text-white'
                : notification.type === 'error'
                  ? 'bg-red-500/90 text-white'
                  : 'bg-blue-500/90 text-white'
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Profile Header */}
          <Card className="mb-8 overflow-hidden border-0 shadow-2xl">
            {/* Profile Info */}
            <div className="relative bg-white px-6 py-6">
              <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
                {/* Avatar */}
                <div className="relative">
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-lg md:h-32 md:w-32">
                    <UserAvatar
                      src={sellerData.profileImage}
                      alt={sellerData.name}
                      size="2xl"
                      showVerificationBadge={false}
                      className="h-full w-full"
                    />
                  </div>
                  {/* Online Status */}
                  {sellerData.isOnline && (
                    <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-green-500 shadow-lg">
                      <div className="h-2 w-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>

                {/* Basic Info */}
                <div className="flex-1">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-4">
                      {/* Name, Title and Badges */}
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                            {sellerData.name}
                          </h1>
                          {/* Verification Badges */}
                          {sellerData.verified && (
                            <div className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                              <CheckCircleSolid className="h-4 w-4" />
                              موثق
                            </div>
                          )}
                          {(sellerData.accountType === 'DEALER' ||
                            sellerData.accountType === 'TRANSPORT_OWNER') && (
                            <div className="flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-800">
                              <TrophyIcon className="h-4 w-4" />
                              {sellerData.accountType === 'DEALER' ? 'تاجر معتمد' : 'مالك نقل'}
                            </div>
                          )}
                        </div>
                        <p className="text-gray-600">
                          {sellerData.accountType === 'DEALER'
                            ? 'تاجر معتمد'
                            : sellerData.accountType === 'TRANSPORT_OWNER'
                              ? 'مالك نقل'
                              : 'بائع'}{' '}
                          في منصة مزاد السيارات
                        </p>
                      </div>

                      {/* Rating and Reviews */}
                      {sellerData.rating && sellerData.rating > 0 && (
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <StarSolid
                                key={i}
                                className={`h-5 w-5 ${
                                  i < Math.floor(sellerData.rating!)
                                    ? 'text-amber-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-lg font-semibold text-gray-900">
                            {sellerData.rating.toFixed(1)}
                          </span>
                          <span className="text-gray-600">
                            ({formatNumber(sellerData.reviewsCount || 0)} تقييم)
                          </span>
                        </div>
                      )}

                      {/* Location and Join Date */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPinIcon className="h-4 w-4" />
                          <span>{sellerData.city}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>
                            {convertSpecificText(
                              `عضو منذ ${sellerData.joinDate || sellerData.memberSince}`,
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DevicePhoneMobileIcon className="h-4 w-4" />
                          <span className="font-medium">{sellerData.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <div className="flex gap-3">
                        <Button
                          onClick={handleContactClick}
                          disabled={!sellerData?.phone || isContactLoading}
                          className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-green-500 via-green-600 to-green-700 px-8 py-3.5 font-semibold text-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                          title={
                            !isAuthenticated
                              ? 'سجل دخولك للاتصال بالبائع'
                              : !sellerData?.phone
                                ? 'رقم الهاتف غير متوفر'
                                : isContactLoading
                                  ? 'جاري الاتصال...'
                                  : `اتصال مباشر بـ ${sellerData.name}`
                          }
                        >
                          <span className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-10"></span>
                          {isContactLoading ? (
                            <>
                              <div
                                className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                                style={{ width: 24, height: 24 }}
                                role="status"
                                aria-label="جاري التحميل"
                              />
                              <span className="sr-only">جاري الاتصال</span>
                            </>
                          ) : (
                            <PhoneIcon className="h-5 w-5 transition-transform group-hover:rotate-12 group-hover:scale-110" />
                          )}
                          <span className="relative z-10">
                            {isContactLoading ? '' : 'اتصال مباشر'}
                          </span>
                        </Button>
                        <Button
                          onClick={handleSendMessage}
                          disabled={isMessageLoading}
                          variant="outline"
                          className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-blue-300 bg-gradient-to-r from-blue-50 to-cyan-50 px-8 py-3.5 font-semibold text-blue-700 transition-all duration-300 hover:scale-105 hover:border-blue-400 hover:bg-gradient-to-r hover:from-blue-100 hover:to-cyan-100 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
                          title={
                            !isAuthenticated
                              ? 'سجل دخولك لإرسال رسالة'
                              : isMessageLoading
                                ? 'جاري فتح الرسائل...'
                                : `إرسال رسالة لـ ${sellerData?.name || 'البائع'}`
                          }
                        >
                          {isMessageLoading ? (
                            <>
                              <div
                                className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                                style={{ width: 24, height: 24 }}
                                role="status"
                                aria-label="جاري التحميل"
                              />
                              <span className="sr-only">جاري فتح الرسائل</span>
                            </>
                          ) : (
                            <ChatBubbleLeftRightIcon className="h-5 w-5 transition-transform group-hover:scale-110" />
                          )}
                          <span className="relative z-10">
                            {isMessageLoading ? '' : 'إرسال رسالة'}
                          </span>
                        </Button>
                      </div>

                      {/* أزرار ثانوية */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleShareProfile}
                          disabled={isShareLoading}
                          className="group h-12 w-12 rounded-xl border-2 border-gray-200 bg-white transition-all duration-300 hover:scale-110 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
                          title={isShareLoading ? 'جاري المشاركة...' : 'مشاركة ملف البائع'}
                        >
                          {isShareLoading ? (
                            <>
                              <div
                                className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                                style={{ width: 24, height: 24 }}
                                role="status"
                                aria-label="جاري التحميل"
                              />
                              <span className="sr-only">جاري المشاركة</span>
                            </>
                          ) : (
                            <ShareIcon className="h-5 w-5 text-blue-600 transition-all group-hover:rotate-12 group-hover:scale-125" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={handleToggleFavoriteSeller}
                          className="group h-12 w-12 rounded-xl border-2 border-gray-200 bg-white transition-all duration-300 hover:scale-110 hover:border-red-400 hover:bg-red-50 hover:shadow-md"
                          title={
                            isAuthenticated
                              ? 'إضافة البائع للمفضلة'
                              : 'سجل دخولك لإضافة البائع للمفضلة'
                          }
                        >
                          <HeartIcon className="h-5 w-5 text-red-500 transition-all group-hover:scale-125 group-hover:fill-current" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            {/* Main Content - Listings */}
            <div className="lg:col-span-3">
              <Card className="border-0 shadow-lg">
                {/* عنوان الإعلانات */}
                <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 pb-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-blue-100 p-3 shadow-sm">
                        <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">إعلانات البائع</h3>
                        <p className="text-sm text-gray-600">
                          {formatNumber(sellerCars.length)} سيارة متاحة
                        </p>
                      </div>
                    </div>

                    {/* أزرار الفلترة */}
                    <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
                      <button
                        onClick={() => setActiveTab('active')}
                        className={`group rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                          activeTab === 'active'
                            ? 'scale-105 bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>النشطة</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              activeTab === 'active' ? 'bg-white/20' : 'bg-gray-200'
                            }`}
                          >
                            {formatNumber(
                              sellerCars.filter((car) => car.status === 'active').length,
                            )}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('sold')}
                        className={`group rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                          activeTab === 'sold'
                            ? 'scale-105 bg-gradient-to-r from-green-500 to-green-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>المباعة</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              activeTab === 'sold' ? 'bg-white/20' : 'bg-gray-200'
                            }`}
                          >
                            {formatNumber(sellerCars.filter((car) => car.status === 'sold').length)}
                          </span>
                        </span>
                      </button>
                      <button
                        onClick={() => setActiveTab('all')}
                        className={`group rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                          activeTab === 'all'
                            ? 'scale-105 bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>الكل</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              activeTab === 'all' ? 'bg-white/20' : 'bg-gray-200'
                            }`}
                          >
                            {formatNumber(sellerCars.length)}
                          </span>
                        </span>
                      </button>
                    </div>
                  </div>
                </CardHeader>

                {/* Listings Content */}
                <CardContent className="p-6">
                  {sellerCars.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                        <BuildingStorefrontIcon className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="mb-2 text-lg font-semibold text-gray-900">لا توجد إعلانات</h3>
                      <p className="text-gray-600">لم يقم هذا البائع بنشر أي إعلانات بعد</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {sellerCars
                        .filter((car) => {
                          if (activeTab === 'active') return car.status === 'active';
                          if (activeTab === 'sold') return car.status === 'sold';
                          return true;
                        })
                        .map((car) => (
                          <div
                            key={car.id}
                            className="group cursor-pointer overflow-hidden rounded-2xl border-2 border-gray-200 bg-white shadow-md transition-all duration-300 hover:scale-[1.03] hover:border-blue-300 hover:shadow-2xl"
                            onClick={() => router.push(`/marketplace/${car.id}`)}
                          >
                            {/* صورة السيارة */}
                            <div className="relative h-52 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                              {car.images && car.images.length > 0 ? (
                                <Image
                                  src={
                                    typeof car.images[0] === 'string'
                                      ? car.images[0]
                                      : car.images[0].url
                                  }
                                  alt={car.title}
                                  fill
                                  className="object-cover transition-all duration-500 group-hover:rotate-1 group-hover:scale-110"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <BuildingStorefrontIcon className="h-16 w-16 text-gray-300" />
                                </div>
                              )}
                              {/* تأثير التظليل */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                              {/* شارة الحالة */}
                              <div className="absolute left-3 top-3">
                                <span
                                  className={`rounded-full px-3 py-1.5 text-xs font-bold shadow-lg backdrop-blur-sm ${
                                    car.status === 'active'
                                      ? 'bg-green-500/95 text-white ring-2 ring-white/30'
                                      : car.status === 'sold'
                                        ? 'bg-red-500/95 text-white ring-2 ring-white/30'
                                        : 'bg-gray-500/95 text-white ring-2 ring-white/30'
                                  }`}
                                >
                                  {car.status === 'active'
                                    ? '✓ متاح'
                                    : car.status === 'sold'
                                      ? '✓ مباع'
                                      : '⊗ غير متاح'}
                                </span>
                              </div>

                              {/* زر المفضلة */}
                              <button
                                onClick={(e) => handleToggleFavorite(car.id, e)}
                                className="absolute right-3 top-3 rounded-full bg-white/95 p-2.5 shadow-lg ring-2 ring-white/50 backdrop-blur-sm transition-all duration-300 hover:scale-125 hover:bg-white hover:shadow-xl"
                              >
                                {isFavorite(car.id) ? (
                                  <HeartSolid className="h-5 w-5 animate-pulse text-red-500" />
                                ) : (
                                  <HeartIcon className="h-5 w-5 text-gray-600 transition-colors hover:text-red-500" />
                                )}
                              </button>
                            </div>

                            {/* معلومات السيارة */}
                            <div className="p-5">
                              <h4 className="mb-2 line-clamp-2 font-bold text-gray-900 transition-colors group-hover:text-blue-600">
                                {car.title || `${car.make} ${car.model} ${car.year}`}
                              </h4>

                              <div className="mb-4 flex items-center gap-3 text-sm text-gray-600">
                                <span className="font-medium">{car.year}</span>
                                <span className="text-gray-300">•</span>
                                <span>{formatNumber(car.mileage || 0)} كم</span>
                                <span className="text-gray-300">•</span>
                                <span className="text-xs">{car.city || car.location}</span>
                              </div>

                              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                                <div className="text-xl font-bold text-blue-600">
                                  {formatNumber(car.price || 0)}
                                  <span className="mr-1 text-sm font-medium text-gray-500">
                                    د.ل
                                  </span>
                                </div>

                                {car.auction && (
                                  <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-600">
                                    <TrophyIcon className="h-3.5 w-3.5" />
                                    <span>مزاد</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar - Stats and Info */}
            <div className="space-y-6 lg:col-span-1">
              {/* Quick Stats */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-blue-100 p-3">
                      <ChartBarIcon className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">إحصائيات سريعة</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* الإحصائيات الرئيسية */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="group rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg">
                      <div className="mb-1 text-3xl font-bold text-blue-600">
                        {formatNumber(sellerData.stats.activeListings)}
                      </div>
                      <div className="text-xs font-medium text-blue-800">إعلانات نشطة</div>
                    </div>
                    <div className="group rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 text-center transition-all duration-300 hover:scale-105 hover:shadow-lg">
                      <div className="mb-1 text-3xl font-bold text-green-600">
                        {formatNumber(sellerData.stats.totalListings)}
                      </div>
                      <div className="text-xs font-medium text-green-800">إجمالي الإعلانات</div>
                    </div>
                  </div>

                  {/* المشاهدات والمبيعات */}
                  <div className="space-y-3">
                    <div className="group rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 p-4 transition-all duration-300 hover:shadow-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-2xl font-bold text-purple-600">
                            {formatLargeNumber(sellerData.stats.totalViews)}
                          </div>
                          <div className="text-xs font-medium text-purple-800">
                            إجمالي المشاهدات
                          </div>
                        </div>
                        <EyeIcon className="h-8 w-8 text-purple-400 transition-transform group-hover:scale-110" />
                      </div>
                    </div>

                    {sellerData.stats.soldListings > 0 && (
                      <div className="group rounded-xl bg-gradient-to-br from-amber-50 to-amber-100 p-4 transition-all duration-300 hover:shadow-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-amber-600">
                              {formatNumber(sellerData.stats.soldListings)}
                            </div>
                            <div className="text-xs font-medium text-amber-800">سيارة مباعة</div>
                          </div>
                          <TrophyIcon className="h-8 w-8 text-amber-400 transition-transform group-hover:scale-110" />
                        </div>
                      </div>
                    )}

                    {sellerData.stats.totalAuctions > 0 && (
                      <div className="group rounded-xl bg-gradient-to-br from-rose-50 to-rose-100 p-4 transition-all duration-300 hover:shadow-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-2xl font-bold text-rose-600">
                              {formatNumber(sellerData.stats.totalAuctions)}
                            </div>
                            <div className="text-xs font-medium text-rose-800">إجمالي المزادات</div>
                          </div>
                          <ChartBarIcon className="h-8 w-8 text-rose-400 transition-transform group-hover:scale-110" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Response Info */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-green-100 p-3">
                      <ClockIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">معلومات الاستجابة</h3>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* معدل الاستجابة */}
                  <div className="group rounded-xl bg-gradient-to-br from-green-50 to-green-100 p-4 transition-all duration-300 hover:shadow-lg">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">معدل الاستجابة</span>
                      {sellerData.isOnline && (
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                          <span className="text-xs font-medium text-green-600">نشط الآن</span>
                        </div>
                      )}
                    </div>
                    <div className="mb-2 text-2xl font-bold text-green-600">
                      {sellerData.stats.responseRate}
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-green-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                        style={{ width: sellerData.stats.responseRate }}
                      />
                    </div>
                  </div>

                  {/* وقت الاستجابة */}
                  <div className="group rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 p-4 transition-all duration-300 hover:shadow-lg">
                    <div className="flex items-center gap-3">
                      <ClockIcon className="h-6 w-6 text-blue-600 transition-transform group-hover:scale-110" />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-gray-600">متوسط وقت الاستجابة</div>
                        <div className="text-xl font-bold text-blue-600">
                          {sellerData.stats.avgResponseTime}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* نبذة عن البائع */}
              {sellerData.description && sellerData.description !== 'لا يوجد وصف' && (
                <Card className="group overflow-hidden border-0 shadow-lg transition-all duration-300 hover:shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-indigo-100 p-3 transition-transform group-hover:scale-110">
                        <UserIcon className="h-6 w-6 text-indigo-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">نبذة عن البائع</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-xl border border-gray-100 bg-white p-5 transition-colors hover:border-indigo-200">
                      <p className="text-sm leading-loose text-gray-700">
                        {sellerData.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* التخصصات */}
              {sellerData.specialties && sellerData.specialties.length > 0 && (
                <Card className="group overflow-hidden border-0 shadow-lg transition-all duration-300 hover:shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-100 p-3 transition-transform group-hover:scale-110">
                        <TrophyIcon className="h-6 w-6 text-amber-600" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">التخصصات</h3>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {sellerData.specialties.map((specialty, index) => (
                        <span
                          key={index}
                          className="group/badge cursor-default rounded-full bg-gradient-to-r from-amber-100 to-amber-200 px-4 py-2 text-sm font-medium text-amber-800 transition-all duration-200 hover:scale-105 hover:shadow-md"
                        >
                          <span className="group-hover/badge:font-semibold">{specialty}</span>
                        </span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Seller Reviews */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-yellow-100 p-3">
                        <StarSolid className="h-6 w-6 text-yellow-500" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900">تقييمات البائع</h3>
                        {sellerData.rating &&
                          sellerData.reviewsCount &&
                          sellerData.reviewsCount > 0 && (
                            <p className="text-sm text-gray-600">
                              متوسط {sellerData.rating.toFixed(1)} من{' '}
                              {formatNumber(sellerData.reviewsCount)} تقييم
                            </p>
                          )}
                      </div>
                    </div>
                    {reviewsLoading && (
                      <span className="text-xs text-gray-500">جاري جلب التقييمات...</span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {reviewsError && (
                    <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                      {reviewsError}
                    </div>
                  )}

                  {!reviewsLoading && reviews.length === 0 && !reviewsError && (
                    <p className="text-sm text-gray-500">لا توجد تقييمات للبائع حتى الآن.</p>
                  )}

                  {reviews.slice(0, 3).map((review) => (
                    <div
                      key={review.id}
                      className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:border-yellow-200 hover:shadow-md"
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-600">
                            {(review.reviewer?.name || 'مستخدم').trim().charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {review.reviewer?.name || 'مستخدم من المنصة'}
                            </p>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: 5 }).map((_, index) => (
                                <StarSolid
                                  key={index}
                                  className={`h-3.5 w-3.5 ${
                                    index < review.rating ? 'text-yellow-400' : 'text-gray-200'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(review.createdAt).toLocaleDateString('ar-SA')}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="text-sm leading-relaxed text-gray-700">{review.comment}</p>
                      )}
                    </div>
                  ))}

                  {reviews.length > 3 && (
                    <button
                      type="button"
                      className="w-full rounded-lg bg-gray-50 py-2 text-center text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                      onClick={() =>
                        setReviews((prev) =>
                          [...prev].sort(
                            (a, b) =>
                              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                          ),
                        )
                      }
                    >
                      عرض أحدث التقييمات أولاً
                    </button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* نافذة تسجيل الدخول */}
          <LoginModal isOpen={showAuthModal} onClose={handleAuthClose} />
        </div>
      </div>
    </>
  );
};

export default ModernSellerProfile;

// Static Generation
export async function getStaticPaths() {
  // في بيئة الإنتاج، يمكن جلب قائمة بأسماء البائعين الأكثر شهرة
  const paths: { params: { name: string } }[] = [];

  return {
    paths,
    fallback: 'blocking', // يسمح بإنشاء صفحات جديدة عند الطلب
  };
}

export async function getStaticProps({ params }: { params: { name: string } }) {
  try {
    // هنا يمكن جلب البيانات من API أو قاعدة البيانات
    // حالياً نعتمد على client-side fetching

    return {
      props: {
        sellerName: params.name,
      },
      revalidate: 300, // إعادة التحقق كل 5 دقائق
    };
  } catch (error) {
    console.error('خطأ في جلب بيانات البائع:', error);
    return {
      notFound: true,
    };
  }
}
