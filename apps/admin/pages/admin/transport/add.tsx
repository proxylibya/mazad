/**
 * صفحة إضافة خدمة نقل - نسخة محسنة ومكتملة
 * تتضمن جميع العناصر: رفع الصور، أيام العمل، العنوان، وصف الساحبة
 */
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PhoneIcon,
  PhotoIcon,
  SparklesIcon,
  StarIcon,
  TruckIcon,
  UserIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import TransportImageUploader from '../../../components/transport/TransportImageUploader';
import LocationPickerSection, { LocationData } from '../../../components/ui/LocationPickerSection';
import SellerSelector, { SellerInfo } from '../../../components/ui/SellerSelector';
import StickyActionBar from '../../../components/ui/StickyActionBar';

// استيراد البيانات المشتركة الموحدة - 72 مدينة ليبية
import { LIBYAN_CITIES, TRANSPORT_VEHICLE_TYPES } from '../../../lib/shared-data';

// أيام الأسبوع
const WEEK_DAYS = [
  { value: 'الأحد', label: 'الأحد' },
  { value: 'الاثنين', label: 'الاثنين' },
  { value: 'الثلاثاء', label: 'الثلاثاء' },
  { value: 'الأربعاء', label: 'الأربعاء' },
  { value: 'الخميس', label: 'الخميس' },
  { value: 'الجمعة', label: 'الجمعة' },
  { value: 'السبت', label: 'السبت' },
];

type SiteTeamSettings = {
  phones?: string[];
  whatsappPhone?: string;
};

function normalizeSiteTeamPhoneForTextInput(raw: string) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';

  if (digits.startsWith('218')) {
    const rest = digits.slice(3);
    if (rest.startsWith('0')) return rest;
    return `0${rest}`;
  }

  if (digits.startsWith('0')) return digits;
  return digits;
}

export default function AddTransportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [formData, setFormData] = useState({
    companyName: '',
    ownerName: '',
    phone: '',
    email: '',
    vehicleType: 'flatbed',
    vehicleCount: 1,
    cities: [] as string[],
    description: '',
    truckDescription: '',
    address: '',
    workingDays: [] as string[],
    images: [] as string[],
    promotionPackage: 'free',
    promotionDays: 0,
    // بيانات الموقع
    coordinates: undefined as { lat: number; lng: number } | undefined,
    detailedAddress: '',
  });

  // البائع المختار
  const [selectedSeller, setSelectedSeller] = useState<SellerInfo | null>(null);
  const [siteTeamPhone, setSiteTeamPhone] = useState<string>('');

  const normalizedSiteTeamPhone = normalizeSiteTeamPhoneForTextInput(siteTeamPhone);
  const isSiteTeamSeller = !!selectedSeller?.isSiteTeam;
  const shouldRequirePhone = !isSiteTeamSeller || !normalizedSiteTeamPhone;

  // تحديث العنوان تلقائياً عند تغيير نوع الساحبة والمدن
  useEffect(() => {
    const selectedType = TRANSPORT_VEHICLE_TYPES.find((t) => t.id === formData.vehicleType);
    if (selectedType && formData.cities.length > 0) {
      const cities = formData.cities.slice(0, 3).join(' - ');
      const autoAddress = `${selectedType.label} - ${cities}`;

      // تحديث العنوان فقط إذا كان فارغاً أو يحتوي على النمط التلقائي
      if (!formData.address || formData.address.includes(' - ')) {
        setFormData((prev) => ({ ...prev, address: autoAddress }));
      }
    }
  }, [formData.vehicleType, formData.cities]);

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
    const normalized = normalizeSiteTeamPhoneForTextInput(siteTeamPhone);
    if (!normalized) return;

    setFormData((prev) => {
      if (prev.phone === normalized) return prev;
      return { ...prev, phone: normalized };
    });
  }, [selectedSeller?.isSiteTeam, siteTeamPhone]);

  useEffect(() => {
    if (selectedSeller?.isSiteTeam) return;
    const normalized = normalizeSiteTeamPhoneForTextInput(siteTeamPhone);
    if (!normalized) return;

    setFormData((prev) => {
      if (prev.phone !== normalized) return prev;
      return { ...prev, phone: '' };
    });
  }, [selectedSeller?.isSiteTeam, siteTeamPhone]);

  // باقات الترويج المتاحة
  const promotionPackages = [
    {
      id: 'free',
      name: 'مجاني',
      price: 0,
      days: 0,
      features: ['ظهور عادي في نتائج البحث'],
      color: 'slate',
      popular: false,
    },
    {
      id: 'bronze',
      name: 'برونزي',
      price: 50,
      days: 7,
      features: ['ظهور مميز لمدة 7 أيام', 'شارة برونزية', 'أولوية في البحث'],
      color: 'amber',
      popular: false,
    },
    {
      id: 'silver',
      name: 'فضي',
      price: 100,
      days: 15,
      features: ['ظهور مميز لمدة 15 يوم', 'شارة فضية', 'أولوية عالية في البحث', 'إشعارات للعملاء'],
      color: 'slate',
      popular: false,
    },
    {
      id: 'gold',
      name: 'ذهبي',
      price: 200,
      days: 30,
      features: [
        'ظهور مميز لمدة 30 يوم',
        'شارة ذهبية',
        'أولوية قصوى',
        'إشعارات + ترويج',
        'دعم أولوية',
      ],
      color: 'yellow',
      popular: true,
    },
    {
      id: 'premium',
      name: 'بريميوم',
      price: 350,
      days: 60,
      features: [
        'ظهور مميز لمدة 60 يوم',
        'شارة بريميوم',
        'ظهور في الصفحة الرئيسية',
        'ترويج على وسائل التواصل',
        'دعم VIP',
      ],
      color: 'purple',
      popular: false,
    },
  ];

  // فلترة المدن حسب البحث
  const filteredCities = useMemo(() => {
    if (!citySearch) return LIBYAN_CITIES;
    return LIBYAN_CITIES.filter((city) => city.toLowerCase().includes(citySearch.toLowerCase()));
  }, [citySearch]);

  const handleCityToggle = (city: string) => {
    setFormData((prev) => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter((c) => c !== city)
        : [...prev.cities, city],
    }));
  };

  // دالة تحديث أيام العمل
  const toggleWorkingDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter((d) => d !== day)
        : [...prev.workingDays, day],
    }));
  };

  // دالة تحديث الصور
  const handleImagesChange = (newImages: string[]) => {
    setFormData((prev) => ({ ...prev, images: newImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.companyName ||
      (shouldRequirePhone && !formData.phone) ||
      formData.cities.length === 0
    ) {
      alert('الرجاء ملء جميع الحقول المطلوبة');
      return;
    }

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        userId: selectedSeller?.id || undefined,
        // تحويل المصفوفات لنصوص مفصولة بفاصلة للتوافق مع API
        availableDays: formData.workingDays.join(','),
        imagesString: formData.images.join(','),
      };

      const res = await fetch('/api/admin/transport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert('تم إضافة خدمة النقل بنجاح');
        router.push('/admin/transport');
      } else {
        console.error('خطأ في إنشاء الخدمة:', data);
        alert(data.message || 'حدث خطأ في إنشاء الخدمة');
      }
    } catch (err) {
      console.error('خطأ في الاتصال:', err);
      alert('حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="إضافة خدمة نقل">
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/transport"
          className="flex items-center gap-2 text-slate-400 hover:text-white"
        >
          <ArrowRightIcon className="h-5 w-5" />
          العودة لخدمات النقل
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-6 flex items-center gap-2 text-lg font-bold text-white">
            <TruckIcon className="h-6 w-6 text-blue-400" />
            معلومات الخدمة
          </h2>

          <div className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                اسم الشركة / الخدمة <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                placeholder="مثال: خدمات النقل السريع"
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">اسم المالك</label>
                <div className="relative">
                  <UserIcon className="absolute right-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    placeholder="الاسم الكامل"
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 py-3 pl-4 pr-10 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  رقم الهاتف {shouldRequirePhone && <span className="text-red-400">*</span>}
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute right-3 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09xxxxxxxx"
                    disabled={isSiteTeamSeller && !!siteTeamPhone}
                    className="w-full rounded-lg border border-slate-600 bg-slate-700 py-3 pl-4 pr-10 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">نوع المركبة</label>
                <select
                  value={formData.vehicleType}
                  onChange={(e) => setFormData({ ...formData, vehicleType: e.target.value })}
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                >
                  {TRANSPORT_VEHICLE_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  عدد المركبات
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.vehicleCount}
                  onChange={(e) =>
                    setFormData({ ...formData, vehicleCount: parseInt(e.target.value) })
                  }
                  className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <MapPinIcon className="h-6 w-6 text-green-400" />
            مناطق الخدمة <span className="text-red-400">*</span>
            <span className="mr-auto text-sm font-normal text-slate-400">
              ({formData.cities.length} مدينة مختارة)
            </span>
          </h2>

          {/* حقل البحث */}
          <div className="mb-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="ابحث عن مدينة..."
                value={citySearch}
                onChange={(e) => setCitySearch(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-700 py-2.5 pl-4 pr-10 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* أزرار التحكم السريع */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, cities: [...LIBYAN_CITIES] }))}
              className="flex items-center gap-1 rounded-lg bg-blue-600/20 px-3 py-1.5 text-sm text-blue-400 transition-colors hover:bg-blue-600/30"
            >
              <CheckCircleIcon className="h-4 w-4" />
              تحديد الكل
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, cities: [] }))}
              className="flex items-center gap-1 rounded-lg bg-slate-600/50 px-3 py-1.5 text-sm text-slate-300 transition-colors hover:bg-slate-600"
            >
              <XMarkIcon className="h-4 w-4" />
              إلغاء الكل
            </button>
          </div>

          {/* قائمة المدن */}
          <div className="max-h-72 overflow-y-auto rounded-lg border border-slate-600 bg-slate-700/30 p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {filteredCities.map((city) => (
                <label
                  key={city}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 transition-all ${
                    formData.cities.includes(city)
                      ? 'border-green-500 bg-green-500/20 text-green-400'
                      : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.cities.includes(city)}
                    onChange={() => handleCityToggle(city)}
                    className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-green-500"
                  />
                  <span className="text-sm">{city}</span>
                </label>
              ))}
            </div>
            {filteredCities.length === 0 && (
              <div className="py-4 text-center text-slate-400">لا توجد مدن مطابقة للبحث</div>
            )}
          </div>

          {/* عرض المدن المختارة */}
          {formData.cities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {formData.cities.slice(0, 10).map((city) => (
                <span
                  key={city}
                  className="flex items-center gap-1 rounded-full bg-green-500/20 px-3 py-1 text-sm text-green-400"
                >
                  {city}
                  <button
                    type="button"
                    onClick={() => handleCityToggle(city)}
                    className="mr-1 rounded-full hover:bg-green-500/30"
                  >
                    <XMarkIcon className="h-3.5 w-3.5" />
                  </button>
                </span>
              ))}
              {formData.cities.length > 10 && (
                <span className="rounded-full bg-slate-600 px-3 py-1 text-sm text-slate-300">
                  +{formData.cities.length - 10} مدينة أخرى
                </span>
              )}
            </div>
          )}
        </div>

        {/* قسم باقات الترويج */}
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <SparklesIcon className="h-6 w-6 text-amber-400" />
            باقات الترويج
            <span className="mr-auto text-sm font-normal text-slate-400">(اختياري)</span>
          </h2>

          <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
            {promotionPackages.map((pkg) => {
              const isSelected = formData.promotionPackage === pkg.id;
              const accentText =
                pkg.color === 'yellow'
                  ? 'text-yellow-400'
                  : pkg.color === 'purple'
                    ? 'text-purple-400'
                    : pkg.color === 'amber'
                      ? 'text-amber-400'
                      : 'text-slate-300';
              const accentIconBg =
                pkg.color === 'yellow'
                  ? 'bg-yellow-500/15'
                  : pkg.color === 'purple'
                    ? 'bg-purple-500/15'
                    : pkg.color === 'amber'
                      ? 'bg-amber-500/15'
                      : 'bg-slate-600/50';
              const accentIconText =
                pkg.color === 'yellow'
                  ? 'text-yellow-400'
                  : pkg.color === 'purple'
                    ? 'text-purple-400'
                    : pkg.color === 'amber'
                      ? 'text-amber-400'
                      : 'text-slate-400';

              const selectedClasses =
                pkg.color === 'yellow'
                  ? 'border-yellow-500/60 ring-2 ring-yellow-500/25'
                  : pkg.color === 'purple'
                    ? 'border-purple-500/60 ring-2 ring-purple-500/25'
                    : pkg.color === 'amber'
                      ? 'border-amber-500/60 ring-2 ring-amber-500/25'
                      : 'border-blue-500/60 ring-2 ring-blue-500/25';

              const featuresPreview = pkg.features.slice(0, 3);
              const remainingFeatures = Math.max(0, pkg.features.length - featuresPreview.length);

              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() =>
                    setFormData({ ...formData, promotionPackage: pkg.id, promotionDays: pkg.days })
                  }
                  className={`group relative w-full overflow-hidden rounded-2xl border bg-slate-900/30 p-3 text-right transition-all hover:-translate-y-0.5 hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 ${
                    isSelected ? selectedClasses : 'border-slate-700'
                  }`}
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

                  {pkg.popular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                      <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-xs font-bold text-black">
                        الأكثر شعبية
                      </span>
                    </div>
                  )}

                  {isSelected && (
                    <div className="absolute left-2 top-2 rounded-full bg-emerald-500/15 p-1">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                    </div>
                  )}

                  <div className="relative flex items-start gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentIconBg}`}
                    >
                      <StarIcon className={`h-4 w-4 ${accentIconText}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate text-sm font-bold text-white">{pkg.name}</h3>
                        {pkg.days > 0 && (
                          <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2 py-0.5 text-[11px] text-slate-300">
                            {pkg.days} يوم
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-end justify-between gap-2">
                        <div className={`text-lg font-bold ${accentText}`}>
                          {pkg.price === 0 ? '0 د.ل' : `${pkg.price} د.ل`}
                        </div>
                        {pkg.price > 0 && (
                          <span className="text-[11px] text-slate-400">شامل الترويج</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="relative mt-2">
                    <ul className="space-y-1 text-[11px] text-slate-300">
                      {featuresPreview.map((feature, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <CheckCircleIcon className="h-3 w-3 flex-shrink-0 text-emerald-400" />
                          <span className="line-clamp-1">{feature}</span>
                        </li>
                      ))}
                      {remainingFeatures > 0 && (
                        <li className="text-[11px] text-slate-500">+ {remainingFeatures} المزيد</li>
                      )}
                    </ul>
                  </div>
                </button>
              );
            })}
          </div>

          {formData.promotionPackage !== 'free' && (
            <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
              <p className="flex items-center gap-2 text-sm text-amber-300">
                <SparklesIcon className="h-4 w-4" />
                سيتم تمييز هذه الخدمة لمدة {formData.promotionDays} يوم بعد الإنشاء
              </p>
            </div>
          )}
        </div>

        {/* قسم وصف الساحبة */}
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <TruckIcon className="h-6 w-6 text-blue-400" />
            وصف الساحبة والخدمة
          </h2>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                وصف الساحبة (اختياري)
              </label>
              <textarea
                value={formData.truckDescription}
                onChange={(e) => setFormData({ ...formData, truckDescription: e.target.value })}
                rows={3}
                placeholder="مثال: ساحبة حديثة موديل 2020، حالة ممتازة، مجهزة بأحدث أنظمة الأمان..."
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">يساعد في جذب المزيد من العملاء</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-300">
                العنوان / الوصف المختصر <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="سيتم ملء هذا الحقل تلقائياً عند اختيار نوع الساحبة والمدن"
                className="w-full rounded-lg border border-slate-600 bg-slate-700 px-4 py-3 text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-slate-400">يمكنك تعديل العنوان حسب الحاجة</p>
            </div>
          </div>
        </div>

        {/* قسم أيام العمل */}
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <ClockIcon className="h-6 w-6 text-purple-400" />
            أيام العمل
            <span className="mr-auto text-sm font-normal text-slate-400">
              ({formData.workingDays.length} أيام مختارة)
            </span>
          </h2>
          <p className="mb-4 text-sm text-slate-400">حدد الأيام التي تتوفر فيها لتقديم الخدمة</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {WEEK_DAYS.map((day) => (
              <label
                key={day.value}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2.5 transition-all ${
                  formData.workingDays.includes(day.value)
                    ? 'border-purple-500 bg-purple-500/20 text-purple-400'
                    : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.workingDays.includes(day.value)}
                  onChange={() => toggleWorkingDay(day.value)}
                  className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-purple-500"
                />
                <span className="text-sm font-medium">{day.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() =>
                setFormData((prev) => ({ ...prev, workingDays: WEEK_DAYS.map((d) => d.value) }))
              }
              className="rounded-lg bg-purple-600/20 px-3 py-1.5 text-sm text-purple-400 hover:bg-purple-600/30"
            >
              تحديد الكل
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, workingDays: [] }))}
              className="rounded-lg bg-slate-600/50 px-3 py-1.5 text-sm text-slate-300 hover:bg-slate-600"
            >
              إلغاء الكل
            </button>
          </div>
        </div>

        {/* قسم تحديد موقع الخدمة على الخريطة */}
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-6">
          <LocationPickerSection
            value={{
              coordinates: formData.coordinates,
              detailedAddress: formData.detailedAddress,
            }}
            onChange={(location: LocationData) => {
              setFormData((prev) => ({
                ...prev,
                coordinates: location.coordinates,
                detailedAddress: location.detailedAddress || '',
              }));
            }}
            title="موقع الخدمة على الخريطة"
            description="تحديد موقع الخدمة يساعد العملاء في العثور عليك بسهولة"
            isOptional={true}
          />
        </div>

        {/* قسم البائع (صاحب الخدمة) */}
        <div className="mt-6">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <SellerSelector
              value={selectedSeller}
              onChange={setSelectedSeller}
              required={false}
              label="مالك الخدمة (اختياري)"
            />
            <p className="mt-2 text-xs text-amber-400">
              يمكنك تحديد مالك الخدمة إذا كان مختلفاً عن البيانات المدخلة أعلاه
            </p>
          </div>
        </div>

        {/* قسم رفع الصور */}
        <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
            <PhotoIcon className="h-6 w-6 text-indigo-400" />
            صور الساحبة
            <span className="mr-auto text-sm font-normal text-slate-400">
              ({formData.images.length}/5 صور)
            </span>
          </h2>
          <p className="mb-4 text-sm text-slate-400">
            أضف صور واضحة للساحبة لجذب المزيد من العملاء
          </p>
          <TransportImageUploader
            images={formData.images}
            onImagesChange={handleImagesChange}
            maxImages={5}
            disabled={loading}
          />
        </div>
      </form>

      {/* شريط الأزرار الثابت */}
      <StickyActionBar
        leftButton={{
          label: 'إلغاء',
          onClick: () => router.push('/admin/transport'),
          variant: 'secondary',
        }}
        rightButton={{
          label: 'إضافة الخدمة',
          onClick: () => {
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          },
          variant: 'primary',
          disabled: loading,
          loading: loading,
          loadingText: 'جاري الإضافة...',
        }}
      />
    </AdminLayout>
  );
}
