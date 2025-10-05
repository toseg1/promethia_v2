import React, { memo } from 'react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RaceEventFieldsProps {
  location: string;
  onLocationChange: (location: string) => void;
  distance: string;
  onDistanceChange: (distance: string) => void;
  time: string;
  onTimeChange: (time: string) => void;
  timeObjective: string;
  onTimeObjectiveChange: (timeObjective: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  dateStart: string;
  onDateStartChange: (date: string) => void;
  dateEnd?: string;
  onDateEndChange?: (date: string) => void;
  errors?: {
    dateStart?: string;
    time?: string;
    location?: string;
    distance?: string;
    timeObjective?: string;
  };
  onClearError?: (field: string) => void;
}

export const RaceEventFields = memo(function RaceEventFields({
  location,
  onLocationChange,
  distance,
  onDistanceChange,
  time,
  onTimeChange,
  timeObjective,
  onTimeObjectiveChange,
  description,
  onDescriptionChange,
  dateStart,
  onDateStartChange,
  dateEnd,
  onDateEndChange,
  errors = {},
  onClearError
}: RaceEventFieldsProps) {
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
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.date')}</label>
        <input
          type="date"
          value={dateStart}
          onChange={(e) => {
            onDateStartChange(e.target.value);
            onClearError?.('dateStart');
          }}
          className={`w-full px-3 py-2 border rounded-lg transition-colors ${
            errors.dateStart
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
          }`}
          required
        />
        {renderFieldError(errors.dateStart)}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.startTime')}</label>
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

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.location')}</label>
        <input
          type="text"
          value={location || ''}
          onChange={(e) => {
            onLocationChange(e.target.value);
            onClearError?.('location');
          }}
          placeholder={t('eventModal.locationPlaceholder')}
          className={`w-full px-3 py-2 border rounded-lg transition-colors ${
            errors.location
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
          }`}
        />
        {renderFieldError(errors.location)}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.distance')}</label>
        <input
          type="text"
          value={distance || ''}
          onChange={(e) => {
            onDistanceChange(e.target.value);
            onClearError?.('distance');
          }}
          placeholder={t('eventModal.distancePlaceholder')}
          className={`w-full px-3 py-2 border rounded-lg transition-colors ${
            errors.distance
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
          }`}
        />
        {renderFieldError(errors.distance)}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.description')}</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('eventModal.notesPlaceholder')}
          className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[96px]"
        />
      </div>
    </div>
  );
});
