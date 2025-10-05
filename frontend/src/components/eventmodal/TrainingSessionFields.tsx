import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TrainingSessionFieldsProps {
  date: string;
  onDateChange: (date: string) => void;
  duration: string;
  onDurationChange: (duration: string) => void;
  time: string;
  onTimeChange: (time: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  errors?: {
    date?: string;
    duration?: string;
    time?: string;
  };
  onClearError?: (field: string) => void;
}

export const TrainingSessionFields = memo(function TrainingSessionFields({
  date,
  onDateChange,
  duration,
  onDurationChange,
  time,
  onTimeChange,
  description,
  onDescriptionChange,
  errors = {},
  onClearError
}: TrainingSessionFieldsProps) {
  const { t } = useTranslation('calendar');

  const renderFieldError = (error?: string) => {
    if (!error) return null;
    return (
      <div className="flex items-center gap-2 text-red-500 text-sm mt-1 pl-1">
        <AlertCircle size={14} />
        <span>{error}</span>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
      <div className="md:col-span-4">
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.date')}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            onDateChange(e.target.value);
            onClearError?.('date');
          }}
          className={`w-full px-3 py-2 border rounded-lg transition-colors ${
            errors.date
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
          }`}
          required
        />
        {renderFieldError(errors.date)}
      </div>

      <div className="md:col-span-4">
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.duration')}</label>
        <input
          type="number"
          value={duration || ''}
          onChange={(e) => {
            onDurationChange(e.target.value);
            onClearError?.('duration');
          }}
          placeholder={t('eventModal.durationPlaceholder')}
          className={`w-full px-3 py-2 border rounded-lg transition-colors ${
            errors.duration
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
          }`}
        />
        {renderFieldError(errors.duration)}
      </div>

      <div className="md:col-span-4">
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.time')}</label>
        <input
          type="time"
          value={time || ''}
          onChange={(e) => {
            onTimeChange(e.target.value);
            onClearError?.('time');
          }}
          placeholder={t('eventModal.timePlaceholder')}
          className={`w-full px-3 py-2 border rounded-lg transition-colors ${
            errors.time
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
          }`}
        />
        {renderFieldError(errors.time)}
      </div>

      <div className="md:col-span-12">
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.description')}</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('eventModal.descriptionPlaceholder')}
          className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[96px]"
        />
      </div>
    </div>
  );
});
