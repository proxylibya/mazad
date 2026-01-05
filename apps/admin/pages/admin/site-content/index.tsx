/**
 * صفحة إدارة محتوى الموقع
 * التحكم في إظهار/إخفاء الأقسام والصفحات
 */

import {
  ArrowPathIcon,
  ArrowRightOnRectangleIcon,
  BuildingOfficeIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  KeyIcon,
  MapPinIcon,
  ScaleIcon,
  ShoppingBagIcon,
  SparklesIcon,
  TruckIcon,
  UserPlusIcon,
  WindowIcon,
  WrenchScrewdriverIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { AnimatedPresence, AnimatedSection } from '../../../components/unified';

// أنواع البيانات
type SectionStatus = 'ACTIVE' | 'DISABLED' | 'MAINTENANCE' | 'COMING_SOON' | 'MEMBERS_ONLY';

interface SiteElement {
  id: string;
  key: string;
  name: string;
  description?: string;
  pageType: string;
  elementType: string;
  category?: string;
  isVisible: boolean;
  sectionId?: string | null;
  sectionSlug?: string;
}

interface SiteSection {
  id: string;
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  status: SectionStatus;
  message?: string;
  showInNavbar: boolean;
  showInMobileMenu: boolean;
  showInFooter: boolean;
  showInHomepage: boolean;
  showHomeButton: boolean;
  showHomeCard: boolean;
  navbarOrder: number;
  footerOrder: number;
  homepageOrder: number;
  pageUrl: string;
  primaryColor?: string;
  secondaryColor?: string;
}

// خريطة الأيقونات
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  ScaleIcon,
  ShoppingBagIcon,
  MapPinIcon,
  BuildingStorefrontIcon,
  TruckIcon,
  BuildingOfficeIcon,
  SparklesIcon,
  UserPlusIcon,
  ArrowRightOnRectangleIcon,
  KeyIcon,
  WindowIcon,
};

// ألوان الحالات
const statusColors: Record<SectionStatus, { bg: string; text: string; border: string }> = {
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  DISABLED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
  MAINTENANCE: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  COMING_SOON: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  MEMBERS_ONLY: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
};

// أسماء الحالات بالعربي
const statusLabels: Record<SectionStatus, string> = {
  ACTIVE: 'مفعل',
  DISABLED: 'معطل',
  MAINTENANCE: 'صيانة',
  COMING_SOON: 'قريباً',
  MEMBERS_ONLY: 'للأعضاء',
};

// البيانات الافتراضية للأقسام
const DEFAULT_SECTIONS: SiteSection[] = [
  {
    id: 'default-1',
    slug: 'auctions',
    name: 'سوق المزاد',
    description: 'مزادات السيارات المباشرة',
    icon: 'ScaleIcon',
    status: 'ACTIVE',
    showInNavbar: true,
    showInMobileMenu: true,
    showInFooter: true,
    showInHomepage: true,
    showHomeButton: true,
    showHomeCard: true,
    navbarOrder: 1,
    footerOrder: 1,
    homepageOrder: 1,
    pageUrl: '/auctions',
    primaryColor: '#f59e0b',
    secondaryColor: '#d97706',
  },
  {
    id: 'default-2',
    slug: 'marketplace',
    name: 'السوق الفوري',
    description: 'بيع وشراء السيارات مباشرة',
    icon: 'ShoppingBagIcon',
    status: 'ACTIVE',
    showInNavbar: true,
    showInMobileMenu: true,
    showInFooter: true,
    showInHomepage: true,
    showHomeButton: true,
    showHomeCard: true,
    navbarOrder: 2,
    footerOrder: 2,
    homepageOrder: 2,
    pageUrl: '/marketplace',
    primaryColor: '#3b82f6',
    secondaryColor: '#2563eb',
  },
  {
    id: 'default-3',
    slug: 'yards',
    name: 'الساحات',
    description: 'ساحات عرض السيارات',
    icon: 'MapPinIcon',
    status: 'ACTIVE',
    showInNavbar: true,
    showInMobileMenu: true,
    showInFooter: true,
    showInHomepage: true,
    showHomeButton: true,
    showHomeCard: true,
    navbarOrder: 3,
    footerOrder: 3,
    homepageOrder: 3,
    pageUrl: '/yards',
    primaryColor: '#10b981',
    secondaryColor: '#059669',
  },
  {
    id: 'default-4',
    slug: 'showrooms',
    name: 'المعارض',
    description: 'معارض السيارات',
    icon: 'BuildingStorefrontIcon',
    status: 'ACTIVE',
    showInNavbar: true,
    showInMobileMenu: true,
    showInFooter: true,
    showInHomepage: true,
    showHomeButton: true,
    showHomeCard: true,
    navbarOrder: 4,
    footerOrder: 4,
    homepageOrder: 4,
    pageUrl: '/showrooms',
    primaryColor: '#14b8a6',
    secondaryColor: '#0d9488',
  },
  {
    id: 'default-5',
    slug: 'transport',
    name: 'خدمات النقل',
    description: 'خدمات نقل السيارات',
    icon: 'TruckIcon',
    status: 'ACTIVE',
    showInNavbar: true,
    showInMobileMenu: true,
    showInFooter: true,
    showInHomepage: true,
    showHomeButton: true,
    showHomeCard: true,
    navbarOrder: 5,
    footerOrder: 5,
    homepageOrder: 5,
    pageUrl: '/transport',
    primaryColor: '#f97316',
    secondaryColor: '#ea580c',
  },
  {
    id: 'default-6',
    slug: 'companies',
    name: 'الشركات',
    description: 'شركات السيارات',
    icon: 'BuildingOfficeIcon',
    status: 'ACTIVE',
    showInNavbar: false,
    showInMobileMenu: false,
    showInFooter: false,
    showInHomepage: false,
    showHomeButton: false,
    showHomeCard: false,
    navbarOrder: 6,
    footerOrder: 6,
    homepageOrder: 6,
    pageUrl: '/companies',
    primaryColor: '#8b5cf6',
    secondaryColor: '#7c3aed',
  },
  {
    id: 'default-7',
    slug: 'premium-cars',
    name: 'السيارات المميزة',
    description: 'سيارات VIP',
    icon: 'SparklesIcon',
    status: 'ACTIVE',
    showInNavbar: false,
    showInMobileMenu: false,
    showInFooter: false,
    showInHomepage: false,
    showHomeButton: false,
    showHomeCard: false,
    navbarOrder: 7,
    footerOrder: 7,
    homepageOrder: 7,
    pageUrl: '/premium-cars',
    primaryColor: '#eab308',
    secondaryColor: '#ca8a04',
  },
  {
    id: 'default-8',
    slug: 'register',
    name: 'إنشاء حساب',
    description: 'صفحة تسجيل حساب جديد وخيارات التسجيل',
    icon: 'UserPlusIcon',
    status: 'ACTIVE',
    showInNavbar: false,
    showInMobileMenu: false,
    showInFooter: false,
    showInHomepage: false,
    showHomeButton: false,
    showHomeCard: false,
    navbarOrder: 8,
    footerOrder: 8,
    homepageOrder: 8,
    pageUrl: '/register',
    primaryColor: '#3b82f6',
    secondaryColor: '#2563eb',
  },
  {
    id: 'default-9',
    slug: 'login',
    name: 'تسجيل الدخول',
    description: 'صفحة الدخول للنظام',
    icon: 'ArrowRightOnRectangleIcon',
    status: 'ACTIVE',
    showInNavbar: false,
    showInMobileMenu: false,
    showInFooter: false,
    showInHomepage: false,
    showHomeButton: false,
    showHomeCard: false,
    navbarOrder: 9,
    footerOrder: 9,
    homepageOrder: 9,
    pageUrl: '/login',
    primaryColor: '#6366f1',
    secondaryColor: '#4f46e5',
  },
  {
    id: 'default-10',
    slug: 'forgot-password',
    name: 'نسيت كلمة المرور',
    description: 'صفحة استعادة كلمة المرور',
    icon: 'KeyIcon',
    status: 'ACTIVE',
    showInNavbar: false,
    showInMobileMenu: false,
    showInFooter: false,
    showInHomepage: false,
    showHomeButton: false,
    showHomeCard: false,
    navbarOrder: 10,
    footerOrder: 10,
    homepageOrder: 10,
    pageUrl: '/forgot-password',
    primaryColor: '#ef4444',
    secondaryColor: '#dc2626',
  },
  {
    id: 'default-11',
    slug: 'popups',
    name: 'القوائم المنبثقة',
    description: 'التحكم في النوافذ المنبثقة والإشعارات',
    icon: 'WindowIcon',
    status: 'ACTIVE',
    showInNavbar: false,
    showInMobileMenu: false,
    showInFooter: false,
    showInHomepage: false,
    showHomeButton: false,
    showHomeCard: false,
    navbarOrder: 11,
    footerOrder: 11,
    homepageOrder: 11,
    pageUrl: '#',
    primaryColor: '#8b5cf6',
    secondaryColor: '#7c3aed',
  },
];

// العناصر الافتراضية للصفحات
const DEFAULT_ELEMENTS: SiteElement[] = [
  // عناصر صفحة التسجيل
  {
    id: 'el-1',
    key: 'register_account_personal',
    name: 'حساب شخصي',
    pageType: 'register',
    elementType: 'option',
    category: 'account_type',
    isVisible: true,
    sectionSlug: 'register',
  },
  {
    id: 'el-2',
    key: 'register_account_company',
    name: 'حساب شركة',
    pageType: 'register',
    elementType: 'option',
    category: 'account_type',
    isVisible: true,
    sectionSlug: 'register',
  },
  {
    id: 'el-3',
    key: 'register_account_showroom',
    name: 'حساب معرض',
    pageType: 'register',
    elementType: 'option',
    category: 'account_type',
    isVisible: true,
    sectionSlug: 'register',
  },
  {
    id: 'el-4',
    key: 'register_account_transport',
    name: 'حساب نقل',
    pageType: 'register',
    elementType: 'option',
    category: 'account_type',
    isVisible: true,
    sectionSlug: 'register',
  },
  {
    id: 'el-5',
    key: 'register_social_google',
    name: 'تسجيل عبر جوجل',
    pageType: 'register',
    elementType: 'button',
    category: 'social_login',
    isVisible: true,
    sectionSlug: 'register',
  },

  // عناصر صفحة الدخول
  {
    id: 'el-6',
    key: 'login_social_google',
    name: 'دخول عبر جوجل',
    pageType: 'login',
    elementType: 'button',
    category: 'social_login',
    isVisible: true,
    sectionSlug: 'login',
  },
  {
    id: 'el-7',
    key: 'login_remember_me',
    name: 'تذكرني',
    pageType: 'login',
    elementType: 'checkbox',
    category: 'options',
    isVisible: true,
    sectionSlug: 'login',
  },
  {
    id: 'el-8',
    key: 'login_forgot_password_link',
    name: 'رابط نسيت كلمة المرور',
    pageType: 'login',
    elementType: 'link',
    category: 'options',
    isVisible: true,
    sectionSlug: 'login',
  },

  // عناصر صفحة نسيت كلمة المرور
  {
    id: 'el-9',
    key: 'forgot_email_method',
    name: 'استعادة عبر البريد',
    pageType: 'forgot-password',
    elementType: 'option',
    category: 'recovery_method',
    isVisible: true,
    sectionSlug: 'forgot-password',
  },
  {
    id: 'el-10',
    key: 'forgot_phone_method',
    name: 'استعادة عبر الهاتف',
    pageType: 'forgot-password',
    elementType: 'option',
    category: 'recovery_method',
    isVisible: true,
    sectionSlug: 'forgot-password',
  },

  // عناصر القوائم المنبثقة
  {
    id: 'el-11',
    key: 'popup_welcome',
    name: 'نافذة الترحيب',
    pageType: 'global',
    elementType: 'popup',
    category: 'marketing',
    isVisible: true,
    sectionSlug: 'popups',
  },
  {
    id: 'el-12',
    key: 'popup_newsletter',
    name: 'اشتراك النشرة البريدية',
    pageType: 'global',
    elementType: 'popup',
    category: 'marketing',
    isVisible: true,
    sectionSlug: 'popups',
  },
  {
    id: 'el-13',
    key: 'popup_cookies',
    name: 'إشعار الكوكيز',
    pageType: 'global',
    elementType: 'popup',
    category: 'legal',
    isVisible: true,
    sectionSlug: 'popups',
  },
  {
    id: 'el-14',
    key: 'popup_app_download',
    name: 'تحميل التطبيق',
    pageType: 'global',
    elementType: 'popup',
    category: 'marketing',
    isVisible: true,
    sectionSlug: 'popups',
  },
];

export default function SiteContentPage() {
  const [sections, setSections] = useState<SiteSection[]>(DEFAULT_SECTIONS);
  const [elements, setElements] = useState<SiteElement[]>(DEFAULT_ELEMENTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);
  const [changedElements, setChangedElements] = useState<Set<string>>(new Set());
  const [dataSource, setDataSource] = useState<'default' | 'database'>('default');

  // جلب البيانات
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/site-content', {
        credentials: 'same-origin', // مهم لإرسال الكوكيز
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.sections && data.sections.length > 0) {
          setSections(data.sections);
          setDataSource(data.source || 'database');
        } else {
          // استخدام البيانات الافتراضية
          setSections(DEFAULT_SECTIONS);
          setDataSource('default');
        }
        // تحميل العناصر
        if (data.elements && data.elements.length > 0) {
          setElements(data.elements);
        } else {
          setElements(DEFAULT_ELEMENTS);
        }
      } else if (response.status === 401) {
        // سيتم التعامل معها من AdminLayout
        setError('غير مصرح - يرجى تسجيل الدخول');
      } else {
        // استخدام البيانات الافتراضية في حال فشل API
        setSections(DEFAULT_SECTIONS);
        setDataSource('default');
      }
    } catch (err) {
      console.warn('خطأ في جلب البيانات، استخدام البيانات الافتراضية:', err);
      setSections(DEFAULT_SECTIONS);
      setDataSource('default');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // تحديث قسم
  const updateSection = (id: string, updates: Partial<SiteSection>) => {
    setSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, ...updates } : section)),
    );
    setHasChanges(true);
  };

  // تحديث عنصر
  const updateElement = (key: string, updates: Partial<SiteElement>) => {
    setElements((prev) =>
      prev.map((element) => (element.key === key ? { ...element, ...updates } : element)),
    );
    setChangedElements((prev) => new Set(prev).add(key));
    setHasChanges(true);
  };

  // الحصول على عناصر قسم معين
  const getElementsForSection = (sectionSlug: string): SiteElement[] => {
    if (sectionSlug === 'popups') {
      return elements.filter(
        (el) =>
          el.sectionSlug === 'popups' || el.elementType === 'popup' || el.pageType === 'global',
      );
    }
    return elements.filter((el) => el.sectionSlug === sectionSlug || el.pageType === sectionSlug);
  };

  // حفظ التغييرات
  const saveChanges = async () => {
    try {
      setSaving(true);
      setError(null);

      let successCount = 0;
      let errorCount = 0;

      // حفظ كل قسم تم تعديله
      for (const section of sections) {
        try {
          const response = await fetch('/api/admin/site-content', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin', // مهم لإرسال الكوكيز
            body: JSON.stringify(section),
          });

          if (response.ok) {
            successCount++;
          } else {
            const data = await response.json();
            console.error(`خطأ في حفظ ${section.name}:`, data.error);
            errorCount++;
          }
        } catch (err) {
          console.error(`خطأ في حفظ ${section.name}:`, err);
          errorCount++;
        }
      }

      // حفظ العناصر المتغيرة
      for (const elementKey of changedElements) {
        const element = elements.find((el) => el.key === elementKey);
        if (element) {
          try {
            const response = await fetch('/api/admin/site-content', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'same-origin',
              body: JSON.stringify({
                type: 'element',
                key: element.key,
                name: element.name,
                isVisible: element.isVisible,
                sectionSlug: element.sectionSlug,
                pageType: element.pageType,
                elementType: element.elementType,
                category: element.category,
              }),
            });

            if (response.ok) {
              successCount++;
            } else {
              const data = await response.json();
              console.error(`خطأ في حفظ العنصر ${element.name}:`, data.error);
              errorCount++;
            }
          } catch (err) {
            console.error(`خطأ في حفظ العنصر ${element.name}:`, err);
            errorCount++;
          }
        }
      }

      if (errorCount === 0) {
        setSuccess('تم حفظ جميع التغييرات بنجاح');
        setHasChanges(false);
        setChangedElements(new Set());
        // إعادة جلب البيانات للتأكد من التحديث
        await fetchData();
      } else if (successCount > 0) {
        setSuccess(`تم حفظ ${successCount} عناصر، فشل ${errorCount}`);
        setHasChanges(false);
        setChangedElements(new Set());
        await fetchData();
      } else {
        setError('فشل في حفظ التغييرات');
      }

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('خطأ في حفظ التغييرات');
    } finally {
      setSaving(false);
    }
  };

  // تبديل توسيع القسم
  const toggleExpand = (id: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // تبديل جميع العناصر
  const toggleAllElements = (id: string, value: boolean) => {
    updateSection(id, {
      showInNavbar: value,
      showInMobileMenu: value,
      showInFooter: value,
      showInHomepage: value,
      showHomeButton: value,
      showHomeCard: value,
    });
  };

  if (loading) {
    return (
      <AdminLayout title="إدارة محتوى الموقع">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-slate-400">جاري التحميل...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="إدارة محتوى الموقع">
      <div className="space-y-6">
        {/* العنوان والأزرار */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-slate-400">التحكم في إظهار وإخفاء الأقسام والصفحات</p>
            {dataSource === 'default' && (
              <p className="mt-1 text-xs text-yellow-500">
                تستخدم البيانات الافتراضية - لم يتم العثور على بيانات في قاعدة البيانات
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchData}
              className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-700 px-4 py-2 text-slate-200 transition-colors hover:bg-slate-600"
            >
              <ArrowPathIcon className="h-5 w-5" />
              تحديث
            </button>
            <button
              onClick={saveChanges}
              disabled={!hasChanges || saving}
              className={`flex items-center gap-2 rounded-lg px-6 py-2 font-medium text-white transition-colors ${
                hasChanges ? 'bg-blue-600 hover:bg-blue-700' : 'cursor-not-allowed bg-slate-600'
              }`}
            >
              {saving ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  حفظ التغييرات
                </>
              )}
            </button>
          </div>
        </div>

        {/* رسائل النجاح والخطأ */}
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-red-700 bg-red-900/50 p-4 text-red-300">
            <XCircleIcon className="h-5 w-5" />
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-green-700 bg-green-900/50 p-4 text-green-300">
            <CheckCircleIcon className="h-5 w-5" />
            {success}
          </div>
        )}

        {/* قائمة الأقسام */}
        <div className="space-y-4">
          {sections.map((section, index) => {
            const IconComponent = iconMap[section.icon || ''] || Cog6ToothIcon;
            const isExpanded = expandedSections.has(section.id);
            const colors = statusColors[section.status];

            return (
              <AnimatedSection
                key={section.id}
                delay={index * 40}
                className={`overflow-hidden rounded-xl border-2 bg-slate-800 shadow-sm transition-all ${colors.border}`}
              >
                {/* رأس القسم */}
                <div
                  className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-slate-700"
                  onClick={() => toggleExpand(section.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* أيقونة الحالة */}
                    <div
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ backgroundColor: section.primaryColor + '20' }}
                    >
                      <IconComponent className="h-6 w-6" style={{ color: section.primaryColor }} />
                    </div>

                    {/* معلومات القسم */}
                    <div>
                      <h3 className="text-lg font-bold text-white">{section.name}</h3>
                      <p className="text-sm text-slate-400">{section.pageUrl}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* حالة القسم */}
                    <select
                      value={section.status}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateSection(section.id, { status: e.target.value as SectionStatus });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium ${colors.bg} ${colors.text}`}
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>

                    {/* مؤشر الحالة */}
                    <div className="flex items-center gap-2">
                      {section.status === 'ACTIVE' ? (
                        <EyeIcon className="h-5 w-5 text-green-600" />
                      ) : section.status === 'DISABLED' ? (
                        <EyeSlashIcon className="h-5 w-5 text-red-600" />
                      ) : section.status === 'MAINTENANCE' ? (
                        <WrenchScrewdriverIcon className="h-5 w-5 text-yellow-600" />
                      ) : (
                        <SparklesIcon className="h-5 w-5 text-blue-600" />
                      )}
                    </div>

                    {/* زر التوسيع */}
                    {isExpanded ? (
                      <ChevronUpIcon className="h-5 w-5 text-slate-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* محتوى موسع */}
                <AnimatedPresence show={isExpanded}>
                  <div className="border-t border-slate-700 bg-slate-900/50 p-4">
                    {/* رسالة مخصصة */}
                    {(section.status === 'MAINTENANCE' || section.status === 'COMING_SOON') && (
                      <div className="mb-4">
                        <label className="mb-2 block text-sm font-medium text-slate-300">
                          رسالة مخصصة
                        </label>
                        <input
                          type="text"
                          value={section.message || ''}
                          onChange={(e) => updateSection(section.id, { message: e.target.value })}
                          placeholder="مثال: سنعود قريباً..."
                          className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* أزرار التحكم السريع */}
                    <div className="mb-4 flex gap-3">
                      <button
                        onClick={() => toggleAllElements(section.id, true)}
                        className="rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700 transition-colors hover:bg-green-200"
                      >
                        إظهار الكل
                      </button>
                      <button
                        onClick={() => toggleAllElements(section.id, false)}
                        className="rounded-lg bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200"
                      >
                        إخفاء الكل
                      </button>
                    </div>

                    {/* عناصر التحكم */}
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                      <ToggleItem
                        label="النافبار"
                        checked={section.showInNavbar}
                        onChange={(v) => updateSection(section.id, { showInNavbar: v })}
                      />
                      <ToggleItem
                        label="قائمة الموبايل"
                        checked={section.showInMobileMenu}
                        onChange={(v) => updateSection(section.id, { showInMobileMenu: v })}
                      />
                      <ToggleItem
                        label="الفوتر"
                        checked={section.showInFooter}
                        onChange={(v) => updateSection(section.id, { showInFooter: v })}
                      />
                      <ToggleItem
                        label="الصفحة الرئيسية"
                        checked={section.showInHomepage}
                        onChange={(v) => updateSection(section.id, { showInHomepage: v })}
                      />
                      <ToggleItem
                        label="زر الوصول السريع"
                        checked={section.showHomeButton}
                        onChange={(v) => updateSection(section.id, { showHomeButton: v })}
                      />
                      <ToggleItem
                        label="بطاقة الخدمات"
                        checked={section.showHomeCard}
                        onChange={(v) => updateSection(section.id, { showHomeCard: v })}
                      />
                    </div>

                    {/* عناصر الصفحة - للصفحات التي تحتوي على عناصر قابلة للتحكم */}
                    {getElementsForSection(section.slug).length > 0 && (
                      <div className="mt-6">
                        <h4 className="mb-3 text-sm font-semibold text-slate-200">عناصر الصفحة</h4>
                        <p className="mb-3 text-xs text-slate-400">
                          تحكم في إظهار وإخفاء العناصر داخل هذه الصفحة
                        </p>

                        {/* تجميع العناصر حسب الفئة */}
                        {(() => {
                          const sectionElements = getElementsForSection(section.slug);
                          const categories = [...new Set(sectionElements.map((el) => el.category))];

                          return categories.map((category) => (
                            <div key={String(category || 'uncategorized')} className="mb-4">
                              <h5 className="mb-2 text-xs font-medium uppercase text-slate-400">
                                {category === 'account_type' && 'أنواع الحسابات'}
                                {category === 'social_login' && 'تسجيل الدخول الاجتماعي'}
                                {category === 'options' && 'خيارات إضافية'}
                                {category === 'recovery_method' && 'طرق الاستعادة'}
                                {category === 'marketing' && 'التسويق'}
                                {category === 'legal' && 'قانوني'}
                                {![
                                  'account_type',
                                  'social_login',
                                  'options',
                                  'recovery_method',
                                  'marketing',
                                  'legal',
                                ].includes(category || '') &&
                                  (category || 'عام')}
                              </h5>
                              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                                {sectionElements
                                  .filter((el) => el.category === category)
                                  .map((element) => (
                                    <div
                                      key={element.key}
                                      className={`flex items-center justify-between rounded-lg border p-3 transition-all ${
                                        element.isVisible
                                          ? 'border-green-600/30 bg-green-900/20'
                                          : 'border-red-600/30 bg-red-900/20'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        {element.isVisible ? (
                                          <EyeIcon className="h-4 w-4 text-green-500" />
                                        ) : (
                                          <EyeSlashIcon className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className="text-sm text-slate-300">
                                          {element.name}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() =>
                                          updateElement(element.key, {
                                            isVisible: !element.isVisible,
                                          })
                                        }
                                        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                                          element.isVisible
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-red-600 text-white hover:bg-red-700'
                                        }`}
                                      >
                                        {element.isVisible ? 'ظاهر' : 'مخفي'}
                                      </button>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                    {/* ملخص الحالة */}
                    <div className="mt-4 rounded-lg bg-slate-800 p-3">
                      <p className="text-sm text-slate-300">
                        {section.status === 'DISABLED' ? (
                          <span className="text-red-600">
                            هذا القسم معطل تماماً ولن يظهر في أي مكان
                          </span>
                        ) : (
                          <>
                            يظهر في:{' '}
                            {[
                              section.showInNavbar && 'النافبار',
                              section.showInMobileMenu && 'قائمة الموبايل',
                              section.showInFooter && 'الفوتر',
                              section.showInHomepage && 'الصفحة الرئيسية',
                            ]
                              .filter(Boolean)
                              .join('، ') || 'لا مكان'}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </AnimatedPresence>
              </AnimatedSection>
            );
          })}
        </div>

        {/* تحذير التغييرات غير المحفوظة */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 transform">
            <div className="flex items-center gap-4 rounded-xl bg-yellow-500 px-6 py-3 text-white shadow-lg">
              <span>لديك تغييرات غير محفوظة</span>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="rounded-lg bg-white px-4 py-1 font-medium text-yellow-600 transition-colors hover:bg-yellow-50"
              >
                حفظ الآن
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// مكون Toggle
function ToggleItem({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-800 p-3 transition-colors hover:bg-slate-700">
      <div
        className={`relative h-6 w-11 rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-slate-600'
        }`}
        onClick={() => onChange(!checked)}
      >
        <div
          className={`absolute top-0.5 h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
            checked ? 'right-0.5' : 'right-5'
          }`}
        />
      </div>
      <span className="text-sm font-medium text-slate-300">{label}</span>
    </label>
  );
}
