import React from 'react';
import { RefreshCw, AlertTriangle, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ErrorFallbackProps } from '../../types';

/**
 * Error Fallback Component
 *
 * Displays a user-friendly error message that matches Promethia's design
 * when a component error occurs. Provides options to retry or reload.
 */
export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  const { t } = useTranslation('errors');
  const [showDetails, setShowDetails] = React.useState(false);

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-[400px] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle size={32} className="text-destructive" />
        </div>

        {/* Error Message */}
        <h2 className="text-xl font-semibold text-foreground mb-2">
          {t('somethingWentWrong')}
        </h2>
        <p className="text-muted-foreground mb-6">
          {t('unexpectedError')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button
            onClick={resetErrorBoundary}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={16} />
            {t('tryAgain')}
          </button>
          <button
            onClick={handleReload}
            className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-md hover:bg-muted/80 transition-colors"
          >
            {t('reloadPage')}
          </button>
        </div>

        {/* Error Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 mx-auto"
        >
          <span>{t('errorDetails')}</span>
          <ChevronDown
            size={16}
            className={`transform transition-transform ${showDetails ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Error Details */}
        {showDetails && (
          <div className="mt-4 p-4 bg-muted/30 rounded-md text-left">
            <div className="text-xs font-mono text-muted-foreground break-all">
              <div className="mb-2">
                <strong className="text-foreground">{t('error')}</strong> {error.message}
              </div>
              {error.stack && (
                <div>
                  <strong className="text-foreground">{t('stack')}</strong>
                  <pre className="mt-1 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}