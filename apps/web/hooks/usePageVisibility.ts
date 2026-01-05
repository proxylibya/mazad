import {
  useFilteredMenuItems as useFilteredMenuItemsContext,
  usePageVisibilityCheck as usePageVisibilityCheckContext,
  usePageVisibilityContext,
} from '../contexts/PageVisibilityContext';

type PageVisibilitySettings = Record<string, Record<string, boolean>>;

/**
 * Hook لإدارة إعدادات رؤية الصفحات
 * يستخدم Context للحصول على الإعدادات
 */
export function usePageVisibility() {
  return usePageVisibilityContext();
}

/**
 * Hook للتحقق من رؤية صفحة واحدة
 */
export function usePageVisibilityCheck(pageId: string, userRole?: string) {
  return usePageVisibilityCheckContext(pageId, userRole);
}

/**
 * Hook لفلترة قائمة العناصر حسب الرؤية
 */
export function useFilteredMenuItems<T extends { id?: string; href?: string; pageId?: string; }>(
  items: T[],
  userRole?: string,
) {
  return useFilteredMenuItemsContext(items, userRole);
}

/**
 * دالة مساعدة لتحويل مسار الصفحة إلى معرف
 */
export function pathToPageId(path: string): string {
  return path
    .replace(/^\//, '') // إزالة الشرطة المائلة في البداية
    .replace(/\//g, '-') // استبدال الشرطات المائلة بشرطات
    .replace(/\[.*?\]/g, '') // إزالة المعاملات الديناميكية
    .replace(/-+/g, '-') // دمج الشرطات المتعددة
    .replace(/^-|-$/g, ''); // إزالة الشرطات في البداية والنهاية
}

/**
 * دالة مساعدة للحصول على الإعدادات الافتراضية
 */
export function getDefaultPageSettings(): PageVisibilitySettings {
  return {
    // الصفحات الرئيسية
    homepage: {
      USER: true,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },
    auctions: {
      USER: true,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },
    cars: {
      USER: true,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },
    showrooms: {
      USER: true,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },
    transport: {
      USER: true,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },

    // صفحات المستخدم
    'my-account': {
      USER: true,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },
    wallet: {
      USER: true,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },
    notifications: {
      USER: true,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },
    messages: {
      USER: true,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },
    settings: {
      USER: true,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },

    // صفحات الإدارة
    'admin-dashboard': {
      USER: false,
      MODERATOR: true,
      ADMIN: true,
      SUPER_ADMIN: true,
    },
    'admin-users': {
      USER: false,
      MODERATOR: false,
      ADMIN: true,
      SUPER_ADMIN: true,
    },
    'admin-admins': {
      USER: false,
      MODERATOR: false,
      ADMIN: false,
      SUPER_ADMIN: true,
    },
  };
}
