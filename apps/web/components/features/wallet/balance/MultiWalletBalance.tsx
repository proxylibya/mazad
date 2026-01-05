import ArrowUpIcon from '@heroicons/react/24/outline/ArrowUpIcon';
import BuildingLibraryIcon from '@heroicons/react/24/outline/BuildingLibraryIcon';
import CreditCardIcon from '@heroicons/react/24/outline/CreditCardIcon';
import CurrencyDollarIcon from '@heroicons/react/24/outline/CurrencyDollarIcon';
import DevicePhoneMobileIcon from '@heroicons/react/24/outline/DevicePhoneMobileIcon';
import EyeIcon from '@heroicons/react/24/outline/EyeIcon';
import EyeSlashIcon from '@heroicons/react/24/outline/EyeSlashIcon';
import GlobeAltIcon from '@heroicons/react/24/outline/GlobeAltIcon';
import PlusIcon from '@heroicons/react/24/outline/PlusIcon';
import SparklesIcon from '@heroicons/react/24/outline/SparklesIcon';
import WalletIcon from '@heroicons/react/24/outline/WalletIcon';
import Link from 'next/link';
import React, { useState } from 'react';
import { formatNumber } from '../utils/numberUtils';

interface WalletBalanceData {
  local: {
    balance: number;
    currency: string;
    isActive: boolean;
  };
  global: {
    balance: number;
    currency: string;
    isActive: boolean;
  };
  crypto: {
    balance: number;
    currency: string;
    isActive: boolean;
  };
}

interface MultiWalletBalanceProps {
  walletData: WalletBalanceData;
  isLoading?: boolean;
}

const MultiWalletBalance: React.FC<MultiWalletBalanceProps> = ({
  walletData,
  isLoading = false,
}) => {
  const [showBalances, setShowBalances] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  // تنسيق الرصيد بنظام 00.00
  const formatBalanceDecimal = (amount: number): string => {
    return formatNumber(Number(Number(amount).toFixed(2)));
  };

  // تنسيق الرصيد مع إخفاء/إظهار
  const formatDisplayBalance = (amount: number, currency: string): string => {
    if (!showBalances) return '••••••';
    return `${formatBalanceDecimal(amount)} ${currency}`;
  };

  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="group relative overflow-hidden">
              <div className="relative rounded-2xl bg-gradient-to-br from-gray-200 to-gray-300 p-6 shadow-xl">
                <div className="shimmer absolute inset-0 rounded-2xl"></div>
                <div className="relative space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-gray-300"></div>
                    <div className="space-y-2">
                      <div className="h-5 w-28 rounded bg-gray-300"></div>
                      <div className="h-3 w-20 rounded bg-gray-300"></div>
                    </div>
                  </div>
                  <div className="space-y-2 text-center">
                    <div className="mx-auto h-8 w-32 rounded bg-gray-300"></div>
                    <div className="mx-auto h-4 w-20 rounded bg-gray-300"></div>
                  </div>
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded-full bg-gray-300"></div>
                    <div className="flex justify-between">
                      <div className="h-2 w-6 rounded bg-gray-300"></div>
                      <div className="h-2 w-6 rounded bg-gray-300"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-10 w-full rounded-lg bg-gray-300"></div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-8 rounded-lg bg-gray-300"></div>
                      <div className="h-8 rounded-lg bg-gray-300"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      {/* شريط التحكم */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-gray-900">محافظك الإلكترونية</h2>
          <div className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
            <SparklesIcon className="h-3 w-3" />3 محافظ نشطة
          </div>
        </div>
        <button
          onClick={() => setShowBalances(!showBalances)}
          className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:scale-105 hover:bg-gray-200"
        >
          {showBalances ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
          {showBalances ? 'إخفاء الأرصدة' : 'إظهار الأرصدة'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {/* المحفظة المحلية - الدينار الليبي */}
        <div
          className="group relative overflow-hidden"
          onMouseEnter={() => setHoveredCard('local')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="relative flex h-[420px] flex-col rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 shadow-lg">
            {/* شارة الحالة */}
            <div className="absolute left-6 top-6 flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-400"></div>
              <span className="text-xs text-white/90">نشط</span>
            </div>

            {/* الأيقونة والعنوان */}
            <div className="mb-6 flex items-center gap-4 pt-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <WalletIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">المحفظة المحلية</h3>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <span>ليبيا</span>
                  <span>الدينار الليبي</span>
                </div>
              </div>
            </div>

            {/* الرصيد */}
            <div className="mb-6 flex flex-1 flex-col justify-center text-center">
              <div className="mb-2 text-3xl font-bold text-white">
                {formatDisplayBalance(walletData.local.balance, 'د.ل')}
              </div>
              <div className="text-sm text-white/80">الرصيد المتاح</div>
            </div>

            {/* وسائل الدفع */}
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-white/90">الوسائل المتوفرة:</h4>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white">
                  <BuildingLibraryIcon className="h-3 w-3" />
                  تحويل بنكي
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white">
                  <DevicePhoneMobileIcon className="h-3 w-3" />
                  ليبيانا
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white">
                  <DevicePhoneMobileIcon className="h-3 w-3" />
                  المدار
                </div>
              </div>
            </div>

            {/* أزرار العمليات */}
            <div className="mt-auto space-y-3">
              <Link
                href="/wallet/deposit/bank"
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-md transition-colors hover:bg-blue-50"
                onClick={(e) => {}}
              >
                <PlusIcon className="h-5 w-5" />
                إيداع بنكي
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/wallet/topup/libyana"
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-600"
                  onClick={(e) => {}}
                >
                  <ArrowUpIcon className="h-4 w-4" />
                  ليبيانا
                </Link>
                <Link
                  href="/wallet/topup/madar"
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-600"
                  onClick={(e) => {}}
                >
                  <ArrowUpIcon className="h-4 w-4" />
                  المدار
                </Link>
              </div>
            </div>

            {/* إحصائيات */}
            <div className="mt-4 border-t border-white/20 pt-3">
              <div className="flex justify-between text-xs text-white/70">
                <span>آخر إيداع: اليوم</span>
                <span>العمليات: 12</span>
              </div>
            </div>
          </div>
        </div>

        {/* المحفظة العالمية - الدولار الأمريكي */}
        <div
          className="group relative overflow-hidden"
          onMouseEnter={() => setHoveredCard('global')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="relative flex h-[420px] flex-col rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 shadow-lg">
            {/* شارة الحالة */}
            <div className="absolute left-6 top-6 flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-400"></div>
              <span className="text-xs text-white/90">نشط</span>
            </div>

            {/* الأيقونة والعنوان */}
            <div className="mb-6 flex items-center gap-4 pt-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <CurrencyDollarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">المحفظة العالمية</h3>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <GlobeAltIcon className="h-4 w-4" />
                  <span>الدولار الأمريكي</span>
                </div>
              </div>
            </div>

            {/* الرصيد */}
            <div className="mb-6 flex flex-1 flex-col justify-center text-center">
              <div className="mb-2 text-3xl font-bold text-white">
                {formatDisplayBalance(walletData.global.balance, '$')}
              </div>
              <div className="text-sm text-white/80">الرصيد المتاح</div>
            </div>

            {/* وسائل الدفع */}
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-white/90">الوسائل المتوفرة:</h4>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white">
                  <GlobeAltIcon className="h-3 w-3" />
                  PayPal
                </div>
                <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white">
                  <CreditCardIcon className="h-3 w-3" />
                  بطاقة ائتمان
                </div>
              </div>
            </div>

            {/* أزرار العمليات */}
            <div className="mt-auto space-y-3">
              <Link
                href="/wallet/deposit/international"
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-md transition-colors hover:bg-blue-50"
                onClick={(e) => {}}
              >
                <PlusIcon className="h-5 w-5" />
                إيداع PayPal
              </Link>

              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/wallet/deposit/card"
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-600"
                  onClick={(e) => {}}
                >
                  <CreditCardIcon className="h-4 w-4" />
                  بطاقة ائتمان
                </Link>
                <Link
                  href="/wallet/deposit/other-international"
                  className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-3 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-600"
                  onClick={(e) => {}}
                >
                  <GlobeAltIcon className="h-4 w-4" />
                  وسائل أخرى
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* محفظة العملة الرقمية - USDT-TRC20 */}
        <div
          className="group relative overflow-hidden"
          onMouseEnter={() => setHoveredCard('crypto')}
          onMouseLeave={() => setHoveredCard(null)}
        >
          <div className="relative flex h-[420px] flex-col rounded-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 shadow-lg">
            {/* شارة الحالة */}
            <div className="absolute left-6 top-6 flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-blue-400"></div>
              <span className="text-xs text-white/90">نشط</span>
            </div>

            {/* الأيقونة والعنوان */}
            <div className="mb-6 flex items-center gap-4 pt-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20">
                <GlobeAltIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">المحفظة الرقمية</h3>
                <div className="flex items-center gap-2 text-sm text-white/80">
                  <span>₮</span>
                  <span>USDT-TRC20</span>
                </div>
              </div>
            </div>

            {/* الرصيد */}
            <div className="mb-6 flex flex-1 flex-col justify-center text-center">
              <div className="mb-2 text-3xl font-bold text-white">
                {formatDisplayBalance(walletData.crypto.balance, '₮')}
              </div>
              <div className="text-sm text-white/80">الرصيد المتاح</div>
            </div>

            {/* وسائل الدفع */}
            <div className="mb-6">
              <h4 className="mb-3 text-sm font-semibold text-white/90">الوسيلة المتوفرة:</h4>
              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs text-white">
                  <GlobeAltIcon className="h-3 w-3" />
                  USDT TRC20
                </div>
              </div>
            </div>

            {/* أزرار العمليات */}
            <div className="mt-auto space-y-3">
              <Link
                href="/wallet/deposit/usdt-trc20"
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-blue-700 shadow-md transition-colors hover:bg-blue-50"
                onClick={(e) => {}}
              >
                <PlusIcon className="h-5 w-5" />
                إيداع USDT
              </Link>

              <Link
                href="/wallet/crypto/address"
                className="flex items-center justify-center gap-2 rounded-xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-blue-600"
                onClick={(e) => {}}
              >
                <ArrowUpIcon className="h-5 w-5" />
                عنوان المحفظة
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MultiWalletBalance;
