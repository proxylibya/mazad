import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

interface PageVisibilitySettings {
  [pageId: string]: {
    [role: string]: boolean;
  };
}

interface PageVisibilityContextType {
  settings: PageVisibilitySettings;
  loading: boolean;
  error: string | null;
  isPageVisible: (pageId: string, userRole: string) => boolean;
  updateSettings: (newSettings: PageVisibilitySettings) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
}

const PageVisibilityContext = createContext<PageVisibilityContextType | undefined>(undefined);

interface PageVisibilityProviderProps {
  children: ReactNode;
}

/**
 * Provider لإدارة إعدادات رؤية الصفحات على مستوى التطبيق
 */
export const PageVisibilityProvider: React.FC<PageVisibilityProviderProps> = ({ children }) => {
  // منع المحاولات المتكررة في حالة الخطأ
  const [hasFetched, setHasFetched] = useState(false);
  const [settings, setSettings] = useState<PageVisibilitySettings>({});
  // البدء بـ loading = false لمنع وميض المحتوى
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // الإعدادات الافتراضية
  const defaultSettings: PageVisibilitySettings = useMemo(
    () => ({
      // الصفحات الرئيسية - مرئية لجميع المستخدمين
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

      // صفحات المستخدم - مرئية للمستخدمين المسجلين
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

      // صفحات الإدارة - مرئية للمديرين فقط
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
    }),
    [],
  );

  // جلب إعدادات الرؤية من الخادم (مرة واحدة فقط)
  const loadSettings = useCallback(async () => {
    // منع الجلب المتكرر
    if (hasFetched) return;

    try {
      setLoading(true);
      setError(null);
      setHasFetched(true);

      const response = await fetch('/api/page-settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // في حالة فشل API، استخدم الإعدادات الافتراضية بدون إظهار خطأ
        setSettings(defaultSettings);
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setSettings({ ...defaultSettings, ...data.settings });
      } else {
        // استخدام الإعدادات الافتراضية في حالة الخطأ
        setSettings(defaultSettings);
      }
    } catch (err) {
      // في حالة الخطأ، استخدم الإعدادات الافتراضية بهدوء
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  }, [defaultSettings, hasFetched]);

  // تحديث إعدادات الرؤية
  const updateSettings = async (newSettings: PageVisibilitySettings): Promise<boolean> => {
    try {
      setError(null);

      const response = await fetch('/api/admin/pages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: newSettings }),
      });

      if (!response.ok) {
        throw new Error('فشل في حفظ إعدادات الصفحات');
      }

      const data = await response.json();

      if (data.success) {
        setSettings(newSettings);
        return true;
      } else {
        throw new Error(data.error || 'خطأ في حفظ الإعدادات');
      }
    } catch (err) {
      console.error('خطأ في تحديث إعدادات الصفحات:', err);
      setError(err instanceof Error ? err.message : 'خطأ في تحديث الإعدادات');
      return false;
    }
  };

  // التحقق من رؤية صفحة معينة لدور محدد
  const isPageVisible = (pageId: string, userRole: string): boolean => {
    // إذا لم توجد إعدادات للصفحة، افتراض أنها مرئية
    if (!settings[pageId]) {
      return true;
    }

    // إذا لم توجد إعدادات للدور، افتراض أنها مرئية
    if (settings[pageId][userRole] === undefined) {
      return true;
    }

    return settings[pageId][userRole];
  };

  // إعادة تحميل الإعدادات (يسمح بإعادة الجلب)
  const refreshSettings = async () => {
    setHasFetched(false);
    // سيتم استدعاء loadSettings تلقائياً بواسطة useEffect
  };

  // تحميل الإعدادات عند تحميل المكون (مرة واحدة فقط)
  useEffect(() => {
    if (!hasFetched) {
      // تعيين الإعدادات الافتراضية فوراً لمنع الصفحة البيضاء
      setSettings(defaultSettings);
      loadSettings();
    }
  }, [loadSettings, hasFetched, defaultSettings]);

  const value: PageVisibilityContextType = {
    settings,
    loading,
    error,
    isPageVisible,
    updateSettings,
    refreshSettings,
  };

  return <PageVisibilityContext.Provider value={value}>{children}</PageVisibilityContext.Provider>;
};

/**
 * Hook لاستخدام context رؤية الصفحات
 */
export const usePageVisibilityContext = (): PageVisibilityContextType => {
  const context = useContext(PageVisibilityContext);

  if (context === undefined) {
    throw new Error('usePageVisibilityContext must be used within a PageVisibilityProvider');
  }

  return context;
};

/**
 * Hook للتحقق من رؤية صفحة واحدة
 */
export const usePageVisibilityCheck = (pageId: string, userRole?: string) => {
  const { isPageVisible, loading } = usePageVisibilityContext();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!loading && userRole) {
      setVisible(isPageVisible(pageId, userRole));
    }
  }, [pageId, userRole, isPageVisible, loading]);

  return {
    visible,
    loading,
  };
};

/**
 * Hook لفلترة قائمة العناصر حسب الرؤية
 */
export const useFilteredMenuItems = <T extends { id?: string; href?: string; pageId?: string }>(
  items: T[],
  userRole?: string,
) => {
  const { isPageVisible, loading } = usePageVisibilityContext();
  const [filteredItems, setFilteredItems] = useState<T[]>(items);

  useEffect(() => {
    if (!loading && userRole) {
      const filtered = items.filter((item) => {
        // استخراج معرف الصفحة من href أو id أو pageId
        const pageId =
          item.pageId || item.href?.replace(/^\//, '').replace(/\//g, '-') || item.id || '';

        if (!pageId) {
          return true; // إذا لم يكن هناك معرف، اعتبر العنصر مرئي
        }

        return isPageVisible(pageId, userRole);
      });

      setFilteredItems(filtered);
    } else {
      setFilteredItems(items);
    }
  }, [items, userRole, isPageVisible, loading]);

  return {
    filteredItems,
    loading,
  };
};

/**
 * دالة مساعدة لتحويل مسار الصفحة إلى معرف
 */
export const pathToPageId = (path: string): string => {
  return path
    .replace(/^\//, '') // إزالة الشرطة المائلة في البداية
    .replace(/\//g, '-') // استبدال الشرطات المائلة بشرطات
    .replace(/\[.*?\]/g, '') // إزالة المعاملات الديناميكية
    .replace(/-+/g, '-') // دمج الشرطات المتعددة
    .replace(/^-|-$/g, ''); // إزالة الشرطات في البداية والنهاية
};
