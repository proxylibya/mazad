import { resolveImages } from '@/lib/services/UnifiedImageService';
import { PhotoIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import React, { useEffect, useMemo, useState } from 'react';

interface SimpleImageRendererProps {
  images?: string | string[];
  carImages?: Array<{ fileUrl: string; isPrimary?: boolean }> | null;
  fallbackImage?: string;
  alt?: string;
  className?: string;
  showNavigation?: boolean;
  priority?: boolean; // للتحكم في أولوية تحميل الصور
}

/**
 * مكون بسيط لعرض الصور مع معالجة شاملة لجميع حالات البيانات
 */
const SimpleImageRenderer: React.FC<SimpleImageRendererProps> = ({
  images,
  carImages,
  fallbackImage = '/images/cars/default-car.svg',
  alt = 'صورة السيارة',
  className = '',
  showNavigation = false,
  priority = false,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errorImages, setErrorImages] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [useFallback, setUseFallback] = useState(false);

  // استخدام الخدمة الموحدة لمعالجة الصور
  const resolvedImages = useMemo(() => {
    const result = resolveImages(
      {
        carImages: carImages || undefined,
        images: images,
      },
      'car',
    );

    // استبعاد الصور المعطلة (باستخدام المسار الأصلي)
    const filtered = result.urls.filter((url) => !errorImages.has(url));

    return filtered.length > 0 ? filtered : [fallbackImage];
  }, [carImages, images, errorImages, fallbackImage]);

  const imageUrls = resolvedImages;
  const currentImage = useFallback ? fallbackImage : imageUrls[currentIndex] || fallbackImage;

  const isUserUploadedImage =
    typeof currentImage === 'string' &&
    (currentImage.startsWith('/uploads/') ||
      currentImage.includes('/images/cars/listings/') ||
      currentImage.includes('/images/cars/auction-listings/'));

  // إعادة تعيين الحالة عند تغيير الصور المصدر
  useEffect(() => {
    setUseFallback(false);
    setCurrentIndex(0);
    setIsLoading(true);
    setErrorImages(new Set());
  }, [images, carImages]);

  // التنقل بين الصور
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === imageUrls.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imageUrls.length - 1 : prev - 1));
  };

  // معالجة أخطاء تحميل الصور
  const handleImageError = () => {
    setIsLoading(false);

    // تتبع الصورة الفاشلة بالمسار الأصلي (وليس URL الـ Next.js Image)
    const failedOriginalUrl = imageUrls[currentIndex];

    if (failedOriginalUrl && !failedOriginalUrl.includes('default-car.svg')) {
      // إضافة الصورة المعطلة للقائمة السوداء
      setErrorImages((prev) => new Set([...prev, failedOriginalUrl]));

      // محاولة الصورة التالية إذا وجدت
      const remainingImages = imageUrls.filter(
        (url) => url !== failedOriginalUrl && !errorImages.has(url),
      );

      if (remainingImages.length > 0) {
        // الانتقال للصورة التالية الصالحة
        const nextValidIndex = imageUrls.findIndex(
          (url) => url !== failedOriginalUrl && !errorImages.has(url),
        );
        if (nextValidIndex !== -1) {
          setCurrentIndex(nextValidIndex);
          return;
        }
      }

      // إذا لم تتبق صور صالحة، استخدم الافتراضية
      setUseFallback(true);
    }
  };

  // معالجة نجاح تحميل الصورة
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative overflow-hidden bg-gray-100 ${className}`}>
      {/* مؤشر التحميل */}
      {isLoading && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-gray-200"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div
            className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
            style={{ width: 24, height: 24 }}
            role="status"
            aria-label="جاري التحميل"
          />
          <span className="sr-only">جاري تحميل الصورة</span>
        </div>
      )}

      <Image
        src={currentImage}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover"
        onError={handleImageError}
        onLoad={handleImageLoad}
        priority={priority}
        quality={85}
        unoptimized={isUserUploadedImage}
      />

      {/* أزرار التنقل */}
      {showNavigation && imageUrls.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-all hover:bg-black/70 group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-all hover:bg-black/70 group-hover:opacity-100"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* عداد الصور */}
      {imageUrls.length > 1 && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
          <PhotoIcon className="h-3 w-3" />
          {currentIndex + 1}/{imageUrls.length}
        </div>
      )}
    </div>
  );
};

export default SimpleImageRenderer;
