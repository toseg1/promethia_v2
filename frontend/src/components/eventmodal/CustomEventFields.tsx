import React, { memo } from 'react';
import { MapPin, Palette, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { customEventColors } from './types';

interface CustomEventFieldsProps {
  dateStart: string;
  onDateStartChange: (date: string) => void;
  dateEnd: string;
  onDateEndChange: (date: string) => void;
  location: string;
  onLocationChange: (location: string) => void;
  customEventColor: string;
  onCustomEventColorChange: (color: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  errors?: {
    dateStart?: string;
    dateEnd?: string;
    location?: string;
  };
  onClearError?: (field: string) => void;
}

export const CustomEventFields = memo(function CustomEventFields({
  dateStart,
  onDateStartChange,
  dateEnd,
  onDateEndChange,
  location,
  onLocationChange,
  customEventColor,
  onCustomEventColorChange,
  description,
  onDescriptionChange,
  errors = {},
  onClearError
}: CustomEventFieldsProps) {
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
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.dateStart')}</label>
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
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.dateEnd')}</label>
        <input
          type="date"
          value={dateEnd}
          onChange={(e) => {
            onDateEndChange(e.target.value);
            onClearError?.('dateEnd');
          }}
          min={dateStart}
          className={`w-full px-3 py-2 border rounded-lg transition-colors ${
            errors.dateEnd
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
          }`}
        />
        {renderFieldError(errors.dateEnd)}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('eventModal.location')}
        </label>
        <input
          type="text"
          value={location}
          onChange={(e) => {
            onLocationChange(e.target.value);
            onClearError?.('location');
          }}
          placeholder={t('eventModal.eventLocationPlaceholder')}
          className={`w-full px-3 py-2 border rounded-lg transition-colors ${
            errors.location
              ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
          }`}
        />
        {renderFieldError(errors.location)}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-3">
          {t('eventModal.eventColor')}
        </label>
        <div className="flex gap-2 flex-wrap">
          {customEventColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onCustomEventColorChange(color)}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                customEventColor === color ? 'border-foreground scale-110' : 'border-border/20'
              }`}
              style={{ backgroundColor: color }}
              aria-label={`${t('eventModal.selectColor')} ${color}`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.description')}</label>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={t('eventModal.eventDetailsPlaceholder')}
          className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary min-h-[96px]"
        />
      </div>
    </div>
  );
});
