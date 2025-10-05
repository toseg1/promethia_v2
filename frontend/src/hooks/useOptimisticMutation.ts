/**
 * Optimistic Mutation Hook
 *
 * Provides instant UI updates by optimistically updating the cache before
 * the server confirms the mutation. Rolls back on error.
 *
 * Best practices:
 * - Always provide rollback logic
 * - Show success/error toasts for user feedback
 * - Use for mutations that are likely to succeed (>95% success rate)
 * - Don't use for critical operations requiring server validation
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { errorLogger } from '../services/errorLogger';
import { queryClient } from './useQuery';

export interface OptimisticMutationOptions<TData, TVariables, TContext = unknown> {
  mutationFn: (variables: TVariables) => Promise<TData>;

  /**
   * Query key(s) to update optimistically
   * Can be a single key or array of keys to update multiple caches
   */
  queryKeysToUpdate?: (string | string[] | readonly unknown[])[];

  /**
   * Function to update cache optimistically
   * Return the new cache data based on current data and mutation variables
   */
  optimisticUpdater?: (oldData: any, variables: TVariables) => any;

  /**
   * Function to prepare rollback context before mutation
   * This allows you to store any data needed to rollback changes
   */
  onMutate?: (variables: TVariables) => TContext | Promise<TContext>;

  /**
   * Called when mutation succeeds
   * Use to invalidate related queries or show success message
   */
  onSuccess?: (data: TData, variables: TVariables, context?: TContext) => void | Promise<void>;

  /**
   * Called when mutation fails
   * Rollback happens automatically, use this for user feedback
   */
  onError?: (error: Error, variables: TVariables, context?: TContext) => void | Promise<void>;

  /**
   * Called after mutation completes (success or failure)
   */
  onSettled?: (data: TData | undefined, error: Error | null, variables: TVariables, context?: TContext) => void | Promise<void>;

  /**
   * Additional query keys to invalidate after successful mutation
   * Use this to refresh related data
   */
  invalidateKeys?: (string | string[] | readonly unknown[])[];

  /**
   * Entity prefixes to invalidate (e.g., 'calendar', 'training')
   * More efficient than invalidating specific keys
   */
  invalidateEntities?: string[];
}

export interface OptimisticMutationState<TData> {
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

export interface OptimisticMutationResult<TData, TVariables, TContext = unknown>
  extends OptimisticMutationState<TData> {
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

/**
 * Hook for mutations with optimistic updates
 */
export function useOptimisticMutation<TData = unknown, TVariables = unknown, TContext = unknown>(
  options: OptimisticMutationOptions<TData, TVariables, TContext>
): OptimisticMutationResult<TData, TVariables, TContext> {
  const {
    mutationFn,
    queryKeysToUpdate = [],
    optimisticUpdater,
    onMutate,
    onSuccess,
    onError,
    onSettled,
    invalidateKeys = [],
    invalidateEntities = []
  } = options;

  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Store callbacks in refs to avoid re-creating mutation function
  const mutationFnRef = useRef(mutationFn);
  const onMutateRef = useRef(onMutate);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onSettledRef = useRef(onSettled);

  useEffect(() => {
    mutationFnRef.current = mutationFn;
    onMutateRef.current = onMutate;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onSettledRef.current = onSettled;
  }, [mutationFn, onMutate, onSuccess, onError, onSettled]);

  const mutateAsync = useCallback(async (variables: TVariables): Promise<TData> => {
    setIsLoading(true);
    setError(null);

    // Store previous data for rollback
    const previousDataMap = new Map<string, any>();
    let context: TContext | undefined;

    try {
      // 1. Call onMutate to prepare context (before optimistic update)
      if (onMutateRef.current) {
        context = await onMutateRef.current(variables);
      }

      // 2. Optimistically update cache
      if (optimisticUpdater && queryKeysToUpdate.length > 0) {
        queryKeysToUpdate.forEach(queryKey => {
          const key = Array.isArray(queryKey)
            ? queryKey.filter(k => k !== undefined).join(':')
            : queryKey.toString();

          // Store previous data for rollback
          const previousData = queryClient.getQueryData(queryKey);
          previousDataMap.set(key, previousData);

          // Apply optimistic update
          if (previousData !== null) {
            const optimisticData = optimisticUpdater(previousData, variables);
            queryClient.setQueryData(queryKey, optimisticData);

            if (process.env.NODE_ENV === 'development') {
              console.log('🔄 Optimistic update applied:', key, optimisticData);
            }
          }
        });
      }

      // 3. Execute mutation
      const result = await mutationFnRef.current(variables);

      // 4. Update state with real data
      setData(result);

      // 5. Invalidate related queries to fetch fresh data
      if (invalidateKeys.length > 0) {
        invalidateKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }

      if (invalidateEntities.length > 0) {
        invalidateEntities.forEach(entity => {
          queryClient.invalidateEntity(entity);
        });
      }

      // 6. Call success callback
      if (onSuccessRef.current) {
        await onSuccessRef.current(result, variables, context);
      }

      errorLogger.addBreadcrumb('Optimistic mutation succeeded', 'mutation');

      return result;

    } catch (err) {
      const mutationError = err instanceof Error ? err : new Error('Mutation failed');
      setError(mutationError);

      // Rollback optimistic updates
      if (optimisticUpdater && queryKeysToUpdate.length > 0) {
        queryKeysToUpdate.forEach(queryKey => {
          const key = Array.isArray(queryKey)
            ? queryKey.filter(k => k !== undefined).join(':')
            : queryKey.toString();

          const previousData = previousDataMap.get(key);
          if (previousData !== undefined) {
            queryClient.setQueryData(queryKey, previousData);

            if (process.env.NODE_ENV === 'development') {
              console.log('↩️ Rolled back optimistic update:', key);
            }
          }
        });
      }

      // Call error callback
      if (onErrorRef.current) {
        await onErrorRef.current(mutationError, variables, context);
      }

      errorLogger.logAsyncError(mutationError, 'Optimistic mutation failed');

      throw mutationError;

    } finally {
      setIsLoading(false);

      // Call settled callback (always runs)
      if (onSettledRef.current) {
        await onSettledRef.current(data ?? undefined, error, variables, context);
      }
    }
  }, [optimisticUpdater, queryKeysToUpdate, invalidateKeys, invalidateEntities, data, error]);

  const mutate = useCallback((variables: TVariables) => {
    mutateAsync(variables).catch(() => {
      // Error already handled in mutateAsync
      // This catch prevents unhandled promise rejection
    });
  }, [mutateAsync]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    error,
    isLoading,
    isError: !!error,
    isSuccess: !!data && !error && !isLoading,
    mutate,
    mutateAsync,
    reset
  };
}

/**
 * Simplified hook for mutations without optimistic updates
 * Use this when you don't need instant UI feedback
 */
export function useSimpleMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void | Promise<void>;
    onError?: (error: Error) => void | Promise<void>;
    invalidateKeys?: (string | string[] | readonly unknown[])[];
    invalidateEntities?: string[];
  }
): OptimisticMutationResult<TData, TVariables, unknown> {
  return useOptimisticMutation({
    mutationFn,
    ...options
  });
}
