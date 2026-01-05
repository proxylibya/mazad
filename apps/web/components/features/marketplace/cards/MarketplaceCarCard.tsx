import { processCardImages } from '@/lib/services/UnifiedImageService';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import useAuth from '../../../../hooks/useAuth';
import { translateToArabic } from '../../../../utils/formatters';
import { maskLibyanPhoneFirst7Xxx } from '../../../../utils/phoneUtils';
import LoginModal from '../../../auth/LoginModal';
import { FavoriteButton } from '../../../ui/FavoriteButton';
import { SmartFeaturedBadge } from '../../../ui/FeaturedBadge';
import SimpleImageRenderer from '../../../ui/SimpleImageRenderer';

interface MarketplaceCarCardProps {
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
    promotionPackage?: string;
    promotionEndDate?: string | Date;
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
    showroomId?: string; // إضافة معرف المعرض
  };
  viewMode?: 'grid' | 'list';
  context?: 'marketplace' | 'showroom'; // إضافة السياق
  showroomId?: string; // معرف المعرض للتوجيه
}

const MarketplaceCarCard: React.FC<MarketplaceCarCardProps> = ({
  car,
  viewMode = 'grid',
  context = 'marketplace',
  showroomId,
}) => {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // معالجة موحدة للصور باستخدام نظام imageHelpers المتقدم
  const imageData = processCardImages(car, 'marketplace');

  // تم إزالة تشخيص الصور لتحسين الأداء

  // معالج النقر على البطاقة
  const handleCardClick = (e: React.MouseEvent) => {
    // تجنب التنقل إذا تم النقر على الأزرار أو أسهم التنقل
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }

    // التوجيه حسب السياق
    if (context === 'showroom' && showroomId) {
      router.push(`/showrooms/${showroomId}/vehicles/${car.id}`);
    } else {
      router.push(`/marketplace/${car.id}`);
    }
  };

  // معالج طلب تسجيل الدخول للمفضلة
  const handleRequireLogin = () => {
    setShowAuthModal(true);
  };

  // معالج إغلاق نافذة تسجيل الدخول
  const handleAuthClose = () => {
    setShowAuthModal(false);
  };

  // معالج النقر على أزرار التواصل
  const handleContactClick = (e: React.MouseEvent, type: 'call' | 'chat') => {
    e.stopPropagation();

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

  // تحديد فئات CSS حسب وضع العرض
  const containerClasses =
    viewMode === 'list'
      ? 'group relative flex w-full h-52 cursor-pointer flex-row overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg'
      : 'group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg';

  const imageClasses =
    viewMode === 'list' ? 'group relative h-full w-60 flex-shrink-0' : 'group relative h-56 w-full';

  // مكون المحتوى المبسط لوضع القائمة
  const renderListContent = () => (
    <div className="flex flex-1 flex-col justify-between p-4">
      <div>
        {/* العنوان الرئيسي */}
        <h3 className="mb-2 line-clamp-1 text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-600">
          {car.title}
        </h3>

        {/* تفاصيل السيارة الكاملة */}
        <div className="mb-3 text-sm text-gray-600">
          <div className="flex flex-wrap items-start gap-1 text-xs">
            {/* الماركة */}
            {car.brand && (
              <span className="flex items-start">
                <span>{car.brand}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* الموديل */}
            {car.model && (
              <span className="flex items-start">
                <span>{car.model}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* السنة */}
            {car.year && (
              <span className="flex items-start">
                <span>{car.year}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* ناقل الحركة */}
            {car.transmission && car.transmission !== 'غير محدد' && (
              <span className="flex items-start">
                <span>{translateToArabic(car.transmission)}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* حالة السيارة */}
            {car.condition && car.condition !== 'غير محدد' && (
              <span className="flex items-start">
                <span>{translateToArabic(car.condition)}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* المسافة المقطوعة */}
            {car.mileage && car.mileage > 0 && (
              <span className="flex items-start">
                <span>{car.mileage.toLocaleString()} كم</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* نوع الوقود */}
            {car.fuelType && car.fuelType !== 'غير محدد' && (
              <span className="flex items-start">
                <span>{translateToArabic(car.fuelType)}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* نوع الهيكل */}
            {car.bodyType && car.bodyType !== 'غير محدد' && (
              <span className="flex items-start">
                <span>{translateToArabic(car.bodyType)}</span>
              </span>
            )}
          </div>

          {/* الموقع المفصل */}
          <div className="mt-2 flex items-start justify-start gap-2">
            <div className="flex items-start gap-1">
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
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
              <span>
                {car.location}
                {car.area && ` - ${car.area}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* السعر والأزرار */}
      <div className="flex items-center justify-between">
        {/* الأزرار على اليمين */}
        <div className="flex items-center gap-2">
          {/* زر الاتصال */}
          <button
            onClick={(e) => handleContactClick(e, 'call')}
            className="flex h-8 items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
          >
            <PhoneIcon className="phone-icon h-3 w-3" />
            <span className="phone-with-icon phone-text" dir="ltr">
              {maskLibyanPhoneFirst7Xxx(car.user?.phone)}
            </span>
          </button>

          {/* زر المراسلة */}
          <button
            onClick={(e) => handleContactClick(e, 'chat')}
            className="flex h-8 items-center gap-1 rounded-md border border-blue-600 bg-white px-2 py-1 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            <ChatBubbleLeftRightIcon className="h-3 w-3" />
            مراسلة
          </button>

          {/* زر المفضلة الموحد */}
          <FavoriteButton
            type="car"
            itemId={car.id}
            size="sm"
            variant="default"
            onRequireLogin={handleRequireLogin}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-300 bg-white transition-colors hover:border-red-500"
          />
        </div>

        {/* السعر على اليسار */}
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-red-600">
            {car.price && car.price.toLocaleString()}
          </span>
          <div className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
            دينار
          </div>
        </div>
      </div>
    </div>
  );

  // مكون المحتوى المشترك للشبكة
  const renderGridContent = () => (
    <div className="flex flex-1 flex-col justify-between p-4">
      <div>
        {/* العنوان الرئيسي */}
        <h3 className="mb-3 line-clamp-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-600">
          {car.title}
        </h3>

        {/* تفاصيل السيارة الكاملة */}
        <div className="mb-3 text-sm text-gray-600">
          <div className="flex flex-wrap items-start gap-1 text-xs">
            {/* الماركة */}
            {car.brand && (
              <span className="flex items-start">
                <span>{car.brand}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* الموديل */}
            {car.model && (
              <span className="flex items-start">
                <span>{car.model}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* السنة */}
            {car.year && (
              <span className="flex items-start">
                <span>{car.year}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* ناقل الحركة */}
            {car.transmission && car.transmission !== 'غير محدد' && (
              <span className="flex items-start">
                <span>{translateToArabic(car.transmission)}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* حالة السيارة */}
            {car.condition && car.condition !== 'غير محدد' && (
              <span className="flex items-start">
                <span>{translateToArabic(car.condition)}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* المسافة المقطوعة */}
            {car.mileage && car.mileage > 0 && (
              <span className="flex items-start">
                <span>{car.mileage.toLocaleString()} كم</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* نوع الوقود */}
            {car.fuelType && car.fuelType !== 'غير محدد' && (
              <span className="flex items-start">
                <span>{translateToArabic(car.fuelType)}</span>
                <span className="mx-1 text-gray-400">-</span>
              </span>
            )}

            {/* نوع الهيكل */}
            {car.bodyType && car.bodyType !== 'غير محدد' && (
              <span className="flex items-start">
                <span>{translateToArabic(car.bodyType)}</span>
              </span>
            )}
          </div>

          {/* الموقع المفصل */}
          <div className="mt-2 flex items-start justify-start gap-2">
            <div className="flex items-start gap-1">
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
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                />
              </svg>
              <span>
                {car.location}
                {car.area && ` - ${car.area}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between">
        {/* الأزرار على اليمين */}
        <div className="flex items-start gap-2">
          {/* زر الاتصال */}
          <button
            onClick={(e) => handleContactClick(e, 'call')}
            className="flex h-8 items-start gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <PhoneIcon className="phone-icon h-4 w-4" />
            <span className="phone-with-icon phone-text" dir="ltr">
              {maskLibyanPhoneFirst7Xxx(car.user?.phone)}
            </span>
          </button>

          {/* زر الدردشة */}
          <button
            onClick={(e) => handleContactClick(e, 'chat')}
            className="flex h-8 items-start gap-1 rounded-md border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
            دردش
          </button>

          {/* زر المفضلة الموحد */}
          <FavoriteButton
            type="car"
            itemId={car.id}
            size="sm"
            variant="default"
            onRequireLogin={handleRequireLogin}
            className="flex h-8 items-center justify-center rounded-md border border-gray-300 bg-white px-2 py-1.5 transition-colors hover:text-red-500"
          />
        </div>

        {/* السعر على اليسار */}
        <div className="car-price flex items-center gap-2">
          <span className="text-xl font-bold text-red-600">
            {car.price && car.price.toLocaleString()}
          </span>
          <div className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-600">
            دينار
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={containerClasses} onClick={handleCardClick}>
        {/* شارة مميز - تظهر بوضوح في زاوية البطاقة */}
        {(car.featured || (car.promotionPackage && car.promotionPackage !== 'free')) && (
          <div className="absolute left-2 top-2 z-50" style={{ zIndex: 9999 }}>
            <SmartFeaturedBadge
              featured={car.featured}
              packageType={car.promotionPackage}
              size="sm"
            />
          </div>
        )}

        {/* عرض مختلف حسب وضع العرض */}
        {viewMode === 'list' ? (
          // وضع القائمة - الصورة على اليسار والمحتوى على اليمين
          <>
            {/* قسم الصورة */}
            <div className={imageClasses}>
              <SimpleImageRenderer
                images={imageData.urls}
                carImages={car.carImages}
                alt={car.title}
                className="h-full w-full"
                showNavigation={true}
              />

              {/* شارات إضافية */}
              <div className="absolute right-2 top-2 flex flex-col gap-1">
                {car.negotiable && (
                  <span className="rounded bg-blue-500 px-2 py-1 text-xs text-white">
                    قابل للتفاوض
                  </span>
                )}
                {car.urgent && (
                  <span className="rounded bg-red-500 px-2 py-1 text-xs text-white">عاجل</span>
                )}
              </div>
            </div>

            {/* المحتوى المبسط */}
            {renderListContent()}
          </>
        ) : (
          // وضع الشبكة - الصورة في الأعلى والمحتوى في الأسفل
          <>
            {/* قسم الصورة مع معرض الصور */}
            <div className={imageClasses}>
              <SimpleImageRenderer
                images={imageData.urls}
                carImages={car.carImages}
                alt={car.title}
                className="h-full w-full"
                showNavigation={true}
              />

              {/* شارات إضافية */}
              <div className="absolute right-2 top-2 flex flex-col gap-1">
                {car.negotiable && (
                  <span className="rounded bg-blue-500 px-2 py-1 text-xs text-white">
                    قابل للتفاوض
                  </span>
                )}
                {car.urgent && (
                  <span className="rounded bg-red-500 px-2 py-1 text-xs text-white">عاجل</span>
                )}
              </div>
            </div>
            {renderGridContent()}
          </>
        )}
      </div>

      {/* نافذة تسجيل الدخول */}
      <LoginModal isOpen={showAuthModal} onClose={handleAuthClose} />
    </>
  );
};

// تحسين الأداء: React.memo لمنع إعادة الرسم غير الضرورية
export default React.memo(MarketplaceCarCard, (prevProps, nextProps) => {
  // إعادة الرسم فقط عند تغيير بيانات السيارة الأساسية
  return (
    prevProps.car.id === nextProps.car.id &&
    prevProps.viewMode === nextProps.viewMode &&
    prevProps.context === nextProps.context
  );
});
