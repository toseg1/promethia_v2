import React, { memo } from 'react';
import { Target, Trophy, Calendar, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { trainingSports, raceSports, Athlete } from './types';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { useIsMobile } from '../ui/use-mobile';

interface EventFormFieldsProps {
  eventType: 'training' | 'race' | 'custom';
  onEventTypeChange: (type: 'training' | 'race' | 'custom') => void;
  selectedSport: string;
  onSportChange: (sport: string) => void;
  title: string;
  onTitleChange: (title: string) => void;
  selectedAthlete: string;
  onAthleteChange: (athleteId: string) => void;
  userRole: string;
  athletes: Athlete[];
  isEditing: boolean;
  lockedEventType: 'training' | 'race' | 'custom' | null;
  errors?: {
    title?: string;
    sport?: string;
    athlete?: string;
  };
  onClearError?: (field: string) => void;
}

export const EventFormFields = memo(function EventFormFields({
  eventType,
  onEventTypeChange,
  selectedSport,
  onSportChange,
  title,
  onTitleChange,
  selectedAthlete,
  onAthleteChange,
  userRole,
  athletes,
  isEditing,
  lockedEventType,
  errors = {},
  onClearError
}: EventFormFieldsProps) {
  const { t } = useTranslation('calendar');
  const activeType = lockedEventType ?? eventType;
  const isMobileView = useIsMobile();

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
    <>
      {/* Event Type */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-3">{t('eventModal.eventType')}</label>
        <div className="grid grid-cols-3 gap-3">
          {(['training', 'race', 'custom'] as const).map((type) => (
            (() => {
              const isActiveType = activeType === type;
              const isLocked = isEditing && !isActiveType;
              const typeLabel = type === 'training'
                ? t('eventModal.trainingType')
                : type === 'race'
                  ? t('eventModal.raceType')
                  : t('eventModal.customEventType');
              const buttonClasses = `
                flex items-center p-3 rounded-lg border transition-colors
                ${isMobileView ? 'justify-center gap-0' : 'justify-start gap-2'}
                ${isActiveType
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border/20 hover:bg-muted/50 text-foreground'}
                ${isLocked ? ' cursor-not-allowed opacity-60 hover:bg-transparent' : ''}
              `;

              const buttonContent = (
                <button
                  type="button"
                  onClick={!isLocked ? () => onEventTypeChange(type) : undefined}
                  className={buttonClasses}
                  aria-disabled={isLocked}
                  aria-label={typeLabel}
                  title={typeLabel}
                  tabIndex={isLocked ? -1 : 0}
                >
                  {type === 'training' && <Target size={20} />}
                  {type === 'race' && <Trophy size={20} />}
                  {type === 'custom' && <Calendar size={20} />}
                  <span className="sr-only">{typeLabel}</span>
                  {!isMobileView && (
                    <span className="font-medium capitalize">{typeLabel}</span>
                  )}
                </button>
              );

              if (isLocked) {
                return (
                  <Tooltip key={type}>
                    <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[240px] text-center">
                      {t('eventModal.eventTypeLocked')}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <React.Fragment key={type}>
                  {buttonContent}
                </React.Fragment>
              );
            })()
          ))}
        </div>
        {isEditing && (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('eventModal.eventTypeChangeHint')}
          </p>
        )}
      </div>

      {/* Sport Selection - Only for Training and Race */}
      {(eventType === 'training' || eventType === 'race') && (
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">{t('eventModal.sport')}</label>
          <select
            value={selectedSport}
            onChange={(e) => {
              onSportChange(e.target.value);
              onClearError?.('sport');
            }}
            className={`w-full px-3 py-2 bg-muted text-foreground rounded-lg border text-sm min-h-[44px] transition-colors ${
              errors.sport
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
            }`}
          >
            {(eventType === 'race' ? raceSports : trainingSports).map((sport) => (
              <option key={sport.id} value={sport.id}>
                {sport.name}
              </option>
            ))}
          </select>
          {renderFieldError(errors.sport)}
        </div>
      )}

      {/* Title and Athlete Selection */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.title')}</label>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              onTitleChange(e.target.value);
              onClearError?.('title');
            }}
            onBlur={() => {
              if (!title.trim()) {
                // Validation will be handled by form submit
              }
            }}
            placeholder={t('eventModal.titlePlaceholder')}
            className={`w-full px-3 py-2 border rounded-lg transition-colors ${
              errors.title
                ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
            }`}
            required
          />
          {renderFieldError(errors.title)}
        </div>

        {userRole === 'coach' && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('eventModal.athlete')}</label>
            <select
              value={selectedAthlete}
              onChange={(e) => {
                onAthleteChange(e.target.value);
                onClearError?.('athlete');
              }}
              className={`w-full px-3 py-2 border rounded-lg transition-colors ${
                errors.athlete
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                  : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary'
              }`}
              required
            >
              <option value="">{t('eventModal.selectAthlete')}</option>
              {athletes.map(athlete => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.name}
                </option>
              ))}
            </select>
            {renderFieldError(errors.athlete)}
          </div>
        )}
      </div>
    </>
  );
});
