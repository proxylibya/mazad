/**
 * أدوات معالجة الأرقام
 * Number Utilities
 */

/**
 * تنسيق العملة
 */
export function formatCurrency(
    amount: number,
    currency: string = 'LYD',
    locale: string = 'ar-LY'
): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency}`;
    }
}

export function initWebsiteNumberConverter(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return;
    }

    const w = window as any;
    if (w.__westernNumeralsConverterInitialized) {
        return;
    }
    w.__westernNumeralsConverterInitialized = true;

    document.addEventListener(
        'input',
        (e) => {
            const target = e.target as HTMLInputElement | HTMLTextAreaElement | null;
            if (!target) return;

            const isInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
            if (!isInput) return;

            const inputType = (target as HTMLInputElement).type;
            if (
                target instanceof HTMLInputElement &&
                inputType &&
                !['text', 'tel', 'search', 'number', 'email', 'url', 'password'].includes(inputType)
            ) {
                return;
            }

            const value = target.value;
            if (!value) return;

            const converted = toEnglishNumbers(value);
            if (converted !== value) {
                const start = (target as any).selectionStart;
                const end = (target as any).selectionEnd;
                target.value = converted;
                try {
                    if (typeof start === 'number' && typeof end === 'number') {
                        (target as any).setSelectionRange(start, end);
                    }
                } catch {
                }
            }
        },
        { passive: true },
    );
}

/**
 * تنسيق الأرقام
 */
export function formatNumber(num: number | string, locale: string = 'ar-LY'): string {
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '0';
    try {
        return new Intl.NumberFormat(locale).format(numValue);
    } catch {
        return numValue.toString();
    }
}

/**
 * تحويل نص إلى رقم
 */
export function parseNumber(value: string): number {
    const cleaned = value.replace(/[^\d.-]/g, '');
    return parseFloat(cleaned) || 0;
}

/**
 * تنسيق النسبة المئوية
 */
export function formatPercentage(value: number, decimals: number = 1): string {
    return `${value.toFixed(decimals)}%`;
}

/**
 * اختصار الأرقام الكبيرة
 */
export function abbreviateNumber(num: number): string {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

/**
 * تقريب الرقم لأقرب منزلة
 */
export function roundTo(num: number, decimals: number = 2): number {
    const factor = Math.pow(10, decimals);
    return Math.round(num * factor) / factor;
}

/**
 * تحويل الأرقام العربية إلى إنجليزية
 */
export function toEnglishNumbers(str: string): string {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str.replace(/[٠-٩]/g, (match) => {
        return arabicNumbers.indexOf(match).toString();
    });
}

/**
 * تحويل الأرقام العربية/الفارسية إلى أرقام غربية
 * alias لـ toEnglishNumbers للتوافق
 */
export function convertToWesternNumerals(str: string): string {
    return toEnglishNumbers(str);
}

/**
 * تحويل الأرقام الإنجليزية إلى عربية
 */
export function toArabicNumbers(str: string): string {
    const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return str.replace(/[0-9]/g, (match) => {
        return arabicNumbers[parseInt(match)];
    });
}

/**
 * تنسيق العملة بدون فواصل عشرية
 */
export function formatCurrencyWholeNumbers(
    amount: number,
    currency: string = 'LYD',
    locale: string = 'ar-LY'
): string {
    try {
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Math.round(amount));
    } catch {
        return `${Math.round(amount)} ${currency}`;
    }
}

export default {
    formatCurrency,
    formatNumber,
    parseNumber,
    formatPercentage,
    abbreviateNumber,
    roundTo,
    toEnglishNumbers,
    toArabicNumbers,
    convertToWesternNumerals,
    formatCurrencyWholeNumbers,
    initWebsiteNumberConverter,
};
