import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import type { TFunction } from 'i18next';
import {
  Users,
  Target,
  TrendingUp,
  Calendar,
  Plus,
  CalendarDays,
  Search,
  Trophy,
  UserCheck,
  Smartphone,
  ChevronDown,
  Mail,
  Phone,
  X,
  Award,
  Activity
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getActivityIcon } from './activityIcons';

import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { AddAthleteModal } from '../AddAthleteModal';
import { useDraggableModal } from '../../hooks/useDraggableModal';
import { DashboardProps, Athlete, CoachStats } from './types';
import { useTrainingAnalytics, useCalendarEvents, useConnectedAthletes, useDashboardSummary } from '../../hooks';
import type { CalendarEventModel } from '../../services/eventService';
import { LoadingOverlay } from '../ui/SkeletonLoader';
import { ActivityItem } from './ActivityItem';
import { AthleteTableRow } from './AthleteTableRow';
import { useAsyncError } from '../error/AsyncErrorHandler';
import { errorLogger } from '../../services/errorLogger';
import { DeleteConfirmation } from '../ui/DeleteConfirmation';
import { userService } from '../../services/userService';
import { toast } from 'sonner';
import { queryClient } from '../../hooks/useQuery';
import { formatDate } from '../../utils/localeFormat';

const SPORT_ORDER = ['Triathlon', 'Running', 'Cycling', 'Swimming', 'Other'];
const NO_SPORT_FILTER_OPTION = '__NO_SPORT__';

// Helper function to translate sport names
function translateSport(sport: string, t: TFunction): string {
  const sportKey = sport.toLowerCase().replace(/\s+/g, '');
  return t(`common:sports.${sportKey}`, sport);
}

function sortSports(sports: string[]): string[] {
  return [...sports].sort((a, b) => {
    const indexA = SPORT_ORDER.indexOf(a);
    const indexB = SPORT_ORDER.indexOf(b);
    return (indexA === -1 ? SPORT_ORDER.length : indexA) - (indexB === -1 ? SPORT_ORDER.length : indexB);
  });
}

function formatSportTag(sports: string[], t: TFunction): string {
  if (sports.length === 0) {
    return t('coach.athleteTable.noSports');
  }

  const translatedSports = sortSports(sports).map((sport) => translateSport(sport, t));

  if (translatedSports.length <= 3) {
    return translatedSports.join(', ');
  }

  const visibleSports = translatedSports.slice(0, 3).join(', ');
  const remainingCount = translatedSports.length - 3;

  return `${visibleSports} ${t('coach.athleteTable.moreSports', { count: remainingCount })}`;
}

function formatCssMetric(rawValue: number | string | undefined, displayValue?: string | number): string | undefined {
  if (displayValue !== undefined && displayValue !== null) {
    const stringValue = String(displayValue).trim();
    if (stringValue) {
      return stringValue;
    }
  }

  if (typeof rawValue === 'string') {
    const trimmed = rawValue.trim();
    return trimmed || undefined;
  }

  if (typeof rawValue === 'number') {
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return undefined;
    }
    const minutes = Math.floor(rawValue / 60);
    const seconds = Math.round(rawValue % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  return undefined;
}

function mapSportToFilterValue(rawSport: string): string | null {
  if (!rawSport) {
    return null;
  }

  const normalized = rawSport.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized === 'running' || normalized === 'run') {
    return 'Running';
  }

  if (normalized === 'cycling' || normalized === 'bike' || normalized === 'biking') {
    return 'Cycling';
  }

  if (normalized === 'swimming' || normalized === 'swim') {
    return 'Swimming';
  }

  if (normalized === 'triathlon' || normalized === 'triathlete') {
    return 'Triathlon';
  }

  if (normalized === 'other') {
    return 'Other';
  }

  return 'Other';
}

export const CoachDashboard = memo(function CoachDashboard({ user, onNavigate, onAddEvent }: DashboardProps) {
  const { t } = useTranslation(['dashboard', 'common']);

  // Draggable modal hook
  const { modalRef, resetPosition, getTransform, getDragHandleProps } = useDraggableModal();

  // State management for coach dashboard
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [isAddAthleteModalOpen, setIsAddAthleteModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [isAthleteModalOpen, setIsAthleteModalOpen] = useState(false);
  const [athleteToRemove, setAthleteToRemove] = useState<Athlete | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [isRemovingAthlete, setIsRemovingAthlete] = useState(false);

  // Reset position when modal opens
  useEffect(() => {
    if (isAthleteModalOpen) {
      resetPosition();
    }
  }, [isAthleteModalOpen, resetPosition]);
  
  // Enhanced error handling for async operations
  const { throwAsyncError } = useAsyncError();

  const dateRange = useMemo(() => {
    const now = new Date();
    return {
      start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    };
  }, []);

  const {
    data: analyticsData,
    loading: analyticsLoading,
    error: analyticsError
  } = useTrainingAnalytics(user.id, 'month', true);

  const {
    data: dashboardSummary,
    loading: dashboardLoading,
    error: dashboardError
  } = useDashboardSummary(true);

  const {
    data: calendarEvents,
    loading: calendarLoading,
    error: calendarError
  } = useCalendarEvents(dateRange.start, dateRange.end, true);

  const {
    data: connectedAthletes,
    loading: athletesLoading,
    error: athletesError,
    refetch: refetchConnectedAthletes,
  } = useConnectedAthletes(user.id, true);

  useEffect(() => {
    if (analyticsError) {
      throwAsyncError(analyticsError);
    }
  }, [analyticsError, throwAsyncError]);

  useEffect(() => {
    if (dashboardError) {
      throwAsyncError(dashboardError);
    }
  }, [dashboardError, throwAsyncError]);

  useEffect(() => {
    if (calendarError) {
      throwAsyncError(calendarError);
    }
  }, [calendarError, throwAsyncError]);

  useEffect(() => {
    if (athletesError) {
      throwAsyncError(athletesError);
    }
  }, [athletesError, throwAsyncError]);

  const trainingEvents = useMemo(() => (
    (calendarEvents || []).filter(event => event.type === 'training')
  ), [calendarEvents]);

  const trainingEventsByAthlete = useMemo(() => {
    const map = new Map<string, CalendarEventModel[]>();
    (trainingEvents || []).forEach((event) => {
      const athleteId = event.athleteId ?? '';
      if (!athleteId) {
        return;
      }

      if (!map.has(athleteId)) {
        map.set(athleteId, []);
      }

      map.get(athleteId)!.push(event);
    });
    return map;
  }, [trainingEvents]);

  const allEventsByAthlete = useMemo(() => {
    const map = new Map<string, CalendarEventModel[]>();
    (calendarEvents || []).forEach((event) => {
      const athleteId = event.athleteId ?? '';
      if (!athleteId) {
        return;
      }

      if (!map.has(athleteId)) {
        map.set(athleteId, []);
      }

      map.get(athleteId)!.push(event);
    });
    return map;
  }, [calendarEvents]);

  const athleteList: Athlete[] = useMemo(() => {
    const results: Athlete[] = [];
    if (!connectedAthletes) {
      return results;
    }

    const now = new Date();
    const twoWeeksAgo = new Date(now.getTime());
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    connectedAthletes.forEach((athlete) => {
      const name = `${athlete.firstName} ${athlete.lastName}`.trim() || athlete.username;
      const initials = name
        .split(' ')
        .filter(Boolean)
        .map(part => part[0]?.toUpperCase())
        .join('')
        .slice(0, 2) || 'A';

      const formattedPhone = (() => {
        const raw = athlete.phone?.trim();
        if (!raw) {
          return undefined;
        }
        if (raw.startsWith('+')) {
          return raw;
        }
        const country = athlete.countryCode?.trim();
        if (country) {
          return `${country} ${raw}`.trim();
        }
        return raw;
      })();

      const rawSports = Array.isArray(athlete.sportsInvolved)
        ? athlete.sportsInvolved.filter((sport): sport is string => Boolean(sport))
        : [];
      const sports = sortSports(
        Array.from(
          new Set(
            rawSports
              .map(mapSportToFilterValue)
              .filter((sport): sport is string => Boolean(sport))
          )
        )
      );
      const sportLabel = formatSportTag(sports, t);

      const athleteTrainingEvents = trainingEventsByAthlete.get(athlete.id) || [];
      const allAthleteEvents = allEventsByAthlete.get(athlete.id) || [];

      const upcomingEventsCount = allAthleteEvents.reduce((count, event) => {
        const eventDate = new Date(event.date);
        if (!Number.isNaN(eventDate.getTime()) && eventDate >= now) {
          return count + 1;
        }
        return count;
      }, 0);

      const hasRecentTraining = athleteTrainingEvents.some((event) => {
        const eventDate = new Date(event.date);
        if (Number.isNaN(eventDate.getTime())) {
          return false;
        }
        return eventDate >= twoWeeksAgo && eventDate <= now;
      });

      const lastTrainingDate = athleteTrainingEvents.reduce<Date | null>((latest, event) => {
        const eventDate = new Date(event.date);
        if (Number.isNaN(eventDate.getTime()) || eventDate > now) {
          return latest;
        }
        if (!latest || eventDate > latest) {
          return eventDate;
        }
        return latest;
      }, null);

      const achievements = (athlete.athleticProfile?.achievements ?? [])
        .map((achievement) => {
          const trimmedTitle = achievement.title?.trim() ?? '';
          const trimmedCategory = achievement.category?.trim();
          const parts = [trimmedTitle, trimmedCategory].filter((value): value is string => Boolean(value));
          const label = parts.join(' • ');
          if (achievement.year && label) {
            return `${achievement.year} • ${label}`;
          }
          if (achievement.year) {
            return String(achievement.year);
          }
          return label;
        })
        .filter((value): value is string => Boolean(value && value.trim()));

      const mas = athlete.mas ?? athlete.performanceMetrics?.mas;
      const fpp = athlete.fpp ?? athlete.performanceMetrics?.fpp;
      const cssValue = athlete.css ?? athlete.performanceMetrics?.css;
      const cssDisplay = formatCssMetric(cssValue, athlete.cssDisplay);

      const status: 'active' | 'inactive' = hasRecentTraining ? 'active' : 'inactive';
      const lastActivityLabel = lastTrainingDate
        ? formatDate(lastTrainingDate, 'short')
        : t('coach.athleteTable.noRecentTraining');

      results.push({
        id: athlete.id,
        name,
        username: athlete.username,
        email: athlete.email,
        sport: sportLabel,
        status,
        upcomingEvents: upcomingEventsCount,
        completionRate: 'N/A',
        lastActivity: lastActivityLabel,
        initials,
        phone: formattedPhone,
        joinedDate: athlete.dateJoined ?? athlete.createdAt ?? undefined,
        bio: athlete.athleticProfile?.aboutNotes ?? '',
        sports,
        achievements,
        mas,
        fpp,
        css: cssValue,
        cssDisplay,
        yearsTraining: athlete.athleticProfile?.experienceYears ?? undefined,
        avatarUrl: athlete.profileImage || athlete.avatarUrl,
      });
    });

    return results;
  }, [connectedAthletes, trainingEventsByAthlete, allEventsByAthlete, t]);

  const coachStats: CoachStats = useMemo(() => {
    const menteeCount = dashboardSummary?.coachingSummary?.menteesCount ?? connectedAthletes?.length ?? athleteList.length;
    const activeCount = athleteList.filter((athlete) => athlete.status === 'active').length;

    // Calculate upcoming trainings for athletes (next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingTrainings = (calendarEvents || []).filter(event => {
      const eventDate = new Date(event.date);
      return event.type === 'training' &&
             eventDate > now &&
             eventDate <= thirtyDaysFromNow &&
             event.athleteId &&
             event.athleteId !== user.id;
    }).length;

    return {
      totalAthletes: menteeCount,
      activeAthletes: activeCount,
      avgCompletion: Math.round(analyticsData?.completionRate ?? 0),
      upcomingTrainings,
      totalEvents: dashboardSummary?.upcomingRaces?.length ?? dashboardSummary?.upcomingTrainings?.length ?? analyticsData?.workoutCount ?? 0
    };
  }, [dashboardSummary, connectedAthletes, athleteList, analyticsData, calendarEvents, user.id]);

  const filteredAthletes = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const selectedActualSports = selectedSports.filter((sport) => sport !== NO_SPORT_FILTER_OPTION);
    const includeNoSport = selectedSports.includes(NO_SPORT_FILTER_OPTION);

    return athleteList.filter((athlete) => {
      const nameMatch = normalizedSearch.length === 0
        ? true
        : athlete.name.toLowerCase().includes(normalizedSearch) || athlete.email.toLowerCase().includes(normalizedSearch);

      if (!nameMatch) {
        return false;
      }

      if (selectedSports.length === 0) {
        return true;
      }

      const matchesSportSelection = (() => {
        let matches = false;

        if (selectedActualSports.length > 0) {
          matches = selectedActualSports.some((sport) => athlete.sports.includes(sport));
        }

        if (includeNoSport) {
          matches = matches || athlete.sports.length === 0;
        }

        return matches;
      })();

      return matchesSportSelection;
    });
  }, [searchTerm, selectedSports, athleteList]);

  const recentActivities = useMemo(() => {
    const athleteNameLookup = new Map<string, string>();
    athleteList.forEach((athlete) => {
      athleteNameLookup.set(athlete.id, athlete.name);
    });

    const baseEvents = (trainingEvents || [])
      .filter((event) => event.athleteId && event.athleteId !== user.id)
      .map((event) => {
        const icon = getActivityIcon(event.type, event.sport);

        return {
          id: event.id,
          title: event.title,
          date: new Date(event.date),
          athlete: athleteNameLookup.get(event.athleteId ?? ''),
          icon
        };
      });

    return baseEvents
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        type: 'training' as const,
        title: item.title,
        time: formatDate(item.date, 'short'),
        athlete: item.athlete,
        icon: item.icon
      }));
  }, [trainingEvents, athleteList]);

  const isLoading = analyticsLoading || calendarLoading || athletesLoading || dashboardLoading;

  const sportFilterData = useMemo(() => {
    const sportsSet = new Set<string>();
    let hasNoSportSelection = false;

    athleteList.forEach((athlete) => {
      if (athlete.sports.length === 0) {
        hasNoSportSelection = true;
        return;
      }

      athlete.sports.forEach((sport) => {
        if (sport) {
          sportsSet.add(sport);
        }
      });
    });

    const orderedSports = SPORT_ORDER.filter((sport) => sportsSet.has(sport));
    const otherSports = Array.from(sportsSet)
      .filter((sport) => !SPORT_ORDER.includes(sport))
      .sort((a, b) => a.localeCompare(b));

    return {
      sportOptions: [...orderedSports, ...otherSports],
      hasNoSportOption: hasNoSportSelection,
    };
  }, [athleteList]);

  useEffect(() => {
    if (selectedSports.length === 0) {
      return;
    }

    const validSelections = selectedSports.filter((sport) => {
      if (sport === NO_SPORT_FILTER_OPTION) {
        return sportFilterData.hasNoSportOption;
      }
      return sportFilterData.sportOptions.includes(sport);
    });

    if (validSelections.length !== selectedSports.length) {
      setSelectedSports(validSelections);
    }
  }, [selectedSports, sportFilterData]);

  const sportFilterLabel = useMemo(() => {
    if (selectedSports.length === 0) {
      return t('common:sports.allSports');
    }

    if (selectedSports.length === 1) {
      const sport = selectedSports[0];
      // Check if it's the "No Sport Selected" option
      if (sport === NO_SPORT_FILTER_OPTION) {
        return t('common:sports.noSportSelected');
      }
      return translateSport(sport, t);
    }

    const selectedWithoutNoSport = selectedSports.filter((sport) => sport !== NO_SPORT_FILTER_OPTION);
    const hasNoSportSelection = selectedSports.includes(NO_SPORT_FILTER_OPTION);

    if (selectedWithoutNoSport.length === 0 && hasNoSportSelection) {
      return t('common:sports.noSportSelected');
    }

    if (selectedWithoutNoSport.length > 0 && selectedWithoutNoSport.length <= 2 && !hasNoSportSelection) {
      return selectedWithoutNoSport.map(sport => translateSport(sport, t)).join(', ');
    }

    return t('coach.selectedCount', { count: selectedSports.length });
  }, [selectedSports, t]);

  const handleSportSelectionChange = useCallback((sport: string, isChecked: boolean) => {
    setSelectedSports((previous) => {
      const next = new Set(previous);
      if (isChecked) {
        next.add(sport);
      } else {
        next.delete(sport);
      }
      return Array.from(next);
    });
  }, []);

  // Memoized handler functions - prevents unnecessary re-renders of child components
  const handleViewAthleteDetails = useCallback((athlete: Athlete) => {
    try {
      errorLogger.addBreadcrumb(`Viewing athlete details: ${athlete.name}`, 'action');
      setSelectedAthlete(athlete);
      setIsAthleteModalOpen(true);
    } catch (error) {
      errorLogger.logComponentError(error as Error, 'CoachDashboard', {
        action: 'view_athlete_details',
        athleteId: athlete.id
      });
    }
  }, []);

  const handleViewAthleteCalendar = useCallback((athlete: Athlete) => {
    try {
      errorLogger.addBreadcrumb(`Viewing athlete calendar: ${athlete.name}`, 'action');
      // Navigate to calendar with athlete filter
      if (onNavigate) {
        onNavigate('calendar', {
          athleteFilter: {
            id: athlete.id,
            name: athlete.name,
            sport: athlete.sports[0]
          }
        });
      }
    } catch (error) {
      errorLogger.logComponentError(error as Error, 'CoachDashboard', {
        action: 'view_athlete_calendar',
        athleteId: athlete.id
      });
    }
  }, [onNavigate]);

  const handlePromptRemoveAthlete = useCallback((athlete: Athlete) => {
    setAthleteToRemove(athlete);
    setShowRemoveConfirm(true);
  }, []);

  const handleCancelRemoveAthlete = useCallback(() => {
    if (isRemovingAthlete) {
      return;
    }

    setShowRemoveConfirm(false);
    setAthleteToRemove(null);
  }, [isRemovingAthlete]);

  const handleConfirmRemoveAthlete = useCallback(async () => {
    if (!athleteToRemove) {
      return;
    }

    try {
      setIsRemovingAthlete(true);
      await userService.removeCoachAssignment({ athleteId: athleteToRemove.id });

      toast.success(t('coach.removeAthlete.successToast', { name: athleteToRemove.name }));

      queryClient.invalidateQueries(['coach', 'athletes', user.id]);
      await refetchConnectedAthletes();

    } catch (error) {
      const message = error instanceof Error ? error.message : t('coach.removeAthlete.errorToast');
      toast.error(message);
      errorLogger.logComponentError(error as Error, 'CoachDashboard', {
        action: 'remove_athlete',
        athleteId: athleteToRemove.id
      });
    } finally {
      setIsRemovingAthlete(false);
      setShowRemoveConfirm(false);
      setAthleteToRemove(null);
    }
  }, [athleteToRemove, user.id, refetchConnectedAthletes, t]);

  const handleCloseAthleteModal = useCallback(() => {
    setIsAthleteModalOpen(false);
    setSelectedAthlete(null);
  }, []);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {t('coach.welcome', { name: user.firstName })}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('coach.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setIsAddAthleteModalOpen(true)}
          className="mt-4 md:mt-0 bg-primary text-primary-foreground hover:bg-primary/90 text-[14px] rounded-[8px] px-[14px] py-[7px] text-center"
        >
          <Plus size={20} className="mr-2" />
          {t('actions.addAthlete')}
        </Button>
      </div>

      <LoadingOverlay
        loading={isLoading}
        overlay
        skeleton={<div className="p-6 text-sm text-muted-foreground">{t('coach.loading')}</div>}
      >
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('coach.stats.totalAthletes')}</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{coachStats.totalAthletes}</p>
             <p className="text-xs text-muted-foreground">{t('coach.stats.trained')}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-lg">
              <Users size={24} className="text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('coach.stats.activeAthletes')}</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{coachStats.activeAthletes}</p>
             <p className="text-xs text-muted-foreground">{t('coach.stats.lastMonth')}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Target size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('coach.stats.athletesTrainings')}</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{coachStats.upcomingTrainings}</p>
             <p className="text-xs text-muted-foreground">{t('coach.stats.next30Days')}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Activity size={24} className="text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('coach.stats.upcomingRaces')}</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{coachStats.totalEvents}</p>
             <p className="text-xs text-muted-foreground">{t('coach.stats.nextMonth')}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Trophy size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        {/* Quick Actions */}
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 md:mb-6">{t('coach.quickActions')}</h2>
          <div className="space-y-3">
            <button
              onClick={onAddEvent}
              className="w-full flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={20} />
              <span className="font-medium" style={{ textTransform: 'none', letterSpacing: '0px' }}>{t('actions.addEvent')}</span>
            </button>

            <button
              onClick={() => onNavigate?.('calendar')}
              className="w-full flex items-center gap-3 p-4 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <CalendarDays size={20} />
              <span className="font-medium" style={{ textTransform: 'none', letterSpacing: '0px' }}>{t('actions.viewCalendar')}</span>
            </button>

            <button
              onClick={() => onNavigate?.('metrics')}
              className="w-full flex items-center gap-3 p-4 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <Target size={20} />
              <span className="font-medium" style={{ textTransform: 'none', letterSpacing: '0px' }}>{t('actions.metricsCalculator')}</span>
            </button>

            {/* Coming Soon Features for Mobile */}
          <div className="md:hidden space-y-3 pt-2 border-t border-border/20">
            <button
              onClick={() => onNavigate?.('coach')}
              className="w-full flex items-center gap-3 p-4 bg-chart-1/10 text-foreground rounded-lg hover:bg-chart-1/20 transition-colors active:scale-95 relative"
            >
              <UserCheck size={20} className="text-chart-1" />
              <span className="font-medium text-sm" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {t('common:myCoach')}
              </span>
              <span className="ml-auto text-xs bg-chart-1 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {t('coach.soon')}
              </span>
            </button>

            <button
              onClick={() => onNavigate?.('device-sync')}
              className="w-full flex items-center gap-3 p-4 bg-chart-2/10 text-foreground rounded-lg hover:bg-chart-2/20 transition-colors active:scale-95 relative"
            >
              <Smartphone size={20} className="text-chart-2" />
              <span className="font-medium text-sm" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {t('common:deviceSync')}
              </span>
              <span className="ml-auto text-xs bg-chart-1 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {t('coach.soon')}
              </span>
            </button>
          </div>
            
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 md:mb-6">{t('coach.recentActivity')}</h2>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('coach.noRecentActivity')}</p>
            ) : recentActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                showAthlete={true}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Athletes Table */}
      <div className="bg-white rounded-xl border border-border/20 shadow-sm">
        {/* Search and Filter */}
        <div className="p-4 md:p-6 border-b border-border/20">
          <div className="flex flex-col sm:flex-row gap-4 justify-between">
            <div className="relative flex-1 max-w-md">
              <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('coach.athleteTable.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="px-3 py-2 bg-muted text-foreground rounded-lg border border-border/20 text-sm min-h-[44px] flex items-center justify-between gap-2"
                >
                  <span>{sportFilterLabel}</span>
                  <ChevronDown size={16} className="text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('coach.athleteTable.filterBySport')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {sportFilterData.sportOptions.length === 0 && !sportFilterData.hasNoSportOption ? (
                  <DropdownMenuItem disabled>{t('coach.athleteTable.noSportsAvailable')}</DropdownMenuItem>
                ) : (
                  <>
                    {sportFilterData.sportOptions.map((sport) => (
                      <DropdownMenuCheckboxItem
                        key={sport}
                        checked={selectedSports.includes(sport)}
                        onCheckedChange={(checked) => handleSportSelectionChange(sport, Boolean(checked))}
                      >
                        {translateSport(sport, t)}
                      </DropdownMenuCheckboxItem>
                    ))}
                    {sportFilterData.hasNoSportOption && (
                      <DropdownMenuCheckboxItem
                        key="no-sport-selected"
                        checked={selectedSports.includes(NO_SPORT_FILTER_OPTION)}
                        onCheckedChange={(checked) => handleSportSelectionChange(NO_SPORT_FILTER_OPTION, Boolean(checked))}
                      >
                        {t('common:sports.noSportSelected')}
                      </DropdownMenuCheckboxItem>
                    )}
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    setSelectedSports([]);
                  }}
                >
                  {t('coach.athleteTable.clearFilters')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-border/20">
              <tr>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('coach.athleteTable.athlete')}
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('coach.athleteTable.sport')}
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('coach.athleteTable.status')}
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('coach.athleteTable.upcomingEvents')}
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('coach.athleteTable.completionRate')}
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('coach.athleteTable.lastActivity')}
                </th>
                <th className="px-4 md:px-6 py-3 text-left text-xs font-medium text-muted-foreground" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('coach.athleteTable.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-border/20">
              {filteredAthletes.map((athlete) => (
                <AthleteTableRow 
                  key={athlete.id} 
                  athlete={athlete} 
                  onViewDetails={handleViewAthleteDetails}
                  onViewCalendar={handleViewAthleteCalendar}
                  onRemoveAthlete={handlePromptRemoveAthlete}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </LoadingOverlay>

      <DeleteConfirmation
        open={showRemoveConfirm && Boolean(athleteToRemove)}
        title={t('coach.removeAthlete.title')}
        description={athleteToRemove ? t('coach.removeAthlete.message', { name: athleteToRemove.name }) : t('coach.removeAthlete.message', { name: t('coach.athleteTable.athlete') })}
        onCancel={handleCancelRemoveAthlete}
        onConfirm={handleConfirmRemoveAthlete}
        confirmLabel={isRemovingAthlete ? t('coach.removeAthlete.removing') : t('coach.removeAthlete.confirm')}
        cancelLabel={t('coach.removeAthlete.cancel')}
        confirming={isRemovingAthlete}
      />

      {/* Add Athlete Modal */}
      <AddAthleteModal
        isOpen={isAddAthleteModalOpen}
        onClose={() => setIsAddAthleteModalOpen(false)}
        coachName={`${user.firstName} ${user.lastName}`}
        coachCode={user.coachId}
      />

      {/* Athlete Details Modal */}
      {isAthleteModalOpen && selectedAthlete && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={(e) => {
            // Close modal when clicking on backdrop
            if (e.target === e.currentTarget) {
              setIsAthleteModalOpen(false);
              setSelectedAthlete(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center overflow-hidden">
                  {selectedAthlete.avatarUrl ? (
                    <img
                      src={selectedAthlete.avatarUrl}
                      alt={t('coach.athleteModal.profileAlt', { name: selectedAthlete.name })}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                      {selectedAthlete.initials}
                    </span>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground mb-1" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                    {selectedAthlete.name}
                  </h2>
                  <p className="text-sm text-muted-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                    {selectedAthlete.username ? `@${selectedAthlete.username}` : selectedAthlete.email}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseAthleteModal}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} className="text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-8 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                  {t('coach.athleteModal.contactInfo')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail size={16} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground truncate">{selectedAthlete.email}</span>
                  </div>
                  <div className="flex items-center gap-3 min-w-0">
                    <Phone size={16} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground truncate">{selectedAthlete.phone ?? t('coach.athleteModal.notProvided')}</span>
                  </div>

                </div>
              </div>

              {/* Performance Metrics */}
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                  {t('coach.athleteModal.performanceMetrics')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: t('coach.athleteModal.mas'), value: selectedAthlete.mas },
                    { label: t('coach.athleteModal.fpp'), value: selectedAthlete.fpp },
                    { label: t('coach.athleteModal.css'), value: selectedAthlete.cssDisplay ?? selectedAthlete.css }
                  ].map((metric) => (
                    <div key={metric.label} className="p-4 bg-muted/30 rounded-xl border border-border/20">
                      <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">{metric.label}</p>
                      <p className="text-lg font-semibold text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                        {metric.value !== undefined && metric.value !== null && String(metric.value).trim() !== '' ? metric.value : t('coach.athleteModal.notSet')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sports */}
              {selectedAthlete.sports.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                    {t('coach.athleteModal.sports')}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {selectedAthlete.sports.map((sport, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium"
                        style={{ textTransform: 'none', letterSpacing: '0px' }}
                      >
                        {translateSport(sport, t)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Athletic Profile */}
              {(selectedAthlete.yearsTraining !== undefined && selectedAthlete.yearsTraining !== null) || selectedAthlete.bio ? (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                    {t('coach.athleteModal.athleticProfile')}
                  </h3>
                  <div className="space-y-3">
                    {selectedAthlete.yearsTraining !== undefined && selectedAthlete.yearsTraining !== null && (
                      <p className="text-sm text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                        <span className="font-semibold">{t('coach.athleteModal.yearsOfTraining')}</span> <span className="text-muted-foreground">{selectedAthlete.yearsTraining || t('coach.athleteModal.notProvided')}</span>
                      </p>
                    )}
                    {selectedAthlete.bio && (
                      <p className="text-sm text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                        <span className="font-semibold">{t('coach.athleteModal.about')}</span> <span className="text-muted-foreground">{selectedAthlete.bio || t('coach.athleteModal.noDescription')}</span>
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Achievements */}
              {selectedAthlete.achievements && selectedAthlete.achievements.length > 0 ? (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                    {t('coach.athleteModal.achievements')}
                  </h3>
                  <div className="space-y-3">
                    {selectedAthlete.achievements.map((achievement, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <Award size={16} className="text-muted-foreground flex-shrink-0" />
                        <span className="text-sm text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                          {achievement}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                    {t('coach.athleteModal.achievements')}
                  </h3>
                  <p className="text-sm text-muted-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                    {t('coach.athleteModal.noAchievements')}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
