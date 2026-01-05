/**
 * بطاقة السوق المحسنة - بديل مبسط لـ MarketplaceCarCard
 * يستخدم UnifiedImage ونظام مبسط للمفضلة
 */

import {
  ChatBubbleLeftRightIcon,
  HeartIcon as HeartOutline,
  PhoneIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import useAuthProtection from '../../../../hooks/useAuthProtection';
import { useFavorites } from '../../../../hooks/useFavorites';
import { UnifiedImage } from '../../../common/UnifiedImage';
import { CardFeaturedBadge } from '../../../ui/FeaturedBadge';

interface Car {
  id: string;
  title: string;
  price: number;
  brand?: string;
  model?: string;
  year?: number;
  mileage?: number;
  fuelType?: string;
  transmission?: string;
  location: string;
  images: string | string[] | any[];
  condition?: string;
  featured?: boolean;
  seller?: {
    id: string;
    name: string;
    phone?: string;
    verified?: boolean;
  };
}

interface OptimizedMarketplaceCardProps {
  car: Car;
  viewMode?: 'grid' | 'list';
  onContact?: (carId: string, type: 'call' | 'chat') => void;
}

export const OptimizedMarketplaceCard: React.FC<OptimizedMarketplaceCardProps> = ({
  car,
  viewMode = 'grid',
  onContact,
}) => {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { isFavorite, toggleFavorite, error } = useFavorites();
  const { isAuthenticated, setShowAuthModal } = useAuthProtection({ showModal: true });

  // معالجة الصور بطريقة مبسطة
  const images = Array.isArray(car.images)
    ? car.images
    : typeof car.images === 'string'
      ? [car.images]
      : ['/images/cars/default-car.svg'];

  const handleCardClick = () => {
    router.push(`/marketplace/${car.id}`);
  };

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    await toggleFavorite(car.id, 'car');
  };

  const handleContactClick = (e: React.MouseEvent, type: 'call' | 'chat') => {
    e.stopPropagation();
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    onContact?.(car.id, type);
  };

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const containerClass =
    viewMode === 'list' ? 'flex h-40 cursor-pointer flex-row' : 'flex cursor-pointer flex-col';

  const imageClass =
    viewMode === 'list' ? 'relative h-full w-60 flex-shrink-0' : 'relative h-56 w-full';

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-blue-300 hover:shadow-lg ${containerClass}`}
      onClick={handleCardClick}
    >
      {/* قسم الصورة */}
      <div className={imageClass}>
        <UnifiedImage
          src={images[currentImageIndex]}
          alt={car.title}
          className="h-full w-full object-cover"
          width={viewMode === 'list' ? 240 : 400}
          height={viewMode === 'list' ? 160 : 224}
        />

        {/* أسهم التنقل */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </>
        )}

        {/* مؤشرات الصور */}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1">
            {images.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* شارة مميز - واضحة */}
        {car.featured && <CardFeaturedBadge position="top-left" size="sm" variant="gold" />}

        {/* عدد الصور */}
        {images.length > 1 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
            {images.length}
          </div>
        )}
      </div>

      {/* قسم المحتوى */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          {/* العنوان */}
          <h3 className="mb-2 line-clamp-2 text-lg font-bold text-gray-900 transition-colors group-hover:text-blue-600">
            {car.title}
          </h3>

          {/* معلومات السيارة */}
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-600">
            {car.brand && <span className="font-medium">{car.brand}</span>}
            {car.model && (
              <>
                <span className="text-gray-400">•</span>
                <span>{car.model}</span>
              </>
            )}
            {car.year && (
              <>
                <span className="text-gray-400">•</span>
                <span>{car.year}</span>
              </>
            )}
          </div>

          {/* الموقع */}
          <div className="mb-3 flex items-center gap-1 text-sm text-gray-500">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
              />
            </svg>
            <span>{car.location}</span>
          </div>
        </div>

        {/* السعر والأزرار */}
        <div className="flex items-center justify-between">
          {/* الأزرار */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => handleContactClick(e, 'call')}
              className="flex h-8 items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              <PhoneIcon className="h-4 w-4" />
              اتصال
            </button>

            <button
              onClick={(e) => handleContactClick(e, 'chat')}
              className="flex h-8 items-center gap-1 rounded-md border border-blue-600 bg-white px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              دردشة
            </button>

            <button
              onClick={handleFavoriteClick}
              className={`flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                isFavorite(car.id)
                  ? 'border-red-500 bg-red-50 text-red-500'
                  : 'border-gray-300 bg-white text-gray-400 hover:text-red-500'
              }`}
            >
              {isFavorite(car.id) ? (
                <HeartSolid className="h-4 w-4" />
              ) : (
                <HeartOutline className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* السعر */}
          <div className="text-xl font-bold text-red-600">{car.price?.toLocaleString()} دينار</div>
        </div>

        {/* رسالة خطأ */}
        {error && <div className="mt-2 text-xs text-red-600">{error}</div>}
      </div>
    </div>
  );
};

export default OptimizedMarketplaceCard;
