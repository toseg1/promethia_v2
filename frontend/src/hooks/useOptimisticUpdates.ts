import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface OptimisticUpdate<T> {
  id: string;
  optimisticData: T;
  revert: () => void;
  promise: Promise<any>;
}

/**
 * Hook for managing optimistic updates with automatic rollback on failure
 */
export function useOptimisticUpdates<T>() {
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate<T>[]>([]);
  const updateIdCounter = useRef(0);

  const addOptimisticUpdate = useCallback(
    <R>(
      optimisticData: T,
      updateFunction: () => Promise<R>,
      revertFunction: () => void,
      options?: {
        successMessage?: string;
        errorMessage?: string;
        onSuccess?: (result: R) => void;
        onError?: (error: Error) => void;
      }
    ) => {
      const updateId = (++updateIdCounter.current).toString();
      
      const promise = updateFunction()
        .then((result) => {
          // Remove from pending updates on success
          setPendingUpdates(prev => prev.filter(update => update.id !== updateId));
          
          if (options?.successMessage) {
            toast.success(options.successMessage);
          }
          
          if (options?.onSuccess) {
            options.onSuccess(result);
          }
          
          return result;
        })
        .catch((error) => {
          // Revert optimistic changes on failure
          revertFunction();
          
          // Remove from pending updates
          setPendingUpdates(prev => prev.filter(update => update.id !== updateId));
          
          const errorMessage = options?.errorMessage || 
            (error instanceof Error ? error.message : 'Operation failed');
          toast.error(errorMessage);
          
          if (options?.onError) {
            options.onError(error instanceof Error ? error : new Error(String(error)));
          }
          
          throw error;
        });

      const update: OptimisticUpdate<T> = {
        id: updateId,
        optimisticData,
        revert: revertFunction,
        promise
      };

      setPendingUpdates(prev => [...prev, update]);
      
      return promise;
    },
    []
  );

  const isPending = useCallback((data?: T) => {
    if (!data) {
      return pendingUpdates.length > 0;
    }
    return pendingUpdates.some(update => 
      JSON.stringify(update.optimisticData) === JSON.stringify(data)
    );
  }, [pendingUpdates]);

  const cancelPendingUpdates = useCallback(() => {
    pendingUpdates.forEach(update => update.revert());
    setPendingUpdates([]);
  }, [pendingUpdates]);

  return {
    addOptimisticUpdate,
    isPending,
    pendingUpdates,
    cancelPendingUpdates
  };
}