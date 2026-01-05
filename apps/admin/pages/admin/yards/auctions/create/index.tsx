/**
 * صفحة إنشاء مزاد ساحة جديد - لوحة التحكم
 * Create New Yard Auction - Admin Panel
 * يستخدم البيانات المشتركة من packages/utils
 * المزاد سيظهر في صفحة الساحة على الموقع الرئيسي
 */

import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CogIcon,
  DocumentTextIcon,
  PlusIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdminLayout from '../../../../../components/AdminLayout';
import AuctionDurationSelector, {
  DEFAULT_DURATION_VALUE,
  DurationValue,
} from '../../../../../components/auctions/AuctionDurationSelector';
import LocationPickerSection, {
  LocationData,
} from '../../../../../components/ui/LocationPickerSection';
import SellerSelector, { SellerInfo } from '../../../../../components/ui/SellerSelector';
import StickyActionBar from '../../../../../components/ui/StickyActionBar';
import UnifiedPhoneInput from '../../../../../components/ui/UnifiedPhoneInput';

// استيراد البيانات المشتركة
import {
  bodyTypes,
  carBrands,
  carYears,
  conditions,
  exteriorColors,
  fuelTypes,
  getCityNames,
  interiorColors,
  regionalSpecs,
  transmissionTypes,
} from '@sooq-mazad/utils';

// المدن الليبية كأسماء فقط
const cityNames = getCityNames();

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
  yardId: string;
  coordinates?: { lat: number; lng: number };
  detailedAddress: string;
  contactPhone: string;
  title: string;
  description: string;
  chassisNumber: string;
  engineNumber: string;
  features: string[];
  auctionStartTime: 'now' | 'after_30_seconds' | 'after_1_hour' | 'after_24_hours' | 'custom';
  auctionCustomStartTime: string;
  auctionDuration: DurationValue;
  featured: boolean;
  promotionPackage: 'NONE' | 'BASIC' | 'PREMIUM' | 'VIP';
  promotionDays: number;
  inspectionReport: {
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
}

// واجهة الساحة
interface Yard {
  id: string;
  name: string;
  city: string;
  area?: string;
  slug: string;
}

type SiteTeamSettings = {
  phones?: string[];
  whatsappPhone?: string;
};

function normalizeSiteTeamPhoneForUnifiedInput(raw: string) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';

  if (digits.startsWith('218')) {
    const rest = digits.slice(3);
    return rest.startsWith('0') ? rest.slice(1) : rest;
  }

  if (digits.startsWith('0') && digits.length >= 10) return digits.slice(1);

  return digits;
}

export default function CreateYardAuctionPage() {
  const router = useRouter();
  const { yardId: queryYardId } = router.query;

  // بيانات الساحات
  const [yards, setYards] = useState<Yard[]>([]);
  const [yardsLoading, setYardsLoading] = useState(true);
  const [selectedYard, setSelectedYard] = useState<Yard | null>(null);

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
    yardId: '',
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
    auctionDuration: DEFAULT_DURATION_VALUE,
    featured: false,
    promotionPackage: 'NONE',
    promotionDays: 0,
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
  const [showInspectionReport, setShowInspectionReport] = useState(false);
  const [inspectionReportType, setInspectionReportType] = useState<'file' | 'manual'>('manual');
  const [siteTeamPhone, setSiteTeamPhone] = useState<string>('');

  // البائع المختار
  const [selectedSeller, setSelectedSeller] = useState<SellerInfo | null>(null);

  // جلب الساحات
  useEffect(() => {
    const fetchYards = async () => {
      try {
        const res = await fetch('/api/admin/yards?status=ACTIVE&limit=100');
        const data = await res.json();
        if (data.success) {
          setYards(data.data || []);
        }
      } catch (error) {
        console.error('Error fetching yards:', error);
      } finally {
        setYardsLoading(false);
      }
    };
    fetchYards();
  }, []);

  // تعيين الساحة من URL إذا وجدت
  useEffect(() => {
    if (queryYardId && typeof queryYardId === 'string' && yards.length > 0) {
      const yard = yards.find((y) => y.id === queryYardId);
      if (yard) {
        setFormData((prev) => ({ ...prev, yardId: queryYardId, city: yard.city }));
        setSelectedYard(yard);
      }
    }
  }, [queryYardId, yards]);

  // تحديث الساحة المختارة عند تغيير yardId
  useEffect(() => {
    if (formData.yardId) {
      const yard = yards.find((y) => y.id === formData.yardId);
      if (yard) {
        setSelectedYard(yard);
        if (yard.city) {
          setFormData((prev) => ({ ...prev, city: yard.city }));
        }
      }
    } else {
      setSelectedYard(null);
    }
  }, [formData.yardId, yards]);

  // إعدادات المزاد من API
  const [auctionSettings, setAuctionSettings] = useState<{
    minDurationMinutes: number;
    maxDurationMinutes: number;
    defaultDurationMinutes: number;
    minStartingPrice: number;
    minBidIncrement: number;
    allowedPresets: { id: string; label: string; value: number }[];
  } | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // جلب إعدادات المزاد من API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/auctions/settings');
        const data = await res.json();
        if (data.success && data.data) {
          setAuctionSettings(data.data);
          // تعيين المدة الافتراضية إذا كانت متوفرة
          const defaultPreset = data.data.allowedPresets?.find(
            (p: { value: number }) => p.value === data.data.defaultDurationMinutes,
          );
          if (defaultPreset) {
            setFormData((prev) => ({
              ...prev,
              auctionDuration: {
                type: 'preset',
                presetId: defaultPreset.id,
                totalMinutes: defaultPreset.value,
              },
            }));
          }
        }
      } catch (error) {
        console.error('خطأ في جلب إعدادات المزاد:', error);
      } finally {
        setSettingsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    const fetchSiteTeam = async () => {
      try {
        const res = await fetch('/api/admin/site-team');
        const data = (await res.json()) as { success?: boolean; settings?: SiteTeamSettings };

        if (data?.success) {
          const phone =
            (data.settings?.phones || []).find((p) => String(p || '').trim()) ||
            String(data.settings?.whatsappPhone || '').trim();
          if (phone) setSiteTeamPhone(phone);
        }
      } catch {}
    };

    fetchSiteTeam();
  }, []);

  useEffect(() => {
    if (!selectedSeller?.isSiteTeam) return;
    const normalized = normalizeSiteTeamPhoneForUnifiedInput(siteTeamPhone);

    if (!normalized) return;

    setFormData((prev) => {
      if (prev.contactPhone === normalized) return prev;
      return { ...prev, contactPhone: normalized };
    });
  }, [selectedSeller?.isSiteTeam, siteTeamPhone]);

  useEffect(() => {
    if (selectedSeller?.isSiteTeam) return;
    const normalized = normalizeSiteTeamPhoneForUnifiedInput(siteTeamPhone);
    if (!normalized) return;

    setFormData((prev) => {
      if (prev.contactPhone !== normalized) return prev;
      return { ...prev, contactPhone: '' };
    });
  }, [selectedSeller?.isSiteTeam, siteTeamPhone]);

  // تحديث الموديلات عند تغيير الماركة
  useEffect(() => {
    if (formData.brand) {
      const brand = carBrands.find((b) => b.name === formData.brand);
      setAvailableModels(brand?.models || []);
      if (formData.model && !brand?.models.includes(formData.model)) {
        setFormData((prev) => ({ ...prev, model: '' }));
      }
    } else {
      setAvailableModels([]);
    }
  }, [formData.brand, formData.model]);

  const handleInputChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    if (field === 'price' && typeof value === 'string') {
      const cleanValue = value.replace(/[^\d.]/g, '');
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

  const normalizedSiteTeamPhone = normalizeSiteTeamPhoneForUnifiedInput(siteTeamPhone);
  const isSiteTeamSeller = !!selectedSeller?.isSiteTeam;
  const shouldRequireContactPhone = !isSiteTeamSeller || !normalizedSiteTeamPhone;

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    // الساحة مطلوبة في مزادات الساحات
    if (!formData.yardId) newErrors.yardId = 'يرجى اختيار الساحة - هذا الحقل إجباري';
    if (!formData.brand) newErrors.brand = 'يرجى اختيار الماركة';
    if (!formData.model) newErrors.model = 'يرجى اختيار الموديل';
    if (!formData.year) newErrors.year = 'يرجى اختيار سنة الصنع';
    if (!formData.condition) newErrors.condition = 'يرجى اختيار حالة السيارة';
    if (!formData.city) newErrors.city = 'يرجى اختيار المدينة';
    if (!formData.area?.trim()) newErrors.area = 'يرجى إدخال المنطقة أو الحي';
    if (!formData.title) newErrors.title = 'يرجى إدخال عنوان الإعلان';

    if (!formData.price?.trim()) {
      newErrors.price = 'السعر مطلوب';
    } else {
      const numericPrice = parseFloat(formData.price.replace(/[^\d.-]/g, ''));
      if (isNaN(numericPrice) || numericPrice < 100) {
        newErrors.price = 'يرجى إدخال سعر صحيح (100 دينار على الأقل)';
      } else if (numericPrice > 50000000) {
        newErrors.price = 'السعر يبدو مرتفعاً جداً';
      }
    }

    if (shouldRequireContactPhone) {
      if (!formData.contactPhone?.trim()) {
        newErrors.contactPhone = 'رقم الهاتف مطلوب';
      }
    }

    // التحقق من بيانات البائع
    if (!selectedSeller || (!selectedSeller.isSiteTeam && !selectedSeller.phone)) {
      newErrors.seller = 'يرجى تحديد البائع';
    }

    if (formData.auctionStartTime === 'custom' && formData.auctionCustomStartTime) {
      const selectedDate = new Date(formData.auctionCustomStartTime);
      if (selectedDate <= new Date()) {
        newErrors.auctionCustomStartTime = 'يجب أن يكون تاريخ بداية المزاد في المستقبل';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (validateForm()) {
      const updatedFormData = {
        ...formData,
        listingType: 'yard_auction',
        isYardAuction: true,
        yardName: selectedYard?.name,
        yardSlug: selectedYard?.slug,
        seller: selectedSeller,
      };
      localStorage.setItem('adminYardAuctionData', JSON.stringify(updatedFormData));
      router.push('/admin/yards/auctions/create/upload-images');
    }
  };

  const handleBack = () => {
    router.push('/admin/yards');
  };

  // SelectField Component - مكون قائمة منسدلة محسن مع بحث
  const SelectField = ({
    label,
    options,
    value,
    onChange,
    placeholder,
    error,
    required,
    disabled,
    searchable,
  }: {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    searchable?: boolean;
  }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const filteredOptions =
      searchable && searchTerm
        ? options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()))
        : options;

    // الحصول على القيمة المعروضة
    const displayValue = options.find((opt) => opt.value === value)?.label || '';

    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <div className="relative">
          {searchable ? (
            <div>
              {/* زر فتح القائمة */}
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`flex w-full items-center justify-between rounded-lg border bg-slate-700 px-4 py-3 text-right transition-colors focus:outline-none focus:ring-2 ${
                  error
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/30'
                } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <span className={displayValue ? 'text-white' : 'text-slate-400'}>
                  {displayValue || placeholder}
                </span>
                <ChevronDownIcon
                  className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* القائمة المنسدلة مع البحث */}
              {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 shadow-lg">
                  {/* حقل البحث */}
                  <div className="sticky top-0 border-b border-slate-600 bg-slate-700 p-2">
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ابحث..."
                      autoFocus
                      className="w-full rounded-md border border-slate-500 bg-slate-600 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* قائمة الخيارات */}
                  <div className="max-h-52 overflow-auto">
                    {filteredOptions.length > 0 ? (
                      filteredOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onChange(opt.value);
                            setSearchTerm('');
                            setIsOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-right text-sm transition-colors hover:bg-slate-600 ${
                            value === opt.value ? 'bg-blue-600 text-white' : 'text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center text-sm text-slate-400">
                        لا توجد نتائج
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* إغلاق عند النقر خارج القائمة */}
              {isOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => {
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                />
              )}
            </div>
          ) : (
            // قائمة منسدلة مخصصة بدون بحث مع تحديد ارتفاع
            <div>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`flex w-full items-center justify-between rounded-lg border bg-slate-700 px-4 py-3 text-right transition-colors focus:outline-none focus:ring-2 ${
                  error
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                    : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/30'
                } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <span className={displayValue ? 'text-white' : 'text-slate-400'}>
                  {displayValue || placeholder}
                </span>
                <ChevronDownIcon
                  className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {/* القائمة المنسدلة */}
              {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-600 bg-slate-700 shadow-lg">
                  {/* قائمة الخيارات مع تحديد ارتفاع أقصى */}
                  <div className="max-h-52 overflow-auto">
                    {options.length > 0 ? (
                      options.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            onChange(opt.value);
                            setIsOpen(false);
                          }}
                          className={`w-full px-4 py-2.5 text-right text-sm transition-colors hover:bg-slate-600 ${
                            value === opt.value ? 'bg-blue-600 text-white' : 'text-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-center text-sm text-slate-400">
                        لا توجد خيارات
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* إغلاق عند النقر خارج القائمة */}
              {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  };

  return (
    <AdminLayout title="إنشاء مزاد ساحة جديد">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span>العودة للساحات</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-500/20 p-2">
              <BuildingOfficeIcon className="h-6 w-6 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">إنشاء مزاد ساحة جديد</h1>
              <p className="mt-1 text-slate-400">
                أدخل تفاصيل السيارة لإنشاء مزاد جديد في إحدى الساحات
              </p>
            </div>
          </div>
        </div>

        {/* تنبيه مزاد الساحة */}
        <div className="mb-6 rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center gap-3">
            <BuildingOfficeIcon className="h-6 w-6 text-orange-400" />
            <div>
              <p className="font-medium text-orange-400">مزاد على أرض الواقع</p>
              <p className="text-sm text-orange-400/70">
                هذا المزاد سيظهر في صفحة الساحة المختارة على الموقع الرئيسي
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="space-y-6">
          {/* اختيار الساحة - إجباري */}
          <div className="rounded-xl border border-orange-500/30 bg-gradient-to-r from-orange-500/5 to-yellow-500/5 p-6">
            <div className="mb-4 flex items-center gap-2">
              <BuildingOfficeIcon className="h-5 w-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">اختيار الساحة</h2>
              <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                مطلوب
              </span>
            </div>
            <div className="space-y-4">
              <SelectField
                label="الساحة"
                options={yards.map((y) => ({
                  value: y.id,
                  label: `${y.name} - ${y.city}${y.area ? ` (${y.area})` : ''}`,
                }))}
                value={formData.yardId}
                onChange={(value) => handleInputChange('yardId', value)}
                placeholder={yardsLoading ? 'جاري التحميل...' : 'اختر الساحة'}
                error={errors.yardId}
                required
                searchable
                disabled={yardsLoading}
              />
              {selectedYard && (
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-orange-500/20 p-2">
                      <BuildingOfficeIcon className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{selectedYard.name}</p>
                      <p className="text-sm text-slate-400">
                        {selectedYard.city}
                        {selectedYard.area ? ` - ${selectedYard.area}` : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* المعلومات الأساسية */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex items-center gap-2">
              <CogIcon className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">المعلومات الأساسية</h2>
              <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                مطلوب
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="الماركة"
                options={carBrands.map((b) => ({ value: b.name, label: b.name }))}
                value={formData.brand}
                onChange={(value) => handleInputChange('brand', value)}
                placeholder="اختر الماركة"
                error={errors.brand}
                required
                searchable
              />

              <SelectField
                label="الموديل"
                options={availableModels.map((m) => ({ value: m, label: m }))}
                value={formData.model}
                onChange={(value) => handleInputChange('model', value)}
                placeholder="اختر الموديل"
                error={errors.model}
                disabled={!formData.brand}
                required
                searchable
              />

              <SelectField
                label="سنة الصنع"
                options={carYears.map((y) => ({ value: y.toString(), label: y.toString() }))}
                value={formData.year}
                onChange={(value) => handleInputChange('year', value)}
                placeholder="اختر السنة"
                error={errors.year}
                required
                searchable
              />

              <SelectField
                label="حالة السيارة"
                options={conditions.map((c) => ({ value: c, label: c }))}
                value={formData.condition}
                onChange={(value) => handleInputChange('condition', value)}
                placeholder="اختر الحالة"
                error={errors.condition}
                required
              />

              <SelectField
                label="اللون الخارجي"
                options={exteriorColors.map((c) => ({ value: c, label: c }))}
                value={formData.exteriorColor}
                onChange={(value) => handleInputChange('exteriorColor', value)}
                placeholder="اختر اللون"
                searchable
              />

              <SelectField
                label="نوع الوقود"
                options={fuelTypes.map((f) => ({ value: f, label: f }))}
                value={formData.fuelType}
                onChange={(value) => handleInputChange('fuelType', value)}
                placeholder="اختر نوع الوقود"
              />

              <SelectField
                label="ناقل الحركة"
                options={transmissionTypes.map((t) => ({ value: t, label: t }))}
                value={formData.transmission}
                onChange={(value) => handleInputChange('transmission', value)}
                placeholder="اختر ناقل الحركة"
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  المسافة المقطوعة (كم)
                </label>
                <input
                  type="text"
                  value={formData.mileage}
                  onChange={(e) => handleInputChange('mileage', e.target.value)}
                  placeholder="مثال: 50000"
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  السعر (دينار ليبي) <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.price}
                    onChange={(e) => handleInputChange('price', e.target.value)}
                    placeholder="مثال: 25000"
                    className={`w-full rounded-lg border bg-slate-700 px-4 py-3 pr-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                      errors.price
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                        : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/30'
                    }`}
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                    د.ل
                  </span>
                </div>
                {errors.price && <p className="text-sm text-red-400">{errors.price}</p>}
              </div>

              <SelectField
                label="المدينة"
                options={cityNames.map((c) => ({ value: c, label: c }))}
                value={formData.city}
                onChange={(value) => handleInputChange('city', value)}
                placeholder="اختر المدينة"
                error={errors.city}
                required
                searchable
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  المنطقة <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => handleInputChange('area', e.target.value)}
                  placeholder="أدخل المنطقة أو الحي"
                  className={`w-full rounded-lg border bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    errors.area
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/30'
                  }`}
                />
                {errors.area && <p className="text-sm text-red-400">{errors.area}</p>}
              </div>

              <div className="space-y-2">
                <UnifiedPhoneInput
                  label="رقم الهاتف"
                  required={shouldRequireContactPhone}
                  disabled={isSiteTeamSeller && !!siteTeamPhone}
                  value={formData.contactPhone}
                  onChange={(v: string) => handleInputChange('contactPhone', v)}
                  placeholder="أدخل رقم الهاتف"
                  error={errors.contactPhone}
                  theme="dark"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-300">
                  العنوان <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="مثال: تويوتا كامري 2020 - حالة ممتازة"
                  className={`w-full rounded-lg border bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 ${
                    errors.title
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                      : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/30'
                  }`}
                />
                {errors.title && <p className="text-sm text-red-400">{errors.title}</p>}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="block text-sm font-medium text-slate-300">الوصف (اختياري)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="اكتب وصفاً مفصلاً عن السيارة..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>
            </div>
          </div>

          {/* قسم تحديد موقع السيارة على الخريطة */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <LocationPickerSection
              value={{
                coordinates: formData.coordinates,
                detailedAddress: formData.detailedAddress,
              }}
              onChange={(location: LocationData) => {
                handleInputChange('coordinates', location.coordinates);
                handleInputChange('detailedAddress', location.detailedAddress || '');
              }}
              title="موقع السيارة على الخريطة"
              description="تحديد موقع السيارة الدقيق يساعد المشترين في العثور عليها بسهولة"
              isOptional={true}
            />
          </div>

          {/* قسم البائع (صاحب الإعلان) */}
          <div className="mt-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <SellerSelector
                value={selectedSeller}
                onChange={setSelectedSeller}
                error={errors.seller}
                required={true}
                label="البائع (صاحب الإعلان)"
              />
              <p className="mt-2 text-xs text-amber-400">
                يجب تحديد البائع الحقيقي حتى يتمكن الزوار من التواصل معه مباشرة
              </p>
            </div>
          </div>

          {/* إعدادات المزاد */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">إعدادات المزاد</h2>
            </div>

            <div className="space-y-6">
              {/* وقت بداية المزاد */}
              <div>
                <label className="mb-3 block text-sm font-medium text-slate-300">
                  وقت بداية المزاد <span className="text-red-400">*</span>
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'now', label: 'مزاد مباشر', desc: 'يبدأ المزاد فوراً' },
                    {
                      value: 'after_30_seconds',
                      label: 'بعد 30 ثانية',
                      desc: 'يبدأ المزاد بعد 30 ثانية',
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
                    { value: 'custom', label: 'مخصص', desc: 'حدد وقت بداية المزاد بنفسك' },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-all ${
                        formData.auctionStartTime === option.value
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-slate-600 hover:border-slate-500'
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
                      <div>
                        <div className="font-medium text-white">{option.label}</div>
                        <div className="text-sm text-slate-400">{option.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {formData.auctionStartTime === 'custom' && (
                  <div className="mt-3">
                    <input
                      type="datetime-local"
                      value={formData.auctionCustomStartTime}
                      onChange={(e) => handleInputChange('auctionCustomStartTime', e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className={`w-full rounded-lg border bg-slate-700 px-4 py-3 text-white focus:outline-none focus:ring-2 ${
                        errors.auctionCustomStartTime
                          ? 'border-red-500 focus:ring-red-500/30'
                          : 'border-slate-600 focus:ring-blue-500/30'
                      }`}
                    />
                    {errors.auctionCustomStartTime && (
                      <p className="mt-1 text-sm text-red-400">{errors.auctionCustomStartTime}</p>
                    )}
                  </div>
                )}
              </div>

              {/* مدة المزاد - النظام المرن الجديد */}
              <div className="rounded-lg border border-slate-600 bg-slate-700/30 p-4">
                <AuctionDurationSelector
                  value={formData.auctionDuration}
                  onChange={(value) => handleInputChange('auctionDuration', value)}
                  theme="dark"
                  label="مدة المزاد"
                  required
                  minMinutes={60}
                  maxMinutes={43200}
                />
              </div>
            </div>
          </div>

          {/* قسم الترويج والباقات */}
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20">
                <SparklesIcon className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">الترويج والباقات المميزة</h2>
                <p className="text-sm text-slate-400">اختر باقة ترويج لزيادة ظهور المزاد</p>
              </div>
            </div>

            {/* شبكة الباقات */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* بدون ترويج */}
              <button
                type="button"
                onClick={() => {
                  handleInputChange('promotionPackage', 'NONE');
                  handleInputChange('featured', false);
                  handleInputChange('promotionDays', 0);
                }}
                className={`relative flex flex-col rounded-xl border-2 p-4 text-right transition-all ${
                  formData.promotionPackage === 'NONE'
                    ? 'border-slate-500 bg-slate-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-slate-600'
                }`}
              >
                {formData.promotionPackage === 'NONE' && (
                  <div className="absolute left-2 top-2 rounded-full bg-emerald-500 p-1">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
                <div className="mb-2 w-fit rounded-lg bg-slate-600 p-2">
                  <span className="text-lg text-slate-400">-</span>
                </div>
                <h4 className="text-base font-bold text-slate-400">بدون ترويج</h4>
                <p className="mt-1 text-xs text-slate-500">مجاني</p>
              </button>

              {/* الباقة الأساسية */}
              <button
                type="button"
                onClick={() => {
                  handleInputChange('promotionPackage', 'BASIC');
                  handleInputChange('featured', true);
                  handleInputChange('promotionDays', 7);
                }}
                className={`relative flex flex-col rounded-xl border-2 p-4 text-right transition-all ${
                  formData.promotionPackage === 'BASIC'
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-blue-500/50'
                }`}
              >
                {formData.promotionPackage === 'BASIC' && (
                  <div className="absolute left-2 top-2 rounded-full bg-emerald-500 p-1">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
                <div className="mb-2 w-fit rounded-lg bg-blue-500/20 p-2">
                  <StarIcon className="h-5 w-5 text-blue-400" />
                </div>
                <h4 className="text-base font-bold text-blue-400">الباقة الأساسية</h4>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-amber-400">حتى انتهاء المزاد</span>
                  <span className="text-lg font-bold text-blue-400">30 د.ل</span>
                </div>
                <ul className="mt-2 space-y-1 border-t border-slate-700 pt-2">
                  <li className="flex items-center gap-1 text-xs text-slate-300">
                    <svg className="h-3 w-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    شارة مميز
                  </li>
                  <li className="flex items-center gap-1 text-xs text-slate-300">
                    <svg className="h-3 w-3 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    أولوية في البحث
                  </li>
                </ul>
              </button>

              {/* الباقة المتقدمة */}
              <button
                type="button"
                onClick={() => {
                  handleInputChange('promotionPackage', 'PREMIUM');
                  handleInputChange('featured', true);
                  handleInputChange('promotionDays', 14);
                }}
                className={`relative flex flex-col rounded-xl border-2 p-4 text-right transition-all ${
                  formData.promotionPackage === 'PREMIUM'
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-slate-700 bg-slate-800 hover:border-purple-500/50'
                }`}
              >
                {formData.promotionPackage === 'PREMIUM' && (
                  <div className="absolute left-2 top-2 rounded-full bg-emerald-500 p-1">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
                <div className="mb-2 w-fit rounded-lg bg-purple-500/20 p-2">
                  <SparklesIcon className="h-5 w-5 text-purple-400" />
                </div>
                <h4 className="text-base font-bold text-purple-400">الباقة المتقدمة</h4>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-amber-400">حتى انتهاء المزاد</span>
                  <span className="text-lg font-bold text-purple-400">60 د.ل</span>
                </div>
                <ul className="mt-2 space-y-1 border-t border-slate-700 pt-2">
                  <li className="flex items-center gap-1 text-xs text-slate-300">
                    <svg
                      className="h-3 w-3 text-purple-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    الصفحة الرئيسية
                  </li>
                  <li className="flex items-center gap-1 text-xs text-slate-300">
                    <svg
                      className="h-3 w-3 text-purple-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    إشعارات للمتابعين
                  </li>
                </ul>
              </button>

              {/* باقة VIP */}
              <button
                type="button"
                onClick={() => {
                  handleInputChange('promotionPackage', 'VIP');
                  handleInputChange('featured', true);
                  handleInputChange('promotionDays', 30);
                }}
                className={`relative flex flex-col rounded-xl border-2 p-4 text-right transition-all ${
                  formData.promotionPackage === 'VIP'
                    ? 'border-amber-500 bg-gradient-to-br from-amber-500/10 to-yellow-500/5'
                    : 'border-slate-700 bg-slate-800 hover:border-amber-500/50'
                }`}
              >
                <div className="absolute -top-2 right-4">
                  <span className="rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 px-2 py-0.5 text-xs font-bold text-black">
                    الأفضل
                  </span>
                </div>
                {formData.promotionPackage === 'VIP' && (
                  <div className="absolute left-2 top-2 rounded-full bg-emerald-500 p-1">
                    <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                )}
                <div className="mb-2 w-fit rounded-lg bg-gradient-to-r from-amber-500/20 to-yellow-500/20 p-2">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
                <h4 className="text-base font-bold text-amber-400">باقة VIP</h4>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-amber-400">حتى انتهاء المزاد</span>
                  <span className="text-lg font-bold text-amber-400">100 د.ل</span>
                </div>
                <ul className="mt-2 space-y-1 border-t border-slate-700 pt-2">
                  <li className="flex items-center gap-1 text-xs text-slate-300">
                    <svg className="h-3 w-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    شارة VIP ذهبية
                  </li>
                  <li className="flex items-center gap-1 text-xs text-slate-300">
                    <svg className="h-3 w-3 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    أعلى أولوية
                  </li>
                </ul>
              </button>
            </div>

            {/* ملخص الباقة المختارة */}
            {formData.promotionPackage !== 'NONE' && (
              <div className="mt-6 flex items-center justify-between rounded-lg bg-gradient-to-r from-amber-500/10 to-yellow-500/5 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-amber-500/20 p-2">
                    <svg
                      className="h-5 w-5 text-amber-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">الباقة المختارة</p>
                    <p className="font-bold text-white">
                      {formData.promotionPackage === 'BASIC' && 'الباقة الأساسية'}
                      {formData.promotionPackage === 'PREMIUM' && 'الباقة المتقدمة'}
                      {formData.promotionPackage === 'VIP' && 'باقة VIP'}
                    </p>
                  </div>
                </div>
                <div className="text-left">
                  <p className="text-sm text-slate-400">المدة</p>
                  <p className="text-lg font-bold text-amber-400">حتى انتهاء المزاد</p>
                </div>
              </div>
            )}

            {/* تنبيه للمزادات */}
            {formData.promotionPackage !== 'NONE' && (
              <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                <p className="text-sm text-amber-300">
                  <strong>ملاحظة:</strong> ترويج المزاد ينتهي تلقائياً عند انتهاء المزاد
                </p>
              </div>
            )}
          </div>

          {/* تقرير الفحص */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <div className="mb-4 flex items-center gap-2">
              <DocumentTextIcon className="h-5 w-5 text-blue-400" />
              <h2 className="text-lg font-semibold text-white">تقرير الفحص</h2>
              <span className="rounded-full bg-slate-600 px-2 py-1 text-xs text-slate-300">
                اختياري
              </span>
            </div>

            {!showInspectionReport ? (
              <button
                type="button"
                onClick={() => setShowInspectionReport(true)}
                className="flex w-full items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-600 bg-slate-700/50 p-6 text-slate-300 transition-all hover:border-blue-500 hover:bg-slate-700"
              >
                <PlusIcon className="h-6 w-6" />
                <span>إضافة تقرير فحص</span>
              </button>
            ) : (
              <div className="space-y-4">
                {/* تبويبات */}
                <div className="flex rounded-lg border border-slate-600 bg-slate-700 p-1">
                  <button
                    type="button"
                    onClick={() => setInspectionReportType('manual')}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                      inspectionReportType === 'manual'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    إدخال يدوي
                  </button>
                  <button
                    type="button"
                    onClick={() => setInspectionReportType('file')}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all ${
                      inspectionReportType === 'file'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    رفع ملف
                  </button>
                </div>

                {inspectionReportType === 'manual' && (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                      { key: 'engineCondition', label: 'حالة المحرك' },
                      { key: 'bodyCondition', label: 'حالة الهيكل' },
                      { key: 'interiorCondition', label: 'حالة الداخلية' },
                      { key: 'tiresCondition', label: 'حالة الإطارات' },
                    ].map((field) => (
                      <div key={field.key} className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">
                          {field.label}
                        </label>
                        <select
                          value={
                            (formData.inspectionReport?.manualReport as Record<string, string>)?.[
                              field.key
                            ] || ''
                          }
                          onChange={(e) => {
                            setFormData((prev) => ({
                              ...prev,
                              inspectionReport: {
                                ...prev.inspectionReport,
                                hasReport: true,
                                manualReport: {
                                  ...prev.inspectionReport?.manualReport,
                                  [field.key]: e.target.value,
                                } as FormData['inspectionReport']['manualReport'],
                              },
                            }));
                          }}
                          className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                        >
                          <option value="">اختر الحالة</option>
                          <option value="ممتاز">ممتاز</option>
                          <option value="جيد جداً">جيد جداً</option>
                          <option value="جيد">جيد</option>
                          <option value="مقبول">مقبول</option>
                          <option value="يحتاج صيانة">يحتاج صيانة</option>
                        </select>
                      </div>
                    ))}

                    <div className="col-span-full space-y-2">
                      <label className="block text-sm font-medium text-slate-300">
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
                              } as FormData['inspectionReport']['manualReport'],
                            },
                          }));
                        }}
                        placeholder="ملاحظات حول حالة السيارة..."
                        rows={2}
                        className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {inspectionReportType === 'file' && (
                  <div className="rounded-lg border-2 border-dashed border-slate-600 bg-slate-700/50 p-6 text-center">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      id="inspection-file"
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
                    <label htmlFor="inspection-file" className="cursor-pointer">
                      <div className="text-slate-400">
                        {formData.inspectionReport?.reportFile ? (
                          <span className="text-green-400">
                            تم اختيار: {formData.inspectionReport.reportFile.name}
                          </span>
                        ) : (
                          <>انقر لاختيار ملف (PDF, JPG, PNG)</>
                        )}
                      </div>
                    </label>
                  </div>
                )}

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
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  إلغاء تقرير الفحص
                </button>
              </div>
            )}
          </div>

          {/* التفاصيل الإضافية */}
          <div className="rounded-xl border border-slate-700 bg-slate-800">
            <button
              type="button"
              onClick={() => setIsAdditionalDetailsOpen(!isAdditionalDetailsOpen)}
              className="flex w-full items-center justify-between p-6"
            >
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">تفاصيل إضافية</h2>
                <span className="rounded-full bg-slate-600 px-2 py-1 text-xs text-slate-300">
                  اختياري
                </span>
              </div>
              {isAdditionalDetailsOpen ? (
                <ChevronUpIcon className="h-5 w-5 text-slate-400" />
              ) : (
                <ChevronDownIcon className="h-5 w-5 text-slate-400" />
              )}
            </button>

            {isAdditionalDetailsOpen && (
              <div className="border-t border-slate-700 p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <SelectField
                    label="نوع الهيكل"
                    options={bodyTypes.map((t) => ({ value: t, label: t }))}
                    value={formData.bodyType}
                    onChange={(value) => handleInputChange('bodyType', value)}
                    placeholder="اختر نوع الهيكل"
                    searchable
                  />

                  <SelectField
                    label="المواصفات الإقليمية"
                    options={regionalSpecs.map((s) => ({ value: s, label: s }))}
                    value={formData.regionalSpec}
                    onChange={(value) => handleInputChange('regionalSpec', value)}
                    placeholder="اختر المواصفات"
                    searchable
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      سعة المحرك (لتر)
                    </label>
                    <input
                      type="text"
                      value={formData.engineSize}
                      onChange={(e) => handleInputChange('engineSize', e.target.value)}
                      placeholder="مثال: 2.0"
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  <SelectField
                    label="لون الداخلية"
                    options={interiorColors.map((c) => ({ value: c, label: c }))}
                    value={formData.interiorColor}
                    onChange={(value) => handleInputChange('interiorColor', value)}
                    placeholder="اختر اللون"
                    searchable
                  />

                  <SelectField
                    label="عدد المقاعد"
                    options={['2', '4', '5', '7', '8', '9+'].map((c) => ({ value: c, label: c }))}
                    value={formData.seatCount}
                    onChange={(value) => handleInputChange('seatCount', value)}
                    placeholder="اختر العدد"
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">
                      رقم الشاسيه (VIN)
                    </label>
                    <input
                      type="text"
                      value={formData.chassisNumber}
                      onChange={(e) => handleInputChange('chassisNumber', e.target.value)}
                      placeholder="مثال: 1HGBH41JXMN109186"
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-300">رقم المحرك</label>
                    <input
                      type="text"
                      value={formData.engineNumber}
                      onChange={(e) => handleInputChange('engineNumber', e.target.value)}
                      placeholder="مثال: G4KD123456"
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>

                {/* الكماليات */}
                <div className="mt-6">
                  <h3 className="mb-4 text-sm font-medium text-slate-300">الكماليات والمميزات</h3>
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    {[
                      'مكيف هواء',
                      'نظام صوتي متطور',
                      'مقاعد جلدية',
                      'نوافذ كهربائية',
                      'قفل مركزي',
                      'مرايا كهربائية',
                      'فتحة سقف',
                      'كاميرا خلفية',
                      'نظام ملاحة GPS',
                      'شاشة لمس',
                      'وسائد هوائية',
                      'نظام ABS',
                      'حساسات ركن',
                      'نظام إنذار',
                      'تدفئة مقاعد',
                      'نظام ESP',
                    ].map((feature) => (
                      <label
                        key={feature}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-all ${
                          formData.features.includes(feature)
                            ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                            : 'border-slate-600 text-slate-400 hover:border-slate-500'
                        }`}
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
                          className="h-4 w-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm">{feature}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* شريط الأزرار الثابت */}
      <StickyActionBar
        leftButton={{
          label: 'السابق',
          onClick: handleBack,
          icon: 'prev',
          variant: 'secondary',
        }}
        rightButton={{
          label: 'متابعة',
          onClick: handleContinue,
          icon: 'next',
          variant: 'primary',
        }}
      />
    </AdminLayout>
  );
}
