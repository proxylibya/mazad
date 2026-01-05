import { useCallback, useEffect, useRef } from 'react';

export interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
}

export interface PageViewData {
  page: string;
  title: string;
  referrer?: string;
}

class AnalyticsService {
  private isEnabled = false;
  private queue: AnalyticsEvent[] = [];
  private isDevelopment = process.env.NODE_ENV !== 'production';

  init() {
    this.isEnabled = true;
    this.flushQueue();
  }

  trackEvent(event: AnalyticsEvent): void {
    if (!this.isEnabled) {
      this.queue.push(event);
      return;
    }

    this.sendEvent(event);
  }

  trackPageView(data: PageViewData): void {
    this.trackEvent({
      event: 'page_view',
      category: 'navigation',
      action: 'page_view',
      label: data.page,
    });
  }

  private sendEvent(event: AnalyticsEvent): void {
    // تحقق من البيئة - لا ترسل في development إلا إذا كان مطلوبًا
    if (typeof window === 'undefined') return;

    // لا تتبع في development لتجنب أخطاء غير ضرورية
    if (this.isDevelopment) {
      // تعطيل التسجيل تماماً في development لتجنب التلوث في console
      return;
    }

    try {
      // تحويل البيانات لصيغة API
      const trackingData = {
        eventType: this.mapEventToType(event.action),
        eventName: event.event,
        category: event.category,
        label: event.label,
        value: event.value,
        page: window.location.pathname,
        referrer: document.referrer || undefined,
      };

      // Send to analytics service
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(trackingData),
        // إضافة keepalive للتأكد من إرسال الطلب حتى عند الانتقال
        keepalive: true,
      }).catch(() => {
        // تجاهل الأخطاء بصمت في development لتجنب تلوث console
      });
    } catch {
      // تجاهل الأخطاء بصمت
    }
  }

  private mapEventToType(
    action: string,
  ):
    | 'PAGE_VIEW'
    | 'CLICK'
    | 'SCROLL'
    | 'FORM_SUBMIT'
    | 'SEARCH'
    | 'DOWNLOAD'
    | 'PURCHASE'
    | 'BID'
    | 'VIEW' {
    switch (action.toLowerCase()) {
      case 'page_view':
      case 'pageview':
        return 'PAGE_VIEW';
      case 'click':
        return 'CLICK';
      case 'scroll':
        return 'SCROLL';
      case 'form_submit':
      case 'submit':
        return 'FORM_SUBMIT';
      case 'search':
        return 'SEARCH';
      case 'download':
        return 'DOWNLOAD';
      case 'purchase':
        return 'PURCHASE';
      case 'bid':
        return 'BID';
      case 'view':
        return 'VIEW';
      default:
        return 'VIEW';
    }
  }

  private flushQueue(): void {
    while (this.queue.length > 0) {
      const event = this.queue.shift();
      if (event) {
        this.sendEvent(event);
      }
    }
  }
}

const analytics = new AnalyticsService();

export const useAnalytics = () => {
  const isInitialized = useRef(false);

  useEffect(() => {
    if (!isInitialized.current) {
      analytics.init();
      isInitialized.current = true;
    }
  }, []);

  const trackEvent = useCallback((event: Omit<AnalyticsEvent, 'event'> & { event?: string; }) => {
    analytics.trackEvent({
      event: event.event || 'custom_event',
      ...event,
    });
  }, []);

  const trackPageView = useCallback((page: string, title?: string) => {
    analytics.trackPageView({
      page,
      title: title || document.title,
      referrer: document.referrer,
    });
  }, []);

  const trackAuctionView = useCallback(
    (auctionId: string, data: { title?: string; status?: string; currentPrice?: number; }) => {
      trackEvent({
        event: 'auction_view',
        category: 'auction',
        action: 'view',
        label: `${auctionId}:${data?.title ?? ''}:${data?.status ?? ''}`,
        value: typeof data?.currentPrice === 'number' ? data.currentPrice : undefined,
      });
    },
    [trackEvent],
  );

  const trackShowroomView = useCallback(
    (showroomId: string, data: { name?: string; location?: string; type?: string; verified?: boolean; }) => {
      trackEvent({
        event: 'showroom_view',
        category: 'showroom',
        action: 'view',
        label: `${showroomId}:${data?.name ?? ''}:${data?.location ?? ''}`,
        value: data?.verified ? 1 : 0,
      });
    },
    [trackEvent],
  );

  const trackCarView = useCallback(
    (carId: string, data: { title?: string; price?: number; brand?: string; }) => {
      trackEvent({
        event: 'car_view',
        category: 'marketplace',
        action: 'view',
        label: `${carId}:${data?.brand ?? ''}:${data?.title ?? ''}`,
        value: typeof data?.price === 'number' ? data.price : undefined,
      });
    },
    [trackEvent],
  );

  const trackSearch = useCallback(
    (searchTerm: string, category?: string) => {
      trackEvent({
        event: 'search',
        category: category || 'general',
        action: 'search',
        label: searchTerm,
      });
    },
    [trackEvent],
  );

  return {
    trackEvent,
    trackPageView,
    trackAuctionView,
    trackShowroomView,
    trackCarView,
    trackSearch,
  };
};
