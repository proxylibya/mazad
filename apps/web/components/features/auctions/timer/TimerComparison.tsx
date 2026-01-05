/**
 * مقارنة بين النظام القديم والجديد للعدادات الدائرية
 * للتأكد من أن التصميم لم يتغير وأن الحسابات محسنة
 */

import React from 'react';
import { calculateAuctionProgress } from '../../../../utils/auctionProgressCalculator';
import { calculateUnifiedProgress } from '../../../../utils/unifiedAuctionProgress';
import SimpleCircularAuctionTimer from './SimpleCircularAuctionTimer';

interface TimerComparisonProps {
  endTime: string;
  startTime?: string;
  currentBid: string;
  bidCount: number;
  startingBid?: string;
  reservePrice?: string;
  auctionStatus: 'upcoming' | 'live' | 'ended';
}

const TimerComparison: React.FC<TimerComparisonProps> = ({
  endTime,
  startTime,
  currentBid,
  bidCount,
  startingBid = '0',
  reservePrice,
  auctionStatus,
}) => {
  // حساب التقدم بالنظام القديم
  const oldProgress = calculateAuctionProgress({
    auctionStatus,
    startTime: startTime || endTime,
    endTime,
    currentPrice: parseFloat(String(currentBid || '0').replace(/,/g, '')) || 0,
    startingPrice: parseFloat(String(startingBid || '0').replace(/,/g, '')) || 0,
    reservePrice: parseFloat(String(reservePrice || '0').replace(/,/g, '')) || 0,
  });

  // حساب التقدم بالنظام الجديد
  const newProgress = calculateUnifiedProgress({
    auctionStatus,
    startTime: startTime || endTime,
    endTime,
    currentPrice: parseFloat(String(currentBid || '0').replace(/,/g, '')) || 0,
    startingPrice: parseFloat(String(startingBid || '0').replace(/,/g, '')) || 0,
    reservePrice: parseFloat(String(reservePrice || '0').replace(/,/g, '')) || 0,
  });

  return (
    <div className="space-y-8 p-6">
      <h2 className="text-center text-2xl font-bold">مقارنة أنظمة حساب التقدم</h2>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* العداد الجديد المحسن */}
        <div className="space-y-4">
          <h3 className="text-center text-xl font-semibold text-green-700">
            النظام الجديد المحسن ✨
          </h3>

          <div className="flex justify-center">
            <SimpleCircularAuctionTimer
              endTime={endTime}
              startTime={startTime}
              currentBid={currentBid}
              bidCount={bidCount}
              startingBid={startingBid}
              reservePrice={reservePrice}
              auctionStatus={auctionStatus}
              size="medium"
            />
          </div>

          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <h4 className="mb-2 font-semibold text-green-800">إحصائيات النظام الجديد:</h4>
            <div className="space-y-1 text-sm text-green-700">
              <div>نسبة التقدم المعروضة: {newProgress.displayProgress.toFixed(1)}%</div>
              <div>
                نوع التقدم:{' '}
                {newProgress.progressType === 'time-based'
                  ? 'معتمد على الوقت'
                  : newProgress.progressType === 'price-based'
                    ? 'معتمد على السعر'
                    : 'مكتمل'}
              </div>
              <div>حالة عاجلة: {newProgress.isUrgent ? 'نعم ⚠️' : 'لا ✅'}</div>
              <div>
                الوقت المتبقي: {newProgress.timeLeft.hours}:
                {newProgress.timeLeft.minutes.toString().padStart(2, '0')}:
                {newProgress.timeLeft.seconds.toString().padStart(2, '0')}
              </div>
            </div>
          </div>
        </div>

        {/* مقارنة الإحصائيات */}
        <div className="space-y-4">
          <h3 className="text-center text-xl font-semibold text-blue-700">مقارنة الأنظمة 📊</h3>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="mb-2 font-semibold text-blue-800">النظام القديم:</h4>
            <div className="space-y-1 text-sm text-blue-700">
              <div>نسبة التقدم: {oldProgress.progress.toFixed(1)}%</div>
              <div>
                الوقت المتبقي: {oldProgress.timeLeft.hours}:
                {oldProgress.timeLeft.minutes.toString().padStart(2, '0')}:
                {oldProgress.timeLeft.seconds.toString().padStart(2, '0')}
              </div>
              <div>حالة النشاط: {oldProgress.isActive ? 'نشط' : 'غير نشط'}</div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h4 className="mb-2 font-semibold text-gray-800">الفروقات:</h4>
            <div className="space-y-1 text-sm text-gray-700">
              <div>
                فرق نسبة التقدم: {(newProgress.displayProgress - oldProgress.progress).toFixed(1)}%
              </div>
              <div>نظام أكثر تفصيلاً: {newProgress.progressType}</div>
              <div>كشف الحالات العاجلة: {newProgress.isUrgent ? '✨ جديد' : 'عادي'}</div>
            </div>
          </div>

          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <h4 className="mb-2 font-semibold text-yellow-800">المزايا الجديدة:</h4>
            <ul className="space-y-1 text-sm text-yellow-700">
              <li>• حسابات أكثر دقة ووضوحاً</li>
              <li>• تمييز بين أنواع التقدم المختلفة</li>
              <li>• كشف تلقائي للحالات العاجلة</li>
              <li>• أداء محسن (لا حسابات معقدة)</li>
              <li>• توحيد النتائج عبر جميع المكونات</li>
            </ul>
          </div>
        </div>
      </div>

      {/* أمثلة للحالات المختلفة */}
      <div className="border-t pt-6">
        <h3 className="mb-4 text-center text-lg font-semibold">أمثلة للحالات المختلفة</h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* مزاد قادم */}
          <div className="text-center">
            <h4 className="mb-2 font-medium">مزاد قادم</h4>
            <SimpleCircularAuctionTimer
              endTime={new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()}
              startTime={new Date(Date.now() + 30 * 60 * 1000).toISOString()}
              currentBid="1000"
              bidCount={0}
              startingBid="1000"
              auctionStatus="upcoming"
              size="compact"
            />
          </div>

          {/* مزاد مباشر */}
          <div className="text-center">
            <h4 className="mb-2 font-medium">مزاد مباشر</h4>
            <SimpleCircularAuctionTimer
              endTime={new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()}
              currentBid="3500"
              bidCount={12}
              startingBid="1000"
              reservePrice="5000"
              auctionStatus="live"
              size="compact"
            />
          </div>

          {/* مزاد منتهي */}
          <div className="text-center">
            <h4 className="mb-2 font-medium">مزاد منتهي</h4>
            <SimpleCircularAuctionTimer
              endTime={new Date(Date.now() - 1000).toISOString()}
              currentBid="4800"
              bidCount={25}
              startingBid="1000"
              reservePrice="4500"
              auctionStatus="ended"
              size="compact"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimerComparison;
