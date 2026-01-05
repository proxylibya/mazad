/**
 * نسخة محسنة من MarketplaceCarCard مع دعم الصور المحسنة
 */

import OptimizedImage from '@/components/OptimizedImage';
import { useFavorites } from '@/hooks/useFavorites';
import { useProgressiveImage } from '@/hooks/useProgressiveImage';
import {
  ChatBubbleLeftRightIcon,
  HeartIcon as HeartOutline,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
// formatCityRegion تم استبداله بعرض location + area مباشرة

interface OptimizedMarketplaceCarCardProps {
  car: {
    id: string;
    title: string;
    price: number;
    brand: string;
    model: string;
    year: number;
    location: string;
    area?: string;
    images: string[];
    optimizedImages?: {
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      placeholder?: string;
    };
  };
  viewMode?: 'grid' | 'list';
}

export const OptimizedMarketplaceCarCard: React.FC<OptimizedMarketplaceCarCardProps> = ({
  car,
  viewMode = 'grid',
}) => {
  const router = useRouter();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // استخدام الصور المحسنة إذا كانت متاحة
  const mainImage = car.images[currentImageIndex];
  const optimizedImage = car.optimizedImages;

  // استخدام Progressive Image Hook
  const {
    src: imageSrc,
    isLoading,
    blur,
  } = useProgressiveImage({
    lowResSrc: optimizedImage?.thumbnail,
    highResSrc: optimizedImage?.medium || mainImage,
    placeholder: optimizedImage?.placeholder,
  });

  const handleCardClick = () => {
    router.push(`/marketplace/${car.id}`);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await toggleFavorite(car.id);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === car.images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? car.images.length - 1 : prev - 1));
  };

  if (viewMode === 'list') {
    return (
      <div
        className="group relative flex h-40 w-full cursor-pointer flex-row overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg"
        onClick={handleCardClick}
      >
        {/* الصورة */}
        <div className="relative h-full w-60 flex-shrink-0">
          <OptimizedImage
            src={imageSrc}
            alt={car.title}
            width={240}
            height={160}
            className="h-full w-full"
            objectFit="cover"
            placeholder={optimizedImage?.placeholder ? 'blur' : 'empty'}
            blurDataURL={optimizedImage?.placeholder}
            sizes="240px"
          />

          {/* زر المفضلة */}
          <button
            onClick={handleFavoriteClick}
            className="absolute left-2 top-2 rounded-full bg-white/90 p-2 shadow-md transition-all hover:scale-110 hover:bg-white"
          >
            {isFavorite(car.id) ? (
              <HeartSolid className="h-5 w-5 text-red-500" />
            ) : (
              <HeartOutline className="h-5 w-5 text-gray-600" />
            )}
          </button>

          {/* عداد الصور */}
          {car.images.length > 1 && (
            <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
              {currentImageIndex + 1}/{car.images.length}
            </div>
          )}
        </div>

        {/* المحتوى */}
        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <h3 className="mb-2 line-clamp-1 text-lg font-bold text-gray-900">{car.title}</h3>
            <div className="mb-2 flex items-center gap-3 text-sm text-gray-600">
              <span className="font-medium">{car.brand}</span>
              <span className="text-gray-400">•</span>
              <span>{car.model}</span>
              <span className="text-gray-400">•</span>
              <span>{car.year}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="flex h-8 items-center gap-1 rounded-md bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700">
                <PhoneIcon className="h-3 w-3" />
                اتصل
              </button>
              <button className="flex h-8 items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">
                <ChatBubbleLeftRightIcon className="h-3 w-3" />
                راسل
              </button>
            </div>
            <div className="text-xl font-bold text-blue-600">{car.price.toLocaleString()} د.ل</div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View
  return (
    <div
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg"
      onClick={handleCardClick}
    >
      {/* الصورة */}
      <div className="relative h-56 w-full">
        <OptimizedImage
          src={imageSrc}
          alt={car.title}
          width={400}
          height={224}
          className="h-full w-full"
          objectFit="cover"
          placeholder={optimizedImage?.placeholder ? 'blur' : 'empty'}
          blurDataURL={optimizedImage?.placeholder}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />

        {/* Blur effect أثناء التحميل */}
        {blur && <div className="absolute inset-0 backdrop-blur-sm" />}

        {/* زر المفضلة */}
        <button
          onClick={handleFavoriteClick}
          className="absolute left-2 top-2 rounded-full bg-white/90 p-2 shadow-md transition-all hover:scale-110 hover:bg-white"
        >
          {isFavorite(car.id) ? (
            <HeartSolid className="h-5 w-5 text-red-500" />
          ) : (
            <HeartOutline className="h-5 w-5 text-gray-600" />
          )}
        </button>

        {/* أسهم التنقل */}
        {car.images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md hover:bg-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              onClick={nextImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-2 shadow-md hover:bg-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </>
        )}

        {/* عداد الصور */}
        {car.images.length > 1 && (
          <div className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
            {currentImageIndex + 1}/{car.images.length}
          </div>
        )}

        {/* مؤشر التحميل */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100/50">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        )}
      </div>

      {/* المحتوى */}
      <div className="flex flex-col p-4">
        <h3 className="mb-2 line-clamp-2 min-h-[56px] text-lg font-bold text-gray-900">
          {car.title}
        </h3>

        <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
          <span className="font-medium">{car.brand}</span>
          <span className="text-gray-400">•</span>
          <span>{car.model}</span>
          <span className="text-gray-400">•</span>
          <span>{car.year}</span>
        </div>

        <div className="mb-4 text-sm text-gray-500">
          {car.location}
          {car.area && ` - ${car.area}`}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-blue-600">{car.price.toLocaleString()} د.ل</div>
          <div className="flex items-center gap-2">
            <button className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700">
              <PhoneIcon className="h-4 w-4" />
            </button>
            <button className="rounded-md bg-gray-100 p-2 text-gray-700 hover:bg-gray-200">
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedMarketplaceCarCard;
