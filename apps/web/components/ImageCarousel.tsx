import PhotoIcon from '@heroicons/react/24/outline/PhotoIcon';
import React, { useState } from 'react';
import { UnifiedNavigationArrows } from './ui/NavigationArrows';

interface ImageCarouselProps {
  images: Array<string | { url?: string }>;
  alt: string;
  className?: string;
  showCounter?: boolean;
  showArrows?: boolean;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  alt,
  className = '',
  showCounter = true,
  showArrows = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // التأكد من وجود صور وتنظيفها
  const imageList = (() => {
    // معالجة الصور

    if (Array.isArray(images) && images.length > 0) {
      // تنظيف الصور من القيم الفارغة - التعامل مع النصوص والكائنات
      const cleanImages = images
        .map((img) => {
          if (typeof img === 'string') {
            return img.trim();
          } else if (img && typeof img === 'object' && img.url) {
            return img.url;
          }
          return null;
        })
        .filter((img) => img && img.length > 0);
      // صور نظيفة
      return cleanImages.length > 0
        ? cleanImages
        : ['https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=صورة+السيارة'];
    }
    // استخدام صورة افتراضية
    return ['https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=صورة+السيارة'];
  })();

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (imageList.length > 1) {
      setCurrentIndex((prev) => (prev + 1) % imageList.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (imageList.length > 1) {
      setCurrentIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
    }
  };

  const goToImage = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex(index);
  };

  return (
    <div className={`group relative overflow-hidden ${className}`}>
      {/* الصورة الحالية */}
      <img
        src={imageList[currentIndex]}
        alt={`${alt} - صورة ${currentIndex + 1}`}
        className="h-full w-full object-cover transition-opacity duration-300"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          if (!target.src.includes('placeholder')) {
            target.src = 'https://via.placeholder.com/400x300/f3f4f6/9ca3af?text=صورة+السيارة';
          }
        }}
        onLoad={() => {
          // تم تحميل الصورة بنجاح
        }}
      />

      {/* أسهم التنقل - تظهر فقط إذا كان هناك أكثر من صورة واحدة */}
      <UnifiedNavigationArrows
        onPrevious={prevImage}
        onNext={nextImage}
        show={showArrows && imageList.length > 1}
      />

      {/* عداد الصور */}
      {showCounter && imageList.length > 1 && (
        <div className="absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded bg-black bg-opacity-70 px-2 py-1 text-xs text-white">
          <PhotoIcon className="h-3 w-3" />
          <span>
            {currentIndex + 1} / {imageList.length}
          </span>
        </div>
      )}

      {/* نقاط التنقل - تظهر فقط إذا كان هناك أكثر من صورة واحدة وأقل من 6 صور */}
      {imageList.length > 1 && imageList.length <= 5 && (
        <div className="absolute bottom-2 right-2 z-10 flex gap-1">
          {imageList.map((_, index) => (
            <button
              key={index}
              onClick={(e) => goToImage(index, e)}
              className={`h-2 w-2 rounded-full transition-all duration-200 hover:scale-125 ${
                index === currentIndex
                  ? 'bg-white shadow-lg'
                  : 'bg-white bg-opacity-50 hover:bg-opacity-75'
              }`}
              aria-label={`الذهاب للصورة ${index + 1}`}
              type="button"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
