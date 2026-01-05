import { useEffect, useState } from 'react';
import { SafeLocalStorage } from '../utils/unifiedLocalStorage';

interface SafeStorageProviderProps {
  children: React.ReactNode;
}

/**
 * مزود آمن للتخزين المحلي
 * ينظف البيانات التالفة عند تحميل التطبيق
 */
export default function SafeStorageProvider({ children }: SafeStorageProviderProps) {
  const [isCleanupComplete, setIsCleanupComplete] = useState(false);

  useEffect(() => {
    const cleanupStorage = async () => {
      try {
        // تنظيف البيانات التالفة
        const cleanedCount = SafeLocalStorage.cleanupCorruptedData();

        if (cleanedCount > 0) {
        }

        // التحقق من وجود بيانات مشكوك فيها
        const suspiciousKeys = [
          'selectedCountry',
          'localizationData',
          'compareList',
          'userPreferences',
          'cartItems',
          'wishlist',
          'recentSearches',
          'userSettings',
          'favorites',
          'searchHistory',
          'userSession',
          'authToken',
          'refreshToken',
        ];

        let fixedCount = 0;
        for (const key of suspiciousKeys) {
          try {
            const item = localStorage.getItem(key);
            if (item === 'undefined' || item === 'null' || (item && item.trim() === '')) {
              SafeLocalStorage.removeItem(key);
              fixedCount++;
            } else if (item) {
              // محاولة تحليل JSON للتأكد من صحة البيانات
              try {
                JSON.parse(item);
              } catch (parseError) {
                SafeLocalStorage.removeItem(key);
                fixedCount++;
              }
            }
          } catch (keyError) {
            console.warn(`تحذير: خطأ في فحص المفتاح ${key}:`, keyError);
          }
        }

        if (fixedCount > 0) {
        }

        setIsCleanupComplete(true);
      } catch (error) {
        console.error('خطأ في تنظيف التخزين المحلي:', error);
        setIsCleanupComplete(true); // المتابعة حتى لو فشل التنظيف
      }
    };

    cleanupStorage();
  }, []);

  // عرض شاشة تحميل بسيطة أثناء التنظيف
  if (!isCleanupComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div
            className="animate-spin rounded-full border-4 border-white border-t-blue-600 shadow-lg"
            style={{ width: 24, height: 24 }}
            role="status"
            aria-label="جاري التحميل"
          />
          <p className="text-gray-600">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook للتعامل الآمن مع localStorage
 */
export function useSafeLocalStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    return SafeLocalStorage.getItem(key, defaultValue);
  });

  const setStoredValue = (newValue: T) => {
    try {
      setValue(newValue);
      SafeLocalStorage.setItem(key, newValue);
    } catch (error) {
      console.error(`خطأ في حفظ ${key}:`, error);
    }
  };

  const removeStoredValue = () => {
    try {
      setValue(defaultValue);
      SafeLocalStorage.removeItem(key);
    } catch (error) {
      console.error(`خطأ في حذف ${key}:`, error);
    }
  };

  return [value, setStoredValue, removeStoredValue] as const;
}

/**
 * Hook لمراقبة تغييرات localStorage
 */
export function useLocalStorageListener(key: string, callback: (newValue: any) => void) {
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          const newValue = JSON.parse(e.newValue);
          callback(newValue);
        } catch (error) {
          console.error(`خطأ في تحليل قيمة ${key} الجديدة:`, error);
          SafeLocalStorage.removeItem(key);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, callback]);
}

/**
 * مكون لعرض معلومات التشخيص (للتطوير فقط)
 */
export function StorageDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<any>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const data = {
        storageSize: SafeLocalStorage.getSize(),
        allKeys: SafeLocalStorage.getAllKeys(),
        exportedData: SafeLocalStorage.exportData(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
      };
      setDiagnostics(data);
    }
  }, []);

  if (process.env.NODE_ENV !== 'development' || !diagnostics) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 max-h-64 max-w-md overflow-auto rounded-lg bg-black bg-opacity-75 p-4 text-xs text-white">
      <h3 className="mb-2 font-bold">تشخيص التخزين المحلي</h3>
      <div>
        <p>
          <strong>حجم التخزين:</strong> {diagnostics.storageSize} بايت
        </p>
        <p>
          <strong>عدد المفاتيح:</strong> {diagnostics.allKeys.length}
        </p>
        <p>
          <strong>المفاتيح:</strong> {diagnostics.allKeys.join(', ')}
        </p>
      </div>
      <button
        onClick={() => {
          const cleaned = SafeLocalStorage.cleanupCorruptedData();
          alert(`تم تنظيف ${cleaned} عنصر`);
          window.location.reload();
        }}
        className="mt-2 rounded bg-red-600 px-2 py-1 text-xs hover:bg-red-700"
      >
        تنظيف البيانات التالفة
      </button>
    </div>
  );
}
