import { Dialog, Transition } from '@headlessui/react';
import BuildingStorefrontIcon from '@heroicons/react/24/outline/BuildingStorefrontIcon';
import CalendarDaysIcon from '@heroicons/react/24/outline/CalendarDaysIcon';
import CameraIcon from '@heroicons/react/24/outline/CameraIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import CheckBadgeIcon from '@heroicons/react/24/outline/CheckBadgeIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import StarIcon from '@heroicons/react/24/outline/StarIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { useRouter } from 'next/router';
import React, { Fragment, useState } from 'react';
import { quickDecodeName } from '../../utils/universalNameDecoder';
import SafeImage from '../SafeImage';
import { UnifiedNavigationArrows } from '../ui/NavigationArrows';

interface Showroom {
  id: string;
  name: string;
  description: string;
  location: string;
  city: string;
  phone: string;
  rating: number;
  reviewsCount: number;
  totalCars: number;
  activeCars: number;
  images: string[] | string;
  verified: boolean;
  featured: boolean;
  specialties: string[];
  establishedYear: number;
  openingHours: string;
  type: string;
  user: {
    id: string;
    name: string;
    phone: string;
    verified: boolean;
    profileImage?: string;
    accountType: string;
    rating?: number;
    totalReviews?: number;
  };
}

interface ShowroomInfoModalProps {
  showroom: Showroom;
  isOpen: boolean;
  onClose: () => void;
}

const ShowroomInfoModal: React.FC<ShowroomInfoModalProps> = ({ showroom, isOpen, onClose }) => {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // صور المعرض مع صورة افتراضية
  const showroomImages = (() => {
    const defaultImage = '/images/showrooms/default-showroom.svg';

    if (!showroom.images) {
      return [defaultImage];
    }

    // إذا كانت الصور مصفوفة بالفعل
    if (Array.isArray(showroom.images) && showroom.images.length > 0) {
      // تصفية الصور غير الصالحة
      const validImages = showroom.images.filter(
        (img) =>
          img &&
          img.trim() &&
          !img.includes('blob:') && // استبعاد blob URLs
          (img.endsWith('.svg') ||
            img.endsWith('.jpg') ||
            img.endsWith('.jpeg') ||
            img.endsWith('.png') ||
            img.endsWith('.webp') ||
            img.startsWith('http')), // السماح بـ URLs الخارجية
      );
      return validImages.length > 0 ? validImages : [defaultImage];
    }

    // إذا كانت الصور نص مفصول بفواصل
    if (typeof showroom.images === 'string' && showroom.images.trim()) {
      const imageArray = showroom.images
        .split(',')
        .map((img) => img.trim())
        .filter(
          (img) =>
            img &&
            !img.includes('blob:') && // استبعاد blob URLs
            (img.endsWith('.svg') ||
              img.endsWith('.jpg') ||
              img.endsWith('.jpeg') ||
              img.endsWith('.png') ||
              img.endsWith('.webp') ||
              img.startsWith('http')), // السماح بـ URLs الخارجية
        );
      return imageArray.length > 0 ? imageArray : [defaultImage];
    }

    return [defaultImage];
  })();

  // التنقل للصورة التالية
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev === showroomImages.length - 1 ? 0 : prev + 1));
  };

  // التنقل للصورة السابقة
  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? showroomImages.length - 1 : prev - 1));
  };

  const formatSpecialties = (specialties: string[]) => {
    if (!specialties || specialties.length === 0) return 'معرض عام';
    return specialties.join('، ');
  };

  // معالج الانتقال إلى صفحة تفاصيل المعرض
  const handleViewDetails = () => {
    onClose(); // إغلاق النافذة المنبثقة أولاً
    router.push(`/showrooms/${showroom.id}`);
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose} dir="rtl">
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-right align-middle shadow-xl transition-all">
                {/* رأس النافذة */}
                <div className="flex items-center justify-between border-b border-gray-200 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                      <BuildingStorefrontIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{showroom.name}</h3>
                      <p className="text-sm text-gray-500">{showroom.location}</p>
                    </div>
                    {showroom.verified && <CheckBadgeIcon className="h-5 w-5 text-green-500" />}
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                {/* محتوى النافذة */}
                <div className="max-h-[70vh] overflow-y-auto p-6">
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* قسم الصور */}
                    <div className="space-y-4">
                      <div className="relative h-64 w-full overflow-hidden rounded-lg">
                        <SafeImage
                          src={
                            showroomImages[currentImageIndex] ||
                            '/images/showrooms/default-showroom.svg'
                          }
                          alt={showroom.name}
                          className="h-full w-full object-cover"
                          fallbackSrc="/images/showrooms/default-showroom.svg"
                        />

                        {/* أسهم التنقل بين الصور */}
                        <UnifiedNavigationArrows
                          onPrevious={prevImage}
                          onNext={nextImage}
                          show={showroomImages && showroomImages.length > 1}
                        />

                        {/* مؤشرات الصور */}
                        {showroomImages && showroomImages.length > 1 && (
                          <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1">
                            {showroomImages.map((_, index) => (
                              <div
                                key={index}
                                className={`h-2 w-2 rounded-full transition-colors ${
                                  index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        )}

                        {/* عدد الصور */}
                        {showroomImages && showroomImages.length > 1 && (
                          <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-2 py-1 text-xs text-white">
                            <CameraIcon className="h-3 w-3" />
                            {showroomImages.length}
                          </div>
                        )}
                      </div>

                      {/* معرض الصور المصغرة */}
                      {showroomImages && showroomImages.length > 1 && (
                        <div className="grid grid-cols-4 gap-2">
                          {showroomImages.slice(0, 4).map((image, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentImageIndex(index)}
                              className={`relative h-16 w-full overflow-hidden rounded border-2 transition-colors ${
                                index === currentImageIndex
                                  ? 'border-blue-500'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <SafeImage
                                src={image}
                                alt={`${showroom.name} ${index + 1}`}
                                className="h-full w-full object-cover"
                                fallbackSrc="/images/showrooms/default-showroom.svg"
                              />
                              {index === 3 && showroomImages.length > 4 && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
                                  +{showroomImages.length - 4}
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* قسم المعلومات */}
                    <div className="space-y-6">
                      {/* الوصف */}
                      {showroom.description && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-gray-900">الوصف</h4>
                          <p className="text-sm text-gray-600">{showroom.description}</p>
                        </div>
                      )}

                      {/* المعلومات الأساسية */}
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-gray-900">معلومات المعرض</h4>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPinIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">الموقع:</span>
                            <span className="font-medium">{showroom.location}</span>
                          </div>

                          <div className="flex items-center gap-2 text-sm">
                            <PhoneIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">الهاتف:</span>
                            <span className="font-medium" dir="ltr">
                              {showroom.phone}
                            </span>
                          </div>

                          {showroom.openingHours && (
                            <div className="flex items-center gap-2 text-sm">
                              <ClockIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">ساعات العمل:</span>
                              <span className="font-medium">{showroom.openingHours}</span>
                            </div>
                          )}

                          {showroom.establishedYear && (
                            <div className="flex items-center gap-2 text-sm">
                              <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                              <span className="text-gray-600">تأسس عام:</span>
                              <span className="font-medium">{showroom.establishedYear}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-sm">
                            <UserIcon className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-600">المالك:</span>
                            <span className="font-medium">
                              {quickDecodeName(showroom.user.name)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* التخصصات */}
                      {showroom.specialties && showroom.specialties.length > 0 && (
                        <div>
                          <h4 className="mb-2 text-sm font-medium text-gray-900">التخصصات</h4>
                          <div className="flex flex-wrap gap-2">
                            {showroom.specialties.map((specialty, index) => (
                              <span
                                key={index}
                                className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800"
                              >
                                {specialty}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* الإحصائيات */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {showroom.totalCars}
                          </div>
                          <div className="text-xs text-gray-600">إجمالي السيارات</div>
                        </div>
                        <div className="rounded-lg bg-gray-50 p-3 text-center">
                          <div className="text-lg font-bold text-gray-900">
                            {showroom.activeCars}
                          </div>
                          <div className="text-xs text-gray-600">السيارات المتاحة</div>
                        </div>
                      </div>

                      {/* التقييم */}
                      <div>
                        <h4 className="mb-2 text-sm font-medium text-gray-900">التقييم</h4>
                        {(showroom.rating || 0) > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <StarIcon
                                  key={star}
                                  className={`h-4 w-4 ${
                                    star <= Math.round(showroom.rating || 0)
                                      ? 'fill-current text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium text-gray-700">
                              {(showroom.rating || 0).toFixed(1)}
                            </span>
                            <span className="text-xs text-gray-500">
                              ({showroom.reviewsCount || 0} تقييم)
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">لا توجد تقييمات بعد</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* أزرار التواصل والتفاصيل */}
                <div className="border-t border-gray-200 p-6">
                  {/* زر عرض التفاصيل الكاملة */}
                  <div className="mb-4">
                    <div className="mb-2 text-center">
                      <p className="text-xs text-gray-500">
                        لعرض جميع السيارات والتفاصيل الكاملة للمعرض
                      </p>
                    </div>
                    <button
                      onClick={handleViewDetails}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
                    >
                      <EyeIcon className="h-4 w-4" />
                      عرض التفاصيل الكاملة
                    </button>
                  </div>

                  {/* أزرار التواصل */}
                  <div className="flex gap-3">
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                      <PhoneIcon className="h-4 w-4" />
                      اتصال
                    </button>
                    <button className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50">
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      مراسلة
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

export default ShowroomInfoModal;
