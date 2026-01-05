import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import HandRaisedIcon from '@heroicons/react/24/outline/HandRaisedIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import PhotoIcon from '@heroicons/react/24/outline/PhotoIcon';
import { HeartIcon as HeartSolid, SignalIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';
import { useRouter } from 'next/router';
import React from 'react';
// formatCityRegion تم استبداله بعرض location + area مباشرة
import { translateCondition } from '../../../../utils/carTranslations';

import ContactButton from '@/components/common/ui/buttons/ContactButton';
import { processCardImages } from '@/lib/services/UnifiedImageService';
import { SmartFeaturedBadge } from '../../../ui/FeaturedBadge';
import { UnifiedNavigationArrows } from '../../../ui/NavigationArrows';
import SimpleCircularAuctionTimer from '../timer/SimpleCircularAuctionTimer';

interface NewAuctionCardProps {
  car: {
    id: number;
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
    fuelType?: string;
    bodyType?: string;
    color?: string;
    doors?: number;
    transmission?: string;
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
    description: string;
    featured?: boolean;
    promotionPackage?: string;
    car?: {
      carImages?: Array<{ fileUrl: string; isPrimary?: boolean }>;
    };
  };
  onContactClick: (car: NewAuctionCardProps['car']) => void;
  onChatClick: (car: NewAuctionCardProps['car']) => void;
  onBidClick: (car: NewAuctionCardProps['car']) => void;
  onFavoriteClick: (auctionId: number) => void;
  onReminderClick?: (carId: number) => void;
  onCardClick?: (car: NewAuctionCardProps['car']) => void; // للتوجيه المخصص عند النقر على البطاقة
  isFavorite: boolean;
  hasReminder?: boolean;
  externalTick?: number;
  isYardAuction?: boolean; // إخفاء زر المزايدة لمزادات الساحات
}

const NewAuctionCard: React.FC<NewAuctionCardProps> = ({
  car,
  onContactClick,
  onChatClick,
  onBidClick,
  onFavoriteClick,
  onCardClick,
  isFavorite,
  externalTick,
  isYardAuction = false,
}) => {
  const router = useRouter();
  const { ref: visRef, hasIntersected } = useIntersectionObserver({
    triggerOnce: false,
    threshold: 0.1,
    rootMargin: '200px',
  });
  const [currentImageIndex, setCurrentImageIndex] = React.useState(0);
  const [imgError, setImgError] = React.useState(false);

  // شارة ديناميكية للمزاد القادم: تتحول إلى "بعد قليل" عندما يتبقى ≤ 60 دقيقة
  const isSoonToLive = React.useMemo(() => {
    if (!car?.auctionStartTime) return false;
    const startMs = Date.parse(car.auctionStartTime);
    if (!Number.isFinite(startMs)) return false;
    const diff = startMs - Date.now();
    return diff > 0 && diff <= 60 * 60 * 1000; // ≤ ساعة
  }, [car?.auctionStartTime, externalTick]);

  // معالجة الصور باستخدام النظام الموحد الجديد
  const imageData = processCardImages(
    {
      images: car.images,
      carImages: car?.car?.carImages || [],
      image: car.image,
    },
    'auction',
  );
  const getImageList = (): string[] => imageData.urls;

  // src آمن يضمن وجود قيمة صحيحة دومًا
  const imagesList = getImageList();
  const currentSrcCandidate =
    imagesList && imagesList.length > 0 ? imagesList[currentImageIndex] : '';
  const safeSrc =
    typeof currentSrcCandidate === 'string' && currentSrcCandidate.trim()
      ? currentSrcCandidate
      : '/images/cars/default-car.svg';

  // إعادة ضبط حالة الخطأ عند تغيّر الصورة الحالية
  React.useEffect(() => {
    setImgError(false);
  }, [currentImageIndex, safeSrc]);

  // دوال التنقل بين الصور
  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const images = getImageList();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const images = getImageList();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  // معالج النقر على البطاقة - يستخدم onCardClick المخصص إذا كان متاحاً
  const handleCardClick = (e: React.MouseEvent) => {
    // تجنب التنقل إذا تم النقر على الأزرار أو أسهم التنقل
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    // استخدام التوجيه المخصص إذا كان متاحاً (مثل مزادات الساحات)
    if (onCardClick) {
      onCardClick(car);
    } else {
      router.push(`/auction/${car.id}`);
    }
  };

  return (
    <div
      className="opensooq-car-card max-h-[400px] min-h-[240px] cursor-pointer lg:max-h-[350px] xl:max-h-[300px]"
      ref={visRef}
      onClick={handleCardClick}
    >
      <div className="car-card-content flex max-h-[400px] min-h-[240px] flex-col justify-between lg:max-h-[350px] xl:max-h-[300px]">
        <div className="flex h-full">
          {/* صورة السيارة مع التنقل - الجانب الأيمن */}
          <div className="car-card-image group relative h-auto max-h-[400px] min-h-[240px] w-64 flex-shrink-0 lg:max-h-[350px] xl:max-h-[300px]">
            <Image
              src={imgError ? '/images/cars/default-car.svg' : safeSrc}
              alt={car.title || 'سيارة'}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 256px, (max-width: 1200px) 256px, 256px"
              priority={currentImageIndex === 0}
              onError={() => setImgError(true)}
              unoptimized={safeSrc.includes('/listings/') || safeSrc.includes('/uploads/')}
            />

            {/* تأثير متقدم للمزاد المباشر - وهج أحمر */}
            {car.auctionType === 'live' && (
              <div className="pointer-events-none absolute inset-0 animate-pulse bg-gradient-to-t from-red-600/30 via-transparent to-transparent"></div>
            )}

            {/* تأثير متقدم للمزاد - overlay مع نص */}
            {car.isSold ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-green-600/30">
                <div className="rounded-lg bg-white/95 px-6 py-3 shadow-xl">
                  <span className="text-lg font-bold text-green-700">تم البيع</span>
                </div>
              </div>
            ) : (
              car.auctionType === 'ended' && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="rounded-lg bg-white/95 px-6 py-3 shadow-xl">
                    <span className="text-lg font-bold text-gray-900">انتهى المزاد</span>
                  </div>
                </div>
              )
            )}

            {/* شارة إعلان مميز - استخدام المكون الموحد */}
            {(car.featured || (car.promotionPackage && car.promotionPackage !== 'free')) && (
              <div className="absolute left-2 top-2 z-50" style={{ zIndex: 9999 }}>
                <SmartFeaturedBadge
                  packageType={car.promotionPackage}
                  featured={car.featured}
                  size="sm"
                />
              </div>
            )}

            {/* شارة حالة المزاد */}
            <div className="absolute right-2 top-2 z-20">
              {car.auctionType === 'live' && (
                <div className="flex animate-pulse items-center gap-1.5 rounded-md bg-gradient-to-r from-red-600 to-red-500 px-2 py-1 shadow-md backdrop-blur-sm">
                  <SignalIcon className="h-3.5 w-3.5 text-white" />
                  <span className="text-xs font-bold text-white">مزاد مباشر</span>
                </div>
              )}

              {car.auctionType === 'upcoming' && (
                <div
                  className={`flex items-center gap-1.5 rounded-md bg-gradient-to-r from-amber-600 to-amber-500 px-2 py-1 shadow-md backdrop-blur-sm ${
                    isSoonToLive ? 'animate-pulse' : ''
                  }`}
                  style={
                    isSoonToLive ? { boxShadow: '0 0 10px rgba(245, 158, 11, 0.45)' } : undefined
                  }
                >
                  {isSoonToLive && (
                    <span className="relative mr-0.5 inline-flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-200"></span>
                    </span>
                  )}
                  <ClockIcon className="h-3.5 w-3.5 text-white" />
                  <span className="text-xs font-bold text-white">
                    {isSoonToLive ? 'بعد قليل' : 'قريباً'}
                  </span>
                </div>
              )}

              {car.isSold ? (
                <div className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-green-600 to-green-500 px-2 py-1 shadow-md backdrop-blur-sm">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-white" />
                  <span className="text-xs font-bold text-white">تم البيع</span>
                </div>
              ) : (
                car.auctionType === 'ended' && (
                  <div className="flex items-center gap-1.5 rounded-md bg-gradient-to-r from-gray-600 to-gray-500 px-2 py-1 shadow-md backdrop-blur-sm">
                    <CheckCircleIcon className="h-3.5 w-3.5 text-white" />
                    <span className="text-xs font-bold text-white">منتهي</span>
                  </div>
                )
              )}
            </div>

            {/* أزرار التنقل الموحدة */}
            <UnifiedNavigationArrows
              onPrevious={prevImage}
              onNext={nextImage}
              show={getImageList().length > 1}
            />

            {/* عداد الصور */}
            {getImageList().length > 1 && (
              <div className="absolute bottom-2 right-2 z-20 flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-xs text-white backdrop-blur-sm">
                <PhotoIcon className="h-3 w-3" />
                {currentImageIndex + 1}/{getImageList().length}
              </div>
            )}
          </div>

          {/* المحتوى الرئيسي - الوسط */}
          <div className="flex flex-1 flex-col justify-between p-4">
            {/* القسم العلوي */}
            <div>
              {/* العنوان */}
              <h3 className="mb-3 line-clamp-2 text-lg font-bold text-gray-900 transition-colors hover:text-blue-600">
                {car.title}
              </h3>

              {/* معلومات السيارة - 6 خصائص في سطر واحد */}
              <div className="mb-3 text-sm text-gray-600">
                <div className="flex flex-wrap items-start gap-1 text-xs">
                  {(() => {
                    const properties = [];

                    // إضافة الخصائص المتوفرة بالترتيب المطلوب
                    if (car.brand && car.brand !== 'غير محدد' && car.brand.trim()) {
                      properties.push(car.brand);
                    }
                    if (car.model && car.model !== 'غير محدد' && car.model.trim()) {
                      properties.push(car.model);
                    }
                    if (car.year && car.year !== 'غير محدد') {
                      properties.push(car.year.toString());
                    }
                    if (
                      car.mileage &&
                      typeof car.mileage === 'string' &&
                      car.mileage !== '0' &&
                      car.mileage !== 'غير محدد' &&
                      !car.mileage.includes('غير محدد')
                    ) {
                      // إزالة "كم" إذا كانت مضافة مسبقاً لتجنب التكرار، ثم إضافتها مرة واحدة إذا لزم الأمر
                      // ولكن بما أن formatMileage يضيفها، فنحن نستخدم القيمة كما هي
                      properties.push(car.mileage);
                    }
                    if (
                      car.transmission &&
                      car.transmission !== 'غير محدد' &&
                      car.transmission.trim()
                    ) {
                      properties.push(car.transmission);
                    }
                    if (car.condition && car.condition !== 'غير محدد' && car.condition.trim()) {
                      properties.push(translateCondition(car.condition));
                    }

                    // إضافة خصائص إضافية إذا لم نصل إلى 6
                    if (
                      properties.length < 6 &&
                      car.fuelType &&
                      car.fuelType !== 'غير محدد' &&
                      car.fuelType.trim()
                    ) {
                      properties.push(car.fuelType);
                    }
                    if (
                      properties.length < 6 &&
                      car.bodyType &&
                      car.bodyType !== 'غير محدد' &&
                      car.bodyType.trim()
                    ) {
                      properties.push(car.bodyType);
                    }
                    if (
                      properties.length < 6 &&
                      car.color &&
                      car.color !== 'غير محدد' &&
                      car.color.trim()
                    ) {
                      properties.push(car.color);
                    }

                    // عرض أول 6 خصائص فقط
                    const displayProperties = properties.slice(0, 6);

                    return displayProperties.map((property, index) => (
                      <span key={index} className="flex items-start">
                        <span>{property}</span>
                        {index < displayProperties.length - 1 && (
                          <span className="mx-1 text-gray-400">-</span>
                        )}
                      </span>
                    ));
                  })()}
                </div>

                {/* الموقع */}
                <div className="mt-2 flex items-start justify-start gap-2">
                  {/* الموقع */}
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
                      ></path>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z"
                      ></path>
                    </svg>
                    <span>
                      {(() => {
                        // عرض آمن ومستقر للموقع والمنطقة
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
                </div>
              </div>

              {/* فاصل إضافي */}
              <div className="mb-3"></div>
            </div>

            {/* القسم السفلي - الأزرار في سطر واحد */}
            <div className="grid w-full grid-cols-[1fr_1fr_1fr_auto] items-center gap-x-0 gap-y-1 border-t border-gray-200 pt-3">
              {/* زر الاتصال الموحد */}
              <ContactButton
                phone={car.phone}
                onClick={(e) => {
                  e.stopPropagation();
                  onContactClick(car);
                }}
                className={isYardAuction ? 'justify-center text-sm [&>svg]:h-4 [&>svg]:w-4' : ''}
              />

              {/* زر الدردشة */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onChatClick(car);
                }}
                className="flex h-10 w-full items-center justify-center gap-1 rounded-md bg-blue-600 px-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
              >
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                <span>رسالة</span>
              </button>

              {/* زر المزايدة - يختفي في مزادات الساحات */}
              {!isYardAuction && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBidClick(car);
                  }}
                  className={`flex h-10 w-full items-center justify-center gap-1 rounded-md px-3 text-sm font-medium transition-colors ${
                    car.auctionType === 'ended'
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      : car.auctionType === 'upcoming'
                        ? 'bg-amber-600 text-white hover:bg-amber-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  <HandRaisedIcon className="h-4 w-4" />
                  <span>{car.auctionType === 'live' ? 'مزايدة' : 'التفاصيل'}</span>
                </button>
              )}

              {/* زر المفضلة */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteClick(car.id);
                }}
                className={`flex h-10 items-center justify-center rounded-md px-2 transition-colors ${
                  isFavorite
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isFavorite ? (
                  <HeartSolid className="h-4 w-4" />
                ) : (
                  <HeartIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* العداد الدائري - الجانب الأيسر */}
          <div className="flex items-center justify-center px-4">
            <div
              className="sm:scale-80 md:scale-85 scale-75 lg:scale-90 auction-lg:scale-95 xl:scale-100"
              style={{ contain: 'content', willChange: 'transform, opacity' }}
            >
              {/* العداد مع تصغير متدرج للشاشات المختلفة */}
              {/* scale-75: للشاشات الصغيرة جداً (أقل من 640px) */}
              {/* sm:scale-80: للشاشات الصغيرة (640px+) */}
              {/* md:scale-85: للشاشات المتوسطة الصغيرة (768px+) */}
              {/* lg:scale-90: للشاشات المتوسطة (1024px+) */}
              {/* auction-lg:scale-95: للشاشات الكبيرة (1142px+) - العداد أصغر تحت 1142px */}
              {/* xl:scale-100: للشاشات الكبيرة جداً (1280px+) */}
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
                externalTick={hasIntersected ? externalTick : -1}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// تحسين الأداء: React.memo مع مُقارن يأخذ نبضة الوقت والحقول الزمنية بعين الاعتبار
// الهدف: السماح بإعادة التصيير كل ثانية عندما تتغير externalTick لضمان تحديث العداد
export default React.memo(NewAuctionCard, (prevProps, nextProps) => {
  const isSame =
    prevProps.car.id === nextProps.car.id &&
    prevProps.car.currentBid === nextProps.car.currentBid &&
    prevProps.car.bidCount === nextProps.car.bidCount &&
    prevProps.isFavorite === nextProps.isFavorite &&
    // إعادة التصيير عند تغيّر نبضة الوقت العالمية لتحديث العداد
    prevProps.externalTick === nextProps.externalTick &&
    // إعادة التصيير عند تغيّر بيانات الحالة الزمنية للمزاد
    prevProps.car.auctionStartTime === nextProps.car.auctionStartTime &&
    prevProps.car.auctionEndTime === nextProps.car.auctionEndTime &&
    prevProps.car.auctionType === nextProps.car.auctionType;

  return isSame;
});
