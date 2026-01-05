import React from 'react';
import { usePriceFormatter } from '../../../../contexts/SimpleLocalizationContext';

// مكون بسيط لعرض الرصيد (احتياطي)
const SimpleBalance: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { formatPrice } = usePriceFormatter();

  // رصيد تجريبي
  const balance = 150.75;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center gap-1 rounded border border-green-200 bg-green-50 px-2 py-1 text-sm text-green-700">
        {/* أيقونة المحفظة */}
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>

        <span className="whitespace-nowrap font-medium">الرصيد {formatPrice(balance)}</span>
      </div>
    </div>
  );
};

export default SimpleBalance;
