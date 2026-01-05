import { useCallback, useEffect, useRef } from 'react';

interface UseAdminSidebarScrollReturn {
  ref: React.RefObject<HTMLElement>;
  reapplyFixes: () => void;
}

/**
 * Hook لحل مشاكل السكرول في الشريط الجانبي للوحة الإدارة
 */
export const useAdminSidebarScroll = (storageKey: string): UseAdminSidebarScrollReturn => {
  const scrollRef = useRef<HTMLElement>(null);

  // تطبيق إصلاحات السكرول
  const reapplyFixes = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;

    try {
      // استعادة موضع السكرول المحفوظ
      const savedScrollPosition = localStorage.getItem(storageKey);
      if (savedScrollPosition) {
        element.scrollTop = parseInt(savedScrollPosition, 10);
      }

      // إضافة مستمع لحفظ موضع السكرول
      const handleScroll = () => {
        try {
          localStorage.setItem(storageKey, element.scrollTop.toString());
        } catch (error) {
          console.warn('فشل في حفظ موضع السكرول:', error);
        }
      };

      element.addEventListener('scroll', handleScroll, { passive: true });

      // إصلاح السكرول على أجهزة اللمس
      element.style.overflowY = 'auto';
      (element.style as any).WebkitOverflowScrolling = 'touch';
      element.style.overscrollBehavior = 'contain';

      return () => {
        element.removeEventListener('scroll', handleScroll);
      };
    } catch (error) {
      console.warn('خطأ في تطبيق إصلاحات السكرول:', error);
    }
  }, [storageKey]);

  // تطبيق الإصلاحات عند التركيب
  useEffect(() => {
    const cleanup = reapplyFixes();
    return cleanup;
  }, [reapplyFixes]);

  return {
    ref: scrollRef,
    reapplyFixes,
  };
};

export default useAdminSidebarScroll;
