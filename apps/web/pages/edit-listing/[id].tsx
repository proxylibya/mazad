import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import ChevronUpIcon from '@heroicons/react/24/outline/ChevronUpIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import SwatchIcon from '@heroicons/react/24/outline/SwatchIcon';
import WrenchScrewdriverIcon from '@heroicons/react/24/outline/WrenchScrewdriverIcon';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { type Country } from '../../components/CountryCodeSelector';
import LocationPickerModal from '../../components/LocationPickerModal';
import PhoneInputField from '../../components/PhoneInputField';
import { Layout } from '../../components/common';
import { BackIcon } from '../../components/common/icons/RTLIcon';
import SelectField from '../../components/ui/SelectField';
import { useUserContext } from '../../contexts/UserContext';
import { libyanCities } from '../../data/libyan-cities';
import {
  bodyTypes,
  carBrands,
  carYears,
  conditions,
  exteriorColors,
  fuelTypes,
  getModelsByBrand,
  interiorColors,
  regionalSpecs,
} from '../../data/simple-filters';
import { scrollToFirstError } from '../../utils/formScrollUtils';
import { processPhoneNumber } from '../../utils/phoneUtils';
import { validatePrice } from '../../utils/validationUtils';

interface FormData {
  brand: string;
  model: string;
  year: string;
  condition: string;
  mileage: string;
  price: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  engineSize: string;
  regionalSpec: string;
  exteriorColor: string;
  interiorColor: string;
  seatCount: string;
  city: string;
  area: string;
  yardName?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  inspectionReport?: {
    hasReport: boolean;
    reportFile?: File;
    reportUrl?: string;
    uploadId?: string;
    fileType?: string;
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
  detailedAddress?: string;
  contactPhone: string;
  title: string;
  description: string;
  chassisNumber: string;
  engineNumber: string;
  features: string[];
  auctionStartTime: 'now' | 'after_30_seconds' | 'after_1_hour' | 'after_24_hours' | 'custom';
  auctionCustomStartTime: string;
  auctionDuration: '1_minute' | '1_day' | '3_days' | '1_week' | '1_month';
}

const EditListingForm = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUserContext();
  const [listingType, setListingType] = useState<'auction' | 'instant'>('instant');
  const [isLoading, setIsLoading] = useState(true);

  const [formData, setFormData] = useState<FormData>({
    brand: '',
    model: '',
    year: '',
    condition: '',
    mileage: '',
    price: '',
    bodyType: '',
    fuelType: '',
    transmission: '',
    engineSize: '',
    regionalSpec: '',
    exteriorColor: '',
    interiorColor: '',
    seatCount: '',
    city: '',
    area: '',
    yardName: '',
    coordinates: undefined,
    detailedAddress: '',
    contactPhone: '',
    title: '',
    description: '',
    chassisNumber: '',
    engineNumber: '',
    features: [],
    auctionStartTime: 'now',
    auctionCustomStartTime: '',
    auctionDuration: '1_week',
    inspectionReport: {
      hasReport: false,
      manualReport: {
        engineCondition: '',
        bodyCondition: '',
        interiorCondition: '',
        tiresCondition: '',
        electricalCondition: '',
        overallRating: '',
        notes: '',
      },
    },
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isAdditionalDetailsOpen, setIsAdditionalDetailsOpen] = useState(false);
  const [contactCountryCode, setContactCountryCode] = useState('+218');

  const [showInspectionReport, setShowInspectionReport] = useState(false);
  const [inspectionReportType, setInspectionReportType] = useState<'file' | 'manual'>('file');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // تحميل البيانات الحالية
  useEffect(() => {
    const loadListingData = async () => {
      if (!id) return;

      try {
        setIsLoading(true);
        const response = await fetch(`/api/cars/${id}`);

        if (!response.ok) {
          throw new Error('فشل في تحميل البيانات');
        }

        const result = await response.json();
        const carData = result.data;

        // تحديد نوع الإعلان
        setListingType(carData.isAuction ? 'auction' : 'instant');

        // تعبئة النموذج بالبيانات الحالية
        setFormData({
          brand: carData.brand || '',
          model: carData.model || '',
          year: carData.year?.toString() || '',
          condition: carData.condition || '',
          mileage: carData.mileage?.toString() || '',
          price: carData.price?.toString() || carData.startingPrice?.toString() || '',
          bodyType: carData.bodyType || '',
          fuelType: carData.fuelType || '',
          transmission: carData.transmission || '',
          engineSize: carData.engineSize || '',
          regionalSpec: carData.regionalSpec || '',
          exteriorColor: carData.exteriorColor || carData.color || '',
          interiorColor: carData.interiorColor || '',
          seatCount: carData.seatCount?.toString() || '',
          city: carData.city || carData.location || '',
          area: carData.area || '',
          yardName: carData.yardName || '',
          coordinates: carData.coordinates,
          detailedAddress: carData.detailedAddress || carData.locationAddress || '',
          contactPhone: carData.contactPhone?.replace(/^\+218/, '') || '',
          title: carData.title || '',
          description: carData.description || '',
          chassisNumber: carData.chassisNumber || '',
          engineNumber: carData.engineNumber || '',
          features: Array.isArray(carData.features) ? carData.features : [],
          auctionStartTime: 'now',
          auctionCustomStartTime: '',
          auctionDuration: '1_week',
          inspectionReport: {
            hasReport: carData.hasInspectionReport || false,
            reportUrl: carData.inspectionReportUrl,
            manualReport: carData.inspectionReport || {
              engineCondition: '',
              bodyCondition: '',
              interiorCondition: '',
              tiresCondition: '',
              electricalCondition: '',
              overallRating: '',
              notes: '',
            },
          },
        });
      } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        alert('حدث خطأ في تحميل بيانات الإعلان');
        router.push('/my-account?tab=listings');
      } finally {
        setIsLoading(false);
      }
    };

    loadListingData();
  }, [id, router]);

  useEffect(() => {
    if (formData.brand) {
      const models = getModelsByBrand(formData.brand);
      setAvailableModels(models);

      if (formData.model && !models.includes(formData.model)) {
        setFormData((prev) => ({ ...prev, model: '' }));
      }
    } else {
      setAvailableModels([]);
    }
  }, [formData.brand, formData.model]);

  // في وضع التعديل، البيانات محملة مسبقاً من loadListingData
  // لا حاجة لتحميل رقم الهاتف تلقائياً

  const handleInputChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    // معالجة خاصة لحقل السعر لتنظيف القيم غير الصحيحة
    if (field === 'price' && typeof value === 'string') {
      // إزالة الأحرف غير الرقمية باستثناء النقطة العشرية
      const cleanValue = value.replace(/[^\d.]/g, '');

      // التأكد من وجود نقطة عشرية واحدة فقط
      const parts = cleanValue.split('.');
      const formattedValue =
        parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : cleanValue;

      setFormData((prev) => ({ ...prev, [field]: formattedValue as FormData[K] }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }

    if (errors[field as string]) {
      setErrors((prev) => ({ ...prev, [field as string]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.brand) newErrors.brand = 'يرجى اختيار الماركة';
    if (!formData.model) newErrors.model = 'يرجى اختيار الموديل';
    if (!formData.year) newErrors.year = 'يرجى اختيار سنة الصنع';
    if (!formData.condition) newErrors.condition = 'يرجى اختيار حالة السيارة';
    if (!formData.city) newErrors.city = 'يرجى اختيار المدينة';
    if (!formData.area || !formData.area.trim()) newErrors.area = 'يرجى إدخال المنطقة أو الحي';
    if (!formData.title) newErrors.title = 'يرجى إدخال عنوان الإعلان';

    // التحقق من وجود السعر (مطلوب)
    if (!formData.price || !formData.price.trim()) {
      newErrors.price = 'السعر مطلوب';
    } else {
      // تنظيف السعر من الفواصل والمسافات والرموز غير الرقمية
      const cleanPrice = formData.price.toString().replace(/[^\d.-]/g, '');
      const numericPrice = parseFloat(cleanPrice);

      if (!cleanPrice || cleanPrice.trim() === '') {
        newErrors.price = 'السعر مطلوب';
      } else {
        // استخدام دالة validatePrice الموحدة مع تحسينات للسيارات
        const priceValidation = validatePrice(numericPrice);
        if (!priceValidation.isValid) {
          // تخصيص رسائل الخطأ للسيارات (حدود أعلى وأقل مناسبة)
          if (numericPrice > 50000000) {
            newErrors.price = 'السعر يبدو مرتفعاً جداً. يرجى التحقق من السعر المدخل';
          } else if (numericPrice < 100) {
            newErrors.price = 'السعر يبدو منخفضاً جداً. يرجى التحقق من السعر المدخل';
          } else {
            newErrors.price = priceValidation.error || 'يرجى إدخال سعر صحيح (رقم موجب)';
          }
        }
      }
    }

    // التحقق من رقم الهاتف (مطلوب)
    if (!formData.contactPhone || !formData.contactPhone.trim()) {
      newErrors.contactPhone = 'رقم الهاتف مطلوب';
    } else {
      const phoneValidation = processPhoneNumber(contactCountryCode + formData.contactPhone);
      if (!phoneValidation.isValid) {
        newErrors.contactPhone = phoneValidation.error || 'يرجى إدخال رقم هاتف ليبي صحيح';
      }
    }

    // التحقق من التوقيت المخصص للمزاد
    if (
      listingType === 'auction' &&
      formData.auctionStartTime === 'custom' &&
      formData.auctionCustomStartTime
    ) {
      const selectedDate = new Date(formData.auctionCustomStartTime);
      const now = new Date();
      if (selectedDate <= now) {
        newErrors.auctionCustomStartTime = 'يجب أن يكون تاريخ بداية المزاد في المستقبل';
      }
    }

    setErrors(newErrors);

    // التوجه لأول حقل خطأ تلقائياً
    if (Object.keys(newErrors).length > 0) {
      setTimeout(() => {
        scrollToFirstError(newErrors, {
          offset: 100,
          behavior: 'smooth',
          focus: true,
          highlight: true,
          highlightDuration: 2000,
        });
      }, 100);
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      let updatedFormData = { ...formData, listingType: listingType };

      // رفع ملف تقرير الفحص إذا كان موجوداً
      if (formData.inspectionReport?.reportFile) {
        try {
          const formDataToUpload = new FormData();
          formDataToUpload.append('file', formData.inspectionReport.reportFile);
          formDataToUpload.append('userId', 'temp_user'); // يمكن تحسينه لاحقاً

          const response = await fetch('/api/inspection-reports/upload', {
            method: 'POST',
            body: formDataToUpload,
          });

          // التحقق من نوع المحتوى المُرجع
          const contentType = response.headers.get('content-type');

          if (!contentType || !contentType.includes('application/json')) {
            const htmlText = await response.text();
            console.error('[فشل] تم إرجاع HTML بدلاً من JSON:', htmlText.substring(0, 200));
            throw new Error('تم إرجاع HTML بدلاً من JSON');
          }

          if (response.ok) {
            const result = await response.json();

            // تحديث بيانات النموذج مع معلومات الملف المرفوع
            updatedFormData = {
              ...updatedFormData,
              inspectionReport: {
                ...updatedFormData.inspectionReport,
                hasReport: updatedFormData.inspectionReport?.hasReport ?? true,
                reportUrl: result.data.fileUrl,
                uploadId: result.data.uploadId,
                fileType: result.data.fileType,
              },
            };
          } else {
            const error = await response.json();
            console.error('[فشل] فشل في رفع ملف تقرير الفحص:', error);
            alert(`فشل في رفع ملف تقرير الفحص: ${error.error || error.message || 'خطأ غير معروف'}`);
            return;
          }
        } catch (error) {
          console.error('[فشل] خطأ في رفع ملف تقرير الفحص:', error);

          let errorMessage = 'حدث خطأ أثناء رفع ملف تقرير الفحص. يرجى المحاولة مرة أخرى.';

          if (error instanceof Error) {
            if (error.message.includes('HTML بدلاً من JSON')) {
              errorMessage = 'خطأ في الخادم. يرجى إعادة تحميل الصفحة والمحاولة مرة أخرى.';
            } else if (error.message.includes('Failed to fetch')) {
              errorMessage = 'فشل في الاتصال بالخادم. يرجى التحقق من الاتصال بالإنترنت.';
            }
          }

          alert(errorMessage);
          return;
        }
      }

      // حفظ التعديلات في قاعدة البيانات
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/cars/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...updatedFormData,
          id: id,
          isAuction: listingType === 'auction',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'فشل في حفظ التعديلات');
      }

      alert('تم حفظ التعديلات بنجاح');

      // العودة لصفحة التفاصيل
      if (listingType === 'auction') {
        router.push(`/auction/${id}`);
      } else {
        router.push(`/marketplace/${id}`);
      }
    } catch (error) {
      console.error('خطأ في حفظ التعديلات:', error);
      alert(error instanceof Error ? error.message : 'حدث خطأ في حفظ التعديلات');
    }
  };

  const handleBack = () => {
    if (listingType === 'auction') {
      router.push(`/auction/${id}`);
    } else {
      router.push(`/marketplace/${id}`);
    }
  };

  const handleLocationSelect = (location: { lat: number; lng: number; address: string }) => {
    setFormData((prev) => ({
      ...prev,
      coordinates: {
        lat: location.lat,
        lng: location.lng,
      },
      detailedAddress: location.address,
    }));
    setIsLocationModalOpen(false);
  };

  // شاشة التحميل
  // تم إزالة spinner - UnifiedPageTransition يتولى ذلك
  if (isLoading) return null;

  return (
    <Layout title="تعديل الإعلان" description="قم بتعديل تفاصيل إعلانك">
      <Head>
        <title>تعديل الإعلان</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
              >
                <BackIcon className="h-5 w-5" />
                <span>العودة</span>
              </button>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">تعديل الإعلان</h1>
            <p className="mt-2 text-gray-600">قم بتعديل بيانات إعلانك وحفظ التغييرات</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-6">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CogIcon className="h-5 w-5 text-gray-600" />
                    <h5 className="text-base font-semibold text-gray-900">المعلومات الأساسية</h5>
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                      مطلوب
                    </span>
                  </div>
                </div>

                <p className="mb-4 text-sm text-gray-700">المعلومات الأساسية للسيارة مطلوبة</p>

                <div className="rounded-lg border border-white bg-white p-4 shadow-sm">
                  <div className="space-y-4">
                    <div data-field="brand">
                      <SelectField
                        label="الماركة"
                        options={carBrands.map((brand) => ({
                          value: brand.name,
                          label: brand.name,
                        }))}
                        value={formData.brand}
                        onChange={(value) => handleInputChange('brand', value)}
                        placeholder="اختر الماركة"
                        error={errors.brand}
                        required
                        searchable
                        clearable
                      />
                    </div>

                    <div data-field="model">
                      <SelectField
                        label="الموديل"
                        options={availableModels.map((model) => ({
                          value: model,
                          label: model,
                        }))}
                        value={formData.model}
                        onChange={(value) => handleInputChange('model', value)}
                        placeholder="اختر الموديل"
                        error={errors.model}
                        disabled={!formData.brand}
                        required
                        searchable
                        clearable
                      />
                    </div>

                    <div data-field="year">
                      <SelectField
                        label="سنة الصنع"
                        options={carYears.map((year) => ({
                          value: year.toString(),
                          label: year.toString(),
                        }))}
                        value={formData.year}
                        onChange={(value) => handleInputChange('year', value)}
                        placeholder="اختر السنة"
                        error={errors.year}
                        required
                        searchable
                        clearable
                      />
                    </div>

                    <div data-field="condition">
                      <SelectField
                        label="حالة السيارة"
                        options={conditions.map((condition) => ({
                          value: condition,
                          label: condition,
                        }))}
                        value={formData.condition}
                        onChange={(value) => handleInputChange('condition', value)}
                        placeholder="اختر حالة السيارة"
                        error={errors.condition}
                        required
                        searchable
                        clearable
                      />
                    </div>

                    <SelectField
                      label="اللون الخارجي"
                      options={exteriorColors.map((color) => ({
                        value: color,
                        label: color,
                      }))}
                      value={formData.exteriorColor}
                      onChange={(value) => handleInputChange('exteriorColor', value)}
                      placeholder="اختر اللون"
                      searchable
                      clearable
                    />

                    <SelectField
                      label="نوع الوقود"
                      options={fuelTypes.map((fuel) => ({
                        value: fuel,
                        label: fuel,
                      }))}
                      value={formData.fuelType}
                      onChange={(value) => handleInputChange('fuelType', value)}
                      placeholder="اختر نوع الوقود"
                      searchable
                      clearable
                    />

                    <SelectField
                      label="ناقل الحركة"
                      options={[
                        { value: 'أوتوماتيك', label: 'أوتوماتيك' },
                        { value: 'عادية', label: 'عادية' },
                      ]}
                      value={formData.transmission}
                      onChange={(value) => handleInputChange('transmission', value)}
                      placeholder="اختر ناقل الحركة"
                      searchable
                      clearable
                    />

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        المسافة المقطوعة (كم)
                      </label>
                      <input
                        type="text"
                        name="mileage"
                        data-field="mileage"
                        value={formData.mileage}
                        onChange={(e) => handleInputChange('mileage', e.target.value)}
                        placeholder="مثال: 50000"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        السعر (دينار ليبي) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          name="price"
                          data-field="price"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', e.target.value)}
                          placeholder="مثال: 25000"
                          className={`w-full rounded-lg border px-3 py-2 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.price ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          required
                          dir="ltr"
                        />
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-sm text-gray-500">د.ل</span>
                        </div>
                      </div>
                      {errors.price && <p className="mt-1 text-sm text-red-600">{errors.price}</p>}
                      <p className="mt-1 text-xs text-gray-500">
                        أدخل السعر بالأرقام فقط (مثال: 25000)
                      </p>
                    </div>

                    <div data-field="city">
                      <SelectField
                        label="المدينة"
                        options={libyanCities.map((city) => ({
                          value: city.name,
                          label: city.name,
                        }))}
                        value={formData.city}
                        onChange={(value) => handleInputChange('city', value)}
                        placeholder="اختر المدينة"
                        error={errors.city}
                        required
                        searchable
                        clearable
                      />
                    </div>

                    <div data-field="area">
                      <div className="space-y-2">
                        <label className="block text-sm font-semibold text-gray-900">المنطقة</label>
                        <input
                          type="text"
                          value={formData.area}
                          onChange={(e) => handleInputChange('area', e.target.value)}
                          placeholder="أدخل المنطقة أو الحي (مثال: وسط البلد، الأندلس، المطار)"
                          className={`w-full rounded-lg border px-4 py-3 text-sm transition-colors ${
                            errors.area
                              ? 'border-red-300 bg-red-50 focus:border-red-500 focus:ring-red-200'
                              : 'border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-200'
                          } focus:outline-none focus:ring-2`}
                        />
                        {errors.area && <p className="text-sm text-red-600">{errors.area}</p>}
                        <p className="text-xs text-gray-500">
                          أدخل اسم المنطقة أو الحي داخل المدينة التي اخترتها
                        </p>
                      </div>
                    </div>

                    {listingType === 'auction' && (
                      <SelectField
                        label="الساحة (خاص بفريق الساحات)"
                        options={[
                          {
                            value: 'ساحة مزاد طرابلس',
                            label: 'ساحة مزاد طرابلس (طرابلس)',
                          },
                          {
                            value: 'ساحة مزاد مصراتة',
                            label: 'ساحة مزاد مصراتة (مصراتة)',
                          },
                          {
                            value: 'ساحة مزاد بنغازي',
                            label: 'ساحة مزاد بنغازي (بنغازي)',
                          },
                        ]}
                        value={formData.yardName || ''}
                        onChange={(value) => handleInputChange('yardName', value)}
                        placeholder="اختر الساحة (لإعلانات فريق الساحات)"
                        searchable
                        clearable
                      />
                    )}

                    <div data-field="contactPhone">
                      <PhoneInputField
                        label="رقم الهاتف"
                        required
                        value={formData.contactPhone}
                        onChange={(v: string) => handleInputChange('contactPhone', v)}
                        onCountryChange={(c: Country) => setContactCountryCode(c.code)}
                        placeholder="أدخل رقم الهاتف"
                        error={errors.contactPhone}
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        سيتم عرض هذا الرقم للمهتمين بالسيارة
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        العنوان <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        data-field="title"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                        placeholder="مثال: تويوتا كامري 2020 - حالة ممتازة"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                      {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">
                        الوصف
                        <span className="mr-1 text-xs text-gray-500">(اختياري)</span>
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="اكتب وصفاً مفصلاً عن السيارة، حالتها، والمميزات الإضافية..."
                        rows={4}
                        className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        وصف جيد يزيد من فرص البيع ويجذب المشترين المهتمين
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* حقول المزاد - تظهر فقط عند اختيار نوع المزاد */}
              {listingType === 'auction' && (
                <>
                  {/* وقت بداية المزاد */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                      <ClockIcon className="ml-1 inline h-4 w-4" />
                      وقت بداية المزاد <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-3">
                      {[
                        {
                          value: 'now',
                          label: 'مزاد مباشر',
                          desc: 'يبدأ المزاد فوراً',
                        },
                        {
                          value: 'after_30_seconds',
                          label: 'بعد 30 ثانية',
                          desc: 'يبدأ المزاد بعد 30 ثانية من النشر',
                        },
                        {
                          value: 'after_1_hour',
                          label: 'بعد ساعة',
                          desc: 'يبدأ المزاد بعد ساعة واحدة',
                        },
                        {
                          value: 'after_24_hours',
                          label: 'بعد 24 ساعة',
                          desc: 'يبدأ المزاد بعد يوم كامل',
                        },
                        {
                          value: 'custom',
                          label: 'مخصص',
                          desc: 'حدد وقت بداية المزاد بنفسك',
                        },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all ${
                            formData.auctionStartTime === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="auctionStartTime"
                            value={option.value}
                            checked={formData.auctionStartTime === option.value}
                            onChange={(e) =>
                              handleInputChange(
                                'auctionStartTime',
                                e.target.value as FormData['auctionStartTime'],
                              )
                            }
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-sm text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>

                    {/* حقل التوقيت المخصص */}
                    {formData.auctionStartTime === 'custom' && (
                      <div className="mt-3">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          تاريخ ووقت بداية المزاد
                        </label>
                        <input
                          type="datetime-local"
                          value={formData.auctionCustomStartTime}
                          onChange={(e) =>
                            handleInputChange('auctionCustomStartTime', e.target.value)
                          }
                          min={new Date().toISOString().slice(0, 16)}
                          className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 ${
                            errors.auctionCustomStartTime
                              ? 'border-red-500 focus:ring-red-500'
                              : 'border-gray-300 focus:ring-blue-500'
                          }`}
                        />
                        {errors.auctionCustomStartTime && (
                          <p className="mt-1 text-sm text-red-600">
                            {errors.auctionCustomStartTime}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* مدة المزاد */}
                  <div>
                    <label className="mb-3 block text-sm font-medium text-gray-700">
                      <CalendarIcon className="ml-1 inline h-4 w-4" />
                      مدة المزاد <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { value: '1_minute', label: '1 دقيقة', desc: '60 ثانية' },
                        { value: '1_day', label: '1 يوم', desc: '24 ساعة' },
                        {
                          value: '3_days',
                          label: '3 أيام',
                          desc: '72 ساعة',
                        },
                        { value: '1_week', label: 'أسبوع', desc: '7 أيام' },
                        { value: '1_month', label: 'شهر', desc: '30 يوم' },
                      ].map((option) => (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 p-4 text-center transition-all ${
                            formData.auctionDuration === option.value
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="auctionDuration"
                            value={option.value}
                            checked={formData.auctionDuration === option.value}
                            onChange={(e) =>
                              handleInputChange(
                                'auctionDuration',
                                e.target.value as FormData['auctionDuration'],
                              )
                            }
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{option.label}</div>
                            <div className="text-xs text-gray-500">{option.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* موقع السيارة */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth="1.5"
                          stroke="currentColor"
                          className="h-4 w-4 text-gray-600"
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
                        <h5 className="text-sm font-semibold text-gray-900">موقع السيارة</h5>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                          اختياري
                        </span>
                      </div>
                    </div>
                    <p className="mb-3 text-xs text-gray-700">
                      تحديد موقع السيارة يساعد المشترين في العثور عليها بسهولة
                    </p>
                    <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-4 text-blue-800 transition-all duration-300 hover:border-blue-400 hover:bg-blue-100 hover:shadow-md active:scale-95"
                        onClick={() => {
                          console.log('تم النقر على زر تحديد الموقع (المزاد)');
                          setIsLocationModalOpen(true);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-blue-200 p-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="h-5 w-5 text-blue-600"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
                              ></path>
                            </svg>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold">
                              {formData.coordinates ? 'تعديل موقع السيارة' : 'تحديد موقع السيارة'}
                            </div>
                            <div className="text-xs opacity-80">
                              {formData.coordinates
                                ? formData.detailedAddress || 'موقع محدد'
                                : 'اضغط لتحديد الموقع من الخريطة أو GPS'}
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* موقع السيارة - للسوق الفوري */}
              {listingType !== 'auction' && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="h-4 w-4 text-gray-600"
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
                      <h5 className="text-sm font-semibold text-gray-900">موقع السيارة</h5>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        اختياري
                      </span>
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-gray-700">
                    تحديد موقع السيارة يساعد المشترين في العثور عليها بسهولة
                  </p>
                  <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-4 text-blue-800 transition-all duration-300 hover:border-blue-400 hover:bg-blue-100 hover:shadow-md active:scale-95"
                      onClick={() => {
                        console.log('تم النقر على زر تحديد الموقع');
                        setIsLocationModalOpen(true);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-blue-200 p-2">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="h-5 w-5 text-blue-600"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59"
                            ></path>
                          </svg>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-semibold">
                            {formData.coordinates ? 'تعديل موقع السيارة' : 'تحديد موقع السيارة'}
                          </div>
                          <div className="text-xs opacity-80">
                            {formData.coordinates
                              ? formData.detailedAddress || 'موقع محدد'
                              : 'اضغط لتحديد الموقع من الخريطة أو GPS'}
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {/* تقرير الفحص */}
              {
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth="1.5"
                        stroke="currentColor"
                        className="h-4 w-4 text-gray-600"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                        />
                      </svg>
                      <h5 className="text-sm font-semibold text-gray-900">تقرير الفحص</h5>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                        اختياري
                      </span>
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-gray-700">يزيد من ثقة المشترين ويحسن فرص البيع</p>
                  <div className="rounded-lg border border-white bg-white p-3 shadow-sm">
                    {!showInspectionReport && (
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-blue-300 bg-blue-50 px-4 py-4 text-blue-800 transition-all duration-300 hover:border-blue-400 hover:bg-blue-100 hover:shadow-md active:scale-95"
                        onClick={() => {
                          console.log('تم النقر على زر إضافة تقرير الفحص');
                          setShowInspectionReport(true);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-blue-200 p-2">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="2"
                              stroke="currentColor"
                              className="h-5 w-5 text-blue-600"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 4.5v15m7.5-7.5h-15"
                              />
                            </svg>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-semibold">
                              {formData.inspectionReport?.hasReport
                                ? 'تعديل تقرير الفحص'
                                : 'إضافة تقرير الفحص'}
                            </div>
                            <div className="text-xs opacity-80">
                              {formData.inspectionReport?.hasReport
                                ? 'تقرير فحص مضاف'
                                : 'اضغط لإضافة تقرير فحص احترافي'}
                            </div>
                          </div>
                        </div>
                      </button>
                    )}

                    {showInspectionReport && (
                      <div className="space-y-4">
                        {/* تبويبات مضغوطة */}
                        <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                          <button
                            type="button"
                            onClick={() => setInspectionReportType('file')}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                              inspectionReportType === 'file'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="h-4 w-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                              />
                            </svg>
                            رفع ملف
                          </button>
                          <button
                            type="button"
                            onClick={() => setInspectionReportType('manual')}
                            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all ${
                              inspectionReportType === 'manual'
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth="1.5"
                              stroke="currentColor"
                              className="h-4 w-4"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                              />
                            </svg>
                            إدخال يدوي
                          </button>
                        </div>

                        {inspectionReportType === 'file' && (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                            {!formData.inspectionReport?.reportFile ? (
                              <div className="group relative overflow-hidden rounded-lg border-2 border-dashed border-blue-300 bg-white p-4 transition-all hover:border-blue-400 hover:bg-blue-50">
                                <div className="text-center">
                                  <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 group-hover:bg-blue-200">
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth="1.5"
                                      stroke="currentColor"
                                      className="h-5 w-5 text-blue-600"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z"
                                      />
                                    </svg>
                                  </div>
                                  <p className="mb-1 text-sm font-medium text-gray-900">
                                    <span className="text-blue-600">انقر لاختيار الملف</span> أو
                                    اسحبه هنا
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    PDF, JPG, PNG حتى 5 ميجابايت
                                  </p>
                                </div>
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setFormData((prev) => ({
                                        ...prev,
                                        inspectionReport: {
                                          ...prev.inspectionReport,
                                          hasReport: true,
                                          reportFile: file,
                                        },
                                      }));
                                    }
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-green-100 p-1.5">
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="1.5"
                                        stroke="currentColor"
                                        className="h-4 w-4 text-green-600"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                                        />
                                      </svg>
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-green-900">
                                        {formData.inspectionReport.reportFile.name}
                                      </p>
                                      <p className="text-xs text-green-700">
                                        {(
                                          formData.inspectionReport.reportFile.size /
                                          1024 /
                                          1024
                                        ).toFixed(2)}{' '}
                                        ميجابايت
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        inspectionReport: {
                                          ...prev.inspectionReport,
                                          reportFile: undefined,
                                        },
                                      }));
                                    }}
                                    className="rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-100"
                                  >
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth="1.5"
                                      stroke="currentColor"
                                      className="h-4 w-4"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                                      />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {inspectionReportType === 'manual' && (
                          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                            <div className="space-y-3">
                              {/* الحقول الأساسية في صفين */}
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-700">
                                    حالة المحرك
                                  </label>
                                  <select
                                    value={
                                      formData.inspectionReport?.manualReport?.engineCondition || ''
                                    }
                                    onChange={(e) => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        inspectionReport: {
                                          ...prev.inspectionReport,
                                          hasReport: true,
                                          manualReport: {
                                            ...prev.inspectionReport?.manualReport,
                                            engineCondition: e.target.value,
                                          },
                                        },
                                      }));
                                    }}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                  >
                                    <option value="">اختر الحالة</option>
                                    <option value="ممتاز">ممتاز</option>
                                    <option value="جيد جداً">جيد جداً</option>
                                    <option value="جيد">جيد</option>
                                    <option value="مقبول">مقبول</option>
                                    <option value="يحتاج صيانة">يحتاج صيانة</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-700">
                                    حالة الهيكل
                                  </label>
                                  <select
                                    value={
                                      formData.inspectionReport?.manualReport?.bodyCondition || ''
                                    }
                                    onChange={(e) => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        inspectionReport: {
                                          ...prev.inspectionReport,
                                          hasReport: true,
                                          manualReport: {
                                            ...prev.inspectionReport?.manualReport,
                                            bodyCondition: e.target.value,
                                          },
                                        },
                                      }));
                                    }}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                  >
                                    <option value="">اختر الحالة</option>
                                    <option value="ممتاز">ممتاز</option>
                                    <option value="جيد جداً">جيد جداً</option>
                                    <option value="جيد">جيد</option>
                                    <option value="مقبول">مقبول</option>
                                    <option value="يحتاج إصلاح">يحتاج إصلاح</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-700">
                                    حالة الداخلية
                                  </label>
                                  <select
                                    value={
                                      formData.inspectionReport?.manualReport?.interiorCondition ||
                                      ''
                                    }
                                    onChange={(e) => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        inspectionReport: {
                                          ...prev.inspectionReport,
                                          hasReport: true,
                                          manualReport: {
                                            ...prev.inspectionReport?.manualReport,
                                            interiorCondition: e.target.value,
                                          },
                                        },
                                      }));
                                    }}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                  >
                                    <option value="">اختر الحالة</option>
                                    <option value="ممتاز">ممتاز</option>
                                    <option value="جيد جداً">جيد جداً</option>
                                    <option value="جيد">جيد</option>
                                    <option value="مقبول">مقبول</option>
                                    <option value="يحتاج تنظيف">يحتاج تنظيف</option>
                                  </select>
                                </div>

                                <div>
                                  <label className="mb-1 block text-xs font-medium text-gray-700">
                                    حالة الإطارات
                                  </label>
                                  <select
                                    value={
                                      formData.inspectionReport?.manualReport?.tiresCondition || ''
                                    }
                                    onChange={(e) => {
                                      setFormData((prev) => ({
                                        ...prev,
                                        inspectionReport: {
                                          ...prev.inspectionReport,
                                          hasReport: true,
                                          manualReport: {
                                            ...prev.inspectionReport?.manualReport,
                                            tiresCondition: e.target.value,
                                          },
                                        },
                                      }));
                                    }}
                                    className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                  >
                                    <option value="">اختر الحالة</option>
                                    <option value="ممتاز">ممتاز</option>
                                    <option value="جيد جداً">جيد جداً</option>
                                    <option value="جيد">جيد</option>
                                    <option value="مقبول">مقبول</option>
                                    <option value="يحتاج تغيير">يحتاج تغيير</option>
                                  </select>
                                </div>
                              </div>

                              {/* ملاحظات مضغوطة */}
                              <div>
                                <label className="mb-1 block text-xs font-medium text-gray-700">
                                  ملاحظات إضافية
                                </label>
                                <textarea
                                  value={formData.inspectionReport?.manualReport?.notes || ''}
                                  onChange={(e) => {
                                    setFormData((prev) => ({
                                      ...prev,
                                      inspectionReport: {
                                        ...prev.inspectionReport,
                                        hasReport: true,
                                        manualReport: {
                                          ...prev.inspectionReport?.manualReport,
                                          notes: e.target.value,
                                        },
                                      },
                                    }));
                                  }}
                                  placeholder="ملاحظات حول حالة السيارة أو الصيانة المطلوبة..."
                                  rows={2}
                                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-200"
                                />
                              </div>
                            </div>
                          </div>
                        )}

                        {/* شريط التأكيد المضغوط - يظهر فقط عند وجود محتوى */}
                        {((inspectionReportType === 'file' &&
                          formData.inspectionReport?.reportFile) ||
                          (inspectionReportType === 'manual' &&
                            (formData.inspectionReport?.manualReport?.engineCondition ||
                              formData.inspectionReport?.manualReport?.bodyCondition ||
                              formData.inspectionReport?.manualReport?.interiorCondition ||
                              formData.inspectionReport?.manualReport?.tiresCondition ||
                              formData.inspectionReport?.manualReport?.notes))) && (
                          <div className="mt-3 flex items-center justify-between rounded-md border border-green-200 bg-green-50 p-2">
                            <div className="flex items-center gap-2">
                              <div className="rounded-full bg-green-100 p-1">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth="2"
                                  stroke="currentColor"
                                  className="h-3 w-3 text-green-600"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M4.5 12.75l6 6 9-13.5"
                                  />
                                </svg>
                              </div>
                              <span className="text-sm font-medium text-green-900">
                                تم إضافة تقرير الفحص (
                                {inspectionReportType === 'file' ? 'ملف' : 'يدوي'})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setShowInspectionReport(false);
                                setFormData((prev) => ({
                                  ...prev,
                                  inspectionReport: {
                                    hasReport: false,
                                    manualReport: {
                                      engineCondition: '',
                                      bodyCondition: '',
                                      interiorCondition: '',
                                      tiresCondition: '',
                                      electricalCondition: '',
                                      overallRating: '',
                                      notes: '',
                                    },
                                  },
                                }));
                              }}
                              className="rounded-md p-1 text-red-600 transition-colors hover:bg-red-100"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth="1.5"
                                stroke="currentColor"
                                className="h-4 w-4"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              }
            </div>
          </div>

          {/* المواصفات والتفاصيل الإضافية */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setIsAdditionalDetailsOpen(!isAdditionalDetailsOpen)}
              className="flex w-full transform items-center justify-between rounded-lg border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-indigo-50 p-6 transition-all hover:scale-[1.02] hover:border-purple-400 hover:from-purple-100 hover:to-indigo-100 hover:shadow-lg"
            >
              <div className="text-right">
                <h3 className="text-lg font-semibold text-gray-900">إضافة المزيد من التفاصيل</h3>
                <p className="mt-1 text-sm text-gray-600">
                  المواصفات التقنية • الألوان والمقاعد • الكماليات • معلومات إضافية
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.bodyType && (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                      {formData.bodyType}
                    </span>
                  )}
                  {formData.exteriorColor && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      {formData.exteriorColor}
                    </span>
                  )}
                  {formData.features.length > 0 && (
                    <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
                      {formData.features.length} كماليات
                    </span>
                  )}
                  {formData.fuelType && (
                    <span className="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800">
                      {formData.fuelType}
                    </span>
                  )}
                  {formData.transmission && (
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-800">
                      {formData.transmission}
                    </span>
                  )}
                  {(formData.chassisNumber || formData.engineNumber) && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                      معلومات تقنية
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0">
                {isAdditionalDetailsOpen ? (
                  <ChevronUpIcon className="h-8 w-8 font-bold text-purple-600" />
                ) : (
                  <ChevronDownIcon className="h-8 w-8 font-bold text-purple-600" />
                )}
              </div>
            </button>

            {isAdditionalDetailsOpen && (
              <div className="mt-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                <div className="space-y-8">
                  {/* المواصفات التقنية */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CogIcon className="h-5 w-5 text-gray-600" />
                        <h5 className="text-base font-semibold text-gray-900">المواصفات التقنية</h5>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          اختياري
                        </span>
                      </div>
                    </div>

                    <p className="mb-4 text-sm text-gray-700">
                      هذه المعلومات اختيارية ولكنها تساعد في جذب المشترين
                    </p>

                    <div className="rounded-lg border border-white bg-white p-4 shadow-sm">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <SelectField
                          label="نوع الهيكل"
                          options={bodyTypes.map((type) => ({
                            value: type,
                            label: type,
                          }))}
                          value={formData.bodyType}
                          onChange={(value) => handleInputChange('bodyType', value)}
                          placeholder="اختر نوع الهيكل"
                          searchable
                          clearable
                        />

                        <SelectField
                          label="المواصفات الإقليمية"
                          options={regionalSpecs.map((spec) => ({
                            value: spec,
                            label: spec,
                          }))}
                          value={formData.regionalSpec}
                          onChange={(value) => handleInputChange('regionalSpec', value)}
                          placeholder="اختر المواصفات"
                          searchable
                          clearable
                        />

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            سعة المحرك (لتر)
                          </label>
                          <input
                            type="text"
                            value={formData.engineSize}
                            onChange={(e) => handleInputChange('engineSize', e.target.value)}
                            placeholder="مثال: 2.0"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* الألوان والمقاعد */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SwatchIcon className="h-5 w-5 text-gray-600" />
                        <h5 className="text-base font-semibold text-gray-900">الألوان والمقاعد</h5>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          اختياري
                        </span>
                      </div>
                    </div>

                    <p className="mb-4 text-sm text-gray-700">
                      تحديد الألوان وعدد المقاعد يساعد في وصف السيارة بشكل أفضل
                    </p>

                    <div className="rounded-lg border border-white bg-white p-4 shadow-sm">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <SelectField
                          label="لون الداخلية"
                          options={interiorColors.map((color) => ({
                            value: color,
                            label: color,
                          }))}
                          value={formData.interiorColor}
                          onChange={(value) => handleInputChange('interiorColor', value)}
                          placeholder="اختر اللون"
                          searchable
                          clearable
                        />

                        <SelectField
                          label="عدد المقاعد"
                          options={['2', '4', '5', '7', '8', '9+'].map((count) => ({
                            value: count,
                            label: count,
                          }))}
                          value={formData.seatCount}
                          onChange={(value) => handleInputChange('seatCount', value)}
                          placeholder="اختر عدد المقاعد"
                          searchable
                          clearable
                        />
                      </div>
                    </div>
                  </div>

                  {/* المعلومات الإضافية */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <SparklesIcon className="h-5 w-5 text-gray-600" />
                        <h5 className="text-base font-semibold text-gray-900">
                          المعلومات الإضافية
                        </h5>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          اختياري
                        </span>
                      </div>
                    </div>

                    <p className="mb-4 text-sm text-gray-700">
                      هذه المعلومات اختيارية ولكنها تزيد من مصداقية الإعلان
                    </p>

                    <div className="rounded-lg border border-white bg-white p-4 shadow-sm">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            رقم الشاسيه (VIN)
                          </label>
                          <input
                            type="text"
                            value={formData.chassisNumber}
                            onChange={(e) => handleInputChange('chassisNumber', e.target.value)}
                            placeholder="مثال: 1HGBH41JXMN109186"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            رقم الشاسيه يزيد من مصداقية الإعلان
                          </p>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            رقم المحرك
                          </label>
                          <input
                            type="text"
                            value={formData.engineNumber}
                            onChange={(e) => handleInputChange('engineNumber', e.target.value)}
                            placeholder="مثال: G4KD123456"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            رقم المحرك للتحقق من صحة البيانات
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* قسم عرض الكماليات المختارة تم حذفه بناءً على طلب المستخدم */}

                  {/* قسم اختيار الكماليات والمميزات - يظهر دائماً للاختيار */}
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <WrenchScrewdriverIcon className="h-5 w-5 text-gray-600" />
                        <h5 className="text-base font-semibold text-gray-900">
                          اختيار الكماليات والمميزات
                        </h5>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                          اختياري
                        </span>
                      </div>
                    </div>

                    <p className="mb-4 text-sm text-gray-700">
                      اختر الكماليات والمميزات المتوفرة في السيارة
                    </p>

                    {/* حاوية الكماليات العامة */}
                    <div className="rounded-lg border border-gray-200 bg-blue-50 p-4 shadow-sm">
                      <h6 className="mb-3 text-sm font-medium text-gray-700">الكماليات العامة</h6>
                      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
                        {[
                          'مكيف هواء',
                          'نظام صوتي متطور',
                          'مقاعد جلدية',
                          'نوافذ كهربائية',
                          'قفل مركزي',
                          'مرايا كهربائية',
                          'فتحة سقف',
                          'مقاعد قابلة للتعديل كهربائياً',
                          'تدفئة مقاعد',
                          'نظام ملاحة GPS',
                          'شاشة لمس',
                          'كاميرا خلفية',
                        ].map((feature) => (
                          <label
                            key={feature}
                            className="flex cursor-pointer items-center space-x-2 space-x-reverse rounded-md border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 transition-all duration-200 hover:from-blue-100 hover:to-indigo-100"
                          >
                            <input
                              type="checkbox"
                              checked={formData.features.includes(feature)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    features: [...prev.features, feature],
                                  }));
                                } else {
                                  setFormData((prev) => ({
                                    ...prev,
                                    features: prev.features.filter((f) => f !== feature),
                                  }));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="select-none text-sm text-gray-700">{feature}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* حاوية أنظمة الأمان */}
                    <div className="mt-4 rounded-lg border border-gray-200 bg-red-50 p-4 shadow-sm">
                      <h6 className="mb-3 text-sm font-medium text-gray-700">أنظمة الأمان</h6>
                      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
                        {[
                          'وسائد هوائية',
                          'نظام ABS',
                          'نظام ESP',
                          'نظام مراقبة ضغط الإطارات',
                          'نظام التحكم في الجر',
                          'نظام مساعدة الفرامل',
                          'حساسات ركن',
                          'نظام إنذار',
                          'قفل أطفال',
                          'نظام مراقبة النقطة العمياء',
                        ].map((feature) => (
                          <label
                            key={feature}
                            className="flex cursor-pointer items-center space-x-2 space-x-reverse rounded-md border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-2 transition-all duration-200 hover:from-blue-100 hover:to-indigo-100"
                          >
                            <input
                              type="checkbox"
                              checked={formData.features.includes(feature)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setFormData((prev) => ({
                                    ...prev,
                                    features: [...prev.features, feature],
                                  }));
                                } else {
                                  setFormData((prev) => ({
                                    ...prev,
                                    features: prev.features.filter((f) => f !== feature),
                                  }));
                                }
                              }}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="select-none text-sm text-gray-700">{feature}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-3 rounded-lg border-2 border-gray-400 bg-white px-8 py-4 font-medium text-gray-700 transition-all hover:border-gray-500 hover:bg-gray-50 hover:shadow-md"
            >
              <BackIcon className="h-6 w-6" />
              <span>إلغاء</span>
            </button>

            <button
              onClick={handleSave}
              className="flex transform items-center gap-3 rounded-lg bg-green-600 px-10 py-4 text-lg font-medium text-white transition-all hover:scale-105 hover:bg-green-700 hover:shadow-lg"
            >
              <span>حفظ التعديلات</span>
              <ArrowRightIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal اختيار الموقع */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onLocationSelect={handleLocationSelect}
        currentLocation={
          formData.coordinates
            ? {
                lat: formData.coordinates.lat,
                lng: formData.coordinates.lng,
                address: formData.detailedAddress || 'موقع محدد',
              }
            : undefined
        }
      />
    </Layout>
  );
};

export default EditListingForm;
