/**
 * صفحة إنشاء إعلان جديد في السوق الفوري - لوحة التحكم
 * يستخدم البيانات المشتركة من packages/utils
 */
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import ChevronUpIcon from '@heroicons/react/24/outline/ChevronUpIcon';
import CogIcon from '@heroicons/react/24/outline/CogIcon';
import CursorArrowRaysIcon from '@heroicons/react/24/outline/CursorArrowRaysIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import SwatchIcon from '@heroicons/react/24/outline/SwatchIcon';
import WrenchScrewdriverIcon from '@heroicons/react/24/outline/WrenchScrewdriverIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import StarIcon from '@heroicons/react/24/solid/StarIcon';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import LocationPickerModal from '../../../components/ui/LocationPickerModal';
import SellerSelector, { SellerInfo } from '../../../components/ui/SellerSelector';
import StickyActionBar from '../../../components/ui/StickyActionBar';
import UnifiedPhoneInput from '../../../components/ui/UnifiedPhoneInput';

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
  seatCounts,
  transmissionTypes,
} from '@sooq-mazad/utils';

// المدن الليبية كأسماء فقط للقائمة المنسدلة
const cityNames = getCityNames();

// أنواع الترويج
type PackageLevel = 'NONE' | 'BASIC' | 'PREMIUM' | 'VIP';

interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
}

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
  exteriorColor: string;
  interiorColor: string;
  engineSize: string;
  regionalSpec: string;
  seatCount: string;
  chassisNumber: string;
  engineNumber: string;
  features: string[];
  city: string;
  area: string;
  contactPhone: string;
  title: string;
  description: string;
  featured: boolean; // إعلان مميز
  // نظام الترويج الجديد
  promotionPackage: PackageLevel;
  promotionDays: number;
  // بيانات الموقع
  location?: LocationData;
  // معلومات البائع
  seller?: SellerInfo | null;
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

export default function CreateListingPage() {
  const router = useRouter();
  const { type } = router.query;

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
    exteriorColor: '',
    interiorColor: '',
    engineSize: '',
    regionalSpec: '',
    seatCount: '',
    chassisNumber: '',
    engineNumber: '',
    features: [],
    city: '',
    area: '',
    contactPhone: '',
    title: '',
    description: '',
    featured: false,
    promotionPackage: 'NONE',
    promotionDays: 0,
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isAdditionalDetailsOpen, setIsAdditionalDetailsOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerInfo | null>(null);
  const [siteTeamPhone, setSiteTeamPhone] = useState<string>('');

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

    if (!formData.brand) newErrors.brand = 'يرجى اختيار الماركة';
    if (!formData.model) newErrors.model = 'يرجى اختيار الموديل';
    if (!formData.year) newErrors.year = 'يرجى اختيار سنة الصنع';
    if (!formData.condition) newErrors.condition = 'يرجى اختيار حالة السيارة';
    if (!formData.city) newErrors.city = 'يرجى اختيار المدينة';
    if (!formData.area || !formData.area.trim()) newErrors.area = 'يرجى إدخال المنطقة أو الحي';
    if (!formData.title) newErrors.title = 'يرجى إدخال عنوان الإعلان';

    if (!formData.price || !formData.price.trim()) {
      newErrors.price = 'السعر مطلوب';
    } else {
      const numericPrice = parseFloat(formData.price.replace(/[^\d.-]/g, ''));
      if (isNaN(numericPrice) || numericPrice < 100) {
        newErrors.price = 'يرجى إدخال سعر صحيح (الحد الأدنى 100 د.ل)';
      }
    }

    if (shouldRequireContactPhone) {
      if (!formData.contactPhone || !formData.contactPhone.trim()) {
        newErrors.contactPhone = 'رقم الهاتف مطلوب';
      } else if (!/^[0-9]{9,10}$/.test(formData.contactPhone.replace(/\s/g, ''))) {
        newErrors.contactPhone = 'يرجى إدخال رقم هاتف صحيح';
      }
    }

    // التحقق من بيانات البائع
    if (!selectedSeller || (!selectedSeller.isSiteTeam && !selectedSeller.phone)) {
      newErrors.seller = 'يرجى تحديد البائع';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleContinue = async () => {
    if (validateForm()) {
      const updatedFormData = {
        ...formData,
        listingType: 'instant',
        seller: selectedSeller, // إضافة بيانات البائع
      };
      localStorage.setItem('carListingData', JSON.stringify(updatedFormData));
      router.push('/admin/marketplace/upload-images');
    }
  };

  // مكون SelectField محسن مع بحث - للاستخدام في لوحة التحكم
  interface SelectFieldProps {
    label: string;
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    searchable?: boolean;
    clearable?: boolean;
  }

  const SelectField = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'اختر من القائمة',
    error,
    required,
    disabled,
    searchable = true,
    clearable = true,
  }: SelectFieldProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isPositioned, setIsPositioned] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const filteredOptions = useMemo(() => {
      if (searchable && searchTerm) {
        return options.filter((opt) => opt.label.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return options;
    }, [options, searchTerm, searchable]);

    const displayValue = options.find((opt) => opt.value === value)?.label || '';

    // إغلاق القائمة عند النقر خارجها
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setIsPositioned(false);
          setSearchTerm('');
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    // التركيز على حقل البحث عند فتح القائمة
    useEffect(() => {
      if (isOpen && searchable && searchInputRef.current) {
        setTimeout(() => searchInputRef.current?.focus(), 10);
      }
    }, [isOpen, searchable]);

    const handleToggleOpen = () => {
      if (!disabled) {
        if (!isOpen) {
          setIsOpen(true);
          setIsPositioned(true);
        } else {
          setIsOpen(false);
          setIsPositioned(false);
          setSearchTerm('');
        }
      }
    };

    const handleSelect = (selectedValue: string) => {
      onChange(selectedValue);
      setIsOpen(false);
      setIsPositioned(false);
      setSearchTerm('');
    };

    const handleClear = (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange('');
      setSearchTerm('');
    };

    return (
      <div className="space-y-2" ref={dropdownRef}>
        <label className="block text-sm font-medium text-slate-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        <div className="relative">
          {/* الزر الرئيسي */}
          <div
            role="button"
            tabIndex={disabled ? -1 : 0}
            onClick={!disabled ? handleToggleOpen : undefined}
            onKeyDown={(e) =>
              !disabled && (e.key === 'Enter' || e.key === ' ') && handleToggleOpen()
            }
            className={`flex w-full items-center justify-between rounded-lg border bg-slate-700 px-4 py-3 text-right transition-colors focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
                : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/30'
            } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
          >
            <span className={displayValue ? 'text-white' : 'text-slate-400'}>
              {displayValue || placeholder}
            </span>
            <div className="flex items-center gap-2">
              {value && !disabled && clearable && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded p-1 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white"
                >
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
              <ChevronDownIcon
                className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </div>
          </div>

          {/* القائمة المنسدلة */}
          {isOpen && (
            <div
              className={`absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-slate-600 bg-slate-800 shadow-2xl transition-all duration-150 ${
                isPositioned ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
              }`}
              style={{ maxHeight: '320px' }}
            >
              {/* حقل البحث */}
              {searchable && (
                <div className="sticky top-0 z-10 border-b border-slate-600 bg-slate-800 p-3">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="ابحث..."
                      className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2.5 pl-3 pr-10 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                  </div>
                </div>
              )}

              {/* قائمة الخيارات */}
              <div className="max-h-60 overflow-y-auto p-2">
                {filteredOptions.length > 0 ? (
                  <div className="flex flex-col gap-0.5">
                    {filteredOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full rounded-lg px-4 py-2.5 text-right text-sm transition-all duration-150 ${
                          value === opt.value
                            ? 'bg-blue-600 font-medium text-white'
                            : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-slate-400">لا توجد نتائج</div>
                )}
              </div>
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    );
  };

  return (
    <AdminLayout title="إنشاء إعلان جديد">
      <Head>
        <title>إنشاء إعلان جديد - السوق الفوري</title>
      </Head>

      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-4">
            <Link
              href="/admin/marketplace"
              className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
            >
              <ArrowRightIcon className="h-5 w-5 rotate-180" />
              <span>العودة للقائمة</span>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-white">إنشاء إعلان جديد في السوق الفوري</h1>
          <p className="mt-1 text-slate-400">أدخل تفاصيل السيارة بدقة للحصول على أفضل النتائج</p>
        </div>

        {/* Form Card */}
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <div className="space-y-6">
            {/* المعلومات الأساسية */}
            <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CogIcon className="h-5 w-5 text-slate-400" />
                <h5 className="text-base font-semibold text-white">المعلومات الأساسية</h5>
                <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-400">
                  مطلوب
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* الماركة */}
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

                {/* الموديل */}
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

                {/* سنة الصنع */}
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

                {/* حالة السيارة */}
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

                {/* اللون الخارجي */}
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

                {/* نوع الوقود */}
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

                {/* ناقل الحركة */}
                <SelectField
                  label="ناقل الحركة"
                  options={transmissionTypes.map((t) => ({ value: t, label: t }))}
                  value={formData.transmission}
                  onChange={(value) => handleInputChange('transmission', value)}
                  placeholder="اختر ناقل الحركة"
                  searchable
                  clearable
                />

                {/* المسافة المقطوعة */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    المسافة المقطوعة (كم)
                  </label>
                  <input
                    type="text"
                    value={formData.mileage}
                    onChange={(e) => handleInputChange('mileage', e.target.value)}
                    placeholder="مثال: 50000"
                    className="w-full rounded-lg border border-slate-500 bg-slate-600 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* السعر */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    السعر (دينار ليبي) <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={formData.price}
                      onChange={(e) => handleInputChange('price', e.target.value)}
                      placeholder="مثال: 25000"
                      className={`w-full rounded-lg border bg-slate-600 px-3 py-2 pl-12 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.price ? 'border-red-500' : 'border-slate-500'
                      }`}
                    />
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                      <span className="text-sm text-slate-400">د.ل</span>
                    </div>
                  </div>
                  {errors.price && <p className="mt-1 text-sm text-red-400">{errors.price}</p>}
                </div>

                {/* المدينة */}
                <SelectField
                  label="المدينة"
                  options={cityNames.map((city) => ({
                    value: city,
                    label: city,
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

              {/* المنطقة */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  المنطقة أو الحي <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.area}
                  onChange={(e) => handleInputChange('area', e.target.value)}
                  placeholder="أدخل المنطقة أو الحي (مثال: وسط البلد، الأندلس)"
                  className={`w-full rounded-lg border bg-slate-600 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.area ? 'border-red-500' : 'border-slate-500'
                  }`}
                />
                {errors.area && <p className="mt-1 text-sm text-red-400">{errors.area}</p>}
              </div>

              {/* موقع السيارة على الخريطة */}
              <div className="mt-4 md:col-span-2">
                <div className="rounded-lg border border-slate-600 bg-slate-700/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-5 w-5 text-slate-400" />
                      <h5 className="text-sm font-semibold text-white">موقع السيارة على الخريطة</h5>
                      <span className="rounded-full bg-slate-600 px-2 py-0.5 text-xs text-slate-300">
                        اختياري
                      </span>
                    </div>
                  </div>
                  <p className="mb-3 text-xs text-slate-400">
                    تحديد موقع السيارة الدقيق يساعد المشترين في العثور عليها بسهولة
                  </p>

                  {/* عرض الموقع المحدد أو زر التحديد */}
                  {formData.location ? (
                    <div className="rounded-xl border border-slate-600 bg-slate-800 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="rounded-full bg-green-500/20 p-1.5">
                              <MapPinIcon className="h-4 w-4 text-green-400" />
                            </div>
                            <span className="text-sm font-medium text-green-400">
                              تم تحديد الموقع
                            </span>
                          </div>
                          {formData.location.address && (
                            <p className="mt-2 text-sm text-slate-300">
                              {formData.location.address}
                            </p>
                          )}
                          <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                            <span>خط العرض: {formData.location.latitude.toFixed(6)}</span>
                            <span>خط الطول: {formData.location.longitude.toFixed(6)}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setIsLocationModalOpen(true)}
                            className="rounded-lg bg-blue-500/20 px-3 py-2 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/30"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('location', undefined)}
                            className="rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/30"
                          >
                            حذف
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-600 bg-slate-800 p-3 shadow-sm">
                      <button
                        type="button"
                        onClick={() => setIsLocationModalOpen(true)}
                        className="flex w-full items-center justify-center gap-3 rounded-xl border-2 border-dashed border-blue-500/50 bg-blue-500/10 px-4 py-4 text-blue-400 transition-all duration-300 hover:border-blue-400 hover:bg-blue-500/20 hover:shadow-md active:scale-[0.98]"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-full bg-blue-500/20 p-2.5">
                            <CursorArrowRaysIcon className="h-5 w-5 text-blue-400" />
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">تحديد موقع السيارة</div>
                            <div className="text-xs opacity-80">
                              افتح الخريطة لتحديد الموقع بدقة
                            </div>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* رقم الهاتف */}
              <div className="mt-4">
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
                <p className="mt-1 text-xs text-slate-400">سيتم عرض هذا الرقم للمهتمين بالسيارة</p>
              </div>

              {/* قسم معلومات البائع - مهم جداً */}
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

              {/* عنوان الإعلان */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  عنوان الإعلان <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="مثال: تويوتا كامري 2020 - حالة ممتازة"
                  className={`w-full rounded-lg border bg-slate-600 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-slate-500'
                  }`}
                />
                {errors.title && <p className="mt-1 text-sm text-red-400">{errors.title}</p>}
              </div>

              {/* الوصف */}
              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  الوصف <span className="text-xs text-slate-400">(اختياري)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="اكتب وصفاً مفصلاً عن السيارة، حالتها، والمميزات الإضافية..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-slate-500 bg-slate-600 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-slate-400">
                  وصف جيد يزيد من فرص البيع ويجذب المشترين المهتمين
                </p>
              </div>
            </div>

            {/* نظام الترويج الموحد - السوق الفوري (بالأيام) */}
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StarIcon className="h-5 w-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-white">باقات الترويج</h3>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  بالأيام
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
                    <span className="text-xs text-slate-400">7 أيام</span>
                    <span className="text-lg font-bold text-blue-400">50 د.ل</span>
                  </div>
                  <ul className="mt-2 space-y-1 border-t border-slate-700 pt-2">
                    <li className="flex items-center gap-1 text-xs text-slate-300">
                      <svg
                        className="h-3 w-3 text-blue-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      شارة مميز
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
                    <svg
                      className="h-5 w-5 text-purple-400"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                  </div>
                  <h4 className="text-base font-bold text-purple-400">الباقة المتقدمة</h4>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-xs text-slate-400">14 يوم</span>
                    <span className="text-lg font-bold text-purple-400">100 د.ل</span>
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
                    <span className="text-xs text-slate-400">30 يوم</span>
                    <span className="text-lg font-bold text-amber-400">200 د.ل</span>
                  </div>
                  <ul className="mt-2 space-y-1 border-t border-slate-700 pt-2">
                    <li className="flex items-center gap-1 text-xs text-slate-300">
                      <svg
                        className="h-3 w-3 text-amber-400"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      VIP ذهبية + أعلى أولوية
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
                    <p className="text-lg font-bold text-amber-400">{formData.promotionDays} يوم</p>
                  </div>
                </div>
              )}
            </div>

            {/* المزيد من التفاصيل (قابلة للطي) */}
            <div className="rounded-xl border border-slate-600 bg-slate-700/50">
              <button
                type="button"
                onClick={() => setIsAdditionalDetailsOpen(!isAdditionalDetailsOpen)}
                className="flex w-full items-center justify-between rounded-xl bg-gradient-to-r from-purple-900/30 to-indigo-900/30 p-6 transition-all hover:from-purple-900/40 hover:to-indigo-900/40"
              >
                <div className="text-right">
                  <h3 className="text-lg font-semibold text-white">إضافة المزيد من التفاصيل</h3>
                  <p className="mt-1 text-sm text-slate-400">
                    المواصفات التقنية - الألوان والمقاعد - الكماليات - معلومات إضافية
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData.bodyType && (
                      <span className="inline-flex items-center rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-300">
                        {formData.bodyType}
                      </span>
                    )}
                    {formData.interiorColor && (
                      <span className="inline-flex items-center rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-300">
                        داخلية: {formData.interiorColor}
                      </span>
                    )}
                    {formData.features.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-purple-500/20 px-2.5 py-0.5 text-xs font-medium text-purple-300">
                        {formData.features.length} كماليات
                      </span>
                    )}
                    {formData.regionalSpec && (
                      <span className="inline-flex items-center rounded-full bg-orange-500/20 px-2.5 py-0.5 text-xs font-medium text-orange-300">
                        {formData.regionalSpec}
                      </span>
                    )}
                    {(formData.chassisNumber || formData.engineNumber) && (
                      <span className="inline-flex items-center rounded-full bg-slate-500/20 px-2.5 py-0.5 text-xs font-medium text-slate-300">
                        معلومات تقنية
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isAdditionalDetailsOpen ? (
                    <ChevronUpIcon className="h-8 w-8 font-bold text-purple-400" />
                  ) : (
                    <ChevronDownIcon className="h-8 w-8 font-bold text-purple-400" />
                  )}
                </div>
              </button>

              {isAdditionalDetailsOpen && (
                <div className="border-t border-slate-600 p-6">
                  <div className="space-y-8">
                    {/* المواصفات التقنية */}
                    <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CogIcon className="h-5 w-5 text-slate-400" />
                          <h5 className="text-base font-semibold text-white">المواصفات التقنية</h5>
                          <span className="rounded-full bg-slate-600 px-2 py-1 text-xs text-slate-300">
                            اختياري
                          </span>
                        </div>
                      </div>

                      <p className="mb-4 text-sm text-slate-400">
                        هذه المعلومات اختيارية ولكنها تساعد في جذب المشترين
                      </p>

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
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            سعة المحرك (لتر)
                          </label>
                          <input
                            type="text"
                            value={formData.engineSize}
                            onChange={(e) => handleInputChange('engineSize', e.target.value)}
                            placeholder="مثال: 2.0"
                            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* الألوان والمقاعد */}
                    <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SwatchIcon className="h-5 w-5 text-slate-400" />
                          <h5 className="text-base font-semibold text-white">الألوان والمقاعد</h5>
                          <span className="rounded-full bg-slate-600 px-2 py-1 text-xs text-slate-300">
                            اختياري
                          </span>
                        </div>
                      </div>

                      <p className="mb-4 text-sm text-slate-400">
                        تحديد الألوان وعدد المقاعد يساعد في وصف السيارة بشكل أفضل
                      </p>

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
                          options={seatCounts.map((count) => ({
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

                    {/* المعلومات الإضافية */}
                    <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <SparklesIcon className="h-5 w-5 text-slate-400" />
                          <h5 className="text-base font-semibold text-white">المعلومات الإضافية</h5>
                          <span className="rounded-full bg-slate-600 px-2 py-1 text-xs text-slate-300">
                            اختياري
                          </span>
                        </div>
                      </div>

                      <p className="mb-4 text-sm text-slate-400">
                        هذه المعلومات اختيارية ولكنها تزيد من مصداقية الإعلان
                      </p>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            رقم الشاسيه (VIN)
                          </label>
                          <input
                            type="text"
                            value={formData.chassisNumber}
                            onChange={(e) => handleInputChange('chassisNumber', e.target.value)}
                            placeholder="مثال: 1HGBH41JXMN109186"
                            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            رقم الشاسيه يزيد من مصداقية الإعلان
                          </p>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-medium text-slate-300">
                            رقم المحرك
                          </label>
                          <input
                            type="text"
                            value={formData.engineNumber}
                            onChange={(e) => handleInputChange('engineNumber', e.target.value)}
                            placeholder="مثال: G4KD123456"
                            className="w-full rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            رقم المحرك للتحقق من صحة البيانات
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* الكماليات والمميزات */}
                    <div className="rounded-lg border border-slate-600 bg-slate-800/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <WrenchScrewdriverIcon className="h-5 w-5 text-slate-400" />
                          <h5 className="text-base font-semibold text-white">
                            اختيار الكماليات والمميزات
                          </h5>
                          <span className="rounded-full bg-slate-600 px-2 py-1 text-xs text-slate-300">
                            اختياري
                          </span>
                        </div>
                      </div>

                      <p className="mb-4 text-sm text-slate-400">
                        اختر الكماليات والمميزات المتوفرة في السيارة
                      </p>

                      {/* الكماليات العامة */}
                      <div className="rounded-lg border border-slate-600 bg-blue-900/20 p-4">
                        <h6 className="mb-3 text-sm font-medium text-blue-300">الكماليات العامة</h6>
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
                              className="flex cursor-pointer items-center space-x-2 space-x-reverse rounded-md border border-blue-500/30 bg-blue-900/30 p-2 transition-all duration-200 hover:bg-blue-900/50"
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
                                className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-blue-600 focus:ring-2 focus:ring-blue-500"
                              />
                              <span className="select-none text-sm text-slate-300">{feature}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* أنظمة الأمان */}
                      <div className="mt-4 rounded-lg border border-slate-600 bg-red-900/20 p-4">
                        <h6 className="mb-3 text-sm font-medium text-red-300">أنظمة الأمان</h6>
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
                              className="flex cursor-pointer items-center space-x-2 space-x-reverse rounded-md border border-red-500/30 bg-red-900/30 p-2 transition-all duration-200 hover:bg-red-900/50"
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
                                className="h-4 w-4 rounded border-slate-500 bg-slate-700 text-red-600 focus:ring-2 focus:ring-red-500"
                              />
                              <span className="select-none text-sm text-slate-300">{feature}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* شريط الأزرار الثابت */}
      <StickyActionBar
        leftButton={{
          label: 'إلغاء',
          onClick: () => router.push('/admin/marketplace'),
          icon: 'prev',
          variant: 'secondary',
        }}
        rightButton={{
          label: 'التالي: رفع الصور',
          onClick: handleContinue,
          icon: 'next',
          variant: 'success',
        }}
      />
      {/* مودال تحديد الموقع */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onConfirm={(location) => {
          handleInputChange('location', location);
        }}
        initialLocation={formData.location}
        title="تحديد موقع السيارة"
      />
    </AdminLayout>
  );
}
