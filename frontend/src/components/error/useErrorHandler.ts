import { useCallback } from 'react';

/**
 * Custom hook for handling errors in components
 * 
 * Provides a consistent way to handle and report errors
 * throughout the Promethia application.
 */
export function useErrorHandler() {
  const handleError = useCallback((error: Error, context?: string) => {
    // Log the error with context
    console.error(`Error${context ? ` in ${context}` : ''}:`, error);

    // In a real app, you would send this to your error reporting service
    // For now, we'll just log it
    
    // You can extend this to show toast notifications, etc.
  }, []);

  const handleAsyncError = useCallback(async <T>(
    asyncFn: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error as Error, context);
      return null;
    }
  }, [handleError]);

  return {
    handleError,
    handleAsyncError
  };
}