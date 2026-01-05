import ArrowLeftIcon from '@heroicons/react/24/outline/ArrowLeftIcon';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import BuildingStorefrontIcon from '@heroicons/react/24/outline/BuildingStorefrontIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import ChevronUpIcon from '@heroicons/react/24/outline/ChevronUpIcon';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import PhoneIcon from '@heroicons/react/24/outline/PhoneIcon';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import LocationPickerModal from '../../../components/LocationPickerModal';
import { Layout } from '../../../components/common';
import SelectField from '../../../components/ui/SelectField';
import { useUserContext } from '../../../contexts/UserContext';
import {
  carYears,
  conditions,
  exteriorColors,
  fuelTypes,
  getAllBrandNames,
  getModelsByBrand,
} from '../../../data/simple-filters';
import { processPhoneNumber } from '../../../utils/phoneUtils';

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
  coordinates?: {
    lat: number;
    lng: number;
  };
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
  detailedAddress?: string;
  contactPhone: string;
  title: string;
  description: string;
  chassisNumber: string;
  engineNumber: string;
  features: string[];
}

const ShowroomCarDetailsForm = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUserContext();

  const [showroomData, setShowroomData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
    coordinates: undefined,
    detailedAddress: '',
    contactPhone: '',
    title: '',
    description: '',
    chassisNumber: '',
    engineNumber: '',
    features: [],
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
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    specs: false,
    location: false,
    inspection: false,
    additional: false,
  });

  // التحقق من وجود المعرض وصلاحية المستخدم
  useEffect(() => {
    if (id && user) {
      fetchShowroomData();
    }
  }, [id, user]);

  // ملء رقم الهاتف تلقائياً من بيانات المستخدم (مرة واحدة فقط)
  const [hasAutoFilledPhone, setHasAutoFilledPhone] = useState(false);

  useEffect(() => {
    const getUserPhone = async () => {
      if (hasAutoFilledPhone) return; // عدم إعادة الملء إذا تم مسبقاً

      try {
        // أولاً: استخدام UserContext إذا كان المستخدم مسجل دخول
        if (user && user.phone) {
          const cleanPhone = user.phone.replace(/^\+218/, '').replace(/^\+/, '');
          setFormData((prev) => ({ ...prev, contactPhone: cleanPhone }));
          setHasAutoFilledPhone(true);
          return;
        }

        // ثانياً: محاولة جلب من localStorage (بيانات المستخدم المحفوظة)
        const savedUserData = localStorage.getItem('user');
        if (savedUserData) {
          const userData = JSON.parse(savedUserData);
          if (userData.phone) {
            const cleanPhone = userData.phone.replace(/^\+218/, '').replace(/^\+/, '');
            setFormData((prev) => ({ ...prev, contactPhone: cleanPhone }));
            setHasAutoFilledPhone(true);
            return;
          }
        }

        // ثالثاً: محاولة جلب من API إذا كان هناك token
        const token = localStorage.getItem('token');
        if (token) {
          const response = await fetch('/api/user/profile', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data?.phone) {
              const cleanPhone = result.data.phone.replace(/^\+218/, '').replace(/^\+/, '');
              setFormData((prev) => ({
                ...prev,
                contactPhone: cleanPhone,
              }));
              setHasAutoFilledPhone(true);
            }
          }
        }
      } catch (error) {
        console.log('[تحذير] لا يمكن جلب رقم الهاتف تلقائياً:', error);
      }
    };

    getUserPhone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchShowroomData = async () => {
    try {
      const response = await fetch(`/api/showrooms/${id}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const showroom = result.data;

          // التحقق من أن المستخدم هو مالك المعرض
          if (showroom.user.id !== user?.id) {
            router.push('/showroom/dashboard');
            return;
          }

          setShowroomData(showroom);

          // تعيين المدينة والموقع من بيانات المعرض
          setFormData((prev) => ({
            ...prev,
            city: showroom.city,
            detailedAddress: showroom.address,
          }));
        }
      }
    } catch (error) {
      console.error('خطأ في جلب بيانات المعرض:', error);
      router.push('/showroom/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // إزالة الخطأ عند التعديل
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // تحديث الموديلات عند تغيير الماركة
    if (field === 'brand') {
      setFormData((prev) => ({ ...prev, model: '' }));
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    // التحقق من الحقول المطلوبة
    if (!formData.brand) newErrors.brand = 'الماركة مطلوبة';
    if (!formData.model) newErrors.model = 'الموديل مطلوب';
    if (!formData.year) newErrors.year = 'سنة الصنع مطلوبة';
    if (!formData.condition) newErrors.condition = 'حالة السيارة مطلوبة';
    if (!formData.price) newErrors.price = 'السعر مطلوب';
    if (!formData.title) newErrors.title = 'عنوان الإعلان مطلوب';
    if (!formData.description) newErrors.description = 'وصف السيارة مطلوب';

    // التحقق من رقم الهاتف
    if (formData.contactPhone) {
      const phoneValidation = processPhoneNumber(formData.contactPhone);
      if (!phoneValidation.isValid) {
        newErrors.contactPhone = phoneValidation.error || 'يرجى إدخال رقم هاتف ليبي صحيح';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = () => {
    if (validateForm()) {
      // حفظ البيانات مع معرف المعرض
      const dataToSave = {
        ...formData,
        showroomId: id,
        listingType: 'showroom',
      };
      localStorage.setItem('showroomCarData', JSON.stringify(dataToSave));
      router.push('/add-listing/upload-images');
    }
  };

  const handleBack = () => {
    router.push(`/showrooms/${id}`);
  };

  // تم إزالة spinner - UnifiedPageTransition يتولى ذلك
  if (loading) return null;

  if (!showroomData) {
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">المعرض غير موجود</h2>
            <p className="mt-2 text-gray-600">يرجى التحقق من الرابط والمحاولة مرة أخرى</p>
          </div>
        </div>
      </Layout>
    );
  }

  const availableModels = getModelsByBrand(formData.brand);

  return (
    <Layout
      title={`إضافة مركبة - ${showroomData?.name || 'المعرض'}`}
      description="أضف مركبة جديدة لمعرضك"
    >
      <Head>
        <title>إضافة مركبة - {showroomData?.name || 'المعرض'}</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">إضافة مركبة جديدة</h1>
            <p className="text-gray-600">أضف مركبة جديدة لمعرض {showroomData?.name || ''}</p>
          </div>

          {/* Showroom Info */}
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <BuildingStorefrontIcon className="h-5 w-5 text-green-600" />
              <div>
                <span className="font-medium text-gray-900">{showroomData?.name || ''}</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-sm text-gray-600">
                  {showroomData?.area || ''}، {showroomData?.city || ''}
                </span>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <div className="rounded-lg bg-white shadow-lg">
            <div className="p-6">
              {/* Progress Bar */}
              <div className="mb-8">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>الخطوة 1 من 3</span>
                  <span>تفاصيل المركبة</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-gray-200">
                  <div className="h-2 w-1/3 rounded-full bg-blue-600"></div>
                </div>
              </div>

              {/* Basic Information Section */}
              <div className="mb-8">
                <button
                  type="button"
                  onClick={() => toggleSection('basic')}
                  className="flex w-full items-center justify-between rounded-lg bg-blue-50 p-4 text-left hover:bg-blue-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-blue-600 p-2">
                      <CogIcon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">المعلومات الأساسية</h3>
                      <p className="text-sm text-gray-600">الماركة، الموديل، السنة والحالة</p>
                    </div>
                  </div>
                  {expandedSections.basic ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>

                {expandedSections.basic && (
                  <div className="mt-4 rounded-lg border border-gray-200 p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <SelectField
                        label="الماركة"
                        options={getAllBrandNames().map((brand) => ({
                          value: brand,
                          label: brand,
                        }))}
                        value={formData.brand}
                        onChange={(value) => handleInputChange('brand', value)}
                        placeholder="اختر الماركة"
                        error={errors.brand}
                        required
                        searchable
                        clearable
                      />

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
                        <input
                          type="text"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', e.target.value)}
                          placeholder="مثال: 25000"
                          className={`w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.price ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          required
                        />
                        {errors.price && (
                          <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                        )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          رقم الهاتف <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <PhoneIcon className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="tel"
                            value={formData.contactPhone}
                            onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                            className={`block w-full rounded-lg border py-2 pl-10 pr-3 text-sm focus:border-blue-500 focus:ring-blue-500 ${
                              errors.contactPhone ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="0912345678 أو 0923456789"
                            dir="ltr"
                          />
                        </div>
                        {errors.contactPhone && (
                          <p className="mt-1 text-sm text-red-600">{errors.contactPhone}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          سيتم عرض هذا الرقم للمهتمين بالسيارة
                        </p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          العنوان <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={formData.title}
                          onChange={(e) => handleInputChange('title', e.target.value)}
                          placeholder="مثال: تويوتا كامري 2020 - حالة ممتازة"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                        {errors.title && (
                          <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          الوصف <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => handleInputChange('description', e.target.value)}
                          placeholder="اكتب وصفاً مفصلاً عن السيارة، حالتها، والمميزات الإضافية..."
                          rows={4}
                          className={`w-full resize-none rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.description ? 'border-red-300 bg-red-50' : 'border-gray-300'
                          }`}
                          required
                        />
                        {errors.description && (
                          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                          وصف جيد يزيد من فرص البيع ويجذب المشترين المهتمين
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <ArrowRightIcon className="h-5 w-5 rotate-180" />
                  <span>العودة للمعرض</span>
                </button>
                <button
                  type="button"
                  onClick={handleContinue}
                  className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
                >
                  <span>التالي - رفع الصور</span>
                  <ArrowLeftIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Location Modal */}
          <LocationPickerModal
            isOpen={showLocationModal}
            onClose={() => setShowLocationModal(false)}
            onLocationSelect={(location) => {
              setFormData((prev) => ({
                ...prev,
                coordinates: {
                  lat: location.lat,
                  lng: location.lng,
                },
                detailedAddress: location.address,
              }));
              setShowLocationModal(false);
            }}
            currentLocation={
              formData.coordinates
                ? {
                    lat: formData.coordinates.lat,
                    lng: formData.coordinates.lng,
                    address: formData.detailedAddress || '',
                  }
                : undefined
            }
          />
        </div>
      </div>
    </Layout>
  );
};

export default ShowroomCarDetailsForm;
