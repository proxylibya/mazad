import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { SmartFeaturedBadge, TitleFeaturedBadge } from '../../components/ui/FeaturedBadge';
import { UnifiedNavigationArrows } from '../../components/ui/NavigationArrows';

// Dynamic imports للمكونات الثقيلة - تحسين الأداء
const SafetyTips = dynamic(() => import('../../components/SafetyTips'), {
  ssr: false,
});

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
/* eslint-disable @typescript-eslint/prefer-optional-chain */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-misused-promises */

import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import CameraIcon from '@heroicons/react/24/outline/CameraIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import CreditCardIcon from '@heroicons/react/24/outline/CreditCardIcon';
import DevicePhoneMobileIcon from '@heroicons/react/24/outline/DevicePhoneMobileIcon';
import DocumentCheckIcon from '@heroicons/react/24/outline/DocumentCheckIcon';
import DocumentTextIcon from '@heroicons/react/24/outline/DocumentTextIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import FireIcon from '@heroicons/react/24/outline/FireIcon';
import GlobeAltIcon from '@heroicons/react/24/outline/GlobeAltIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import MapIcon from '@heroicons/react/24/outline/MapIcon';
import PaintBrushIcon from '@heroicons/react/24/outline/PaintBrushIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import StarIcon from '@heroicons/react/24/outline/StarIcon';
import TruckIcon from '@heroicons/react/24/outline/TruckIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { OpensooqNavbar } from '../../components/common';
import ReviewsAndRatings from '../../components/common/ReviewsAndRatings';
import { useAuth } from '../../hooks/useAuth';
import { useFavorites } from '../../hooks/useFavorites';
import { translateToArabic } from '../../utils/formatters';

import CarFeaturesDisplay from '../../components/CarFeaturesDisplay';
import CategorizedFeaturesDisplay from '../../components/CategorizedFeaturesDisplay';
import ImprovedSellerInfoCard from '../../components/ImprovedSellerInfoCard';
import { CacheNamespaces, CacheTags, advancedCache } from '../../utils/advancedCaching';
import { SafeCarListing, sanitizeCarListing } from '../../utils/dataValidation';

const LoginModal = dynamic(() => import('../../components/auth/LoginModal'), {
  ssr: false,
});
const CarLocationDisplay = dynamic(() => import('../../components/maps/CarLocationDisplay'), {
  ssr: false,
});

// صفحة تفاصيل سيارة السوق الفوري
interface MarketplaceCarDetailsProps {
  listingId: string;
  listing?: SafeCarListing | null;
}

const MarketplaceCarDetails: React.FC<MarketplaceCarDetailsProps> = ({
  listingId: _listingId,
  listing: propListing,
}) => {
  const router = useRouter();
  const { user, updateUser } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { id } = router.query;

  const [_activeImageIndex, _setActiveImageIndex] = useState(0);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    type: '',
    message: '',
  });
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});
  const [listing, setListing] = useState<SafeCarListing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactModal, setShowContactModal] = useState(false);

  useEffect(() => {
    // التحقق من صحة معرف السيارة
    if (!id) {
      return;
    }
    if (propListing) {
      // استخدام البيانات المرسلة من الخادم مع التحقق من صحتها
      const safeListing = sanitizeCarListing(propListing);
      setListing(safeListing);
      setIsLoading(false);
    } else if (id) {
      // محاولة جلب البيانات من API أولاً
      const fetchCarData = async () => {
        try {
          console.log(`محاولة جلب بيانات السيارة ${id} من API...`);
          const response = await fetch(`/api/cars/${id}`);

          if (response.ok) {
            const data = await response.json();
            console.log('استجابة API:', data);

            if (data.success && data.data) {
              console.log(`تم العثور على السيارة ${id} في API:`, data.data.title);

              // تحويل بيانات API إلى تنسيق آمن
              const safeListing = sanitizeCarListing(data.data);
              setListing(safeListing);
              setIsLoading(false);
              return;
            }
          } else {
            console.log(`فشل في جلب السيارة ${id} من API:`, response.status);
          }
        } catch (error) {
          console.error('خطأ في جلب بيانات السيارة من API:', error);
        }

        // لا توجد بيانات متاحة - استخدام بيانات افتراضية آمنة
        console.log(`لم يتم العثور على السيارة ${id}، استخدام البيانات الافتراضية`);

        // إنشاء بيانات افتراضية آمنة
        const defaultData = {
          id: id as string,
          title: `سيارة للبيع - ${id}`,
          price: 0,
        };

        const safeListing = sanitizeCarListing(defaultData);
        setListing(safeListing);
        setIsLoading(false);
      };

      fetchCarData();
    }
  }, [id, propListing]);

  // التحقق من صحة معرف السيارة
  if (!id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50" dir="rtl">
        <div className="text-center">
          <div
            className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
            style={{ width: 24, height: 24 }}
            role="status"
            aria-label="جاري التحميل"
          />
          <p className="text-gray-600">جاري تحميل بيانات السيارة...</p>
        </div>
      </div>
    );
  }

  // دالة تنسيق الأرقام المحسنة مع معالجة الأخطاء
  const formatNumber = (num: string | number) => {
    if (!num) return '0';

    // إذا كان رقم
    if (typeof num === 'number') {
      return num.toLocaleString();
    }

    // إذا كان نص
    const cleanNum = num.toString().replace(/[^0-9]/g, '');
    if (!cleanNum) return '0';

    return parseInt(cleanNum).toLocaleString();
  };

  // دالة تنسيق السعر مع العملة
  const formatPrice = (price: string | number) => {
    if (!price) return '0 د.ل';

    // إذا كان السعر يحتوي على "د.ل" بالفعل، أرجعه كما هو
    if (typeof price === 'string' && price.includes('د.ل')) {
      return price;
    }

    return `${formatNumber(price)} د.ل`;
  };

  // معالجة أخطاء تحميل الصور
  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  // الحصول على صورة بديلة
  const getImageSrc = (src: string | undefined, index: number) => {
    // إذا كانت الصورة فارغة أو حدث خطأ، استخدم الصورة الافتراضية
    if (!src || imageErrors[index]) {
      return '/images/cars/default-car.svg';
    }
    // التأكد من أن المسار صحيح
    if (src.startsWith('http') || src.startsWith('/')) {
      return src;
    }
    // إضافة المسار الأساسي إذا لم يكن موجوداً
    return `/uploads/${src}`;
  };

  // دالة إظهار الإشعارات
  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 5000);
  };

  // دالة التحقق من تسجيل الدخول وإظهار نافذة التسجيل
  const requireLogin = (action: string, callback?: () => void) => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }
    if (callback) callback();
    return true;
  };

  // معالجة نجاح تسجيل الدخول
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    // إعادة تحميل بيانات المستخدم باستخدام الواجهة الجديدة
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        updateUser(JSON.parse(savedUser));
      } catch {
        // تجاهل أي خطأ غير متوقع
      }
    }
  };

  const handleContactClick = () => {
    if (!listing) return;
    requireLogin('لعرض معلومات الاتصال', () => {
      setShowContactInfo(true);
      showNotification('success', 'تم عرض معلومات الاتصال');
    });
  };

  const handleSendMessage = () => {
    if (!listing) return;
    requireLogin('لإرسال رسالة', () => {
      router.push(
        `/messages?contact=${encodeURIComponent(listing.seller.name)}&car=${encodeURIComponent(listing.title)}&sellerId=${(listing.seller as any).id}`,
      );
    });
  };

  const _handleRequestViewing = () => {
    if (!listing) return;
    requireLogin('لطلب معاينة السيارة', () => {
      // محاكاة إرسال طلب المعاينة
      showNotification('success', 'تم إرسال طلب المعاينة بنجاح. سيتم التواصل معك قريباً.');

      // يمكن إضافة API call هنا لاحقاً
      // try {
      //   await fetch('/api/request-viewing', {
      //     method: 'POST',
      //     headers: { 'Content-Type': 'application/json' },
      //     body: JSON.stringify({ carId: carData.id, sellerId: carData.seller.id })
      //   });
      // } catch (error) {
      //   showNotification('error', 'فشل في إرسال طلب المعاينة. حاول مرة أخرى.');
      // }
    });
  };

  // دالة للاتصال المباشر
  const handleDirectCall = () => {
    if (!listing || !listing.contact.phone || listing.contact.phone === 'غير متوفر') {
      showNotification('error', 'رقم الهاتف غير متوفر');
      return;
    }
    window.open(`tel:${listing.contact.phone}`);
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (id && typeof id === 'string') {
      await toggleFavorite(id);
    }
  };

  const handleShare = () => {
    requireLogin('لمشاركة السيارة', () => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
          .writeText(window.location.href)
          .then(() => {
            showNotification('success', 'تم نسخ رابط السيارة');
          })
          .catch(() => {
            showNotification('error', 'فشل في نسخ الرابط');
          });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = window.location.href;
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand('copy');
          showNotification('success', 'تم نسخ رابط السيارة');
        } catch (err) {
          showNotification('error', 'فشل في نسخ الرابط');
        }
        document.body.removeChild(textArea);
      }
    });
  };

  const _handleContact = (method: 'call' | 'message') => {
    if (!listing) return;
    switch (method) {
      case 'call':
        window.open(`tel:${(listing.seller as any)?.phone || ''}`);
        break;
      case 'message':
        handleSendMessage();
        break;
    }
  };

  const _nextImage = () => {
    if (!listing) return;
    const imagesLength = Array.isArray(listing.images)
      ? listing.images.length
      : listing.images
        ? 1
        : 1;
    setCurrentImageIndex((prev) => (prev + 1) % imagesLength);
  };

  const _prevImage = () => {
    if (!listing) return;
    const imagesLength = Array.isArray(listing.images)
      ? listing.images.length
      : listing.images
        ? 1
        : 1;
    setCurrentImageIndex((prev) => (prev - 1 + imagesLength) % imagesLength);
  };

  // تم إزالة spinner التحميل - UnifiedPageTransition يتولى ذلك
  if (isLoading) return null;

  // التحقق من وجود البيانات
  if (!listing) {
    return (
      <>
        <Head>
          <title>السيارة غير موجودة - مزاد السيارات</title>
        </Head>
        <div className="flex min-h-screen items-center justify-center bg-gray-50" dir="rtl">
          <div className="text-center">
            <div className="mb-4">
              <ExclamationTriangleIcon className="mx-auto mb-4 h-16 w-16 text-gray-400" />
            </div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">السيارة غير موجودة</h1>
            <p className="mb-6 text-gray-600">السيارة التي تبحث عنها غير موجودة أو تم بيعها</p>
            <div className="space-x-4 space-x-reverse">
              <Link
                href="/marketplace"
                className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
              >
                العودة للسوق الفوري
              </Link>
              <Link
                href="/"
                className="inline-flex items-center rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
              >
                الصفحة الرئيسية
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  }

  const imagesArr = Array.isArray(listing.images)
    ? listing.images
    : listing.images
      ? [listing.images]
      : [];

  return (
    <>
      <Head>
        <title>{listing.title} - مزاد السيارات</title>
        <meta name="description" content={listing.description} />
      </Head>

      <OpensooqNavbar />

      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* إشعارات النظام */}
        {notification.show && (
          <div className="fixed right-4 top-4 z-50 max-w-sm">
            <div
              className={`rounded-lg border-r-4 p-4 shadow-lg ${
                notification.type === 'success'
                  ? 'border-green-400 bg-green-50 text-green-800'
                  : notification.type === 'error'
                    ? 'border-red-400 bg-red-50 text-red-800'
                    : 'border-yellow-400 bg-yellow-50 text-yellow-800'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {notification.type === 'success' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  )}
                  {notification.type === 'error' && <XMarkIcon className="h-5 w-5 text-red-400" />}
                  {notification.type === 'warning' && (
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  )}
                </div>
                <div className="mr-3 flex-1">
                  <p className="text-sm font-medium">{notification.message}</p>
                </div>
                <button
                  onClick={() => setNotification({ show: false, type: '', message: '' })}
                  className="mr-2 flex-shrink-0"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              الرئيسية
            </Link>
            <span className="mx-2 text-gray-500">/</span>
            <Link href="/marketplace" className="text-blue-600 hover:text-blue-800">
              السوق الفوري
            </Link>
            <span className="mx-2 text-gray-500">/</span>
            <span className="text-gray-700">
              {String(listing.specifications?.brand || listing.title)}{' '}
              {String(listing.specifications?.model || '')}
            </span>
          </nav>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Images and Details */}
            <div className="space-y-6 lg:col-span-2">
              {/* معرض الصور */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="group relative">
                  <img
                    src={getImageSrc(imagesArr[currentImageIndex], currentImageIndex)}
                    alt={listing.title || 'سيارة'}
                    className="h-96 w-full object-cover"
                    onError={() => handleImageError(currentImageIndex)}
                  />

                  {/* أزرار التنقل الموحدة */}
                  <UnifiedNavigationArrows
                    onPrevious={() =>
                      setCurrentImageIndex((prev) =>
                        prev === 0 ? (imagesArr.length || 1) - 1 : prev - 1,
                      )
                    }
                    onNext={() =>
                      setCurrentImageIndex((prev) =>
                        prev === (imagesArr.length || 1) - 1 ? 0 : prev + 1,
                      )
                    }
                    show={imagesArr.length > 1}
                  />

                  {/* أزرار الإجراءات */}
                  <div className="absolute right-4 top-4 flex gap-2">
                    <button
                      onClick={handleFavoriteToggle}
                      className="rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white"
                      title={
                        user
                          ? isFavorite(id as string)
                            ? 'إزالة من المفضلة'
                            : 'إضافة للمفضلة'
                          : 'سجل دخولك لإضافة للمفضلة'
                      }
                    >
                      {isFavorite(id as string) ? (
                        <HeartSolid className="h-5 w-5 text-red-500" />
                      ) : (
                        <HeartIcon className="h-5 w-5 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={handleShare}
                      className="rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white"
                      title={user ? 'مشاركة السيارة' : 'سجل دخولك للمشاركة'}
                    >
                      <ShareIcon className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>

                  {/* شارة الإعلان المميز - على يسار الصورة في الأعلى */}
                  {(listing.featured ||
                    ((listing as any).promotionPackage &&
                      (listing as any).promotionPackage !== 'free')) && (
                    <div className="absolute left-4 top-4 z-10">
                      <SmartFeaturedBadge
                        featured={listing.featured}
                        packageType={(listing as any).promotionPackage}
                        size="md"
                        showText={true}
                      />
                    </div>
                  )}

                  {/* معلومات الصور والمشاهدات */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-sm text-white backdrop-blur-sm">
                    <CameraIcon className="h-4 w-4" />
                    {imagesArr.length} صور
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-sm text-white backdrop-blur-sm">
                    <EyeIcon className="h-4 w-4" />
                    {(listing.views || 0).toLocaleString()} مشاهدة
                  </div>
                </div>

                {/* الصور المصغرة */}
                <div className="flex gap-2 overflow-x-auto p-4">
                  {imagesArr.map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                        currentImageIndex === index
                          ? 'border-blue-500 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={getImageSrc(image, index)}
                        alt={`صورة ${index + 1}`}
                        className="h-full w-full object-cover"
                        onError={() => handleImageError(index)}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* تفاصيل السيارة الرئيسية */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
                      <TitleFeaturedBadge
                        featured={listing.featured}
                        packageType={(listing as any).promotionPackage}
                      />
                    </div>

                    {/* التاريخ والمدينة */}
                    <div className="mb-3 flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          aria-hidden="true"
                          data-slot="icon"
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                          ></path>
                        </svg>
                        <span>
                          {new Date().toLocaleDateString('ar-LY', {
                            day: 'numeric',
                            month: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          aria-hidden="true"
                          data-slot="icon"
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          ></path>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                          ></path>
                        </svg>
                        <span>
                          {listing.location}
                          {(listing as any).area && ` - ${(listing as any).area}`}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* وصف السيارة */}
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">وصف السيارة</h3>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="leading-relaxed text-gray-700">{listing.description}</p>
                  </div>
                </div>

                {/* المواصفات الأساسية - تصميم محسن */}
                <div className="car-specifications-container">
                  <div className="car-features-title">
                    <CogIcon className="car-features-title-icon" />
                    <h3 className="car-features-title-text">مواصفات السيارة</h3>
                  </div>
                  <div className="car-specifications-grid">
                    {Object.entries(listing.specifications || {})
                      .filter(([key, value]) => {
                        const stringValue = value as string;
                        // البيانات المهمة التي يجب إظهارها دائماً حتى لو كانت "غير محدد"
                        const importantFields = [
                          'chassisNumber',
                          'engineNumber',
                          'engineSize',
                          'fuelType',
                          'fuel',
                          'vehicleType',
                          'manufacturingCountry',
                          'customsStatus',
                          'licenseStatus',
                          'insuranceStatus',
                        ];

                        if (importantFields.includes(key)) {
                          return stringValue && stringValue.trim() !== '';
                        }

                        return (
                          stringValue &&
                          stringValue.trim() !== '' &&
                          stringValue !== 'غير محدد' &&
                          stringValue !== 'غير متوفر'
                        );
                      })
                      .sort(([keyA], [keyB]) => {
                        // ترتيب الحقول حسب الأولوية
                        const priority: { [key: string]: number } = {
                          brand: 1,
                          model: 2,
                          year: 3,
                          condition: 4,
                          mileage: 5,
                          fuel: 6,
                          fuelType: 6, // للتوافق مع النسخة القديمة
                          transmission: 7,
                          bodyType: 8,
                          color: 9,
                          engineSize: 10,
                          interiorColor: 11,
                          seatCount: 12,
                          regionalSpecs: 13,
                          vehicleType: 14,
                          manufacturingCountry: 15,
                          customsStatus: 16,
                          licenseStatus: 17,
                          insuranceStatus: 18,
                          paymentMethod: 19,
                          chassisNumber: 20,
                          engineNumber: 21,
                        };
                        return (priority[keyA] || 99) - (priority[keyB] || 99);
                      })
                      .map(([key, value]) => {
                        // تحديد التسميات العربية والأيقونات للحقول
                        const getFieldInfo = (fieldKey: string) => {
                          const fieldInfo: {
                            [key: string]: {
                              label: string;
                              icon: React.ComponentType<any>;
                            };
                          } = {
                            brand: {
                              label: 'الماركة',
                              icon: BuildingOfficeIcon,
                            },
                            model: { label: 'الموديل', icon: TruckIcon },
                            year: { label: 'سنة الصنع', icon: CalendarIcon },
                            mileage: {
                              label: 'المسافة المقطوعة',
                              icon: MapIcon,
                            },
                            condition: {
                              label: 'حالة السيارة',
                              icon: StarIcon,
                            },
                            fuelType: { label: 'نوع الوقود', icon: FireIcon },
                            transmission: {
                              label: 'ناقل الحركة',
                              icon: CogIcon,
                            },
                            bodyType: {
                              label: 'نوع الهيكل',
                              icon: TruckIcon,
                            },
                            color: {
                              label: 'اللون الخارجي',
                              icon: PaintBrushIcon,
                            },
                            fuel: { label: 'نوع الوقود', icon: FireIcon },
                            engineSize: {
                              label: 'حجم المحرك',
                              icon: CogIcon,
                            },
                            engineNumber: {
                              label: 'رقم المحرك',
                              icon: ClipboardDocumentIcon,
                            },
                            chassisNumber: {
                              label: 'رقم الشاسيه',
                              icon: ClipboardDocumentIcon,
                            },
                            regionalSpecs: {
                              label: 'المواصفات الإقليمية',
                              icon: GlobeAltIcon,
                            },
                            interiorColor: {
                              label: 'لون الداخلية',
                              icon: PaintBrushIcon,
                            },
                            seatCount: {
                              label: 'عدد المقاعد',
                              icon: UserGroupIcon,
                            },
                            vehicleType: {
                              label: 'نوع المركبة',
                              icon: TruckIcon,
                            },
                            manufacturingCountry: {
                              label: 'بلد الصنع',
                              icon: GlobeAltIcon,
                            },
                            customsStatus: {
                              label: 'حالة الجمارك',
                              icon: DocumentCheckIcon,
                            },
                            licenseStatus: {
                              label: 'حالة الترخيص',
                              icon: DocumentCheckIcon,
                            },
                            insuranceStatus: {
                              label: 'حالة التأمين',
                              icon: ShieldCheckIcon,
                            },
                            paymentMethod: {
                              label: 'طريقة الدفع',
                              icon: CreditCardIcon,
                            },
                          };
                          return (
                            fieldInfo[fieldKey] || {
                              label: fieldKey,
                              icon: ClipboardDocumentIcon,
                            }
                          );
                        };

                        const fieldInfo = getFieldInfo(key);

                        // تحديد فئة المواصفة للتصميم الموحد
                        const isBasic = ['brand', 'model', 'year', 'condition', 'mileage'].includes(
                          key,
                        );
                        const isTechnical = [
                          'chassisNumber',
                          'engineNumber',
                          'engineSize',
                        ].includes(key);
                        const specClass = isBasic
                          ? 'spec-basic'
                          : isTechnical
                            ? 'spec-technical'
                            : 'spec-general';

                        return (
                          <div key={key} className={`car-spec-card ${specClass}`}>
                            <div className="car-spec-label">
                              <fieldInfo.icon className="car-spec-icon" />
                              <span>{fieldInfo.label}</span>
                            </div>
                            <div className="car-spec-value">
                              {translateToArabic(value as string)}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* المميزات والكماليات - إخفاء القسم بالكامل إذا لم تكن هناك مميزات */}
                {(() => {
                  // فحص وجود أي مميزات
                  const hasGeneralFeatures =
                    listing?.features &&
                    (typeof listing.features === 'object'
                      ? Object.keys(listing.features).length > 0
                      : String(listing.features).trim() !== '');

                  const hasExtractedFeatures =
                    (listing as any)?.extractedFeatures &&
                    Array.isArray((listing as any).extractedFeatures) &&
                    (listing as any).extractedFeatures.length > 0;

                  const hasInteriorFeatures =
                    listing?.interiorFeatures &&
                    Array.isArray(listing.interiorFeatures) &&
                    listing.interiorFeatures.length > 0;

                  const hasExteriorFeatures =
                    listing?.exteriorFeatures &&
                    Array.isArray(listing.exteriorFeatures) &&
                    listing.exteriorFeatures.length > 0;

                  const hasTechnicalFeatures =
                    listing?.technicalFeatures &&
                    Array.isArray(listing.technicalFeatures) &&
                    listing.technicalFeatures.length > 0;

                  // إخفاء القسم بالكامل إذا لم تكن هناك أي مميزات
                  if (
                    !hasGeneralFeatures &&
                    !hasExtractedFeatures &&
                    !hasInteriorFeatures &&
                    !hasExteriorFeatures &&
                    !hasTechnicalFeatures
                  ) {
                    return null;
                  }

                  return (
                    <div className="car-features-container">
                      <div className="car-features-title">
                        <SparklesIcon className="car-features-title-icon" />
                        <h3 className="car-features-title-text">المميزات والكماليات</h3>
                      </div>

                      <div className="car-features-sections">
                        {/* المميزات المستخرجة من JSON - فقط إذا كانت موجودة */}
                        {hasExtractedFeatures && (
                          <div className="car-features-section car-features-section-extracted">
                            <CarFeaturesDisplay
                              features={(listing as any)?.extractedFeatures}
                              title="المميزات المحددة"
                              iconColor="text-blue-600"
                            />
                          </div>
                        )}

                        {/* المميزات العامة - فقط إذا كانت موجودة */}
                        {hasGeneralFeatures && (
                          <div className="car-features-section car-features-section-general">
                            <CarFeaturesDisplay
                              features={listing?.features}
                              title="المميزات العامة"
                              iconColor="text-gray-600"
                            />
                          </div>
                        )}

                        {/* المميزات الداخلية - فقط إذا كانت موجودة */}
                        {hasInteriorFeatures && (
                          <div className="car-features-section car-features-section-interior">
                            <CarFeaturesDisplay
                              features={listing?.interiorFeatures}
                              title="المميزات الداخلية"
                              iconColor="text-gray-600"
                            />
                          </div>
                        )}

                        {/* المميزات الخارجية - فقط إذا كانت موجودة */}
                        {hasExteriorFeatures && (
                          <div className="car-features-section car-features-section-exterior">
                            <CarFeaturesDisplay
                              features={listing?.exteriorFeatures}
                              title="المميزات الخارجية"
                              iconColor="text-gray-600"
                            />
                          </div>
                        )}

                        {/* المميزات التقنية - فقط إذا كانت موجودة */}
                        {hasTechnicalFeatures && (
                          <div className="car-features-section car-features-section-technical">
                            <CarFeaturesDisplay
                              features={listing?.technicalFeatures}
                              title="المميزات التقنية"
                              iconColor="text-gray-600"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* الكماليات المصنفة - عرض شامل لجميع الكماليات */}
                {(() => {
                  // جمع جميع الكماليات من المصادر المختلفة
                  const allFeatures: string[] = [];

                  // إضافة الكماليات من الحقول المختلفة
                  if (listing?.interiorFeatures && Array.isArray(listing.interiorFeatures)) {
                    allFeatures.push(...listing.interiorFeatures);
                  }
                  if (listing?.exteriorFeatures && Array.isArray(listing.exteriorFeatures)) {
                    allFeatures.push(...listing.exteriorFeatures);
                  }
                  if (listing?.technicalFeatures && Array.isArray(listing.technicalFeatures)) {
                    allFeatures.push(...listing.technicalFeatures);
                  }

                  // إضافة الكماليات من حقل features إذا كان نص JSON
                  if (listing?.features && typeof listing.features === 'string') {
                    try {
                      const parsedFeatures = JSON.parse(listing.features);
                      if (Array.isArray(parsedFeatures)) {
                        allFeatures.push(...parsedFeatures);
                      }
                    } catch (e) {
                      // تجاهل أخطاء التحليل
                    }
                  }

                  // إزالة التكرارات وتنظيف البيانات
                  const uniqueFeatures = Array.from(
                    new Set(
                      allFeatures.filter(
                        (feature) =>
                          feature &&
                          typeof feature === 'string' &&
                          feature.trim() !== '' &&
                          feature !== 'غير محدد' &&
                          feature !== 'غير متوفر',
                      ),
                    ),
                  );

                  return uniqueFeatures.length > 0 ? (
                    <div className="car-features-container">
                      <div className="car-features-title">
                        <SparklesIcon className="h-5 w-5 text-purple-600" />
                        <h3 className="car-features-title-text">جميع الكماليات والمميزات</h3>
                        <span className="text-sm text-gray-500">
                          ({uniqueFeatures.length} كمالية)
                        </span>
                      </div>
                      <CategorizedFeaturesDisplay features={uniqueFeatures} />
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Live Auction Component - معطل مؤقتاً */}
              {false && (
                <div className="mb-6 rounded-lg bg-blue-50 p-4 text-center text-blue-700">
                  مكون المزاد المباشر معطل مؤقتاً
                </div>
              )}

              {/* قسم المواصفات الشامل - نسخة كاملة من صفحة المزاد */}
              {(() => {
                // فحص وجود أي مواصفات - إصلاح: استخدام البيانات مباشرة من listing
                const hasSpecifications =
                  (listing as any)?.brand ||
                  (listing as any)?.model ||
                  (listing as any)?.year ||
                  (listing as any)?.condition ||
                  (listing as any)?.mileage ||
                  (listing as any)?.bodyType ||
                  (listing as any)?.fuelType ||
                  (listing as any)?.transmission ||
                  (listing as any)?.regionalSpec ||
                  (listing as any)?.regionalSpecs ||
                  (listing as any)?.color ||
                  (listing as any)?.exteriorColor ||
                  (listing as any)?.interiorColor ||
                  (listing as any)?.seatCount ||
                  (listing as any)?.vehicleType ||
                  (listing as any)?.manufacturingCountry ||
                  (listing as any)?.customsStatus ||
                  (listing as any)?.licenseStatus ||
                  (listing as any)?.engineSize ||
                  (listing as any)?.chassisNumber ||
                  (listing as any)?.engineNumber ||
                  (listing as any)?.city;

                // إخفاء القسم بالكامل إذا لم تكن هناك أي مواصفات
                if (!hasSpecifications) {
                  return null;
                }

                return (
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
                      {(listing as any)?.brand && (
                        <div className="car-spec-card spec-basic">
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
                                d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
                              ></path>
                            </svg>
                            <span>الماركة</span>
                          </div>
                          <div className="car-spec-value">
                            {(listing as any).brand || 'غير محدد'}
                          </div>
                        </div>
                      )}

                      {/* الموديل */}
                      {(listing as any)?.model && (
                        <div className="car-spec-card spec-basic">
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
                                d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                              ></path>
                            </svg>
                            <span>الموديل</span>
                          </div>
                          <div className="car-spec-value">
                            {(listing as any).model || 'غير محدد'}
                          </div>
                        </div>
                      )}

                      {/* سنة الصنع */}
                      {(listing as any)?.year !== undefined && (listing as any)?.year !== null && (
                        <div className="car-spec-card spec-basic">
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
                                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5"
                              ></path>
                            </svg>
                            <span>سنة الصنع</span>
                          </div>
                          <div className="car-spec-value">
                            {(listing as any).year || 'غير محدد'}
                          </div>
                        </div>
                      )}

                      {/* حالة السيارة */}
                      {(listing as any)?.condition && (
                        <div className="car-spec-card spec-basic">
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
                                d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"
                              ></path>
                            </svg>
                            <span>حالة السيارة</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic((listing as any).condition) ||
                              (listing as any).condition}
                          </div>
                        </div>
                      )}

                      {/* المسافة المقطوعة */}
                      {(listing as any).mileage !== undefined &&
                        (listing as any).mileage !== null && (
                          <div className="car-spec-card spec-basic">
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
                                  d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z"
                                ></path>
                              </svg>
                              <span>المسافة المقطوعة</span>
                            </div>
                            <div className="car-spec-value">{(listing as any).mileage} كم</div>
                          </div>
                        )}

                      {/* نوع الوقود */}
                      {(listing as any)?.fuelType && (
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
                              ></path>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
                              ></path>
                            </svg>
                            <span>نوع الوقود</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic((listing as any).fuelType) ||
                              (listing as any).fuelType}
                          </div>
                        </div>
                      )}

                      {/* ناقل الحركة */}
                      {(listing as any)?.transmission && (
                        <div className="car-spec-card spec-general">
                          <div className="car-spec-label">
                            <CogIcon className="car-spec-icon" />
                            <span>ناقل الحركة</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic((listing as any).transmission) ||
                              (listing as any).transmission}
                          </div>
                        </div>
                      )}

                      {/* نوع الهيكل */}
                      {(listing as any)?.bodyType && (
                        <div className="car-spec-card spec-general">
                          <div className="car-spec-label">
                            <TruckIcon className="car-spec-icon" />
                            <span>نوع الهيكل</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic((listing as any).bodyType) ||
                              (listing as any).bodyType}
                          </div>
                        </div>
                      )}

                      {/* سعة المحرك */}
                      {(listing as any).engineSize !== undefined &&
                        (listing as any).engineSize !== null && (
                          <div className="car-spec-card spec-general">
                            <div className="car-spec-label">
                              <CogIcon className="car-spec-icon" />
                              <span>سعة المحرك</span>
                            </div>
                            <div className="car-spec-value">{(listing as any).engineSize} لتر</div>
                          </div>
                        )}

                      {/* المواصفات الإقليمية */}
                      {(listing as any)?.regionalSpec && (
                        <div className="car-spec-card spec-design">
                          <div className="car-spec-label">
                            <GlobeAltIcon className="car-spec-icon" />
                            <span>المواصفات الإقليمية</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic((listing as any).regionalSpec) ||
                              (listing as any).regionalSpec}
                          </div>
                        </div>
                      )}

                      {/* اللون الخارجي */}
                      {(listing as any)?.exteriorColor && (
                        <div className="car-spec-card spec-design">
                          <div className="car-spec-label">
                            <PaintBrushIcon className="car-spec-icon" />
                            <span>اللون الخارجي</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic((listing as any).exteriorColor) ||
                              (listing as any).exteriorColor}
                          </div>
                        </div>
                      )}

                      {/* اللون الداخلي */}
                      {(listing as any)?.interiorColor && (
                        <div className="car-spec-card spec-design">
                          <div className="car-spec-label">
                            <PaintBrushIcon className="car-spec-icon" />
                            <span>اللون الداخلي</span>
                          </div>
                          <div className="car-spec-value">
                            {translateToArabic((listing as any).interiorColor) ||
                              (listing as any).interiorColor}
                          </div>
                        </div>
                      )}

                      {/* عدد المقاعد */}
                      {(listing as any).seatCount !== undefined &&
                        (listing as any).seatCount !== null && (
                          <div className="car-spec-card spec-design">
                            <div className="car-spec-label">
                              <UserGroupIcon className="car-spec-icon" />
                              <span>عدد المقاعد</span>
                            </div>
                            <div className="car-spec-value">{(listing as any).seatCount} مقعد</div>
                          </div>
                        )}

                      {/* رقم الشاسيه */}
                      {(listing as any)?.chassisNumber && (
                        <div className="car-spec-card spec-technical">
                          <div className="car-spec-label">
                            <ClipboardDocumentIcon className="car-spec-icon" />
                            <span>رقم الشاسيه</span>
                          </div>
                          <div className="car-spec-value">{(listing as any).chassisNumber}</div>
                        </div>
                      )}

                      {/* رقم المحرك */}
                      {(listing as any)?.engineNumber && (
                        <div className="car-spec-card spec-technical">
                          <div className="car-spec-label">
                            <ClipboardDocumentIcon className="car-spec-icon" />
                            <span>رقم المحرك</span>
                          </div>
                          <div className="car-spec-value">{(listing as any).engineNumber}</div>
                        </div>
                      )}

                      {/* المدينة */}
                      {(listing as any)?.city && (
                        <div className="car-spec-card spec-basic">
                          <div className="car-spec-label">
                            <BuildingOfficeIcon className="car-spec-icon" />
                            <span>المدينة</span>
                          </div>
                          <div className="car-spec-value">{(listing as any).city}</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* قسم موقع السيارة - تصميم متقدم */}
              <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                <div className="border-b border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        aria-hidden="true"
                        data-slot="icon"
                        className="h-5 w-5 text-red-500"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                        ></path>
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                        ></path>
                      </svg>
                      <h3 className="font-semibold text-gray-900">موقع السيارة</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <button
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                          title="مشاركة الموقع"
                          onClick={() => {
                            // مشاركة الموقع
                            if (navigator.share) {
                              navigator.share({
                                title: 'موقع السيارة',
                                text:
                                  (listing as any).locationAddress ||
                                  listing.location ||
                                  'موقع السيارة',
                                url: window.location.href,
                              });
                            }
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            aria-hidden="true"
                            data-slot="icon"
                            className="h-4 w-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z"
                            ></path>
                          </svg>
                        </button>
                      </div>
                      <button
                        className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="عرض الخريطة"
                        onClick={() => {
                          // عرض الخريطة أو توسيط العرض
                          showNotification('success', 'سيتم إضافة عرض الخريطة قريباً');
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          aria-hidden="true"
                          data-slot="icon"
                          className="h-4 w-4"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                          ></path>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          ></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div className="p-4">
                  {(listing as any).locationAddress || listing.location ? (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            aria-hidden="true"
                            data-slot="icon"
                            className="h-5 w-5 text-red-600"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                            ></path>
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                            ></path>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="mb-1 font-medium text-gray-900">
                            {(listing as any).locationAddress || listing.location || 'طرابلس'}
                          </div>
                          <div className="text-sm text-gray-500">
                            يمكنك التواصل مع البائع للحصول على معلومات أكثر تفصيلاً عن الموقع
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                          onClick={() => {
                            const location =
                              (listing as any).locationAddress ||
                              listing.location ||
                              'طرابلس، ليبيا';
                            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
                            window.open(googleMapsUrl, '_blank');
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            aria-hidden="true"
                            data-slot="icon"
                            className="h-4 w-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
                            ></path>
                          </svg>
                          فتح في خرائط جوجل
                        </button>
                        <button
                          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                          onClick={() => {
                            const location =
                              (listing as any).locationAddress ||
                              listing.location ||
                              'طرابلس، ليبيا';
                            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}`;
                            window.open(directionsUrl, '_blank');
                          }}
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            aria-hidden="true"
                            data-slot="icon"
                            className="h-4 w-4"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                            ></path>
                          </svg>
                          الحصول على التوجيهات
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="h-5 w-5 text-gray-400"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                          ></path>
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                          ></path>
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 font-medium text-gray-900">لا يوجد عنوان محدد</div>
                        <div className="text-sm text-gray-500">
                          يمكنك التواصل مع البائع للحصول على معلومات عن الموقع
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* قسم المميزات والكماليات - نسخة كاملة من صفحة المزاد */}
              {(() => {
                // التحقق من وجود مميزات
                const hasGeneralFeatures =
                  (listing as any).features?.general &&
                  (listing as any).features.general.length > 0;
                const hasInteriorFeatures =
                  (listing as any).features?.interior &&
                  (listing as any).features.interior.length > 0;
                const hasExteriorFeatures =
                  (listing as any).features?.exterior &&
                  (listing as any).features.exterior.length > 0;
                const hasSafetyFeatures =
                  (listing as any).features?.safety && (listing as any).features.safety.length > 0;
                const hasTechnologyFeatures =
                  (listing as any).features?.technology &&
                  (listing as any).features.technology.length > 0;

                const hasAnyFeatures =
                  hasGeneralFeatures ||
                  hasInteriorFeatures ||
                  hasExteriorFeatures ||
                  hasSafetyFeatures ||
                  hasTechnologyFeatures;

                if (!hasAnyFeatures) {
                  return null;
                }

                return (
                  <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <SparklesIcon className="h-5 w-5 text-purple-600" />
                      المميزات
                    </h3>

                    <div className="space-y-4">
                      {/* المميزات العامة */}
                      {hasGeneralFeatures && (
                        <CarFeaturesDisplay
                          features={(listing as any).features.general}
                          title="المميزات العامة"
                          iconColor="text-blue-500"
                        />
                      )}

                      {/* المميزات الداخلية */}
                      {hasInteriorFeatures && (
                        <CarFeaturesDisplay
                          features={(listing as any).features.interior}
                          title="المميزات الداخلية"
                          iconColor="text-green-500"
                        />
                      )}

                      {/* المميزات الخارجية */}
                      {hasExteriorFeatures && (
                        <CarFeaturesDisplay
                          features={(listing as any).features.exterior}
                          title="المميزات الخارجية"
                          iconColor="text-purple-500"
                        />
                      )}

                      {/* مميزات الأمان */}
                      {hasSafetyFeatures && (
                        <CarFeaturesDisplay
                          features={(listing as any).features.safety}
                          title="مميزات الأمان"
                          iconColor="text-red-500"
                        />
                      )}

                      {/* التقنيات المتقدمة */}
                      {hasTechnologyFeatures && (
                        <CarFeaturesDisplay
                          features={(listing as any).features.technology}
                          title="التقنيات المتقدمة"
                          iconColor="text-orange-500"
                        />
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* تقرير الفحص المفصل */}
              {(listing as any).hasInspectionReport ||
              (listing as any).hasManualInspectionReport ||
              (listing as any).inspectionReport ? (
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">تقرير الفحص</h3>
                  </div>

                  {/* تقييم شامل */}
                  <div className="mb-4 rounded-lg bg-green-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium text-gray-900">التقييم الشامل:</span>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                        {(listing as any).inspectionReport?.manualData?.overallRating ||
                          (listing as any).manualInspectionData?.overallRating ||
                          'جيد'}
                      </span>
                    </div>

                    {/* تفاصيل الفحص */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                      {[
                        { key: 'engineCondition', label: 'المحرك', icon: CogIcon },
                        { key: 'bodyCondition', label: 'الهيكل', icon: TruckIcon },
                        { key: 'interiorCondition', label: 'الداخلية', icon: SparklesIcon },
                        { key: 'tiresCondition', label: 'الإطارات', icon: DocumentCheckIcon },
                        { key: 'electricalCondition', label: 'كهربائي', icon: FireIcon },
                      ].map(({ key, label, icon: Icon }) => {
                        const condition =
                          (listing as any).inspectionReport?.manualData?.[key] ||
                          (listing as any).manualInspectionData?.[key] ||
                          'غير محدد';

                        const getConditionColor = (cond: string) => {
                          const c = cond.toLowerCase();
                          if (c.includes('ممتاز')) return 'text-green-600';
                          if (c.includes('جيد')) return 'text-blue-600';
                          if (c.includes('متوسط')) return 'text-yellow-600';
                          if (c.includes('ضعيف')) return 'text-red-600';
                          return 'text-gray-600';
                        };

                        return (
                          <div key={key} className="text-center">
                            <Icon className="mx-auto mb-1 h-5 w-5 text-gray-600" />
                            <p className="text-xs font-medium text-gray-900">{label}</p>
                            <p className={`text-xs ${getConditionColor(condition)}`}>{condition}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ملاحظات الفحص */}
                  {((listing as any).inspectionReport?.manualData?.notes ||
                    (listing as any).manualInspectionData?.notes) && (
                    <div className="mb-4 rounded-lg bg-gray-50 p-4">
                      <h4 className="mb-2 font-medium text-gray-900">ملاحظات الفاحص:</h4>
                      <p className="text-sm text-gray-700">
                        {(listing as any).inspectionReport?.manualData?.notes ||
                          (listing as any).manualInspectionData?.notes}
                      </p>
                    </div>
                  )}

                  {/* رابط تحميل التقرير */}
                  {((listing as any).inspectionReportFileUrl ||
                    (listing as any).inspectionReport?.reportUrl) && (
                    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">تقرير الفحص المفصل</p>
                        <p className="text-xs text-blue-700">
                          {(listing as any).inspectionReportFileName ||
                            (listing as any).inspectionReport?.reportFileName ||
                            'تقرير_فحص_السيارة.pdf'}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          const url =
                            (listing as any).inspectionReportFileUrl ||
                            (listing as any).inspectionReport?.reportUrl;
                          window.open(url, '_blank');
                        }}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        تحميل
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* تقرير الفحص المفصل */}
              {((listing as any).hasInspectionReport ||
                (listing as any).hasManualInspectionReport) && (
                <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">تقرير الفحص</h3>
                  </div>

                  {/* تقييم شامل */}
                  <div className="mb-4 rounded-lg bg-green-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="font-medium text-gray-900">التقييم الشامل:</span>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-semibold text-green-800">
                        {(listing as any).manualInspectionData?.overallRating || 'جيد'}
                      </span>
                    </div>

                    {/* تفاصيل الفحص */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
                      {[
                        { key: 'engineCondition', label: 'المحرك', icon: CogIcon },
                        { key: 'bodyCondition', label: 'الهيكل', icon: TruckIcon },
                        { key: 'interiorCondition', label: 'الداخلية', icon: SparklesIcon },
                        { key: 'tiresCondition', label: 'الإطارات', icon: DocumentCheckIcon },
                        { key: 'electricalCondition', label: 'كهربائي', icon: FireIcon },
                      ].map(({ key, label, icon: Icon }) => {
                        const condition =
                          (listing as any).manualInspectionData?.[key] || 'غير محدد';

                        const getConditionColor = (cond: string) => {
                          const c = cond.toLowerCase();
                          if (c.includes('ممتاز')) return 'text-green-600';
                          if (c.includes('جيد')) return 'text-blue-600';
                          if (c.includes('متوسط')) return 'text-yellow-600';
                          if (c.includes('ضعيف')) return 'text-red-600';
                          return 'text-gray-600';
                        };

                        return (
                          <div key={key} className="text-center">
                            <Icon className="mx-auto mb-1 h-5 w-5 text-gray-600" />
                            <p className="text-xs font-medium text-gray-900">{label}</p>
                            <p className={`text-xs ${getConditionColor(condition)}`}>{condition}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* ملاحظات الفحص */}
                  {(listing as any).manualInspectionData?.notes && (
                    <div className="mb-4 rounded-lg bg-gray-50 p-4">
                      <h4 className="mb-2 font-medium text-gray-900">ملاحظات الفاحص:</h4>
                      <p className="text-sm text-gray-700">
                        {(listing as any).manualInspectionData.notes}
                      </p>
                    </div>
                  )}

                  {/* رابط تحميل التقرير */}
                  {(listing as any).inspectionReportFileUrl && (
                    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3">
                      <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">تقرير الفحص المفصل</p>
                        <p className="text-xs text-blue-700">تقرير_فحص_السيارة.pdf</p>
                      </div>
                      <button
                        onClick={() => {
                          window.open((listing as any).inspectionReportFileUrl, '_blank');
                        }}
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                      >
                        تحميل
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* قسم التقييمات والمراجعات - في نهاية الصفحة */}
              <ReviewsAndRatings
                itemId={listing.id}
                itemType="car"
                itemTitle={listing.title || 'سيارة للبيع'}
                targetUserId={(listing.seller as any)?.id || (listing as any)?.sellerId || ''}
                showQuickRating={true}
                showRatingStats={true}
                className="mb-6"
              />
            </div>

            {/* Right Column - Seller Info and Contact */}
            <div className="space-y-6">
              {/* قسم الاتصال والسعر */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                {/* عرض السعر */}
                <div className="mb-6 text-center">
                  <div className="mb-2 text-3xl font-bold text-green-600">
                    السعر: {formatPrice(listing.price)}
                  </div>
                  {(listing as any).originalPrice && (
                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
                      خصم 10%
                    </span>
                  )}
                </div>

                {/* أزرار الاتصال */}
                <div className="space-y-3">
                  {/* زر عرض/إخفاء رقم الهاتف */}
                  <button
                    onClick={handleContactClick}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all duration-200 ${
                      user
                        ? 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
                        : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                    }`}
                  >
                    <PhoneIcon className="h-5 w-5" />
                    {user ? (
                      showContactInfo ? (
                        <span dir="ltr">{listing.contact.phone}</span>
                      ) : (
                        'إظهار رقم الهاتف'
                      )
                    ) : (
                      'سجل دخولك لعرض الرقم'
                    )}
                  </button>

                  {/* أزرار الاتصال المباشر - تظهر فقط على الهواتف المحمولة */}
                  {user && showContactInfo && listing.contact.phone !== 'غير متوفر' && (
                    <div className="grid grid-cols-2 gap-2 md:hidden">
                      <button
                        onClick={handleDirectCall}
                        className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white transition-all duration-200 hover:bg-blue-700 active:scale-95"
                      >
                        <DevicePhoneMobileIcon className="h-4 w-4" />
                        اتصال مباشر
                      </button>
                    </div>
                  )}

                  {/* زر إرسال رسالة */}
                  <button
                    onClick={handleSendMessage}
                    className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all duration-200 ${
                      user
                        ? 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
                        : 'bg-gray-600 text-white hover:bg-gray-700 active:scale-95'
                    }`}
                  >
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    {user ? 'إرسال رسالة' : 'سجل دخولك للمراسلة'}
                  </button>

                  {/* زر مركز الاتصال */}
                  <button
                    onClick={() => {
                      if (!user) {
                        requireLogin('للوصول إلى مركز الاتصال');
                        return;
                      }
                      showNotification('success', 'جاري فتح مركز الاتصال...');
                      setTimeout(() => {
                        router.push('/messages');
                      }, 300);
                    }}
                    className={`relative flex w-full items-center justify-center gap-2 rounded-xl py-3 font-semibold transition-all duration-200 ${
                      user
                        ? 'border border-gray-300 bg-white text-gray-900 shadow-md hover:bg-gray-50 hover:shadow-lg active:scale-95'
                        : 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-50 active:scale-95'
                    }`}
                  >
                    {/* مؤشر الرسائل الجديدة */}
                    {user && (
                      <div className="absolute -left-1 -top-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-sm">
                        3
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-3">
                      {/* أيقونة مركز الاتصال - سماعة رأس */}
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="h-6 w-6 text-gray-700"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H3a.75.75 0 01-.75-.75V9a.75.75 0 01.75-.75h3.75z"
                        />
                      </svg>
                      <span className="font-bold text-gray-900">مركز الاتصال</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* البائع */}
              <ImprovedSellerInfoCard
                seller={{
                  id: (listing.seller as any).id || 'unknown',
                  name: listing.seller.name,
                  phone: listing.contact?.phone || 'غير متوفر',
                  profileImage: listing.seller.avatar,
                  verified: listing.seller.verified,
                  accountType: (listing.seller as any).accountType,
                  rating: listing.seller.rating,
                  reviewsCount: listing.seller.reviews,
                  city: (listing as any).city,
                  activeListings: listing.seller.activeListings,
                }}
                clickable
                showActions
                onContact={() => {
                  if (listing.contact?.phone) {
                    window.open(`tel:${listing.contact.phone}`, '_self');
                  }
                }}
                onMessage={() => {
                  setShowContactModal(true);
                }}
              />

              {/* إعلانات أخرى من نفس البائع */}
              {listing?.seller?.activeListings > 1 && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-gray-900">
                    إعلانات أخرى من نفس البائع
                  </h3>
                  <div className="py-8 text-center text-gray-500">
                    <p>سيتم عرض الإعلانات الأخرى للبائع هنا</p>
                    <p className="mt-2 text-sm">({listing.seller.activeListings} إعلانات نشطة)</p>
                  </div>
                </div>
              )}

              {/* الإبلاغ عن الإعلان */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <button className="flex w-full items-center justify-center gap-2 text-sm font-medium text-red-600 transition-colors hover:text-red-800">
                  <ExclamationTriangleIcon className="h-4 w-4" />
                  الإبلاغ عن هذا الإعلان
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* نافذة المحادثة */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">بدء محادثة</h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">رسالتك</label>
                <textarea
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="اكتب رسالتك هنا..."
                ></textarea>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50"
                >
                  إلغاء
                </button>
                <button
                  onClick={() => {
                    alert('تم إرسال رسالتك بنجاح!');
                    setShowContactModal(false);
                  }}
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                >
                  إرسال
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* نافذة تسجيل الدخول */}
      <LoginModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onLoginSuccess={handleAuthSuccess}
      />

      {/* نصائح الأمان */}
      <div className="container mx-auto px-4 py-8">
        <SafetyTips />
      </div>
    </>
  );
};

export default MarketplaceCarDetails;

// استخدام getServerSideProps بدلاً من getStaticProps لضمان جلب البيانات الحديثة
export async function getServerSideProps({ params }: { params: { id: string } }) {
  try {
    // استيراد النظام الموحد للسيارات
    const { getVehicleWithImages } = await import('../../lib/services/universal/vehicleService');

    // استيراد fs و path للتحقق من وجود الملفات
    const fs = await import('fs');
    const path = await import('path');

    // دالة مساعدة لمعالجة الصور من حقل images القديم
    const parseImagesField = (imagesData: string | string[] | null | undefined): string[] => {
      if (!imagesData) return [];

      // إذا كانت بالفعل مصفوفة
      if (Array.isArray(imagesData)) {
        return imagesData.filter((img) => img && typeof img === 'string' && img.trim());
      }

      // إذا كانت string
      if (typeof imagesData === 'string') {
        const trimmed = imagesData.trim();
        if (!trimmed) return [];

        // محاولة تحليل JSON
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed.filter((img) => img && typeof img === 'string' && img.trim());
            }
            return [trimmed];
          } catch {
            // إذا فشل التحليل، اعتبرها رابط واحد
            return [trimmed];
          }
        }

        // إذا كانت تحتوي فواصل
        if (trimmed.includes(',')) {
          return trimmed
            .split(',')
            .map((s) => s.trim())
            .filter((s) => s);
        }

        // رابط واحد
        return [trimmed];
      }

      return [];
    };

    // دالة للتحقق من وجود الصور الفعلية وفلترة المفقودة
    const filterExistingImages = (images: string[]): string[] => {
      const existingImages: string[] = [];
      const publicDir = path.join(process.cwd(), 'public');

      for (const img of images) {
        // تخطي الصور الافتراضية
        if (img.includes('default-car.svg')) {
          existingImages.push(img);
          continue;
        }

        // تخطي الروابط الخارجية
        if (img.startsWith('http://') || img.startsWith('https://')) {
          existingImages.push(img);
          continue;
        }

        // بناء المسار الكامل
        const imagePath = img.startsWith('/') ? img : `/${img}`;
        const fullPath = path.join(publicDir, imagePath);

        try {
          if (fs.existsSync(fullPath)) {
            existingImages.push(img);
          } else {
            console.warn(`⚠️ صورة مفقودة: ${img}`);
          }
        } catch {
          console.warn(`⚠️ خطأ في فحص الصورة: ${img}`);
        }
      }

      return existingImages;
    };

    // محاولة الكاش أولاً
    const cacheKey = `marketplace:car:${params.id}`;
    const cached = await advancedCache.get<{ listingId: string; listing: any }>(cacheKey, {
      namespace: CacheNamespaces.CARS,
    });
    if (cached) {
      return {
        props: cached,
      };
    }

    // جلب بيانات السيارة باستخدام النظام الموحد
    console.log(`🔍 محاولة جلب السيارة بالمعرف: ${params.id}`);
    const car = await getVehicleWithImages(params.id);

    if (!car) {
      console.log(`❌ السيارة ${params.id} غير موجودة في قاعدة البيانات`);

      // محاولة البحث بطريقة أخرى لمعرفة المشكلة
      const { dbHelpers } = await import('../../lib/prisma');
      const directCar = await dbHelpers.getCarById(params.id);

      if (directCar) {
        console.log(`✅ تم العثور على السيارة باستخدام dbHelpers، المشكلة في getVehicleWithImages`);
        // استخدام البيانات من dbHelpers بدلاً من البيانات الافتراضية
        const listing = {
          id: directCar.id,
          title: directCar.title || `${directCar.brand} ${directCar.model} ${directCar.year}`,
          price:
            typeof directCar.price === 'number'
              ? directCar.price.toLocaleString('ar') + ' د.ل'
              : directCar.price || '0 د.ل',
          description: directCar.description || 'وصف غير متوفر',
          location: directCar.location || 'غير محدد',
          brand: directCar.brand,
          model: directCar.model,
          year: directCar.year,
          condition: directCar.condition,
          mileage: directCar.mileage,
          fuelType: directCar.fuelType,
          transmission: directCar.transmission,
          bodyType: directCar.bodyType,
          color: directCar.color,
          interiorColor: directCar.interiorColor,
          seatCount: directCar.seatCount,
          regionalSpecs: directCar.regionalSpecs,
          vehicleType: directCar.vehicleType,
          manufacturingCountry: directCar.manufacturingCountry,
          chassisNumber: directCar.chassisNumber,
          engineNumber: directCar.engineNumber,
          customsStatus: directCar.customsStatus,
          licenseStatus: directCar.licenseStatus,
          views: directCar.views || 0,
          favorites: 0,
          date: directCar.createdAt
            ? new Date(directCar.createdAt).toLocaleDateString('ar-LY')
            : new Date().toLocaleDateString('ar-LY'),
          images: (() => {
            let allImages: string[] = [];

            // أولاً: الصور من جدول car_images
            if (directCar.car_images && directCar.car_images.length > 0) {
              allImages = directCar.car_images.map((img: any) => img.fileUrl);
            }
            // ثانياً: الصور من حقل images القديم
            else {
              allImages = parseImagesField(directCar.images);
            }

            // فلترة الصور الموجودة فعلياً
            const existingImages = filterExistingImages(allImages);

            if (existingImages.length > 0) {
              console.log(
                `✅ تم العثور على ${existingImages.length} صورة موجودة من أصل ${allImages.length}`,
              );
              return existingImages;
            }

            // الصورة الافتراضية
            console.log(`⚠️ لا توجد صور فعلية للسيارة ${directCar.id}، استخدام الصورة الافتراضية`);
            return ['/images/cars/default-car.svg'];
          })(),

          // المميزات المصنفة
          features: directCar.features ? JSON.parse(directCar.features) : {},
          interiorFeatures: directCar.interiorFeatures
            ? JSON.parse(directCar.interiorFeatures)
            : [],
          exteriorFeatures: directCar.exteriorFeatures
            ? JSON.parse(directCar.exteriorFeatures)
            : [],
          technicalFeatures: directCar.technicalFeatures
            ? JSON.parse(directCar.technicalFeatures)
            : [],

          // بيانات البائع
          seller: {
            id: directCar.users?.id || 'unknown',
            name: directCar.users?.name || 'بائع السيارة',
            phone: directCar.contactPhone || directCar.users?.phone || '',
            rating: directCar.users?.rating || 0,
            reviews: 0,
            verified: directCar.users?.verified || false,
            memberSince: directCar.createdAt
              ? new Date(directCar.createdAt).getFullYear().toString()
              : new Date().getFullYear().toString(),
            activeListings: 1,
            avatar: directCar.users?.profileImage || '/images/default-avatar.svg',
            accountType: directCar.users?.accountType || 'REGULAR_USER',
          },
          contact: {
            phone: directCar.contactPhone || directCar.users?.phone || '',
            email: directCar.users?.email || '',
          },

          // تقرير الفحص
          inspectionReport: {
            hasReport: directCar.hasManualInspectionReport || !!directCar.inspectionReportFileUrl,
            reportUrl: directCar.inspectionReportFileUrl || null,
            reportFileName: directCar.inspectionReportFileName || null,
            manualData:
              typeof directCar.manualInspectionData === 'string'
                ? JSON.parse(directCar.manualInspectionData)
                : (directCar.manualInspectionData ?? null),
          },

          // بيانات الموقع
          locationLat: directCar.locationLat || null,
          locationLng: directCar.locationLng || null,
          locationAddress: directCar.locationAddress || null,
          coordinates:
            directCar.locationLat && directCar.locationLng
              ? { lat: directCar.locationLat, lng: directCar.locationLng }
              : null,
        };

        const propsPayload = {
          props: {
            listingId: params.id,
            listing: JSON.parse(JSON.stringify(listing)),
          },
        };

        // حفظ في الكاش
        await advancedCache.set(cacheKey, propsPayload.props, {
          namespace: CacheNamespaces.CARS,
          tags: [CacheTags.CAR_DETAILS],
          ttl: 120,
        });

        return propsPayload;
      } else {
        console.log(
          `❌ السيارة ${params.id} غير موجودة نهائياً في قاعدة البيانات، استخدام البيانات الافتراضية`,
        );
        // سيتم إنشاء البيانات الافتراضية في كتلة else أدناه
      }
    }

    // إذا وُجدت السيارة في النظام الموحد، تحويل البيانات للصفحة
    const listing = {
      id: car.id,
      title: car.title || `${car.brand} ${car.model} ${car.year}`,
      price:
        typeof car.price === 'number'
          ? car.price.toLocaleString('ar') + ' د.ل'
          : car.price || '0 د.ل',
      description: car.description || 'وصف غير متوفر',
      location: car.location || 'غير محدد',
      brand: car.brand,
      model: car.model,
      year: car.year,
      condition: car.condition,
      mileage: car.mileage,
      fuelType: (car as any).fuelType,
      transmission: (car as any).transmission,
      bodyType: (car as any).bodyType,
      color: (car as any).color,
      interiorColor: (car as any).interiorColor,
      seatCount: (car as any).seatCount,
      regionalSpecs: (car as any).regionalSpecs,
      vehicleType: (car as any).vehicleType,
      manufacturingCountry: (car as any).manufacturingCountry,
      chassisNumber: (car as any).chassisNumber,
      engineNumber: (car as any).engineNumber,
      customsStatus: (car as any).customsStatus,
      licenseStatus: (car as any).licenseStatus,
      views: (car as any).views || 0,
      favorites: 0,
      date: car.createdAt
        ? new Date(car.createdAt).toLocaleDateString('ar-LY')
        : new Date().toLocaleDateString('ar-LY'),

      // الصور
      images: (() => {
        let allImages: string[] = [];

        // أولاً: الصور من جدول car_images
        if (car.carImages && car.carImages.length > 0) {
          allImages = car.carImages.map((img) => img.fileUrl);
        }
        // ثانياً: الصور من حقل images القديم
        else {
          allImages = parseImagesField(car.images);
        }

        // فلترة الصور الموجودة فعلياً
        const existingImages = filterExistingImages(allImages);

        if (existingImages.length > 0) {
          console.log(
            `✅ تم العثور على ${existingImages.length} صورة موجودة من أصل ${allImages.length} للسيارة ${car.id}`,
          );
          return existingImages;
        }

        // الصورة الافتراضية
        console.log(`⚠️ لا توجد صور فعلية للسيارة ${car.id}، استخدام الصورة الافتراضية`);
        return ['/images/cars/default-car.svg'];
      })(),

      // المميزات
      features: car.features
        ? typeof car.features === 'string'
          ? JSON.parse(car.features)
          : car.features
        : {},
      interiorFeatures: (car as any).interiorFeatures
        ? typeof (car as any).interiorFeatures === 'string'
          ? JSON.parse((car as any).interiorFeatures)
          : (car as any).interiorFeatures
        : [],
      exteriorFeatures: (car as any).exteriorFeatures
        ? typeof (car as any).exteriorFeatures === 'string'
          ? JSON.parse((car as any).exteriorFeatures)
          : (car as any).exteriorFeatures
        : [],
      technicalFeatures: (car as any).technicalFeatures
        ? typeof (car as any).technicalFeatures === 'string'
          ? JSON.parse((car as any).technicalFeatures)
          : (car as any).technicalFeatures
        : [],

      // بيانات البائع
      seller: {
        id: car.seller?.id || (car as any).sellerId || 'unknown',
        name: car.seller?.name || 'بائع السيارة',
        phone: (car as any).contactPhone || car.seller?.phone || '',
        rating: car.seller?.rating || 0,
        reviews: 0,
        verified: car.seller?.verified || false,
        memberSince: car.createdAt
          ? new Date(car.createdAt).getFullYear().toString()
          : new Date().getFullYear().toString(),
        activeListings: 1,
        avatar: car.seller?.profileImage || '/images/default-avatar.svg',
        accountType: car.seller?.accountType || 'REGULAR_USER',
      },
      contact: {
        phone: (car as any).contactPhone || car.seller?.phone || '',
        email: car.seller?.email || '',
      },

      // إضافة city للتوافق مع SellerInfoSimple
      city: car.location || 'طرابلس',

      // تقرير الفحص - من قاعدة البيانات
      inspectionReport: {
        hasReport: (car as any).hasManualInspectionReport || !!(car as any).inspectionReportFileUrl,
        reportUrl: (car as any).inspectionReportFileUrl || null,
        reportFileName: (car as any).inspectionReportFileName || null,
        manualData:
          typeof (car as any).manualInspectionData === 'string'
            ? JSON.parse((car as any).manualInspectionData)
            : ((car as any).manualInspectionData ?? null),
      },

      // بيانات الموقع - من قاعدة البيانات
      locationLat: (car as any).locationLat || null,
      locationLng: (car as any).locationLng || null,
      locationAddress: (car as any).locationAddress || null,

      // تسجيل بيانات الموقع للتشخيص
      ...(process.env.NODE_ENV === 'development' && {
        _debug_location: {
          locationLat: (car as any).locationLat,
          locationLng: (car as any).locationLng,
          locationAddress: (car as any).locationAddress,
        },
      }),

      // إضافة coordinates object للتوافق مع CarLocationDisplay
      coordinates:
        (car as any).locationLat && (car as any).locationLng
          ? {
              lat: (car as any).locationLat,
              lng: (car as any).locationLng,
            }
          : null,
    };

    const propsPayload = {
      props: {
        listingId: params.id,
        listing: JSON.parse(JSON.stringify(listing)), // تأكد من إمكانية التسلسل
      },
    };

    // حفظ في الكاش لمدة قصيرة
    await advancedCache.set(cacheKey, propsPayload.props, {
      namespace: CacheNamespaces.CARS,
      tags: [CacheTags.CAR_DETAILS],
      ttl: 120,
    });

    return propsPayload;
  } catch (error) {
    console.error('خطأ في جلب بيانات السيارة:', error);
    // عودة إلى بيانات افتراضية بدلاً من 404 لضمان عمل الصفحة دائماً
    const defaultListing = {
      id: params.id,
      title: 'سيارة للبيع',
      price: 0,
      description: 'وصف غير متوفر',
      location: 'غير محدد',
      views: 0,
      favorites: 0,
      date: new Date().toLocaleDateString('ar-LY'),
      images: ['/images/cars/default-car.svg'],
      features: {},
      interiorFeatures: [],
      exteriorFeatures: [],
      technicalFeatures: [],
      specifications: {
        brand: 'غير محدد',
        model: 'غير محدد',
        year: new Date().getFullYear().toString(),
        mileage: 'غير محدد',
        fuel: 'غير محدد',
        fuelType: 'غير محدد',
        transmission: 'غير محدد',
        color: 'غير محدد',
        bodyType: 'غير محدد',
      },
      seller: {
        id: 'unknown',
        name: 'بائع السيارة',
        phone: '',
        rating: 0,
        reviews: 0,
        verified: false,
        memberSince: new Date().getFullYear().toString(),
        activeListings: 0,
        avatar: '/images/default-avatar.svg',
        accountType: 'REGULAR_USER',
      },
      contact: {
        phone: '',
        email: '',
      },
      coordinates: null,
      locationLat: null,
      locationLng: null,
      locationAddress: null,
    };

    return {
      props: {
        listingId: params.id,
        listing: defaultListing,
      },
    };
  }
}
