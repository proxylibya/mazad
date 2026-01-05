// Global fetch handler لمعالجة أخطاء fetch في التطبيق
if (typeof window !== 'undefined') {
  // حفظ النسخة الأصلية من fetch
  const originalFetch = window.fetch;

  // استبدال fetch بنسخة محسنة
  // دالة مساعدة للتحقق من أخطاء الإلغاء (بما فيها إضافات المتصفح)
  const isSilentAbortError = (error: unknown): boolean => {
    if (!error) return false;
    const errorString = String(error).toLowerCase();
    return (
      error === 'SILENT_ABORT' ||
      errorString === 'silent_abort' ||
      errorString.includes('silent_abort') ||
      errorString.includes('aborted') ||
      (typeof error === 'object' && error !== null && 'name' in error &&
        (error as { name?: unknown; }).name === 'AbortError') ||
      (typeof error === 'object' && error !== null && 'code' in error &&
        (error as { code?: unknown; }).code === 20)
    );
  };

  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const resolveUrl = (): string => {
      const arg0 = args[0] as unknown;
      if (typeof arg0 === 'string') return arg0;
      // Request
      if (typeof Request !== 'undefined' && arg0 instanceof Request) return arg0.url;
      // URL-like (has href)
      if (arg0 && typeof arg0 === 'object' && 'href' in arg0) {
        const href = (arg0 as URL).href;
        if (typeof href === 'string') return href;
      }
      // Object with url string
      if (arg0 && typeof arg0 === 'object' && 'url' in arg0) {
        const u = (arg0 as { url: unknown; }).url;
        if (typeof u === 'string') return u;
      }
      return 'unknown';
    };
    try {
      // محاولة جلب البيانات مع التقاط أخطاء الإضافات
      let response: Response;
      try {
        response = await originalFetch(...args);
      } catch (fetchError) {
        // التقاط أخطاء SILENT_ABORT من إضافات المتصفح (مثل frame_ant.js)
        if (isSilentAbortError(fetchError)) {
          return new Response(null, { status: 499 });
        }
        throw fetchError;
      }

      // في حالة وجود خطأ في الاستجابة
      if (!response.ok) {
        const url = resolveUrl();

        // تجاهل الأخطاء غير المهمة في بيئة التطوير
        const shouldIgnore = typeof url === 'string' && (
          // تجاهل أخطاء Socket.IO
          url.includes('/api/socketio') ||
          url.includes('/api/socket') ||
          // تجاهل أخطاء MetaMask والإضافات الأخرى
          url.includes('chrome-extension://') ||
          url.includes('moz-extension://') ||
          url.includes('MetaMask') ||
          // تجاهل أخطاء Next.js stack-frame (ناتجة من الإضافات)
          url.includes('__nextjs_original-stack-frame')
        );

        if (!shouldIgnore) {
          console.warn(`[Fetch Warning] ${response.status} ${response.statusText} - ${url}`);
        }
      }

      return response;
    } catch (error) {
      const url = resolveUrl();

      // تجاهل أخطاء الإلغاء صراحة دون أي تسجيل أو استجابة بديلة
      const abortedBySignal =
        (typeof args[0] === 'object' && args[0] !== null && 'signal' in (args[0] as Request) && (args[0] as Request).signal?.aborted) ||
        (args[1] && typeof args[1] === 'object' && 'signal' in (args[1] as RequestInit) && (args[1] as RequestInit).signal?.aborted);

      // فحص شامل لأخطاء الإلغاء بما فيها SILENT_ABORT
      const errorString = String(error).toLowerCase();
      const isAbortLike =
        abortedBySignal ||
        error === 'SILENT_ABORT' ||
        errorString === 'silent_abort' ||
        errorString.includes('silent_abort') ||
        (typeof error === 'object' && error !== null && 'name' in error && (error as { name?: unknown; }).name === 'AbortError') ||
        (typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown; }).code === 20) ||
        (typeof error === 'object' && error !== null && 'message' in error &&
          (String((error as { message?: unknown; }).message).toLowerCase().includes('abort') ||
            String((error as { message?: unknown; }).message).includes('SILENT_ABORT')));
      if (isAbortLike) {
        // تجاهل صامت تماماً - لا نرمي الخطأ
        return new Response(null, { status: 499 });
      }

      // تحسين رسالة الخطأ
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        // تجاهل أخطاء fetch للـ APIs الداخلية التي لها fallback
        const silentUrls = ['/api/site-sections', '/api/page-settings'];
        const shouldBeSilent = typeof url === 'string' && silentUrls.some(u => url.includes(u));

        if (!shouldBeSilent) {
          console.error(
            `[Network Error] Failed to fetch ${url}. Check network connection or CORS settings.`,
          );
        }

        // إنشاء استجابة وهمية لتجنب تعطيل التطبيق
        if (process.env.NODE_ENV === 'development') {
          return new Response(
            JSON.stringify({
              error: 'Network request failed',
              message: shouldBeSilent ? 'Using default data' : 'Check console for details',
              url,
            }),
            {
              status: 500,
              statusText: 'Network Error',
              headers: { 'Content-Type': 'application/json' },
            },
          );
        }
      }

      throw error;
    }
  };

  console.log('[Global Fetch Handler] Initialized successfully');
}

export { };
