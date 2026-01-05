import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import ChevronUpIcon from '@heroicons/react/24/outline/ChevronUpIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SelectFieldProps {
  id?: string;
  name?: string;
  options: Option[] | string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  required?: boolean;
  clearable?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  size?: 'sm' | 'md' | 'lg';
  /** تصميم موحد مع حقول البحث الأخرى */
  unified?: boolean;
}

const SelectField: React.FC<SelectFieldProps> = ({
  id,
  name,
  options,
  value,
  onChange,
  placeholder = 'اختر من القائمة',
  label,
  error,
  disabled = false,
  className = '',
  required = false,
  clearable = true,
  searchable = true,
  searchPlaceholder = 'ابحث...',
  size = 'md',
  unified = false,
}) => {
  // تحويل الخيارات إلى تنسيق موحد مع useMemo لتجنب إعادة الإنشاء
  const normalizedOptions: Option[] = useMemo(
    () =>
      options.map((option) =>
        typeof option === 'string' ? { value: option, label: option } : option,
      ),
    [options],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(normalizedOptions);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // أحجام المكون
  const sizeClasses = {
    sm: 'px-2 py-1.5 text-sm',
    md: 'px-3 py-2 text-base',
    lg: 'px-4 py-4 text-lg',
  };

  // Classes للتصميم الموحد مع حقول البحث
  const unifiedClasses = unified
    ? 'rounded-xl border-2 border-gray-200 bg-gray-50 transition-all duration-200 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:border-gray-300'
    : 'rounded-lg border border-gray-300 bg-white hover:border-gray-400';

  // تصفية الخيارات بناءً على البحث
  useEffect(() => {
    if (searchTerm && searchable) {
      const filtered = normalizedOptions.filter(
        (option) =>
          option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
          option.value.toLowerCase().includes(searchTerm.toLowerCase()),
      );
      setFilteredOptions(filtered);
    } else {
      setFilteredOptions(normalizedOptions);
    }
  }, [searchTerm, normalizedOptions, searchable]);

  // إغلاق القائمة عند النقر خارجها
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // التركيز على حقل البحث عند فتح القائمة وتحديد موضع القائمة
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();

      // تحديد موضع القائمة بناءً على المساحة المتاحة
      if (dropdownRef.current) {
        const rect = dropdownRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;

        // إذا كانت المساحة أسفل أقل من 320px والمساحة أعلى أكبر
        if (spaceBelow < 320 && spaceAbove > spaceBelow) {
          setDropdownPosition('top');
        } else {
          setDropdownPosition('bottom');
        }
      }
    }
  }, [isOpen]);

  const handleToggleOpen = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const selectedOption = normalizedOptions.find((option) => option.value === value);

  return (
    <div
      className={`searchable-select-container relative ${className} ${isOpen ? 'is-open' : ''}`}
      ref={dropdownRef}
      style={{
        zIndex: isOpen ? 99998 : 'auto',
        position: 'relative',
      }}
    >
      {label && (
        <label className="mb-2 block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="mr-1 text-red-500">*</span>}
        </label>
      )}

      {/* الحاوية الرئيسية للزر */}
      <div className="relative">
        {name && <input type="hidden" name={name} value={value} />}
        <button
          ref={buttonRef}
          id={id}
          name={name}
          type="button"
          onClick={handleToggleOpen}
          disabled={disabled}
          className={`flex w-full items-center justify-between text-right transition-colors ${sizeClasses[size]} ${
            error ? 'rounded-xl border-2 border-red-300 bg-red-50' : unifiedClasses
          } ${disabled ? 'cursor-not-allowed !bg-gray-100' : 'cursor-pointer'} focus:outline-none`}
        >
          <span
            className={`flex-1 text-right ${selectedOption ? 'text-gray-900' : 'text-gray-500'}`}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <div className="flex items-center gap-2">
            {isOpen ? (
              <ChevronUpIcon className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>

        {/* زر المسح منفصل خارج الزر الرئيسي */}
        {value && !disabled && clearable && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* رسالة الخطأ */}
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* القائمة المنسدلة */}
      {isOpen && (
        <div
          className={`searchable-select-dropdown absolute max-h-80 w-full overflow-hidden bg-white shadow-xl ${
            unified ? 'rounded-xl border-2 border-gray-200' : 'rounded-lg border border-gray-300'
          } ${dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'}`}
          style={{
            zIndex: 99999,
            position: 'absolute',
          }}
        >
          {/* حقل البحث */}
          {searchable && (
            <div className="border-b border-gray-200 p-3">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 transform text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={searchPlaceholder}
                  className={`w-full py-2.5 pl-3 pr-10 focus:outline-none ${
                    unified
                      ? 'rounded-lg border-2 border-gray-200 bg-gray-50 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10'
                      : 'rounded-md border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500'
                  }`}
                />
              </div>
            </div>
          )}

          {/* قائمة الخيارات */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full text-right transition-colors ${
                    unified ? 'px-4 py-3 text-base' : 'px-3 py-2'
                  } ${
                    value === option.value
                      ? 'bg-blue-50 font-medium text-blue-600'
                      : 'text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className={`text-center text-gray-500 ${unified ? 'px-4 py-5' : 'px-3 py-4'}`}>
                لا توجد نتائج
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SelectField;

// تصدير إضافي للتوافق مع الاستخدامات القديمة
export { SelectField as SearchableSelect };
