import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import TrashIcon from '@heroicons/react/24/outline/TrashIcon';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';

interface CompactFavoriteCardProps {
  item: any;
  onRemove: (item: any) => void;
  viewMode?: 'grid' | 'list' | 'compact';
  cardSize?: 'small' | 'medium' | 'large';
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: (itemId: string) => void;
}

const CompactFavoriteCard: React.FC<CompactFavoriteCardProps> = ({
  item,
  onRemove,
  viewMode = 'grid',
  cardSize = 'small',
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection,
}) => {
  const router = useRouter();
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  // دوال معالجة الصور - يجب أن تكون قبل أي early returns
  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
    setImageError(true);
  }, []);

  // دالة لحذف من المفضلة
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemove(item);
    },
    [item, onRemove],
  );

  // التحقق من وجود العنصر بعد تعريف جميع الـ hooks
  if (!item) {
    return null;
  }

  // دالة محسنة للحصول على أول صورة
  const getFirstImage = (item: any) => {
    // التحقق من وجود العنصر أولاً
    if (!item) {
      return '/images/placeholder-car.svg';
    }

    // التحقق من وجود صور في المصفوفة
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      const firstImage = item.images[0];
      // إذا كانت الصورة عبارة عن كائن مع url
      if (typeof firstImage === 'object' && firstImage.url) {
        return firstImage.url;
      }
      // إذا كانت الصورة عبارة عن string مباشر
      if (typeof firstImage === 'string') {
        return firstImage;
      }
    }

    // التحقق من صورة واحدة
    if (item.image) {
      return typeof item.image === 'object' ? item.image.url : item.image;
    }

    // التحقق من صور السيارة
    if (item.car?.carImages && Array.isArray(item.car.carImages) && item.car.carImages.length > 0) {
      const carImage = item.car.carImages[0];
      return typeof carImage === 'object' ? carImage.fileUrl : carImage;
    }

    // صورة افتراضية
    return '/images/placeholder-car.svg';
  };

  // دالة لتنسيق الأرقام
  const formatNumber = (num: number) => {
    if (!num) return '0';
    return new Intl.NumberFormat('ar-LY').format(num);
  };

  // دالة لتنسيق حالة السيارة
  const formatCondition = (condition: string) => {
    const conditions: { [key: string]: string } = {
      new: 'جديد',
      used: 'مستعمل',
      excellent: 'ممتاز',
      good: 'جيد',
      fair: 'مقبول',
    };
    return conditions[condition] || condition;
  };

  // دالة للانتقال إلى صفحة التفاصيل أو التحديد
  const handleClick = () => {
    if (isSelectionMode && onToggleSelection) {
      onToggleSelection(item.id);
    } else {
      viewDetails();
    }
  };

  // دالة محسنة للانتقال لصفحة التفاصيل
  const viewDetails = () => {
    try {
      if (!item.itemId) {
        console.error('معرف العنصر غير موجود:', item);
        return;
      }

      if (item.type === 'auction') {
        router.push(`/auctions/${item.itemId}`);
      } else if (item.type === 'marketplace') {
        router.push(`/marketplace/${item.itemId}`);
      } else {
        console.error('نوع العنصر غير معروف:', item.type);
        // محاولة التنقل إلى الصفحة الافتراضية
        router.push(`/marketplace/${item.itemId}`);
      }
    } catch (error) {
      console.error('خطأ في التنقل:', error);
    }
  };

  // عرض القائمة - تصميم مضغوط
  if (viewMode === 'list') {
    return (
      <div
        className={`group relative cursor-pointer overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-md ${
          isSelected ? 'shadow-md ring-2 ring-blue-500' : ''
        }`}
        onClick={handleClick}
      >
        {/* مربع التحديد */}
        {isSelectionMode && (
          <div className="absolute right-2 top-2 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelection?.(item.id)}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
        <div className="flex p-3">
          {/* صورة السيارة - أصغر حجماً */}
          <div className="relative h-16 w-20 flex-shrink-0 overflow-hidden rounded-md bg-gray-100">
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                  style={{ width: 24, height: 24 }}
                  role="status"
                  aria-label="جاري التحميل"
                />
              </div>
            )}
            <Image
              src={imageError ? '/images/placeholder-car.svg' : getFirstImage(item)}
              alt={item.title}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              onLoad={handleImageLoad}
              onError={handleImageError}
              sizes="80px"
            />

            {/* شارة نوع العنصر */}
            <div
              className={`absolute right-0.5 top-0.5 rounded px-1 py-0.5 text-[9px] font-semibold text-white ${
                item.type === 'auction'
                  ? 'bg-gradient-to-r from-orange-500 to-red-500'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500'
              }`}
            >
              {item.type === 'auction' ? 'مزاد' : 'فوري'}
            </div>
          </div>

          {/* محتوى البطاقة */}
          <div className="mr-3 flex-1">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="mb-1 line-clamp-1 text-sm font-semibold text-gray-900">
                  {item.title}
                </h3>
                <div className="mb-1 flex flex-wrap items-center gap-1 text-xs">
                  {item.brand && item.model && (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">
                      {item.brand} {item.model}
                    </span>
                  )}
                  {item.year && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-700">
                      {item.year}
                    </span>
                  )}
                  {item.condition && (
                    <span className="rounded bg-green-50 px-1.5 py-0.5 font-medium text-green-700">
                      {formatCondition(item.condition)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="flex items-center gap-1 text-gray-500">
                    <MapPinIcon className="h-3 w-3" />
                    <span>{item.location || 'غير محدد'}</span>
                  </div>
                  {item.mileage !== undefined && item.mileage !== null && (
                    <span className="rounded bg-orange-50 px-1.5 py-0.5 font-medium text-orange-700">
                      {formatNumber(item.mileage)} كم
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-sm font-semibold text-blue-600">
                    {item.type === 'auction'
                      ? `${formatNumber(item.currentPrice || item.startingPrice || 0)} د.ل`
                      : `${formatNumber(item.price || 0)} د.ل`}
                  </div>
                  {item.type === 'auction' && item.totalBids > 0 && (
                    <div className="text-xs text-blue-500">{item.totalBids} مزايدة</div>
                  )}
                </div>
                <button
                  onClick={handleRemove}
                  className="rounded-full bg-white/90 p-1.5 text-gray-600 shadow-sm transition-all hover:bg-white hover:text-red-500 hover:shadow-md"
                  aria-label="إزالة من المفضلة"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // العرض الشبكي (الافتراضي) - تصميم محسن وأصغر
  return (
    <div
      className={`group cursor-pointer overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all duration-300 hover:shadow-md ${
        isSelected ? 'shadow-md ring-2 ring-blue-500' : ''
      }`}
      onClick={handleClick}
    >
      {/* مربع التحديد */}
      {isSelectionMode && (
        <div className="absolute right-2 top-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection?.(item.id)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* صورة السيارة - حجم متغير */}
      <div
        className={`relative bg-gray-100 ${
          cardSize === 'small'
            ? 'aspect-[4/3]'
            : cardSize === 'medium'
              ? 'aspect-[3/2]'
              : 'aspect-[16/9]'
        }`}
      >
        {imageLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
              style={{ width: 24, height: 24 }}
              role="status"
              aria-label="جاري التحميل"
            />
          </div>
        )}
        <Image
          src={imageError ? '/images/placeholder-car.svg' : getFirstImage(item)}
          alt={item.title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          onLoad={handleImageLoad}
          onError={handleImageError}
          sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
        />

        {/* شارة نوع العنصر - أصغر وأكثر احترافية */}
        <div
          className={`absolute right-2 top-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm ${
            item.type === 'auction'
              ? 'bg-gradient-to-r from-orange-500 to-red-500'
              : 'bg-gradient-to-r from-green-500 to-emerald-500'
          }`}
        >
          {item.type === 'auction' ? 'مزاد' : 'فوري'}
        </div>

        {/* زر الحذف من المفضلة - أصغر وأكثر تهذيباً */}
        <button
          onClick={handleRemove}
          className="absolute left-2 top-2 rounded-full bg-white/90 p-1 text-gray-600 shadow-sm transition-all hover:bg-white hover:text-red-500 hover:shadow-md"
          aria-label="إزالة من المفضلة"
        >
          <TrashIcon className="h-3 w-3" />
        </button>

        {/* شارة حالة المزاد */}
        {item.type === 'auction' && item.status === 'ACTIVE' && (
          <div className="absolute bottom-2 right-2 rounded-md bg-gradient-to-r from-red-500 to-pink-500 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow-sm">
            نشط
          </div>
        )}

        {/* عدد الصور */}
        {item.images?.length > 1 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
            <EyeIcon className="h-2.5 w-2.5" />
            <span>{item.images.length}</span>
          </div>
        )}
      </div>

      {/* محتوى البطاقة - حجم متغير */}
      <div className={cardSize === 'small' ? 'p-2' : cardSize === 'medium' ? 'p-3' : 'p-4'}>
        {/* العنوان */}
        <h3
          className={`mb-2 line-clamp-2 font-semibold leading-tight text-gray-900 ${
            cardSize === 'small' ? 'text-xs' : cardSize === 'medium' ? 'text-sm' : 'text-base'
          }`}
        >
          {item.title}
        </h3>

        {/* معلومات مضغوطة في سطر واحد */}
        <div
          className={`mb-2 flex flex-wrap items-center gap-1 ${
            cardSize === 'small' ? 'text-[10px]' : 'text-xs'
          }`}
        >
          {item.brand && item.model && (
            <span
              className={`rounded bg-blue-50 font-medium text-blue-700 ${
                cardSize === 'small' ? 'px-1 py-0.5' : 'px-1.5 py-0.5'
              }`}
            >
              {item.brand} {item.model}
            </span>
          )}
          {item.year && (
            <span
              className={`rounded bg-gray-100 font-medium text-gray-700 ${
                cardSize === 'small' ? 'px-1 py-0.5' : 'px-1.5 py-0.5'
              }`}
            >
              {item.year}
            </span>
          )}
          {item.condition && (
            <span
              className={`rounded bg-green-50 font-medium text-green-700 ${
                cardSize === 'small' ? 'px-1 py-0.5' : 'px-1.5 py-0.5'
              }`}
            >
              {formatCondition(item.condition)}
            </span>
          )}
        </div>

        {/* المسافة والموقع */}
        <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
          <div className="flex items-center gap-1 text-gray-500">
            <MapPinIcon className="h-3 w-3" />
            <span className="truncate">{item.location || 'غير محدد'}</span>
          </div>
          {item.mileage !== undefined && item.mileage !== null && (
            <span className="rounded bg-orange-50 px-1.5 py-0.5 font-medium text-orange-700">
              {formatNumber(item.mileage)} كم
            </span>
          )}
        </div>

        {/* السعر - حجم متغير */}
        <div
          className={`rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 text-center ${
            cardSize === 'small' ? 'p-1.5' : 'p-2'
          }`}
        >
          {item.type === 'auction' ? (
            <div>
              <div
                className={`font-semibold text-blue-600 ${
                  cardSize === 'small'
                    ? 'text-[10px]'
                    : cardSize === 'medium'
                      ? 'text-xs'
                      : 'text-sm'
                }`}
              >
                {formatNumber(item.currentPrice || item.startingPrice || 0)} د.ل
              </div>
              {item.totalBids > 0 && (
                <div
                  className={`text-blue-500 ${cardSize === 'small' ? 'text-[8px]' : 'text-[10px]'}`}
                >
                  {item.totalBids} مزايدة
                </div>
              )}
            </div>
          ) : (
            <div
              className={`font-semibold text-blue-600 ${
                cardSize === 'small' ? 'text-[10px]' : cardSize === 'medium' ? 'text-xs' : 'text-sm'
              }`}
            >
              {formatNumber(item.price || 0)} د.ل
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompactFavoriteCard;
