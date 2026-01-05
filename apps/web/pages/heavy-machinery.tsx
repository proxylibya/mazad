import CogIcon from '@heroicons/react/24/outline/CogIcon';
import HeartIcon from '@heroicons/react/24/outline/HeartIcon';
import ListBulletIcon from '@heroicons/react/24/outline/ListBulletIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import Squares2X2Icon from '@heroicons/react/24/outline/Squares2X2Icon';
import TruckIcon from '@heroicons/react/24/outline/TruckIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { Layout } from '../components/common';
import SelectField from '../components/ui/SelectField';
import { libyanCities } from '../data/libyan-cities';
import { formatNumber } from '../utils/numberUtils';

// فئات المعدات الثقيلة
const machineryCategories = [
  'جميع الفئات',
  'حفارات',
  'جرافات',
  'رافعات',
  'شاحنات ثقيلة',
  'معدات بناء',
  'معدات زراعية',
  'معدات تعدين',
  'معدات طرق',
  'أخرى',
];

const machineryConditions = [
  'جميع الحالات',
  'جديد',
  'مستعمل - ممتاز',
  'مستعمل - جيد',
  'مستعمل - مقبول',
  'يحتاج صيانة',
];

const machineryBrands = [
  'جميع الماركات',
  'كاتربيلر',
  'كوماتسو',
  'هيتاشي',
  'فولفو',
  'ليبهر',
  'دوسان',
  'هيونداي',
  'كيس',
  'جي سي بي',
  'بوبكات',
  'كوبوتا',
  'أخرى',
];

const machineryYears = [
  'جميع السنوات',
  '2024',
  '2023',
  '2022',
  '2021',
  '2020',
  '2019',
  '2018',
  '2017',
  '2016',
  '2015',
  '2014',
  '2013',
  '2012',
  '2011',
  '2010',
  'أقدم من 2010',
];

interface HeavyMachinery {
  id: string;
  title: string;
  price: number;
  category: string;
  condition: string;
  brand: string;
  year: string;
  location: string;
  images: string[];
  description: string;
  negotiable: boolean;
  urgent: boolean;
  phone: string;
  workingHours?: number;
  createdAt: string;
  user: {
    id: string;
    name: string;
    phone: string;
    verified: boolean;
  };
}

interface HeavyMachineryPageProps {
  machinery: HeavyMachinery[];
  stats: {
    total: number;
    negotiable: number;
    urgent: number;
    newMachinery: number;
  };
}

const HeavyMachineryPage: React.FC<HeavyMachineryPageProps> = ({
  machinery: initialMachinery,
  stats,
}) => {
  const router = useRouter();
  const [machinery, setMachinery] = useState<HeavyMachinery[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [screenWidth, setScreenWidth] = useState<number>(0);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [favorites, setFavorites] = useState<string[]>([]);

  // فلاتر البحث
  const [filters, setFilters] = useState({
    searchQuery: '',
    location: 'جميع المدن',
    category: 'جميع الفئات',
    brand: 'جميع الماركات',
    condition: 'جميع الحالات',
    year: 'جميع السنوات',
    priceMin: null as number | null,
    priceMax: null as number | null,
  });

  // تحديث عرض الشاشة
  useEffect(() => {
    const updateScreenWidth = () => {
      setScreenWidth(window.innerWidth);
    };

    updateScreenWidth();
    window.addEventListener('resize', updateScreenWidth);
    return () => window.removeEventListener('resize', updateScreenWidth);
  }, []);

  // تحديث البيانات عند التحميل
  useEffect(() => {
    // محاكاة بيانات المعدات الثقيلة
    const mockMachinery: HeavyMachinery[] = [
      {
        id: '1',
        title: 'حفارة كاتربيلر 320D',
        price: 450000,
        category: 'حفارات',
        condition: 'مستعمل - ممتاز',
        brand: 'كاتربيلر',
        year: '2018',
        location: 'طرابلس',
        images: ['/images/machinery/excavator1.jpg'],
        description: 'حفارة كاتربيلر 320D في حالة ممتازة، ساعات عمل قليلة، جاهزة للعمل',
        negotiable: true,
        urgent: false,
        phone: '091-234-5678',
        workingHours: 3500,
        createdAt: '2024-01-15',
        user: {
          id: 'user1',
          name: 'أحمد محمد',
          phone: '091-234-5678',
          verified: true,
        },
      },
      {
        id: '2',
        title: 'جرافة كوماتسو D65',
        price: 320000,
        category: 'جرافات',
        condition: 'مستعمل - جيد',
        brand: 'كوماتسو',
        year: '2016',
        location: 'بنغازي',
        images: ['/images/machinery/bulldozer1.jpg'],
        description: 'جرافة كوماتسو D65 للبيع، تحتاج صيانة بسيطة',
        negotiable: false,
        urgent: true,
        phone: '092-345-6789',
        workingHours: 5200,
        createdAt: '2024-01-14',
        user: {
          id: 'user2',
          name: 'سالم علي',
          phone: '092-345-6789',
          verified: true,
        },
      },
    ];

    setMachinery(mockMachinery);
  }, []);

  // تطبيق الفلاتر
  const filteredMachinery = machinery.filter((machine) => {
    const matchesSearch =
      machine.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      machine.description.toLowerCase().includes(filters.searchQuery.toLowerCase());
    const matchesLocation =
      filters.location === 'جميع المدن' || machine.location === filters.location;
    const matchesCategory =
      filters.category === 'جميع الفئات' || machine.category === filters.category;
    const matchesBrand = filters.brand === 'جميع الماركات' || machine.brand === filters.brand;
    const matchesCondition =
      filters.condition === 'جميع الحالات' || machine.condition === filters.condition;
    const matchesYear = filters.year === 'جميع السنوات' || machine.year === filters.year;
    const matchesPriceMin = filters.priceMin === null || machine.price >= filters.priceMin;
    const matchesPriceMax = filters.priceMax === null || machine.price <= filters.priceMax;

    return (
      matchesSearch &&
      matchesLocation &&
      matchesCategory &&
      matchesBrand &&
      matchesCondition &&
      matchesYear &&
      matchesPriceMin &&
      matchesPriceMax
    );
  });

  // معالج تغيير الفلاتر
  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // إعادة تعيين الفلاتر
  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      location: 'جميع المدن',
      category: 'جميع الفئات',
      brand: 'جميع الماركات',
      condition: 'جميع الحالات',
      year: 'جميع السنوات',
      priceMin: null,
      priceMax: null,
    });
  };

  // تبديل المفضلة
  const toggleFavorite = (machineId: string) => {
    setFavorites((prev) =>
      prev.includes(machineId) ? prev.filter((id) => id !== machineId) : [...prev, machineId],
    );
  };

  return (
    <Layout>
      <Head>
        <title>المعدات والآليات الثقيلة - سوق السيارات الليبي</title>
        <meta name="description" content="تصفح وابحث عن المعدات والآليات الثقيلة في ليبيا" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="border-b bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TruckIcon className="h-8 w-8 text-yellow-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">المعدات والآليات الثقيلة</h1>
                  <p className="text-gray-600">
                    اعثر على المعدات الثقيلة والآليات المناسبة لمشروعك
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* إحصائيات سريعة */}
                <div className="hidden items-center gap-6 text-sm md:flex">
                  <div className="text-center">
                    <div className="font-bold text-yellow-600">
                      {formatNumber(stats?.total || 821)}
                    </div>
                    <div className="text-gray-500">إجمالي المعدات</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-green-600">
                      {formatNumber(stats?.negotiable || 365)}
                    </div>
                    <div className="text-gray-500">قابل للتفاوض</div>
                  </div>
                </div>

                {/* أزرار العرض */}
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`rounded-md p-2 transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white text-yellow-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <ListBulletIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`rounded-md p-2 transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white text-yellow-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Squares2X2Icon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* فلتر محمول للشاشات الصغيرة */}
        {screenWidth <= 660 && (
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div className="rounded-lg border bg-white shadow-sm">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="flex w-full items-center justify-between p-4 text-right"
              >
                <div className="flex items-center gap-2">
                  <MagnifyingGlassIcon className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-gray-800">الفلاتر</span>
                  {(filters.category !== 'جميع الفئات' || filters.brand !== 'جميع الماركات') && (
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs text-yellow-800">
                      {filters.category !== 'جميع الفئات' ? filters.category : ''}
                      {filters.brand !== 'جميع الماركات' ? ` - ${filters.brand}` : ''}
                    </span>
                  )}
                </div>
                <svg
                  className={`h-5 w-5 text-gray-500 transition-transform ${showMobileFilters ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {showMobileFilters && (
                <div className="space-y-4 border-t p-4">
                  {/* البحث */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">البحث</label>
                    <input
                      type="text"
                      placeholder="ابحث عن معدة أو آلية..."
                      value={filters.searchQuery}
                      onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400"
                    />
                  </div>

                  {/* المدينة */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">المدينة</label>
                    <SelectField
                      options={['جميع المدن', ...libyanCities.map((c) => c.name)]}
                      value={filters.location}
                      onChange={(value) => handleFilterChange('location', value)}
                      placeholder="اختر المدينة"
                      size="sm"
                      searchable
                      clearable
                    />
                  </div>

                  {/* فئة المعدة */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      فئة المعدة
                    </label>
                    <SelectField
                      options={machineryCategories}
                      value={filters.category}
                      onChange={(value) => handleFilterChange('category', value)}
                      placeholder="اختر الفئة"
                      size="sm"
                      searchable
                      clearable
                    />
                  </div>

                  {/* الماركة */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">الماركة</label>
                    <SelectField
                      options={machineryBrands}
                      value={filters.brand}
                      onChange={(value) => handleFilterChange('brand', value)}
                      placeholder="اختر الماركة"
                      size="sm"
                      searchable
                      clearable
                    />
                  </div>

                  {/* سنة الصنع */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      سنة الصنع
                    </label>
                    <SelectField
                      options={machineryYears}
                      value={filters.year}
                      onChange={(value) => handleFilterChange('year', value)}
                      placeholder="اختر السنة"
                      size="sm"
                      searchable
                      clearable
                    />
                  </div>

                  {/* حالة المعدة */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      حالة المعدة
                    </label>
                    <SelectField
                      options={machineryConditions}
                      value={filters.condition}
                      onChange={(value) => handleFilterChange('condition', value)}
                      placeholder="اختر الحالة"
                      size="sm"
                      searchable
                      clearable
                    />
                  </div>

                  {/* نطاق السعر */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      نطاق السعر (دينار)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        placeholder="من"
                        value={filters.priceMin || ''}
                        onChange={(e) =>
                          handleFilterChange(
                            'priceMin',
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400"
                      />
                      <input
                        type="number"
                        placeholder="إلى"
                        value={filters.priceMax || ''}
                        onChange={(e) =>
                          handleFilterChange(
                            'priceMax',
                            e.target.value ? parseInt(e.target.value) : null,
                          )
                        }
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  </div>

                  {/* أزرار الإجراءات */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={resetFilters}
                      className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      إزالة الكل
                    </button>
                    <button
                      onClick={() => setShowMobileFilters(false)}
                      className="flex-1 rounded-lg bg-yellow-600 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-700"
                    >
                      تطبيق ({formatNumber(filteredMachinery.length)})
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className={`flex items-start gap-4 ${screenWidth <= 660 ? 'flex-col' : ''}`}>
            {/* فلتر جانبي */}
            <aside className={`w-72 flex-shrink-0 ${screenWidth <= 660 ? 'hidden' : ''}`}>
              <div className="space-y-6 rounded-2xl border bg-white p-5 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                    <MagnifyingGlassIcon className="h-5 w-5 text-yellow-600" />
                    الفلاتر
                  </h3>
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    إزالة الكل
                  </button>
                </div>

                {/* البحث */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    البحث في العنوان والوصف
                  </label>
                  <div className="relative">
                    <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                    <input
                      type="text"
                      placeholder="ابحث عن معدة أو آلية..."
                      value={filters.searchQuery}
                      onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                      className="w-full rounded-lg border border-gray-300 py-2 pl-12 pr-4 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>

                {/* المدينة */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <MapPinIcon className="h-4 w-4 text-green-600" />
                    المدينة
                  </label>
                  <SelectField
                    options={['جميع المدن', ...libyanCities.map((c) => c.name)]}
                    value={filters.location}
                    onChange={(value) => handleFilterChange('location', value)}
                    placeholder="اختر المدينة"
                    searchable
                    clearable
                  />
                </div>

                {/* فئة المعدة */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <TruckIcon className="h-4 w-4 text-yellow-600" />
                    فئة المعدة
                  </label>
                  <SelectField
                    options={machineryCategories}
                    value={filters.category}
                    onChange={(value) => handleFilterChange('category', value)}
                    placeholder="اختر الفئة"
                    searchable
                    clearable
                  />
                </div>

                {/* الماركة */}
                <div>
                  <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                    <CogIcon className="h-4 w-4 text-blue-600" />
                    الماركة
                  </label>
                  <SelectField
                    options={machineryBrands}
                    value={filters.brand}
                    onChange={(value) => handleFilterChange('brand', value)}
                    placeholder="اختر الماركة"
                    searchable
                    clearable
                  />
                </div>

                {/* سنة الصنع */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">سنة الصنع</label>
                  <SelectField
                    options={machineryYears}
                    value={filters.year}
                    onChange={(value) => handleFilterChange('year', value)}
                    placeholder="اختر السنة"
                    searchable
                    clearable
                  />
                </div>

                {/* حالة المعدة */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    حالة المعدة
                  </label>
                  <SelectField
                    options={machineryConditions}
                    value={filters.condition}
                    onChange={(value) => handleFilterChange('condition', value)}
                    placeholder="اختر الحالة"
                    searchable
                    clearable
                  />
                </div>

                {/* نطاق السعر */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    نطاق السعر (دينار)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="من"
                      value={filters.priceMin || ''}
                      onChange={(e) =>
                        handleFilterChange(
                          'priceMin',
                          e.target.value ? parseInt(e.target.value) : null,
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                    />
                    <input
                      type="number"
                      placeholder="إلى"
                      value={filters.priceMax || ''}
                      onChange={(e) =>
                        handleFilterChange(
                          'priceMax',
                          e.target.value ? parseInt(e.target.value) : null,
                        )
                      }
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500"
                    />
                  </div>
                </div>
              </div>
            </aside>

            {/* قائمة المعدات */}
            <div className={`${screenWidth <= 660 ? 'w-full' : 'flex-1'} min-h-0`}>
              <div className="mb-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-bold">
                    <TruckIcon className="h-5 w-5 text-yellow-600" />
                    <span>المعدات المتاحة</span>
                    <span className="text-sm font-normal text-gray-500">
                      ({formatNumber(filteredMachinery.length)} معدة)
                    </span>
                  </h2>

                  {/* عدد النتائج للموبايل */}
                  {screenWidth <= 660 && (
                    <div className="text-sm text-gray-500">
                      {formatNumber(filteredMachinery.length)} نتيجة
                    </div>
                  )}
                </div>

                {/* عرض المعدات */}
                <div
                  className={
                    viewMode === 'grid'
                      ? `grid gap-4 ${
                          screenWidth <= 800
                            ? 'grid-cols-1'
                            : screenWidth < 1080
                              ? 'grid-cols-1 sm:grid-cols-2'
                              : 'grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3'
                        }`
                      : 'space-y-4'
                  }
                >
                  {filteredMachinery.map((machine) => (
                    <div
                      key={machine.id}
                      className="cursor-pointer rounded-lg border bg-white shadow-sm transition-all duration-300 hover:shadow-lg"
                      onClick={() => router.push(`/heavy-machinery/${machine.id}`)}
                    >
                      <div className="p-4">
                        <div className="flex items-start gap-3">
                          <img
                            src={machine.images[0] || '/images/machinery/default-machinery.svg'}
                            alt={machine.title}
                            className="h-16 w-16 rounded-lg object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src !== '/images/machinery/default-machinery.svg') {
                                target.src = '/images/machinery/default-machinery.svg';
                              }
                            }}
                          />
                          <div className="flex-1">
                            <h3 className="mb-1 text-lg font-bold">{machine.title}</h3>
                            <p className="mb-2 text-sm text-gray-600">{machine.description}</p>
                            <div className="mb-2 flex items-center gap-2 text-xs text-gray-500">
                              <span className="rounded bg-yellow-100 px-2 py-1 text-yellow-800">
                                {machine.category}
                              </span>
                              <span className="rounded bg-green-100 px-2 py-1 text-green-800">
                                {machine.condition}
                              </span>
                              <span className="rounded bg-blue-100 px-2 py-1 text-blue-800">
                                {machine.year}
                              </span>
                              {machine.workingHours && (
                                <span className="rounded bg-purple-100 px-2 py-1 text-purple-800">
                                  {formatNumber(machine.workingHours)} ساعة
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xl font-bold text-red-600">
                                {formatNumber(machine.price)} دينار
                              </span>
                              <div className="flex items-center gap-2">
                                <MapPinIcon className="h-4 w-4 text-gray-400" />
                                <span className="text-sm text-gray-500">{machine.location}</span>
                              </div>
                            </div>
                            {(machine.negotiable || machine.urgent) && (
                              <div className="mt-2 flex items-center gap-2">
                                {machine.negotiable && (
                                  <span className="rounded bg-blue-500 px-2 py-1 text-xs text-white">
                                    قابل للتفاوض
                                  </span>
                                )}
                                {machine.urgent && (
                                  <span className="rounded bg-red-500 px-2 py-1 text-xs text-white">
                                    عاجل
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(machine.id);
                            }}
                            className={`rounded-full p-2 transition-colors ${
                              favorites.includes(machine.id)
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-500'
                            }`}
                          >
                            <HeartIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* رسالة عدم وجود نتائج */}
                {filteredMachinery.length === 0 && (
                  <div className="py-12 text-center">
                    <TruckIcon className="mx-auto mb-4 h-16 w-16 text-gray-300" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">لا توجد معدات</h3>
                    <p className="text-gray-500">
                      جرب تعديل معايير البحث للعثور على المزيد من النتائج
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HeavyMachineryPage;

// بيانات وهمية للصفحة
export async function getStaticProps() {
  const stats = {
    total: 821,
    negotiable: 365,
    urgent: 315,
    newMachinery: 421,
  };

  return {
    props: {
      machinery: [],
      stats,
    },
    revalidate: 60,
  };
}
