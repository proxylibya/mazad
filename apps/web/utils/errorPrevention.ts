/**
 * نظام منع الأخطاء وإدارتها
 */

export interface ErrorPreventionConfig {
    maxRetries?: number;
    retryDelay?: number;
    logErrors?: boolean;
}

export const defaultConfig: ErrorPreventionConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    logErrors: true,
};

/**
 * منع الأخطاء الشائعة في الشبكة
 */
export function preventNetworkErrors(): void {
    if (typeof window === 'undefined') return;

    // منع أخطاء fetch غير المعالجة
    const originalFetch = window.fetch;
    window.fetch = async function (...args) {
        try {
            return await originalFetch.apply(this, args);
        } catch (error) {
            console.warn('[ErrorPrevention] Network error:', error);
            throw error;
        }
    };
}

/**
 * منع أخطاء WebSocket
 */
export function preventWebSocketErrors(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
        if (event.message?.includes('WebSocket')) {
            event.preventDefault();
            console.warn('[ErrorPrevention] WebSocket error suppressed');
        }
    });
}

/**
 * تهيئة نظام منع الأخطاء
 */
export function initErrorPrevention(config: ErrorPreventionConfig = defaultConfig): void {
    preventNetworkErrors();
    preventWebSocketErrors();

    if (config.logErrors) {
        console.log('[ErrorPrevention] System initialized');
    }
}

/**
 * معالج أخطاء آمن
 */
export function safeErrorHandler<T>(
    fn: () => T | Promise<T>,
    fallback: T,
    onError?: (error: unknown) => void
): T | Promise<T> {
    try {
        const result = fn();
        if (result instanceof Promise) {
            return result.catch((error) => {
                onError?.(error);
                return fallback;
            });
        }
        return result;
    } catch (error) {
        onError?.(error);
        return fallback;
    }
}

/**
 * أنواع الأخطاء
 */
export enum ErrorType {
    NETWORK = 'network',
    VALIDATION = 'validation',
    AUTH = 'auth',
    SERVER = 'server',
    UNKNOWN = 'unknown',
    TIMEOUT = 'timeout',
    EXTERNAL_SERVICE = 'external_service',
    // أنواع إضافية للتوافق مع ErrorMonitor
    NULL_REFERENCE = 'null_reference',
    UNDEFINED_PROPERTY = 'undefined_property',
    INVALID_ARRAY = 'invalid_array',
    INVALID_TYPE = 'invalid_type',
    MISSING_DATA = 'missing_data',
    API_ERROR = 'api_error',
    VALIDATION_ERROR = 'validation_error',
}

/**
 * واجهة تقرير الخطأ
 */
export interface ErrorReport {
    id: string;
    type: ErrorType;
    message: string;
    timestamp: Date;
    stack?: string;
    context?: Record<string, unknown>;
    location?: string;
}

const errorReports: ErrorReport[] = [];

/**
 * الحصول على تقارير الأخطاء
 */
export function getErrorReports(): ErrorReport[] {
    return [...errorReports];
}

/**
 * مسح تقارير الأخطاء
 */
export function clearErrorReports(): void {
    errorReports.length = 0;
}

export function logError(params: {
    type: ErrorType;
    message: string;
    timestamp: Date;
    location?: string;
    data?: unknown;
}): void {
    try {
        generateErrorReport(params.type, params.message, {
            location: params.location,
            data: params.data,
        });
    } catch {
    }

    if (defaultConfig.logErrors) {
        console.error('[ErrorPrevention]', params.type, params.message, {
            location: params.location,
            data: params.data,
        });
    }
}

export function validateApiResponse(responseData: unknown, location?: string): boolean {
    if (!responseData || typeof responseData !== 'object') {
        logError({
            type: ErrorType.API_ERROR,
            message: 'Invalid API response',
            timestamp: new Date(),
            location,
            data: responseData,
        });
        return false;
    }
    return true;
}

/**
 * إنشاء تقرير خطأ
 * @overload بدون parameters - يرجع جميع التقارير كـ JSON string
 * @overload مع parameters - ينشئ تقرير جديد
 */
export function generateErrorReport(): string;
export function generateErrorReport(
    type: ErrorType,
    message: string,
    context?: Record<string, unknown>
): ErrorReport;
export function generateErrorReport(
    type?: ErrorType,
    message?: string,
    context?: Record<string, unknown>
): ErrorReport | string {
    // إذا تم الاستدعاء بدون parameters، أرجع JSON string للتقارير
    if (type === undefined) {
        return JSON.stringify(errorReports, null, 2);
    }

    const report: ErrorReport = {
        id: Math.random().toString(36).substring(2, 9),
        type,
        message: message || '',
        timestamp: new Date(),
        context,
    };
    errorReports.push(report);
    return report;
}

export default {
    initErrorPrevention,
    preventNetworkErrors,
    preventWebSocketErrors,
    safeErrorHandler,
    getErrorReports,
    clearErrorReports,
    generateErrorReport,
    logError,
    validateApiResponse,
    ErrorType,
};
