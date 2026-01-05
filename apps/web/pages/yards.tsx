/**
 * صفحة الساحات - قائمة ساحات المزادات
 * Yards Page - Auction Yards Listing
 * تصميم فاتح متوافق مع موقع الويب
 */

import { OpensooqNavbar } from '@/components/common';
import AdvancedFooter from '@/components/common/Footer/AdvancedFooter';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { dayLabels, type Yard, type YardStats } from '@/data/yards-data';
import {
  ArrowLeftIcon,
  BuildingOfficeIcon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  MapPinIcon,
  PhoneIcon,
  StarIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { getCityNames, getMainCities } from '@sooq-mazad/utils';
import Head from 'next/head';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

export default function YardsPage() {
  const [yards, setYards] = useState<Yard[]>([]);
  const [stats, setStats] = useState<YardStats>({ total: 0, totalCapacity: 0, activeAuctions: 0 });
  const [auctionStats, setAuctionStats] = useState({ upcoming: 0, live: 0, sold: 0, ended: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('all');

  useEffect(() => {
    fetchYards();
  }, []);

  const fetchYards = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/yards');
      const data = await res.json();
      if (data.success) {
        setYards(data.yards || []);
        setStats(data.stats || { total: 0, totalCapacity: 0, activeAuctions: 0 });
        // إحصائيات المزادات موجودة داخل stats
        setAuctionStats(data.stats?.auctionStats || { upcoming: 0, live: 0, sold: 0, ended: 0 });
      }
    } catch (error) {
      console.error('Error fetching yards:', error);
    } finally {
      setLoading(false);
    }
  };

  // استخدام قائمة المدن الليبية الكاملة من البيانات المشتركة
  const allCities = useMemo(() => getCityNames(), []);
  const mainCities = useMemo(() => getMainCities().map((c) => c.name), []);

  // المدن التي تحتوي على ساحات (للعرض أولاً)
  const citiesWithYards = useMemo(() => [...new Set(yards.map((y) => y.city))], [yards]);

  const filteredYards = useMemo(() => {
    return yards.filter((yard) => {
      const matchesSearch =
        !search ||
        yard.name.toLowerCase().includes(search.toLowerCase()) ||
        yard.city.toLowerCase().includes(search.toLowerCase()) ||
        yard.description?.toLowerCase().includes(search.toLowerCase());
      const matchesCity = cityFilter === 'all' || yard.city === cityFilter;
      return matchesSearch && matchesCity;
    });
  }, [yards, search, cityFilter]);

  return (
    <>
      <Head>
        <title>ساحات المزادات | سوق مزاد</title>
        <meta
          name="description"
          content="تصفح ساحات المزادات المعتمدة في ليبيا - طرابلس، بنغازي، مصراتة والمزيد"
        />
      </Head>

      <OpensooqNavbar />

      <main className="min-h-screen bg-gray-50" dir="rtl">
        {/* Hero Section - شريط مضغوط */}
        <div className="relative overflow-hidden bg-gradient-to-l from-blue-700 via-blue-800 to-blue-900 py-3">
          <div className="container relative z-10 mx-auto px-4">
            {/* صف واحد يجمع كل المحتوى */}
            <div className="flex flex-col items-center gap-3 md:flex-row md:justify-between md:gap-4">
              {/* العنوان والوصف - الجانب الأيمن */}
              <div className="flex items-center gap-3 text-center md:text-right">
                <div className="hidden h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-white/20 md:flex">
                  <BuildingOfficeIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white md:text-xl">ساحات المزادات</h1>
                  <p className="hidden text-xs text-blue-200 md:block">
                    معاينة السيارات والمزايدة حضورياً
                  </p>
                </div>
              </div>

              {/* إحصائيات المزادات - 4 عناصر في صف */}
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-3">
                {/* مزاد قادم */}
                <div className="flex items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/20 px-3 py-1.5 backdrop-blur-sm">
                  <CalendarDaysIcon className="h-4 w-4 text-amber-300" />
                  <span className="text-lg font-bold text-white">{auctionStats.upcoming}</span>
                  <span className="hidden text-xs text-amber-200 sm:inline">قادم</span>
                </div>

                {/* مزاد مباشر */}
                <div className="flex items-center gap-2 rounded-lg border border-red-400/40 bg-red-500/20 px-3 py-1.5 backdrop-blur-sm">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500"></span>
                  </span>
                  <span className="text-lg font-bold text-white">{auctionStats.live}</span>
                  <span className="hidden text-xs text-red-200 sm:inline">مباشر</span>
                </div>

                {/* تم البيع */}
                <div className="flex items-center gap-2 rounded-lg border border-green-400/40 bg-green-500/20 px-3 py-1.5 backdrop-blur-sm">
                  <CheckBadgeIcon className="h-4 w-4 text-green-300" />
                  <span className="text-lg font-bold text-white">{auctionStats.sold}</span>
                  <span className="hidden text-xs text-green-200 sm:inline">مباع</span>
                </div>

                {/* منتهي */}
                <div className="flex items-center gap-2 rounded-lg border border-slate-400/40 bg-slate-500/20 px-3 py-1.5 backdrop-blur-sm">
                  <ClockIcon className="h-4 w-4 text-slate-300" />
                  <span className="text-lg font-bold text-white">{auctionStats.ended}</span>
                  <span className="hidden text-xs text-slate-200 sm:inline">منتهي</span>
                </div>
              </div>

              {/* إحصائيات الساحات - الجانب الأيسر */}
              <div className="hidden items-center gap-3 lg:flex">
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                  <BuildingOfficeIcon className="h-3.5 w-3.5" />
                  <span>{stats.total} ساحة</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                  <StarIcon className="h-3.5 w-3.5 text-yellow-300" />
                  <span>{stats.totalCapacity} سعة</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="container mx-auto px-4 py-5">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md">
            {/* حقول البحث مع العنوان في صف واحد */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              {/* أيقونة العنوان */}
              <div className="hidden h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 lg:flex">
                <MagnifyingGlassIcon className="h-4 w-4 text-blue-600" />
              </div>

              {/* حقل البحث الرئيسي */}
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="ابحث عن ساحة أو منطقة..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-3 pr-11 text-base text-gray-900 placeholder-gray-400 transition-all duration-200 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* فلتر المدينة */}
              <div className="lg:w-56">
                <SearchableSelect
                  value={cityFilter}
                  onChange={(val) => setCityFilter(val || 'all')}
                  options={[
                    { value: 'all', label: 'جميع المدن' },
                    ...citiesWithYards.map((city) => ({ value: city, label: `${city}` })),
                    ...mainCities
                      .filter((city) => !citiesWithYards.includes(city))
                      .map((city) => ({ value: city, label: city })),
                    ...allCities
                      .filter(
                        (city) => !citiesWithYards.includes(city) && !mainCities.includes(city),
                      )
                      .map((city) => ({ value: city, label: city })),
                  ]}
                  placeholder="المدينة"
                  searchable={true}
                  clearable={false}
                  size="md"
                />
              </div>

              {/* زر البحث للموبايل */}
              <button className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white transition-colors hover:bg-blue-700 lg:hidden">
                <MagnifyingGlassIcon className="h-4 w-4" />
                بحث
              </button>

              {/* عداد النتائج - يظهر في نفس الصف على الشاشات الكبيرة */}
              {!loading && (
                <div className="hidden items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600 lg:flex">
                  <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                  <span className="font-bold text-blue-600">{filteredYards.length}</span>
                  <span>ساحة</span>
                </div>
              )}
            </div>

            {/* عداد النتائج للموبايل */}
            {!loading && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 lg:hidden">
                <BuildingOfficeIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  تم العثور على{' '}
                  <span className="font-bold text-blue-600">{filteredYards.length}</span> ساحة
                  {search && <span className="text-gray-400"> للبحث "{search}"</span>}
                  {cityFilter !== 'all' && <span className="text-gray-400"> في {cityFilter}</span>}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Yards Grid */}
        <div className="container mx-auto px-4 pb-12">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-r-transparent" />
              <p className="mt-4 text-gray-500">جاري تحميل الساحات...</p>
            </div>
          ) : filteredYards.length === 0 ? (
            <div className="py-12 text-center">
              <BuildingOfficeIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
              <p className="text-lg text-gray-500">لا توجد ساحات نشطة حالياً</p>
              {stats.total === 0 && (
                <p className="mt-2 text-sm text-gray-400">
                  (إجمالي الساحات في قاعدة البيانات: {(stats as any).totalInDatabase || 0})
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredYards.map((yard) => {
                const hasRealImage =
                  !!yard.image &&
                  !yard.image.includes('default-yard') &&
                  !yard.image.includes('placeholder');

                return (
                  <Link
                    key={yard.id}
                    href={`/yards/${yard.slug}`}
                    className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:border-blue-400 hover:shadow-xl hover:ring-1 hover:ring-blue-400"
                  >
                    {/* قسم الصورة - الجزء العلوي */}
                    <div className="relative h-44 w-full shrink-0 overflow-hidden bg-gray-100">
                      {hasRealImage ? (
                        <>
                          <Image
                            src={yard.image}
                            alt={yard.name}
                            fill
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
                        </>
                      ) : (
                        <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-900">
                          {/* الخلفية الشبكية والمؤثرات */}
                          <div className="absolute inset-0">
                            {/* Grid Pattern */}
                            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                            {/* Radar Scan Effect */}
                            <div className="absolute inset-0 overflow-hidden opacity-30">
                              <div className="absolute -left-[50%] -top-[50%] h-[200%] w-[200%] animate-[spin_4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0_340deg,rgba(59,130,246,0.2)_360deg)]"></div>
                            </div>

                            {/* Ambient Glow */}
                            <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-3xl"></div>
                          </div>

                          {/* المحتوى الرئيسي */}
                          <div className="relative z-10 flex h-full flex-col justify-between p-4">
                            {/* Header */}
                            <div className="text-center">
                              <h3 className="truncate text-lg font-bold text-white drop-shadow-md">
                                {yard.name}
                              </h3>
                              <div className="mx-auto mt-1 h-0.5 w-16 rounded-full bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_8px_#3b82f6]"></div>
                            </div>

                            {/* Center 3D Element */}
                            <div className="relative flex flex-1 items-center justify-center py-2">
                              <div className="group/icon relative">
                                <div className="absolute inset-0 animate-ping rounded-xl bg-blue-500 opacity-10 duration-1000"></div>
                                <div className="relative flex h-14 w-14 transform items-center justify-center rounded-xl border border-blue-500/30 bg-gradient-to-br from-slate-800 to-slate-900 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all duration-500 group-hover:-translate-y-2 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                                  <BuildingOfficeIcon className="h-7 w-7 text-blue-400 drop-shadow-[0_0_5px_rgba(96,165,250,0.8)]" />
                                </div>
                              </div>
                            </div>

                            {/* Footer Stats (HUD Style) */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* Auctions Count */}
                              <div className="relative overflow-hidden rounded-lg border border-blue-500/20 bg-slate-800/60 p-1.5 text-center backdrop-blur-sm">
                                <div className="absolute inset-0 bg-blue-500/5"></div>
                                <p className="text-[10px] text-blue-300/80">المزادات</p>
                                <p className="font-mono text-sm font-bold text-blue-400">
                                  {yard.activeAuctions}
                                </p>
                              </div>

                              {/* Bids Count (Simulated for UI) */}
                              <div className="relative overflow-hidden rounded-lg border border-amber-500/20 bg-slate-800/60 p-1.5 text-center backdrop-blur-sm">
                                <div className="absolute inset-0 bg-amber-500/5"></div>
                                <p className="text-[10px] text-amber-300/80">المزايدات</p>
                                <p className="font-mono text-sm font-bold text-amber-400">
                                  {yard.activeAuctions > 0
                                    ? Math.floor(yard.activeAuctions * 4.2)
                                    : 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* قسم المعلومات - الجزء السفلي */}
                    <div className="flex flex-1 flex-col justify-between bg-white p-3.5">
                      {/* الجزء العلوي: العنوان والموقع */}
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="line-clamp-1 text-base font-bold text-gray-900 transition-colors group-hover:text-blue-600">
                              {yard.name}
                            </h3>
                            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-500">
                              <MapPinIcon className="h-3 w-3 text-gray-400" />
                              <span>
                                {yard.city}
                                {yard.area && `، ${yard.area}`}
                              </span>
                            </div>
                          </div>

                          {/* التقييم */}
                          {yard.rating && yard.rating > 0 && (
                            <div className="flex items-center gap-1 rounded-md border border-amber-100 bg-amber-50 px-1.5 py-0.5">
                              <span className="text-xs font-bold text-amber-700">
                                {yard.rating}
                              </span>
                              <StarIcon className="h-3 w-3 fill-amber-400 text-amber-400" />
                            </div>
                          )}
                        </div>

                        {/* شريط المعلومات السريع */}
                        <div className="mt-3 space-y-2 border-t border-gray-100 pt-2">
                          <div className="flex items-center justify-between rounded-md bg-gray-50 px-2.5 py-1.5">
                            <span className="text-[10px] font-medium text-gray-500">
                              المزادات النشطة
                            </span>
                            <div className="flex items-center gap-1.5">
                              <div
                                className={`h-1.5 w-1.5 rounded-full ${yard.activeAuctions > 0 ? 'animate-pulse bg-green-500' : 'bg-gray-300'}`}
                              ></div>
                              <span
                                className={`text-[10px] font-bold ${yard.activeAuctions > 0 ? 'text-green-700' : 'text-gray-500'}`}
                              >
                                {yard.activeAuctions} مزاد
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="flex flex-col gap-0.5 px-1">
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <CalendarDaysIcon className="h-3 w-3" />
                                <span className="text-[9px]">أيام العمل</span>
                              </div>
                              <span className="truncate text-[10px] font-semibold text-gray-700">
                                {yard.auctionDays && yard.auctionDays.length > 0
                                  ? yard.auctionDays.map((d) => dayLabels[d] || d).join('، ')
                                  : 'غير محدد'}
                              </span>
                            </div>

                            <div className="flex flex-col gap-0.5 px-1">
                              <div className="flex items-center gap-1.5 text-gray-500">
                                <MapPinIcon className="h-3 w-3" />
                                <span className="text-[9px]">العنوان</span>
                              </div>
                              <span
                                className="truncate text-[10px] font-medium text-gray-600"
                                title={yard.address}
                              >
                                {yard.address || 'العنوان غير متوفر'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* الجزء السفلي: أزرار التواصل والإجراءات */}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-gray-100 pt-3">
                        <div className="flex items-center gap-2">
                          {/* أزرار التواصل المصغرة */}
                          {(yard.phone || yard.managerPhone) && (
                            <div className="flex gap-1.5">
                              {yard.phone && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.location.href = `tel:${yard.phone}`;
                                  }}
                                  className="group/btn flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 shadow-sm transition-colors hover:bg-green-50 hover:text-green-600"
                                  title="اتصال بالساحة"
                                >
                                  <PhoneIcon className="h-3.5 w-3.5" />
                                </button>
                              )}
                              {yard.managerPhone && (
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    window.location.href = `tel:${yard.managerPhone}`;
                                  }}
                                  className="group/btn flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 shadow-sm transition-colors hover:bg-blue-50 hover:text-blue-600"
                                  title="اتصال بالمدير"
                                >
                                  <UserIcon className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-blue-600 transition-colors group-hover:text-blue-700">
                          <span className="text-[10px] font-bold group-hover:underline">
                            عرض التفاصيل
                          </span>
                          <ArrowLeftIcon className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <AdvancedFooter />
    </>
  );
}
