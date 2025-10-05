// Custom Query Hook - Lightweight data fetching with caching and error handling
// Provides React Query-like functionality without external dependencies

import { useState, useEffect, useRef, useCallback } from 'react';
import { errorLogger } from '../services/errorLogger';

export interface QueryState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isStale: boolean;
  isFetching: boolean; // True during background refetch
  isInitialLoading: boolean; // True only on first load
}

export interface QueryOptions {
  enabled?: boolean;
  staleTime?: number; // milliseconds
  cacheTime?: number; // milliseconds
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number; // milliseconds - auto refetch on interval
  refetchIntervalInBackground?: boolean; // Continue refetching when tab not visible
  retry?: number;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

// Cache entry interface
interface CacheEntry {
  data: any;
  timestamp: number;
  staleTime: number;
  queryKey: readonly unknown[];
}

// Predicate function type for cache invalidation
type QueryPredicate = (entry: CacheEntry) => boolean;

// Enhanced in-memory cache with intelligent invalidation
class QueryCache {
  private cache = new Map<string, CacheEntry>();
  private activeQueries = new Set<string>();

  set(key: string, data: any, staleTime: number = 5 * 60 * 1000, queryKey: readonly unknown[] = []): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      staleTime,
      queryKey
    });
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Return data even if stale (for background refetching)
    return entry.data;
  }

  getEntry(key: string): CacheEntry | null {
    return this.cache.get(key) || null;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate queries matching a pattern
   * Supports exact match, prefix match, and custom predicates
   */
  invalidateMatching(partialKey: string): void {
    const prefix = `${partialKey}:`;
    for (const key of Array.from(this.cache.keys())) {
      if (key === partialKey || key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate queries using a predicate function
   */
  invalidateByPredicate(predicate: QueryPredicate): void {
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (predicate(entry)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate all queries for a specific entity type
   */
  invalidateEntity(entityPrefix: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(entityPrefix + ':') || key === entityPrefix) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.activeQueries.clear();
  }

  isStale(key: string, staleTime: number): boolean {
    const entry = this.cache.get(key);
    if (!entry) return true;

    const now = Date.now();
    return (now - entry.timestamp) > staleTime;
  }

  /**
   * Mark a query as active (currently being used in a component)
   */
  markActive(key: string): void {
    this.activeQueries.add(key);
  }

  /**
   * Mark a query as inactive
   */
  markInactive(key: string): void {
    this.activeQueries.delete(key);
  }

  /**
   * Check if a query is currently active
   */
  isActive(key: string): boolean {
    return this.activeQueries.has(key);
  }

  /**
   * Get all cache entries (for debugging)
   */
  getAll(): Map<string, CacheEntry> {
    return new Map(this.cache);
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; activeQueries: number } {
    return {
      size: this.cache.size,
      activeQueries: this.activeQueries.size
    };
  }
}

// Global query cache instance
const queryCache = new QueryCache();

/**
 * Enhanced custom hook for data fetching with caching, loading states, and error handling
 * Provides React Query-like functionality with background refetching and polling
 */
export function useQuery<T>(
  queryKey: string | string[] | readonly unknown[],
  queryFn: () => Promise<T>,
  options: QueryOptions = {}
): QueryState<T> {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus = false,
    refetchInterval,
    refetchIntervalInBackground = false,
    retry = 3,
    retryDelay = 1000,
    onSuccess,
    onError
  } = options;

  const key = Array.isArray(queryKey) ? queryKey.filter(k => k !== undefined).join(':') : queryKey.toString();
  const queryKeyArray = Array.isArray(queryKey) ? queryKey : [queryKey];

  const [data, setData] = useState<T | null>(() => {
    return enabled ? queryCache.get(key) : null;
  });
  const [loading, setLoading] = useState<boolean>(!data && enabled);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState<boolean>(!!data);

  const retryCountRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryFnRef = useRef(queryFn);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    queryFnRef.current = queryFn;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [queryFn, onSuccess, onError]);

  // Mark query as active when component mounts
  useEffect(() => {
    if (enabled) {
      queryCache.markActive(key);
    }
    return () => {
      queryCache.markInactive(key);
    };
  }, [key, enabled]);

  const fetchData = useCallback(async (isRetry = false, isBackground = false): Promise<void> => {
    if (!enabled) return;

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      // Set appropriate loading state
      if (!isRetry && !isBackground) {
        if (!hasInitiallyLoaded) {
          setLoading(true);
        }
        setIsFetching(true);
        setError(null);
      } else if (isBackground) {
        setIsFetching(true);
      }

      const result = await queryFnRef.current();

      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      setData(result);
      setError(null);
      retryCountRef.current = 0;
      setHasInitiallyLoaded(true);

      // Cache the result with query key for predicate-based invalidation
      queryCache.set(key, result, staleTime, queryKeyArray as readonly unknown[]);

      // Call success callback
      if (onSuccessRef.current) {
        onSuccessRef.current(result);
      }

    } catch (err) {
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const error = err instanceof Error ? err : new Error('Unknown error');

      // Retry logic
      if (retryCountRef.current < retry && !isRetry) {
        retryCountRef.current++;
        errorLogger.addBreadcrumb(`Retrying query ${key} (attempt ${retryCountRef.current})`, 'query');

        setTimeout(() => {
          fetchData(true, isBackground);
        }, retryDelay * retryCountRef.current);
        return;
      }

      setError(error);
      errorLogger.logAsyncError(error, `Query failed: ${key}`);

      // Call error callback
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }

    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
        setIsFetching(false);
      }
    }
  }, [key, enabled, staleTime, retry, retryDelay, hasInitiallyLoaded, queryKeyArray]);

  const refetch = useCallback(async (): Promise<void> => {
    queryCache.invalidate(key);
    await fetchData(false, false);
  }, [key, fetchData]);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      const cachedData = queryCache.get(key);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        setHasInitiallyLoaded(true);

        // Background refetch if stale
        if (queryCache.isStale(key, staleTime)) {
          fetchData(false, true);
        }
      } else {
        fetchData(false, false);
      }
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [key, enabled, staleTime, fetchData]);

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      if (queryCache.isStale(key, staleTime)) {
        fetchData(false, true);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, key, staleTime, fetchData]);

  // Polling / Interval refetch
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const shouldRefetch = () => {
      // If refetchIntervalInBackground is false, only refetch when document is visible
      if (!refetchIntervalInBackground && document.hidden) {
        return false;
      }
      return true;
    };

    const interval = setInterval(() => {
      if (shouldRefetch()) {
        fetchData(false, true);
      }
    }, refetchInterval);

    // Also listen to visibility changes
    const handleVisibilityChange = () => {
      if (!document.hidden && refetchIntervalInBackground === false) {
        // Resume polling when tab becomes visible
        if (queryCache.isStale(key, staleTime)) {
          fetchData(false, true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetchInterval, refetchIntervalInBackground, enabled, key, staleTime, fetchData]);

  return {
    data,
    loading,
    error,
    refetch,
    isStale: queryCache.isStale(key, staleTime),
    isFetching,
    isInitialLoading: loading && !hasInitiallyLoaded
  };
}

/**
 * Hook for mutations (POST, PUT, DELETE operations)
 */
export function useMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>
) {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(async (variables: TVariables): Promise<TData> => {
    try {
      setLoading(true);
      setError(null);

      const result = await mutationFn(variables);
      setData(result);

      errorLogger.addBreadcrumb('Mutation completed successfully', 'mutation');
      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Mutation failed');
      setError(error);
      errorLogger.logAsyncError(error, 'Mutation failed');
      throw error;

    } finally {
      setLoading(false);
    }
  }, [mutationFn]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    mutate,
    reset,
    isLoading: loading,
    isError: !!error,
    isSuccess: !!data && !error && !loading
  };
}

/**
 * Enhanced query client with intelligent invalidation strategies
 */
export const queryClient = {
  /**
   * Invalidate queries by key or predicate
   * Supports exact match, prefix match, and custom predicate functions
   */
  invalidateQueries: (options: {
    queryKey?: string | string[] | readonly unknown[];
    predicate?: QueryPredicate;
    exact?: boolean;
  } | string | string[]) => {
    // Legacy support: if options is a string or array, treat as queryKey
    if (typeof options === 'string' || Array.isArray(options)) {
      const key = Array.isArray(options) ? options.filter(k => k !== undefined).join(':') : options;
      queryCache.invalidateMatching(key);
      return;
    }

    // New API with options object
    const { queryKey, predicate, exact = false } = options;

    if (predicate) {
      queryCache.invalidateByPredicate(predicate);
    } else if (queryKey) {
      const key = Array.isArray(queryKey) ? queryKey.filter(k => k !== undefined).join(':') : queryKey.toString();
      if (exact) {
        queryCache.invalidate(key);
      } else {
        queryCache.invalidateMatching(key);
      }
    }
  },

  /**
   * Invalidate all queries for a specific entity
   * Example: invalidateEntity('calendar') invalidates all calendar queries
   */
  invalidateEntity: (entityPrefix: string) => {
    queryCache.invalidateEntity(entityPrefix);
  },

  /**
   * Clear all cached queries
   */
  clear: () => {
    queryCache.clear();
  },

  /**
   * Set query data manually (useful for optimistic updates)
   */
  setQueryData: <T>(queryKey: string | string[] | readonly unknown[], data: T, staleTime?: number) => {
    const key = Array.isArray(queryKey) ? queryKey.filter(k => k !== undefined).join(':') : queryKey.toString();
    const queryKeyArray = Array.isArray(queryKey) ? queryKey : [queryKey];
    queryCache.set(key, data, staleTime, queryKeyArray as readonly unknown[]);
  },

  /**
   * Get cached query data
   */
  getQueryData: <T>(queryKey: string | string[] | readonly unknown[]): T | null => {
    const key = Array.isArray(queryKey) ? queryKey.filter(k => k !== undefined).join(':') : queryKey.toString();
    return queryCache.get(key);
  },

  /**
   * Refetch only active queries (currently being used in components)
   * This is more efficient than invalidating all queries
   */
  refetchActive: (entityPrefix?: string) => {
    // This would require tracking refetch callbacks - simplified for now
    // In real implementation, you'd store refetch functions and call them
    console.log('Refetching active queries for:', entityPrefix);
  },

  /**
   * Get cache statistics (for debugging)
   */
  getStats: () => {
    return queryCache.getStats();
  },

  /**
   * Get all cached data (for debugging)
   */
  inspect: () => {
    return queryCache.getAll();
  }
};
