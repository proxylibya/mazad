/**
 * مكون اختيار البائع - يسمح للمدير باختيار أو إنشاء بائع للإعلان
 * Seller Selector Component - Allows admin to select or create seller for listings
 */

import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import UserIcon from '@heroicons/react/24/outline/UserIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { useCallback, useEffect, useState } from 'react';
import UnifiedPhoneInput from './UnifiedPhoneInput';

export interface SellerInfo {
  id?: string; // معرف المستخدم إذا كان موجوداً
  name: string;
  phone: string;
  isNew?: boolean; // هل هو مستخدم جديد سيتم إنشاؤه
  isSiteTeam?: boolean;
}

interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: string;
  accountType?: string;
}

interface SellerSelectorProps {
  value: SellerInfo | null;
  onChange: (seller: SellerInfo | null) => void;
  error?: string;
  required?: boolean;
  label?: string;
  placeholder?: string;
}

export default function SellerSelector({
  value,
  onChange,
  error,
  required = true,
  label = 'معلومات البائع',
  placeholder = 'ابحث عن مستخدم أو أنشئ بائع جديد',
}: SellerSelectorProps) {
  const [mode, setMode] = useState<'search' | 'create' | 'selected'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // بيانات البائع الجديد
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerPhone, setNewSellerPhone] = useState('');
  const [createError, setCreateError] = useState('');

  // تحديث الوضع عند تغير القيمة
  useEffect(() => {
    if (value && (value.id || value.name)) {
      setMode('selected');
    }
  }, [value]);

  // البحث عن المستخدمين
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(query)}&limit=10`,
      );
      const data = await response.json();

      if (data.success && data.users) {
        setSearchResults(data.users);
      } else {
        setSearchResults([]);
      }
    } catch (err) {
      console.error('خطأ في البحث:', err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // تأخير البحث
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mode === 'search' && searchQuery) {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, mode, searchUsers]);

  // اختيار مستخدم من نتائج البحث
  const handleSelectUser = (user: User) => {
    onChange({
      id: user.id,
      name: user.name || 'بدون اسم',
      phone: user.phone,
      isNew: false,
      isSiteTeam: false,
    });
    setMode('selected');
    setShowDropdown(false);
    setSearchQuery('');
  };

  // إنشاء بائع جديد
  const handleCreateSeller = () => {
    setCreateError('');

    if (!newSellerName.trim()) {
      setCreateError('يرجى إدخال اسم البائع');
      return;
    }

    if (!newSellerPhone.trim() || newSellerPhone.length < 10) {
      setCreateError('يرجى إدخال رقم هاتف صحيح');
      return;
    }

    onChange({
      name: newSellerName.trim(),
      phone: newSellerPhone.trim(),
      isNew: true,
      isSiteTeam: false,
    });
    setMode('selected');
  };

  // إلغاء الاختيار
  const handleClear = () => {
    onChange(null);
    setMode('search');
    setSearchQuery('');
    setNewSellerName('');
    setNewSellerPhone('');
    setCreateError('');
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-slate-300">
        {label} {required && <span className="text-red-400">*</span>}
      </label>

      {/* الوضع: عرض البائع المختار */}
      {mode === 'selected' && value && (
        <div className="flex items-center justify-between rounded-lg border border-green-500/50 bg-green-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
              <UserIcon className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="font-medium text-white">{value.name}</p>
              <p className="text-sm text-slate-400" dir="ltr">
                {value.phone || '—'}
              </p>
              {value.isNew && <span className="text-xs text-yellow-400">سيتم إنشاء حساب جديد</span>}
              {value.isSiteTeam && (
                <span className="text-xs text-indigo-300">منشور بواسطة فريق مزاد</span>
              )}
              {!value.isNew && value.id && (
                <span className="text-xs text-green-400">مستخدم مسجل</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
            title="تغيير البائع"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* الوضع: البحث أو الإنشاء */}
      {mode !== 'selected' && (
        <div className="space-y-4">
          {/* تبويبات الاختيار */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('search')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                mode === 'search'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                  : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-blue-500/50'
              }`}
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              بحث عن مستخدم موجود
            </button>
            <button
              type="button"
              onClick={() => setMode('create')}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                mode === 'create'
                  ? 'border-green-500 bg-green-500/10 text-green-400'
                  : 'border-slate-600 bg-slate-700 text-slate-300 hover:border-green-500/50'
              }`}
            >
              <PlusIcon className="h-4 w-4" />
              إنشاء بائع جديد
            </button>
          </div>

          {/* وضع البحث */}
          {mode === 'search' && (
            <div className="relative">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="ابحث بالاسم أو رقم الهاتف..."
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 py-3 pl-4 pr-10 text-white placeholder-slate-400 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                {isSearching && (
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                  </div>
                )}
              </div>

              {/* نتائج البحث */}
              {showDropdown && searchQuery && (
                <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-600 bg-slate-700 shadow-xl">
                  {searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-slate-600"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/20">
                          <UserIcon className="h-4 w-4 text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">
                            {user.name || 'بدون اسم'}
                          </p>
                          <p className="text-xs text-slate-400" dir="ltr">
                            {user.phone}
                          </p>
                        </div>
                        <span className="rounded bg-slate-600 px-2 py-0.5 text-xs text-slate-300">
                          {user.role === 'ADMIN'
                            ? 'مدير'
                            : user.role === 'USER'
                              ? 'مستخدم'
                              : user.role}
                        </span>
                      </button>
                    ))
                  ) : !isSearching ? (
                    <div className="p-4 text-center text-slate-400">
                      <p>لم يتم العثور على مستخدمين</p>
                      <button
                        type="button"
                        onClick={() => setMode('create')}
                        className="mt-2 text-sm text-blue-400 hover:underline"
                      >
                        إنشاء بائع جديد
                      </button>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* وضع الإنشاء */}
          {mode === 'create' && (
            <div className="space-y-4 rounded-lg border border-slate-600 bg-slate-700/50 p-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  اسم البائع <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={newSellerName}
                  onChange={(e) => setNewSellerName(e.target.value)}
                  placeholder="أدخل اسم البائع..."
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 transition-colors focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500/30"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  رقم الهاتف <span className="text-red-400">*</span>
                </label>
                <UnifiedPhoneInput
                  value={newSellerPhone}
                  onChange={setNewSellerPhone}
                  error={createError && newSellerPhone.length < 10 ? createError : undefined}
                />
              </div>

              {createError && <p className="text-sm text-red-400">{createError}</p>}

              <button
                type="button"
                onClick={handleCreateSeller}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700"
              >
                <PlusIcon className="h-4 w-4" />
                تأكيد بيانات البائع
              </button>

              <p className="text-center text-xs text-slate-400">
                سيتم إنشاء حساب جديد للبائع إذا لم يكن مسجلاً برقم الهاتف هذا
              </p>
            </div>
          )}

          <div className="rounded-lg border border-slate-600 bg-slate-700/30 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={!!value?.isSiteTeam}
                onChange={(e) => {
                  if (!e.target.checked) return;
                  onChange({
                    id: 'site_team',
                    name: 'فريق مزاد',
                    phone: '',
                    isNew: false,
                    isSiteTeam: true,
                  });
                  setMode('selected');
                }}
                className="mt-1 h-4 w-4 rounded border-slate-500 bg-slate-600 text-indigo-500"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">منشور بواسطة فريق مزاد</p>
                <p className="mt-1 text-xs text-slate-400">
                  سيتم استخدام بيانات فريق الموقع عند التواصل
                </p>
              </div>
            </label>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
