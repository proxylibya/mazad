import AdjustmentsHorizontalIcon from '@heroicons/react/24/outline/AdjustmentsHorizontalIcon';
import CheckCircleIcon from '@heroicons/react/24/outline/CheckCircleIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import StarIcon from '@heroicons/react/24/outline/StarIcon';
import TruckIcon from '@heroicons/react/24/outline/TruckIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import React from 'react';
import UniversalDropdown, { DropdownOption } from '../ui/UniversalDropdown';

interface TransportAdvancedFilterProps {
  filters: {
    searchQuery: string;
    fromCity: string;
    toCity: string;
    serviceType: string;
    priceRange: string;
    rating: string;
    availability: string;
    verified: boolean;
    experience: string;
    capacity: string;
    truckType: string;
    responseTime: string;
  };
  onFilterChange: (filterType: string, value: string | boolean) => void;
  onResetFilters: () => void;
  totalResults: number;
  onlineCount: number;
}

// تحويل خيارات المدن إلى تنسيق DropdownOption
const convertCityOptions = (cities: { name: string }[]): DropdownOption[] => [
  { value: '', label: 'جميع المدن' },
  ...cities.map((city) => ({ value: city.name, label: city.name })),
];

const TransportAdvancedFilter: React.FC<TransportAdvancedFilterProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalResults,
  onlineCount,
}) => {
  // عدد الفلاتر النشطة
  const activeFiltersCount = Object.entries(filters).filter(([key, value]) => {
    if (key === 'verified') return value === true;
    return value !== '' && value !== false;
  }).length;

  // خيارات أنواع الخدمات
  const serviceTypeOptions: DropdownOption[] = [
    { value: '', label: 'جميع أنواع الخدمات' },
    { value: 'نقل-سيارات', label: 'نقل السيارات' },
    { value: 'نقل-شاحنات', label: 'نقل الشاحنات' },
    { value: 'نقل-معدات', label: 'نقل المعدات الثقيلة' },
    { value: 'نقل-دراجات', label: 'نقل الدراجات النارية' },
    { value: 'نقل-خاص', label: 'نقل خاص' },
  ];

  // خيارات أنواع الساحبات
  const truckTypeOptions: DropdownOption[] = [
    { value: '', label: 'جميع أنواع الساحبات' },
    { value: 'ساحبة-فردية', label: 'ساحبة فردية (سيارة واحدة)' },
    { value: 'ساحبة-مزدوجة', label: 'ساحبة مزدوجة (سيارتان)' },
    { value: 'ساحبة-متوسطة', label: 'ساحبة متوسطة (3-4 سيارات)' },
    { value: 'ساحبة-كبيرة', label: 'ساحبة كبيرة (5-8 سيارات)' },
    { value: 'ساحبة-عملاقة', label: 'ساحبة عملاقة (أكثر من 8 سيارات)' },
  ];

  // خيارات التقييم
  const ratingOptions: DropdownOption[] = [
    { value: '', label: 'جميع التقييمات' },
    {
      value: '5',
      label:
        '<StarIcon className="w-5 h-5 text-yellow-500" /><StarIcon className="w-5 h-5 text-yellow-500" /><StarIcon className="w-5 h-5 text-yellow-500" /><StarIcon className="w-5 h-5 text-yellow-500" /><StarIcon className="w-5 h-5 text-yellow-500" /> ممتاز (5 نجوم)',
    },
    {
      value: '4',
      label:
        '<StarIcon className="w-5 h-5 text-yellow-500" /><StarIcon className="w-5 h-5 text-yellow-500" /><StarIcon className="w-5 h-5 text-yellow-500" /><StarIcon className="w-5 h-5 text-yellow-500" /> جيد جداً (4+ نجوم)',
    },
    {
      value: '3',
      label:
        '<StarIcon className="w-5 h-5 text-yellow-500" /><StarIcon className="w-5 h-5 text-yellow-500" /><StarIcon className="w-5 h-5 text-yellow-500" /> جيد (3+ نجوم)',
    },
    {
      value: '2',
      label:
        '<StarIcon className="w-5 h-5 text-yellow-500" /><StarIcon className="w-5 h-5 text-yellow-500" /> مقبول (2+ نجوم)',
    },
  ];

  // خيارات وقت الاستجابة
  const responseTimeOptions: DropdownOption[] = [
    { value: '', label: 'جميع أوقات الاستجابة' },
    { value: 'فوري', label: 'استجابة فورية (خلال دقائق)' },
    { value: 'سريع', label: 'استجابة سريعة (خلال ساعة)' },
    { value: 'عادي', label: 'استجابة عادية (خلال يوم)' },
    { value: 'بطيء', label: 'استجابة بطيئة (أكثر من يوم)' },
  ];

  return (
    <div className="sticky top-4 rounded-lg border bg-white p-4 shadow-sm">
      {/* رأس الفلتر */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <AdjustmentsHorizontalIcon className="h-4 w-4 text-blue-600" />
          فلتر البحث المتقدم
          {activeFiltersCount > 0 && (
            <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
              {activeFiltersCount}
            </span>
          )}
        </h3>

        {activeFiltersCount > 0 && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 rounded border border-red-200 px-1.5 py-0.5 text-xs text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <XMarkIcon className="h-3 w-3" />
            مسح الكل
          </button>
        )}
      </div>

      {/* البحث النصي الرئيسي */}
      <div className="mb-3">
        <label className="mb-1 block flex items-center gap-1 text-xs font-medium text-gray-700">
          <MagnifyingGlassIcon className="h-3 w-3 text-blue-600" />
          البحث في خدمات النقل
        </label>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <input
            type="text"
            placeholder="ابحث عن ناقل، نوع خدمة، أو مدينة..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-3 pr-8 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* الفلاتر الأساسية */}
      <div className="mb-4 space-y-3">
        {/* من مدينة */}
        <div>
          <label className="mb-1 block flex items-center gap-1 text-xs font-medium text-gray-700">
            <MapPinIcon className="h-3 w-3 text-green-600" />
            من مدينة
          </label>
          <select
            value={filters.fromCity || ''}
            onChange={(e) => onFilterChange('fromCity', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">اختر مدينة الانطلاق</option>
            <option value="طرابلس">طرابلس</option>
            <option value="بنغازي">بنغازي</option>
            <option value="مصراتة">مصراتة</option>
            <option value="الزاوية">الزاوية</option>
            <option value="طبرق">طبرق</option>
            <option value="سبها">سبها</option>
            <option value="درنة">درنة</option>
            <option value="غريان">غريان</option>
          </select>
        </div>

        {/* إلى مدينة */}
        <div>
          <label className="mb-1 block flex items-center gap-1 text-xs font-medium text-gray-700">
            <MapPinIcon className="h-3 w-3 text-red-600" />
            إلى مدينة
          </label>
          <select
            value={filters.toCity || ''}
            onChange={(e) => onFilterChange('toCity', e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">اختر مدينة الوصول</option>
            <option value="طرابلس">طرابلس</option>
            <option value="بنغازي">بنغازي</option>
            <option value="مصراتة">مصراتة</option>
            <option value="الزاوية">الزاوية</option>
            <option value="طبرق">طبرق</option>
            <option value="سبها">سبها</option>
            <option value="درنة">درنة</option>
            <option value="غريان">غريان</option>
          </select>
        </div>

        {/* نوع الخدمة */}
        <div>
          <label className="mb-1 block flex items-center gap-1 text-xs font-medium text-gray-700">
            <TruckIcon className="h-3 w-3 text-blue-600" />
            نوع الخدمة
          </label>
          <UniversalDropdown
            options={serviceTypeOptions}
            value={filters.serviceType}
            onChange={(value) =>
              onFilterChange('serviceType', Array.isArray(value) ? value[0] || '' : value || '')
            }
            placeholder="اختر نوع الخدمة"
            searchable={true}
          />
        </div>

        {/* نوع الساحبة */}
        <div>
          <label className="mb-1 block flex items-center gap-1 text-xs font-medium text-gray-700">
            <TruckIcon className="h-3 w-3 text-purple-600" />
            نوع الساحبة
          </label>
          <UniversalDropdown
            options={truckTypeOptions}
            value={filters.truckType}
            onChange={(value) =>
              onFilterChange('truckType', Array.isArray(value) ? value[0] || '' : value || '')
            }
            placeholder="اختر نوع الساحبة"
            searchable={true}
          />
        </div>
      </div>

      {/* الفلاتر المتقدمة */}
      <div className="space-y-3">
        {/* التقييم */}
        <div>
          <label className="mb-1 block flex items-center gap-1 text-xs font-medium text-gray-700">
            <StarIcon className="h-3 w-3 text-yellow-600" />
            التقييم
          </label>
          <UniversalDropdown
            options={ratingOptions}
            value={filters.rating}
            onChange={(value) =>
              onFilterChange('rating', Array.isArray(value) ? value[0] || '' : value || '')
            }
            placeholder="اختر التقييم"
            searchable={false}
          />
        </div>

        {/* وقت الاستجابة */}
        <div>
          <label className="mb-1 block flex items-center gap-1 text-xs font-medium text-gray-700">
            <ClockIcon className="h-3 w-3 text-orange-600" />
            وقت الاستجابة
          </label>
          <UniversalDropdown
            options={responseTimeOptions}
            value={filters.responseTime}
            onChange={(value) =>
              onFilterChange('responseTime', Array.isArray(value) ? value[0] || '' : value || '')
            }
            placeholder="اختر وقت الاستجابة"
            searchable={false}
          />
        </div>

        {/* الحسابات الموثقة */}
        <div>
          <label className="mb-1 block flex items-center gap-1 text-xs font-medium text-gray-700">
            <CheckCircleIcon className="h-3 w-3 text-green-600" />
            نوع الحساب
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 p-2 transition-colors hover:bg-gray-50">
            <input
              type="checkbox"
              checked={filters.verified}
              onChange={(e) => onFilterChange('verified', e.target.checked)}
              className="h-3 w-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <CheckCircleIcon className="h-3 w-3 text-green-600" />
            <span className="text-xs font-medium text-gray-700">الحسابات الموثقة فقط</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default TransportAdvancedFilter;
