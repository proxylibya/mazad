import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import CameraIcon from '@heroicons/react/24/outline/CameraIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import DocumentTextIcon from '@heroicons/react/24/outline/DocumentTextIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import StarIcon from '@heroicons/react/24/outline/StarIcon';
import TruckIcon from '@heroicons/react/24/outline/TruckIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Notification from '../../components/Notification';
import { Layout } from '../../components/common';
import ReviewsAndRatings from '../../components/common/ReviewsAndRatings';
import { FuelIcon } from '../../components/ui/MissingIcons';
import { useFavorites } from '../../hooks/useFavorites';
import { useStartConversation } from '../../hooks/useStartConversation';
import { useAnalytics } from '../../lib/hooks/useAnalytics';
import {
  convertToEnglishNumbers,
  formatDate,
  formatDistance,
  formatPhoneNumber,
  formatPrice,
  formatYear,
} from '../../utils/numberConverter';

interface CarData {
  id: string;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  condition: string;
  mileage?: number;
  location: string;
  description?: string;
  features: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  color?: string;
  images: string;
  contactPhone?: string;
  sellerId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  seller?: {
    name: string;
    phone: string;
    verified: boolean;
    rating: number;
    reviewsCount: number;
  };
}

const CarDetailsPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { trackCarView } = useAnalytics();
  const { startConversation, loading: messageLoading } = useStartConversation();

  const [car, setCar] = useState<CarData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isFavorite, toggleFavorite } = useFavorites();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [notification, setNotification] = useState({
    show: false,
    type: 'info' as 'success' | 'error' | 'info' | 'warning',
    title: '',
    message: '',
  });

  // تم نقل منطق التقييم السريع إلى مكون ReviewsAndRatings الموحد
  // لا حاجة لتكرار الكود هنا

  // دالة عرض الإشعار
  const showNotification = (
    type: 'success' | 'error' | 'info' | 'warning',
    title: string,
    message?: string,
  ) => {
    setNotification({
      show: true,
      type,
      title,
      message: message || '',
    });
  };

  // دالة الإعجاب
  const handleFavorite = async () => {
    try {
      const { id } = router.query;
      if (id && typeof id === 'string') {
        const success = await toggleFavorite(id);

        if (success) {
          const isNowFavorite = isFavorite(id);
          if (isNowFavorite) {
            showNotification('success', 'تم الإعجاب', 'تمت إضافة السيارة إلى المفضلة');
          } else {
            showNotification('info', 'تم الإلغاء', 'تمت إزالة السيارة من المفضلة');
          }
        } else {
          showNotification('error', 'خطأ', 'فشل في حفظ الإعجاب');
        }
      }
    } catch (error) {
      showNotification('error', 'خطأ', 'فشل في حفظ الإعجاب');
    }
  };

  // جلب بيانات السيارة
  useEffect(() => {
    if (!id) return;

    const fetchCarData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/cars/${id}`);

        if (!response.ok) {
          throw new Error('فشل في جلب بيانات السيارة');
        }

        const data = await response.json();

        if (data.success && data.data) {
          setCar(data.data);

          // تتبع مشاهدة السيارة
          trackCarView(data.data.id, {
            title: data.data.title,
            brand: data.data.brand,
            price: data.data.price,
          });
        } else {
          setError(data.error || 'السيارة غير موجودة');
        }
      } catch (err) {
        console.error('خطأ في جلب بيانات السيارة:', err);
        setError('حدث خطأ في تحميل بيانات السيارة');
      } finally {
        setLoading(false);
      }
    };

    fetchCarData();
  }, [id, trackCarView]);

  // دالة المشاركة
  const handleShare = async () => {
    if (!car) return;

    try {
      if (navigator.share) {
        await navigator.share({
          title: car.title,
          text: `شاهد هذه السيارة الرائعة: ${car.title} - بسعر ${formatPrice(car.price)}`,
          url: window.location.href,
        });
        showNotification('success', 'تم المشاركة', 'تمت مشاركة السيارة بنجاح');
      } else {
        // نسخ الرابط
        await navigator.clipboard.writeText(window.location.href);
        showNotification('success', 'تم النسخ', 'تم نسخ رابط السيارة إلى الحافظة');
      }
    } catch (err) {
      console.log('فشل في المشاركة:', err);
      showNotification('error', 'فشل في المشاركة', 'حدث خطأ أثناء المشاركة');
    }
  };

  // دالة الاتصال
  const handleContact = () => {
    if (car?.contactPhone || car?.seller?.phone) {
      const phone = formatPhoneNumber(car.contactPhone || car.seller?.phone || '');

      // محاولة فتح تطبيق الهاتف
      try {
        window.location.href = `tel:${phone}`;
        showNotification('info', 'جاري الاتصال', `يتم الاتصال بـ ${phone}`);
      } catch (error) {
        // في حالة فشل فتح تطبيق الهاتف، نسخ الرقم
        navigator.clipboard.writeText(phone);
        showNotification('info', 'تم نسخ الرقم', `تم نسخ رقم الهاتف: ${phone}`);
      }
    } else {
      showNotification('warning', 'رقم غير متوفر', 'رقم الهاتف غير متوفر لهذا البائع');
    }
  };

  // دالة المراسلة
  const handleMessage = () => {
    if (!car?.sellerId) {
      showNotification('warning', 'خطأ', 'لا يمكن تحديد البائع');
      return;
    }

    startConversation({
      otherUserId: car.sellerId,
      otherUserName: car.seller?.name || 'البائع',
      type: 'car',
      itemId: car.id,
    });
  };

  // تم إزالة spinner التحميل - UnifiedPageTransition يتولى ذلك
  if (loading) return null;

  if (error || !car) {
    return (
      <Layout title="خطأ">
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4 text-6xl text-red-500">[تحذير]</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">السيارة غير موجودة</h1>
            <p className="mb-6 text-gray-600">{error}</p>
            <Link
              href="/marketplace"
              className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
            >
              العودة للسوق
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  const images = car.images ? car.images.split(',') : ['/images/cars/default-car.jpg'];
  const features = car.features ? car.features.split(',') : [];

  return (
    <Layout title={car.title}>
      <div className="min-h-screen bg-gray-50">
        {/* شريط التنقل */}
        <div className="border-b bg-white">
          <div className="container mx-auto px-4 py-4">
            <Link
              href="/marketplace"
              className="flex items-center gap-2 text-blue-600 transition-colors hover:text-blue-800"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              العودة للسوق
            </Link>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* معرض الصور */}
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-xl bg-white shadow-lg">
                <div className="relative">
                  <img
                    src={images[activeImageIndex] || '/images/cars/default-car.jpg'}
                    alt={car.title}
                    className="h-96 w-full object-cover"
                  />

                  {/* أزرار الإعجاب والمشاركة */}
                  <div className="absolute right-4 top-4 flex gap-2">
                    <button
                      onClick={handleFavorite}
                      className={`rounded-full p-3 shadow-lg transition-all ${
                        isFavorite(router.query.id as string)
                          ? 'bg-red-500 text-white'
                          : 'bg-white text-gray-600 hover:bg-red-50'
                      }`}
                    >
                      {isFavorite(router.query.id as string) ? (
                        <HeartSolidIcon className="h-6 w-6" />
                      ) : (
                        <HeartIcon className="h-6 w-6" />
                      )}
                    </button>

                    <button
                      onClick={handleShare}
                      className="rounded-full bg-white p-3 text-gray-600 shadow-lg transition-all hover:bg-blue-50"
                    >
                      <ShareIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {/* حالة السيارة */}
                  <div className="absolute left-4 top-4 flex flex-col gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        car.status === 'AVAILABLE'
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {car.status === 'AVAILABLE' ? 'متاح للبيع' : 'غير متاح'}
                    </span>

                    {/* عداد الصور */}
                    <div className="flex items-center gap-1 rounded-full bg-black bg-opacity-50 px-2 py-1 text-xs text-white">
                      <CameraIcon className="h-3 w-3" />
                      <span>{convertToEnglishNumbers(images.length.toString())}</span>
                    </div>
                  </div>
                </div>

                {/* صور مصغرة */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-4">
                    {images.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setActiveImageIndex(index)}
                        className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 ${
                          activeImageIndex === index ? 'border-blue-500' : 'border-gray-200'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`صورة ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* تفاصيل السيارة */}
              <div className="mt-6 rounded-xl bg-white p-6 shadow-lg">
                <h1 className="mb-4 text-3xl font-bold text-gray-900">{car.title}</h1>

                <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <CalendarIcon className="h-5 w-5" />
                    <span>{formatYear(car.year)}</span>
                  </div>

                  {car.mileage !== undefined && car.mileage !== null && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <CogIcon className="h-5 w-5" />
                      <span>{formatDistance(car.mileage)}</span>
                    </div>
                  )}

                  {car.fuelType && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <FuelIcon className="h-5 w-5" />
                      <span>{car.fuelType}</span>
                    </div>
                  )}

                  {car.transmission && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <TruckIcon className="h-5 w-5" />
                      <span>{car.transmission}</span>
                    </div>
                  )}
                </div>

                {car.description && (
                  <div className="mb-6">
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                      الوصف
                    </h3>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="leading-relaxed text-gray-700">{car.description}</p>
                    </div>
                  </div>
                )}

                {features.length > 0 && (
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                      <SparklesIcon className="h-5 w-5 text-blue-600" />
                      المميزات
                    </h3>
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {features.map((feature, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 text-gray-700"
                        >
                          <ShieldCheckIcon className="h-4 w-4 flex-shrink-0 text-green-500" />
                          <span className="text-sm font-medium">{feature.trim()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* معلومات البائع والسعر */}
            <div className="lg:col-span-1">
              {/* السعر */}
              <div className="mb-6 rounded-xl bg-white p-6 shadow-lg">
                <div className="text-center">
                  <div className="mb-2 text-3xl font-bold text-blue-600">
                    {formatPrice(car.price)}
                  </div>
                  <div className="text-sm text-gray-500">السعر النهائي</div>
                </div>
              </div>

              {/* معلومات البائع */}
              <div className="mb-6 rounded-xl bg-white p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">معلومات البائع</h3>

                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <UserIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">
                      {car.seller?.name || 'بائع معتمد'}
                    </div>
                    {car.seller?.verified && (
                      <div className="text-sm text-green-600">[تم] حساب موثق</div>
                    )}
                  </div>
                </div>

                {car.seller?.rating && (
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex items-center">
                      {[...Array(5)].map((_, i) => (
                        <StarIcon
                          key={i}
                          className={`h-4 w-4 ${
                            i < Math.floor(car.seller!.rating)
                              ? 'fill-current text-yellow-400'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      ({convertToEnglishNumbers(car.seller.reviewsCount.toString())} تقييم)
                    </span>
                  </div>
                )}

                {/* تم نقل التقييم السريع إلى مكون ReviewsAndRatings الموحد في أسفل الصفحة */}

                <div className="mb-4 flex items-center gap-2 text-gray-600">
                  <MapPinIcon className="h-5 w-5" />
                  <span>{car.location}</span>
                </div>

                {/* أزرار التواصل */}
                <div className="flex gap-2">
                  <button
                    onClick={handleMessage}
                    disabled={messageLoading}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    {messageLoading ? 'جاري...' : 'مراسلة'}
                  </button>
                  <button
                    onClick={handleContact}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-green-600 bg-white px-4 py-3 text-green-600 transition-colors hover:bg-green-50"
                  >
                    <PhoneIcon className="h-5 w-5" />
                    اتصال
                  </button>
                </div>
              </div>

              {/* معلومات إضافية */}
              <div className="rounded-xl bg-white p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold text-gray-900">معلومات إضافية</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">الحالة:</span>
                    <span className="font-medium">{car.condition}</span>
                  </div>

                  {car.bodyType && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">نوع الهيكل:</span>
                      <span className="font-medium">{car.bodyType}</span>
                    </div>
                  )}

                  {car.color && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">اللون:</span>
                      <span className="font-medium">{car.color}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span className="text-gray-600">تاريخ النشر:</span>
                    <span className="font-medium">{formatDate(car.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* قسم التقييمات والمراجعات */}
        <div className="container mx-auto px-4 py-8">
          <ReviewsAndRatings
            itemId={car.id}
            itemType="car"
            itemTitle={car.title || 'سيارة للبيع'}
            targetUserId={car.sellerId || ''}
            showQuickRating={true}
            showRatingStats={true}
          />
        </div>
      </div>

      {/* الإشعارات */}
      <Notification
        show={notification.show}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, show: false })}
      />
    </Layout>
  );
};

export default CarDetailsPage;
