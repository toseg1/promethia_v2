import React from 'react';
import { RefreshCw, Home, AlertTriangle } from 'lucide-react';
import { ErrorFallbackProps } from '../../types';

/**
 * Dashboard-specific Error Fallback Component
 * 
 * Provides contextual error recovery options for dashboard failures
 * with actions relevant to dashboard functionality.
 */
export function DashboardErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const handleGoHome = () => {
    // Reset error and navigate to dashboard
    resetErrorBoundary();
    // Could also trigger navigation to dashboard view if needed
  };

  const handleRefresh = () => {
    // Reset error boundary to retry rendering
    resetErrorBoundary();
  };

  return (
    <div className="flex items-center justify-center min-h-[500px] p-6">
      <div className="max-w-lg w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={40} className="text-destructive" />
        </div>

        {/* Error Title */}
        <h2 className="text-2xl font-bold text-foreground mb-3">
          Dashboard Error
        </h2>
        
        {/* Error Description */}
        <p className="text-muted-foreground mb-6 leading-relaxed">
          We couldn't load your dashboard properly. This might be due to a temporary issue with your data or network connection.
        </p>

        {/* Recovery Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <button
            onClick={handleRefresh}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-medium"
          >
            <RefreshCw size={18} />
            Retry Dashboard
          </button>
          <button
            onClick={handleGoHome}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-all duration-200 font-medium"
          >
            <Home size={18} />
            Reset View
          </button>
        </div>

        {/* Help Text */}
        <p className="text-sm text-muted-foreground">
          If this problem persists, try refreshing the page or contact support.
        </p>

        {/* Error Details (Developer Info) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-6 text-left">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Developer Details
            </summary>
            <div className="mt-2 p-3 bg-muted/30 rounded-md">
              <div className="text-xs font-mono text-destructive">
                <div className="mb-2">
                  <strong>Error:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 text-xs whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}