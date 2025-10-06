import React from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './button';
import { LoadingState } from './LoadingState';
import { useBackendWakeup } from '../../contexts';

export function BackendWakeupOverlay() {
  const { t } = useTranslation('common');
  const {
    isBackendAwake,
    isChecking,
    attempts,
    lastError,
    showWakeupOverlay,
    remainingRetries,
    retry,
  } = useBackendWakeup();

  if (!showWakeupOverlay && isBackendAwake) {
    return null;
  }

  if (!showWakeupOverlay) {
    return null;
  }

  let statusKey: string = 'backendWakeup.statusReadyCheck';

  if (isChecking) {
    statusKey = 'backendWakeup.statusChecking';
  } else if (!isBackendAwake && remainingRetries === 0 && attempts > 1) {
    statusKey = 'backendWakeup.statusFinalCheck';
  }

  const overlay = (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 9999 }}>
      <div className="absolute inset-0 bg-primary/90 dark:bg-primary/70 flex items-center justify-center px-6 pointer-events-auto">
        <div className="absolute inset-0 bg-white/88 dark:bg-slate-950/88 mix-blend-screen pointer-events-none" />
        <div className="relative max-w-lg w-full overflow-hidden rounded-[28px] border border-white/40 dark:border-white/10 shadow-[0_24px_60px_rgba(3,2,19,0.28)] bg-white/95 dark:bg-slate-950/90 backdrop-blur-lg">
          <div className="absolute inset-x-[-40%] top-[-30%] h-1/2 bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-3xl opacity-70 pointer-events-none" />
          <div className="relative px-10 py-12 flex flex-col items-center text-center gap-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-primary/90">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              {t('backendWakeup.badge')}
            </div>
          
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              {t('backendWakeup.title')}
            </h2>
            <p className="text-sm sm:text-base leading-relaxed text-muted-foreground max-w-md">
              {t('backendWakeup.description')}
            </p>
            <div
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.28em] text-primary"
              aria-live="polite"
            >
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary animate-pulse" aria-hidden="true" />
              {t(statusKey)}
            </div>
            {lastError && !isChecking && (
              <div className="flex items-center gap-2 text-sm text-destructive/90 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-2 text-left">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <span>{t('backendWakeup.errorDetails', { message: lastError })}</span>
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={retry}
                size="sm"
                className="px-5 shadow-[0_8px_20px_rgba(3,2,19,0.18)]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t('backendWakeup.retry')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return overlay;
  }

  return createPortal(overlay, document.body);
}
