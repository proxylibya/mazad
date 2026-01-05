/**
 * مكون قائمة منسدلة موحد مع بحث - للوحة التحكم
 * Unified Searchable Select Component for Admin Panel
 *
 * استخدم هذا المكون في جميع صفحات لوحة التحكم
 * للحصول على تجربة مستخدم موحدة
 */

import { ChevronDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatedPresence } from '../unified/UnifiedAnimation';

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

export interface SearchableSelectProps {
  /** القيمة المحددة */
  value: string;
  /** دالة تغيير القيمة */
  onChange: (value: string) => void;
  /** خيارات القائمة - يمكن أن تكون مصفوفة strings أو objects */
  options: string[] | SelectOption[];
  /** نص العنصر النائب */
  placeholder?: string;
  /** عنوان الحقل */
  label?: string;
  /** حقل مطلوب */
  required?: boolean;
  /** حقل معطل */
  disabled?: boolean;
  /** رسالة الخطأ */
  error?: string;
  /** إظهار زر المسح */
  clearable?: boolean;
  /** تفعيل البحث */
  searchable?: boolean;
  /** الحد الأقصى للارتفاع */
  maxHeight?: string;
}

/**
 * تحويل الخيارات إلى تنسيق موحد
 */
const normalizeOptions = (options: string[] | SelectOption[]): SelectOption[] => {
  if (options.length === 0) return [];
  if (typeof options[0] === 'string') {
    return (options as string[]).map((opt) => ({ value: opt, label: opt }));
  }
  return options as SelectOption[];
};

export default function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'اختر من القائمة',
  label,
  required,
  disabled,
  error,
  clearable = true,
  searchable = true,
  maxHeight = 'max-h-60',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // تحويل الخيارات
  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);

  // فلترة الخيارات حسب البحث
  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return normalizedOptions;
    return normalizedOptions.filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opt.value.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [normalizedOptions, searchTerm, searchable]);

  // الحصول على العنصر المحدد
  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // التركيز على حقل البحث
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [isOpen, searchable]);

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
      )}

      <div className="relative">
        {/* الزر الرئيسي */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex w-full items-center justify-between rounded-lg border bg-slate-700 px-4 py-2.5 text-right transition-colors focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/30'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <span className={selectedOption ? 'text-white' : 'text-slate-400'}>
            {selectedOption?.icon && <span className="ml-2">{selectedOption.icon}</span>}
            {selectedOption?.label || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && clearable && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) =>
                  e.key === 'Enter' && handleClear(e as unknown as React.MouseEvent)
                }
                className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white"
              >
                <XMarkIcon className="h-4 w-4" />
              </span>
            )}
            <ChevronDownIcon
              className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </button>

        {/* القائمة المنسدلة */}
        <AnimatedPresence
          show={isOpen}
          className="absolute z-50 mt-1 w-full origin-top-right overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-xl"
        >
          {/* حقل البحث */}
          {searchable && (
            <div className="sticky top-0 border-b border-slate-600 bg-slate-800 p-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث..."
                  className="w-full rounded-md border border-slate-600 bg-slate-700 py-2 pl-3 pr-9 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* قائمة الخيارات */}
          <div className={`${maxHeight} overflow-auto`}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full px-4 py-2.5 text-right text-sm transition-colors hover:bg-slate-700 ${
                    value === opt.value ? 'bg-blue-600 text-white' : 'text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {opt.icon && <span>{opt.icon}</span>}
                    <div>
                      <div>{opt.label}</div>
                      {opt.description && (
                        <div className="text-xs text-slate-400">{opt.description}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-4 text-center text-sm text-slate-400">لا توجد نتائج</div>
            )}
          </div>
        </AnimatedPresence>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}

/**
 * مكون لاختيار متعدد من قائمة مع بحث
 */
export interface MultiSelectProps extends Omit<SearchableSelectProps, 'value' | 'onChange'> {
  values: string[];
  onChange: (values: string[]) => void;
  maxDisplay?: number;
}

export function MultiSearchableSelect({
  values,
  onChange,
  options,
  placeholder = 'اختر من القائمة',
  label,
  required,
  disabled,
  error,
  searchable = true,
  maxHeight = 'max-h-60',
  maxDisplay = 5,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const normalizedOptions = useMemo(() => normalizeOptions(options), [options]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) return normalizedOptions;
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [normalizedOptions, searchTerm, searchable]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 10);
    }
  }, [isOpen, searchable]);

  const handleToggle = (optValue: string) => {
    if (values.includes(optValue)) {
      onChange(values.filter((v) => v !== optValue));
    } else {
      onChange([...values, optValue]);
    }
  };

  const handleSelectAll = () => {
    onChange(normalizedOptions.map((opt) => opt.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label} {required && <span className="text-red-400">*</span>}
          <span className="mr-2 text-xs text-slate-400">({values.length} مختار)</span>
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`flex w-full items-center justify-between rounded-lg border bg-slate-700 px-4 py-2.5 text-right transition-colors focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-500 focus:border-red-500 focus:ring-red-500/30'
              : 'border-slate-600 focus:border-blue-500 focus:ring-blue-500/30'
          } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          <span className={values.length > 0 ? 'text-white' : 'text-slate-400'}>
            {values.length > 0 ? `${values.length} عنصر مختار` : placeholder}
          </span>
          <ChevronDownIcon
            className={`h-5 w-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatedPresence
          show={isOpen}
          className="absolute z-50 mt-1 w-full origin-top-right overflow-hidden rounded-lg border border-slate-600 bg-slate-800 shadow-xl"
        >
          {/* حقل البحث */}
          {searchable && (
            <div className="sticky top-0 border-b border-slate-600 bg-slate-800 p-2">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ابحث..."
                  className="w-full rounded-md border border-slate-600 bg-slate-700 py-2 pl-3 pr-9 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* أزرار التحكم */}
          <div className="flex gap-2 border-b border-slate-600 p-2">
            <button
              type="button"
              onClick={handleSelectAll}
              className="flex-1 rounded-md bg-blue-600/20 px-2 py-1.5 text-xs text-blue-400 hover:bg-blue-600/30"
            >
              تحديد الكل
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              className="flex-1 rounded-md bg-slate-600/50 px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-600"
            >
              إلغاء الكل
            </button>
          </div>

          {/* قائمة الخيارات */}
          <div className={`${maxHeight} overflow-auto`}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-slate-700 ${
                    values.includes(opt.value) ? 'bg-blue-600/20 text-blue-400' : 'text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={values.includes(opt.value)}
                    onChange={() => handleToggle(opt.value)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-blue-500"
                  />
                  {opt.icon && <span>{opt.icon}</span>}
                  {opt.label}
                </label>
              ))
            ) : (
              <div className="px-4 py-4 text-center text-sm text-slate-400">لا توجد نتائج</div>
            )}
          </div>
        </AnimatedPresence>
      </div>

      {/* عرض العناصر المختارة */}
      {values.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {values.slice(0, maxDisplay).map((val) => {
            const opt = normalizedOptions.find((o) => o.value === val);
            return (
              <span
                key={val}
                className="flex items-center gap-1 rounded-full bg-blue-500/20 px-2.5 py-1 text-xs text-blue-400"
              >
                {opt?.icon && <span>{opt.icon}</span>}
                {opt?.label || val}
                <button
                  type="button"
                  onClick={() => handleToggle(val)}
                  className="mr-0.5 rounded-full hover:bg-blue-500/30"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
          {values.length > maxDisplay && (
            <span className="rounded-full bg-slate-600 px-2.5 py-1 text-xs text-slate-300">
              +{values.length - maxDisplay} أخرى
            </span>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
