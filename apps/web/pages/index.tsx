import {
  BuildingOffice2Icon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  ScaleIcon,
  ShieldCheckIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import AdvancedFooter from '../components/common/Footer/AdvancedFooter';
import OpensooqNavbar from '../components/common/layout/OpensooqNavbar';
import AdvancedHeroBackground from '../components/sections/AdvancedHeroBackground';
import { useContent } from '../contexts/SimpleLocalizationContext';
import { useSiteSections } from '../contexts/SiteSectionsContext';
import { useFeaturedAds } from '../hooks/useFeaturedAds';
import { usePageElements } from '../hooks/usePageElements';
import { useFormattedStats } from '../hooks/useStats';
import { prisma } from '../lib/prisma';

// Fallback component للأخطاء
const FallbackComponent = () => <div className="py-8 text-center"></div>;

// Dynamic imports للمكونات الثقيلة - مع error handling
const LoginModal = dynamic(
  () =>
    import('../components/auth/LoginModal')
      .then((mod) => mod.default || mod)
      .catch((err) => {
        console.error('Error loading LoginModal:', err);
        return FallbackComponent;
      }),
  { ssr: false, loading: () => <FallbackComponent /> },
);

const PremiumAdsSection = dynamic(
  () =>
    import('../components/sections/PremiumAdsSection')
      .then((mod) => mod.default || mod)
      .catch((err) => {
        console.error('Error loading PremiumAdsSection:', err);
        return FallbackComponent;
      }),
  { ssr: false, loading: () => <FallbackComponent /> },
);

const DownloadAppSection = dynamic(
  () =>
    import('../components/DownloadAppSection')
      .then((mod) => mod.default || mod)
      .catch((err) => {
        console.error('Error loading DownloadAppSection:', err);
        return FallbackComponent;
      }),
  { ssr: false, loading: () => <FallbackComponent /> },
);

const BusinessPackagesSection = dynamic(
  () =>
    import('../components/sections/BusinessPackagesSection')
      .then((mod) => mod.default || mod)
      .catch((err) => {
        console.error('Error loading BusinessPackagesSection:', err);
        return FallbackComponent;
      }),
  { ssr: false, loading: () => <FallbackComponent /> },
);

// أيقونة سيارة مخصصة SVG - تصميم واضح
const CarIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5 13l1.5-5h11l1.5 5M5 13v5h14v-5M5 13h14M7 18h1m8 0h1m-9-5h10"
    />
    <circle cx="7.5" cy="18" r="1.5" fill="currentColor" />
    <circle cx="16.5" cy="18" r="1.5" fill="currentColor" />
  </svg>
);

const DEFAULT_BRANDING_SETTINGS = {
  logoType: 'text' as const,
  logoImageUrl: '',
  siteName: 'سوق المزاد',
  siteDescription: 'منصة المزادات الأولى في ليبيا',
  showLogoInNavbar: true,
  showSiteNameInNavbar: true,
};

type BrandingSettings = typeof DEFAULT_BRANDING_SETTINGS;

interface HomeProps {
  initialBranding: BrandingSettings | null;
}

const Home = ({ initialBranding }: HomeProps) => {
  const router = useRouter();
  const content = useContent();
  const [successMessage, setSuccessMessage] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);

  const [branding, setBranding] = useState<BrandingSettings | null>(initialBranding);

  // استخدام بيانات افتراضية للبلد
  const country = { name: 'ليبيا', code: 'LY' };

  // استخدام نظام التحكم في العناصر
  const { isElementVisible, isElementInteractive } = usePageElements('homepage');

  // استخدام نظام التحكم في الأقسام
  const { getHomepageSections, isSectionVisible, getSectionStatus } = useSiteSections();
  const homepageSections = getHomepageSections();

  // جلب الإحصائيات الحقيقية من قاعدة البيانات
  const { stats, rawStats, loading, error, refetch } = useFormattedStats();

  // تم إزالة جلب السيارات المميزة لعدم الاستخدام في الصفحة بعد التقسيم

  // جلب الإعلانات المميزة
  const {
    ads: featuredAds,
    loading: adsLoading,
    error: adsError,
    refetch: refetchAds,
  } = useFeaturedAds(3);

  // تحميل بيانات المستخدم من localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('خطأ في تحميل بيانات المستخدم:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setUser(null);
      }
    }
  }, []);

  // التحقق من callbackUrl وإظهار نافذة تسجيل الدخول
  useEffect(() => {
    const { callbackUrl } = router.query;

    if (callbackUrl && !user) {
      // إظهار نافذة تسجيل الدخول إذا كان هناك callbackUrl والمستخدم غير مسجل
      setShowLoginModal(true);
    } else if (callbackUrl && user) {
      // إعادة توجيه للصفحة المطلوبة إذا كان المستخدم مسجل دخول
      const targetUrl = callbackUrl as string;
      const currentPath = router.asPath.split('?')[0]; // إزالة query params من المقارنة
      const targetPath = targetUrl.split('?')[0];

      // تجنب التنقل إلى نفس الصفحة
      if (targetPath !== currentPath && targetPath !== '/' && currentPath !== '/') {
        router.push(targetUrl);
      }
    }
  }, [router.query, user, router]);

  // التحقق من رسائل النجاح
  useEffect(() => {
    if (router.query.registered === 'true') {
      setSuccessMessage('تم إنشاء حسابك بنجاح! مرحباً بك في موقعنا.');

      // تنظيف الـ query params بدون reload
      const currentPath = router.asPath.split('?')[0];
      if (currentPath === '/' && router.query.registered) {
        // استخدام window.history بدلاً من router.replace لتجنب الخطأ
        window.history.replaceState(null, '', '/');
      }

      // إخفاء الرسالة بعد 5 ثوان
      setTimeout(() => {
        setSuccessMessage('');
      }, 5000);
    }
  }, [router]);

  // التحقق من طلب تسجيل خدمة النقل
  useEffect(() => {
    if (router.query.action === 'register-transport' && !user) {
      setShowLoginModal(true);

      // تنظيف الـ query params بدون reload
      const currentPath = router.asPath.split('?')[0];
      if (currentPath === '/' && router.query.action) {
        // استخدام window.history بدلاً من router.replace لتجنب الخطأ
        window.history.replaceState(null, '', '/');
      }
    }
  }, [router.query, user, router]);

  useEffect(() => {
    let cancelled = false;
    const loadBranding = async () => {
      try {
        const res = await fetch('/api/site-branding');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.settings) {
          setBranding(data.settings);
        }
      } catch {}
    };
    // تحديث البيانات في الخلفية للتأكد من أنها الأحدث
    loadBranding();
    return () => {
      cancelled = true;
    };
  }, []);

  // معالجة نجاح تسجيل الدخول
  const handleLoginSuccess = () => {
    setShowLoginModal(false);

    // إعادة تحميل بيانات المستخدم
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // إعادة توجيه للصفحة المطلوبة
    const { callbackUrl } = router.query;
    if (callbackUrl) {
      const targetUrl = callbackUrl as string;
      const currentPath = router.asPath.split('?')[0];
      const targetPath = targetUrl.split('?')[0];

      // تجنب التنقل إلى نفس الصفحة
      if (targetPath !== currentPath && targetPath !== '/' && currentPath !== '/') {
        router.push(targetUrl);
      }
    }
  };

  return (
    <>
      <Head>
        <title>{branding?.siteName || content?.siteTitle || 'سوق المزاد'}</title>
        <meta
          name="description"
          content={
            branding?.siteDescription || content?.siteDescription || 'منصة المزادات الأولى في ليبيا'
          }
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="keywords"
          content={`مزاد سيارات, سيارات للبيع, سيارات ${country?.name || 'ليبيا'}, مزادات السيارات, سوق السيارات`}
        />
      </Head>

      <div className="min-h-screen bg-gray-50" dir="rtl">
        {/* Navbar */}
        <OpensooqNavbar />

        {/* رسالة النجاح */}
        {successMessage && (
          <div className="mx-4 mt-4 rounded-lg border-l-4 border-green-400 bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-5 w-5 text-green-400" />
              </div>
              <div className="mr-3">
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
              <div className="mr-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setSuccessMessage('')}
                    className="inline-flex rounded-md bg-green-50 p-1.5 text-green-500 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2 focus:ring-offset-green-50"
                  >
                    <span className="sr-only">إغلاق</span>
                    <svg
                      className="h-3 w-3"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message for Stats */}
        {error && (
          <div className="mx-auto max-w-7xl px-4 py-2">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg
                    className="ml-2 h-5 w-5 text-red-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <p className="text-sm text-red-700">خطأ في تحميل الإحصائيات: {error}</p>
                </div>
                <button
                  onClick={refetch}
                  className="text-sm text-red-600 underline hover:text-red-800"
                >
                  إعادة المحاولة
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Simplified Hero + Search Section */}
        {isElementVisible('hero_banner') && (
          <div className="relative isolate overflow-hidden text-white">
            <AdvancedHeroBackground />
            <div className="relative z-10 mx-auto max-w-7xl px-4 py-12">
              <div className="text-center">
                <h1 className="mb-4 text-3xl font-bold md:text-5xl">
                  {branding?.siteName || content?.siteTitle || 'سوق المزاد'}
                </h1>
                <p className="mx-auto mb-8 max-w-2xl text-lg text-blue-100 md:text-xl">
                  {branding?.siteDescription ||
                    content?.welcomeMessage ||
                    `منصة المزادات الأولى في ${country?.name || 'ليبيا'}`}
                </p>

                {/* Simplified Search */}
                {isElementVisible('search_bar') && (
                  <div className="mx-auto mb-8 max-w-3xl rounded-xl bg-white p-6">
                    <div className="flex flex-col gap-3 md:flex-row">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="ابحث عن سيارة، موديل، أو ماركة..."
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-transparent focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        className={`rounded-lg bg-blue-600 px-8 py-3 font-medium text-white transition-colors hover:bg-blue-700 ${
                          !isElementInteractive('search_bar') ? 'cursor-not-allowed opacity-50' : ''
                        }`}
                        disabled={!isElementInteractive('search_bar')}
                      >
                        بحث
                      </button>
                    </div>
                  </div>
                )}

                {/* Quick Access Buttons - Updated Icons */}
                {isElementVisible('main_categories') && (
                  <div className="mx-auto grid max-w-4xl grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5">
                    <Link
                      href="/auctions"
                      className="group relative overflow-hidden rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50/85 to-white/85 p-2 shadow-sm transition-all hover:border-amber-400 hover:shadow-md"
                    >
                      <div className="relative mb-3 flex justify-center">
                        <div className="rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 p-2 shadow-sm transition-all group-hover:rotate-12 group-hover:scale-105 group-hover:from-amber-600 group-hover:to-amber-700">
                          <ScaleIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="relative text-center text-sm font-semibold text-gray-900">
                        المزادات
                      </div>
                      <div className="relative mt-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-amber-700">
                        {loading ? (
                          <>
                            <div
                              className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                              style={{ width: 24, height: 24 }}
                              role="status"
                              aria-label="جاري التحميل"
                            />
                          </>
                        ) : error ? (
                          'خطأ'
                        ) : (
                          <>{stats?.auctions || '0'} مزاد</>
                        )}
                      </div>
                    </Link>

                    <Link
                      href="/marketplace"
                      className="group relative overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50/85 to-white/85 p-2 shadow-sm transition-all hover:border-blue-400 hover:shadow-md"
                    >
                      <div className="relative mb-3 flex justify-center">
                        <div className="rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 p-2 shadow-sm transition-all group-hover:rotate-12 group-hover:scale-105 group-hover:from-blue-600 group-hover:to-blue-700">
                          <CarIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="relative text-center text-sm font-semibold text-gray-900">
                        السوق الفوري
                      </div>
                      <div className="relative mt-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-blue-700">
                        {loading ? (
                          <>
                            <div
                              className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                              style={{ width: 24, height: 24 }}
                              role="status"
                              aria-label="جاري التحميل"
                            />
                          </>
                        ) : error ? (
                          'خطأ'
                        ) : (
                          <>{stats?.cars || '0'} سيارة</>
                        )}
                      </div>
                    </Link>

                    <Link
                      href="/yards"
                      className="group relative overflow-hidden rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50/85 to-white/85 p-2 shadow-sm transition-all hover:border-emerald-400 hover:shadow-md"
                    >
                      <div className="relative mb-3 flex justify-center">
                        <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 p-2 shadow-sm transition-all group-hover:rotate-12 group-hover:scale-105 group-hover:from-emerald-600 group-hover:to-emerald-700">
                          <MapPinIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="relative text-center text-sm font-semibold text-gray-900">
                        الساحات
                      </div>
                      <div className="relative mt-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-emerald-700">
                        {loading ? (
                          <>
                            <div
                              className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                              style={{ width: 24, height: 24 }}
                              role="status"
                              aria-label="جاري التحميل"
                            />
                          </>
                        ) : error ? (
                          'خطأ'
                        ) : (
                          <>{rawStats?.users ? Math.ceil(rawStats.users * 0.1) : '0'} ساحة</>
                        )}
                      </div>
                    </Link>

                    <Link
                      href="/showrooms"
                      className="group relative overflow-hidden rounded-lg border border-teal-200 bg-gradient-to-br from-teal-50/85 to-white/85 p-2 shadow-sm transition-all hover:border-teal-400 hover:shadow-md"
                    >
                      <div className="relative mb-3 flex justify-center">
                        <div className="rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 p-2 shadow-sm transition-all group-hover:rotate-12 group-hover:scale-105 group-hover:from-teal-600 group-hover:to-teal-700">
                          <BuildingOffice2Icon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="relative text-center text-sm font-semibold text-gray-900">
                        المعارض
                      </div>
                      <div className="relative mt-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-teal-700">
                        {loading ? (
                          <>
                            <div
                              className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                              style={{ width: 24, height: 24 }}
                              role="status"
                              aria-label="جاري التحميل"
                            />
                          </>
                        ) : error ? (
                          'خطأ'
                        ) : (
                          <>{rawStats?.users ? Math.ceil(rawStats.users * 0.05) : '0'} معرض</>
                        )}
                      </div>
                    </Link>

                    <Link
                      href="/transport"
                      className="group relative overflow-hidden rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50/85 to-white/85 p-2 shadow-sm transition-all hover:border-orange-400 hover:shadow-md"
                    >
                      <div className="relative mb-3 flex justify-center">
                        <div className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-2 shadow-sm transition-all group-hover:rotate-12 group-hover:scale-105 group-hover:from-orange-600 group-hover:to-orange-700">
                          <TruckIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <div className="relative text-center text-sm font-semibold text-gray-900">
                        خدمات النقل
                      </div>
                      <div className="relative mt-1 flex items-center justify-center gap-1 text-center text-xs font-semibold text-orange-700">
                        {loading ? (
                          <>
                            <div
                              className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
                              style={{ width: 24, height: 24 }}
                              role="status"
                              aria-label="جاري التحميل"
                            />
                          </>
                        ) : error ? (
                          'خطأ'
                        ) : (
                          <>{stats?.transportServices || '0'} شركة</>
                        )}
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="mx-auto mt-10 max-w-7xl px-4 py-12">
          <div className="mb-10 text-center">
            <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
              لماذا تختار موقعنا؟
            </h2>
            <p className="text-base text-gray-600 md:text-lg">
              نوفر لك أفضل تجربة لبيع وشراء السيارات
            </p>
          </div>

          <div className="mb-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-xl bg-white p-6 text-center shadow-lg transition-shadow hover:shadow-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <ClockIcon className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">مزادات مباشرة</h3>
              <p className="text-sm text-gray-600">
                شارك في المزادات المباشرة واحصل على أفضل الأسعار للسيارات
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-xl bg-white p-6 text-center shadow-lg transition-shadow hover:shadow-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                <CurrencyDollarIcon className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">أسعار تنافسية</h3>
              <p className="text-sm text-gray-600">
                أفضل الأسعار في السوق مع ضمان الجودة والشفافية الكاملة
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-xl bg-white p-6 text-center shadow-lg transition-shadow hover:shadow-xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
                <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-gray-900">ثقة وأمان</h3>
              <p className="text-sm text-gray-600">
                تعاملات آمنة ومضمونة مع التحقق من هوية البائعين والمشترين
              </p>
            </div>
          </div>

          {/* Premium Advertisement Section - تصميم أزرق وذهبي احترافي */}
          {isElementVisible('premium_cars_ads') && (
            <>
              <PremiumAdsSection
                featuredAds={featuredAds}
                adsLoading={adsLoading}
                adsError={adsError}
                refetchAds={refetchAds}
              />

              {/* View More Button */}
              <div className="mt-10 text-center">
                <button className="group inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-800 px-7 py-3 text-sm font-bold text-white shadow-lg transition-all duration-300 hover:from-blue-700 hover:to-blue-900 hover:shadow-xl">
                  {/* Golden Star Icon */}
                  <svg
                    className="h-5 w-5 text-yellow-400 transition-transform duration-300 group-hover:rotate-12"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  عرض المزيد من الإعلانات المميزة
                  {/* Golden Arrow Icon */}
                  <svg
                    className="h-5 w-5 text-yellow-400 transition-transform duration-300 group-hover:translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* Services Section */}
          {isElementVisible('featured_auctions') && (
            <div className="mb-14 mt-14">
              <div className="mb-10 text-center">
                <h2 className="mb-3 text-2xl font-bold text-gray-900 md:text-3xl">
                  خدماتنا المتكاملة
                </h2>
                <p className="text-base text-gray-600 md:text-lg">
                  كل ما تحتاجه لبيع وشراء السيارات في مكان واحد
                </p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
                {/* سوق المزاد */}
                <div className="group cursor-pointer" onClick={() => router.push('/auctions')}>
                  <div className="flex h-full flex-col rounded-xl border-2 border-transparent bg-white p-5 text-center shadow-lg transition-shadow hover:shadow-xl group-hover:border-amber-500">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 transition-all group-hover:scale-110">
                      <ScaleIcon className="h-7 w-7 text-amber-600" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900">سوق المزاد</h3>
                    <p className="mb-3 text-sm text-gray-600">
                      مزادات مباشرة مع عداد تنازلي وأسعار تنافسية
                    </p>
                    <span className="font-medium text-amber-600 group-hover:text-amber-700">
                      تصفح المزادات ←
                    </span>
                  </div>
                </div>

                {/* سوق الفوري */}
                <div className="group cursor-pointer" onClick={() => router.push('/marketplace')}>
                  <div className="flex h-full flex-col rounded-xl border-2 border-transparent bg-white p-5 text-center shadow-lg transition-shadow hover:shadow-xl group-hover:border-emerald-500">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 transition-all group-hover:scale-110">
                      <CarIcon className="h-7 w-7 text-emerald-600" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900">السوق الفوري</h3>
                    <p className="mb-3 text-sm text-gray-600">
                      بيع وشراء السيارات بأسعار ثابتة أو قابلة للتفاوض
                    </p>
                    <span className="font-medium text-emerald-600 group-hover:text-emerald-700">
                      تصفح السوق ←
                    </span>
                  </div>
                </div>

                {/* الساحات */}
                <div className="group cursor-pointer" onClick={() => router.push('/yards')}>
                  <div className="flex h-full flex-col rounded-xl border-2 border-transparent bg-white p-5 text-center shadow-lg transition-shadow hover:shadow-xl group-hover:border-purple-500">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 transition-all group-hover:scale-110">
                      <MapPinIcon className="h-7 w-7 text-purple-600" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900">الساحات</h3>
                    <p className="mb-3 text-sm text-gray-600">
                      ساحات فحص وتقييم معتمدة مع تقارير كشف شاملة
                    </p>
                    <span className="font-medium text-purple-600 group-hover:text-purple-700">
                      اكتشف الساحات ←
                    </span>
                  </div>
                </div>

                {/* المعارض */}
                <div className="group cursor-pointer" onClick={() => router.push('/showrooms')}>
                  <div className="flex h-full flex-col rounded-xl border-2 border-transparent bg-white p-5 text-center shadow-lg transition-shadow hover:shadow-xl group-hover:border-blue-500">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-teal-100 to-cyan-100 transition-all group-hover:scale-110">
                      <BuildingOffice2Icon className="h-7 w-7 text-teal-600" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900">المعارض</h3>
                    <p className="mb-3 text-sm text-gray-600">
                      اكتشف أفضل معارض السيارات مع مجموعة واسعة من السيارات المميزة
                    </p>
                    <span className="font-medium text-blue-600 group-hover:text-blue-700">
                      تصفح المعارض ←
                    </span>
                  </div>
                </div>

                {/* خدمات النقل */}
                <div className="group cursor-pointer" onClick={() => router.push('/transport')}>
                  <div className="flex h-full flex-col rounded-xl border-2 border-transparent bg-white p-5 text-center shadow-lg transition-shadow hover:shadow-xl group-hover:border-rose-500">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-100 to-pink-100 transition-all group-hover:scale-110">
                      <TruckIcon className="h-7 w-7 text-rose-600" />
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900">خدمات النقل</h3>
                    <p className="mb-3 text-sm text-gray-600">
                      نقل آمن للسيارات مع تأمين شامل وتتبع مباشر
                    </p>
                    <span className="font-medium text-rose-600 group-hover:text-rose-700">
                      خدمات النقل ←
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Business Advertisement Packages Section */}
          {isElementVisible('business_packages') && <BusinessPackagesSection />}

          {/* CTA Section */}
          <div className="mt-16 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-center text-white">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">ابدأ رحلتك معنا الآن</h2>
            <p className="mb-5 text-base text-blue-100 md:text-lg">
              انضم إلى آلاف المستخدمين الذين يثقون بنا
            </p>
            <div className="flex flex-col justify-center gap-6 sm:flex-row">
              <Link
                href="/auctions"
                className="inline-block rounded-lg bg-yellow-500 px-7 py-3 text-base font-bold text-gray-900 shadow-lg transition-colors hover:bg-yellow-400"
              >
                المزادات المباشرة
              </Link>
              <Link
                href="/marketplace"
                className="inline-block rounded-lg border border-white border-opacity-30 bg-white bg-opacity-20 px-7 py-3 text-base font-medium text-white transition-colors hover:bg-opacity-30"
              >
                السوق الفوري
              </Link>
            </div>
          </div>
        </div>

        {/* Download App Section */}
        <DownloadAppSection />

        {/* Advanced Footer */}
        <AdvancedFooter />
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </>
  );
};

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
  try {
    const record = await prisma.system_settings.findFirst({
      where: { key: 'site_branding' },
    });

    let branding = DEFAULT_BRANDING_SETTINGS;

    if (record && record.value) {
      const value =
        typeof record.value === 'string'
          ? JSON.parse(record.value)
          : (record.value as BrandingSettings);
      branding = { ...DEFAULT_BRANDING_SETTINGS, ...value };
    }

    return {
      props: {
        initialBranding: branding,
      },
    };
  } catch (error) {
    console.error('Error fetching branding settings:', error);
    return {
      props: {
        initialBranding: DEFAULT_BRANDING_SETTINGS,
      },
    };
  }
};

export default Home;
