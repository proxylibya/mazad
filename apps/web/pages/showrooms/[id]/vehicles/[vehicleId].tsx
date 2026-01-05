import BuildingOfficeIcon from '@heroicons/react/24/outline/BuildingOfficeIcon';
import BuildingStorefrontIcon from '@heroicons/react/24/outline/BuildingStorefrontIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import CameraIcon from '@heroicons/react/24/outline/CameraIcon';
import ChatBubbleLeftRightIcon from '@heroicons/react/24/outline/ChatBubbleLeftRightIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClipboardDocumentIcon from '@heroicons/react/24/outline/ClipboardDocumentIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import CreditCardIcon from '@heroicons/react/24/outline/CreditCardIcon';
import DocumentCheckIcon from '@heroicons/react/24/outline/DocumentCheckIcon';
import DocumentTextIcon from '@heroicons/react/24/outline/DocumentTextIcon';
import ExclamationTriangleIcon from '@heroicons/react/24/outline/ExclamationTriangleIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import FireIcon from '@heroicons/react/24/outline/FireIcon';
import GlobeAltIcon from '@heroicons/react/24/outline/GlobeAltIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import MapIcon from '@heroicons/react/24/outline/MapIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PaintBrushIcon from '@heroicons/react/24/outline/PaintBrushIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import ShieldCheckIcon from '@heroicons/react/24/outline/ShieldCheckIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import StarIcon from '@heroicons/react/24/outline/StarIcon';
import TruckIcon from '@heroicons/react/24/outline/TruckIcon';
import UserGroupIcon from '@heroicons/react/24/outline/UserGroupIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import CarFeaturesDisplay from '../../../../components/CarFeaturesDisplay';
import CarLocationSection from '../../../../components/CarLocationSection';
import CategorizedFeaturesDisplay from '../../../../components/CategorizedFeaturesDisplay';
import SafetyTips from '../../../../components/SafetyTips';
import LoginModal from '../../../../components/auth/LoginModal';
import { OpensooqNavbar } from '../../../../components/common';
import { UnifiedNavigationArrows } from '../../../../components/ui/NavigationArrows';
import useAuth from '../../../../hooks/useAuth';
import { useFavorites } from '../../../../hooks/useFavorites';

// واجهة بيانات السيارة
interface Car {
  id: string;
  title: string;
  price: string;
  condition: string;
  brand: string;
  model: string;
  year: number;
  bodyType?: string;
  mileage?: string;
  fuelType?: string;
  transmission?: string;
  location: string;
  images: string[];
  description?: string;
  features?: string[] | string;
  extractedFeatures?: string[];
  interiorFeatures?: string[];
  exteriorFeatures?: string[];
  technicalFeatures?: string[];
  showroomId?: string;
  views?: number;
  createdAt?: string;
  vehicleType?: string;
  manufacturingCountry?: string;
  regionalSpecs?: string;
  seatCount?: string;
  color?: string;
  interiorColor?: string;
  chassisNumber?: string;
  engineNumber?: string;
  engineSize?: string;
  customsStatus?: string;
  licenseStatus?: string;
  insuranceStatus?: string;
  paymentMethod?: string;
  contactPhone?: string;
  locationLat?: number;
  locationLng?: number;
  locationAddress?: string;
  originalPrice?: string;
  user?: {
    id: string;
    name: string;
    phone: string;
    verified: boolean;
  };
}

// واجهة بيانات المعرض
interface Showroom {
  id: string;
  name: string;
  description?: string;
  location: string;
  phone: string;
  verified: boolean;
  rating?: number;
  reviewsCount?: number;
  totalCars?: number;
  specialties?: string[];
  images?: string[];
  user?: {
    id: string;
    name: string;
    phone: string;
    verified: boolean;
  };
}

export default function ShowroomVehicleDetails() {
  const router = useRouter();
  const { id: showroomId, vehicleId } = router.query;
  const [car, setCar] = useState<Car | null>(null);
  const [showroom, setShowroom] = useState<Showroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    type: '',
    message: '',
  });
  const [imageErrors, setImageErrors] = useState<{ [key: number]: boolean }>({});
  const { isFavorite, toggleFavorite } = useFavorites();
  const { user } = useAuth();

  // دالة لتنسيق الأرقام
  const formatNumber = (num: string) => {
    return parseInt(num.replace(/,/g, '')).toLocaleString();
  };

  // معالجة أخطاء تحميل الصور
  const handleImageError = (index: number) => {
    setImageErrors((prev) => ({ ...prev, [index]: true }));
  };

  // الحصول على صورة بديلة
  const getImageSrc = (src: string, index: number) => {
    if (imageErrors[index]) {
      return '/images/cars/default-car.svg';
    }
    return src;
  };

  // دالة إظهار الإشعارات
  const showNotification = (type: 'success' | 'error' | 'warning', message: string) => {
    setNotification({ show: true, type, message });
    setTimeout(() => {
      setNotification({ show: false, type: '', message: '' });
    }, 5000);
  };

  // دالة التحقق من تسجيل الدخول وإظهار نافذة التسجيل
  const requireLogin = (action: string, callback?: () => void) => {
    if (!user) {
      setShowAuthModal(true);
      return false;
    }
    if (callback) callback();
    return true;
  };

  // معالجة نجاح تسجيل الدخول
  const handleAuthSuccess = () => {
    setShowAuthModal(false);
    showNotification('success', 'تم تسجيل الدخول بنجاح');
  };

  useEffect(() => {
    if (showroomId && vehicleId) {
      fetchCarDetails();
      fetchShowroomDetails();
    }
  }, [showroomId, vehicleId]);

  const fetchCarDetails = async () => {
    try {
      const response = await fetch(`/api/showroom/${showroomId}/vehicles/${vehicleId}`);
      if (response.ok) {
        const data = await response.json();
        setCar(data);
      }
    } catch (error) {
      console.error('Error fetching car details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchShowroomDetails = async () => {
    try {
      const response = await fetch(`/api/showrooms/${showroomId}`);
      if (response.ok) {
        const data = await response.json();
        setShowroom(data);
      }
    } catch (error) {
      console.error('Error fetching showroom details:', error);
    }
  };

  const handleFavoriteClick = async () => {
    if (!car) return;

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    await toggleFavorite(car.id);
  };

  const handleShare = async () => {
    requireLogin('لمشاركة السيارة', async () => {
      const url = window.location.href;
      const title = `${car?.title} - ${showroom?.name}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title,
            text: `شاهد هذه السيارة الرائعة: ${car?.title}`,
            url,
          });
        } catch (error) {
          console.log('مشاركة ملغاة');
        }
      } else {
        // نسخ الرابط للحافظة
        try {
          await navigator.clipboard.writeText(url);
          showNotification('success', 'تم نسخ الرابط بنجاح');
        } catch (error) {
          showNotification('error', 'فشل في نسخ الرابط');
        }
      }
    });
  };

  const handleContactClick = () => {
    if (!car) return;
    requireLogin('لعرض معلومات الاتصال', () => {
      setShowContactInfo(!showContactInfo);
      showNotification('success', 'تم عرض معلومات الاتصال');
    });
  };

  const handleDirectCall = () => {
    if (!car?.contactPhone && !showroom?.phone) {
      showNotification('error', 'رقم الهاتف غير متوفر');
      return;
    }
    window.open(`tel:${car?.contactPhone || showroom?.phone}`);
  };

  const handleSendMessage = () => {
    if (!car) return;
    requireLogin('لإرسال رسالة', () => {
      router.push(
        `/messages?contact=${encodeURIComponent(showroom?.name || 'المعرض')}&car=${encodeURIComponent(car.title)}&showroomId=${showroomId}`,
      );
    });
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (vehicleId && typeof vehicleId === 'string') {
      await toggleFavorite(vehicleId);
    }
  };

  // تم إزالة spinner - UnifiedPageTransition يتولى ذلك
  if (loading) return null;

  if (!car) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OpensooqNavbar />
        <div className="container mx-auto px-4 py-8">
          <div className="py-20 text-center">
            <h1 className="mb-4 text-2xl font-bold text-gray-900">السيارة غير موجودة</h1>
            <p className="mb-8 text-gray-600">لم يتم العثور على السيارة المطلوبة</p>
            <Link
              href={`/showrooms/${showroomId}`}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
            >
              العودة للمعرض
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>
          {car.title} - {showroom?.name || 'معرض السيارات'}
        </title>
        <meta name="description" content={`${car.title} - ${car.brand} ${car.model} ${car.year}`} />
      </Head>

      <OpensooqNavbar />

      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* إشعارات النظام */}
        {notification.show && (
          <div className="fixed right-4 top-4 z-50 max-w-sm">
            <div
              className={`rounded-lg border-r-4 p-4 shadow-lg ${
                notification.type === 'success'
                  ? 'border-green-400 bg-green-50 text-green-800'
                  : notification.type === 'error'
                    ? 'border-red-400 bg-red-50 text-red-800'
                    : 'border-yellow-400 bg-yellow-50 text-yellow-800'
              }`}
            >
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {notification.type === 'success' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-400" />
                  )}
                  {notification.type === 'error' && <XMarkIcon className="h-5 w-5 text-red-400" />}
                  {notification.type === 'warning' && (
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  )}
                </div>
                <div className="mr-3 flex-1">
                  <p className="text-sm font-medium">{notification.message}</p>
                </div>
                <button
                  onClick={() => setNotification({ show: false, type: '', message: '' })}
                  className="mr-2 flex-shrink-0"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-7xl px-4 py-6">
          {/* Breadcrumb */}
          <nav className="mb-6 flex text-sm">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              الرئيسية
            </Link>
            <span className="mx-2 text-gray-500">/</span>
            <Link href="/showrooms" className="text-blue-600 hover:text-blue-800">
              المعارض
            </Link>
            <span className="mx-2 text-gray-500">/</span>
            <Link href={`/showrooms/${showroomId}`} className="text-blue-600 hover:text-blue-800">
              {showroom?.name || 'المعرض'}
            </Link>
            <span className="mx-2 text-gray-500">/</span>
            <span className="text-gray-700">
              {car.brand} {car.model}
            </span>
          </nav>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column - Images and Details */}
            <div className="space-y-6 lg:col-span-2">
              {/* معرض الصور */}
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="group relative">
                  <img
                    src={getImageSrc(
                      car.images[currentImageIndex] || '/images/cars/default-car.svg',
                      currentImageIndex,
                    )}
                    alt={car.title}
                    className="h-96 w-full object-cover"
                    onError={() => handleImageError(currentImageIndex)}
                  />

                  {/* أزرار التنقل الموحدة */}
                  <UnifiedNavigationArrows
                    onPrevious={() =>
                      setCurrentImageIndex((prev) =>
                        prev === 0 ? car.images.length - 1 : prev - 1,
                      )
                    }
                    onNext={() =>
                      setCurrentImageIndex((prev) =>
                        prev === car.images.length - 1 ? 0 : prev + 1,
                      )
                    }
                    show={car.images && car.images.length > 1}
                  />

                  {/* أزرار الإجراءات */}
                  <div className="absolute right-4 top-4 flex gap-2">
                    <button
                      onClick={handleFavoriteToggle}
                      className="rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white"
                      title={
                        user
                          ? isFavorite(vehicleId as string)
                            ? 'إزالة من المفضلة'
                            : 'إضافة للمفضلة'
                          : 'سجل دخولك لإضافة للمفضلة'
                      }
                    >
                      {isFavorite(vehicleId as string) ? (
                        <HeartSolid className="h-5 w-5 text-red-500" />
                      ) : (
                        <HeartIcon className="h-5 w-5 text-gray-600" />
                      )}
                    </button>
                    <button
                      onClick={handleShare}
                      className="rounded-full bg-white/90 p-2 shadow-lg backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white"
                      title={user ? 'مشاركة السيارة' : 'سجل دخولك للمشاركة'}
                    >
                      <ShareIcon className="h-5 w-5 text-gray-600" />
                    </button>
                  </div>

                  {/* معلومات الصور والمشاهدات */}
                  <div className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-sm text-white backdrop-blur-sm">
                    <CameraIcon className="h-4 w-4" />
                    {car.images.length} صور
                  </div>
                  <div className="absolute bottom-4 left-4 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-sm text-white backdrop-blur-sm">
                    <EyeIcon className="h-4 w-4" />
                    {(car.views || 0).toLocaleString()} مشاهدة
                  </div>
                </div>

                {/* الصور المصغرة */}
                <div className="flex gap-2 overflow-x-auto p-4">
                  {car.images.map((image: string, index: number) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-all duration-200 ${
                        currentImageIndex === index
                          ? 'border-blue-500 shadow-md'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img
                        src={getImageSrc(image, index)}
                        alt={`صورة ${index + 1}`}
                        className="h-full w-full object-cover"
                        onError={() => handleImageError(index)}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* تفاصيل السيارة الرئيسية */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-start justify-between">
                  <div className="flex-1">
                    <h1 className="mb-3 text-2xl font-bold text-gray-900">{car.title}</h1>

                    {/* التاريخ والمدينة */}
                    <div className="mb-3 flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>
                          {new Date().toLocaleDateString('ar-LY', {
                            day: 'numeric',
                            month: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4" />
                        <span>{car.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="price-value mb-1 text-3xl font-bold text-green-600">
                      {formatNumber(car.price)} <span className="text-lg">د.ل</span>
                    </div>
                    {car.originalPrice && (
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">
                        خصم 10%
                      </span>
                    )}
                  </div>
                </div>

                {/* وصف السيارة */}
                {car.description && (
                  <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center gap-2">
                      <DocumentTextIcon className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">وصف السيارة</h3>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-4">
                      <p className="leading-relaxed text-gray-700">{car.description}</p>
                    </div>
                  </div>
                )}

                {/* المواصفات الأساسية */}
                <div className="car-specifications-container">
                  <div className="car-features-title">
                    <CogIcon className="car-features-title-icon" />
                    <h3 className="car-features-title-text">مواصفات السيارة</h3>
                  </div>
                  <div className="car-specifications-grid">
                    {Object.entries({
                      brand: car.brand,
                      model: car.model,
                      year: car.year,
                      condition: car.condition,
                      mileage: car.mileage,
                      fuelType: car.fuelType,
                      transmission: car.transmission,
                      bodyType: car.bodyType,
                      color: car.color,
                      engineSize: car.engineSize,
                      interiorColor: car.interiorColor,
                      seatCount: car.seatCount,
                      regionalSpecs: car.regionalSpecs,
                      vehicleType: car.vehicleType,
                      manufacturingCountry: car.manufacturingCountry,
                      customsStatus: car.customsStatus,
                      licenseStatus: car.licenseStatus,
                      insuranceStatus: car.insuranceStatus,
                      paymentMethod: car.paymentMethod,
                      chassisNumber: car.chassisNumber,
                      engineNumber: car.engineNumber,
                    })
                      .filter(([key, value]) => {
                        const stringValue = value as string;
                        const importantFields = [
                          'chassisNumber',
                          'engineNumber',
                          'engineSize',
                          'fuelType',
                          'vehicleType',
                          'manufacturingCountry',
                          'customsStatus',
                          'licenseStatus',
                          'insuranceStatus',
                        ];

                        if (importantFields.includes(key)) {
                          return stringValue && stringValue.toString().trim() !== '';
                        }

                        return (
                          stringValue &&
                          stringValue.toString().trim() !== '' &&
                          stringValue !== 'غير محدد' &&
                          stringValue !== 'غير متوفر'
                        );
                      })
                      .sort(([keyA], [keyB]) => {
                        const priority: { [key: string]: number } = {
                          brand: 1,
                          model: 2,
                          year: 3,
                          condition: 4,
                          mileage: 5,
                          fuelType: 6,
                          transmission: 7,
                          bodyType: 8,
                          color: 9,
                          engineSize: 10,
                          interiorColor: 11,
                          seatCount: 12,
                          regionalSpecs: 13,
                          vehicleType: 14,
                          manufacturingCountry: 15,
                          customsStatus: 16,
                          licenseStatus: 17,
                          insuranceStatus: 18,
                          paymentMethod: 19,
                          chassisNumber: 20,
                          engineNumber: 21,
                        };
                        return (priority[keyA] || 99) - (priority[keyB] || 99);
                      })
                      .map(([key, value]) => {
                        const getFieldInfo = (fieldKey: string) => {
                          const fieldInfo: {
                            [key: string]: {
                              label: string;
                              icon: React.ComponentType<any>;
                            };
                          } = {
                            brand: {
                              label: 'الماركة',
                              icon: BuildingOfficeIcon,
                            },
                            model: { label: 'الموديل', icon: TruckIcon },
                            year: { label: 'سنة الصنع', icon: CalendarIcon },
                            mileage: {
                              label: 'المسافة المقطوعة',
                              icon: MapIcon,
                            },
                            condition: {
                              label: 'حالة السيارة',
                              icon: StarIcon,
                            },
                            fuelType: { label: 'نوع الوقود', icon: FireIcon },
                            transmission: {
                              label: 'ناقل الحركة',
                              icon: CogIcon,
                            },
                            bodyType: { label: 'نوع الهيكل', icon: TruckIcon },
                            color: {
                              label: 'اللون الخارجي',
                              icon: PaintBrushIcon,
                            },
                            engineSize: { label: 'حجم المحرك', icon: CogIcon },
                            engineNumber: {
                              label: 'رقم المحرك',
                              icon: ClipboardDocumentIcon,
                            },
                            chassisNumber: {
                              label: 'رقم الشاسيه',
                              icon: ClipboardDocumentIcon,
                            },
                            regionalSpecs: {
                              label: 'المواصفات الإقليمية',
                              icon: GlobeAltIcon,
                            },
                            interiorColor: {
                              label: 'لون الداخلية',
                              icon: PaintBrushIcon,
                            },
                            seatCount: {
                              label: 'عدد المقاعد',
                              icon: UserGroupIcon,
                            },
                            vehicleType: {
                              label: 'نوع المركبة',
                              icon: TruckIcon,
                            },
                            manufacturingCountry: {
                              label: 'بلد الصنع',
                              icon: GlobeAltIcon,
                            },
                            customsStatus: {
                              label: 'حالة الجمارك',
                              icon: DocumentCheckIcon,
                            },
                            licenseStatus: {
                              label: 'حالة الترخيص',
                              icon: DocumentCheckIcon,
                            },
                            insuranceStatus: {
                              label: 'حالة التأمين',
                              icon: ShieldCheckIcon,
                            },
                            paymentMethod: {
                              label: 'طريقة الدفع',
                              icon: CreditCardIcon,
                            },
                          };
                          return (
                            fieldInfo[fieldKey] || {
                              label: fieldKey,
                              icon: ClipboardDocumentIcon,
                            }
                          );
                        };

                        const fieldInfo = getFieldInfo(key);
                        const isBasic = ['brand', 'model', 'year', 'condition', 'mileage'].includes(
                          key,
                        );
                        const isTechnical = [
                          'chassisNumber',
                          'engineNumber',
                          'engineSize',
                        ].includes(key);
                        const specClass = isBasic
                          ? 'spec-basic'
                          : isTechnical
                            ? 'spec-technical'
                            : 'spec-general';

                        return (
                          <div key={key} className={`car-spec-card ${specClass}`}>
                            <div className="car-spec-label">
                              <fieldInfo.icon className="car-spec-icon" />
                              <span>{fieldInfo.label}</span>
                            </div>
                            <div className="car-spec-value">{value as string}</div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* المميزات والكماليات */}
                {(() => {
                  const hasGeneralFeatures =
                    car?.features &&
                    (typeof car.features === 'object'
                      ? Object.keys(car.features).length > 0
                      : car.features.toString().trim() !== '');

                  const hasExtractedFeatures =
                    car?.extractedFeatures &&
                    Array.isArray(car.extractedFeatures) &&
                    car.extractedFeatures.length > 0;

                  const hasInteriorFeatures =
                    car?.interiorFeatures &&
                    Array.isArray(car.interiorFeatures) &&
                    car.interiorFeatures.length > 0;

                  const hasExteriorFeatures =
                    car?.exteriorFeatures &&
                    Array.isArray(car.exteriorFeatures) &&
                    car.exteriorFeatures.length > 0;

                  const hasTechnicalFeatures =
                    car?.technicalFeatures &&
                    Array.isArray(car.technicalFeatures) &&
                    car.technicalFeatures.length > 0;

                  if (
                    !hasGeneralFeatures &&
                    !hasExtractedFeatures &&
                    !hasInteriorFeatures &&
                    !hasExteriorFeatures &&
                    !hasTechnicalFeatures
                  ) {
                    return null;
                  }

                  return (
                    <div className="car-features-container">
                      <div className="car-features-title">
                        <SparklesIcon className="car-features-title-icon" />
                        <h3 className="car-features-title-text">المميزات والكماليات</h3>
                      </div>

                      <div className="car-features-sections">
                        {hasExtractedFeatures && (
                          <div className="car-features-section car-features-section-extracted">
                            <CarFeaturesDisplay
                              features={car?.extractedFeatures}
                              title="المميزات المحددة"
                              iconColor="text-blue-600"
                            />
                          </div>
                        )}

                        {hasGeneralFeatures && (
                          <div className="car-features-section car-features-section-general">
                            <CarFeaturesDisplay
                              features={car?.features}
                              title="المميزات العامة"
                              iconColor="text-gray-600"
                            />
                          </div>
                        )}

                        {hasInteriorFeatures && (
                          <div className="car-features-section car-features-section-interior">
                            <CarFeaturesDisplay
                              features={car?.interiorFeatures}
                              title="المميزات الداخلية"
                              iconColor="text-gray-600"
                            />
                          </div>
                        )}

                        {hasExteriorFeatures && (
                          <div className="car-features-section car-features-section-exterior">
                            <CarFeaturesDisplay
                              features={car?.exteriorFeatures}
                              title="المميزات الخارجية"
                              iconColor="text-gray-600"
                            />
                          </div>
                        )}

                        {hasTechnicalFeatures && (
                          <div className="car-features-section car-features-section-technical">
                            <CarFeaturesDisplay
                              features={car?.technicalFeatures}
                              title="المميزات التقنية"
                              iconColor="text-gray-600"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* الكماليات المصنفة */}
                {(() => {
                  const allFeatures: string[] = [];

                  if (car?.interiorFeatures && Array.isArray(car.interiorFeatures)) {
                    allFeatures.push(...car.interiorFeatures);
                  }
                  if (car?.exteriorFeatures && Array.isArray(car.exteriorFeatures)) {
                    allFeatures.push(...car.exteriorFeatures);
                  }
                  if (car?.technicalFeatures && Array.isArray(car.technicalFeatures)) {
                    allFeatures.push(...car.technicalFeatures);
                  }

                  if (car?.features && typeof car.features === 'string') {
                    try {
                      const parsedFeatures = JSON.parse(car.features);
                      if (Array.isArray(parsedFeatures)) {
                        allFeatures.push(...parsedFeatures);
                      }
                    } catch (e) {
                      // تجاهل أخطاء التحليل
                    }
                  }

                  const uniqueFeatures = Array.from(
                    new Set(
                      allFeatures.filter(
                        (feature) =>
                          feature &&
                          typeof feature === 'string' &&
                          feature.trim() !== '' &&
                          feature !== 'غير محدد' &&
                          feature !== 'غير متوفر',
                      ),
                    ),
                  );

                  return uniqueFeatures.length > 0 ? (
                    <div className="car-features-container">
                      <div className="car-features-title">
                        <SparklesIcon className="h-5 w-5 text-purple-600" />
                        <h3 className="car-features-title-text">جميع الكماليات والمميزات</h3>
                        <span className="text-sm text-gray-500">
                          ({uniqueFeatures.length} كمالية)
                        </span>
                      </div>
                      <CategorizedFeaturesDisplay features={uniqueFeatures} />
                    </div>
                  ) : null;
                })()}
              </div>

              {/* قسم الموقع */}
              {(car.locationLat && car.locationLng) || car.locationAddress ? (
                <CarLocationSection
                  location={{
                    lat: car.locationLat,
                    lng: car.locationLng,
                    address: car.locationAddress || car.location,
                  }}
                  carTitle={car.title}
                  className="mb-6"
                />
              ) : (
                <div className="mb-6 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <div className="border-b border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-5 w-5 text-red-500" />
                        <h3 className="font-semibold text-gray-900">موقع السيارة</h3>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
                        <MapPinIcon className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 font-medium text-gray-900">
                          {car.location || 'موقع غير محدد'}
                        </div>
                        <div className="text-sm text-gray-500">
                          يمكنك التواصل مع المعرض للحصول على معلومات أكثر تفصيلاً عن الموقع
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-600"
                        onClick={() => {
                          if (car.location) {
                            window.open(
                              `https://maps.google.com/?q=${encodeURIComponent(car.location)}`,
                              '_blank',
                            );
                          }
                        }}
                      >
                        <GlobeAltIcon className="h-4 w-4" />
                        فتح في خرائط جوجل
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Contact and Showroom Info */}
            <div className="space-y-6">
              {/* معلومات المعرض */}
              {showroom && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="mb-4 flex items-center gap-2">
                    <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">معلومات المعرض</h3>
                    {showroom.verified && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" title="معرض موثق" />
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-gray-900">{showroom.name}</h4>
                      <p className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPinIcon className="h-4 w-4" />
                        {showroom.location}
                      </p>
                    </div>

                    {showroom.rating && (
                      <div className="flex items-center gap-1">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`h-4 w-4 ${
                                i < Math.floor(showroom.rating!)
                                  ? 'fill-current text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">
                          {showroom.rating} ({showroom.reviewsCount || 0} تقييم)
                        </span>
                      </div>
                    )}

                    {showroom.totalCars && (
                      <p className="text-sm text-gray-600">{showroom.totalCars} سيارة متوفرة</p>
                    )}

                    <Link
                      href={`/showrooms/${showroomId}`}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-blue-600 px-4 py-2 text-blue-600 transition-colors hover:bg-blue-50"
                    >
                      <BuildingStorefrontIcon className="h-4 w-4" />
                      زيارة المعرض
                    </Link>
                  </div>
                </div>
              )}

              {/* معلومات السعر والاتصال */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-6 text-center">
                  <div className="mb-2 text-3xl font-bold text-green-600">
                    {formatNumber(car.price)} <span className="text-lg">د.ل</span>
                  </div>
                  {car.originalPrice && (
                    <div className="text-sm text-gray-500 line-through">
                      {formatNumber(car.originalPrice)} د.ل
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleContactClick}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700"
                  >
                    <ChatBubbleLeftRightIcon className="h-5 w-5" />
                    {showContactInfo ? 'إخفاء معلومات الاتصال' : 'عرض معلومات الاتصال'}
                  </button>

                  {showContactInfo && (
                    <div className="rounded-lg bg-gray-50 p-4">
                      <div className="space-y-2">
                        {(car.contactPhone || showroom?.phone) && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">الهاتف:</span>
                            <span className="font-medium text-gray-900">
                              {car.contactPhone || showroom?.phone}
                            </span>
                          </div>
                        )}
                        {showroom?.user?.name && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">المسؤول:</span>
                            <span className="font-medium text-gray-900">{showroom.user.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleDirectCall}
                      className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
                    >
                      <PhoneIcon className="h-4 w-4" />
                      اتصال
                    </button>
                    <button
                      onClick={handleSendMessage}
                      className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      رسالة
                    </button>
                  </div>
                </div>
              </div>

              {/* نصائح الأمان */}
              <SafetyTips />
            </div>
          </div>
        </div>

        {/* نافذة تسجيل الدخول */}
        {showAuthModal && (
          <LoginModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
            onLoginSuccess={handleAuthSuccess}
          />
        )}
      </div>
    </>
  );
}
