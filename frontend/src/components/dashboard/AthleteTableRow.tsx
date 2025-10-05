import React, { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, Eye, MoreHorizontal } from 'lucide-react';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Athlete } from './types';
import { getStatusColor, getCompletionRateColor } from './data';

interface AthleteTableRowProps {
  athlete: Athlete;
  onViewDetails: (athlete: Athlete) => void;
  onViewCalendar?: (athlete: Athlete) => void;
  onRemoveAthlete?: (athlete: Athlete) => void;
}

export const AthleteTableRow = memo(function AthleteTableRow({ athlete, onViewDetails, onViewCalendar, onRemoveAthlete }: AthleteTableRowProps) {
  const { t } = useTranslation(['dashboard', 'common']);

  const translatedSports = athlete.sports.map((sport) => {
    const key = sport.toLowerCase().replace(/\s+/g, '');
    return t(`common:sports.${key}`, sport);
  });

  const handleViewDetails = useCallback(() => {
    onViewDetails(athlete);
  }, [athlete, onViewDetails]);

  const handleViewCalendar = useCallback(() => {
    if (onViewCalendar) {
      onViewCalendar(athlete);
    }
  }, [athlete, onViewCalendar]);

  const handleRemoveAthlete = useCallback(() => {
    if (onRemoveAthlete) {
      onRemoveAthlete(athlete);
    }
  }, [athlete, onRemoveAthlete]);

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
            {athlete.avatarUrl ? (
              <img
                src={athlete.avatarUrl}
                alt={t('coach.athleteTable.avatarAlt', { name: athlete.name })}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-xs font-medium text-gray-600">{athlete.initials}</span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{athlete.name}</p>
            <p className="text-xs text-muted-foreground">{athlete.email}</p>
          </div>
        </div>
      </td>
      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
        <span
          className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium"
          title={translatedSports.length > 1 ? translatedSports.join(', ') : undefined}
        >
          {athlete.sport}
        </span>
      </td>
      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
        <span className={`text-sm font-medium ${getStatusColor(athlete.status)}`}>
          {t(`common:${athlete.status.toLowerCase()}`)}
        </span>
      </td>
      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-1">
          <Calendar size={14} className="text-muted-foreground" />
          <span className="text-sm text-foreground">{athlete.upcomingEvents}</span>
        </div>
      </td>
      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
        <span className={`text-sm font-medium ${getCompletionRateColor(athlete.completionRate)}`}>
          {athlete.completionRate === 'N/A' ? t('common:notSet') : `${athlete.completionRate}%`}
        </span>
      </td>
      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
        <span className="text-sm text-muted-foreground">{athlete.lastActivity}</span>
      </td>
      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Button 
            size="sm" 
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleViewCalendar}
            title={t('coach.athleteTable.viewCalendarTooltip', { name: athlete.name })}
          >
            <Eye size={14} className="mr-1" />
            <span style={{ textTransform: 'none', letterSpacing: '0px' }}>{t('coach.athleteTable.viewCalendar')}</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => console.log('Dropdown trigger clicked for:', athlete.name)}
              >
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                className="cursor-pointer"
                onClick={handleViewDetails}
              >
                {t('coach.athleteTable.viewDetails')}
              </DropdownMenuItem>

              <DropdownMenuItem 
                className="cursor-pointer"
                variant="destructive"
                onClick={handleRemoveAthlete}
              >
                {t('coach.athleteTable.removeAthlete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
});
