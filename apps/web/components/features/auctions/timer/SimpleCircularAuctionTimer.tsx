import { useUnifiedAuctionProgress } from '@/utils/auctionTimer';
import React, { useEffect, useMemo, useState } from 'react';

interface SimpleCircularAuctionTimerProps {
  endTime: string;
  startTime?: string;
  currentBid: string | number;
  bidCount: number;
  startingBid?: string | number;
  reservePrice?: string | number | undefined;
  auctionStatus?: 'upcoming' | 'live' | 'ended' | 'sold';
  size?: 'compact' | 'medium' | 'large' | string;
  externalTick?: number;
}

const SimpleCircularAuctionTimer: React.FC<SimpleCircularAuctionTimerProps> = ({
  endTime,
  startTime,
  currentBid,
  bidCount,
  startingBid = '0',
  reservePrice,
  auctionStatus = 'live',
  externalTick,
}) => {
  const [isClient, setIsClient] = useState(false);
  const [animatedBid, setAnimatedBid] = useState(0);
  const [animatedBidCount, setAnimatedBidCount] = useState(0);
  // تم إزالة حالة تحريك العنصر للحفاظ على ثبات المكوّن
  const [isBidCountAnimating, setIsBidCountAnimating] = useState(false);

  // محول أرقام مرن يدعم الأرقام العربية والفواصل العربية
  const normalizeToNumber = (input: any): number => {
    if (typeof input === 'number' && Number.isFinite(input)) return input;
    if (input === null || input === undefined) return 0;
    try {
      let s = String(input);
      // تحويل الأرقام العربية الشرقية إلى الإنجليزية
      const eastern = '٠١٢٣٤٥٦٧٨٩';
      const western = '0123456789';
      s = s.replace(/[٠-٩]/g, (d) => western[eastern.indexOf(d)] || d);
      // إزالة فواصل الآلاف: العربية \u066C والإنجليزية ,
      s = s.replace(/[\u066C,]/g, '');
      // استبدال الفاصل العشري العربي \u066B بنقطة
      s = s.replace(/\u066B/g, '.');
      // إزالة المسافات وعلامات NBSP
      s = s.replace(/[\s\u00A0]/g, '');
      // السماح بالأرقام والنقطة فقط
      s = s.replace(/[^0-9.]/g, '');
      const n = parseFloat(s);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  };

  // تحضير البيانات
  const progressParams = useMemo(
    () => ({
      auctionStatus,
      externalTick: externalTick || 0,
      startTime: startTime,
      endTime: endTime,
      currentPrice: normalizeToNumber(currentBid),
      startingPrice: normalizeToNumber(startingBid),
      reservePrice: normalizeToNumber(reservePrice),
    }),
    [auctionStatus, startTime, endTime, currentBid, startingBid, reservePrice, externalTick],
  );

  const unifiedProgress = useUnifiedAuctionProgress(progressParams, externalTick);
  const timeLeft = unifiedProgress.timeLeft;
  const progress = unifiedProgress.displayProgress;
  const computedStatus = unifiedProgress.status;
  const uiStatus: 'upcoming' | 'live' | 'ended' =
    computedStatus === 'active' ? 'live' : computedStatus;

  const isEndedLike = uiStatus === 'ended';
  const isLiveLike = uiStatus === 'live';
  const isUpcomingLike = uiStatus === 'upcoming';

  // ✅ منطق تحديد "تم البيع" بناءً على السعر المطلوب
  const currentPriceNum = normalizeToNumber(currentBid);
  const reservePriceNum = normalizeToNumber(reservePrice);
  const hasReachedReserve = reservePriceNum > 0 && currentPriceNum >= reservePriceNum;

  // تم البيع إذا: وصل للسعر المطلوب + (انتهى الوقت أو تم القبول يدوياً)
  const isSoldLike = auctionStatus === 'sold' || (hasReachedReserve && isEndedLike);

  // لوحة ألوان ديناميكية حسب الحالة: مباشر (أزرق)، قادم (عنبر/ذهبي)، منتهي (رمادي)، تم البيع (أحمر)
  const colors = useMemo(() => {
    const palette = {
      live: {
        stroke: '#2563eb', // blue-600
        border: 'border-blue-300',
        text: 'text-blue-700',
        timerBg: 'rgb(37, 99, 235)',
        shadow: 'rgba(37, 99, 235, 0.3)',
      },
      upcoming: {
        stroke: '#b45309', // amber-700 (ذهبي/أصفر غامق)
        border: 'border-amber-300',
        text: 'text-amber-700',
        timerBg: 'rgb(180, 83, 9)',
        shadow: 'rgba(180, 83, 9, 0.3)',
      },
      ended: {
        stroke: '#6b7280', // gray-500
        border: 'border-gray-300',
        text: 'text-gray-700',
        timerBg: 'rgb(107, 114, 128)',
        shadow: 'rgba(107, 114, 128, 0.3)',
      },
      sold: {
        // ✅ ألوان خضراء لحالة "تم البيع" - تدل على النجاح والإتمام
        stroke: '#059669', // emerald-600
        border: 'border-emerald-300',
        text: 'text-emerald-700',
        timerBg: 'rgb(5, 150, 105)',
        shadow: 'rgba(5, 150, 105, 0.4)',
      },
    } as const;

    // تحديد اللون بناءً على الحالة
    if (isSoldLike) return palette.sold;
    if (uiStatus === 'upcoming') return palette.upcoming;
    if (uiStatus === 'ended') return palette.ended;
    return palette.live;
  }, [uiStatus, isSoldLike]);

  // تحديد قرب بدء المزاد (≤ 60 دقيقة)
  const isSoonToLive = useMemo(() => {
    if (!isClient) return false;
    if (!isUpcomingLike) return false;
    if (!startTime) return false;
    const startMs = Date.parse(startTime);
    if (!Number.isFinite(startMs)) return false;
    const diff = startMs - Date.now();
    return diff > 0 && diff <= 60 * 60 * 1000; // أقل أو يساوي ساعة
  }, [isClient, isUpcomingLike, startTime, externalTick]);

  // إعداد العميل
  useEffect(() => {
    setIsClient(true);
  }, []);

  // تحريك المزايدة بسلاسة باستخدام requestAnimationFrame
  useEffect(() => {
    if (!isClient) return;
    let cancelled = false;
    let rafId: number | null = null;

    try {
      // تحديد الهدف بأمان
      const targetRaw =
        !currentBid || currentBid === 'undefined' || currentBid === 'null' || currentBid === null
          ? (startingBid ?? 0)
          : currentBid;
      const safeTargetBid = Math.round(normalizeToNumber(targetRaw));

      if (!Number.isFinite(safeTargetBid) || safeTargetBid <= 0) return;

      const from = animatedBid || 0;
      if (from === safeTargetBid) return;

      const duration = 600; // ms
      const start = performance.now();

      const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const t = Math.min(Math.max(elapsed / duration, 0), 1);
        const eased = easeOutCubic(t);
        const next = Math.round(from + (safeTargetBid - from) * eased);
        setAnimatedBid(next);
        if (t < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          // تأكيد الوصول للقيمة النهائية
          setAnimatedBid(safeTargetBid);
        }
      };

      rafId = requestAnimationFrame(tick);

      return () => {
        cancelled = true;
        if (rafId !== null) cancelAnimationFrame(rafId);
      };
    } catch (error) {
      console.error('Error in bid animation:', error);
    }
    // ملاحظة: استبعاد animatedBid من التبعيات مقصود لتجنب إعادة تشغيل الأنيميشن في كل frame
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBid, startingBid, auctionStatus, bidCount, isClient]);

  // تحريك عدد المزايدات
  useEffect(() => {
    if (!isClient) return;

    if (bidCount !== animatedBidCount) {
      const diff = Math.abs(bidCount - animatedBidCount);

      // فروق كبيرة: قفزة فورية بدون أنيميشن لتجنّب البطء
      if (diff > 25) {
        setAnimatedBidCount(bidCount);
        setIsBidCountAnimating(false);
        return;
      }

      // فروق صغيرة: أنيميشن سريع جداً 20–30ms للخطوة
      setIsBidCountAnimating(true);
      const step = bidCount > animatedBidCount ? 1 : -1;
      const interval = diff > 10 ? 20 : 30;
      const countTimer = setInterval(() => {
        setAnimatedBidCount((prev) => {
          const next = prev + step;
          if ((step > 0 && next >= bidCount) || (step < 0 && next <= bidCount)) {
            clearInterval(countTimer);
            setIsBidCountAnimating(false);
            return bidCount;
          }
          return next;
        });
      }, interval);

      return () => clearInterval(countTimer);
    }
  }, [bidCount, animatedBidCount, isClient]);

  // حسابات العرض
  const radius = 98;
  const circumference = 2 * Math.PI * radius;
  const safeProgress = isSoldLike || isEndedLike ? 100 : Math.max(5, Math.min(100, progress));
  // عكس الاتجاه: الشريط يتحرك من الأعلى مع عقارب الساعة
  const strokeDashoffset = (safeProgress / 100) * circumference;

  const formatNumber = (num: number) => {
    if (isNaN(num) || !isFinite(num)) return '0';
    return Math.floor(num).toLocaleString('en-US');
  };

  return (
    <div className="flex min-h-full items-center justify-center">
      <div className="text-center">
        <div className="flex items-center justify-center">
          <div
            className="relative mx-auto mt-4 h-56 w-56 overflow-visible"
            style={{
              zIndex: 1,
            }}
          >
            {/* مؤشر المزاد المباشر */}
            {isLiveLike && (
              <div className="absolute -right-6" style={{ zIndex: 50, right: '8px', top: '-6px' }}>
                <div className="flex items-center gap-1 rounded-md border border-red-400 bg-gradient-to-r from-red-500 to-red-600 px-1.5 py-0.5 text-white shadow-lg">
                  <div className="relative flex items-center justify-center">
                    <div className="h-1.5 w-1.5 animate-ping rounded-full bg-white opacity-75"></div>
                    <div className="absolute h-1 w-1 rounded-full bg-white"></div>
                  </div>
                  <span className="text-xs font-bold tracking-wide">مباشر</span>
                </div>
              </div>
            )}

            {/* مؤشر المزاد القادم */}
            {isUpcomingLike && (
              <div className="absolute -right-6" style={{ zIndex: 50, right: '8px', top: '-6px' }}>
                <div
                  className={`flex items-center gap-1 rounded-md border border-amber-300 bg-gradient-to-r from-amber-500 to-amber-600 px-1.5 py-0.5 text-white shadow-lg ${
                    isSoonToLive ? 'animate-pulse' : ''
                  }`}
                  style={
                    isSoonToLive ? { boxShadow: '0 0 10px rgba(245, 158, 11, 0.45)' } : undefined
                  }
                >
                  {isSoonToLive && (
                    <div className="relative">
                      <div className="h-1.5 w-1.5 animate-ping rounded-full bg-white opacity-75"></div>
                      <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-amber-200"></div>
                    </div>
                  )}
                  <span className="text-xs font-bold tracking-wide">
                    {isSoonToLive ? 'بعد قليل' : 'مزاد قادم'}
                  </span>
                </div>
              </div>
            )}

            {/* ✅ مؤشر "تم البيع" الأخضر - يدل على النجاح */}
            {isSoldLike && (
              <div className="absolute -right-6" style={{ zIndex: 50, right: '8px', top: '-6px' }}>
                <div className="flex items-center gap-1 rounded-md border border-emerald-400 bg-gradient-to-r from-emerald-600 to-emerald-700 px-1.5 py-0.5 text-white shadow-lg">
                  <div className="relative">
                    <div className="h-1.5 w-1.5 animate-ping rounded-full bg-white opacity-75"></div>
                    <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-emerald-200"></div>
                  </div>
                  <span className="text-xs font-bold tracking-wide">تم البيع</span>
                </div>
              </div>
            )}

            {/* الخلفية الدائرية */}
            <div
              className={`absolute inset-2 rounded-full border-2 ${colors.border} bg-white shadow-lg`}
              style={{ zIndex: 5 }}
            ></div>

            {/* شريط التقدم */}
            <svg
              className="absolute h-full w-full -rotate-90 transform"
              viewBox="0 0 224 224"
              style={{ zIndex: 10 }}
            >
              <circle
                cx="112"
                cy="112"
                r="98"
                stroke="#e2e8f0"
                strokeWidth="5"
                fill="none"
                opacity="0.4"
              />
              <circle
                cx="112"
                cy="112"
                r="98"
                stroke={colors.stroke}
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-linear"
                style={{
                  filter: `drop-shadow(0 0 3px ${colors.shadow})`,
                  opacity: 0.9,
                  willChange: 'stroke-dashoffset',
                }}
              />
            </svg>

            {/* المحتوى الداخلي */}
            <div
              className="circular-timer-content absolute inset-0 flex flex-col items-center justify-center p-2 text-center sm:p-4"
              style={{
                zIndex: 20,
              }}
            >
              {/* مبلغ المزايدة */}
              <div className="mb-0.5 text-center sm:mb-1">
                <div className={`mb-1 font-medium sm:mb-2 ${colors.text} text-[10px] sm:text-xs`}>
                  {isUpcomingLike
                    ? 'سعر البداية'
                    : isSoldLike
                      ? 'سعر البيع النهائي'
                      : isEndedLike
                        ? 'السعر النهائي'
                        : 'المزايدة الحالية'}
                </div>
                <div className="flex items-center justify-center gap-1 py-0.5 sm:gap-2 sm:py-1">
                  <span
                    className={`price-value inline-block rotate-0 scale-100 font-bold transition-transform duration-500 ${colors.text} text-lg sm:text-xl md:text-2xl`}
                  >
                    {formatNumber(animatedBid)}
                  </span>
                  <div
                    className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold sm:rounded-lg sm:px-2 sm:text-xs md:text-sm ${
                      isSoldLike
                        ? 'bg-emerald-100 text-emerald-600'
                        : isEndedLike
                          ? 'bg-gray-100 text-gray-600'
                          : isUpcomingLike
                            ? 'bg-amber-100 text-amber-600'
                            : 'bg-blue-100 text-blue-600'
                    }`}
                  >
                    د.ل
                  </div>
                </div>
              </div>

              {/* العداد */}
              <div className="mb-0.5 text-center sm:mb-1">
                {isSoldLike ? (
                  <div className="rounded-md bg-emerald-600 px-2 py-1 text-white shadow-lg sm:rounded-lg sm:px-3 sm:py-1.5">
                    <div className="text-xs font-bold sm:text-sm md:text-base">تم البيع</div>
                  </div>
                ) : isEndedLike ? (
                  <div className="rounded-md bg-gray-500 px-1.5 py-0.5 text-white shadow-lg sm:rounded-lg sm:px-2 sm:py-1">
                    <div className="text-xs font-bold sm:text-sm md:text-base">انتهى المزاد</div>
                  </div>
                ) : (
                  <div
                    className="rounded-md px-1.5 py-1 text-white shadow-lg sm:rounded-lg sm:px-2 sm:py-1.5"
                    style={{ backgroundColor: colors.timerBg }}
                  >
                    {/* عنوان العداد: يبدأ خلال / ينتهي خلال */}
                    {isUpcomingLike && (
                      <div className="mb-0.5 text-center text-[8px] font-medium opacity-90 sm:mb-1 sm:text-[10px]">
                        يبدأ خلال
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-1 sm:gap-1.5">
                      {(() => {
                        const hours = isNaN(timeLeft.hours) ? 0 : timeLeft.hours;
                        const minutes = isNaN(timeLeft.minutes) ? 0 : timeLeft.minutes;
                        const seconds = isNaN(timeLeft.seconds) ? 0 : timeLeft.seconds;

                        return (
                          <>
                            {/* الثواني */}
                            <div className="flex flex-col items-center">
                              <div className="font-mono text-xs font-bold sm:text-sm md:text-base">
                                {seconds.toString().padStart(2, '0')}
                              </div>
                              <div className="text-[8px] font-normal opacity-90 sm:text-[10px] md:text-xs">
                                ثانية
                              </div>
                            </div>
                            <div className="font-mono text-xs font-bold opacity-75 sm:text-sm md:text-base">
                              :
                            </div>
                            {/* الدقائق */}
                            <div className="flex flex-col items-center">
                              <div className="font-mono text-xs font-bold sm:text-sm md:text-base">
                                {minutes.toString().padStart(2, '0')}
                              </div>
                              <div className="text-[8px] font-normal opacity-90 sm:text-[10px] md:text-xs">
                                دقيقة
                              </div>
                            </div>
                            <div className="font-mono text-xs font-bold opacity-75 sm:text-sm md:text-base">
                              :
                            </div>
                            {/* الساعات */}
                            <div className="flex flex-col items-center">
                              <div className="font-mono text-xs font-bold sm:text-sm md:text-base">
                                {hours.toString().padStart(2, '0')}
                              </div>
                              <div className="text-[8px] font-normal opacity-90 sm:text-[10px] md:text-xs">
                                ساعة
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* عدد المزايدات */}
              <div
                className={`mt-1 rounded-md px-1 py-0.5 transition-all duration-300 sm:mt-2 sm:rounded-lg sm:px-1.5 ${
                  isBidCountAnimating && isLiveLike
                    ? 'scale-110 bg-blue-100'
                    : `scale-100 ${
                        isSoldLike
                          ? 'bg-emerald-100'
                          : isEndedLike
                            ? 'bg-gray-100'
                            : isUpcomingLike
                              ? 'bg-amber-100'
                              : 'bg-blue-100'
                      }`
                }`}
              >
                <div
                  className={`text-[10px] font-medium transition-colors duration-300 sm:text-xs ${
                    isSoldLike
                      ? 'text-emerald-800'
                      : isEndedLike
                        ? 'text-gray-800'
                        : isUpcomingLike
                          ? 'text-amber-800'
                          : 'text-blue-800'
                  }`}
                >
                  +{animatedBidCount} مزايدة
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleCircularAuctionTimer;
