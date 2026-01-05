import { useCallback, useEffect, useRef, useState } from 'react';

interface UseDataFetchOptions {
  // Cache options
  cacheKey?: string;
  cacheTTL?: number; // Time to live in milliseconds
  enableCache?: boolean;

  // Request options
  retryCount?: number;
  retryDelay?: number;
  timeout?: number;

  // Optimization options
  enableDeduplication?: boolean;
  enableBackgroundRefresh?: boolean;
  refreshInterval?: number;

  // Dependencies
  dependencies?: any[];

  // Conditional fetching
  enabled?: boolean;
}

interface UseDataFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  isStale: boolean;
  isFetching: boolean;
}

// Global request deduplication map
const pendingRequests = new Map<string, Promise<any>>();

// Background refresh timers
const refreshTimers = new Map<string, NodeJS.Timeout>();

const cacheStore = new Map<string, { data: unknown; expiresAt: number; }>();

function getCachedData<T>(key: string): T | null {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCachedData(key: string, data: unknown, ttlMs: number): void {
  cacheStore.set(key, { data, expiresAt: Date.now() + ttlMs });
}

function clearCache(key: string): void {
  cacheStore.delete(key);
}

export function useDataFetch<T = any>(
  fetcher: () => Promise<T>,
  options: UseDataFetchOptions = {},
): UseDataFetchResult<T> {
  const {
    cacheKey,
    cacheTTL = 300000, // 5 minutes default
    enableCache = true,
    retryCount = 2,
    retryDelay = 1000,
    timeout = 30000,
    enableDeduplication = true,
    enableBackgroundRefresh = false,
    refreshInterval = 60000, // 1 minute
    dependencies = [],
    enabled = true,
  } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const lastFetchTimeRef = useRef<number>(0);

  // Generate a unique request key for deduplication
  const requestKey = cacheKey || `fetch_${fetcher.toString()}_${JSON.stringify(dependencies)}`;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear background refresh timer
      const timer = refreshTimers.get(requestKey);
      if (timer) {
        clearInterval(timer);
        refreshTimers.delete(requestKey);
      }
    };
  }, [requestKey]);

  // Memory-optimized fetch function with retry logic
  const performFetch = useCallback(
    async (isBackground = false): Promise<T | null> => {
      if (!enabled) return null;

      // Check for existing request (deduplication)
      if (enableDeduplication && pendingRequests.has(requestKey)) {
        try {
          return await pendingRequests.get(requestKey);
        } catch (error) {
          // Handle error from deduplicated request
          throw error;
        }
      }

      // Create abort controller for this request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const fetchWithRetry = async (attempt = 0): Promise<T> => {
        try {
          if (!mountedRef.current) throw new Error('Component unmounted');

          // Set timeout
          const timeoutId = setTimeout(() => {
            abortControllerRef.current?.abort();
          }, timeout);

          const result = await fetcher();
          clearTimeout(timeoutId);

          return result;
        } catch (error: any) {
          if (error.name === 'AbortError' || !mountedRef.current) {
            throw error;
          }

          if (attempt < retryCount) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
            return fetchWithRetry(attempt + 1);
          }

          throw error;
        }
      };

      // Create and store the promise for deduplication
      const fetchPromise = fetchWithRetry();
      if (enableDeduplication) {
        pendingRequests.set(requestKey, fetchPromise);
      }

      try {
        const result = await fetchPromise;

        if (!mountedRef.current) return null;

        // Cache the result
        if (enableCache && cacheKey) {
          setCachedData(cacheKey, result, cacheTTL);
        }

        lastFetchTimeRef.current = Date.now();
        return result;
      } finally {
        // Clean up pending request
        if (enableDeduplication) {
          pendingRequests.delete(requestKey);
        }
      }
    },
    [
      enabled,
      enableDeduplication,
      requestKey,
      retryCount,
      retryDelay,
      timeout,
      fetcher,
      enableCache,
      cacheKey,
      cacheTTL,
    ],
  );

  // Main fetch function
  const fetchData = useCallback(
    async (isBackground = false) => {
      if (!enabled) return;

      try {
        if (!isBackground) {
          setLoading(true);
          setError(null);
        } else {
          setIsFetching(true);
        }

        // Check cache first
        if (enableCache && cacheKey) {
          const cachedData = getCachedData<T>(cacheKey);
          if (cachedData && !isBackground) {
            setData(cachedData);
            setIsStale(false);
            if (!isBackground) setLoading(false);
            return;
          }
        }

        const result = await performFetch(isBackground);

        if (result !== null && mountedRef.current) {
          setData(result);
          setError(null);
          setIsStale(false);
        }
      } catch (error: any) {
        if (!mountedRef.current || error.name === 'AbortError') return;

        console.error('Data fetch error:', error);

        if (!isBackground) {
          setError(error.message || 'خطأ في تحميل البيانات');
        }

        // If this was a background refresh and we have existing data, mark it as stale
        if (isBackground && data) {
          setIsStale(true);
        }
      } finally {
        if (mountedRef.current) {
          if (!isBackground) setLoading(false);
          setIsFetching(false);
        }
      }
    },
    [enabled, enableCache, cacheKey, performFetch, data],
  );

  // Refetch function
  const refetch = useCallback(async () => {
    // Clear cache before refetching
    if (enableCache && cacheKey) {
      clearCache(cacheKey);
    }
    await fetchData(false);
  }, [fetchData, enableCache, cacheKey]);

  // Initial fetch and dependency-based refetch
  useEffect(() => {
    fetchData(false);
  }, [fetchData, ...dependencies]);

  // Background refresh setup
  useEffect(() => {
    if (!enableBackgroundRefresh || !enabled || !refreshInterval) return;

    const timer = setInterval(() => {
      if (mountedRef.current && data) {
        fetchData(true);
      }
    }, refreshInterval);

    refreshTimers.set(requestKey, timer);

    return () => {
      clearInterval(timer);
      refreshTimers.delete(requestKey);
    };
  }, [enableBackgroundRefresh, enabled, refreshInterval, data, fetchData, requestKey]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale,
    isFetching,
  };
}

// Specialized hooks for common admin operations
export function useDashboardStats(options: Omit<UseDataFetchOptions, 'cacheKey'> = {}) {
  return useDataFetch(() => fetch('/api/admin/dashboard-stats').then((res) => res.json()), {
    cacheKey: 'dashboard-stats',
    cacheTTL: 300000, // 5 minutes
    enableBackgroundRefresh: true,
    refreshInterval: 60000, // 1 minute
    ...options,
  });
}

export function useUsersList(options: Omit<UseDataFetchOptions, 'cacheKey'> = {}) {
  return useDataFetch(() => fetch('/api/admin/users').then((res) => res.json()), {
    cacheKey: 'users-list',
    cacheTTL: 180000, // 3 minutes
    ...options,
  });
}

export function useAuctionsList(options: Omit<UseDataFetchOptions, 'cacheKey'> = {}) {
  return useDataFetch(() => fetch('/api/admin/auctions').then((res) => res.json()), {
    cacheKey: 'auctions-list',
    cacheTTL: 120000, // 2 minutes
    enableBackgroundRefresh: true,
    ...options,
  });
}

// Memory cleanup utility
export function clearAllDataCache() {
  pendingRequests.clear();
  refreshTimers.forEach((timer) => clearInterval(timer));
  refreshTimers.clear();
}
