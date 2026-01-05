/**
 * مكون حماية الأقسام
 * يتحقق من حالة القسم ويعرض المحتوى المناسب
 */

import {
  ArrowRightIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import React, { ReactNode, useEffect } from 'react';
import { useSiteSections } from '../../contexts/SiteSectionsContext';

interface SectionGuardProps {
  section: string; // slug القسم
  children: ReactNode;
  fallback?: ReactNode; // محتوى بديل اختياري
  redirectTo?: string; // إعادة توجيه اختيارية
}

// مكونات الحالات المختلفة
const DisabledSection = ({ sectionName }: { sectionName: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 px-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
        <ExclamationTriangleIcon className="h-10 w-10 text-gray-400" />
      </div>
      <h1 className="mb-3 text-2xl font-bold text-gray-900">القسم غير متاح</h1>
      <p className="mb-6 text-gray-600">عذراً، قسم {sectionName} غير متاح حالياً.</p>
      <a
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
      >
        <ArrowRightIcon className="h-5 w-5" />
        العودة للرئيسية
      </a>
    </div>
  </div>
);

const MaintenanceSection = ({
  sectionName,
  message,
}: {
  sectionName: string;
  message?: string;
}) => (
  <div className="flex min-h-[60vh] items-center justify-center bg-yellow-50 px-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
        <WrenchScrewdriverIcon className="h-10 w-10 text-yellow-600" />
      </div>
      <h1 className="mb-3 text-2xl font-bold text-gray-900">قيد الصيانة</h1>
      <p className="mb-4 text-gray-600">
        {message || `قسم ${sectionName} قيد الصيانة حالياً. نعمل على تحسين الخدمة.`}
      </p>
      <p className="mb-6 text-sm text-gray-500">يرجى المحاولة لاحقاً</p>
      <a
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-6 py-3 font-medium text-white transition-colors hover:bg-yellow-600"
      >
        <ArrowRightIcon className="h-5 w-5" />
        العودة للرئيسية
      </a>
    </div>
  </div>
);

const ComingSoonSection = ({ sectionName, message }: { sectionName: string; message?: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center bg-blue-50 px-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
        <ClockIcon className="h-10 w-10 text-blue-600" />
      </div>
      <h1 className="mb-3 text-2xl font-bold text-gray-900">قريباً</h1>
      <p className="mb-4 text-gray-600">
        {message || `قسم ${sectionName} سيكون متاحاً قريباً. ترقبونا!`}
      </p>
      <p className="mb-6 text-sm text-gray-500">نعمل على إطلاق هذا القسم في أقرب وقت</p>
      <a
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700"
      >
        <ArrowRightIcon className="h-5 w-5" />
        العودة للرئيسية
      </a>
    </div>
  </div>
);

const MembersOnlySection = ({ sectionName }: { sectionName: string }) => (
  <div className="flex min-h-[60vh] items-center justify-center bg-purple-50 px-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
        <LockClosedIcon className="h-10 w-10 text-purple-600" />
      </div>
      <h1 className="mb-3 text-2xl font-bold text-gray-900">للأعضاء فقط</h1>
      <p className="mb-6 text-gray-600">قسم {sectionName} متاح للأعضاء المسجلين فقط.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <a
          href="/login"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-medium text-white transition-colors hover:bg-purple-700"
        >
          تسجيل الدخول
        </a>
        <a
          href="/register"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-600 px-6 py-3 font-medium text-purple-600 transition-colors hover:bg-purple-50"
        >
          إنشاء حساب
        </a>
      </div>
    </div>
  </div>
);

export default function SectionGuard({
  section,
  children,
  fallback,
  redirectTo,
}: SectionGuardProps) {
  const router = useRouter();
  const { getSection, getSectionStatus, getSectionMessage, isLoading } = useSiteSections();

  const sectionData = getSection(section);
  const status = getSectionStatus(section);
  const message = getSectionMessage(section);

  // إعادة التوجيه إذا كان مطلوباً
  useEffect(() => {
    if (!isLoading && status === 'DISABLED' && redirectTo) {
      router.replace(redirectTo);
    }
  }, [isLoading, status, redirectTo, router]);

  // حالة التحميل
  if (isLoading) {
    return null; // أو يمكن إظهار spinner
  }

  // التحقق من الحالة
  switch (status) {
    case 'DISABLED':
      if (redirectTo) return null; // سيتم إعادة التوجيه
      if (fallback) return <>{fallback}</>;
      return <DisabledSection sectionName={sectionData?.name || section} />;

    case 'MAINTENANCE':
      return (
        <MaintenanceSection
          sectionName={sectionData?.name || section}
          message={message || undefined}
        />
      );

    case 'COMING_SOON':
      return (
        <ComingSoonSection
          sectionName={sectionData?.name || section}
          message={message || undefined}
        />
      );

    case 'MEMBERS_ONLY':
      // يمكن إضافة فحص للمستخدم هنا
      return <MembersOnlySection sectionName={sectionData?.name || section} />;

    case 'ACTIVE':
    default:
      return <>{children}</>;
  }
}

// مكون رابط ذكي - يختفي إذا كان القسم معطل
interface SectionLinkProps {
  section: string;
  href: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function SectionLink({ section, href, children, className, onClick }: SectionLinkProps) {
  const { isSectionActive, getSectionStatus, getSectionMessage } = useSiteSections();
  const router = useRouter();

  const status = getSectionStatus(section);
  const message = getSectionMessage(section);

  // إخفاء الرابط إذا كان القسم معطل
  if (status === 'DISABLED') {
    return null;
  }

  // معالجة النقر
  const handleClick = (e: React.MouseEvent) => {
    if (status === 'MAINTENANCE' || status === 'COMING_SOON') {
      e.preventDefault();
      alert(message || `هذا القسم ${status === 'MAINTENANCE' ? 'قيد الصيانة' : 'قريباً'}`);
      return;
    }

    if (onClick) {
      onClick();
    }
  };

  // تعديل الـ style حسب الحالة
  const statusStyles = {
    MAINTENANCE: 'opacity-60 cursor-not-allowed',
    COMING_SOON: 'opacity-60 cursor-not-allowed',
    MEMBERS_ONLY: '',
    ACTIVE: '',
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      className={`${className || ''} ${statusStyles[status as keyof typeof statusStyles] || ''}`}
    >
      {children}
      {status === 'COMING_SOON' && (
        <span className="mr-1 rounded bg-blue-100 px-1.5 py-0.5 text-xs text-blue-600">قريباً</span>
      )}
      {status === 'MAINTENANCE' && (
        <span className="mr-1 rounded bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-600">
          صيانة
        </span>
      )}
    </a>
  );
}
