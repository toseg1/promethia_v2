import React, { useEffect, useState, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface AsyncError {
  error: Error;
  timestamp: number;
  context?: string;
}

interface AsyncErrorHandlerProps {
  children: ReactNode;
  onError?: (error: Error, context?: string) => void;
}

/**
 * Async Error Handler Component
 * 
 * Catches unhandled promise rejections and async errors
 * that occur outside of the React component tree.
 */
export function AsyncErrorHandler({ children, onError }: AsyncErrorHandlerProps) {
  const [asyncErrors, setAsyncErrors] = useState<AsyncError[]>([]);

  useEffect(() => {
    // Handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      const asyncError: AsyncError = {
        error,
        timestamp: Date.now(),
        context: 'Unhandled Promise Rejection'
      };

      setAsyncErrors(prev => [...prev, asyncError].slice(-3)); // Keep only last 3 errors
      
      if (onError) {
        onError(error, 'promise_rejection');
      }

      // Prevent default browser error handling
      event.preventDefault();
    };

    // Handler for global JavaScript errors
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      
      const error = event.error || new Error(event.message);
      const asyncError: AsyncError = {
        error,
        timestamp: Date.now(),
        context: 'Global Error'
      };

      setAsyncErrors(prev => [...prev, asyncError].slice(-3));
      
      if (onError) {
        onError(error, 'global_error');
      }
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, [onError]);

  const dismissError = (timestamp: number) => {
    setAsyncErrors(prev => prev.filter(e => e.timestamp !== timestamp));
  };

  const dismissAllErrors = () => {
    setAsyncErrors([]);
  };

  return (
    <>
      {children}
      
      {/* Error Toast Notifications */}
      {asyncErrors.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm">
          {asyncErrors.map((asyncError) => (
            <div
              key={asyncError.timestamp}
              className="mb-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg shadow-lg backdrop-blur-sm"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-foreground mb-1">
                    {asyncError.context || 'Error'}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {asyncError.error.message}
                  </p>
                </div>
                <button
                  onClick={() => dismissError(asyncError.timestamp)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          
          {/* Dismiss All Button (when multiple errors) */}
          {asyncErrors.length > 1 && (
            <button
              onClick={dismissAllErrors}
              className="w-full mt-2 px-3 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors text-sm font-medium"
            >
              Dismiss All
            </button>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Custom hook for handling async errors within components
 */
export function useAsyncError() {
  const throwAsyncError = (error: Error) => {
    // This will be caught by the AsyncErrorHandler
    setTimeout(() => {
      throw error;
    }, 0);
  };

  const handleAsyncOperation = async <T,>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      console.error(`Async error${context ? ` in ${context}` : ''}:`, error);
      throwAsyncError(error instanceof Error ? error : new Error(String(error)));
      return null;
    }
  };

  return { handleAsyncOperation, throwAsyncError };
}