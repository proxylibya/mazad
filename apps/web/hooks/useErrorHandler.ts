/**
 * Hook مخصص لمعالجة الأخطاء
 * Custom Error Handling Hook
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ClientError,
  ClientErrorType,
  ErrorSeverity,
  clientErrorHandler,
} from '../lib/error-handling/client-error-handler';

interface UseErrorHandlerOptions {
  showNotifications?: boolean;
  logErrors?: boolean;
  reportToServer?: boolean;
  onError?: (error: ClientError) => void;
}

interface AdvancedUseErrorHandlerReturn {
  // حالة الأخطاء
  errors: ClientError[];
  hasErrors: boolean;
  lastError: ClientError | null;

  // دوال معالجة الأخطاء
  handleError: (error: any, context?: string, metadata?: Record<string, any>) => void;
  handleApiError: (response: Response, requestUrl: string, requestData?: any) => void;
  clearErrors: () => void;
  clearError: (errorId: string) => void;

  // دوال إنشاء أخطاء مخصصة
  createValidationError: (message: string, field?: string) => void;
  createNetworkError: (message?: string) => void;
  createAuthError: (message?: string) => void;

  // إحصائيات
  errorStats: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

export const useAdvancedErrorHandler = (
  options: UseErrorHandlerOptions = {},
): AdvancedUseErrorHandlerReturn => {
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [lastError, setLastError] = useState<ClientError | null>(null);

  // إعداد معالج الأخطاء
  useEffect(() => {
    // إضافة مستمع للأخطاء الجديدة
    const handleNewError = (error: ClientError) => {
      setErrors((prev) => [error, ...prev.slice(0, 49)]); // الاحتفاظ بآخر 50 خطأ
      setLastError(error);

      // استدعاء callback مخصص
      if (options.onError) {
        options.onError(error);
      }
    };

    clientErrorHandler.addNotificationCallback(handleNewError);

    return () => {
      clientErrorHandler.removeNotificationCallback(handleNewError);
    };
  }, [options.showNotifications, options.logErrors, options.reportToServer, options.onError]);

  // معالجة خطأ عام
  const handleError = useCallback(
    (error: any, context: string = 'useErrorHandler', metadata?: Record<string, any>) => {
      let clientError: ClientError;

      if (error instanceof Error) {
        clientError = {
          id: generateErrorId(),
          type: ClientErrorType.UNKNOWN,
          severity: ErrorSeverity.MEDIUM,
          message: error.message,
          userMessage: 'حدث خطأ غير متوقع',
          timestamp: new Date(),
          context: {
            context,
            stack: error.stack,
            ...metadata,
          },
          suggestions: ['أعد المحاولة', 'إعادة تحميل الصفحة', 'تحقق من اتصال الإنترنت'],
          retryable: true,
        };
      } else if (typeof error === 'string') {
        clientError = {
          id: generateErrorId(),
          type: ClientErrorType.UNKNOWN,
          severity: ErrorSeverity.LOW,
          message: error,
          userMessage: error,
          timestamp: new Date(),
          context: { context, ...metadata },
          suggestions: ['أعد المحاولة'],
          retryable: true,
        };
      } else {
        clientError = {
          id: generateErrorId(),
          type: ClientErrorType.UNKNOWN,
          severity: ErrorSeverity.MEDIUM,
          message: 'Unknown error occurred',
          userMessage: 'حدث خطأ غير معروف',
          timestamp: new Date(),
          context: { context, error, ...metadata },
          suggestions: ['أعد المحاولة', 'إعادة تحميل الصفحة'],
          retryable: true,
        };
      }

      // معالجة الخطأ عبر النظام
      setErrors((prev) => [clientError, ...prev.slice(0, 49)]);
      setLastError(clientError);

      if (options.onError) {
        options.onError(clientError);
      }
    },
    [options.onError],
  );

  // معالجة أخطاء API
  const handleApiError = useCallback(
    (response: Response, requestUrl: string, requestData?: any) => {
      const statusCode = response.status;
      let type = ClientErrorType.UNKNOWN;

      if (statusCode === 400) type = ClientErrorType.VALIDATION;
      else if (statusCode === 401) type = ClientErrorType.AUTHENTICATION;
      else if (statusCode === 403) type = ClientErrorType.AUTHORIZATION;
      else if (statusCode === 404) type = ClientErrorType.NOT_FOUND;
      else if (statusCode >= 500) type = ClientErrorType.SERVER;
      else if (statusCode >= 400) type = ClientErrorType.CLIENT;

      clientErrorHandler.createError(type, response.statusText || `HTTP ${statusCode}`, {
        statusCode,
        context: { requestUrl, requestData },
      });
    },
    [options.onError],
  );

  // مسح جميع الأخطاء
  const clearErrors = useCallback(() => {
    setErrors([]);
    setLastError(null);
  }, []);

  // مسح خطأ محدد
  const clearError = useCallback((errorId: string) => {
    setErrors((prev) => prev.filter((error) => error.id !== errorId));
    setLastError((prev) => (prev?.id === errorId ? null : prev));
  }, []);

  // إنشاء خطأ تحقق
  const createValidationError = useCallback(
    (message: string, field?: string) => {
      const clientError: ClientError = {
        id: generateErrorId(),
        type: ClientErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: `Validation error: ${message}`,
        userMessage: field ? `خطأ في ${field}: ${message}` : `خطأ في التحقق: ${message}`,
        timestamp: new Date(),
        context: { field },
        suggestions: ['تحقق من البيانات المدخلة', 'راجع الحقول المطلوبة', 'تأكد من تنسيق البيانات'],
        retryable: false,
      };

      setErrors((prev) => [clientError, ...prev.slice(0, 49)]);
      setLastError(clientError);

      if (options.onError) {
        options.onError(clientError);
      }
    },
    [options.onError],
  );

  // إنشاء خطأ شبكة
  const createNetworkError = useCallback(
    (message: string = 'فشل في الاتصال بالشبكة') => {
      const clientError: ClientError = {
        id: generateErrorId(),
        type: ClientErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: `Network error: ${message}`,
        userMessage: message,
        timestamp: new Date(),
        suggestions: ['تحقق من اتصال الإنترنت', 'أعد المحاولة بعد قليل', 'تحقق من حالة الخدمة'],
        retryable: true,
      };

      setErrors((prev) => [clientError, ...prev.slice(0, 49)]);
      setLastError(clientError);

      if (options.onError) {
        options.onError(clientError);
      }
    },
    [options.onError],
  );

  // إنشاء خطأ مصادقة
  const createAuthError = useCallback(
    (message: string = 'فشل في المصادقة') => {
      const clientError: ClientError = {
        id: generateErrorId(),
        type: ClientErrorType.AUTHENTICATION,
        severity: ErrorSeverity.MEDIUM,
        message: `Authentication error: ${message}`,
        userMessage: message,
        timestamp: new Date(),
        suggestions: ['تسجيل الدخول مرة أخرى', 'تحديث الصفحة', 'مسح ذاكرة التخزين المؤقت'],
        retryable: false,
      };

      setErrors((prev) => [clientError, ...prev.slice(0, 49)]);
      setLastError(clientError);

      if (options.onError) {
        options.onError(clientError);
      }
    },
    [options.onError],
  );

  // حساب الإحصائيات
  const errorStats = {
    total: errors.length,
    byType: errors.reduce(
      (acc, error) => {
        acc[error.type] = (acc[error.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
    bySeverity: errors.reduce(
      (acc, error) => {
        acc[error.severity] = (acc[error.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    ),
  };

  return {
    // حالة الأخطاء
    errors,
    hasErrors: errors.length > 0,
    lastError,

    // دوال معالجة الأخطاء
    handleError,
    handleApiError,
    clearErrors,
    clearError,

    // دوال إنشاء أخطاء مخصصة
    createValidationError,
    createNetworkError,
    createAuthError,

    // إحصائيات
    errorStats,
  };
};

// دالة مساعدة لتوليد معرف خطأ
function generateErrorId(): string {
  return `hook_err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook محسن للتعامل مع الأخطاء في React
 */

export interface ErrorInfo {
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
}

export interface UseErrorHandlerReturn {
  error: ErrorInfo | null;
  setError: (error: Error | string | null) => void;
  clearError: () => void;
  handleError: (error: any) => void;
  isError: boolean;
  retryAction?: () => void;
}

export function useSimpleErrorHandler(retryAction?: () => void): UseErrorHandlerReturn {
  const [error, setErrorState] = useState<ErrorInfo | null>(null);

  const setError = useCallback((error: Error | string | null) => {
    if (!error) {
      setErrorState(null);
      return;
    }

    const errorInfo: ErrorInfo = {
      message: typeof error === 'string' ? error : error.message || 'خطأ غير معروف',
      code:
        typeof error === 'object' && error && 'code' in error
          ? String((error as any).code)
          : undefined,
      details: typeof error === 'object' ? error : undefined,
      timestamp: new Date(),
    };

    setErrorState(errorInfo);

    // تسجيل الخطأ
    console.error('Error handled by useErrorHandler:', errorInfo);
  }, []);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const handleError = useCallback((error: any) => {
    let errorMessage = 'حدث خطأ غير متوقع';
    let errorCode = 'UNKNOWN_ERROR';

    if (typeof error === 'string') {
      errorMessage = error;
    } else if (error instanceof Error) {
      errorMessage = error.message;
      errorCode = error.name;
    } else if (error && typeof error === 'object') {
      // معالجة أخطاء API
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        switch (status) {
          case 400:
            errorMessage = data?.message || 'طلب غير صحيح';
            errorCode = 'BAD_REQUEST';
            break;
          case 401:
            errorMessage = 'غير مصرح لك بالوصول';
            errorCode = 'UNAUTHORIZED';
            break;
          case 403:
            errorMessage = 'ممنوع الوصول';
            errorCode = 'FORBIDDEN';
            break;
          case 404:
            errorMessage = 'البيانات غير موجودة';
            errorCode = 'NOT_FOUND';
            break;
          case 500:
            errorMessage = 'خطأ في الخادم';
            errorCode = 'SERVER_ERROR';
            break;
          default:
            errorMessage = data?.message || `خطأ في الخادم (${status})`;
            errorCode = `HTTP_${status}`;
        }
      } else if (error.message) {
        errorMessage = error.message;
        errorCode = error.code || error.name || 'REQUEST_ERROR';
      }
    }

    const errorInfo: ErrorInfo = {
      message: errorMessage,
      code: errorCode,
      details: error,
      timestamp: new Date(),
    };

    setErrorState(errorInfo);
  }, []);

  // تنظيف الخطأ بعد فترة معينة
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        clearError();
      }, 10000); // 10 ثوان

      return () => clearTimeout(timer);
    }
  }, [error, clearError]);

  return {
    error,
    setError,
    clearError,
    handleError,
    isError: !!error,
    retryAction,
  };
}

export function useErrorHandler(retryAction?: () => void): UseErrorHandlerReturn {
  return useSimpleErrorHandler(retryAction);
}

/**
 * Hook للتعامل مع حالات التحميل والأخطاء معاً
 */
export function useAsyncOperation<T = any>() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const { error, handleError, clearError } = useErrorHandler();

  const execute = useCallback(
    async (operation: () => Promise<T>) => {
      try {
        setLoading(true);
        clearError();
        const result = await operation();
        setData(result);
        return result;
      } catch (err) {
        handleError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [handleError, clearError],
  );

  const reset = useCallback(() => {
    setLoading(false);
    setData(null);
    clearError();
  }, [clearError]);

  return {
    loading,
    data,
    error,
    execute,
    reset,
    isError: !!error,
  };
}

/**
 * Hook للتعامل مع retry logic
 */
export function useRetry(maxRetries: number = 3) {
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const retry = useCallback(
    async (operation: () => Promise<any>) => {
      if (retryCount >= maxRetries) {
        throw new Error(`تم تجاوز الحد الأقصى للمحاولات (${maxRetries})`);
      }

      setIsRetrying(true);
      setRetryCount((prev) => prev + 1);

      try {
        const result = await operation();
        setRetryCount(0); // إعادة تعيين العداد عند النجاح
        return result;
      } catch (error) {
        if (retryCount + 1 >= maxRetries) {
          throw error;
        }
        // انتظار متزايد قبل المحاولة التالية
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
        throw error;
      } finally {
        setIsRetrying(false);
      }
    },
    [retryCount, maxRetries],
  );

  const resetRetry = useCallback(() => {
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  return {
    retry,
    retryCount,
    isRetrying,
    canRetry: retryCount < maxRetries,
    resetRetry,
  };
}
