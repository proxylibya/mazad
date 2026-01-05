import React from 'react';
import useAuth from '../hooks/useAuth';

interface GuestGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

/**
 * مكون حماية الضيوف - يعرض المحتوى فقط للمستخدمين غير المسجلين
 * يمنع ظهور محتوى غير مناسب أثناء تحميل حالة المصادقة
 * يحل مشكلة FOUC (Flash of Unauthenticated Content)
 */
const GuestGuard: React.FC<GuestGuardProps> = ({
  children,
  fallback = null,
  loadingComponent = (
    <div className="animate-pulse rounded-lg bg-gray-100 px-4 py-2">
      <div className="h-4 w-32 rounded bg-gray-200"></div>
    </div>
  ),
}) => {
  const { user, isLoading } = useAuth();

  // أثناء التحميل، عرض مكون التحميل
  if (isLoading) {
    return <>{loadingComponent}</>;
  }

  // إذا لم يكن المستخدم مسجل دخول، عرض المحتوى
  if (!user) {
    return <>{children}</>;
  }

  // إذا كان مسجل دخول، عرض البديل
  return <>{fallback}</>;
};

export default GuestGuard;
