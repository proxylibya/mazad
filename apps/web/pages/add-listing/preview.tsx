/* eslint-disable @next/next/no-img-element */
import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import CurrencyDollarIcon from '@heroicons/react/24/outline/CurrencyDollarIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import PencilIcon from '@heroicons/react/24/outline/PencilIcon';
import PhotoIcon from '@heroicons/react/24/outline/PhotoIcon';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import NavigationButtons from '../../components/add-listing/NavigationButtons';
import { Layout } from '../../components/common';
import { UnifiedNavigationArrows } from '../../components/ui/NavigationArrows';
import { validatePrice } from '../../utils/validationUtils';

interface CarData {
  brand: string;
  model: string;
  year: string;
  condition: string;
  mileage: string;
  price: string;
  city: string;
  location?: string; // حقل location لمطابقة Prisma schema
  title: string;
  description: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  regionalSpec: string;
  exteriorColor: string;
  interiorColor: string;
  seatCount: string;
  listingType: 'auction' | 'marketplace';
  yardName?: string;

  // حقول إضافية
  engineSize?: string;
  chassisNumber?: string;
  engineNumber?: string;
  vehicleType?: string;
  manufacturingCountry?: string;
  customsStatus?: string;
  licenseStatus?: string;
  insuranceStatus?: string;
  paymentMethod?: string;
  contactPhone?: string;
  detailedAddress?: string;

  // الميزات
  features?: string[];

  // تقرير الفحص
  inspectionReport?: {
    hasReport: boolean;
    reportFile?: File;
    reportUrl?: string;
    manualReport?: {
      engineCondition: string;
      bodyCondition: string;
      interiorCondition: string;
      tiresCondition: string;
      electricalCondition: string;
      overallRating: string;
      notes: string;
    };
  };

  // حقول المزاد
  auctionStartTime?: 'now' | 'after_30_seconds' | 'after_1_hour' | 'after_24_hours' | 'custom';
  auctionCustomStartTime?: string;
  auctionDuration?: '1_minute' | '1_day' | '3_days' | '1_week' | '1_month';
}

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  uploading: boolean;
  uploaded: boolean;
  error?: string;
  serverUrl?: string; // URL من الخادم بعد الرفع الناجح
}

const PreviewPage = () => {
  const router = useRouter();
  const [carData, setCarData] = useState<CarData | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isPublishing, setIsPublishing] = useState(false);

  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  useEffect(() => {
    // استرجاع بيانات السيارة من localStorage (عادي أو معرض)
    const savedData = localStorage.getItem('carListingData');
    const showroomData = localStorage.getItem('showroomCarData');

    const dataToUse = showroomData || savedData;
    if (dataToUse) {
      try {
        const parsedData = JSON.parse(dataToUse);

        console.log('[تشخيص] معلومات السعر:', {
          price: parsedData.price,
          priceType: typeof parsedData.price,
          priceLength: parsedData.price?.toString().length,
          priceValue: parsedData.price?.toString(),
        });

        // إضافة listingType إذا لم يكن موجوداً
        if (!parsedData.listingType) {
          parsedData.listingType = showroomData ? 'showroom' : 'instant';
        }

        // التحقق من وجود الحقول المطلوبة
        const requiredFields = [
          'brand',
          'model',
          'year',
          'price',
          'contactPhone',
          'condition',
          'city',
          'listingType',
        ];
        const missingFields = requiredFields.filter(
          (field) => !parsedData[field] || !parsedData[field].toString().trim(),
        );

        if (missingFields.length > 0) {
          console.log('[فشل] حقول مطلوبة مفقودة في البيانات المحفوظة:', missingFields);
          // إعادة توجيه حسب نوع الإعلان
          if (showroomData) {
            router.push(`/showroom/add-vehicle`);
          } else {
            router.push('/add-listing/car-details');
          }
          return;
        }

        setCarData(parsedData);
      } catch (error) {
        console.error('[فشل] خطأ في تحليل البيانات المحفوظة:', error);
        router.push('/add-listing');
      }
    } else {
      // إعادة توجيه إلى البداية إذا لم توجد بيانات
      router.push('/add-listing');
    }

    // استرجاع الصور المرفوعة من localStorage
    const savedImages = localStorage.getItem('uploadedImages');
    if (savedImages) {
      try {
        const imageIds = JSON.parse(savedImages);
        // في الواقع، يجب استرجاع الصور من الخادم باستخدام معرفاتها
        // لكن للآن سنستخدم الصور المحفوظة محلياً
        const allImages = JSON.parse(localStorage.getItem('allUploadedImages') || '[]');
        const filteredImages = allImages.filter(
          (img: UploadedImage) => imageIds.includes(img.id) && img.uploaded,
        );
        setImages(filteredImages);
      } catch (error) {
        console.error('خطأ في استرجاع الصور:', error);
      }
    }
  }, [router]);

  // دالة للتحقق من البيانات قبل الإرسال
  const validateDataBeforeSending = () => {
    if (!carData) {
      throw new Error('بيانات السيارة غير متوفرة. يرجى العودة وتعبئة البيانات');
    }
    // هذا التحقق إضافي فقط، لأن التحقق الرئيسي يحدث في useEffect
    const missingFields = [];

    if (!carData?.brand?.trim()) missingFields.push('ماركة السيارة');
    if (!carData?.model?.trim()) missingFields.push('موديل السيارة');
    if (!carData?.year?.trim()) missingFields.push('سنة الصنع');
    if (!carData?.price?.trim()) missingFields.push('السعر');
    if (!carData?.contactPhone?.trim()) missingFields.push('رقم الهاتف');
    if (!carData?.condition?.trim()) missingFields.push('حالة السيارة');
    if (!carData?.city?.trim()) missingFields.push('المدينة');
    if (!carData?.listingType?.trim()) missingFields.push('نوع الإعلان');

    if (missingFields.length > 0) {
      throw new Error(`الحقول التالية مطلوبة: ${missingFields.join(', ')}`);
    }

    if (!images || images.length === 0) {
      throw new Error('يجب إضافة صورة واحدة على الأقل للسيارة');
    }

    // التحقق من صحة البيانات الرقمية
    const year = parseInt(carData.year);

    // تنظيف السعر من الفواصل والمسافات والرموز غير الرقمية
    const cleanPrice = carData.price?.toString().replace(/[^\d.-]/g, '') || '';
    const price = parseFloat(cleanPrice);

    const currentYear = new Date().getFullYear();

    if (isNaN(year) || year < 1990 || year > currentYear + 1) {
      throw new Error(`سنة الصنع غير صحيحة. يجب أن تكون بين 1990 و ${currentYear + 1}`);
    }

    // التحقق من السعر باستخدام دالة التحقق الموحدة
    if (!cleanPrice || cleanPrice.trim() === '') {
      console.error('[تشخيص] السعر فارغ:', {
        originalPrice: carData.price,
        cleanPrice,
      });
      throw new Error('السعر مطلوب. يرجى إدخال سعر صحيح للسيارة');
    }

    // استخدام دالة validatePrice الموحدة مع تحسينات إضافية
    const priceValidation = validatePrice(price);
    if (!priceValidation.isValid) {
      console.error('[تشخيص] السعر غير صحيح:', {
        originalPrice: carData.price,
        cleanPrice,
        parsedPrice: price,
        validationError: priceValidation.error,
        isNaN: isNaN(price),
        isLessOrEqualZero: price <= 0,
      });

      // تخصيص رسائل الخطأ للسيارات (حد أعلى أكبر من 50 مليون)
      if (price > 50000000) {
        throw new Error('السعر يبدو مرتفعاً جداً. يرجى التحقق من السعر المدخل');
      } else if (price < 100) {
        throw new Error('السعر يبدو منخفضاً جداً. يرجى التحقق من السعر المدخل');
      } else {
        throw new Error(priceValidation.error || 'السعر غير صحيح. يجب أن يكون رقماً موجباً');
      }
    }

    console.log('[نجح] تم التحقق من صحة البيانات:', {
      year,
      price,
      cleanPrice,
      originalPrice: carData.price,
    });
  };

  const handlePublish = async () => {
    setIsPublishing(true);

    try {
      // التحقق من البيانات قبل الإرسال
      validateDataBeforeSending();

      // التحقق من مصدر الوصول للصفحة (إدارة أم عادي)
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isFromAdminMarketplace = currentPath.includes('/admin/marketplace');

      // حفظ علامة في localStorage إذا كان المصدر من إدارة السوق الفوري
      if (isFromAdminMarketplace) {
        localStorage.setItem('adminMarketplaceCreate', 'true');
      }

      // ✅ الحصول على معرف المستخدم الحالي (موحد)
      const savedUser = localStorage.getItem('user');
      const currentUser = savedUser ? JSON.parse(savedUser) : null;

      // ✅ تم إزالة adminUser القديم - المسؤول الآن مستخدم عادي بصلاحيات admin
      // النظام الموحد: المسؤول = User مع role: ADMIN/SUPER_ADMIN
      const effectiveUser = currentUser;

      console.log('المستخدم الحالي:', {
        hasUser: !!effectiveUser,
        userId: effectiveUser?.id,
        userName: effectiveUser?.name,
        userRole: effectiveUser?.role || 'user',
      });

      // فحص المستخدم قبل المتابعة
      if (!currentUser || !currentUser.id) {
        // إذا كانت الصفحة ضمن لوحة التحكم، توجيه إلى صفحة تسجيل دخول المسؤول
        const isAdminRoute =
          typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
        if (isAdminRoute) {
          setNotification({
            show: true,
            type: 'error',
            message: 'يجب تسجيل الدخول إلى لوحة التحكم أولاً.',
          });
          // توجيه سريع لتسجيل الدخول مع الحفاظ على رابط العودة
          setTimeout(() => {
            const redirect = router.asPath || '/admin';
            router.push(`/admin?callbackUrl=${encodeURIComponent(redirect)}`);
          }, 800);
        }

        throw new Error('يجب تسجيل الدخول أولاً لإنشاء إعلان');
      }

      // تحديد API endpoint حسب نوع الإعلان
      const isShowroomListing = false; // مؤقتاً - سنستخدم API السيارات العادي فقط
      const apiEndpoint = '/api/listings/create';

      // إعداد بيانات الإعلان للإرسال حسب نوع الإعلان
      let listingData;

      if (isShowroomListing) {
        // تنسيق خاص للمعارض
        // تحويل city إلى location لمطابقة Prisma schema
        const processedCarDataShowroom: CarData = {
          ...carData!,
          location: carData!.city, // استخدام city كـ location (حقل location مطلوب في Prisma)
        };

        listingData = {
          carData: processedCarDataShowroom,
          images: images.map((img) => ({
            id: img.id,
            url: img.serverUrl || img.url,
            fileName: `car_image_${img.id}.jpg`,
            fileSize: img.file?.size || 0,
          })),
          userId: effectiveUser?.id,
        };
      } else {
        // تنسيق للإعلانات العادية - يطابق API الجديد
        // تحويل city إلى location لمطابقة Prisma schema
        const processedCarData: CarData = {
          ...carData!,
          location: carData!.city, // استخدام city كـ location (حقل location مطلوب في Prisma)
          // الإبقاء على القيم الحالية في الواجهة ('auction' | 'marketplace') والاعتماد على التطبيع في الخادم
          listingType: carData!.listingType || 'marketplace',
        };

        listingData = {
          carData: processedCarData,
          images: images.map((img) => ({
            id: img.id,
            url: img.serverUrl || img.url,
            fileName: img.file?.name || `car_image_${img.id}.jpg`,
            fileSize: img.file?.size || 0,
          })),
          userId: effectiveUser?.id,
        };
      }

      // تسجيل البيانات المرسلة للتشخيص
      console.log('[تشخيص] البيانات المرسلة إلى API:', {
        carData: {
          title: listingData.carData?.title,
          brand: listingData.carData?.brand,
          model: listingData.carData?.model,
          year: listingData.carData?.year,
          price: listingData.carData?.price,
          location: listingData.carData?.location,
          city: listingData.carData?.city,
          listingType: listingData.carData?.listingType,
          contactPhone: listingData.carData?.contactPhone,
          condition: listingData.carData?.condition,
        },
        imagesCount: listingData.images?.length || 0,
        images: listingData.images?.slice(0, 2), // أول صورتين فقط للتشخيص
        userId: listingData.userId,
        apiEndpoint,
      });

      // إرسال البيانات إلى API مع معالجة أفضل للأخطاء
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Cache-Control': 'no-cache',
        },
        body: JSON.stringify(listingData),
      });

      console.log('[الإحصائيات] Response headers:', Object.fromEntries(response.headers.entries()));

      // التحقق من نوع المحتوى أولاً
      const contentType = response.headers.get('content-type');

      if (!contentType || !contentType.includes('application/json')) {
        const responseText = await response.text();
        console.error('[فشل] الخادم لم يرجع JSON:', responseText.slice(0, 500));
        throw new Error('خطأ في الخادم - تم إرجاع HTML بدلاً من JSON. يرجى المحاولة مرة أخرى.');
      }

      // U.O-OU^U,Oc O�O-U,USU, JSON response
      let result;
      const responseText = await response.text();

      try {
        result = JSON.parse(responseText);
        console.log('[الإحصائيات] Response JSON:', result);
      } catch (parseError) {
        console.error('[فشل] خطأ في تحليل JSON:', parseError);
        console.error('[المستند] Response text:', responseText);
        console.error('[الإحصائيات] Response status:', response.status);
        console.error(
          '[الإحصائيات] Response headers:',
          Object.fromEntries(response.headers.entries()),
        );
        throw new Error('خطأ في تحليل استجابة الخادم. يرجى المحاولة مرة أخرى.');
      }

      if (!response.ok || !result.success) {
        console.error('[فشل] API returned error:', result);
        const errorMessage = result?.error || result?.message || 'فشل في نشر الإعلان';

        // معالجة أخطاء محددة
        if (result?.missingFields) {
          throw new Error(`الحقول التالية مطلوبة: ${result.missingFields.join(', ')}`);
        }

        throw new Error(errorMessage);
      }

      // التأكد من وجود معرف الإعلان الصحيح
      // التحقق من البنية الصحيحة للاستجابة
      const listingId =
        result.data?.listingId || result.data?.car?.id || result.car?.id || result.auction?.id;
      const listingType = result.data?.listingType || carData?.listingType || 'marketplace';

      if (!listingId) {
        console.error('[فشل] لم يتم إرجاع معرف الإعلان من الخادم');
        console.error('[الإحصائيات] بيانات الاستجابة الكاملة:', result);
        console.error('[الإحصائيات] بيانات result.data:', result.data);
        console.error('[الإحصائيات] بيانات result.car:', result.car);
        console.error('[الإحصائيات] بيانات result.auction:', result.auction);
        throw new Error('لم يتم إرجاع معرف الإعلان من الخادم');
      }

      console.log('[التحرير] حفظ بيانات الإعلان:', {
        listingId,
        listingType,
        carId: result.data?.car?.id || result.car?.id,
        auctionId: result.data?.auction?.id || result.auction?.id,
        responseListingId: result.data?.listingId,
        fullResponse: result,
      });

      // حفظ معرف الإعلان المنشور
      localStorage.setItem('publishedListingId', listingId.toString());
      localStorage.setItem('publishedListingType', listingType);

      // ⚠️ التحقق من وجود باقة ترويج مدفوعة مطلوبة
      const requestedPackage = result.data?.requestedPackage || 'free';
      const requestedDays = result.data?.requestedDays || 0;
      const requiresPayment = result.data?.requiresPayment || false;

      console.log('[الترويج] معلومات الباقة المطلوبة:', {
        requestedPackage,
        requestedDays,
        requiresPayment,
      });

      // حفظ بيانات إضافية للتحقق
      const savedListingData = {
        id: listingId.toString(),
        type: listingType,
        title: result.data?.car?.title || result.car?.title || carData?.title || 'إعلان جديد',
        timestamp: new Date().toISOString(),
        carId: result.data?.car?.id || result.car?.id,
        auctionId: result.data?.auction?.id || result.auction?.id,
        // حفظ معلومات الباقة المطلوبة
        requestedPackage,
        requestedDays,
        requiresPayment,
      };

      localStorage.setItem('publishedListingData', JSON.stringify(savedListingData));

      // تنظيف البيانات المؤقتة
      localStorage.removeItem('carListingData');
      localStorage.removeItem('showroomCarData');
      localStorage.removeItem('uploadedImages');
      localStorage.removeItem('allUploadedImages');
      localStorage.removeItem('showroomUploadedImages');

      setIsPublishing(false);

      // إظهار إشعار نجاح
      setNotification({
        show: true,
        type: 'success',
        message: requiresPayment
          ? 'تم نشر الإعلان! سيتم توجيهك لإتمام الدفع...'
          : 'تم نشر الإعلان بنجاح!',
      });

      // التوجيه بعد ثانيتين
      setTimeout(() => {
        // ⚠️ إذا كانت هناك باقة مدفوعة مطلوبة، توجيه لصفحة الدفع
        if (requiresPayment) {
          // التوجيه مباشرة لصفحة الترويج/الدفع
          const promoteUrl = `/promote/${listingId}?type=${listingType}&package=${requestedPackage}`;
          router.push(promoteUrl);
        } else {
          // إذا كان مجاني، التوجه لصفحة النجاح العادية
          const successUrl = `/add-listing/success?id=${listingId}&type=${listingType}`;
          router.push(successUrl);
        }
      }, 2000);
    } catch (error) {
      console.error('[فشل] خطأ في نشر الإعلان:', error);
      setIsPublishing(false);

      // تحديد رسالة الخطأ المناسبة
      let errorMessage = 'حدث خطأ أثناء نشر الإعلان. يرجى المحاولة مرة أخرى.';

      if (error instanceof Error) {
        if (error.message.includes('connect') || error.message.includes('ECONNREFUSED')) {
          errorMessage =
            'خطأ في الاتصال بالخادم. يرجى التأكد من تشغيل قاعدة البيانات والمحاولة مرة أخرى.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
        } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = 'الإعلان موجود مسبقاً. يرجى تعديل البيانات والمحاولة مرة أخرى.';
        } else if (error.message) {
          errorMessage = error.message;
        }
      }

      // إظهار إشعار خطأ
      setNotification({
        show: true,
        type: 'error',
        message: errorMessage,
      });

      // إخفاء الإشعار بعد 7 ثوان
      setTimeout(() => {
        setNotification({ show: false, type: 'success', message: '' });
      }, 7000);
    }
  };

  const handleEdit = (section: string) => {
    const currentPath = router.pathname || '';
    const isAdminAuctions = currentPath.startsWith('/admin/auctions');
    const isAdminMarketplace = currentPath.startsWith('/admin/marketplace');

    const detailsPath = isAdminAuctions
      ? '/admin/auctions/create?type=auction'
      : isAdminMarketplace
        ? '/admin/marketplace/create?type=instant'
        : '/add-listing/car-details';

    const imagesPath = isAdminAuctions
      ? '/admin/auctions/upload-images'
      : isAdminMarketplace
        ? '/admin/marketplace/upload-images'
        : '/add-listing/upload-images';

    if (section === 'details') {
      router.push(detailsPath);
    } else if (section === 'images') {
      router.push(imagesPath);
    }
  };

  const handleBack = () => {
    const currentPath = router.pathname || '';
    const isAdminAuctions = currentPath.startsWith('/admin/auctions');
    const isAdminMarketplace = currentPath.startsWith('/admin/marketplace');

    const imagesPath = isAdminAuctions
      ? '/admin/auctions/upload-images'
      : isAdminMarketplace
        ? '/admin/marketplace/upload-images'
        : '/add-listing/upload-images';

    router.push(imagesPath);
  };

  if (!carData) {
    return (
      <Layout>
        <div className="flex min-h-screen select-none items-center justify-center bg-gray-50">
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

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('ar-LY').format(Number(price));
  };

  return (
    <Layout title="إضافة إعلان - معاينة ونشر" description="راجع تفاصيل إعلانك قبل النشر">
      <Head>
        <title>إضافة إعلان - معاينة ونشر</title>
      </Head>

      <div className="min-h-screen select-none bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-gray-600 transition-colors hover:text-gray-800"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                <span>العودة</span>
              </button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">معاينة الإعلان</h1>
                <p className="text-gray-600">راجع تفاصيل إعلانك قبل النشر</p>
              </div>

              {/* زر النشر في أعلى الصفحة */}
              <button
                type="button"
                onClick={handlePublish}
                disabled={isPublishing}
                className="flex items-center gap-2 rounded-lg bg-orange-500 px-6 py-3 text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <EyeIcon className="h-5 w-5" />
                    <span>نشر الإعلان</span>
                  </>
                )}
              </button>
            </div>

            {/* Status */}
            <div className="rounded-lg border border-green-200 bg-green-50 p-4">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">الإعلان جاهز للنشر!</p>
                  <p className="text-sm text-green-700">تم استكمال جميع المعلومات المطلوبة</p>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Car Images */}
            {images.length > 0 ? (
              <div className="relative">
                {/* Main Image */}
                <div className="relative h-64 bg-gray-100">
                  <img
                    src={images[currentImageIndex]?.serverUrl || images[currentImageIndex]?.url}
                    alt={`صورة السيارة ${currentImageIndex + 1}`}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder-car.jpg';
                    }}
                  />

                  {/* أزرار التنقل الموحدة */}
                  <UnifiedNavigationArrows
                    onPrevious={() =>
                      setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                    }
                    onNext={() =>
                      setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                    }
                    show={images.length > 1}
                  />

                  {/* Image Counter */}
                  <div className="absolute bottom-4 right-4 rounded-full bg-black/70 px-3 py-1 text-sm text-white">
                    {currentImageIndex + 1} / {images.length}
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => handleEdit('images')}
                    className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-black/70 px-3 py-1 text-sm text-white transition-colors hover:bg-black/80"
                  >
                    <PencilIcon className="h-4 w-4" />
                    تعديل الصور
                  </button>
                </div>

                {/* Image Thumbnails */}
                {images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto p-4">
                    {images.map((image, index) => (
                      <button
                        key={image.id}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`h-16 w-20 flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                          currentImageIndex === index
                            ? 'border-blue-500'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={image.serverUrl || image.url}
                          alt={`صورة مصغرة ${index + 1}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/images/placeholder-car.jpg';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Placeholder when no images */
              <div className="flex h-64 items-center justify-center bg-gray-100">
                <div className="text-center">
                  <PhotoIcon className="mx-auto mb-2 h-16 w-16 text-gray-400" />
                  <p className="text-gray-500">لم يتم رفع صور</p>
                  <button
                    onClick={() => handleEdit('images')}
                    className="mx-auto mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <PencilIcon className="h-4 w-4" />
                    إضافة صور
                  </button>
                </div>
              </div>
            )}

            <div className="p-6">
              {/* Title and Type */}
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="mb-2 text-2xl font-bold text-gray-900">
                    {carData.title || `${carData.brand} ${carData.model} ${carData.year}`}
                  </h2>
                  <div className="flex items-center gap-2">
                    {carData.listingType === 'auction' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-800">
                        <ClockIcon className="h-4 w-4" />
                        سوق المزاد
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-sm font-medium text-green-800">
                        <CurrencyDollarIcon className="h-4 w-4" />
                        سوق الفوري
                      </span>
                    )}

                    {carData.yardName && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-sm font-medium text-purple-800">
                        <MapPinIcon className="h-4 w-4" />
                        ساحة: {carData.yardName}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleEdit('details')}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                >
                  <PencilIcon className="h-4 w-4" />
                  تعديل
                </button>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="mb-1 text-3xl font-bold text-orange-600">
                  {carData.listingType === 'auction'
                    ? formatPrice(Math.floor(parseFloat(carData.price) * 0.7).toString())
                    : formatPrice(carData.price)}{' '}
                  د.ل
                </div>
                <p className="text-gray-500">
                  {carData.listingType === 'auction' ? 'سعر بداية المزاد' : 'السعر النهائي'}
                </p>
                {carData.listingType === 'auction' && (
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      القيمة الحقيقية للمركبة: {formatPrice(carData.price)} د.ل
                    </p>
                    <p className="text-xs text-blue-600">
                      سعر البداية محسوب تلقائياً (70% من القيمة الحقيقية)
                    </p>
                  </div>
                )}
              </div>

              {/* معلومات المزاد */}
              {carData.listingType === 'auction' && (
                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h4 className="mb-3 flex items-center gap-2 font-semibold text-blue-900">
                    <ClockIcon className="h-5 w-5" />
                    تفاصيل المزاد
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">وقت البداية:</span>
                      <span className="font-medium text-blue-900">
                        {carData.auctionStartTime === 'now' && 'مزاد مباشر'}
                        {carData.auctionStartTime === 'after_30_seconds' && 'بعد 30 ثانية'}
                        {carData.auctionStartTime === 'after_1_hour' && 'بعد ساعة واحدة'}
                        {carData.auctionStartTime === 'after_24_hours' && 'بعد 24 ساعة'}
                        {carData.auctionStartTime === 'custom' &&
                          carData.auctionCustomStartTime &&
                          new Date(carData.auctionCustomStartTime).toLocaleString('ar-LY')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">مدة المزاد:</span>
                      <span className="font-medium text-blue-900">
                        {carData.auctionDuration === '1_minute' && '1 دقيقة'}
                        {carData.auctionDuration === '1_day' && 'يوم واحد'}
                        {carData.auctionDuration === '3_days' && '3 أيام'}
                        {carData.auctionDuration === '1_week' && 'أسبوع'}
                        {carData.auctionDuration === '1_month' && 'شهر'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Key Details */}
              <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <CalendarIcon className="mx-auto mb-1 h-5 w-5 text-gray-400" />
                  <div className="text-sm font-medium text-gray-900">{carData.year}</div>
                  <div className="text-xs text-gray-500">سنة الصنع</div>
                </div>
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <CogIcon className="mx-auto mb-1 h-5 w-5 text-gray-400" />
                  <div className="text-sm font-medium text-gray-900">{carData.condition}</div>
                  <div className="text-xs text-gray-500">الحالة</div>
                </div>
                {carData.mileage !== null && carData.mileage !== undefined && (
                  <div className="rounded-lg bg-gray-50 p-3 text-center">
                    <div className="text-sm font-medium text-gray-900">
                      {formatPrice(carData.mileage)} كم
                    </div>
                    <div className="text-xs text-gray-500">المسافة المقطوعة</div>
                  </div>
                )}
                <div className="rounded-lg bg-gray-50 p-3 text-center">
                  <MapPinIcon className="mx-auto mb-1 h-5 w-5 text-gray-400" />
                  <div className="text-sm font-medium text-gray-900">{carData.city}</div>
                  <div className="text-xs text-gray-500">الموقع</div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="border-t pt-4">
                <h3 className="mb-3 font-semibold text-gray-900">المواصفات التقنية</h3>
                <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                  {carData.bodyType && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">نوع الهيكل:</span>
                      <span className="text-gray-900">{carData.bodyType}</span>
                    </div>
                  )}
                  {carData.fuelType && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">نوع الوقود:</span>
                      <span className="text-gray-900">{carData.fuelType}</span>
                    </div>
                  )}
                  {carData.transmission && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">ناقل الحركة:</span>
                      <span className="text-gray-900">{carData.transmission}</span>
                    </div>
                  )}
                  {carData.engineSize && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">حجم المحرك:</span>
                      <span className="text-gray-900">{carData.engineSize}</span>
                    </div>
                  )}
                  {carData.regionalSpec && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">المواصفات الإقليمية:</span>
                      <span className="text-gray-900">{carData.regionalSpec}</span>
                    </div>
                  )}
                  {carData.exteriorColor && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">اللون الخارجي:</span>
                      <span className="text-gray-900">{carData.exteriorColor}</span>
                    </div>
                  )}
                  {carData.interiorColor && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">لون الداخلية:</span>
                      <span className="text-gray-900">{carData.interiorColor}</span>
                    </div>
                  )}
                  {carData.seatCount !== undefined && carData.seatCount !== null && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">عدد المقاعد:</span>
                      <span className="text-gray-900">{carData.seatCount}</span>
                    </div>
                  )}
                  {carData.vehicleType && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">نوع السيارة:</span>
                      <span className="text-gray-900">{carData.vehicleType}</span>
                    </div>
                  )}
                  {carData.manufacturingCountry && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">بلد الصنع:</span>
                      <span className="text-gray-900">{carData.manufacturingCountry}</span>
                    </div>
                  )}
                  {carData.chassisNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">رقم الشاسيه:</span>
                      <span className="text-gray-900">{carData.chassisNumber}</span>
                    </div>
                  )}
                  {carData.engineNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">رقم المحرك:</span>
                      <span className="text-gray-900">{carData.engineNumber}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Legal and Insurance Status */}
              {(carData.customsStatus ||
                carData.licenseStatus ||
                carData.insuranceStatus ||
                carData.paymentMethod) && (
                <div className="border-t pt-4">
                  <h3 className="mb-3 font-semibold text-gray-900">الحالة القانونية والتأمين</h3>
                  <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
                    {carData.customsStatus && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">الحالة الجمركية:</span>
                        <span className="text-gray-900">{carData.customsStatus}</span>
                      </div>
                    )}
                    {carData.licenseStatus && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">حالة الترخيص:</span>
                        <span className="text-gray-900">{carData.licenseStatus}</span>
                      </div>
                    )}
                    {carData.insuranceStatus && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">حالة التأمين:</span>
                        <span className="text-gray-900">{carData.insuranceStatus}</span>
                      </div>
                    )}
                    {carData.paymentMethod && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">طريقة الدفع:</span>
                        <span className="text-gray-900">{carData.paymentMethod}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Features and Amenities */}
              {carData.features && carData.features.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="mb-3 font-semibold text-gray-900">الميزات والكماليات</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {carData.features.map((feature, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 rounded-lg bg-green-50 p-2 text-sm"
                      >
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span className="text-green-800">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inspection Report */}
              {carData.inspectionReport?.hasReport && (
                <div className="border-t pt-4">
                  <h3 className="mb-3 font-semibold text-gray-900">تقرير الفحص</h3>
                  <div className="rounded-lg bg-green-50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="font-medium text-green-800">تقرير فحص متوفر</span>
                    </div>

                    {carData.inspectionReport.manualReport && (
                      <div className="space-y-2 text-sm">
                        {carData.inspectionReport.manualReport.engineCondition && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">حالة المحرك:</span>
                            <span className="text-gray-900">
                              {carData.inspectionReport.manualReport.engineCondition}
                            </span>
                          </div>
                        )}
                        {carData.inspectionReport.manualReport.bodyCondition && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">حالة الهيكل:</span>
                            <span className="text-gray-900">
                              {carData.inspectionReport.manualReport.bodyCondition}
                            </span>
                          </div>
                        )}
                        {carData.inspectionReport.manualReport.interiorCondition && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">حالة الداخلية:</span>
                            <span className="text-gray-900">
                              {carData.inspectionReport.manualReport.interiorCondition}
                            </span>
                          </div>
                        )}
                        {carData.inspectionReport.manualReport.overallRating && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">التقييم العام:</span>
                            <span className="font-medium text-green-700">
                              {carData.inspectionReport.manualReport.overallRating}
                            </span>
                          </div>
                        )}
                        {carData.inspectionReport.manualReport.notes && (
                          <div className="mt-3 border-t pt-2">
                            <span className="text-gray-600">ملاحظات:</span>
                            <p className="mt-1 text-gray-900">
                              {carData.inspectionReport.manualReport.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Contact Information */}
              {(carData.contactPhone || carData.detailedAddress) && (
                <div className="border-t pt-4">
                  <h3 className="mb-3 font-semibold text-gray-900">معلومات الاتصال</h3>
                  <div className="space-y-2 text-sm">
                    {carData.contactPhone && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">رقم الهاتف:</span>
                        <span className="text-gray-900">{carData.contactPhone}</span>
                      </div>
                    )}
                    {carData.detailedAddress && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">العنوان التفصيلي:</span>
                        <span className="text-gray-900">{carData.detailedAddress}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {carData.description && (
                <div className="border-t pt-4">
                  <h3 className="mb-2 font-semibold text-gray-900">الوصف</h3>
                  <p className="leading-relaxed text-gray-700">{carData.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* مساحة للأزرار الثابتة */}
          <div className="h-24" />

          {/* Notification */}
          {notification.show && (
            <div className="fixed right-4 top-4 z-50">
              <div
                className={`rounded-lg p-4 shadow-lg ${
                  notification.type === 'success'
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  {notification.type === 'success' ? (
                    <CheckCircleIcon className="h-5 w-5" />
                  ) : (
                    <ClockIcon className="h-5 w-5" />
                  )}
                  <span>{notification.message}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* أزرار التنقل الثابتة */}
      <NavigationButtons
        onBack={handleBack}
        onNext={handlePublish}
        nextLabel="نشر الإعلان"
        isLoading={isPublishing}
        loadingLabel="جاري النشر..."
        nextIcon={<EyeIcon className="h-5 w-5" />}
      />
    </Layout>
  );
};

export default PreviewPage;
