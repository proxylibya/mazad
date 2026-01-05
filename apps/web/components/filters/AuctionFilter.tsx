import CurrencyDollarIcon from '@heroicons/react/24/outline/CurrencyDollarIcon';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import React from 'react';
import YearRangeSelector from '../YearRangeSelector';
import SelectField from '../ui/SelectField';

interface AuctionFilterProps {
  filters: {
    searchQuery: string;
    location: string;
    brand: string;
    model: string;
    yearFrom: string;
    yearTo: string;
    priceMin: number | null;
    priceMax: number | null;
    condition: string;
    auctionStatus: string;
    timeRemaining: string;
    bodyType: string;
    fuelType: string;
  };
  onFilterChange: (filterType: string, value: any) => void;
  onResetFilters: () => void;
  totalResults: number;
  liveCount: number;
  upcomingCount: number;
  endedCount: number;
}

const AuctionFilter: React.FC<AuctionFilterProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalResults,
  liveCount,
  upcomingCount,
  endedCount,
}) => {
  // بيانات فلاتر المزادات
  const auctionFilterData = {
    locations: [
      { value: 'جميع المدن', label: 'جميع المدن' },
      { value: 'طرابلس', label: 'طرابلس' },
      { value: 'بنغازي', label: 'بنغازي' },
      { value: 'مصراتة', label: 'مصراتة' },
      { value: 'سبها', label: 'سبها' },
      { value: 'الزاوية', label: 'الزاوية' },
    ],
    brands: [
      { value: 'جميع الماركات', label: 'جميع الماركات' },
      { value: 'تويوتا', label: 'تويوتا' },
      { value: 'نيسان', label: 'نيسان' },
      { value: 'هوندا', label: 'هوندا' },
      { value: 'هيونداي', label: 'هيونداي' },
      { value: 'كيا', label: 'كيا' },
      { value: 'مازدا', label: 'مازدا' },
      { value: 'ميتسوبيشي', label: 'ميتسوبيشي' },
    ],
    models: [
      { value: 'جميع الموديلات', label: 'جميع الموديلات' },
      { value: 'كامري', label: 'كامري' },
      { value: 'كورولا', label: 'كورولا' },
      { value: 'ألتيما', label: 'ألتيما' },
      { value: 'سيفيك', label: 'سيفيك' },
    ],
    conditions: [
      { value: 'جميع الحالات', label: 'جميع الحالات' },
      { value: 'جديد', label: 'جديد' },
      { value: 'مستعمل', label: 'مستعمل' },
    ],
    auctionStatuses: [
      { value: 'جميع المزادات', label: 'جميع المزادات' },
      { value: 'مزاد مباشر', label: 'مزاد مباشر' },
      { value: 'ينتهي قريباً', label: 'ينتهي قريباً' },
      { value: 'مزاد قادم', label: 'مزاد قادم' },
      { value: 'مزاد منتهي', label: 'مزاد منتهي' },
    ],
    timeRemaining: [
      { value: 'جميع الأوقات', label: 'جميع الأوقات' },
      { value: 'أقل من ساعة', label: 'أقل من ساعة' },
      { value: 'أقل من 6 ساعات', label: 'أقل من 6 ساعات' },
      { value: 'أقل من 24 ساعة', label: 'أقل من 24 ساعة' },
      { value: 'أكثر من يوم', label: 'أكثر من يوم' },
    ],
    bodyTypes: [
      { value: 'جميع الأنواع', label: 'جميع الأنواع' },
      { value: 'سيدان', label: 'سيدان' },
      { value: 'هاتشباك', label: 'هاتشباك' },
      { value: 'SUV', label: 'SUV' },
      { value: 'كوبيه', label: 'كوبيه' },
      { value: 'بيك أب', label: 'بيك أب' },
    ],
    fuelTypes: [
      { value: 'جميع أنواع الوقود', label: 'جميع أنواع الوقود' },
      { value: 'بنزين', label: 'بنزين' },
      { value: 'ديزل', label: 'ديزل' },
      { value: 'هجين', label: 'هجين' },
      { value: 'كهربائي', label: 'كهربائي' },
    ],
  };

  // عدد الفلاتر النشطة
  const activeFiltersCount = [
    filters.searchQuery !== '',
    filters.location !== 'جميع المدن',
    filters.brand !== 'جميع الماركات',
    filters.model !== 'جميع الموديلات',
    filters.yearFrom !== 'جميع السنوات',
    filters.yearTo !== 'جميع السنوات',
    filters.priceMin !== null,
    filters.priceMax !== null,
    filters.condition !== 'جميع الحالات',
    filters.auctionStatus !== 'جميع المزادات',
    filters.timeRemaining !== 'جميع الأوقات',
    filters.bodyType !== 'جميع الأنواع',
    filters.fuelType !== 'جميع أنواع الوقود',
  ].filter(Boolean).length;

  return (
    <div className="sticky top-4 rounded-lg border bg-white p-4 shadow-sm">
      {/* رأس الفلتر */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <FunnelIcon className="h-5 w-5 text-blue-600" />
          فلاتر المزادات
          {activeFiltersCount > 0 && (
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              {activeFiltersCount}
            </span>
          )}
        </h3>

        {activeFiltersCount > 0 && (
          <button
            onClick={onResetFilters}
            className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
          >
            <XMarkIcon className="h-4 w-4" />
            مسح الكل
          </button>
        )}
      </div>

      {/* إحصائيات المزادات */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-green-50 px-2 py-1 text-center text-green-700">
          مباشر: {liveCount}
        </div>
        <div className="rounded bg-blue-50 px-2 py-1 text-center text-blue-700">
          قادم: {upcomingCount}
        </div>
        <div className="rounded bg-gray-50 px-2 py-1 text-center text-gray-700">
          منتهي: {endedCount}
        </div>
        <div className="rounded bg-purple-50 px-2 py-1 text-center text-purple-700">
          المجموع: {totalResults}
        </div>
      </div>

      {/* البحث النصي */}
      <div className="mb-4">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
          <MagnifyingGlassIcon className="h-4 w-4 text-blue-600" />
          البحث في المزادات
        </label>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <input
            type="text"
            placeholder="ابحث عن مزاد..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 py-2 pl-4 pr-10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* الفلاتر الأساسية */}
      <div className="space-y-4">
        <SelectField
          label="حالة المزاد"
          options={auctionFilterData.auctionStatuses}
          value={filters.auctionStatus}
          onChange={(value) => onFilterChange('auctionStatus', value)}
          placeholder="اختر حالة المزاد"
        />

        <SelectField
          label="المدينة"
          options={auctionFilterData.locations}
          value={filters.location}
          onChange={(value) => onFilterChange('location', value)}
          placeholder="اختر المدينة"
        />

        <SelectField
          label="الماركة"
          options={auctionFilterData.brands}
          value={filters.brand}
          onChange={(value) => onFilterChange('brand', value)}
          placeholder="اختر الماركة"
        />

        <SelectField
          label="الموديل"
          options={auctionFilterData.models}
          value={filters.model}
          onChange={(value) => onFilterChange('model', value)}
          placeholder="اختر الموديل"
        />

        {/* سنة الصنع */}
        <YearRangeSelector
          yearFrom={filters.yearFrom}
          yearTo={filters.yearTo}
          onYearFromChange={(year) => onFilterChange('yearFrom', year)}
          onYearToChange={(year) => onFilterChange('yearTo', year)}
        />

        {/* نطاق السعر */}
        <div>
          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <CurrencyDollarIcon className="h-4 w-4 text-blue-600" />
            نطاق السعر (د.ل)
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="الحد الأدنى"
              value={filters.priceMin || ''}
              onChange={(e) =>
                onFilterChange('priceMin', e.target.value ? parseInt(e.target.value) : null)
              }
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="الحد الأقصى"
              value={filters.priceMax || ''}
              onChange={(e) =>
                onFilterChange('priceMax', e.target.value ? parseInt(e.target.value) : null)
              }
              className="rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <SelectField
          label="حالة السيارة"
          options={auctionFilterData.conditions}
          value={filters.condition}
          onChange={(value) => onFilterChange('condition', value)}
          placeholder="اختر الحالة"
        />

        <SelectField
          label="الوقت المتبقي"
          options={auctionFilterData.timeRemaining}
          value={filters.timeRemaining}
          onChange={(value) => onFilterChange('timeRemaining', value)}
          placeholder="اختر الوقت"
        />

        <SelectField
          label="نوع الهيكل"
          options={auctionFilterData.bodyTypes}
          value={filters.bodyType}
          onChange={(value) => onFilterChange('bodyType', value)}
          placeholder="اختر نوع الهيكل"
        />

        <SelectField
          label="نوع الوقود"
          options={auctionFilterData.fuelTypes}
          value={filters.fuelType}
          onChange={(value) => onFilterChange('fuelType', value)}
          placeholder="اختر نوع الوقود"
        />
      </div>
    </div>
  );
};

export default AuctionFilter;
