import React from 'react';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { ErrorFallbackProps } from '../../types';

interface FormErrorFallbackProps extends ErrorFallbackProps {
  onClose?: () => void;
  formName?: string;
}

/**
 * Form-specific Error Fallback Component
 * 
 * Designed for errors in forms, modals, and input components.
 * Provides form-specific recovery options.
 */
export function FormErrorFallback({ 
  error, 
  resetErrorBoundary, 
  onClose, 
  formName = 'form' 
}: FormErrorFallbackProps) {
  const handleRetry = () => {
    resetErrorBoundary();
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    }
    resetErrorBoundary();
  };

  return (
    <div className="flex items-center justify-center p-6 min-h-[300px]">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto w-14 h-14 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle size={28} className="text-destructive" />
        </div>

        {/* Error Title */}
        <h3 className="text-lg font-semibold text-foreground mb-2">
          {formName.charAt(0).toUpperCase() + formName.slice(1)} Error
        </h3>
        
        {/* Error Description */}
        <p className="text-sm text-muted-foreground mb-5">
          Something went wrong with the {formName}. Your data hasn't been lost - you can try again.
        </p>

        {/* Recovery Actions */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <button
            onClick={handleRetry}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
          >
            <RefreshCw size={16} />
            Try Again
          </button>
          {onClose && (
            <button
              onClick={handleClose}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors text-sm font-medium"
            >
              <X size={16} />
              Close
            </button>
          )}
        </div>

        {/* Development Error Details */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4 text-left">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
              Error Details
            </summary>
            <div className="mt-2 p-2 bg-destructive/5 rounded border border-destructive/20">
              <div className="text-xs text-destructive">
                <div className="font-medium mb-1">{error.message}</div>
                {error.stack && (
                  <pre className="text-xs overflow-x-auto max-h-24">
                    {error.stack.split('\n').slice(0, 3).join('\n')}
                  </pre>
                )}
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  );
}