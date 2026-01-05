import {
  CheckBadgeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  EyeIcon,
  HeartIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import Link from 'next/link';
import React, { memo, useMemo } from 'react';

interface Car {
  id: number;
  title: string;
  brand: string;
  model: string;
  year: number;
  price: number;
  images: string[];
  condition: string;
  mileage?: number;
  location: string;
  views?: number;
  createdAt: string;
  featured?: boolean;
  seller: {
    id: number;
    name: string;
    verified?: boolean;
  };
}

interface MarketplaceGridProps {
  cars: Car[];
  isLoading?: boolean;
  onToggleFavorite?: (carId: number) => void;
  favoriteIds?: number[];
}

const CarCard = memo<{
  car: Car;
  isFavorite: boolean;
  onToggleFavorite?: (carId: number) => void;
}>(({ car, isFavorite, onToggleFavorite }) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-LY').format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-LY', {
      day: 'numeric',
      month: 'short',
    });
  };

  const primaryImage = car.images?.[0] || '/images/car-placeholder.jpg';

  return (
    <div className="group overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* صورة السيارة */}
      <div className="relative aspect-video bg-gray-200">
        <Link href={`/marketplace/${car.id}`}>
          <img
            src={primaryImage}
            alt={car.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </Link>

        {/* أزرار التفاعل */}
        <div className="absolute right-3 top-3 flex gap-2">
          {car.featured && (
            <span className="rounded-full bg-yellow-500 px-2 py-1 text-xs font-medium text-white">
              مميز
            </span>
          )}
          <button
            onClick={() => onToggleFavorite?.(car.id)}
            className={`rounded-full p-2 transition-colors ${
              isFavorite ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-700 hover:bg-white'
            }`}
          >
            {isFavorite ? <HeartSolid className="h-4 w-4" /> : <HeartIcon className="h-4 w-4" />}
          </button>
        </div>

        {/* حالة السيارة */}
        <div className="absolute bottom-3 left-3">
          <span
            className={`rounded-full px-2 py-1 text-xs font-medium ${
              car.condition === 'NEW' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
            }`}
          >
            {car.condition === 'NEW' ? 'جديد' : 'مستعمل'}
          </span>
        </div>
      </div>

      {/* تفاصيل السيارة */}
      <div className="p-4">
        <div className="mb-2">
          <Link href={`/marketplace/${car.id}`}>
            <h3 className="line-clamp-2 text-lg font-semibold text-gray-900 transition-colors hover:text-blue-600">
              {car.title}
            </h3>
          </Link>
          <p className="mt-1 text-sm text-gray-600">
            {car.brand} {car.model} • {car.year}
          </p>
        </div>

        {/* السعر */}
        <div className="mb-3">
          <div className="flex items-center gap-1">
            <CurrencyDollarIcon className="h-4 w-4 text-green-600" />
            <span className="text-xl font-bold text-green-600">{formatPrice(car.price)} د.ل</span>
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="space-y-2 text-sm text-gray-600">
          {car.mileage !== undefined && car.mileage !== null && (
            <div className="flex items-center justify-between">
              <span>المسافة المقطوعة:</span>
              <span className="font-medium">{formatPrice(car.mileage)} كم</span>
            </div>
          )}

          <div className="flex items-center gap-1">
            <MapPinIcon className="h-4 w-4" />
            <span>{car.location}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1">
              <ClockIcon className="h-3 w-3" />
              <span>{formatDate(car.createdAt)}</span>
            </div>

            {car.views && (
              <div className="flex items-center gap-1">
                <EyeIcon className="h-3 w-3" />
                <span>{car.views}</span>
              </div>
            )}
          </div>
        </div>

        {/* معلومات البائع */}
        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200">
                <span className="text-xs font-medium text-gray-600">
                  {car.seller.name.charAt(0)}
                </span>
              </div>
              <span className="text-sm text-gray-700">{car.seller.name}</span>
              {car.seller.verified && <CheckBadgeIcon className="h-4 w-4 text-blue-500" />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

CarCard.displayName = 'CarCard';

const MarketplaceGrid: React.FC<MarketplaceGridProps> = memo(
  ({ cars, isLoading = false, onToggleFavorite, favoriteIds = [] }) => {
    const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

    if (isLoading) {
      return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="animate-pulse overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <div className="aspect-video bg-gray-200" />
              <div className="space-y-3 p-4">
                <div className="h-6 w-3/4 rounded bg-gray-200" />
                <div className="h-4 w-1/2 rounded bg-gray-200" />
                <div className="h-6 w-1/3 rounded bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-3 w-full rounded bg-gray-200" />
                  <div className="h-3 w-2/3 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (cars.length === 0) {
      return (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
            <CurrencyDollarIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mb-2 text-lg font-medium text-gray-900">لا توجد سيارات متاحة</h3>
          <p className="text-gray-600">جرب تعديل معايير البحث أو تصفح الأقسام الأخرى</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cars.map((car) => (
          <CarCard
            key={car.id}
            car={car}
            isFavorite={favoriteSet.has(car.id)}
            onToggleFavorite={onToggleFavorite}
          />
        ))}
      </div>
    );
  },
);

MarketplaceGrid.displayName = 'MarketplaceGrid';

export default MarketplaceGrid;
