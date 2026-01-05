// ملف CSS موحد - يحسّن التحميل ويمنع التضارب
import '../styles/auction-timer-responsive.css';
import '../styles/bidders-list.css';
// import '../styles/messenger-style.css'; // تم حذف الملف الفارغ
import '../styles/mobile-menu-optimized.css';
import '../styles/my-account-responsive.css';
import '../styles/responsive-user-dropdown.css';
import '../styles/toggle-switch-fix.css';
import '../styles/unified-main.css';
// نظام التنقل الموحد - يجمع كل أنماط التنقل والتحميل
import '../styles/unified-navigation.css';
// 🚀 تحسينات أداء معرض الصور والتمرير
import '../styles/gallery-performance.css';
// 🔄 نظام التحميل الموحد
import '../components/ui/loading/loading.css';

import { HydrationBoundary, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

if (typeof window === 'undefined') {
  try {
    require('next/dist/server/future/route-modules/pages/vendored/contexts/amp-context');
  } catch {}
  try {
    require('next/dist/server/future/route-modules/app-page/vendored/contexts/amp-context');
  } catch {}
}

// import { SessionProvider } from 'next-auth/react'; // تم تعطيل نظام next-auth مؤقتاً
import ErrorBoundary from '../components/ErrorBoundary';
import { PageVisibilityProvider } from '../contexts/PageVisibilityContext';
// ⚠️ SiteSectionsContext now re-exports from ContentVisibilityContext - no separate provider needed
import { UserProvider } from '../contexts/UserContext';
import { useAnalytics } from '../lib/hooks/useAnalytics';
// routerErrorSuppressor removed

// Import components directly instead of dynamic imports to avoid webpack async issues
import ClientWrapper from '../components/ClientWrapper';
import SessionManager from '../components/SessionManager';
// استخدام نظام التنقل الموحد الجديد بدلاً من PageTransitionOverlay البسيط
import UnifiedPageTransition from '../components/navigation/UnifiedPageTransition';
import { NotificationProvider } from '../components/ui/EnhancedNotificationSystem';
import { GlobalNavigationLoader, LoadingProvider } from '../components/ui/loading';
import { SimpleLocalizationProvider } from '../contexts/SimpleLocalizationContext';
// نظام إدارة المحتوى المحسن - يمنع وميض المحتوى
import { ContentVisibilityProvider } from '../lib/content-visibility/ContentVisibilityContext';

// تهيئة نظام الأرقام الغربية العالمي
import { initializeWesternNumeralsMiddleware } from '../utils/westernNumeralsMiddleware';

// تهيئة مدير الطلبات المحسن لحل أخطاء الشبكة
import '../lib/network/fetchManager';
import '../lib/network/globalFetchHandler';

// معالجة أخطاء HMR في وضع التطوير - تم دمجها في النظام الموحد

// معالج الأخطاء العامة - يمنع توقف السيرفر عند أخطاء SSE
import { initializeGlobalSocket } from '@/lib/socket/socket-initializer';

const GlobalErrorHandler = React.memo(({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // تفعيل نظام الأرقام الغربية العالمي مرة واحدة
    initializeWesternNumeralsMiddleware();

    // ===== معالجة أخطاء MetaMask/Web3 في React =====
    const walletKeywords = [
      'metamask',
      'ethereum',
      'web3',
      'wallet',
      'inpage.js',
      'failed to connect',
      'chrome-extension://',
      'moz-extension://',
      'nkbihfbeogaeaoehlefnkodbefgpgknn',
      'provider',
      'ethers',
    ];

    const isWalletError = (text: string): boolean => {
      if (!text) return false;
      const lower = text.toLowerCase();
      return walletKeywords.some((k) => lower.includes(k));
    };

    // إخفاء Next.js Error Overlay
    const hideErrorOverlay = () => {
      // البحث عن جميع عناصر Error Overlay المحتملة
      const selectors = [
        'nextjs-portal',
        '[data-nextjs-dialog]',
        '[data-nextjs-dialog-overlay]',
        '[data-nextjs-toast]',
        '#__next-build-watcher',
        '[class*="nextjs-container-errors"]',
      ];

      selectors.forEach((selector) => {
        const elements = document.querySelectorAll(selector);
        elements.forEach((el) => {
          const content = el.textContent || '';
          if (isWalletError(content)) {
            (el as HTMLElement).style.display = 'none';
            el.remove();
          }
        });
      });
    };

    // معالج Unhandled Rejection في React
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonStr = String(reason || '').toLowerCase();

      // التحقق من أخطاء SILENT_ABORT من إضافات المتصفح (مثل frame_ant.js)
      const isSilentAbort =
        reason === 'SILENT_ABORT' ||
        reasonStr === 'silent_abort' ||
        reasonStr.includes('silent_abort') ||
        reasonStr.includes('aborterror') ||
        reason?.name === 'AbortError';

      if (
        isSilentAbort ||
        (reason && (isWalletError(String(reason)) || isWalletError(reason?.message || '')))
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!isSilentAbort) hideErrorOverlay();
      }
    };

    // معالج Error في React
    const handleError = (event: ErrorEvent) => {
      const msg = (event.message || '').toLowerCase();
      const isSilentAbort = msg.includes('silent_abort') || msg.includes('aborterror');

      if (isSilentAbort || isWalletError(event.message) || isWalletError(event.filename || '')) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!isSilentAbort) hideErrorOverlay();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    window.addEventListener('error', handleError, true);

    // MutationObserver لمراقبة DOM
    const observer = new MutationObserver(() => {
      hideErrorOverlay();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // فحص دوري
    const interval = setInterval(hideErrorOverlay, 300);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      window.removeEventListener('error', handleError, true);
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return <>{children}</>;
});
GlobalErrorHandler.displayName = 'GlobalErrorHandler';

type ThemeMode = 'light' | 'dark' | 'system';
type AnimationMode = 'normal' | 'disabled';
type LayoutWidth = 'normal' | 'wide' | 'full';
type FontScale = 'sm' | 'md' | 'lg';

interface ThemeSettings {
  mode: ThemeMode;
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  animations?: AnimationMode;
  textColor?: string;
  fontScale?: FontScale;
  layoutWidth?: LayoutWidth;
}

function hexToHsl(value: string): string | null {
  const hex = value.trim();
  if (!hex) return null;
  const normalized = hex.replace('#', '');
  if (normalized.length !== 3 && normalized.length !== 6) return null;
  const fullHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((c) => c + c)
          .join('')
      : normalized;
  const r = parseInt(fullHex.substring(0, 2), 16) / 255;
  const g = parseInt(fullHex.substring(2, 4), 16) / 255;
  const b = parseInt(fullHex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
      default:
        break;
    }
    h /= 6;
  }
  const hh = Math.round(h * 360);
  const ss = Math.round(s * 100);
  const ll = Math.round(l * 100);
  return `${hh} ${ss}% ${ll}%`;
}

function applyTheme(settings: ThemeSettings) {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const mode = settings.mode || 'system';
  const animationsMode: AnimationMode = settings.animations || 'normal';
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
  } else if (window.matchMedia) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
  if (animationsMode === 'disabled') {
    root.classList.add('no-animations');
  } else {
    root.classList.remove('no-animations');
  }
  if (settings.primaryColor) {
    const hsl = hexToHsl(settings.primaryColor);
    if (hsl) {
      root.style.setProperty('--primary', hsl);
    }
  }
  if (settings.backgroundColor) {
    const hsl = hexToHsl(settings.backgroundColor);
    if (hsl) {
      root.style.setProperty('--background', hsl);
    }
  }
  if (settings.accentColor) {
    const hsl = hexToHsl(settings.accentColor);
    if (hsl) {
      root.style.setProperty('--accent', hsl);
    }
  }
  if (settings.textColor) {
    const hsl = hexToHsl(settings.textColor);
    if (hsl) {
      root.style.setProperty('--text-color', hsl);
    }
  }
  const fontScale = settings.fontScale || 'md';
  const layoutWidth = settings.layoutWidth || 'normal';
  const fontScaleValue =
    fontScale === 'sm' ? '0.95' : fontScale === 'lg' ? '1.05' : '1';
  const layoutWidthValue =
    layoutWidth === 'wide'
      ? '1280px'
      : layoutWidth === 'full'
        ? '100%'
        : '1100px';
  root.style.setProperty('--font-scale', fontScaleValue);
  root.style.setProperty('--container-max-width', layoutWidthValue);
}

// مكون تتبع التحليلات التلقائي
const AnalyticsTracker = React.memo(({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    // تتبع الصفحة الأولى
    if (typeof window !== 'undefined') {
      trackPageView(window.location.pathname, document.title);
    }

    // تتبع تغييرات الصفحات
    const handleRouteChange = (url: string) => {
      if (typeof document !== 'undefined') {
        trackPageView(url, document.title);
      }
    };

    router.events.on('routeChangeComplete', handleRouteChange);

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, trackPageView]);

  return <>{children}</>;
});
AnalyticsTracker.displayName = 'AnalyticsTracker';

export default function App({ Component, pageProps }: AppProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 دقيقة - يمنع إعادة الجلب المتكررة
            gcTime: 5 * 60 * 1000, // 5 دقائق - تنظيف ذكي للنتائج
            retry: 2,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
            refetchOnMount: false,
          },
        },
      }),
  );

  // Initialize Socket.IO server/client globally once on the client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      void initializeGlobalSocket();
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadTheme = async () => {
      try {
        const res = await fetch('/api/site-theme');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && data?.settings) {
          applyTheme(data.settings as ThemeSettings);
        }
      } catch {}
    };
    void loadTheme();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={pageProps?.dehydratedState}>
        <ErrorBoundary>
          {/* <SessionProvider session={pageProps.session}> تم تعطيل نظام next-auth مؤقتاً */}
          <SimpleLocalizationProvider>
            {/* نظام إدارة المحتوى الموحد - يوفر جميع بيانات الأقسام والعناصر */}
            <ContentVisibilityProvider initialData={pageProps?.contentVisibilityConfig}>
              <UserProvider>
                <PageVisibilityProvider>
                  <NotificationProvider>
                    {/* نظام التحميل الموحد - يتتبع حالات التحميل عبر التطبيق */}
                    <LoadingProvider trackNavigation={true}>
                      {/* نظام التنقل الموحد - دائرة زرقاء وبيضاء تدور في المنتصف */}
                      <UnifiedPageTransition>
                        {/* شريط التحميل العلوي عند التنقل */}
                        <GlobalNavigationLoader />
                        <GlobalErrorHandler>
                          <AnalyticsTracker>
                            <ClientWrapper>
                              <SessionManager>
                                <Head>
                                  <meta
                                    name="viewport"
                                    content="width=device-width, initial-scale=1"
                                  />
                                  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
                                  <link rel="alternate icon" href="/favicon.ico" />
                                  <meta
                                    name="description"
                                    content="موقع مزادات السيارات - أداء عالي محسن للزيارات العالية"
                                  />
                                  <meta
                                    name="keywords"
                                    content="مزادات, سيارات, أداء عالي, تحسين"
                                  />
                                </Head>
                                <Component {...pageProps} />
                              </SessionManager>
                            </ClientWrapper>
                          </AnalyticsTracker>
                        </GlobalErrorHandler>
                      </UnifiedPageTransition>
                    </LoadingProvider>
                  </NotificationProvider>
                </PageVisibilityProvider>
              </UserProvider>
            </ContentVisibilityProvider>
          </SimpleLocalizationProvider>
          {/* </SessionProvider> */}
        </ErrorBoundary>
      </HydrationBoundary>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
