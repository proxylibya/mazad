import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import EnvelopeIcon from '@heroicons/react/24/outline/EnvelopeIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import {
  ChatBubbleLeftRightIcon as ChatSolid,
  HeartIcon as HeartSolid,
  PhoneIcon as PhoneSolid,
  StarIcon as StarSolid,
  VideoCameraIcon as VideoCameraSolid,
} from '@heroicons/react/24/solid';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import UserAvatar from '../../components/UserAvatar';
import LoginModal from '../../components/auth/LoginModal';
import { OpensooqNavbar } from '../../components/common';
import MarketplaceCarCard from '../../components/features/marketplace/cards/MarketplaceCarCard';
import useAuthProtection from '../../hooks/useAuthProtection';
import { useFavorites } from '../../hooks/useFavorites';
import { useStartConversation } from '../../hooks/useStartConversation';
import { prisma } from '../../lib/prisma';
import { ReviewService, ReviewStats } from '../../lib/services/reviewService';
import { getAuctionsWithVehicles } from '../../lib/services/universal/auctionService';
import {
  getVehicleWithImages,
  getVehiclesWithImages,
} from '../../lib/services/universal/vehicleService';
import { formatCityRegion } from '../../utils/formatters';
import { handlePhoneClickUnified } from '../../utils/phoneActions';

const SITE_TEAM_USER_ID = 'site_team';

interface ContactPageProps {
  seller: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    verified: boolean;
    profileImage: string | null;
    accountType: string;
    rating: number | null;
    totalReviews: number | null;
    createdAt: string;
  } | null;
  initialVehicle: {
    id: string;
    title: string;
    price: number;
    location: string;
    images: string[];
    seller: {
      id: string;
      name: string;
      phone: string;
      verified: boolean;
    };
  } | null;
  marketplaceVehicles: Array<{
    id: string;
    title: string;
    price: number;
    brand: string;
    model: string;
    year: number;
    location: string;
    condition: string;
    carImages?: Array<{ fileUrl: string; isPrimary?: boolean }>;
    seller: { id: string; name: string; phone: string; verified: boolean };
  }>;
  auctionVehicles: Array<{
    id: string;
    title: string;
    currentPrice: number;
    totalBids: number;
    car: {
      id: string;
      title: string;
      images: string[];
    };
  }>;
  reviewStats: {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: { [key: number]: number };
  };
}

// صفحة معلومات الاتصال بالبائع
const ContactPage = ({
  seller,
  initialVehicle,
  marketplaceVehicles,
  auctionVehicles,
  reviewStats,
}: ContactPageProps) => {
  const router = useRouter();
  const { carId } = router.query;

  // استخدام نظام الحماية
  const { isAuthenticated, showAuthModal, setShowAuthModal, requireLogin, handleAuthClose } =
    useAuthProtection({
      showModal: true,
    });

  // التحقق من تسجيل الدخول عند تحميل الصفحة
  useEffect(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated, setShowAuthModal]);

  const [notification, setNotification] = useState({
    show: false,
    type: '',
    message: '',
  });

  const { isFavorite, toggleFavorite } = useFavorites();
  const { startConversation, loading: messageLoading } = useStartConversation();
  const [isSharing, setIsSharing] = useState(false);

  // التحقق من وجود البيانات
  if (!seller || !initialVehicle) {
    return (
      <div className="min-h-screen bg-gray-50" dir="rtl">
        <OpensooqNavbar />
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-800">البائع غير موجود</h1>
          <p className="mb-6 text-gray-600">لم يتم العثور على بيانات البائع أو السيارة المطلوبة</p>
          <button
            onClick={() => router.back()}
            className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
          >
            العودة
          </button>
        </div>
      </div>
    );
  }

  // بناء بيانات العرض من البيانات الحقيقية
  const carData = {
    id: carId,
    title: initialVehicle.title,
    price: initialVehicle.price.toLocaleString(),
    image: initialVehicle.images[0] || '/images/cars/default-car.svg',
    seller: {
      name: seller.name,
      phone: seller.phone || '',
      verified: seller.verified,
      rating: reviewStats.averageRating || 0,
      reviewsCount: reviewStats.totalReviews || 0,
      memberSince: new Date(seller.createdAt).getFullYear().toString(),
      location: initialVehicle.location,
      avatar: seller.profileImage,
      responseTime: 'خلال ساعة',
      activeListings: marketplaceVehicles.length,
      soldCars: 0, // سيتم حسابه لاحقاً من البيانات
      lastSeen: 'منذ دقائق',
      joinDate: new Date(seller.createdAt).toLocaleDateString('ar-LY', {
        year: 'numeric',
        month: 'long',
      }),
    },
  };

  // دالة إظهار الإشعارات
  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 5000);
  };

  const handleCall = () => {
    requireLogin('للاتصال بالبائع', () => {
      if (carData.seller.phone) {
        handlePhoneClickUnified({ phone: carData.seller.phone });
        showNotification('success', 'تم فتح تطبيق الهاتف للاتصال');
      } else {
        showNotification('error', 'رقم الهاتف غير متوفر');
      }
    });
  };

  const handleMessage = () => {
    if (!seller?.id) return;

    startConversation({
      otherUserId: seller.id,
      otherUserName: seller.name,
      type: 'car',
      itemId: initialVehicle?.id,
    });
  };

  const handleVideoCall = () => {
    requireLogin('لمكالمة فيديو', () => {
      showNotification('warning', 'سيتم الاتصال بالبائع قريباً...');
    });
  };

  const handleFavorite = async () => {
    if (!isAuthenticated) {
      requireLogin('لإضافة إلى المفضلة', () => {});
      return;
    }

    if (carId && typeof carId === 'string') {
      await toggleFavorite(carId);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: carData.title,
          text: `تواصل مع ${carData.seller.name} بخصوص ${carData.title}`,
          url: window.location.href,
        });
        showNotification('success', 'تم مشاركة معلومات الاتصال');
      } else {
        // نسخ الرابط إلى الحافظة
        await navigator.clipboard.writeText(window.location.href);
        showNotification('success', 'تم نسخ الرابط إلى الحافظة');
      }
    } catch (error) {
      showNotification('error', 'حدث خطأ أثناء المشاركة');
    } finally {
      setIsSharing(false);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`استفسار بخصوص ${carData.title}`);
    const body = encodeURIComponent(
      `مرحباً ${carData.seller.name},\n\nأود الاستفسار بخصوص السيارة: ${carData.title}\n\nشكراً لك.`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // if (!session) {
  //   return <div>جاري التحميل...</div>;
  // }

  return (
    <>
      <Head>
        <title>الاتصال بالبائع - {carData.title}</title>
        <meta
          name="description"
          content={`تواصل مع البائع ${carData.seller.name} بخصوص ${carData.title}`}
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50" dir="rtl">
        <OpensooqNavbar />

        {/* Enhanced Notification */}
        {notification.show && (
          <div
            className={`fixed right-4 top-20 z-50 max-w-sm transform rounded-xl border-2 p-4 shadow-2xl backdrop-blur-sm transition-all duration-300 ${
              notification.type === 'success'
                ? 'border-green-400 bg-green-50/90 text-green-800'
                : notification.type === 'error'
                  ? 'border-red-400 bg-red-50/90 text-red-800'
                  : 'border-yellow-400 bg-yellow-50/90 text-yellow-800'
            }`}
          >
            <div className="flex items-center gap-3">
              {notification.type === 'success' && (
                <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-green-600" />
              )}
              {notification.type === 'error' && (
                <ExclamationTriangleIcon className="h-5 w-5 flex-shrink-0 text-red-600" />
              )}
              {notification.type === 'warning' && (
                <ClockIcon className="h-5 w-5 flex-shrink-0 text-yellow-600" />
              )}
              <span className="text-sm font-medium">{notification.message}</span>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* Enhanced Header */}
          <div className="mb-8">
            <Link
              href="/auctions"
              className="group mb-6 inline-flex items-center gap-2 text-blue-600 transition-colors hover:text-blue-800"
            >
              <ArrowRightIcon className="h-4 w-4 transition-transform group-hover:-translate-x-1 group-hover:transform" />
              العودة للمزادات
            </Link>
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="mb-2 text-3xl font-bold text-gray-900">معلومات الاتصال</h1>
                  <p className="text-lg text-gray-600">تواصل مع البائع بخصوص السيارة</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleFavorite}
                    className={`rounded-full p-3 transition-all duration-200 ${
                      isFavorite(carId as string)
                        ? 'bg-red-100 text-red-600 hover:bg-red-200'
                        : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-600'
                    }`}
                    title={isFavorite(carId as string) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                  >
                    {isFavorite(carId as string) ? (
                      <HeartSolid className="h-6 w-6" />
                    ) : (
                      <HeartIcon className="h-6 w-6" />
                    )}
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className="rounded-full bg-blue-100 p-3 text-blue-600 transition-all duration-200 hover:bg-blue-200 disabled:opacity-50"
                    title="مشاركة معلومات الاتصال"
                  >
                    <ShareIcon className={`h-6 w-6 ${isSharing ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Enhanced Car Info */}
            <div className="lg:col-span-1">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg transition-shadow duration-300 hover:shadow-xl">
                <div className="relative">
                  <img
                    src={carData.image}
                    alt={carData.title}
                    className="h-56 w-full object-cover"
                  />
                  <div className="absolute right-4 top-4">
                    <span className="rounded-full bg-green-500 px-3 py-1 text-sm font-medium text-white">
                      متاح للبيع
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="mb-3 text-xl font-bold text-gray-900">{carData.title}</h3>

                  <div className="mb-4 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-600">{carData.price}</span>
                    <span className="text-lg font-medium text-gray-600">د.ل</span>
                  </div>
                  <div className="mb-4 flex items-center gap-2 text-gray-600">
                    <MapPinIcon className="h-5 w-5 text-blue-500" />
                    <span className="font-medium">{formatCityRegion(carData.seller.location)}</span>
                  </div>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleCall}
                      className="flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-green-700"
                    >
                      <PhoneSolid className="h-4 w-4" />
                      اتصال سريع
                    </button>
                    <button
                      onClick={handleMessage}
                      className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-colors duration-200 hover:bg-blue-700"
                    >
                      <ChatSolid className="h-4 w-4" />
                      رسالة
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Seller Info & Contact */}
            <div className="space-y-8 lg:col-span-2">
              {/* Enhanced Seller Profile */}
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
                <div className="mb-8 flex items-start gap-6">
                  <div className="relative">
                    <UserAvatar
                      src={carData.seller.avatar || undefined}
                      alt={carData.seller.name}
                      size="xl"
                      showVerificationBadge={true}
                      isVerified={carData.seller.verified}
                    />
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-green-500"></div>
                  </div>
                  <div className="flex-1">
                    <div className="mb-3 flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-gray-900">{carData.seller.name}</h2>
                      {carData.seller.verified && (
                        <div className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-800">
                          <ShieldCheckIcon className="h-4 w-4" />
                          موثق
                        </div>
                      )}
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <StarSolid
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(carData.seller.rating)
                                  ? 'text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="font-semibold text-gray-900">{carData.seller.rating}</span>
                        <span className="text-gray-600">({carData.seller.reviewsCount} تقييم)</span>
                      </div>

                      <div className="flex items-center gap-2 text-gray-600">
                        <UserIcon className="h-4 w-4 text-blue-500" />
                        <span>عضو منذ {carData.seller.joinDate}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-red-500" />
                        <span className="font-medium">
                          {formatCityRegion(carData.seller.location)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ClockIcon className="h-4 w-4 text-green-500" />
                        <span>آخر ظهور: {carData.seller.lastSeen}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced Seller Stats */}
                <div className="mb-8 grid grid-cols-3 gap-6">
                  <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100 p-4 text-center">
                    <div className="mb-1 text-2xl font-bold text-blue-600">
                      {carData.seller.activeListings}
                    </div>
                    <div className="text-sm font-medium text-blue-800">إعلان نشط</div>
                  </div>
                  <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-green-100 p-4 text-center">
                    <div className="mb-1 text-2xl font-bold text-green-600">
                      {carData.seller.soldCars}
                    </div>
                    <div className="text-sm font-medium text-green-800">سيارة مباعة</div>
                  </div>
                  <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-purple-100 p-4 text-center">
                    <div className="mb-1 text-lg font-bold text-purple-600">
                      {carData.seller.responseTime}
                    </div>
                    <div className="text-sm font-medium text-purple-800">وقت الرد</div>
                  </div>
                </div>

                {/* Enhanced Contact Actions */}
                <div className="space-y-6">
                  {/* Phone Section */}
                  <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="rounded-full bg-green-100 p-2">
                        <PhoneSolid className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">رقم الهاتف</h3>
                        <p className="text-sm text-gray-600">للتواصل المباشر</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div
                        className="rounded-lg border bg-white p-3 font-mono text-xl font-bold text-gray-900"
                        dir="ltr"
                      >
                        {carData.seller.phone}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={handleCall}
                          className="flex transform items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-green-700 hover:shadow-lg"
                        >
                          <PhoneSolid className="h-5 w-5" />
                          اتصال مباشر
                        </button>
                        <button
                          onClick={handleVideoCall}
                          className="flex transform items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-medium text-white transition-all duration-200 hover:scale-105 hover:bg-blue-700 hover:shadow-lg"
                        >
                          <VideoCameraSolid className="h-5 w-5" />
                          مكالمة فيديو
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Communication Options */}
                  <div className="grid grid-cols-1 gap-4">
                    {/* Message Button */}
                    <button
                      onClick={handleMessage}
                      className="flex transform items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 font-medium text-white transition-all duration-200 hover:scale-105 hover:from-blue-700 hover:to-blue-800 hover:shadow-lg"
                    >
                      <ChatSolid className="h-6 w-6" />
                      <span className="text-lg">إرسال رسالة</span>
                    </button>

                    {/* Email Button */}
                    <button
                      onClick={handleEmail}
                      className="flex items-center justify-center gap-3 rounded-2xl border-2 border-gray-300 bg-white px-6 py-4 font-medium text-gray-700 transition-all duration-200 hover:border-gray-400 hover:bg-gray-50 hover:shadow-md"
                    >
                      <EnvelopeIcon className="h-6 w-6" />
                      <span className="text-lg">إرسال إيميل</span>
                    </button>
                  </div>
                </div>

                {/* Enhanced Safety Tips */}
                <div className="mt-8 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="rounded-full bg-amber-100 p-2">
                      <ShieldCheckIcon className="h-6 w-6 text-amber-600" />
                    </div>
                    <h4 className="text-lg font-bold text-amber-800">نصائح مهمة للأمان</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                      <span className="text-sm text-amber-800">تأكد من هوية البائع قبل الشراء</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                      <span className="text-sm text-amber-800">قم بفحص السيارة شخصياً</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                      <span className="text-sm text-amber-800">
                        لا تدفع أي مبلغ قبل رؤية السيارة
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-600" />
                      <span className="text-sm text-amber-800">استخدم طرق دفع آمنة</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* قسم إعلانات البائع */}
          {(marketplaceVehicles.length > 0 || auctionVehicles.length > 0) && (
            <div className="mt-12">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-lg">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">جميع إعلانات {seller.name}</h2>
                    <p className="text-gray-600">
                      {marketplaceVehicles.length + auctionVehicles.length} إعلان متوفر
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-gray-600">
                        السوق الفوري ({marketplaceVehicles.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <span className="text-gray-600">المزادات ({auctionVehicles.length})</span>
                    </div>
                  </div>
                </div>

                {/* السوق الفوري */}
                {marketplaceVehicles.length > 0 && (
                  <div className="mb-8">
                    <h3 className="mb-4 text-lg font-semibold text-gray-800">السوق الفوري</h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {marketplaceVehicles.slice(0, 6).map((vehicle) => (
                        <MarketplaceCarCard
                          key={vehicle.id}
                          car={{
                            ...vehicle,
                            images: vehicle.carImages?.map((img) => img.fileUrl) || [],
                          }}
                        />
                      ))}
                    </div>
                    {marketplaceVehicles.length > 6 && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => router.push(`/marketplace?seller=${seller.id}`)}
                          className="rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
                        >
                          عرض جميع الإعلانات ({marketplaceVehicles.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* المزادات */}
                {auctionVehicles.length > 0 && (
                  <div>
                    <h3 className="mb-4 text-lg font-semibold text-gray-800">المزادات النشطة</h3>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {auctionVehicles.slice(0, 6).map((auction) => (
                        <div
                          key={auction.id}
                          className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow transition-shadow hover:shadow-md"
                          onClick={() => router.push(`/auction/${auction.id}`)}
                        >
                          <img
                            src={auction.car?.images?.[0] || '/images/cars/default-car.svg'}
                            alt={auction.title}
                            className="mb-3 h-40 w-full rounded-lg object-cover"
                          />
                          <h4 className="mb-2 line-clamp-2 font-semibold text-gray-900">
                            {auction.title || auction.car?.title}
                          </h4>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div>
                              السعر الحالي:{' '}
                              <span className="font-semibold text-green-600">
                                {auction.currentPrice?.toLocaleString()} د.ل
                              </span>
                            </div>
                            <div>عدد المزايدات: {auction.totalBids || 0}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {auctionVehicles.length > 6 && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => router.push(`/auctions?seller=${seller.id}`)}
                          className="rounded-lg bg-orange-600 px-6 py-2 text-white hover:bg-orange-700"
                        >
                          عرض جميع المزادات ({auctionVehicles.length})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* نافذة تسجيل الدخول */}
      <LoginModal isOpen={showAuthModal} onClose={handleAuthClose} />
    </>
  );
};

export default ContactPage;

// جلب البيانات الحقيقية من قاعدة البيانات
export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  try {
    const carId = params?.carId as string;
    if (!carId) {
      return { notFound: true };
    }

    // جلب السيارة للحصول على معرف البائع
    const vehicle = await getVehicleWithImages(carId);
    if (!vehicle || !vehicle.seller) {
      return { notFound: true };
    }

    const sellerId = vehicle.seller.id;

    // جلب بيانات البائع من قاعدة البيانات
    const seller = await prisma.users.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        verified: true,
        profileImage: true,
        accountType: true,
        rating: true,
        totalReviews: true,
        createdAt: true,
      },
    });

    let finalSeller = seller;
    if (seller && seller.id === SITE_TEAM_USER_ID) {
      try {
        const record = await prisma.system_settings.findFirst({ where: { key: 'site_team' } });
        const raw = record?.value
          ? typeof record.value === 'string'
            ? (JSON.parse(record.value as string) as any)
            : (record.value as any)
          : null;

        const teamName = String(raw?.teamName || seller.name || 'فريق مزاد');
        const phones = Array.isArray(raw?.phones)
          ? raw.phones.map((p: any) => String(p || '').trim()).filter(Boolean)
          : [];
        const whatsappPhone = String(raw?.whatsappPhone || '').trim();
        const teamPhone = phones.find(Boolean) || whatsappPhone || seller.phone || '';

        finalSeller = {
          ...seller,
          name: teamName,
          phone: teamPhone,
        };
      } catch {
        // ignore parsing errors
      }
    }

    if (!seller) {
      return { notFound: true };
    }

    // جلب جميع إعلانات البائع في السوق الفوري
    const { vehicles: marketplaceVehicles } = await getVehiclesWithImages({
      sellerId,
      status: 'AVAILABLE',
      isAuction: false,
      limit: 20,
    });

    // جلب مزادات البائع
    const { auctions: auctionVehicles } = await getAuctionsWithVehicles({
      sellerId,
      status: 'ACTIVE',
      limit: 10,
    });

    // جلب إحصائيات التقييمات
    let reviewStats: ReviewStats = {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };

    try {
      reviewStats = await ReviewService.getReviewStats(sellerId, 'user');
    } catch (reviewError) {
      console.warn('Failed to load review stats:', reviewError);
    }

    // تحضير بيانات السيارة الأولية للعرض
    const initialVehicle = {
      id: vehicle.id,
      title: vehicle.title,
      price: vehicle.price,
      location: vehicle.location,
      images: vehicle.carImages?.map((img) => img.fileUrl) ||
        (vehicle.images ? JSON.parse(vehicle.images) : []) || ['/images/cars/default-car.svg'],
      seller: vehicle.seller,
    };

    return {
      props: {
        seller: {
          ...(finalSeller as any),
          createdAt: (finalSeller as any).createdAt.toISOString(),
        },
        initialVehicle,
        marketplaceVehicles: marketplaceVehicles || [],
        auctionVehicles: auctionVehicles || [],
        reviewStats,
      },
    };
  } catch (error) {
    console.error('Error in getServerSideProps:', error);
    return { notFound: true };
  }
};
