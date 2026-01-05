import CameraIcon from '@heroicons/react/24/outline/CameraIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
// formatCityRegion تم استبداله بعرض location + area مباشرة
import useAuthProtection from '../../../../hooks/useAuthProtection';
import { useFavorites } from '../../../../hooks/useFavorites';
import LoginModal from '../../../auth/LoginModal';
import { CardFeaturedBadge } from '../../../ui/FeaturedBadge';
import { UnifiedNavigationArrows } from '../../../ui/NavigationArrows';

interface MarketplaceCarCardGridProps {
  car: {
    id: string;
    title: string;
    price: number;
    condition: string;
    brand: string;
    model: string;
    year: number;
    bodyType?: string;
    mileage?: number;
    fuelType?: string;
    transmission?: string;
    location: string;
    area?: string;
    images: string[] | string;
    carImages?: Array<{ fileUrl: string; isPrimary?: boolean }>; // إضافة دعم carImages
    featured?: boolean;
    negotiable?: boolean;
    urgent?: boolean;

    // البيانات الجديدة المضافة
    vehicleType?: string;
    manufacturingCountry?: string;
    regionalSpecs?: string;
    seatCount?: string;
    color?: string;
    interiorColor?: string;
    chassisNumber?: string;
    customsStatus?: string;
    licenseStatus?: string;
    insuranceStatus?: string;
    features?: string[];
    interiorFeatures?: string[];
    exteriorFeatures?: string[];
    technicalFeatures?: string[];
    paymentMethod?: string;

    user?: {
      id: string;
      name: string;
      phone: string;
      verified: boolean;
    };
  };
}

const MarketplaceCarCardGrid: React.FC<MarketplaceCarCardGridProps> = ({ car }) => {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { isFavorite, toggleFavorite } = useFavorites();

  // معالجة موحدة للصور تدعم carImages و images
  const carImages = (() => {
    let urls: string[] = [];

    // أولاً: carImages من قاعدة البيانات (الأولوية العليا)
    if (car.carImages && Array.isArray(car.carImages) && car.carImages.length > 0) {
      // ترتيب حسب isPrimary
      const sorted = [...car.carImages].sort((a, b) => {
        if (a.isPrimary && !b.isPrimary) return -1;
        if (!a.isPrimary && b.isPrimary) return 1;
        return 0;
      });

      urls = sorted
        .map((img) => img.fileUrl)
        .filter((url) => url && typeof url === 'string' && url.trim());
    }

    // ثانياً: الصور القديمة من حقل images
    if (urls.length === 0) {
      const images = car.images;

      if (Array.isArray(images) && images.length > 0) {
        urls = images.filter((img) => img && img.trim());
      } else if (typeof images === 'string' && images.trim()) {
        urls = images
          .split(',')
          .map((img) => img.trim())
          .filter((img) => img);
      }
    }

    // ثالثاً: الصورة الافتراضية
    return urls.length > 0 ? urls : ['/images/cars/default-car.svg'];
  })();

  // إعادة تعيين فهرس الصورة عند تغيير البطاقة
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [car.id]);

  // استخدام نظام الحماية
  const {
    isAuthenticated,
    showAuthModal,
    setShowAuthModal,
    requireLogin,
    handleAuthSuccess,
    handleAuthClose,
  } = useAuthProtection({
    showModal: true,
  });

  // التنقل للصورة التالية
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === carImages.length - 1 ? 0 : prev + 1));
  };

  // التنقل للصورة السابقة
  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? carImages.length - 1 : prev - 1));
  };

  // معالج النقر على البطاقة
  const handleCardClick = (e: React.MouseEvent) => {
    // تجنب التنقل إذا تم النقر على الأزرار أو أسهم التنقل
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    router.push(`/marketplace/${car.id}`);
  };

  // معالج النقر على زر المفضلة
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(car.id);
  };

  // معالج النقر على أزرار التواصل
  const handleContactClick = (e: React.MouseEvent, type: 'call' | 'chat') => {
    e.stopPropagation();

    const actionText = type === 'call' ? 'للاتصال بالبائع' : 'لإرسال رسالة';

    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }

    if (type === 'call') {
      // فتح صفحة تفاصيل السيارة مباشرة بدلاً من صفحة contact
      router.push(`/marketplace/${car.id}`);
    } else {
      router.push(`/messages?contact=${car.user?.name || 'البائع'}&car=${car.id}`);
    }
  };

  return (
    <>
      <div
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg"
        onClick={handleCardClick}
      >
        {/* شارة مميز - واضحة في زاوية البطاقة */}
        {car.featured && <CardFeaturedBadge position="top-left" size="md" variant="gold" />}

        {/* قسم الصورة مع معرض الصور */}
        <div className="group relative h-56 w-full">
          <img
            src={carImages[currentImageIndex] || '/images/cars/default-car.svg'}
            alt={car.title}
            className="h-full w-full object-cover"
            loading="lazy"
            onError={(e) => {
              // في حالة فشل تحميل الصورة، استخدم الصورة الافتراضية
              const target = e.target as HTMLImageElement;
              if (target.src !== '/images/cars/default-car.svg') {
                target.src = '/images/cars/default-car.svg';
              }
            }}
          />

          {/* أسهم التنقل بين الصور */}
          <UnifiedNavigationArrows
            onPrevious={prevImage}
            onNext={nextImage}
            show={carImages && carImages.length > 1}
            alwaysVisible={false}
          />

          {/* مؤشرات الصور */}
          {carImages && carImages.length > 1 && (
            <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1">
              {carImages.map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* عدد الصور */}
          {carImages && carImages.length > 1 && (
            <div className="absolute bottom-2 right-2 flex items-start gap-1 rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
              <CameraIcon className="h-3 w-3" />
              {carImages.length}
            </div>
          )}

          {/* شارات إضافية */}
          <div className="absolute right-2 top-2 flex flex-col gap-1">
            {car.negotiable && (
              <span className="rounded bg-blue-500 px-1.5 py-0.5 text-xs text-white">
                قابل للتفاوض
              </span>
            )}
            {car.urgent && (
              <span className="rounded bg-red-500 px-1.5 py-0.5 text-xs text-white">عاجل</span>
            )}
          </div>

          {/* زر المفضلة */}
          <button
            onClick={handleFavoriteClick}
            className={`absolute bottom-2 left-2 flex h-7 w-7 items-center justify-center rounded-full border border-gray-300 bg-white/90 backdrop-blur-sm transition-colors ${
              isFavorite(car.id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
            }`}
            aria-label={isFavorite(car.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
          >
            {isFavorite(car.id) ? (
              <HeartSolid className="h-4 w-4" />
            ) : (
              <HeartIcon className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* تفاصيل السيارة */}
        <div className="flex flex-1 flex-col justify-between p-3">
          <div>
            {/* العنوان الرئيسي */}
            <h3 className="mb-2 line-clamp-2 text-sm font-bold text-gray-900 transition-colors group-hover:text-blue-600">
              {car.title}
            </h3>

            {/* التاريخ */}
            <div className="mb-2 flex items-center gap-1 text-xs text-gray-500">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.5"
                stroke="currentColor"
                aria-hidden="true"
                data-slot="icon"
                className="h-3 w-3"
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

            {/* معلومات السيارة المختصرة */}
            <div className="mb-2 text-xs text-gray-600">
              <div className="flex flex-wrap items-start gap-1">
                {/* الماركة والموديل */}
                {car.brand && car.brand !== 'غير محدد' && (
                  <span className="font-medium text-gray-800">{car.brand}</span>
                )}
                {car.model && car.model !== 'غير محدد' && (
                  <>
                    {car.brand && car.brand !== 'غير محدد' && (
                      <span className="text-gray-400">•</span>
                    )}
                    <span className="font-medium text-gray-800">{car.model}</span>
                  </>
                )}
                {/* السنة */}
                {car.year && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">{car.year}</span>
                  </>
                )}
              </div>
            </div>

            {/* الموقع */}
            <div className="mb-3 text-xs text-gray-500">
              {car.location}
              {car.area && ` - ${car.area}`}
            </div>
          </div>

          {/* السعر والأزرار */}
          <div className="flex items-center justify-between">
            {/* السعر على اليسار */}
            <div className="car-price text-lg font-bold text-red-600">
              {car.price && car.price.toLocaleString()} دينار
            </div>

            {/* الأزرار على اليمين */}
            <div className="flex items-center gap-1">
              {/* زر الاتصال */}
              <button
                onClick={(e) => handleContactClick(e, 'call')}
                className="flex items-center justify-center gap-1 rounded-md bg-blue-600 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
              >
                <PhoneIcon className="h-3 w-3" />
                اتصل
              </button>

              {/* زر الدردشة */}
              <button
                onClick={(e) => handleContactClick(e, 'chat')}
                className="flex items-center justify-center gap-1 rounded-md border border-blue-600 bg-white px-2 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
              >
                <ChatBubbleLeftRightIcon className="h-3 w-3" />
                دردش
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* نافذة تسجيل الدخول */}
      <LoginModal isOpen={showAuthModal} onClose={handleAuthClose} />
    </>
  );
};

export default React.memo(
  MarketplaceCarCardGrid,
  (prevProps, nextProps) => prevProps.car.id === nextProps.car.id,
);
