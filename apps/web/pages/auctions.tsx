/* eslint-disable react/display-name */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import { GetServerSideProps } from 'next';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { OpensooqNavbar, Pagination } from '@/components/common';
import { usePagination } from '@/hooks/usePagination';

import YearRangeSelector from '@/components/YearRangeSelector';
import { AuctionCardGrid, NewAuctionCard } from '@/components/features/auctions';
import BasicBrandModelFilter from '@/components/features/auctions/filters/BasicBrandModelFilter';
import { useQuickNotifications } from '@/components/ui/EnhancedNotificationSystem';
import { useAuctionLiveData } from '@/hooks/useAuctionLiveData';
import { useAuctionSSE } from '@/hooks/useAuctionSSE';
import useAuthProtection from '@/hooks/useAuthProtection';
import { useFavorites } from '@/hooks/useFavorites';
import { useGlobalSecondTick } from '@/hooks/useGlobalSecondTick';
// import { usePerformanceMonitor } from '@/lib/performance-monitor';
import { AUCTION_LABELS } from '@/config/auction-labels';
import { AUCTION_COLORS } from '@/config/auction-theme';
import { cityNames } from '@/data/libyan-cities';
import type { AuctionStatus } from '@/types/auction-unified';
import { formatAuctionDate } from '@/utils/auctionHelpers';
import { getAuctionStatus as resolveAuctionStatus } from '@/utils/auctionStatus';
import { formatMileage } from '@/utils/carTranslations';
import { log } from '@/utils/clientLogger';
import { translateToArabic } from '@/utils/formatters';
import { UnifiedLocalStorage } from '@/utils/unifiedLocalStorage';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import ChevronUpIcon from '@heroicons/react/24/outline/ChevronUpIcon';
import ClockIcon from '@heroicons/react/24/outline/ClockIcon';
import CurrencyDollarIcon from '@heroicons/react/24/outline/CurrencyDollarIcon';
import FolderIcon from '@heroicons/react/24/outline/FolderIcon';
import FunnelIcon from '@heroicons/react/24/outline/FunnelIcon';
import ListBulletIcon from '@heroicons/react/24/outline/ListBulletIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import Squares2X2Icon from '@heroicons/react/24/outline/Squares2X2Icon';
import TrophyIcon from '@heroicons/react/24/outline/TrophyIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import { SignalIcon, StarIcon } from '@heroicons/react/24/solid';

// تم إزالة TargetIcon لعدم استخدامه - تم استبدال جميع المراجع بـ SignalIcon/TrophyIcon

// Dynamic imports محسنة للأداء - تحميل ذكي
const LoginModal = dynamic(() => import('@/components/auth/LoginModal'), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-gray-200" />,
});

// Dynamic imports محسنة مع loading states
const SafetyTips = dynamic(() => import('@/components/SafetyTips'), {
  ssr: false,
  loading: () => <div className="h-32 w-full animate-pulse rounded-lg bg-gray-200" />,
});

// إنشاء خيارات المدن للفلتر
const locationOptions = ['جميع المدن', ...cityNames];

// أنواع البيانات للمزادات (متوافقة مع Prisma/SSR)
interface BaseUser {
  id: string | number;
  name: string;
  verified?: boolean;
  phone?: string;
}

interface CarImage {
  isPrimary?: boolean;
  fileUrl?: string;
  createdAt?: string | Date;
}

interface Car {
  id: string;
  brand: string;
  make?: string | null;
  model: string;
  year: number | null;
  price: number | null;
  images: string[];
  carImages?: CarImage[]; // الصور الحقيقية
  title?: string;
  condition?: string;
  mileage?: number;
  location?: string | { city?: string; area?: string; lat?: number; lng?: number };
  area?: string; // منطقة المزاد
  status?: string; // SOLD | AVAILABLE ...
  user: BaseUser; // البائع
  description?: string;
  fuelType?: string;
  transmission?: string;
  bodyType?: string;
  color?: string;
}

interface Bid {
  id: string | number;
  amount: number;
  user: BaseUser;
  createdAt: Date | string;
}

interface Auction {
  id: string; // Prisma id
  title: string;
  startingPrice: number;
  currentPrice: number;
  reservePrice?: number | null;
  startTime?: Date | string | null;
  endTime: Date | string;
  status: string; // ACTIVE | UPCOMING | ENDED
  description?: string;
  createdAt: Date | string;
  updatedAt?: Date | string; // ✨ مطلوب لترتيب "تم البيع"
  car: Car;
  bids: Bid[];
  winner?: BaseUser | null;
  // ✅ بيانات الترويج والتمييز - للشارات الذهبية
  featured?: boolean;
  promotionPackage?: string;
  promotionDays?: number;
  promotionPriority?: number;
  promotionEndDate?: Date | string | null;
}

type AuctionWithDetails = Auction;

interface AuctionsPageProps {
  auctions: AuctionWithDetails[];
  stats: {
    live: number;
    upcoming: number;
    ended: number;
    total: number;
  };
  error?: string;
}

// صفحة المزادات الرئيسية محسنة بـ React.memo
const AuctionsPage: React.FC<AuctionsPageProps> = React.memo(
  ({
    auctions: initialAuctions = [],
    stats: initialStats = { live: 0, upcoming: 0, ended: 0, total: 0 },
    error: ssrError,
  }) => {
    const router = useRouter();
    // تم تعطيل نظام مراقبة الأداء لتحسين الأداء
    // const { measureApiCall, measureComponentRender, startTimer, endTimer } = usePerformanceMonitor();
    const _measureApiCall = <T,>(_: string, fn: () => T): T => fn();
    // دعم النمطين: (name, fn) أو (name) فقط مع إرجاع cleanup no-op
    const measureComponentRender: (name: string, fn?: () => void) => () => void = (_name, fn) => {
      if (typeof fn === 'function') return fn;
      return () => {};
    };
    const _startTimer = (_name: string) => 'disabled';
    const _endTimer = (_id: string) => 0;
    const globalTick = useGlobalSecondTick(true);

    // قياس أداء تحميل الصفحة
    React.useEffect(() => {
      const cleanup = measureComponentRender('AuctionsPage');
      return cleanup;
    }, []);

    // استخدام نظام الحماية - الصفحة عامة (لا تتطلب تسجيل دخول للعرض)
    const { isAuthenticated, showAuthModal, setShowAuthModal } = useAuthProtection({
      requireAuth: false, // الصفحة متاحة للجميع
      showModal: false, // لا تظهر modal تسجيل الدخول تلقائياً
    });

    const [auctions, setAuctions] = useState<AuctionWithDetails[]>(initialAuctions);

    // نظام التحديث التلقائي للبيانات المباشرة - بعد تعريف auctions state
    const auctionIds = React.useMemo(() => auctions.map((a) => a.id), [auctions]);

    // تعريف وضع العرض مبكراً لأنه مستخدم في تبعيات useEffect أدناه
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    // تتبع العناصر الظاهرة فقط لخفض حمل SSE
    const itemRefs = React.useRef<Record<string, HTMLElement | null>>({});
    const setItemRef = React.useCallback(
      (id: string) => (el: HTMLElement | null) => {
        itemRefs.current[id] = el;
      },
      [],
    );
    const [visibleSet, setVisibleSet] = useState<Set<string>>(new Set());
    const visibleAuctionIds = useMemo(() => Array.from(visibleSet), [visibleSet]);

    // دالة مساعدة للمقارنة بين مجموعتين
    const areSetsEqual = React.useCallback((a: Set<string>, b: Set<string>) => {
      if (a.size !== b.size) return false;
      for (const item of a) {
        if (!b.has(item)) return false;
      }
      return true;
    }, []);

    useEffect(() => {
      // تنظيف معرفات مرئية لم تعد موجودة
      const currentIds = new Set(auctions.map((a) => String(a.id)));
      setVisibleSet((prev) => {
        const next = new Set<string>();
        prev.forEach((id) => {
          if (currentIds.has(id)) next.add(id);
        });
        // إرجاع نفس المرجع إذا لم تتغير القيم
        return areSetsEqual(prev, next) ? prev : next;
      });

      // إعداد مراقب الرؤية
      const observer = new IntersectionObserver(
        (entries) => {
          setVisibleSet((prev) => {
            const next = new Set(prev);
            let changed = false;
            for (const entry of entries) {
              const el = entry.target as HTMLElement;
              const id = el.getAttribute('data-auction-id');
              if (!id) continue;
              if (entry.isIntersecting && entry.intersectionRatio > 0) {
                if (!next.has(id)) {
                  next.add(id);
                  changed = true;
                }
              } else {
                if (next.has(id)) {
                  next.delete(id);
                  changed = true;
                }
              }
            }
            // إرجاع نفس المرجع إذا لم تتغير القيم
            return changed ? next : prev;
          });
        },
        { root: null, rootMargin: '0px', threshold: 0.1 },
      );

      // ملاحظة العناصر الحالية
      Object.entries(itemRefs.current).forEach(([_id, el]) => {
        if (el) observer.observe(el);
      });

      return () => {
        observer.disconnect();
      };
    }, [auctions, viewMode, areSetsEqual]);
    const { getAuctionData } = useAuctionLiveData(auctionIds, {
      enabled: auctions.length > 0,
      interval: 15000, // تحديث كل 15 ثانية
      onUpdate: (data) => {
        // تحديث البيانات المحلية
        if (Math.random() < 0.1) {
          console.info(
            `[📊 Auctions] تحديث ${data.length} مزاد - ${new Date().toLocaleTimeString('ar')}`,
          );
        }
      },
    });
    // اشتراك SSE لتحديث فوري للسعر وعدد المزايدات في البطاقات (IDs الظاهرة فقط)
    useAuctionSSE(visibleAuctionIds, {
      enabled: visibleAuctionIds.length > 0,
      onBid: (evt) => {
        setAuctions((prev) => {
          if (!prev || prev.length === 0) return prev;
          let changed = false;
          const next = prev.map((a) => {
            if (String(a.id) !== String(evt.auctionId)) return a;
            changed = true;
            const currentBid =
              typeof (a as any).currentBid === 'number'
                ? (a as any).currentBid
                : (a as any).currentPrice || 0;
            const nextBid =
              typeof evt.currentBid === 'number' ? evt.currentBid : Number(evt.currentBid);
            const newBidCount =
              typeof evt.bidCount === 'number'
                ? evt.bidCount
                : ((a as any).totalBids || (a as any).bids?.length || 0) + 1;
            return {
              ...a,
              currentPrice: nextBid || currentBid,
              // حقل متوافق إذا كان موجوداً في بعض الشاشات
              currentBid: nextBid || currentBid,
              // تحديث عدد المزايدات إن وُجد
              totalBids: newBidCount,
            } as AuctionWithDetails;
          });
          return changed ? next : prev;
        });
      },
      onStatus: (evt) => {
        if ((evt as any)?.status !== 'sold') return;
        setAuctions((prev) => {
          if (!prev || prev.length === 0) return prev;
          let changed = false;
          const nowISO = new Date().toISOString();
          const next = prev.map((a) => {
            if (String(a.id) !== String((evt as any).auctionId)) return a;
            changed = true;
            return {
              ...a,
              status: 'SOLD', // ✅ تحديث الحالة إلى SOLD مباشرة
              endTime: nowISO,
              // وسم السيارة كمباعة لتمكين عرض "تم البيع" على البطاقة فوراً
              car: { ...(a as any).car, status: 'SOLD' },
            } as AuctionWithDetails;
          });
          return changed ? next : prev;
        });
      },
    });
    const [totalAuctions, setTotalAuctions] = useState(initialStats.total);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    // إعداد الترقيم
    const pagination = usePagination({
      initialPage: 1,
      itemsPerPage: 20,
      totalItems: totalAuctions,
      updateURL: true,
      pageParam: 'page',
    });

    // حالة التبويبات والفلاتر
    const [activeSubTab, setActiveSubTab] = useState<AuctionStatus>('live'); // التبويب الافتراضي: مزاد مباشر
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [screenWidth, setScreenWidth] = useState<number>(0);
    const [isAutoGrid, setIsAutoGrid] = useState(false);
    const [showMobileFilters, setShowMobileFilters] = useState(false);

    // حالة القائمة المنسدلة للتبويبات
    const [showTabsDropdown, setShowTabsDropdown] = useState(false);
    const [isMobileTabsView, setIsMobileTabsView] = useState(false);

    const notifications = useQuickNotifications();

    // استخدام hook المفضلة الجديد
    const { isFavorite, toggleFavorite } = useFavorites();

    // حالة التذكيرات
    const [reminders, setReminders] = useState<number[]>([]);

    // مراقبة حجم الشاشة للتحويل التلقائي إلى وضع الشبكة والتبويبات
    useEffect(() => {
      const handleResize = () => {
        const width = window.innerWidth;
        setScreenWidth(width);

        // تحويل التبويبات إلى قائمة منسدلة عند أقل من أو يساوي 900px
        // ولكن عند عرض 800px أو أقل، نعرض الأزرار في سطر واحد مع نصوص مختصرة
        if (width <= 800) {
          setIsMobileTabsView(false); // عرض الأزرار في سطر واحد
        } else if (width <= 900) {
          setIsMobileTabsView(true); // عرض القائمة المنسدلة
        } else {
          setIsMobileTabsView(false); // عرض التبويبات العادية
        }

        // تحويل تلقائي إلى وضع الشبكة عند أقل من 920px
        if (width < 920) {
          if (viewMode === 'list') {
            setViewMode('grid');
            setIsAutoGrid(true);
          }
        } else {
          // العودة إلى الوضع المحفوظ عند الشاشات الأكبر
          if (isAutoGrid) {
            const savedViewMode = UnifiedLocalStorage.getItem('auctions-view-mode', 'list');
            setViewMode(savedViewMode);
            setIsAutoGrid(false);
          }
        }
      };

      // تعيين الحجم الأولي
      handleResize();

      // إضافة مستمع للتغيير
      window.addEventListener('resize', handleResize);

      // تنظيف المستمع
      return () => window.removeEventListener('resize', handleResize);
    }, [viewMode, isAutoGrid]);

    // تحميل وضع العرض المحفوظ
    useEffect(() => {
      const savedViewMode = UnifiedLocalStorage.getItem('auctions-view-mode', 'list');
      setViewMode(savedViewMode);
    }, []);

    // حفظ وضع العرض عند التغيير
    const handleViewModeChange = (mode: 'grid' | 'list') => {
      setViewMode(mode);
      setIsAutoGrid(false); // إلغاء الوضع التلقائي عند التغيير اليدوي
      UnifiedLocalStorage.setItem('auctions-view-mode', mode);
    };

    // إغلاق القائمة المنسدلة عند النقر خارجها
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.tabs-dropdown-container')) {
          setShowTabsDropdown(false);
        }
      };

      if (showTabsDropdown) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [showTabsDropdown]);

    // تحميل التذكيرات من localStorage عند تحميل الصفحة
    useEffect(() => {
      const savedReminders = localStorage.getItem('reminders');
      if (savedReminders) {
        try {
          setReminders(JSON.parse(savedReminders));
        } catch (error) {
          console.error('خطأ في تحميل التذكيرات:', error);
        }
      }
    }, []);

    // حفظ التذكيرات في localStorage عند تغييرها
    useEffect(() => {
      localStorage.setItem('reminders', JSON.stringify(reminders));
    }, [reminders]);

    // دالة التحديث المحسنة مع معالجة أفضل للأخطاء
    const refreshAuctions = useCallback(
      async (force = false) => {
        // منع التحديث المتزامن المتعدد
        if (isRefreshing && !force) {
          return;
        }

        setIsRefreshing(true);
        try {
          log.debug('بدء تحديث المزادات');

          // تحديث حالة المزادات في الخادم أولاً (اختياري - لا يؤثر على النتيجة)
          try {
            await fetch('/api/auctions/force-update', { method: 'POST' }).catch(() => {
              // تجاهل الخطأ - force-update اختياري
            });
          } catch (updateError) {
            // تجاهل الخطأ - force-update اختياري
          }

          const timestamp = Date.now();
          log.debug('إرسال طلب API', { timestamp });

          const response = await fetch(
            `/api/auctions?page=${pagination.currentPage}&limit=${pagination.itemsPerPage}&sortBy=createdAt&sortOrder=desc&_t=${timestamp}`,
            {
              cache: 'no-cache',
              headers: {
                'Cache-Control': 'no-cache',
                Pragma: 'no-cache',
              },
            },
          );

          log.debug('استجابة API', {
            status: response.status,
            statusText: response.statusText,
          });

          if (response.ok) {
            const result = await response.json();
            // في حال نجاح الاستجابة لكن بدون بيانات، استخدم fallback بسيط لعرض منشورات
            if (!result.success || !result.data || !result.data.auctions) {
              // إبقاء البيانات الحالية لتجنب اختفاء البطاقات عند حدوث مشكلة مؤقتة
              log.warn('استجابة غير صالحة أو بدون حقل auctions - الاحتفاظ بالبيانات الحالية');
              return;
            }

            // إذا كانت المصفوفة موجودة ولكنها فارغة، لا نقوم بمسح النتائج الحالية لتجنب الاختفاء المؤقت للبطاقات
            if (Array.isArray(result.data.auctions) && result.data.auctions.length === 0) {
              log.warn('API أعاد 0 مزادات - الحفاظ على البيانات الحالية مؤقتاً');
              // يمكن تحديث معلومات الترقيم فقط إذا لزم الأمر دون مسح القائمة
              if (result.data.pagination && typeof result.data.pagination.total === 'number') {
                setTotalAuctions(result.data.pagination.total);
                pagination.setTotalItems(result.data.pagination.total);
              }
              return;
            }

            log.debug('بيانات API', {
              success: result.success,
              hasData: !!result.data,
              auctionsCount: result.data.auctions?.length || 0,
            });

            if (result.success && result.data) {
              const newAuctions = result.data.auctions || [];
              setAuctions(newAuctions);

              // تحديث معلومات الترقيم
              if (result.data.pagination) {
                setTotalAuctions(result.data.pagination.total);
                pagination.setTotalItems(result.data.pagination.total);
              }

              log.info(`تم تحديث المزادات: ${newAuctions.length} مزاد`);

              // تم تحديث المزادات بنجاح
            } else {
              log.warn('لا توجد بيانات مزادات في الاستجابة');
              setAuctions([]);
            }
          } else {
            const errorText = await response.text();
            log.error('فشل في جلب المزادات', {
              status: response.status,
              statusText: response.statusText,
              error: errorText,
            });
            // لا نقوم بمسح القائمة عند الفشل لتجنب اختفاء البطاقات
          }
        } catch (error) {
          log.error(
            'خطأ في تحديث المزادات:',
            error instanceof Error ? error.message : String(error),
          );
          console.error('تفاصيل الخطأ الكامل:', error);
          // لا نقوم بمسح القائمة عند الخطأ لتجنب اختفاء البطاقات
        } finally {
          setIsRefreshing(false);
          if (isInitialLoad) {
            setIsInitialLoad(false);
          }
        }
      },
      [pagination, isRefreshing, isInitialLoad],
    );

    // تحميل البيانات عند تحميل الصفحة وتحديثها تلقائياً
    useEffect(() => {
      // إذا لم تكن هناك بيانات أولية، قم بالتحميل من API
      if (initialAuctions.length === 0) {
        refreshAuctions();
      } else {
        setIsInitialLoad(false);
      }

      // تشغيل الإصلاح السريع للصور بعد تحميل البيانات
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).quickImageFix) {
          log.debug('تفعيل إصلاح الصور السريع');
          (window as any).quickImageFix.fixAll();
        }
      }, 2000);

      // تحديث البيانات كل دقيقة فقط (تم زيادة الفترة لتجنب التحديث المفرط)
      const interval = setInterval(() => {
        refreshAuctions();
      }, 60000); // كل دقيقة بدلاً من 30 ثانية
      return () => clearInterval(interval);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // تحديث البيانات عند تغيير الصفحة
    useEffect(() => {
      if (pagination.currentPage > 1) {
        refreshAuctions(true);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pagination.currentPage]);

    // تحديث البيانات عند العودة إلى الصفحة (للتأكد من ظهور المزادات الجديدة)
    useEffect(() => {
      const handleFocus = () => {
        log.debug('العودة للصفحة - تحديث البيانات');
        refreshAuctions();
      };

      // الاستماع لأحداث التحديث المخصصة
      const handleListingsUpdate = (_event: unknown) => {
        log.debug('استلام حدث listingsUpdated');
        refreshAuctions();
      };

      const handleNewAuctionAdded = (_event: unknown) => {
        log.debug('استلام حدث newAuctionAdded');
        refreshAuctions(true);
      };

      const handleForceRefresh = (_event: unknown) => {
        log.debug('استلام حدث forceListingsRefresh');
        refreshAuctions();
      };

      // مستمع إضافي للتحديث الفوري عند تغيير localStorage
      const handleStorageChange = (event: StorageEvent) => {
        if (event.key === 'newListingsData' || event.key === 'newListingsData_backup') {
          log.debug('تغيير localStorage - تحديث البيانات');
          setTimeout(() => refreshAuctions(), 100);
        }
      };

      window.addEventListener('focus', handleFocus);
      window.addEventListener('listingsUpdated', handleListingsUpdate);
      window.addEventListener('newAuctionAdded', handleNewAuctionAdded);
      window.addEventListener('forceListingsRefresh', handleForceRefresh);
      window.addEventListener('storage', handleStorageChange);

      return () => {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('listingsUpdated', handleListingsUpdate);
        window.removeEventListener('newAuctionAdded', handleNewAuctionAdded);
        window.removeEventListener('forceListingsRefresh', handleForceRefresh);
        window.removeEventListener('storage', handleStorageChange);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // التحقق من إضافة مزاد جديد
    useEffect(() => {
      const { new: isNew, id } = router.query as any;
      if (isNew === 'true' && id) {
        notifications.success('تم النشر', `تم نشر مزادك بنجاح! معرف المزاد: ${id}`);

        // تحديث فوري للبيانات لإظهار المزاد الجديد
        console.log('🔄 تحديث البيانات لإظهار المزاد الجديد:', id);
        setTimeout(() => {
          refreshAuctions(true);
        }, 1000);
        refreshAuctions(true);
        router.replace('/auctions', undefined, { shallow: true });
      }
    }, [router.query]);

    // حالة الفلاتر الجديدة للمزادات
    const [filters, setFilters] = useState({
      searchQuery: '',
      location: 'جميع المدن',
      brand: 'الماركات',
      model: 'الموديلات',
      yearFrom: 'جميع السنوات',
      yearTo: 'جميع السنوات',
      priceMin: null as number | null,
      priceMax: null as number | null,
      condition: 'جميع الحالات',
      auctionStatus: 'جميع المزادات',
      timeRemaining: 'جميع الأوقات',
      featuredOnly: false, // فلتر المزادات المميزة فقط
    });

    // دالة التعامل مع تغيير الفلاتر
    const handleFilterChange = (filterType: string, value: any) => {
      setFilters((prev) => ({
        ...prev,
        [filterType]: value,
      }));
    };

    // دالة إعادة تعيين الفلاتر
    const resetFilters = () => {
      setFilters({
        searchQuery: '',
        location: 'جميع المدن',
        brand: 'الماركات',
        model: 'الموديلات',
        yearFrom: 'جميع السنوات',
        yearTo: 'جميع السنوات',
        priceMin: null,
        priceMax: null,
        condition: 'جميع الحالات',
        auctionStatus: 'جميع المزادات',
        timeRemaining: 'جميع الأوقات',
        featuredOnly: false,
      });
      notifications.success('تم بنجاح', 'تم إعادة تعيين جميع الفلاتر');
    };

    // دوال معالجة النقر على الأزرار مع التحقق المحسن من المصادقة

    // دالة التعامل مع النقر على زر الاتصال - يفتح صفحة المزاد مباشرة
    const handleContactClick = (car: any) => {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      // فتح صفحة المزاد مباشرة بدلاً من صفحة contact
      router.push(`/auction/${car.id}`);
    };

    // دالة التعامل مع النقر على زر الدردشة
    const handleChatClick = (car: any) => {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      router.push(`/messages?contact=${car.title}&car=${car.id}`);
    };

    // دالة التعامل مع النقر على زر المزايدة
    const handleBidClick = (car: any) => {
      // التوجيه مباشرة إلى صفحة تفاصيل المزاد
      router.push(`/auction/${car.id}`);
    };

    // دالة التعامل مع النقر على زر المفضلة
    const handleFavoriteClick = async (auctionId: string | number) => {
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      // إصلاح: استخدام auctionId بدلاً من carId للمزادات
      // تحويل إلى string بشكل آمن
      const auctionIdStr = String(auctionId);

      // تحقق من صحة المعرف
      if (!auctionIdStr || auctionIdStr === 'undefined' || auctionIdStr === 'null') {
        console.error('[المفضلة] معرف المزاد غير صالح:', auctionId);
        notifications.error('خطأ', 'معرف المزاد غير صالح');
        return;
      }

      await toggleFavorite(undefined, auctionIdStr);
    };

    // دالة التعامل مع النقر على زر التذكير
    const handleReminderClick = (carId: string | number) => {
      const carIdNumber = typeof carId === 'number' ? carId : parseInt(String(carId), 10);
      if (!isAuthenticated) {
        setShowAuthModal(true);
        return;
      }

      const hasReminder = reminders.includes(carIdNumber);
      const car = auctions.find((auction) => String(auction.id) === String(carIdNumber));
      const carTitle = car?.title || 'السيارة';

      if (hasReminder) {
        // إزالة التذكير
        setReminders((prev) => prev.filter((id) => id !== carIdNumber));
        notifications.success('تم بنجاح', `تم إلغاء التذكير لـ ${carTitle}`);
      } else {
        // إضافة التذكير
        setReminders((prev) => [...prev, carIdNumber]);
        notifications.success('تم بنجاح', `تم إضافة تذكير لـ ${carTitle}`);
      }

      // حفظ في localStorage
      const updatedReminders = hasReminder
        ? reminders.filter((id) => id !== carIdNumber)
        : [...reminders, carIdNumber];
      UnifiedLocalStorage.setItem('reminders', updatedReminders);
    };

    // دالة لتحويل بيانات السيارة للمكونات مع دمج البيانات المباشرة
    const transformCarData = React.useCallback(
      (car: any) => {
        // جلب البيانات المباشرة إذا كانت متوفرة
        const liveAuctionData = getAuctionData(car.id);

        // ✅ تحديد حالة المزاد باستخدام الدالة الموحدة
        // تفحص SOLD أولاً، ثم تحسب من التواريخ
        const auctionStatus = getAuctionStatus(car);

        // إنشاء عنوان شامل للمزاد - تحسين منطق العنوان
        let carTitle = '';

        // أولاً: محاولة استخدام عنوان المزاد نفسه
        if (car.title && car.title.trim()) {
          carTitle = car.title.trim();
        }
        // ثانياً: محاولة استخدام عنوان السيارة المرتبطة
        else if (car.car?.title && car.car.title.trim()) {
          carTitle = car.car.title.trim();
        }
        // ثالثاً: إنشاء عنوان من بيانات السيارة
        else {
          const brand = car.car?.brand || car.brand || '';
          const model = car.car?.model || car.model || '';
          const year = car.car?.year || car.year || '';
          carTitle = `${brand} ${model} ${year}`.trim();

          // إذا كان العنوان فارغاً، استخدم عنوان افتراضي
          if (!carTitle) {
            carTitle = 'سيارة للبيع';
          }
        }

        log.debug('معالجة بيانات المزاد transformCarData', {
          id: car.id,
          finalTitle: carTitle,
          auctionStatus: auctionStatus,
        });

        return {
          id: car.id,
          title: carTitle,
          price:
            car.currentBid ||
            car.currentPrice ||
            car.finalBid ||
            car.startingPrice ||
            car.startingBid ||
            car.price ||
            '0',
          // استخدام البيانات المباشرة إذا كانت متوفرة
          currentBid:
            liveAuctionData?.currentBid ??
            car.currentBid ??
            car.currentPrice ??
            (car.bids && car.bids[0] ? car.bids[0].amount : undefined) ??
            car.startingPrice ??
            car.startingBid ??
            '0',
          startingBid: car.startingBid ?? car.startingPrice ?? '0',
          finalBid: car.finalBid || null,
          bidCount:
            liveAuctionData?.bidCount ?? car.bidCount ?? car.totalBids ?? car.bids?.length ?? 0,
          location: car.location || car.car?.location || 'طرابلس',
          area: (() => {
            // محاولة الحصول على المنطقة من المصادر المختلفة بترتيب الأولوية
            let resolvedArea = '';

            // أولاً: من car.area المباشر
            if (
              car.area &&
              typeof car.area === 'string' &&
              car.area.trim() &&
              car.area !== 'غير محدد'
            ) {
              resolvedArea = car.area.trim();
            }
            // ثانياً: من car.car.area
            else if (
              car.car?.area &&
              typeof car.car.area === 'string' &&
              car.car.area.trim() &&
              car.car.area !== 'غير محدد'
            ) {
              resolvedArea = car.car.area.trim();
            }
            // ثالثاً: من car.location إذا كان object
            else if (car.location && typeof car.location === 'object') {
              const locationObj = car.location as any;
              if (
                locationObj?.area &&
                typeof locationObj.area === 'string' &&
                locationObj.area.trim() &&
                locationObj.area !== 'غير محدد'
              ) {
                resolvedArea = locationObj.area.trim();
              }
            }
            // رابعاً: من car.car.location إذا كان object
            else if (car.car?.location && typeof car.car.location === 'object') {
              const carLocationObj = car.car.location as any;
              if (
                carLocationObj?.area &&
                typeof carLocationObj.area === 'string' &&
                carLocationObj.area.trim() &&
                carLocationObj.area !== 'غير محدد'
              ) {
                resolvedArea = carLocationObj.area.trim();
              }
            }

            return resolvedArea;
          })(),
          time: car.endTime || car.createdAt || new Date().toISOString(),
          images: (() => {
            // أولوية لاستخدام imageList إن توفرت، ثم images كمصفوفة
            if (Array.isArray(car.imageList) && car.imageList.length > 0) return car.imageList;
            if (Array.isArray(car.images) && car.images.length > 0) return car.images;
            if (Array.isArray(car.car?.images) && car.car.images.length > 0) return car.car.images;
            return [];
          })(),
          condition: translateToArabic(car.condition || car.car?.condition || 'مستعمل'),
          brand: car.brand || car.car?.brand || '',
          model: car.model || car.car?.model || '',
          year: car.year || car.car?.year || new Date().getFullYear().toString(),
          mileage: formatMileage(car.mileage || car.car?.mileage) || 'غير محدد',
          fuelType: translateToArabic(car.fuelType || car.car?.fuelType || 'بنزين'),
          transmission: translateToArabic(car.transmission || car.car?.transmission || 'أوتوماتيك'),
          bodyType: translateToArabic(car.bodyType || car.car?.bodyType || 'سيدان'),
          color: translateToArabic(car.color || car.car?.color || 'أبيض'),
          doors: car.doors || car.car?.doors || 4,
          type: 'auction',
          phone: car.phone || car.seller?.phone || car.user?.phone || '0912345678',
          isAuction: true,
          auctionType: auctionStatus, // استخدام الحالة المحسوبة
          // معالجة التواريخ مع تنظيف empty objects
          auctionStartTime: (() => {
            const startTime = car.auctionStartTime || car.startTime;
            if (startTime && typeof startTime === 'object' && Object.keys(startTime).length === 0) {
              return null; // تحويل empty object إلى null
            }
            return startTime;
          })(),
          auctionEndTime: (() => {
            const endTime = car.auctionEndTime || car.endTime;
            if (endTime && typeof endTime === 'object' && Object.keys(endTime).length === 0) {
              return null; // تحويل empty object إلى null
            }
            return endTime;
          })(),
          // السعر المطلوب يجب أن يكون من قاعدة البيانات فقط دون fallback للسعر الابتدائي
          reservePrice:
            typeof (car as any).reservePrice === 'number' ? (car as any).reservePrice : undefined,
          buyerName: car.buyerName || null,
          // حالة البيع النهائية لتمييز البطاقات بصرياً وتمريرها للعداد
          isSold: (() => {
            try {
              // ✅ CRITICAL: فحص حالة المزاد أولاً (أولوية قصوى)
              const auctionSold = String(car.status || '').toUpperCase() === 'SOLD';
              // ثم فحص حالة السيارة (احتياطي)
              const carSold = String(car.car?.status || '').toUpperCase() === 'SOLD';
              const buyerFlag = !!car.buyerName;
              const realStatus = auctionStatus; // 'upcoming' | 'live' | 'ended'
              const currentNumeric = (() => {
                const raw = (
                  (liveAuctionData?.currentBid ?? car.currentBid ?? car.currentPrice ?? 0) as any
                ).toString();
                const cleaned = raw.replace(/[,\s]/g, '');
                const n = parseInt(cleaned, 10);
                return Number.isFinite(n) ? n : 0;
              })();
              const reserve =
                typeof (car as any).reservePrice === 'number' ? (car as any).reservePrice : 0;
              const reserveReached = reserve > 0 && currentNumeric >= reserve;
              return (
                auctionSold || carSold || buyerFlag || (realStatus === 'ended' && reserveReached)
              );
            } catch {
              return false;
            }
          })(),
          image: (() => {
            // أولاً: تحقق من imageList إذا كانت موجودة (من التحويل السابق)
            if (car.imageList && Array.isArray(car.imageList) && car.imageList.length > 0) {
              return car.imageList[0];
            }
            // ثانياً: تحقق من image إذا كانت موجودة (من التحويل السابق)
            if (car.image && typeof car.image === 'string' && car.image.trim()) {
              return car.image;
            }
            // ثالثاً: تحقق من carImages من قاعدة البيانات
            if (
              car.car?.carImages &&
              Array.isArray(car.car.carImages) &&
              car.car.carImages.length > 0
            ) {
              const primaryImage = car.car.carImages.find((img: any) => img && img.isPrimary);
              if (primaryImage && primaryImage.fileUrl) {
                return primaryImage.fileUrl;
              }
              if (car.car.carImages[0] && (car.car.carImages[0] as any).fileUrl) {
                return (car.car.carImages[0] as any).fileUrl;
              }
            }
            // رابعاً: تحقق من images المباشرة
            if (Array.isArray(car.images) && car.images.length > 0) {
              return car.images[0];
            }
            // خامساً: تحقق من car.car.images التقليدية
            if (Array.isArray(car.car?.images) && car.car.images.length > 0) {
              return car.car.images[0];
            }
            // أخيراً: صورة افتراضية محلية
            return '/images/cars/default-car.svg';
          })(),
          imageList: (() => {
            // أولاً: تحقق من imageList إذا كانت موجودة (من التحويل السابق)
            if (car.imageList && Array.isArray(car.imageList) && car.imageList.length > 0) {
              return car.imageList;
            }
            // ثانياً: تحقق من carImages من قاعدة البيانات
            if (
              car.car?.carImages &&
              Array.isArray(car.car.carImages) &&
              car.car.carImages.length > 0
            ) {
              const imageUrls = car.car.carImages
                .filter(
                  (img: any) =>
                    img && img.fileUrl && typeof img.fileUrl === 'string' && img.fileUrl.trim(),
                )
                .map((img: any) => img.fileUrl as string);
              if (imageUrls.length > 0) {
                return imageUrls;
              }
            }
            // ثالثاً: تحقق من images المباشرة
            if (Array.isArray(car.images) && car.images.length > 0) {
              return car.images;
            }
            // رابعاً: تحقق من car.car.images التقليدية
            if (Array.isArray(car.car?.images) && car.car.images.length > 0) {
              return car.car.images;
            }
            // أخيراً: قائمة افتراضية محلية
            return ['/images/cars/default-car.svg'];
          })(),
          description: car.description || car.car?.description || 'وصف السيارة',
          // بيانات الترويج - مهمة للشارات
          featured: car.featured || false,
          promotionPackage: car.promotionPackage || 'free',
          // تمرير carImages الحقيقة للمكون حتى يتم عرض الصور
          car: {
            carImages: Array.isArray(car.car?.carImages)
              ? car.car.carImages
                  .filter((img: any) => img && img.fileUrl && typeof img.fileUrl === 'string')
                  .map((img: any) => {
                    const url = img.fileUrl.trim();
                    const normalized =
                      url.startsWith('http') || url.startsWith('/')
                        ? url
                        : `/images/cars/listings/${url}`;
                    return { ...img, fileUrl: normalized };
                  })
              : [],
          },
        };
      },
      [getAuctionData],
    );

    // دالة التعامل مع النقر على زر النتائج للمزادات المنتهية
    const handleViewResultsClick = React.useCallback(
      (car: any) => {
        log.debug('عرض نتائج المزاد', { carId: car.id });
        if (car.auctionType === 'ended') {
          router.push(`/auction/${car.id}/results`);
        } else {
          notifications.warning('تنبيه', 'هذا المزاد لم ينته بعد');
        }
      },
      [router, notifications],
    );

    // ✨ Cache لتحسين الأداء - تجنب إعادة حساب الحالة لنفس المزاد
    const statusCache = React.useRef<Map<string, AuctionStatus>>(new Map());

    // 🔄 مسح الـ cache كل ثانية لإعادة حساب حالات المزادات تلقائياً
    // هذا يضمن أن المزادات تنتقل من "قادم" إلى "مباشر" تلقائياً بدون تحديث الصفحة
    React.useEffect(() => {
      statusCache.current.clear();
    }, [globalTick]);

    // دالة موحدة لتحديد نوع المزاد بالاعتماد على الأداة المركزية + Caching
    const getAuctionStatus = (auction: any) => {
      if (!auction?.id) return 'live';

      // فحص Cache أولاً
      const cached = statusCache.current.get(auction.id);
      if (cached) return cached;

      // حساب الحالة
      try {
        const status = resolveAuctionStatus(auction);
        statusCache.current.set(auction.id, status);
        return status;
      } catch {
        return 'live';
      }
    };

    // دالة للتوافق مع الكود القديم
    const getAuctionType = (auction: AuctionWithDetails) => {
      return getAuctionStatus(auction);
    };

    // دالة للتوافق مع الكود القديم
    const getAuctionTypeForCar = (car: any) => {
      return getAuctionStatus(car);
    };

    // دالة لتحويل بيانات المزاد إلى تنسيق متوافق مع الكود الحالي
    const formatAuctionData = React.useCallback((auction: AuctionWithDetails) => {
      log.debug('معالجة مزاد formatAuctionData', {
        id: auction.id,
        hasCarData: !!auction.car,
      });

      // التحقق من وجود بيانات السيارة - إذا لم تكن موجودة، إنشاء كائن سيارة افتراضي
      if (!auction.car) {
        // إنشاء كائن سيارة افتراضي من بيانات المزاد إذا وجدت
        const defaultCar = {
          id: (auction as any).carId || auction.car.id || `car-${auction.id}`,
          brand: (auction as any).brand || 'غير محدد',
          model: (auction as any).model || 'غير محدد',
          year: (auction as any).year || new Date().getFullYear(),
          mileage: (auction as any).mileage || 0,
          location: (auction as any).city || (auction as any).location || 'طرابلس',
          carImages:
            (auction as any).images?.map((img: string) => ({ imageUrl: img, fileUrl: img })) || [],
        };
        // تعيين السيارة الافتراضية
        (auction as any).car = defaultCar;
      }

      // إذا كان المزاد يحتوي على البيانات المطلوبة مسبقاً (من API) مع جميع الحقول المطلوبة
      // لكن نحتاج دائماً لتحويل الصور لضمان وجود imageList
      if (
        (auction as any).isAuction &&
        (auction as any).car &&
        (auction as any).auctionType &&
        ((auction as any).startingBid || auction.startingPrice) &&
        ((auction as any).auctionEndTime || auction.endTime) &&
        ((auction as any).imageList || (auction as any).car?.carImages)
      ) {
        // البيانات جاهزة مع الصور، لا حاجة لتحويل إضافي
        return { ...auction, isAuction: true } as any;
      }

      // تحويل البيانات القادمة من API إلى التنسيق المطلوب
      // ⚠️ إعادة حساب الحالة دائماً من التواريخ الفعلية بدلاً من الاعتماد على البيانات المحفوظة
      const auctionType = getAuctionType(auction);
      const currentBid =
        (auction as any).currentBid ||
        auction.currentPrice ||
        auction.bids?.[0]?.amount ||
        auction.startingPrice ||
        0;

      // التحقق من وجود البيانات الأساسية للسيارة
      const carBrand = auction.car.brand || '';
      const carModel = auction.car.model || '';
      const carYear = auction.car.year || new Date().getFullYear();

      // استخراج معلومات الموقع والمنطقة بشكل منفصل ومستقر
      let location = 'طرابلس';
      let area = '';

      if (typeof auction.car.location === 'string') {
        location = auction.car.location;
        // محاولة استخراج المنطقة من النص إذا كان يحتوي على فاصلة
        if (location.includes(',')) {
          const parts = location.split(',');
          location = parts[0]?.trim() || 'طرابلس';
          area = parts[1]?.trim() || '';
        }
      } else if (auction.car.location && typeof auction.car.location === 'object') {
        const locationObj = auction.car.location as any;
        location = locationObj?.city || 'طرابلس';
        // معالجة آمنة ومستقرة للمنطقة
        if (
          locationObj?.area &&
          typeof locationObj.area === 'string' &&
          locationObj.area.trim() &&
          locationObj.area !== 'غير محدد'
        ) {
          area = locationObj.area.trim();
        }
      }

      // إضافة fallback للمنطقة من auction.car.area مباشرة إذا لم نجدها
      if (
        !area &&
        auction.car.area &&
        typeof auction.car.area === 'string' &&
        auction.car.area.trim() &&
        auction.car.area !== 'غير محدد'
      ) {
        area = auction.car.area.trim();
      }

      // إنشاء عنوان محسن للمزاد
      let auctionTitle = '';
      if (auction.title && auction.title.trim()) {
        auctionTitle = auction.title.trim();
      } else if (auction.car?.title && auction.car.title.trim()) {
        auctionTitle = auction.car.title.trim();
      } else {
        // إنشاء عنوان طبيعي بدون كلمة "مزاد"
        if (carBrand && carModel) {
          auctionTitle = `${carBrand} ${carModel} ${carYear}`.trim();
        } else if (carBrand) {
          auctionTitle = `${carBrand} ${carYear}`.trim();
        } else {
          auctionTitle = 'سيارة للبيع';
        }
      }

      // حساب حالة البيع النهائية بشكل آمن
      const isSoldComputed = (() => {
        try {
          // ✅ CRITICAL: فحص حالة المزاد أولاً (أولوية قصوى)
          const auctionSold = String(auction.status || '').toUpperCase() === 'SOLD';
          // ثم فحص حالة السيارة (احتياطي)
          const carSold = String(auction.car?.status || '').toUpperCase() === 'SOLD';
          const buyerFlag = !!auction.winner?.name;
          const currentNumeric = (() => {
            const raw = (currentBid ?? 0).toString();
            const cleaned = raw.replace(/[,\s]/g, '');
            const n = parseInt(cleaned, 10);
            return Number.isFinite(n) ? n : 0;
          })();
          const reserve =
            typeof (auction as any).reservePrice === 'number' ? (auction as any).reservePrice : 0;
          const reserveReached = reserve > 0 && currentNumeric >= reserve;
          return auctionSold || carSold || buyerFlag || (auctionType === 'ended' && reserveReached);
        } catch {
          return false;
        }
      })();

      const result = {
        id: auction.id,
        title: auctionTitle,
        price: (auction.startingPrice ?? 0).toString(),
        location: location,
        area: area,
        coordinates:
          auction.car.location && typeof auction.car.location === 'object'
            ? {
                lat: (auction.car.location as any)?.lat || 32.8872,
                lng: (auction.car.location as any)?.lng || 13.1913,
              }
            : { lat: 32.8872, lng: 13.1913 },
        time: formatAuctionDate(
          auctionType,
          typeof auction.startTime === 'string'
            ? auction.startTime
            : auction.startTime
              ? auction.startTime.toISOString()
              : undefined,
          typeof auction.endTime === 'string'
            ? auction.endTime
            : auction.endTime
              ? auction.endTime.toISOString()
              : undefined,
        ),
        images: (() => {
          // إرجاع روابط الصور الفعلية للأولوية الصحيحة
          // 1) carImages من قاعدة البيانات (الأولوية العليا)
          if (
            auction.car?.carImages &&
            Array.isArray(auction.car.carImages) &&
            auction.car.carImages.length > 0
          ) {
            const imageUrls = auction.car.carImages
              .filter(
                (
                  img: any,
                ): img is {
                  fileUrl?: string;
                  imageUrl?: string;
                  url?: string;
                  isPrimary?: boolean;
                } => {
                  const raw = img?.fileUrl || img?.imageUrl || img?.url;
                  return typeof raw === 'string' && !!raw.trim();
                },
              )
              .sort((a: any, b: any) => {
                if (a.isPrimary && !b.isPrimary) return -1;
                if (!a.isPrimary && b.isPrimary) return 1;
                return 0;
              })
              .map((img: { fileUrl?: string; imageUrl?: string; url?: string }) => {
                const url = (img.fileUrl || img.imageUrl || img.url || '').trim();
                if (url.startsWith('http') || url.startsWith('/')) return url;
                return `/images/cars/listings/${url}`;
              });
            if (imageUrls.length > 0) {
              return imageUrls;
            }
          }
          // 2) الصور القديمة legacy من الحقل images
          if (Array.isArray(auction.car?.images) && auction.car.images.length > 0) {
            return auction.car.images.filter((img) => img && typeof img === 'string' && img.trim());
          }
          if (
            typeof (auction.car as any)?.images === 'string' &&
            (auction.car as any).images.trim()
          ) {
            const imageArray = (auction.car as any).images
              .split(',')
              .map((img: string) => img.trim())
              .filter((img: string) => img);
            if (imageArray.length > 0) {
              return imageArray;
            }
          }
          // 3) fallback محلي
          return ['/images/cars/default-car.svg'];
        })(),
        condition: auction.car.condition || 'مستعمل',
        brand: carBrand,
        model: carModel,
        year: carYear.toString(),
        mileage: formatMileage(auction.car.mileage) || 'غير محدد',
        fuelType: (auction.car as any).fuelType || 'بنزين',
        transmission: (auction.car as any).transmission || 'أوتوماتيك',
        bodyType: (auction.car as any).bodyType || 'سيدان',
        color: (auction.car as any).color || 'أبيض',
        type: 'سيارة',
        phone: auction.car.user?.phone || '',
        isAuction: true,
        isSold: isSoldComputed,
        auctionType,
        auctionEndTime: auction.endTime,
        auctionStartTime: auction.startTime, // إصلاح حرج: لا تستخدم endTime كـ fallback
        currentBid: currentBid.toString(),
        startingBid: (auction.startingPrice || 0).toString(), // إصلاح: startingBid غير موجود في النوع
        finalBid: auctionType === 'ended' ? currentBid.toString() : undefined,
        reservePrice: (auction as any).reservePrice ?? undefined,
        bidCount: auction.bids?.length || 0,
        buyerName: auction.winner?.name,
        image: (() => {
          // 1) carImages (أولوية)
          const imgs = auction.car?.carImages || [];
          if (Array.isArray(imgs) && imgs.length > 0) {
            const getUrl = (i: any) => (i?.fileUrl || i?.imageUrl || i?.url || '') as string;
            const primary = imgs.find((i) => i?.isPrimary && getUrl(i).trim());
            const primaryUrl = primary ? getUrl(primary).trim() : '';
            if (primaryUrl) return primaryUrl;
            const firstUrl = getUrl(imgs[0]).trim();
            if (firstUrl) return firstUrl;
          }
          // 2) images legacy
          const legacy = auction.car?.images as string[] | undefined;
          if (Array.isArray(legacy) && legacy.length > 0) {
            const first = legacy.find((u) => typeof u === 'string' && u.trim());
            if (first) return first;
          }
          // 3) fallback محلي
          return '/images/cars/default-car.svg';
        })(),
        imageList: (() => {
          // معالجة قائمة صور المزاد - إعطاء أولوية لـ carImages من قاعدة البيانات

          // أولاً: فحص carImages من قاعدة البيانات
          if (
            auction.car.carImages &&
            Array.isArray(auction.car.carImages) &&
            auction.car.carImages.length > 0
          ) {
            const imageUrls = auction.car.carImages
              .filter(
                (
                  img,
                ): img is {
                  fileUrl?: string;
                  imageUrl?: string;
                  url?: string;
                  isPrimary?: boolean;
                } => {
                  const raw = (img as any)?.fileUrl || (img as any)?.imageUrl || (img as any)?.url;
                  return typeof raw === 'string' && raw.trim().length > 0;
                },
              )
              .map((img) => {
                const url = (
                  (img as any).fileUrl ||
                  (img as any).imageUrl ||
                  (img as any).url ||
                  ''
                ).trim();
                if (url.startsWith('http') || url.startsWith('/')) return url;
                return `/images/cars/listings/${url}`;
              });
            if (imageUrls.length > 0) {
              return imageUrls;
            }
          }

          // ثانياً: فحص images التقليدية للتوافق مع البيانات القديمة
          if (auction.car.images) {
            // إذا كانت الصور عبارة عن array
            if (Array.isArray(auction.car.images) && auction.car.images.length > 0) {
              const cleanImages = auction.car.images.filter(
                (img: any) => img && typeof img === 'string' && img.trim(),
              );
              if (cleanImages.length > 0) {
                return cleanImages;
              }
            }
            // إذا كانت الصور عبارة عن string مفصولة بفواصل
            if (
              typeof (auction.car as any).images === 'string' &&
              (auction.car as any).images.trim()
            ) {
              const imageArray = (auction.car as any).images
                .split(',')
                .map((img: string) => img.trim())
                .filter((img: string) => img);
              if (imageArray.length > 0) {
                return imageArray;
              }
            }
          }
          // صورة افتراضية محلية فقط (منع صور Unsplash نهائياً)
          return ['/images/cars/default-car.svg'];
        })(),
        description:
          auction.description || auction.car.description || `${carBrand} ${carModel} ${carYear}`,
        // ✅ بيانات الترويج والتمييز - مهمة للشارات الذهبية
        featured: auction.featured || false,
        promotionPackage: auction.promotionPackage || 'free',
        promotionDays: auction.promotionDays || 0,
        promotionPriority: auction.promotionPriority || 0,
        promotionEndDate: auction.promotionEndDate || null,
      };

      return result;
    }, []);

    // تم إزالة البيانات الوهمية نهائياً لتحسين الأداء - استخدام البيانات الحقيقية فقط

    // استخدام البيانات الحقيقية فقط لتحسين الأداء
    const realData = auctions.length > 0 ? auctions.map(formatAuctionData) : [];
    const formattedNewAuctions = realData.filter(Boolean);

    // 🔄 تنظيف Cache عند تغيير البيانات
    React.useEffect(() => {
      statusCache.current.clear();
    }, [auctions]);

    // تشخيص مشكلة عدم ظهور البطاقات
    // تم تقليل التشخيص للأداء

    // ✅ إزالة التكرار: استخدام Set للتأكد من عدم وجود IDs مكررة
    const uniqueAuctions = React.useMemo(() => {
      const seen = new Set<string>();
      return formattedNewAuctions.filter((auction) => {
        if (!auction || !auction.id) return false;
        const id = String(auction.id);
        if (seen.has(id)) {
          console.warn(`[⚠️ Duplicate] مزاد مكرر تم تجاهله: ${id}`);
          return false;
        }
        seen.add(id);
        return true;
      });
    }, [formattedNewAuctions]);

    // تحويل بيانات المزادات - استخدام البيانات الفريدة فقط
    const cars = uniqueAuctions;

    // تحسين الفلترة باستخدام useMemo لتجنب إعادة الحساب في كل render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const getFilteredCars = useMemo(() => {
      // فلترة محسنة للأداء

      // تنظيف الإدخالات الفارغة وضبط النوع إلى any لتجنب أخطاء null أثناء الفلاتر اللاحقة
      const baseCars = (cars || []).filter(Boolean) as any[];

      // فلتر أمان: التأكد من أن العنصر مزاد فقط وليس سيارة عادية
      let filtered = baseCars.filter((car: any) => {
        if (!car) return false;

        // إعادة حساب الحالة الفعلية زمنياً بدلاً من الاعتماد على قيمة ثابتة
        const realStatus = getAuctionStatus(car);

        // ✅ الإصلاح الجذري: لا نتطلب endTime لجميع المزادات
        // بعض المزادات قد تكون قادمة أو مباشرة بدون endTime واضح
        const hasRequiredFields =
          (car as any).isAuction &&
          (realStatus === 'live' ||
            realStatus === 'upcoming' ||
            realStatus === 'ended' ||
            realStatus === 'sold') &&
          ((car as any).startingBid || (car as any).startingPrice);
        // ✅ تم إزالة متطلب endTime الصارم

        // فلتر البيانات المطلوبة

        return hasRequiredFields;
      });

      // الفلترة مكتملة

      // فلترة حسب التبويب النشط باستخدام النظام الموحد (4 حالات فقط)
      // ✨ مهم: استخدام getAuctionStatus() فقط - لا حاجة لفحص isSold منفصل
      filtered = filtered.filter((car: any) => {
        const realStatus = getAuctionStatus(car);

        switch (activeSubTab) {
          case 'live':
            return realStatus === 'live';

          case 'upcoming':
            return realStatus === 'upcoming';

          case 'sold':
            // ✅ getAuctionStatus() تُرجع 'sold' إذا كان status === 'SOLD'
            return realStatus === 'sold';

          case 'ended':
            // ✅ فقط المنتهي بدون بيع
            return realStatus === 'ended';

          default:
            return true;
        }
      });

      // تطبيق البحث النصي
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        filtered = filtered.filter((car: any) => {
          const title = (car as any).title || '';
          const brand = (car as any).brand || (car as any).car?.brand || '';
          const description = (car as any).description || (car as any).car?.description || '';
          return (
            title.toLowerCase().includes(query) ||
            brand.toLowerCase().includes(query) ||
            description.toLowerCase().includes(query)
          );
        });
      }

      // تطبيق فلتر الموقع
      if (filters.location !== 'جميع المدن') {
        filtered = filtered.filter((car: any) => {
          const location = (car as any).location || (car as any).car?.location || '';
          return location.includes(filters.location);
        });
      }

      // تطبيق فلتر الماركة
      if (filters.brand !== 'الماركات') {
        filtered = filtered.filter((car: any) => {
          const brand = (car as any).brand || (car as any).car?.brand || '';
          return brand === filters.brand;
        });
      }

      // تطبيق فلتر الموديل
      if (filters.model !== 'الموديلات') {
        filtered = filtered.filter((car: any) => {
          const model = (car as any).model || (car as any).car?.model || '';
          return model === filters.model;
        });
      }

      // تطبيق فلتر السنة
      if (filters.yearFrom !== 'جميع السنوات') {
        filtered = filtered.filter((car: any) => {
          const year = (car as any).year || (car as any).car?.year || '2020';
          return parseInt(String(year)) >= parseInt(filters.yearFrom);
        });
      }
      if (filters.yearTo !== 'جميع السنوات') {
        filtered = filtered.filter((car: any) => {
          const year = (car as any).year || (car as any).car?.year || '2020';
          return parseInt(String(year)) <= parseInt(filters.yearTo);
        });
      }

      // تطبيق فلتر نطاق السعر
      if (filters.priceMin !== null || filters.priceMax !== null) {
        filtered = filtered.filter((car: any) => {
          const currentBid = (car as any).currentBid || (car as any).currentPrice || 0;
          const finalBid = (car as any).finalBid || 0;
          const startingBid = (car as any).startingBid || (car as any).startingPrice || 0;
          const carPrice = (car as any).price || 0;
          const priceValue = currentBid || finalBid || startingBid || carPrice;
          const price = parseInt(String(priceValue).replace(/,/g, ''));
          const minCheck = filters.priceMin === null || price >= filters.priceMin;
          const maxCheck = filters.priceMax === null || price <= filters.priceMax;
          return minCheck && maxCheck;
        });
      }

      // تطبيق فلتر الحالة
      if (filters.condition !== 'جميع الحالات') {
        filtered = filtered.filter((car: any) => car.condition === filters.condition);
      }

      // تطبيق فلتر حالة المزاد (بحالة مُعاد حسابها زمنياً)
      if (filters.auctionStatus !== 'جميع المزادات') {
        filtered = filtered.filter((car: any) => {
          const realStatus = getAuctionStatus(car);
          switch (filters.auctionStatus) {
            case 'مباشر':
              return realStatus === 'live';
            case 'ينتهي قريباً':
              if (realStatus !== 'live') return false;
              const endTime = (car as any).auctionEndTime || (car as any).endTime;
              if (!endTime) return false;
              const ms = new Date(endTime).getTime() - Date.now();
              return ms > 0 && ms <= 60 * 60 * 1000; // ≤ 60 دقيقة
            case 'قادم':
              return realStatus === 'upcoming';
            case 'تم البيع':
              // ✅ استخدام getAuctionStatus() بدلاً من isSold
              return realStatus === 'sold';
            case 'منتهي':
              // ✅ استخدام getAuctionStatus() فقط - لا حاجة لفحص isSold
              return realStatus === 'ended';
            default:
              return true;
          }
        });
      }

      // تطبيق فلتر الوقت المتبقي
      if (filters.timeRemaining !== 'جميع الأوقات') {
        filtered = filtered.filter((car) => {
          const realStatus = getAuctionStatus(car);
          if (realStatus !== 'live' || !((car as any).auctionEndTime || (car as any).endTime))
            return false;

          const endTime = (car as any).auctionEndTime || (car as any).endTime;
          const timeLeft = new Date(endTime).getTime() - new Date().getTime();
          const hoursLeft = timeLeft / (1000 * 60 * 60);
          const daysLeft = hoursLeft / 24;

          switch (filters.timeRemaining) {
            case 'أقل من ساعة':
              return hoursLeft < 1;
            case 'أقل من 3 ساعات':
              return hoursLeft < 3;
            case 'أقل من 6 ساعات':
              return hoursLeft < 6;
            case 'أقل من 12 ساعة':
              return hoursLeft < 12;
            case 'أقل من 24 ساعة':
              return hoursLeft < 24;
            case 'أكثر من يوم':
              return daysLeft > 1 && daysLeft <= 7;
            case 'أكثر من أسبوع':
              return daysLeft > 7;
            default:
              return true;
          }
        });
      }

      // فلتر المزادات المميزة فقط
      if (filters.featuredOnly) {
        filtered = filtered.filter((car: any) => car.featured === true);
      }

      // 🎯 نظام الترتيب الذكي - المميزة أولاً ثم الأولوية للأهم
      filtered = filtered.sort((a, b) => {
        // المميزة أولاً
        const aFeatured = (a as any).featured ? 1 : 0;
        const bFeatured = (b as any).featured ? 1 : 0;
        if (aFeatured !== bFeatured) {
          return bFeatured - aFeatured;
        }

        const aType = getAuctionStatus(a);
        const bType = getAuctionStatus(b);

        // الأولوية حسب نوع المزاد (مع إضافة sold)
        const priorityOrder = { live: 4, upcoming: 3, sold: 2, ended: 1 } as const;
        const aPriority = priorityOrder[aType] || 1;
        const bPriority = priorityOrder[bType] || 1;

        if (aPriority !== bPriority) {
          return bPriority - aPriority; // الأولوية العليا أولاً
        }

        // للمزادات من نفس النوع:
        // - المباشر: الأحدث إنشاءً أولاً (createdAt desc)
        // - القادم: الأقرب بدءاً أولاً (startTime asc)
        // - تم البيع: الأحدث بيعاً أولاً (endTime/updatedAt desc) ✨ جديد
        // - المنتهي: الأحدث انتهاءً أولاً (endTime desc)

        if (aType === 'ended') {
          // المنتهي: الأحدث انتهاءً أولاً
          const aEndTime = new Date(
            (a as any).auctionEndTime || (a as any).endTime || (a as any).createdAt || 0,
          ).getTime();
          const bEndTime = new Date(
            (b as any).auctionEndTime || (b as any).endTime || (b as any).createdAt || 0,
          ).getTime();

          // إذا كانت الأوقات متساوية، استخدم ID للترتيب الثانوي
          if (bEndTime === aEndTime) {
            return String(b.id).localeCompare(String(a.id));
          }
          return bEndTime - aEndTime;
        } else if (aType === 'sold') {
          // ✨ تم البيع: الأحدث بيعاً أولاً (updatedAt أو endTime أو createdAt)
          const aSoldTime = new Date(
            (a as any).updatedAt ||
              (a as any).auctionEndTime ||
              (a as any).endTime ||
              (a as any).createdAt ||
              0,
          ).getTime();
          const bSoldTime = new Date(
            (b as any).updatedAt ||
              (b as any).auctionEndTime ||
              (b as any).endTime ||
              (b as any).createdAt ||
              0,
          ).getTime();

          // إذا كانت الأوقات متساوية، استخدم ID للترتيب الثانوي (الأحدث ID أولاً)
          if (bSoldTime === aSoldTime) {
            return String(b.id).localeCompare(String(a.id));
          }
          return bSoldTime - aSoldTime; // الأحدث بيعاً أولاً
        } else if (aType === 'live') {
          // المباشر: الأحدث إنشاءً أولاً
          const aCreated = new Date(
            (a as any).createdAt || (a as any).auctionStartTime || (a as any).startTime || 0,
          ).getTime();
          const bCreated = new Date(
            (b as any).createdAt || (b as any).auctionStartTime || (b as any).startTime || 0,
          ).getTime();

          // إذا كانت الأوقات متساوية، استخدم ID للترتيب الثانوي
          if (bCreated === aCreated) {
            return String(b.id).localeCompare(String(a.id));
          }
          return bCreated - aCreated;
        } else {
          // القادم: الأقرب بدءاً أولاً
          const aStart = new Date(
            (a as any).auctionStartTime || (a as any).startTime || (a as any).createdAt || 0,
          ).getTime();
          const bStart = new Date(
            (b as any).auctionStartTime || (b as any).startTime || (b as any).createdAt || 0,
          ).getTime();

          // إذا كانت الأوقات متساوية، استخدم ID للترتيب الثانوي
          if (aStart === bStart) {
            return String(a.id).localeCompare(String(b.id));
          }
          return aStart - bStart;
        }
      });

      return filtered;
    }, [cars, activeSubTab, filters, globalTick]);

    const filteredCars = getFilteredCars;

    // تم إزالة console.log للتشخيص

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const subTabs = useMemo(() => {
      // استخدام النظام الموحد لحساب عدد المزادات لكل حالة
      // ✨ مهم: استخدام getAuctionStatus() فقط لأنها تفحص SOLD أولاً

      // 🔍 تشخيص شامل - معطل لتقليل console spam (يمكن تفعيله عند الحاجة)
      // console.log('=== 🔍 تشخيص حالات المزادات (إجمالي: ' + cars.length + ') ===');
      // const diagnostics: any = { live: [], upcoming: [], sold: [], ended: [], unknown: [] };
      //
      // cars.forEach((c, idx) => {
      //   if (!c?.isAuction) return;
      //   const status = getAuctionStatus(c);
      //   const startTime = (c as any).auctionStartTime || (c as any).startTime;
      //   const endTime = (c as any).auctionEndTime || (c as any).endTime;
      //   const now = new Date();
      //
      //   const info = {
      //     id: c.id,
      //     title: (c as any).title || 'بدون عنوان',
      //     'auction.status': c.status,
      //     'car.status': (c as any).car?.status,
      //     'calculated status': status,
      //     startTime: startTime ? new Date(startTime).toLocaleString('ar-EG') : 'غير موجود',
      //     endTime: endTime ? new Date(endTime).toLocaleString('ar-EG') : 'غير موجود',
      //     'now': now.toLocaleString('ar-EG'),
      //     'is started': startTime ? now > new Date(startTime) : 'لا يوجد startTime',
      //     'is ended': endTime ? now > new Date(endTime) : 'لا يوجد endTime',
      //     'buyerName': (c as any).buyerName || 'لا يوجد',
      //     'winner': (c as any).winner || 'لا يوجد',
      //   };
      //
      //   if (diagnostics[status]) {
      //     diagnostics[status].push(info);
      //   } else {
      //     diagnostics.unknown.push(info);
      //   }
      // });
      //
      // console.log('📊 توزيع المزادات:', {
      //   'مباشر': diagnostics.live.length,
      //   'قادم': diagnostics.upcoming.length,
      //   'تم البيع': diagnostics.sold.length,
      //   'منتهي': diagnostics.ended.length,
      //   'غير معروف': diagnostics.unknown.length
      // });
      //
      // if (diagnostics.live.length > 0) console.log('🔴 مزادات مباشرة:', diagnostics.live);
      // if (diagnostics.upcoming.length > 0) console.log('🟡 مزادات قادمة:', diagnostics.upcoming);
      // if (diagnostics.sold.length > 0) console.log('🟢 مزادات تم بيعها:', diagnostics.sold);
      // if (diagnostics.ended.length > 0) console.log('⚫ مزادات منتهية:', diagnostics.ended);
      // if (diagnostics.unknown.length > 0) console.log('❓ مزادات غير معروفة:', diagnostics.unknown);

      const liveCount = cars.filter((c) => {
        if (!c?.isAuction) return false;
        const status = getAuctionStatus(c);
        return status === 'live';
      }).length;

      const upcomingCount = cars.filter((c) => {
        if (!c?.isAuction) return false;
        const status = getAuctionStatus(c);
        return status === 'upcoming';
      }).length;

      const soldCount = cars.filter((c) => {
        if (!c?.isAuction) return false;
        const status = getAuctionStatus(c);
        return status === 'sold';
      }).length;

      const endedCount = cars.filter((c) => {
        if (!c?.isAuction) return false;
        const status = getAuctionStatus(c);
        return status === 'ended';
      }).length;

      return [
        {
          key: 'live' as AuctionStatus,
          label: AUCTION_LABELS.live.badge,
          shortLabel: AUCTION_LABELS.live.short,
          count: liveCount,
          color: AUCTION_COLORS.live,
          icon: SignalIcon,
        },
        {
          key: 'upcoming' as AuctionStatus,
          label: AUCTION_LABELS.upcoming.badge,
          shortLabel: AUCTION_LABELS.upcoming.short,
          count: upcomingCount,
          color: AUCTION_COLORS.upcoming,
          icon: ClockIcon,
        },
        {
          key: 'sold' as AuctionStatus,
          label: AUCTION_LABELS.sold.badge,
          shortLabel: AUCTION_LABELS.sold.short,
          count: soldCount,
          color: AUCTION_COLORS.sold,
          icon: TrophyIcon,
        },
        {
          key: 'ended' as AuctionStatus,
          label: AUCTION_LABELS.ended.badge,
          shortLabel: AUCTION_LABELS.ended.short,
          count: endedCount,
          color: AUCTION_COLORS.ended,
          icon: FolderIcon,
        },
      ];
    }, [cars, globalTick]);

    // الحصول على التبويب النشط
    const getActiveTab = () => {
      return subTabs.find((tab) => tab.key === activeSubTab) || subTabs[0];
    };

    // تنبيه غير حاجب إذا وجد خطأ من SSR، مع استمرار الصفحة في العمل وجلب البيانات
    const ssrErrorBanner = ssrError ? (
      <div className="mx-auto my-4 max-w-3xl rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
        <div className="flex items-center justify-between">
          <div className="font-medium">تنبيه: {ssrError}</div>
          <button
            onClick={() => router.reload()}
            className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    ) : null;

    // تم حذف السبينر الداخلي - UnifiedPageTransition يتولى عرض مؤشر التحميل

    return (
      <>
        <Head>
          <title>سوق المزاد | موقع مزاد السيارات</title>
          <meta
            name="description"
            content="اكتشف أفضل السيارات في سوق المزاد مع أسعار تنافسية وجودة عالية"
          />
        </Head>

        <div className="min-h-screen bg-gray-50" dir="rtl">
          {/* Opensooq Style Navbar */}
          <OpensooqNavbar />

          {ssrErrorBanner}

          {/* Mobile Sidebar Toggle */}
          <div className="border-b bg-white auction-lg:hidden">
            <div className="mx-auto max-w-7xl px-4 py-2">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="flex items-center gap-2 text-gray-600 hover:text-blue-600"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>الفلاتر</span>
              </button>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="border-b bg-gray-100">
            <div className="mx-auto max-w-7xl px-4">
              {/* مؤشر تحميل خفيف */}
              {isRefreshing && (
                <div className="absolute left-0 top-0 z-50 h-0.5 w-full bg-blue-200">
                  <div className="h-full animate-pulse bg-blue-600" style={{ width: '100%' }}></div>
                </div>
              )}
              <div className="flex items-center justify-between py-2">
                {/* التبويبات العادية للشاشات الكبيرة والصغيرة جداً - محدثة للنظام الموحد */}
                {!isMobileTabsView && (
                  <div
                    className={`flex items-center gap-1 overflow-x-auto ${screenWidth <= 800 ? 'compact-tabs' : ''}`}
                  >
                    {subTabs.map((tab) => {
                      const TabIcon = tab.icon;
                      const colors = tab.color;
                      const isActive = activeSubTab === tab.key;

                      return (
                        <button
                          key={tab.key}
                          onClick={() => setActiveSubTab(tab.key)}
                          className={`flex items-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 ${screenWidth <= 800 ? 'px-2 py-1.5 text-xs' : 'px-4 py-2 text-sm'} ${
                            isActive
                              ? `${colors.bg} ${colors.text} ${colors.border} border-2 shadow-md`
                              : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                          } `}
                        >
                          <TabIcon
                            className={` ${screenWidth <= 800 ? 'h-3 w-3' : 'h-4 w-4'} ${isActive ? '' : 'text-gray-500'} `}
                          />
                          <span>
                            {screenWidth <= 800
                              ? screenWidth <= 320
                                ? tab.shortLabel
                                : `${tab.shortLabel} (${tab.count})`
                              : `${tab.label} (${tab.count})`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* القائمة المنسدلة للشاشات الصغيرة - محدثة للنظام الموحد */}
                {isMobileTabsView && (
                  <div className="tabs-dropdown-container relative">
                    {(() => {
                      const activeTab = getActiveTab();
                      const ActiveIcon = activeTab.icon;

                      return (
                        <button
                          onClick={() => setShowTabsDropdown(!showTabsDropdown)}
                          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                        >
                          <ActiveIcon className="h-4 w-4" />
                          <span>
                            {activeTab.label} ({activeTab.count})
                          </span>
                          <ChevronDownIcon
                            className={`h-4 w-4 transition-transform ${showTabsDropdown ? 'rotate-180' : ''}`}
                          />
                        </button>
                      );
                    })()}

                    {/* القائمة المنسدلة */}
                    {showTabsDropdown && (
                      <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-gray-200 bg-white shadow-lg">
                        {subTabs.map((tab) => {
                          const TabIcon = tab.icon;
                          const isActive = activeSubTab === tab.key;
                          const colors = tab.color;

                          return (
                            <button
                              key={tab.key}
                              onClick={() => {
                                setActiveSubTab(tab.key);
                                setShowTabsDropdown(false);
                              }}
                              className={`flex w-full items-center gap-2 px-4 py-3 text-right transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-gray-50 ${isActive ? `${colors.bg} ${colors.text}` : 'text-gray-700'} `}
                            >
                              <TabIcon className="h-4 w-4" />
                              <span>
                                {tab.label} ({tab.count})
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  {/* تم حذف زر أضف إعلانك */}
                  {/* تم حذف زر عرض الخريطة */}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Filters - يظهر فقط في الشاشات الصغيرة */}
          <div className="mobile-filters-container block border-b border-gray-200 bg-white auction-lg:hidden">
            <div className="mx-auto max-w-7xl px-4">
              <button
                onClick={() => setShowMobileFilters(!showMobileFilters)}
                className="mobile-filters-button flex w-full items-center justify-between py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  <FunnelIcon className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-gray-900">فلاتر البحث</span>
                  {Object.values(filters).some(
                    (value) => value !== '' && value !== 'جميع المزادات' && value !== null,
                  ) && (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">
                      نشط
                    </span>
                  )}
                </div>
                {showMobileFilters ? (
                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                )}
              </button>

              {/* محتوى الفلاتر المطوي */}
              {showMobileFilters && (
                <div className="mobile-filters-content mt-2 border-t border-gray-100 pb-4 pt-4">
                  <div className="space-y-4">
                    {/* البحث النصي */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-gray-600" />
                        <span>البحث في العنوان والوصف</span>
                      </label>
                      <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                        <input
                          type="text"
                          placeholder="ابحث عن مزاد..."
                          value={filters.searchQuery}
                          onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                          className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* حالة المزاد */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        <TrophyIcon className="h-4 w-4 flex-shrink-0 text-blue-600" />
                        <span>حالة المزاد</span>
                      </label>
                      <div className="mobile-filter-buttons flex flex-wrap gap-2">
                        {[
                          'جميع المزادات',
                          'مباشر',
                          'ينتهي قريباً',
                          'قادم',
                          'تم البيع',
                          'منتهي',
                        ].map((status) => (
                          <button
                            key={status}
                            onClick={() => handleFilterChange('auctionStatus', status)}
                            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                              filters.auctionStatus === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* نطاق السعر */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        <CurrencyDollarIcon className="h-4 w-4 flex-shrink-0 text-green-600" />
                        <span>نطاق السعر (دينار)</span>
                      </label>
                      <div className="mobile-filter-inputs grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          placeholder="من"
                          value={filters.priceMin || ''}
                          onChange={(e) =>
                            handleFilterChange(
                              'priceMin',
                              e.target.value ? parseInt(e.target.value) : null,
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="number"
                          placeholder="إلى"
                          value={filters.priceMax || ''}
                          onChange={(e) =>
                            handleFilterChange(
                              'priceMax',
                              e.target.value ? parseInt(e.target.value) : null,
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>

                    {/* أزرار سريعة للأسعار */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: 'أقل من 50k', min: null, max: 50000 },
                        { label: '50k-100k', min: 50000, max: 100000 },
                        { label: '100k-200k', min: 100000, max: 200000 },
                        { label: '200k+', min: 200000, max: null },
                      ].map((range) => (
                        <button
                          key={range.label}
                          onClick={() => {
                            handleFilterChange('priceMin', range.min);
                            handleFilterChange('priceMax', range.max);
                          }}
                          className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-100"
                        >
                          {range.label}
                        </button>
                      ))}
                    </div>

                    {/* النوع والموديل والسنة */}
                    <div className="space-y-4">
                      {/* النوع والموديل - تصميم أساسي بعناصر select فقط */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          النوع والموديل
                        </label>
                        <BasicBrandModelFilter
                          brand={filters.brand === 'الماركات' ? '' : filters.brand}
                          model={filters.model === 'الموديلات' ? '' : filters.model}
                          onChange={({ brand, model }) => {
                            if (brand !== undefined) {
                              handleFilterChange('brand', brand || 'الماركات');
                              handleFilterChange('model', 'الموديلات');
                            }
                            if (model !== undefined) {
                              handleFilterChange('model', model || 'الموديلات');
                            }
                          }}
                        />
                      </div>

                      {/* السنة */}
                      <div>
                        <label className="mb-2 block text-sm font-medium text-gray-700">
                          السنة
                        </label>
                        <YearRangeSelector
                          yearFrom={filters.yearFrom === 'جميع السنوات' ? '' : filters.yearFrom}
                          yearTo={filters.yearTo === 'جميع السنوات' ? '' : filters.yearTo}
                          onYearFromChange={(y: string) =>
                            handleFilterChange('yearFrom', y || 'جميع السنوات')
                          }
                          onYearToChange={(y: string) =>
                            handleFilterChange('yearTo', y || 'جميع السنوات')
                          }
                          labelFrom="من سنة"
                          labelTo="إلى سنة"
                        />
                      </div>
                    </div>

                    {/* الموقع */}
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                        <MapPinIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                        <span>الموقع</span>
                      </label>
                      <select
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                      >
                        {locationOptions.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* فلتر المميزة فقط */}
                    <div className="mb-4">
                      <button
                        onClick={() => handleFilterChange('featuredOnly', !filters.featuredOnly)}
                        className={`flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-all ${
                          filters.featuredOnly
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-sm'
                            : 'border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                        }`}
                      >
                        <StarIcon className="h-5 w-5" />
                        <span>المميزة فقط</span>
                      </button>
                    </div>

                    {/* زر مسح الفلاتر */}
                    <button
                      onClick={resetFilters}
                      className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      <span>مسح جميع الفلاتر</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="mx-auto max-w-7xl px-4 py-6">
            <div className="flex items-start justify-start gap-3">
              {/* Sidebar - Fixed height to match content - مخفي في الشاشات الصغيرة */}
              <div
                className={`${sidebarOpen ? 'w-72' : 'w-0'} hidden flex-shrink-0 overflow-hidden transition-all duration-300 auction-lg:block auction-lg:w-72`}
              >
                <div className="h-fit rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                  <h3 className="mb-4 border-b border-gray-200 pb-2 text-base font-semibold text-gray-800">
                    فلاتر البحث
                  </h3>

                  {/* فلاتر المزادات الجديدة */}
                  <div className="space-y-4">
                    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TrophyIcon className="h-5 w-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">فلاتر المزادات</h3>
                        </div>
                        <button
                          onClick={resetFilters}
                          className="text-gray-500 transition-colors hover:text-red-600"
                          title="مسح جميع الفلاتر"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>

                      {/* البحث النصي */}
                      <div className="mb-4">
                        <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                          <MagnifyingGlassIcon className="h-4 w-4 flex-shrink-0 text-gray-600" />
                          <span>البحث في العنوان والوصف</span>
                        </label>
                        <div className="relative">
                          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                          <input
                            type="text"
                            placeholder="ابحث عن مزاد..."
                            value={filters.searchQuery}
                            onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* اختيار النوع والموديل والسنة */}
                      <div className="space-y-3">
                        {/* النوع والموديل - تصميم أساسي بعناصر select فقط */}
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            النوع والموديل
                          </label>
                          <BasicBrandModelFilter
                            brand={filters.brand === 'الماركات' ? '' : filters.brand}
                            model={filters.model === 'الموديلات' ? '' : filters.model}
                            onChange={({ brand, model }) => {
                              if (brand !== undefined) {
                                handleFilterChange('brand', brand || 'الماركات');
                                handleFilterChange('model', 'الموديلات');
                              }
                              if (model !== undefined) {
                                handleFilterChange('model', model || 'الموديلات');
                              }
                            }}
                          />
                        </div>

                        {/* السنة */}
                        <div>
                          <label className="mb-2 block text-sm font-medium text-gray-700">
                            السنة
                          </label>
                          <YearRangeSelector
                            yearFrom={filters.yearFrom === 'جميع السنوات' ? '' : filters.yearFrom}
                            yearTo={filters.yearTo === 'جميع السنوات' ? '' : filters.yearTo}
                            onYearFromChange={(y: string) =>
                              handleFilterChange('yearFrom', y || 'جميع السنوات')
                            }
                            onYearToChange={(y: string) =>
                              handleFilterChange('yearTo', y || 'جميع السنوات')
                            }
                            labelFrom="من سنة"
                            labelTo="إلى سنة"
                          />
                        </div>

                        {/* الموقع */}
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                            <MapPinIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                            <span>الموقع</span>
                          </label>
                          <select
                            value={filters.location}
                            onChange={(e) => handleFilterChange('location', e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                          >
                            {locationOptions.map((city) => (
                              <option key={city} value={city}>
                                {city}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* فلاتر أساسية */}
                      <div className="space-y-4">
                        {/* حالة المزاد */}
                        <div className="py-2">
                          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                            <TrophyIcon className="h-4 w-4 flex-shrink-0 text-blue-600" />
                            <span>حالة المزاد</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              'جميع المزادات',
                              'مباشر',
                              'ينتهي قريباً',
                              'قادم',
                              'تم البيع',
                              'منتهي',
                            ].map((status) => (
                              <button
                                key={status}
                                onClick={() => handleFilterChange('auctionStatus', status)}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                  filters.auctionStatus === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* نطاق السعر */}
                        <div className="py-2">
                          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                            <CurrencyDollarIcon className="h-4 w-4 flex-shrink-0 text-blue-600" />
                            <span>نطاق المزايدة (دينار ليبي)</span>
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="text"
                              placeholder="الحد الأدنى"
                              value={
                                filters.priceMin ? filters.priceMin.toLocaleString('en-US') : ''
                              }
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, '');
                                handleFilterChange(
                                  'priceMin',
                                  value === '' ? null : parseInt(value),
                                );
                              }}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                              type="text"
                              placeholder="الحد الأقصى"
                              value={
                                filters.priceMax ? filters.priceMax.toLocaleString('en-US') : ''
                              }
                              onChange={(e) => {
                                const value = e.target.value.replace(/,/g, '');
                                handleFilterChange(
                                  'priceMax',
                                  value === '' ? null : parseInt(value),
                                );
                              }}
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          {/* أزرار سريعة للأسعار */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {[
                              { label: 'أقل من 50k', min: null, max: 50000 },
                              { label: '50k-100k', min: 50000, max: 100000 },
                              { label: '100k-200k', min: 100000, max: 200000 },
                              { label: '200k-300k', min: 200000, max: 300000 },
                              { label: 'أكثر من 300k', min: 300000, max: null },
                            ].map((range) => (
                              <button
                                key={range.label}
                                onClick={() => {
                                  handleFilterChange('priceMin', range.min);
                                  handleFilterChange('priceMax', range.max);
                                }}
                                className="rounded border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 transition-colors hover:bg-blue-100"
                              >
                                {range.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* الوقت المتبقي */}
                        <div className="py-2">
                          <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
                            <ClockIcon className="h-4 w-4 flex-shrink-0 text-red-600" />
                            <span>الوقت المتبقي</span>
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              'جميع الأوقات',
                              'أقل من ساعة',
                              'أقل من 6 ساعات',
                              'أقل من 24 ساعة',
                              'أكثر من يوم',
                            ].map((time) => (
                              <button
                                key={time}
                                onClick={() => handleFilterChange('timeRemaining', time)}
                                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                                  filters.timeRemaining === time
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                              >
                                {time}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cars List or Map */}
              <div className="min-h-0 flex-1">
                <div
                  className={`auction-header-controls mb-4 flex items-center justify-between ${screenWidth <= 800 ? 'flex-col gap-2 sm:flex-row' : ''}`}
                >
                  <h2
                    className={`flex items-center gap-2 font-bold ${screenWidth <= 800 ? 'text-lg' : 'text-xl'}`}
                  >
                    <TrophyIcon
                      className={`text-blue-600 ${screenWidth <= 800 ? 'h-4 w-4' : 'h-5 w-5'}`}
                    />
                    <span>
                      {screenWidth <= 800 ? (
                        // نصوص مختصرة للشاشات الصغيرة
                        <>
                          {activeSubTab === 'live' && 'مزاد مباشر'}
                          {activeSubTab === 'upcoming' && 'مزاد قادم'}
                          {activeSubTab === 'sold' && 'تم البيع'}
                          {activeSubTab === 'ended' && 'مزاد منتهي'}
                        </>
                      ) : (
                        // نصوص كاملة للشاشات الكبيرة
                        <>
                          {activeSubTab === 'live' && (
                            <div className="flex items-center gap-2">
                              <SignalIcon className="h-5 w-5 text-red-600" />
                              المزادات المباشرة
                            </div>
                          )}
                          {activeSubTab === 'upcoming' && (
                            <div className="flex items-center gap-2">
                              <ClockIcon className="h-5 w-5 text-blue-600" />
                              المزادات القادمة
                            </div>
                          )}
                          {activeSubTab === 'ended' && (
                            <div className="flex items-center gap-2">
                              <FolderIcon className="h-5 w-5 text-gray-600" />
                              المزادات المنتهية
                            </div>
                          )}
                          {activeSubTab === 'sold' && (
                            <div className="flex items-center gap-2">
                              <TrophyIcon className="h-5 w-5 text-green-600" />
                              المزادات المباعة
                            </div>
                          )}
                        </>
                      )}
                    </span>
                    <span className={`text-gray-500 ${screenWidth <= 800 ? 'text-sm' : ''}`}>
                      ({filteredCars.length})
                    </span>
                  </h2>

                  <div className="view-controls-wrapper flex items-center gap-4">
                    {/* أزرار العرض */}
                    <div
                      className={`relative flex items-center gap-1 rounded-lg bg-gray-100 ${screenWidth <= 800 ? 'p-0.5' : 'p-1'}`}
                    >
                      <button
                        onClick={() => handleViewModeChange('list')}
                        disabled={screenWidth < 920}
                        className={`rounded-md transition-colors ${
                          screenWidth <= 800 ? 'p-1.5' : 'p-2'
                        } ${
                          viewMode === 'list'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        } ${screenWidth < 920 ? 'cursor-not-allowed opacity-50' : ''}`}
                        title={screenWidth < 920 ? 'غير متاح في الشاشات الصغيرة' : 'عرض قائمة'}
                      >
                        <ListBulletIcon
                          className={`view-mode-icon ${screenWidth <= 800 ? 'h-4 w-4' : 'h-5 w-5'}`}
                        />
                      </button>
                      <button
                        onClick={() => handleViewModeChange('grid')}
                        className={`rounded-md transition-colors ${
                          screenWidth <= 800 ? 'p-1.5' : 'p-2'
                        } ${
                          viewMode === 'grid'
                            ? 'bg-white text-blue-600 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                        title="عرض شبكي"
                      >
                        <Squares2X2Icon
                          className={`view-mode-icon ${screenWidth <= 800 ? 'h-4 w-4' : 'h-5 w-5'}`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* عرض البطاقات */}
                <div
                  className={
                    viewMode === 'grid'
                      ? `auction-grid-view grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 md:gap-6`
                      : 'auction-list-view space-y-6'
                  }
                >
                  {filteredCars.map((car) => {
                    const transformedCar = transformCarData(car);
                    const idStr = String(car.id);
                    const carIdNumber =
                      typeof car.id === 'number' ? car.id : parseInt(String(car.id), 10);
                    return (
                      <div
                        key={idStr}
                        data-auction-id={idStr}
                        ref={setItemRef(idStr)}
                        className={viewMode === 'grid' ? '' : ''}
                      >
                        {viewMode === 'grid' ? (
                          <AuctionCardGrid
                            car={transformedCar}
                            onContactClick={handleContactClick}
                            onChatClick={handleChatClick}
                            onBidClick={handleBidClick}
                            onFavoriteClick={() => handleFavoriteClick(car.id)}
                            onReminderClick={(carId) => handleReminderClick(carId)}
                            isFavorite={isFavorite(undefined, String(car.id))}
                            hasReminder={reminders.includes(carIdNumber)}
                            externalTick={globalTick}
                          />
                        ) : (
                          <NewAuctionCard
                            car={transformedCar}
                            onContactClick={handleContactClick}
                            onChatClick={handleChatClick}
                            onBidClick={handleBidClick}
                            onFavoriteClick={() => handleFavoriteClick(car.id)}
                            onReminderClick={(carId) => handleReminderClick(Number(carId))}
                            isFavorite={isFavorite(undefined, String(car.id))}
                            hasReminder={reminders.includes(carIdNumber)}
                            externalTick={globalTick}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {filteredCars.length === 0 && (
                  <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
                    <div className="mx-auto mb-4 h-16 w-16 text-gray-400">
                      <svg fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    </div>
                    <h3 className="mb-2 text-xl font-medium text-gray-900">
                      {activeSubTab === 'live' && 'لا توجد مزادات مباشرة حالياً'}
                      {activeSubTab === 'upcoming' && 'لا توجد مزادات قادمة'}
                      {activeSubTab === 'sold' && 'لا توجد مزادات مباعة حتى الآن'}
                      {activeSubTab === 'ended' && 'الأرشيف فارغ'}
                    </h3>
                    <p className="mb-4 text-gray-600">
                      {activeSubTab === 'live' && 'تحقق مرة أخرى قريباً أو تصفح المزادات القادمة'}
                      {activeSubTab === 'upcoming' &&
                        'تحقق مرة أخرى قريباً أو تصفح المزادات المباشرة'}
                      {activeSubTab === 'sold' && 'لا توجد مزادات مباعة في الوقت الحالي.'}
                      {activeSubTab === 'ended' && 'لا توجد مزادات منتهية. تصفح المزادات المباشرة!'}
                    </p>
                    <div className="flex justify-center gap-3">
                      {activeSubTab !== 'live' && (
                        <button
                          onClick={() => setActiveSubTab('live')}
                          className="group inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-l from-red-600 to-red-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/25 ring-1 ring-red-400/20 transition-all duration-300 hover:from-red-700 hover:to-red-600 hover:shadow-xl hover:shadow-red-500/30 active:scale-[0.98]"
                        >
                          <SignalIcon className="h-5 w-5 animate-pulse" />
                          <span>عرض المزادات المباشرة</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* مكون الترقيم */}
                {filteredCars.length > 0 && pagination.totalPages > 1 && (
                  <div className="mt-8 flex justify-center">
                    <Pagination
                      currentPage={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      onPageChange={pagination.setPage}
                      showInfo={true}
                      totalItems={pagination.totalItems}
                      itemsPerPage={pagination.itemsPerPage}
                      size="medium"
                      className="rounded-lg bg-white p-4 shadow-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* نصائح الأمان */}
        <div className="container mx-auto px-4 py-8">
          <SafetyTips />
        </div>

        {/* نافذة تسجيل الدخول */}
        <LoginModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </>
    );
  },
);

AuctionsPage.displayName = 'AuctionsPage';

// إضافة getServerSideProps لجلب البيانات من الخادم
export const getServerSideProps: GetServerSideProps<AuctionsPageProps> = async () => {
  // إرجاع افتراضي في حالة أي خطأ غير متوقع
  const defaultReturn = {
    props: {
      auctions: [],
      stats: { live: 0, upcoming: 0, ended: 0, total: 0 },
    },
  };

  try {
    // استيراد prisma
    let prisma;
    try {
      const prismaModule = await import('../lib/prisma');
      prisma = prismaModule.prisma;
    } catch (importError) {
      console.error('[🚨 SSR Error] فشل استيراد Prisma:', importError);
      return defaultReturn;
    }

    if (!prisma) {
      console.error('[🚨 SSR Error] Prisma غير متوفر');
      return defaultReturn;
    }
    // جلب المزادات من قاعدة البيانات
    // ✅ تم إصلاح أسماء الموديلات والعلاقات حسب schema.prisma:
    // - auctions (وليس auction)
    // - cars (وليس car)
    // - users (وليس seller)
    // - car_images (وليس carImages)
    let auctions;
    try {
      // ✅ جلب المزادات الأونلاين فقط (بدون مزادات الساحات)
      // مزادات الساحات تظهر في /yards/[slug] فقط
      auctions = await prisma.auctions.findMany({
        where: {
          yardId: null, // ✅ استبعاد مزادات الساحات - هذا الفلتر مهم جداً!
          status: { not: 'CANCELLED' },
        },
        select: {
          id: true,
          title: true,
          startPrice: true, // ✅ الاسم الصحيح في schema
          currentPrice: true,
          // reservePrice: true, // غير موجود في schema
          startDate: true, // ✅ الاسم الصحيح في schema
          endDate: true, // ✅ الاسم الصحيح في schema
          status: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          // ✅ بيانات الترويج والتمييز - مهمة للشارات الذهبية
          featured: true,
          promotionPackage: true,
          promotionDays: true,
          promotionPriority: true,
          promotionEndDate: true,
          cars: {
            // ✅ العلاقة الصحيحة
            select: {
              id: true,
              brand: true,
              model: true,
              year: true,
              price: true,
              location: true,
              // area: true, // قد لا يكون موجود
              description: true,
              images: true,
              status: true,
              fuelType: true,
              transmission: true,
              bodyType: true,
              color: true,
              users: {
                // ✅ العلاقة الصحيحة للبائع
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  verified: true,
                },
              },
              car_images: {
                // ✅ العلاقة الصحيحة للصور
                select: { fileUrl: true, isPrimary: true, createdAt: true },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                take: 5,
              },
            },
          },
          bids: {
            select: {
              id: true,
              amount: true,
              createdAt: true,
              users: {
                // ✅ العلاقة الصحيحة
                select: { id: true, name: true },
              },
            },
            orderBy: { amount: 'desc' },
            take: 3,
          },
        },
        orderBy: [
          { featured: 'desc' }, // المميزة أولاً
          { promotionPriority: 'desc' }, // حسب أولوية الترويج
          { createdAt: 'desc' }, // ثم حسب التاريخ
        ],
        take: 50,
      });
    } catch (dbError) {
      console.error('[🚨 SSR Error] خطأ في استعلام قاعدة البيانات:', dbError);
      return defaultReturn;
    }

    if (!auctions || !Array.isArray(auctions)) {
      console.warn('[SSR Warning] لا توجد بيانات مزادات');
      return defaultReturn;
    }

    // ✅ تحويل البيانات للتوافق مع الواجهة الأمامية
    let formattedAuctions: AuctionWithDetails[];
    try {
      // Vercel/Next.js: props must be JSON-serializable.
      // Prisma قد يُرجع BigInt/Decimal لبعض الحقول (خصوصاً ids والأسعار) وهذا يسبب 500 في /_next/data.
      const toSafeId = (v: unknown): string => {
        if (typeof v === 'bigint') return v.toString();
        if (v === null || v === undefined) return '';
        return String(v);
      };
      const toSafeNumber = (v: unknown, fallback = 0): number => {
        if (v === null || v === undefined) return fallback;
        if (typeof v === 'bigint') {
          const n = Number(v);
          return Number.isFinite(n) ? n : fallback;
        }
        if (typeof v === 'number') return Number.isFinite(v) ? v : fallback;
        // Prisma.Decimal أو string
        const n = Number(v as any);
        return Number.isFinite(n) ? n : fallback;
      };

      formattedAuctions = auctions.map((auction: any) => {
        // استخراج روابط الصور من car_images (الجديد) أو images (القديم)
        const carImagesArray = auction.cars?.car_images || [];
        let imageUrls: string[] = carImagesArray
          .filter((img: any) => img && img.fileUrl && img.fileUrl.trim())
          .map((img: any) => {
            const url = img.fileUrl.trim();
            if (url.startsWith('http') || url.startsWith('/')) {
              return url;
            }
            return `/images/cars/listings/${url}`;
          });

        // ✅ fallback للصور القديمة من حقل images
        if (imageUrls.length === 0 && auction.cars?.images) {
          const legacyImages = auction.cars.images;
          if (typeof legacyImages === 'string' && legacyImages.trim()) {
            try {
              if (legacyImages.startsWith('[')) {
                const parsed = JSON.parse(legacyImages);
                if (Array.isArray(parsed)) {
                  imageUrls = parsed.filter(
                    (img: any) =>
                      typeof img === 'string' &&
                      img.trim() &&
                      !img.includes('placeholder') &&
                      !img.includes('unsplash'),
                  );
                }
              } else if (legacyImages.includes(',')) {
                imageUrls = legacyImages
                  .split(',')
                  .map((img: string) => img.trim())
                  .filter(
                    (img: string) =>
                      img && !img.includes('placeholder') && !img.includes('unsplash'),
                  );
              } else if (
                !legacyImages.includes('placeholder') &&
                !legacyImages.includes('unsplash')
              ) {
                imageUrls = [legacyImages.trim()];
              }
            } catch (e) {
              if (!legacyImages.includes('placeholder') && !legacyImages.includes('unsplash')) {
                imageUrls = [legacyImages.trim()];
              }
            }
          } else if (Array.isArray(legacyImages)) {
            imageUrls = legacyImages.filter(
              (img: any) =>
                typeof img === 'string' &&
                img.trim() &&
                !img.includes('placeholder') &&
                !img.includes('unsplash'),
            );
          }
        }

        // إذا لم توجد صور، استخدم الصورة الافتراضية
        if (imageUrls.length === 0) {
          imageUrls.push('/images/cars/default-car.svg');
        }

        return {
          id: toSafeId(auction.id),
          title: auction.title || '',
          startingPrice: toSafeNumber(auction.startPrice, 0), // ✅ الاسم الصحيح
          currentPrice: toSafeNumber(auction.currentPrice, 0),
          reservePrice: null, // غير موجود في schema
          startTime: auction.startDate ? auction.startDate.toISOString() : null, // ✅ الاسم الصحيح
          endTime: auction.endDate ? auction.endDate.toISOString() : new Date().toISOString(), // ✅ الاسم الصحيح
          status: auction.status || 'ACTIVE',
          description: auction.description || '',
          createdAt: auction.createdAt ? auction.createdAt.toISOString() : new Date().toISOString(),
          updatedAt: auction.updatedAt ? auction.updatedAt.toISOString() : new Date().toISOString(),
          car: {
            id: toSafeId(auction.cars?.id),
            brand: auction.cars?.brand || '',
            model: auction.cars?.model || '',
            year: auction.cars?.year || null,
            price:
              auction.cars?.price === null || auction.cars?.price === undefined
                ? null
                : toSafeNumber(auction.cars?.price, 0),
            description: auction.cars?.description || '',
            location: auction.cars?.location || 'طرابلس',
            area: '', // سيتم معالجته لاحقاً
            status: auction.cars?.status || undefined,
            fuelType: auction.cars?.fuelType,
            transmission: auction.cars?.transmission,
            bodyType: auction.cars?.bodyType,
            color: auction.cars?.color,
            // توحيد البائع - ✅ الاسم الصحيح
            user: {
              id: toSafeId(auction.cars?.users?.id),
              name: auction.cars?.users?.name || 'غير معروف',
              verified: !!auction.cars?.users?.verified,
              phone: auction.cars?.users?.phone || null,
            },
            // ✅ الصور المحسنة
            carImages: carImagesArray.map((img: any) => ({
              fileUrl: img.fileUrl || '',
              isPrimary: img.isPrimary,
              createdAt: img.createdAt
                ? typeof img.createdAt === 'string'
                  ? img.createdAt
                  : img.createdAt.toISOString?.()
                : null,
            })),
            images: imageUrls,
          },
          // ✅ إضافة الصور على مستوى المزاد للتوافق
          images: imageUrls,
          image: imageUrls[0] || '/images/cars/default-car.svg',
          imageList: imageUrls,
          bids: (auction.bids || []).map((bid: any) => ({
            id: toSafeId(bid.id),
            amount: toSafeNumber(bid.amount, 0),
            user: bid.users
              ? { id: toSafeId(bid.users.id), name: bid.users.name || 'غير معروف' }
              : { id: '0', name: 'غير معروف' }, // ✅ الاسم الصحيح
            createdAt: bid.createdAt ? bid.createdAt.toISOString() : new Date().toISOString(),
          })),
          winner: null,
          // ✅ بيانات الترويج والتمييز - مهمة للشارات الذهبية
          featured: auction.featured || false,
          promotionPackage: auction.promotionPackage || 'free',
          promotionDays: toSafeNumber(auction.promotionDays, 0),
          promotionPriority: toSafeNumber(auction.promotionPriority, 0),
          promotionEndDate: auction.promotionEndDate
            ? auction.promotionEndDate.toISOString()
            : null,
        };
      });
    } catch (formatError) {
      console.error('[🚨 SSR Error] خطأ في تنسيق البيانات:', formatError);
      return defaultReturn;
    }

    // حساب الإحصائيات
    const stats = {
      live: formattedAuctions.filter((a) => a.status === 'ACTIVE').length,
      upcoming: formattedAuctions.filter((a) => a.status === 'UPCOMING').length,
      ended: formattedAuctions.filter((a) => a.status === 'ENDED').length,
      total: formattedAuctions.length,
    };

    // تعقيم الكائن للتأكد من أن جميع القيم قابلة للتسلسل في Next.js
    // نفس الأسلوب المستخدم في صفحة marketplace لتجنب أخطاء 500 في /_next/data
    const propsPayload: AuctionsPageProps = {
      auctions: formattedAuctions,
      stats,
    };

    const sanitizedProps = JSON.parse(JSON.stringify(propsPayload));

    return {
      props: sanitizedProps,
    };
  } catch (error) {
    console.error('[🚨 SSR Error] خطأ في جلب المزادات:', error);
    // إرجاع بيانات فارغة بدون حجب الواجهة (بدون error لعدم منع العرض)
    return defaultReturn;
  }
};

export default AuctionsPage;
