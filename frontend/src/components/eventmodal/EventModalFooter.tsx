import React from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '../ui/SkeletonLoader';

interface EventModalFooterProps {
  isSubmitting: boolean;
  onCancel: () => void;
}

export function EventModalFooter({ isSubmitting, onCancel }: EventModalFooterProps) {
  const { t } = useTranslation('calendar');
  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 md:pt-6 border-t border-border/20">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSubmitting}
        className="flex-1 px-4 py-2 md:py-3 bg-muted hover:bg-muted/80 text-muted-foreground rounded-lg font-medium transition-colors disabled:opacity-50"
      >
        {t('eventModal.cancel')}
      </button>
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex-1 px-4 py-2 md:py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting ? (
          <>
            <LoadingState size="sm" />
            <span>{t('eventModal.saving')}</span>
          </>
        ) : (
          t('eventModal.saveEvent')
        )}
      </button>
    </div>
  );
}
