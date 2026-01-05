/* eslint-disable react-hooks/exhaustive-deps */
import { processCardImages } from '@/lib/services/UnifiedImageService';
import HandRaisedIcon from '@heroicons/react/24/outline/HandRaisedIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import { HeartIcon as HeartSolid, StarIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React from 'react';

import SimpleCircularAuctionTimer from '../timer/SimpleCircularAuctionTimer';

interface AuctionCardGridProps {
  car: {
    id: string | number;
    title: string;
    price: string;
    currentBid: string;
    startingBid: string;
    finalBid?: string | null;
    bidCount: number;
    location: string;
    area?: string;
    time: string;
    images: number | string[] | string;
    condition: string;
    brand: string;
    model: string;
    year: string;
    mileage: string;
    fuelType?: string; // نوع الوقود
    transmission?: string; // ناقل الحركة
    bodyType?: string; // نوع الهيكل
    color?: string; // اللون
    doors?: number; // عدد الأبواب
    type: string;
    phone: string;
    isAuction: boolean;
    auctionType: 'upcoming' | 'live' | 'ended' | 'sold';
    auctionStartTime: string;
    auctionEndTime: string;
    reservePrice?: string;
    buyerName?: string | null;
    isSold?: boolean;
    currentPrice?: string;
    startingPrice?: string;
    image: string;
    imageList?: string[];
    description: string;
    featured?: boolean;
    promotionPackage?: string;
    car?: {
      carImages?: Array<{ fileUrl: string; isPrimary?: boolean }>;
    };
  };
  onContactClick: (car: AuctionCardGridProps['car']) => void;
  onChatClick: (car: AuctionCardGridProps['car']) => void;
  onBidClick: (car: AuctionCardGridProps['car']) => void;
  onFavoriteClick: (auctionId: string | number) => void;
  onReminderClick?: (carId: string | number) => void;
  onCardClick?: (car: AuctionCardGridProps['car']) => void; // للتوجيه المخصص عند النقر على البطاقة
  isFavorite: boolean;
  hasReminder?: boolean;
  externalTick?: number;
  isYardAuction?: boolean; // إخفاء زر المزايدة لمزادات الساحات
}

const AuctionCardGrid: React.FC<AuctionCardGridProps> = ({
  car,
  onContactClick,
  onChatClick,
  onBidClick,
  onFavoriteClick,
  onReminderClick,
  onCardClick,
  isFavorite,
  hasReminder,
  externalTick,
  isYardAuction = false,
}) => {
  const router = useRouter();

  const imageData = processCardImages(
    {
      images: car.images,
      carImages: car.car?.carImages || [],
      image: car.image,
    },
    'auction',
  );

  const isSoonToLive = React.useMemo(() => {
    if (!car?.auctionStartTime) return false;
    const startMs = Date.parse(car.auctionStartTime);
    if (!Number.isFinite(startMs)) return false;
    const diff = startMs - Date.now();
    return diff > 0 && diff <= 60 * 60 * 1000;
  }, [car?.auctionStartTime, externalTick]);

  const isFeatured = Boolean(
    car.featured || (car.promotionPackage && car.promotionPackage !== 'free'),
  );

  const primaryDate = car.auctionStartTime || car.auctionEndTime;
  const formattedDate =
    primaryDate && !Number.isNaN(new Date(primaryDate).getTime())
      ? new Date(primaryDate).toLocaleDateString('ar-LY', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        })
      : '';

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    if (onCardClick) {
      onCardClick(car);
    } else {
      router.push(`/auction/${car.id}`);
    }
  };

  return (
    <div
      className="relative mx-auto flex h-full w-full max-w-md cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
      onClick={handleCardClick}
    >
      {isFeatured && (
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-800 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
          <StarIcon className="h-4 w-4 text-yellow-400" />
          <span>سيارة مميزة</span>
        </div>
      )}

      <div className="relative h-40 w-full overflow-hidden bg-gray-50">
        <Image
          src={imageData.primaryUrl || '/images/cars/default-car.svg'}
          alt={car.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
          priority={false}
          unoptimized={
            typeof imageData.primaryUrl === 'string' &&
            (imageData.primaryUrl.includes('/uploads/') ||
              imageData.primaryUrl.includes('/images/cars/listings/') ||
              imageData.primaryUrl.includes('/images/cars/auction-listings/'))
          }
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

        {/* تأثير متقدم للمزاد المباشر - وهج أحمر */}
        {car.auctionType === 'live' && (
          <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-t from-red-600/30 via-transparent to-transparent"></div>
        )}

        {/* تأثير متقدم للمزاد - overlay مع نص */}
        {car.isSold ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-green-600/30">
            <div className="rounded-lg bg-white/95 px-4 py-2 shadow-xl">
              <span className="text-base font-bold text-green-700">تم البيع</span>
            </div>
          </div>
        ) : (
          car.auctionType === 'ended' && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="rounded-lg bg-white/95 px-4 py-2 shadow-xl">
                <span className="text-base font-bold text-gray-900">انتهى المزاد</span>
              </div>
            </div>
          )
        )}

        <div className="absolute inset-x-2 bottom-2 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <StarIcon className="h-3 w-3 text-yellow-400" />
            <span className="text-xs font-bold text-white drop-shadow-sm">{car.bidCount}</span>
          </div>
          {formattedDate && (
            <span className="text-xs font-medium text-blue-100 drop-shadow-sm">
              {formattedDate}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-bold text-gray-900 transition-colors hover:text-blue-600 sm:text-base">
            {car.title}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteClick(car.id);
            }}
            className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs shadow-sm ${
              isFavorite
                ? 'border-red-500 bg-red-500 text-white'
                : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {isFavorite ? <HeartSolid className="h-4 w-4" /> : <HeartIcon className="h-4 w-4" />}
          </button>
        </div>

        <div className="mb-2 flex items-center gap-2 text-gray-600">
          <MapPinIcon className="h-3 w-3 text-blue-600" />
          <span className="text-xs font-medium">
            {(() => {
              const cityName = car.location || 'طرابلس';
              const areaName =
                car.area &&
                typeof car.area === 'string' &&
                car.area.trim() &&
                car.area !== 'غير محدد'
                  ? car.area.trim()
                  : '';

              return areaName ? `${cityName}، ${areaName}` : cityName;
            })()}
          </span>
        </div>

        {car.description && (
          <p className="mb-3 line-clamp-2 text-xs text-gray-600">{car.description}</p>
        )}

        <div className="mb-4 flex justify-center">
          <div className="scale-90">
            <SimpleCircularAuctionTimer
              endTime={car.auctionEndTime}
              startTime={car.auctionStartTime}
              currentBid={
                car.currentBid ||
                car.currentPrice ||
                car.startingBid ||
                car.startingPrice ||
                car.price ||
                '0'
              }
              bidCount={car.bidCount}
              startingBid={car.startingBid}
              reservePrice={car.reservePrice || undefined}
              auctionStatus={car.auctionType}
              externalTick={externalTick ?? -1}
            />
          </div>
        </div>

        <div className="mt-auto flex w-full gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onContactClick(car);
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-3 py-2 text-xs font-bold text-white shadow-lg transition-all duration-200 hover:from-blue-700 hover:to-blue-800 hover:shadow-xl"
          >
            <PhoneIcon className="h-3 w-3" />
            <span>اتصل الآن</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onBidClick(car);
            }}
            className="flex flex-1 items-center justify-center gap-1 rounded-lg border-2 border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition-all duration-200 hover:border-blue-300 hover:bg-blue-100"
          >
            <HandRaisedIcon className="h-3 w-3" />
            <span>التفاصيل</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuctionCardGrid;
