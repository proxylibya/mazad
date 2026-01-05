import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import React from 'react';
import YearRangeSelector from '../YearRangeSelector';
import SelectField from '../ui/SelectField';

interface ImprovedAuctionFilterProps {
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

const ImprovedAuctionFilter: React.FC<ImprovedAuctionFilterProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalResults,
  liveCount,
  upcomingCount,
  endedCount,
}) => {
  // بيانات فلاتر المزادات المحسنة
  const auctionFilterData = {
    locations: [
      { value: 'جميع المدن', label: 'جميع المدن' },
      { value: 'طرابلس', label: 'طرابلس' },
      { value: 'بنغازي', label: 'بنغازي' },
      { value: 'مصراتة', label: 'مصراتة' },
      { value: 'سبها', label: 'سبها' },
      { value: 'الزاوية', label: 'الزاوية' },
      { value: 'زليتن', label: 'زليتن' },
      { value: 'الخمس', label: 'الخمس' },
      { value: 'غريان', label: 'غريان' },
      { value: 'صبراتة', label: 'صبراتة' },
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
      { value: 'فولكس واجن', label: 'فولكس واجن' },
      { value: 'بي إم دبليو', label: 'بي إم دبليو' },
      { value: 'مرسيدس', label: 'مرسيدس' },
      { value: 'أودي', label: 'أودي' },
    ],
    models: [
      { value: 'جميع الموديلات', label: 'جميع الموديلات' },
      { value: 'كامري', label: 'كامري' },
      { value: 'كورولا', label: 'كورولا' },
      { value: 'ألتيما', label: 'ألتيما' },
      { value: 'سيفيك', label: 'سيفيك' },
      { value: 'أكورد', label: 'أكورد' },
      { value: 'إلنترا', label: 'إلنترا' },
      { value: 'سيراتو', label: 'سيراتو' },
    ],
    conditions: [
      { value: 'جميع الحالات', label: 'جميع الحالات' },
      { value: 'جديد', label: 'جديد' },
      { value: 'مستعمل', label: 'مستعمل' },
    ],
    auctionStatuses: [
      { value: 'جميع المزادات', label: 'جميع المزادات' },
      { value: 'مباشر', label: 'مزاد مباشر' },
      { value: 'قادم', label: 'مزاد قادم' },
      { value: 'منتهي', label: 'مزاد منتهي' },
    ],
    timeRemaining: [
      { value: 'جميع الأوقات', label: 'جميع الأوقات' },
      { value: 'أقل من ساعة', label: 'أقل من ساعة' },
      { value: 'أقل من 3 ساعات', label: 'أقل من 3 ساعات' },
      { value: 'أقل من 6 ساعات', label: 'أقل من 6 ساعات' },
      { value: 'أقل من 12 ساعة', label: 'أقل من 12 ساعة' },
      { value: 'أقل من 24 ساعة', label: 'أقل من 24 ساعة' },
      { value: 'أكثر من يوم', label: 'أكثر من يوم' },
      { value: 'أكثر من أسبوع', label: 'أكثر من أسبوع' },
    ],
    bodyTypes: [
      { value: 'جميع الأنواع', label: 'جميع الأنواع' },
      { value: 'سيدان', label: 'سيدان' },
      { value: 'هاتشباك', label: 'هاتشباك' },
      { value: 'SUV', label: 'SUV' },
      { value: 'كوبيه', label: 'كوبيه' },
      { value: 'كونفرتيبل', label: 'كونفرتيبل' },
      { value: 'واجن', label: 'واجن' },
      { value: 'بيك أب', label: 'بيك أب' },
      { value: 'ميني فان', label: 'ميني فان' },
      { value: 'كروس أوفر', label: 'كروس أوفر' },
      { value: 'رياضية', label: 'رياضية' },
    ],
    fuelTypes: [
      { value: 'جميع أنواع الوقود', label: 'جميع أنواع الوقود' },
      { value: 'بنزين', label: 'بنزين' },
      { value: 'ديزل', label: 'ديزل' },
      { value: 'هجين', label: 'هجين' },
      { value: 'كهربائي', label: 'كهربائي' },
      { value: 'غاز طبيعي', label: 'غاز طبيعي' },
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
    <div className="space-y-6 rounded-2xl border bg-white p-5 shadow-lg">
      {/* رأس الفلتر */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
          <MagnifyingGlassIcon className="h-5 w-5 text-blue-600" />
          الفلاتر
        </h3>
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
        >
          <XMarkIcon className="h-4 w-4" />
          إزالة الكل
        </button>
      </div>

      {/* البحث النصي */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">البحث</label>
        <input
          type="text"
          placeholder="ابحث عن سيارة..."
          value={filters.searchQuery}
          onChange={(e) => onFilterChange('searchQuery', e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-400 focus:ring-2 focus:ring-blue-400"
        />
      </div>

      {/* المدينة */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">المدينة</label>
        <SelectField
          options={['جميع المدن', 'طرابلس', 'بنغازي', 'مصراتة', 'سبها', 'الزاوية']}
          value={filters.location}
          onChange={(value) => onFilterChange('location', value)}
          placeholder="اختر المدينة"
          searchable
          clearable
        />
      </div>

      {/* الماركة */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">الماركة</label>
        <SelectField
          options={[
            'جميع الماركات',
            'تويوتا',
            'نيسان',
            'هيونداي',
            'كيا',
            'مازدا',
            'هوندا',
            'فورد',
            'شيفروليه',
            'بيجو',
            'رينو',
            'فولكس واجن',
            'أودي',
            'BMW',
            'مرسيدس',
            'لكزس',
            'إنفينيتي',
            'أكورا',
          ]}
          value={filters.brand}
          onChange={(value) => onFilterChange('brand', value)}
          placeholder="اختر الماركة"
          searchable
          clearable
        />
      </div>

      {/* الموديل */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">الموديل</label>
        <SelectField
          options={
            filters.brand === 'جميع الماركات'
              ? ['جميع الموديلات']
              : ['جميع الموديلات', 'كامري', 'كورولا', 'راف 4', 'هايلاندر', 'برادو']
          }
          value={filters.model}
          onChange={(value) => onFilterChange('model', value)}
          placeholder="اختر الموديل"
          disabled={filters.brand === 'جميع الماركات'}
          searchable
          clearable
        />
      </div>

      {/* نوع السيارة */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">نوع السيارة</label>
        <SelectField
          options={[
            'جميع الأنواع',
            'سيدان',
            'هاتشباك',
            'SUV',
            'كوبيه',
            'كونفرتيبل',
            'واجن',
            'بيك أب',
          ]}
          value={filters.bodyType}
          onChange={(value) => onFilterChange('bodyType', value)}
          placeholder="اختر نوع السيارة"
          searchable
          clearable
        />
      </div>

      {/* سنة الصنع */}
      <YearRangeSelector
        yearFrom={filters.yearFrom}
        yearTo={filters.yearTo}
        onYearFromChange={(year) => onFilterChange('yearFrom', year)}
        onYearToChange={(year) => onFilterChange('yearTo', year)}
      />

      {/* قسم إضافة إعلان */}
      <div className="mt-2 border-t pt-4">
        <div className="mb-4 text-center">
          <h3 className="mb-1 text-base font-bold text-gray-800">هل تريد بيع سيارتك؟</h3>
          <p className="mb-2 text-xs text-gray-600">احصل على أفضل سعر لسيارتك</p>
        </div>
        <div className="space-y-2">
          <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            أضف سيارتك لسوق الفوري
          </button>
          <button className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            أضف سيارتك للمزاد
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImprovedAuctionFilter;
