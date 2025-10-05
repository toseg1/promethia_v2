import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ErrorFallbackProps } from '../../types';
import { errorLogger } from '../../services/errorLogger';
import { RefreshCw } from 'lucide-react';

interface NavigationErrorBoundaryProps {
  children: ReactNode;
  navigationType: 'desktop' | 'mobile';
}

/**
 * Navigation-specific Error Boundary
 * 
 * Provides error handling specifically designed for navigation components.
 * Shows a minimal fallback that doesn't disrupt the main app flow while
 * maintaining the exact same user experience.
 */
export function NavigationErrorBoundary({ children, navigationType }: NavigationErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log the navigation error with context
    errorLogger.logComponentError(error, `Navigation (${navigationType})`, {
      componentName: `Navigation-${navigationType}`,
      navigationType,
      timestamp: new Date().toISOString()
    });
  };

  const NavigationErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
    return (
      <div className={`
        flex items-center justify-center p-4 bg-destructive/10 border border-destructive/20 rounded-lg
        ${navigationType === 'mobile' 
          ? 'fixed bottom-0 left-0 right-0 min-h-[64px]' 
          : 'w-64 min-h-[400px] flex-col'
        }
      `}>
        <div className="text-center">
          <p className="text-sm text-destructive font-medium mb-2">
            Navigation Error
          </p>
          <button
            onClick={resetErrorBoundary}
            className="inline-flex items-center gap-2 px-3 py-1 text-xs bg-destructive/20 text-destructive rounded-md hover:bg-destructive/30 transition-colors"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      </div>
    );
  };

  return (
    <ErrorBoundary 
      fallback={NavigationErrorFallback}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}