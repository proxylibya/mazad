// Hook شامل لتحسين الاستقرار والأداء
import cacheSystem from '@/lib/advanced-cache';
import { MemoryAlert, useMemoryMonitor } from '@/lib/memory-manager';
import { usePerformanceMonitor } from '@/lib/performance-monitor';
import { useCallback, useEffect, useRef, useState } from 'react';

interface StabilityMetrics {
  memoryUsage: number;
  performanceScore: number;
  cacheHitRate: number;
  errorCount: number;
  renderTime: number;
  isStable: boolean;
}

interface StabilityOptions {
  enableMemoryMonitoring?: boolean;
  enablePerformanceTracking?: boolean;
  enableCaching?: boolean;
  enableErrorTracking?: boolean;
  autoOptimize?: boolean;
  reportInterval?: number;
}

export const useStabilityEnhancer = (options: StabilityOptions = {}) => {
  const {
    enableMemoryMonitoring = true,
    enablePerformanceTracking = true,
    enableCaching = true,
    enableErrorTracking = true,
    autoOptimize = true,
    reportInterval = 10000
  } = options;

  // Hooks للمراقبة
  const { measureApiCall, measureComponentRender, getStats: getPerformanceStats } = usePerformanceMonitor();
  const { getStats: getMemoryStats, onAlert, forceCleanup } = useMemoryMonitor();

  // State للمقاييس
  const [metrics, setMetrics] = useState<StabilityMetrics>({
    memoryUsage: 0,
    performanceScore: 0,
    cacheHitRate: 0,
    errorCount: 0,
    renderTime: 0,
    isStable: true
  });

  // متابعة الأخطاء
  const errorCount = useRef(0);
  const lastReport = useRef(Date.now());
  const alertsReceived = useRef<MemoryAlert[]>([]);

  // مراقبة تنبيهات الذاكرة
  useEffect(() => {
    if (!enableMemoryMonitoring) return;

    const unsubscribe = onAlert((alert) => {
      alertsReceived.current.push(alert);

      if (alert.level === 'critical' && autoOptimize) {
        handleCriticalMemoryAlert();
      }

      console.warn(`🚨 Memory Alert [${alert.level}]: ${alert.message}`);
    });

    return unsubscribe;
  }, [enableMemoryMonitoring, autoOptimize, onAlert]);

  // تقرير دوري للمقاييس
  useEffect(() => {
    if (!reportInterval) return;

    const interval = setInterval(() => {
      updateMetrics();
    }, reportInterval);

    return () => clearInterval(interval);
  }, [reportInterval]);

  // معالجة تنبيه الذاكرة الحرج
  const handleCriticalMemoryAlert = useCallback(() => {
    console.warn('🚨 Critical memory alert - performing emergency optimization');

    // تنظيف فوري للذاكرة
    forceCleanup();

    // مسح cache غير الضروري
    void cacheSystem.clear();

    // طلب garbage collection
    if (window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
      } catch (error) {
        console.warn('Could not force garbage collection:', error);
      }
    }
  }, [forceCleanup]);

  // تحديث المقاييس
  const updateMetrics = useCallback(() => {
    const memoryStats = getMemoryStats();
    const performanceStats = getPerformanceStats();
    const cacheStats = cacheSystem.getStats();

    const newMetrics: StabilityMetrics = {
      memoryUsage: memoryStats?.current.percentage || 0,
      performanceScore: calculatePerformanceScore(performanceStats),
      cacheHitRate: typeof cacheStats.hitRate === 'number' ? cacheStats.hitRate : 0,
      errorCount: errorCount.current,
      renderTime: performanceStats.averageApiTime || 0,
      isStable: true
    };

    // تحديد الاستقرار العام
    newMetrics.isStable = (
      newMetrics.memoryUsage < 80 &&
      newMetrics.performanceScore > 70 &&
      newMetrics.errorCount < 5 &&
      alertsReceived.current.filter(a => a.level === 'critical').length === 0
    );

    setMetrics(newMetrics);

    // إرسال تقرير للخادم في حالة عدم الاستقرار
    if (!newMetrics.isStable && process.env.NODE_ENV === 'production') {
      reportStabilityIssue(newMetrics);
    }

  }, [getMemoryStats, getPerformanceStats]);

  // حساب نقاط الأداء
  const calculatePerformanceScore = (stats: any): number => {
    if (!stats) return 100;

    let score = 100;

    // خصم نقاط بناءً على زمن الاستجابة
    if (stats.averageApiTime > 1000) score -= 30;
    else if (stats.averageApiTime > 500) score -= 15;
    else if (stats.averageApiTime > 200) score -= 5;

    // خصم نقاط بناءً على عدد الأخطاء
    score -= Math.min(errorCount.current * 5, 40);

    return Math.max(score, 0);
  };

  // إرسال تقرير مشكلة الاستقرار
  const reportStabilityIssue = useCallback(async (metrics: StabilityMetrics) => {
    try {
      await fetch('/api/stability-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          timestamp: Date.now(),
          userAgent: navigator.userAgent,
          url: window.location.href,
          alerts: alertsReceived.current.slice(-5) // آخر 5 تنبيهات
        })
      });
    } catch (error) {
      console.error('Failed to report stability issue:', error);
    }
  }, []);

  // تسجيل خطأ
  const recordError = useCallback((error: Error, context?: string) => {
    errorCount.current++;

    console.error('Error recorded by Stability Enhancer:', {
      error: error.message,
      context,
      timestamp: Date.now()
    });

    // تحديث المقاييس فوراً عند حدوث خطأ
    if (errorCount.current % 3 === 0) {
      updateMetrics();
    }
  }, [updateMetrics]);

  // تحسين تلقائي للأداء
  const performAutoOptimization = useCallback(() => {
    console.log('🔧 Performing automatic optimization...');

    const memoryStats = getMemoryStats();

    // تحسينات بناءً على حالة الذاكرة
    if (memoryStats && memoryStats.current.percentage > 70) {
      // تنظيف cache القديم
      void cacheSystem.clear();

      // تنظيف DOM
      cleanupDOM();

      // تحسين الصور
      optimizeImages();
    }

    // تحديث المقاييس بعد التحسين
    setTimeout(updateMetrics, 2000);
  }, [getMemoryStats, updateMetrics]);

  // تنظيف DOM
  const cleanupDOM = () => {
    // إزالة العناصر المخفية القديمة
    const hiddenElements = document.querySelectorAll<HTMLElement>('[style*="display: none"]');
    hiddenElements.forEach(element => {
      if (!element.dataset.keepAlive) {
        element.remove();
      }
    });

    // تنظيف Event Listeners غير المستخدمة
    const oldListeners = document.querySelectorAll<HTMLElement>('[data-listener-cleanup]');
    oldListeners.forEach(element => {
      element.removeAttribute('data-listener-cleanup');
    });
  };

  // تحسين الصور
  const optimizeImages = () => {
    const images = document.querySelectorAll<HTMLImageElement>('img');
    images.forEach(img => {
      // تحويل الصور الكبيرة إلى lazy loading
      if (!img.loading) {
        img.loading = 'lazy';
      }

      // إزالة src للصور غير المرئية
      if (img.offsetParent === null && !img.dataset.keepSrc) {
        img.dataset.originalSrc = img.src;
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      }
    });
  };

  // استرداد الصور المحسنة
  const restoreOptimizedImages = () => {
    const images = document.querySelectorAll<HTMLImageElement>('img[data-original-src]');
    images.forEach(img => {
      if (img.dataset.originalSrc) {
        img.src = img.dataset.originalSrc;
        delete img.dataset.originalSrc;
      }
    });
  };

  // مراقب الاتصال
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // API محسن للطلبات
  const enhancedFetch = useCallback(async (url: string, options?: RequestInit) => {
    const cacheKey = `api_${url}`;

    // محاولة الحصول من Cache أولاً إذا كان offline
    if (!isOnline) {
      const cached = await cacheSystem.get(cacheKey);
      if (cached) {
        return { data: cached, fromCache: true };
      }
    }

    try {
      return await measureApiCall(url, async () => {
        const response = await fetch(url, options);
        const data = await response.json();

        // حفظ في Cache للاستخدام المستقبلي
        void cacheSystem.set(cacheKey, data, 5 * 60);

        return { data, fromCache: false };
      });
    } catch (error) {
      recordError(error as Error, `API call to ${url}`);

      // الرجوع للـ Cache في حالة الخطأ
      const cached = await cacheSystem.get(cacheKey);
      if (cached) {
        return { data: cached, fromCache: true, error: true };
      }

      throw error;
    }
  }, [isOnline, measureApiCall, recordError]);

  return {
    // المقاييس الحالية
    metrics,

    // معلومات الحالة
    isStable: metrics.isStable,
    isOnline,

    // دوال التحسين
    performAutoOptimization,
    recordError,
    updateMetrics,

    // API محسن
    enhancedFetch,

    // دوال التحكم
    forceCleanup,
    restoreOptimizedImages,

    // معلومات مفصلة
    getDetailedReport: () => ({
      memory: getMemoryStats(),
      performance: getPerformanceStats(),
      cache: cacheSystem.getStats(),
      alerts: alertsReceived.current.slice(-10),
      errors: errorCount.current,
      timestamp: Date.now()
    })
  };
};

export type { StabilityMetrics, StabilityOptions };

