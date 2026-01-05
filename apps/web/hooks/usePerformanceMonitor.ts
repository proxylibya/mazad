/**
 * Performance Monitor Hooks - خطافات مراقبة الأداء
 */

import { useCallback, useEffect, useRef, useState } from 'react';

// نوع بيانات الأداء
interface PerformanceMetrics {
  renderTime: number;
  componentMount: number;
  apiCallTime: number;
  memoryUsage?: number;
  domNodes?: number;
}

// Hook لمراقبة أداء المكونات
export function useComponentPerformance(componentName: string) {
  const mountTimeRef = useRef<number>();
  const renderCountRef = useRef(0);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    componentMount: 0,
    apiCallTime: 0,
  });

  // قياس وقت التحميل
  useEffect(() => {
    mountTimeRef.current = performance.now();

    return () => {
      if (mountTimeRef.current) {
        const mountDuration = performance.now() - mountTimeRef.current;
        setMetrics((prev) => ({
          ...prev,
          componentMount: mountDuration,
        }));

        console.log(`[Performance] ${componentName} mount time: ${mountDuration.toFixed(2)}ms`);
      }
    };
  }, [componentName]);

  // قياس عدد مرات الإعادة التصيير
  useEffect(() => {
    renderCountRef.current++;

    if (renderCountRef.current > 1) {
      console.log(`[Performance] ${componentName} re-rendered ${renderCountRef.current} times`);
    }
  });

  // قياس وقت العرض
  const measureRenderTime = useCallback(() => {
    const start = performance.now();

    return () => {
      const renderTime = performance.now() - start;
      setMetrics((prev) => ({
        ...prev,
        renderTime,
      }));

      if (renderTime > 16) {
        // أكثر من 16ms (60fps)
        console.warn(`[Performance] ${componentName} slow render: ${renderTime.toFixed(2)}ms`);
      }
    };
  }, [componentName]);

  return {
    metrics,
    renderCount: renderCountRef.current,
    measureRenderTime,
  };
}

// Hook لمراقبة استهلاك الذاكرة
export function useMemoryMonitor() {
  const [memoryInfo, setMemoryInfo] = useState<{
    used: number;
    total: number;
    percentage: number;
  }>({ used: 0, total: 0, percentage: 0 });

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const used = memory.usedJSHeapSize / 1024 / 1024; // MB
        const total = memory.totalJSHeapSize / 1024 / 1024; // MB
        const percentage = (used / total) * 100;

        setMemoryInfo({ used, total, percentage });

        if (percentage > 80) {
          console.warn(`[Memory] High memory usage: ${percentage.toFixed(1)}%`);
        }
      }
    };

    checkMemory();
    const interval = setInterval(checkMemory, 5000); // كل 5 ثواني

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

// Hook لمراقبة أداء طلبات API
export function useApiPerformance() {
  const [apiMetrics, setApiMetrics] = useState<{
    [key: string]: {
      averageTime: number;
      callCount: number;
      errorCount: number;
      lastCall: number;
    };
  }>({});

  const measureApiCall = useCallback((url: string) => {
    const start = performance.now();

    return {
      success: () => {
        const duration = performance.now() - start;

        setApiMetrics((prev) => {
          const existing = prev[url] || {
            averageTime: 0,
            callCount: 0,
            errorCount: 0,
            lastCall: 0,
          };
          const newCount = existing.callCount + 1;
          const newAverage = (existing.averageTime * existing.callCount + duration) / newCount;

          return {
            ...prev,
            [url]: {
              ...existing,
              averageTime: newAverage,
              callCount: newCount,
              lastCall: Date.now(),
            },
          };
        });

        if (duration > 1000) {
          // أبطأ من ثانية
          console.warn(`[API] Slow API call: ${url} took ${duration.toFixed(2)}ms`);
        }
      },

      error: () => {
        setApiMetrics((prev) => {
          const existing = prev[url] || {
            averageTime: 0,
            callCount: 0,
            errorCount: 0,
            lastCall: 0,
          };

          return {
            ...prev,
            [url]: {
              ...existing,
              errorCount: existing.errorCount + 1,
              lastCall: Date.now(),
            },
          };
        });
      },
    };
  }, []);

  return { apiMetrics, measureApiCall };
}

// Hook لمراقبة أداء الصفحة العام
export function usePagePerformance() {
  const [pageMetrics, setPageMetrics] = useState<{
    loadTime: number;
    domContentLoaded: number;
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
  }>({
    loadTime: 0,
    domContentLoaded: 0,
    firstPaint: 0,
    firstContentfulPaint: 0,
    largestContentfulPaint: 0,
  });

  useEffect(() => {
    const collectMetrics = () => {
      const navigation = performance.getEntriesByType(
        'navigation',
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      const navStart = navigation.startTime || 0;

      const metrics = {
        loadTime: navigation.loadEventEnd - navStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navStart,
        firstPaint: paint.find((entry) => entry.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint:
          paint.find((entry) => entry.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: 0,
      };

      // مراقبة LCP
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];

          setPageMetrics((prev) => ({
            ...prev,
            largestContentfulPaint: lastEntry.startTime,
          }));
        });

        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      }

      setPageMetrics(metrics);

      // تحذيرات الأداء
      if (metrics.loadTime > 3000) {
        console.warn(`[Page] Slow page load: ${metrics.loadTime.toFixed(2)}ms`);
      }
    };

    if (document.readyState === 'complete') {
      collectMetrics();
    } else {
      window.addEventListener('load', collectMetrics);
      return () => window.removeEventListener('load', collectMetrics);
    }
  }, []);

  return pageMetrics;
}

// Hook لمراقبة عدد عقد DOM
export function useDOMNodeMonitor() {
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    const countNodes = () => {
      const count = document.querySelectorAll('*').length;
      setNodeCount(count);

      if (count > 1500) {
        console.warn(`[DOM] High DOM node count: ${count}`);
      }
    };

    countNodes();

    // مراقبة التغييرات في DOM
    const observer = new MutationObserver(() => {
      setTimeout(countNodes, 100); // تأخير قصير لتجنب الحسابات المفرطة
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return nodeCount;
}

// Hook شامل لجميع مقاييس الأداء
export function usePerformanceMonitor(componentName?: string) {
  const componentPerf = useComponentPerformance(componentName || 'Unknown');
  const memoryInfo = useMemoryMonitor();
  const { apiMetrics, measureApiCall } = useApiPerformance();
  const pageMetrics = usePagePerformance();
  const nodeCount = useDOMNodeMonitor();

  // جمع جميع المقاييس
  const allMetrics = {
    component: componentPerf.metrics,
    memory: memoryInfo,
    api: apiMetrics,
    page: pageMetrics,
    domNodes: nodeCount,
    renderCount: componentPerf.renderCount,
  };

  // تصدير تقرير الأداء
  const exportReport = useCallback(() => {
    const report = {
      timestamp: new Date().toISOString(),
      component: componentName,
      metrics: allMetrics,
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.log('[Performance Report]', report);
    return report;
  }, [allMetrics, componentName]);

  return {
    ...allMetrics,
    measureApiCall,
    measureRenderTime: componentPerf.measureRenderTime,
    exportReport,
  };
}

export default usePerformanceMonitor;
