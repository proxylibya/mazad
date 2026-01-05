import { DependencyList, useEffect, useRef } from 'react';
import logger from '../lib/utils/logger';

/**
 * Hook مخصص لإدارة العمليات الغير متزامنة بشكل آمن
 * يتعامل مع Abort Controllers و Component Unmounting تلقائياً
 */

interface UseAsyncEffectOptions {
  // اسم المكون أو العملية للتتبع
  name?: string;
  // تأخير قبل بدء العملية (milliseconds)
  delay?: number;
}

export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void> | void,
  deps: DependencyList,
  options: UseAsyncEffectOptions = {},
): void {
  const { name = 'AsyncEffect', delay = 0 } = options;
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // إلغاء أي طلب سابق
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // إلغاء أي timeout سابق
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // إنشاء controller جديد
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const executeEffect = async () => {
      // تحقق من أن المكون ما زال mounted
      if (!mountedRef.current || signal.aborted) {
        return;
      }

      try {
        logger.debug(`${name}: بدء العملية`);
        await effect(signal);

        if (!signal.aborted) {
          logger.debug(`${name}: اكتمال العملية بنجاح`);
        }
      } catch (error) {
        // تجاهل أخطاء الإلغاء
        if (error instanceof Error && error.name === 'AbortError') {
          logger.debug(`${name}: تم إلغاء العملية`);
          return;
        }

        // في حالة الإلغاء من خلال signal
        if (signal.aborted) {
          return;
        }

        logger.error(`${name}: خطأ في العملية`, { error });
      }
    };

    // تنفيذ مع أو بدون تأخير
    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        executeEffect();
      }, delay);
    } else {
      executeEffect();
    }

    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  // تتبع حالة mounting
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
}

/**
 * Hook للـ fetch مع إدارة تلقائية للأخطاء
 */
export function useAsyncFetch<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList,
  options: UseAsyncEffectOptions & {
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
  } = {},
): void {
  const { onSuccess, onError, ...asyncOptions } = options;

  useAsyncEffect(
    async (signal) => {
      try {
        const data = await fetcher(signal);
        if (!signal.aborted && onSuccess) {
          onSuccess(data);
        }
      } catch (error) {
        if (!signal.aborted && onError) {
          onError(error as Error);
        }
        throw error;
      }
    },
    deps,
    asyncOptions,
  );
}
