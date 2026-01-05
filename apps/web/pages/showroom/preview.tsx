import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import BuildingStorefrontIcon from '@heroicons/react/24/outline/BuildingStorefrontIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import PhotoIcon from '@heroicons/react/24/outline/PhotoIcon';
import RectangleStackIcon from '@heroicons/react/24/outline/RectangleStackIcon';
import TruckIcon from '@heroicons/react/24/outline/TruckIcon';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Layout } from '../../components/common';
import useAuth from '../../hooks/useAuth';

interface ShowroomData {
  name: string;
  description: string;
  vehicleTypes: string[];
  vehicleCount: string;
  city: string;
  area: string;
  address: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  detailedAddress?: string;
}

interface ShowroomImage {
  id: string;
  url: string;
  serverUrl?: string;
}

const ShowroomPreviewPage = () => {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showroomData, setShowroomData] = useState<ShowroomData | null>(null);
  const [images, setImages] = useState<ShowroomImage[]>([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // التحقق من صلاحية الوصول (السماح أيضاً للمسؤول الإداري)
  useEffect(() => {
    if (authLoading) return;

    try {
      // التحقق من أن المستخدم معرض أو admin يقوم بإنشاء معرض
      const isAdminCreating =
        typeof window !== 'undefined'
          ? localStorage.getItem('isAdminCreatingShowroom') === 'true'
          : false;

      setIsAdmin(isAdminCreating);

      if (!isAdminCreating && (!user || user.accountType !== 'SHOWROOM')) {
        router.push('/login');
        return;
      }

      // تنظيف العلامة بعد التحقق منها
      if (isAdminCreating) {
        localStorage.removeItem('isAdminCreatingShowroom');
      }
    } catch {
      if (!user || user.accountType !== 'SHOWROOM') {
        router.push('/login');
        return;
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const savedData = localStorage.getItem('showroomData');
    const savedImages = localStorage.getItem('showroomImages');

    if (savedData) {
      setShowroomData(JSON.parse(savedData));
    } else {
      router.push('/showroom/create');
      return;
    }

    if (savedImages) {
      const parsedImages = JSON.parse(savedImages);

      // تشخيص الصور
      parsedImages.forEach((image: any, index: number) => {
        console.log(`      سيتم استخدام: ${image.serverUrl || image.url || '/placeholder.svg'}`);
      });

      setImages(parsedImages);
    } else {
      console.warn('تحذير لم يتم العثور على صور في localStorage');
    }
  }, [router]);

  const getVehicleTypesInfo = (types: string[]) => {
    const typeMap = {
      cars: {
        label: 'سيارات',
        icon: <RectangleStackIcon className="h-5 w-5" />,
      },
      trucks: { label: 'شاحنات', icon: <TruckIcon className="h-5 w-5" /> },
      motorcycles: {
        label: 'دراجات نارية',
        icon: <CogIcon className="h-5 w-5" />,
      },
      bicycles: {
        label: 'دراجات هوائية',
        icon: <CogIcon className="h-5 w-5" />,
      },
      boats: { label: 'قوارب', icon: <CogIcon className="h-5 w-5" /> },
      other: { label: 'أخرى', icon: <CogIcon className="h-5 w-5" /> },
    };

    const labels = types.map((type) => {
      const typeInfo = typeMap[type as keyof typeof typeMap];
      return typeInfo ? typeInfo.label : type;
    });

    return {
      labels: labels.join('، '),
      icons: types.map((type) => {
        const typeInfo = typeMap[type as keyof typeof typeMap];
        return typeInfo ? typeInfo.icon : <CogIcon className="h-5 w-5" />;
      }),
    };
  };

  const getVehicleCountLabel = (count: string) => {
    const counts = {
      unspecified: 'بدون تحديد',
      '1-10': '1 - 10 مركبات',
      '11-25': '11 - 25 مركبة',
      '26-50': '26 - 50 مركبة',
      '51-100': '51 - 100 مركبة',
      '100+': 'أكثر من 100 مركبة',
    };
    return counts[count as keyof typeof counts] || count;
  };

  const handlePublish = async () => {
    // التحقق من وجود المستخدم (حساب معرض)
    if (!user || user.accountType !== 'SHOWROOM') {
      alert('يجب تسجيل الدخول كمعرض سيارات لإنشاء معرض');
      router.push('/login');
      return;
    }

    setIsPublishing(true);

    try {
      // جمع البيانات من localStorage
      const showroomData = JSON.parse(localStorage.getItem('showroomData') || '{}');
      const showroomImages = JSON.parse(localStorage.getItem('showroomImages') || '[]');

      // إعداد البيانات للإرسال - استخدام serverUrl فقط
      const validImages = showroomImages
        .filter((img: any) => img.uploaded && img.serverUrl) // فقط الصور المرفوعة بنجاح
        .map((img: any) => img.serverUrl);

      if (validImages.length === 0) {
        alert('يجب رفع صور صالحة للمعرض أولاً');
        setIsPublishing(false);
        return;
      }

      const dataToSend = {
        ...showroomData,
        images: validImages,
        ownerId: user.id, // إرسال معرف المستخدم الحالي
      };

      // إرسال طلب إنشاء المعرض
      const response = await fetch('/api/showrooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      console.log('استجابة الخادم:', {
        status: response.status,
        ok: response.ok,
        result: result,
      });

      if (!response.ok) {
        const errorMessage =
          result.error || result.message || `خطأ ${response.status}: فشل في إنشاء المعرض`;
        console.error('خطأ من الخادم:', errorMessage);
        throw new Error(errorMessage);
      }

      // مسح البيانات المحفوظة
      localStorage.removeItem('showroomData');
      localStorage.removeItem('showroomImages');

      // التوجه إلى صفحة النجاح المناسبة
      if (isAdmin) {
        router.push(`/admin/showrooms?created=true`);
      } else {
        router.push(`/showroom/success?id=${result.data.id}`);
      }
    } catch (error) {
      console.error('خطأ في نشر المعرض:', error);

      // عرض رسالة خطأ مفصلة
      const errorMessage = error.message || 'حدث خطأ غير متوقع';
      alert(
        `خطأ في نشر المعرض:\n${errorMessage}\n\nيرجى المحاولة مرة أخرى أو التواصل مع الدعم الفني.`,
      );

      setIsPublishing(false);
    }
  };

  const handleEdit = (section: string) => {
    const basePath = isAdmin ? '/admin/showrooms/create' : '/showroom';

    if (section === 'details') {
      router.push(`${basePath}/create`);
    } else if (section === 'images') {
      router.push(`${basePath}/upload-images`);
    }
  };

  const handleBack = () => {
    if (isAdmin) {
      router.push('/admin/showrooms/create/upload-images');
    } else {
      router.push('/showroom/upload-images');
    }
  };

  if (!showroomData) {
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div
            className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
            style={{ width: 24, height: 24 }}
            role="status"
            aria-label="جاري التحميل"
          />
        </div>
      </Layout>
    );
  }

  const vehicleTypesInfo = getVehicleTypesInfo(showroomData.vehicleTypes);

  return (
    <Layout title="معاينة المعرض - تأكيد النشر" description="راجع تفاصيل معرضك قبل النشر">
      <Head>
        <title>معاينة المعرض - تأكيد النشر</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span>العودة للتعديل</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <EyeIcon className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">معاينة المعرض</h1>
                <p className="text-gray-600">راجع تفاصيل معرضك قبل النشر</p>
              </div>
            </div>
          </div>

          {/* Showroom Preview Card */}
          <div className="mb-8 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <BuildingStorefrontIcon className="h-8 w-8" />
                  <div>
                    <h2 className="text-2xl font-bold">{showroomData.name}</h2>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex gap-1">
                        {vehicleTypesInfo.icons.slice(0, 3).map((icon, index) => (
                          <span key={index}>{icon}</span>
                        ))}
                      </div>
                      <span className="text-green-100">{vehicleTypesInfo.labels}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleEdit('details')}
                  className="flex items-center gap-1 rounded-lg bg-white bg-opacity-20 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-opacity-30"
                >
                  <PencilIcon className="h-4 w-4" />
                  تعديل
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Description */}
              <div className="mb-6">
                <h3 className="mb-2 text-lg font-semibold text-gray-900">وصف المعرض</h3>
                <p className="leading-relaxed text-gray-700">{showroomData.description}</p>
              </div>

              {/* Details Grid */}
              <div className="mb-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg bg-blue-50 p-4">
                  <h4 className="font-semibold text-blue-900">نوع المركبات</h4>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex gap-1">
                      {vehicleTypesInfo.icons.slice(0, 3).map((icon, index) => (
                        <span key={index}>{icon}</span>
                      ))}
                    </div>
                    <span className="text-blue-800">{vehicleTypesInfo.labels}</span>
                  </div>
                </div>

                <div className="rounded-lg bg-purple-50 p-4">
                  <h4 className="font-semibold text-purple-900">عدد المركبات</h4>
                  <p className="mt-1 text-purple-800">
                    {getVehicleCountLabel(showroomData.vehicleCount)}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div className="mb-6">
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                  <MapPinIcon className="h-5 w-5 text-green-600" />
                  موقع المعرض
                </h3>

                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="mb-2">
                    <span className="font-medium text-gray-900">{showroomData.address}</span>
                  </div>
                  {showroomData.coordinates && (
                    <div className="text-sm text-gray-600">
                      <span>الإحداثيات: </span>
                      <span>
                        {showroomData.coordinates.lat.toFixed(6)},{' '}
                        {showroomData.coordinates.lng.toFixed(6)}
                      </span>
                    </div>
                  )}
                  {showroomData.detailedAddress && (
                    <div className="mt-1 text-sm text-gray-600">
                      <span>العنوان التفصيلي: </span>
                      <span>{showroomData.detailedAddress}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Images */}
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
                    <PhotoIcon className="h-5 w-5 text-green-600" />
                    صور المعرض ({images.length})
                  </h3>

                  <button
                    onClick={() => handleEdit('images')}
                    className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <PencilIcon className="h-4 w-4" />
                    تعديل الصور
                  </button>
                </div>

                <div className="mb-4">
                  <h4 className="mb-2 font-medium text-gray-900">صور المعرض ({images.length})</h4>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                    {images.slice(0, 6).map((image) => (
                      <div key={image.id} className="aspect-square overflow-hidden rounded-lg">
                        <img
                          src={image.serverUrl || image.url || '/placeholder.svg'}
                          alt="صورة المعرض"
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            console.warn('فشل تحميل صورة المعاينة:', image.serverUrl || image.url);
                            e.currentTarget.src = '/placeholder.svg';
                          }}
                        />
                      </div>
                    ))}
                    {images.length > 6 && (
                      <div className="flex aspect-square items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                        <span className="text-sm font-medium">+{images.length - 6}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>العودة للتعديل</span>
            </button>

            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className={`flex items-center gap-2 rounded-lg px-8 py-3 text-white transition-all ${
                isPublishing
                  ? 'cursor-not-allowed bg-gray-400'
                  : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
              }`}
            >
              {isPublishing ? (
                <>
                  <div
                    className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                    style={{ width: 24, height: 24 }}
                    role="status"
                    aria-label="جاري التحميل"
                  />
                  <span>جاري النشر...</span>
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>نشر المعرض</span>
                </>
              )}
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              بعد النشر، سيظهر معرضك للعملاء ويمكنك إدارته من لوحة التحكم
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ShowroomPreviewPage;
