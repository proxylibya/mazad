import React from 'react';
import SelectField from '../ui/SelectField';

interface YearRangeSelectorProps {
  fromYear?: string;
  toYear?: string;
  onFromYearChange: (year: string) => void;
  onToYearChange: (year: string) => void;
  className?: string;
}

const YearRangeSelector: React.FC<YearRangeSelectorProps> = ({
  fromYear,
  toYear,
  onFromYearChange,
  onToYearChange,
  className = '',
}) => {
  // إنشاء قائمة السنوات من السنة الحالية إلى 1990
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 1989 }, (_, i) => {
    const year = currentYear - i;
    return year.toString();
  });

  // إضافة خيار "جميع السنوات"
  const yearOptions = ['جميع السنوات', ...years];

  // فلترة سنوات "إلى" بناءً على سنة "من"
  const getToYearOptions = () => {
    if (!fromYear || fromYear === 'جميع السنوات') return yearOptions;

    const fromYearNum = parseInt(fromYear);
    if (!Number.isFinite(fromYearNum)) return yearOptions;

    const filteredYears = years.filter((year) => parseInt(year) <= fromYearNum);
    return ['جميع السنوات', ...filteredYears];
  };

  // فلترة سنوات "من" بناءً على سنة "إلى"
  const getFromYearOptions = () => {
    if (!toYear || toYear === 'جميع السنوات') return yearOptions;

    const toYearNum = parseInt(toYear);
    if (!Number.isFinite(toYearNum)) return yearOptions;

    const filteredYears = years.filter((year) => parseInt(year) >= toYearNum);
    return ['جميع السنوات', ...filteredYears];
  };

  const handleFromYearChange = (year: string) => {
    onFromYearChange(year);

    // إذا كانت سنة "إلى" أكبر من سنة "من" الجديدة، قم بإعادة تعيينها
    const toNum = parseInt(toYear || '');
    const fromNum = parseInt(year || '');
    if (toYear && year && Number.isFinite(toNum) && Number.isFinite(fromNum) && toNum > fromNum) {
      onToYearChange('جميع السنوات');
    }
  };

  const handleToYearChange = (year: string) => {
    onToYearChange(year);

    // إذا كانت سنة "من" أصغر من سنة "إلى" الجديدة، قم بإعادة تعيينها
    const fromNum = parseInt(fromYear || '');
    const toNum = parseInt(year || '');
    if (fromYear && year && Number.isFinite(fromNum) && Number.isFinite(toNum) && fromNum < toNum) {
      onFromYearChange('جميع السنوات');
    }
  };

  return (
    <div className={`year-range-selector ${className}`}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* سنة من */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">من سنة</label>
          <SelectField
            options={getFromYearOptions()}
            value={fromYear || ''}
            onChange={handleFromYearChange}
            placeholder="اختر السنة"
            searchable
            clearable
          />
        </div>

        {/* سنة إلى */}
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">إلى سنة</label>
          <SelectField
            options={getToYearOptions()}
            value={toYear || ''}
            onChange={handleToYearChange}
            placeholder="اختر السنة"
            searchable
            clearable
          />
        </div>
      </div>

      {/* عرض النطاق المحدد */}
      {(fromYear || toYear) && (
        <div className="mt-3 rounded-lg bg-blue-50 p-3">
          <p className="text-sm text-blue-700">
            النطاق المحدد:
            {fromYear && toYear
              ? ` من ${fromYear} إلى ${toYear}`
              : fromYear
                ? ` من ${fromYear} وما بعد`
                : ` حتى ${toYear} وما قبل`}
          </p>
        </div>
      )}
    </div>
  );
};

export default YearRangeSelector;
