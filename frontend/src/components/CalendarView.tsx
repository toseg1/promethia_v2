import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  Grid3X3,
  List
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { EventModal } from './EventModal';
import { CalendarGrid } from './CalendarGrid';
import { WeekView } from './WeekView';
import { EventDetailsModal, CalendarEvent, TrainingEventDetails } from './EventDetailsModal';
import { LoadingOverlay } from './ui/SkeletonLoader';
import { User, TrainingEvent } from '../types';
import { queryClient, queryKeys, useQuery, useCalendarEvents, useConnectedAthletes, useOptimisticMutation } from '../hooks';
import { eventService, trainingService } from '../services';
import { mapTrainingDataToBlocks } from '../services/eventNormalization';
import type { UpdateCalendarEventPayload } from '../services/eventService';
import { parseLocalDate } from '../utils/dateUtils';
import { getMonthNames, formatDateRange } from '../utils/localeFormat';

interface CalendarViewProps {
  user: User;
  userRole: string;
  onEditEvent?: (event: TrainingEvent) => void;
  initialAthleteFilter?: {
    id: string;
    name: string;
    sport?: string;
  };
}

interface Athlete {
  id: string;
  name: string;
  sport: string;
}

interface CalendarDisplayEvent {
  id: string;
  sourceId: string;
  title: string;
  type: 'training' | 'race' | 'custom';
  sport: string;
  date: Date;
  endDate?: Date;
  time?: string;
  duration?: number;
  location?: string;
  description?: string;
  notes?: string;
  athlete?: string;
  athleteId?: string;
  distance?: string;
  color: string;
}

type ViewMode = 'month' | 'week';
type FilterType = 'all' | 'training' | 'race' | 'custom';

function parseDurationMinutes(duration?: string | null): number | undefined {
  if (!duration) {
    return undefined;
  }

  if (duration.startsWith('P')) {
    const hours = parseInt(duration.match(/(\d+)H/)?.[1] ?? '0', 10);
    const minutes = parseInt(duration.match(/(\d+)M/)?.[1] ?? '0', 10);
    const seconds = parseInt(duration.match(/(\d+)S/)?.[1] ?? '0', 10);
    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes + Math.round(seconds / 60);
  }

  const numeric = Number(duration);
  return Number.isNaN(numeric) ? undefined : numeric;
}

export const CalendarView = memo(function CalendarView({ user, userRole, onEditEvent, initialAthleteFilter }: CalendarViewProps) {
  const { t } = useTranslation(['calendar', 'common']);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedAthlete, setSelectedAthlete] = useState<string>(initialAthleteFilter?.id || 'all');
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDisplayEvent, setSelectedDisplayEvent] = useState<CalendarDisplayEvent | null>(null);
  const [isEventDetailsOpen, setIsEventDetailsOpen] = useState(false);
  const [isEventLoading, setIsEventLoading] = useState(false);

  const isCoach = userRole === 'coach';

  const {
    data: connectedAthletes,
    loading: athletesLoading
  } = useConnectedAthletes(isCoach ? user.id : null, isCoach);

  const athleteOptions: Athlete[] = useMemo(() => {
    const apiAthletes = (connectedAthletes || []).map((athlete) => ({
      id: athlete.id,
      name: `${athlete.firstName ?? ''} ${athlete.lastName ?? ''}`.trim() || athlete.username || t('eventModal.unknownAthlete'),
      sport: athlete.performanceMetrics?.primarySport || athlete.role || t('common:athlete')
    }));

    if (initialAthleteFilter && !apiAthletes.find(a => a.id === initialAthleteFilter.id)) {
      return [
        ...apiAthletes,
        {
          id: initialAthleteFilter.id,
          name: initialAthleteFilter.name,
          sport: initialAthleteFilter.sport || t('eventModal.unknownAthlete')
        }
      ];
    }

    return apiAthletes;
  }, [connectedAthletes, initialAthleteFilter, t]);

  const monthNames = useMemo(() => getMonthNames(), [t]);

  const period = useMemo(() => {
    if (viewMode === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }

    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday as first day
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [currentDate, viewMode]);

  const fetchStart = useMemo(() => {
    const start = new Date(period.start);
    start.setDate(start.getDate() - 14);
    return start;
  }, [period.start]);

  // Enhanced calendar events query with polling for real-time updates
  const {
    data: rawCalendarEvents,
    loading: eventsLoading,
    error: eventsError,
    isFetching: isEventsFetching,
    refetch: refetchCalendarEvents
  } = useQuery(
    queryKeys.calendar.events(fetchStart, period.end),
    () => eventService.getCalendarEvents({ dateAfter: fetchStart, dateBefore: period.end }),
    {
      enabled: true,
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchOnWindowFocus: true,
      refetchInterval: 30000, // Poll every 30 seconds for real-time updates
      refetchIntervalInBackground: false // Don't poll when tab is not visible
    }
  );

  // Optimistic mutation for saving events (create/update)
  const saveEventMutation = useOptimisticMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        return await eventService.updateCalendarEvent(payload as UpdateCalendarEventPayload);
      } else {
        const { id: _unusedId, ...createPayload } = payload;
        return await eventService.createCalendarEvent(createPayload);
      }
    },
    queryKeysToUpdate: [queryKeys.calendar.events(fetchStart, period.end)],
    optimisticUpdater: (oldEvents, newEvent) => {
      if (!oldEvents) return oldEvents;

      const events = oldEvents as any[];

      if (newEvent.id) {
        // Update existing event
        return events.map(event =>
          event.id === newEvent.id
            ? { ...event, ...newEvent, __optimistic: true }
            : event
        );
      } else {
        // Add new event with temporary ID
        const tempEvent = {
          ...newEvent,
          id: `temp-${Date.now()}`,
          __optimistic: true
        };
        return [...events, tempEvent];
      }
    },
    onSuccess: () => {
      setIsEventModalOpen(false);
      setSelectedDate(null);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Event saved successfully with optimistic update');
      }
    },
    onError: (error) => {
      console.error('❌ Failed to save event:', error);
      // You could show a toast notification here
    },
    invalidateEntities: ['calendar', 'dashboard', 'training']
  });

  // Optimistic mutation for deleting events
  const deleteEventMutation = useOptimisticMutation({
    mutationFn: async ({ eventType, eventId }: { eventType: string; eventId: string }) => {
      return await eventService.deleteCalendarEvent(eventType as 'training' | 'race' | 'custom', eventId);
    },
    queryKeysToUpdate: [queryKeys.calendar.events(fetchStart, period.end)],
    optimisticUpdater: (oldEvents, { eventId }) => {
      if (!oldEvents) return oldEvents;
      const events = oldEvents as any[];
      return events.filter(event => event.id !== eventId);
    },
    onSuccess: () => {
      setIsEventDetailsOpen(false);
      setSelectedEvent(null);
      setSelectedDisplayEvent(null);
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Event deleted successfully with optimistic update');
      }
    },
    onError: (error) => {
      console.error('❌ Failed to delete event:', error);
    },
    invalidateEntities: ['calendar', 'dashboard', 'training']
  });

  const calendarEvents: CalendarDisplayEvent[] = useMemo(() => {
    const sportColors: Record<string, string> = {
      running: '#ef4444',
      cycling: '#10b981',
      swimming: '#3b82f6',
      strength: '#8b5cf6',
      custom: '#6366f1',
      other: '#6366f1'
    };

    const athleteNameLookup = new Map<string, string>();
    athleteOptions.forEach((athlete) => {
      athleteNameLookup.set(athlete.id, athlete.name);
    });

    const isCoachView = userRole === 'coach';
    const viewStart = new Date(period.start);
    viewStart.setHours(0, 0, 0, 0);
    const viewEnd = new Date(period.end);
    viewEnd.setHours(23, 59, 59, 999);

    const expandedEvents: CalendarDisplayEvent[] = [];

    (rawCalendarEvents || []).forEach((event) => {
      const athleteId = event.athleteId;

      if (isCoachView && athleteId === user.id) {
        return;
      }

      const eventStart = parseLocalDate(event.date);
      if (!eventStart) return;
      eventStart.setHours(0, 0, 0, 0);
      const eventEnd = event.dateEnd ? parseLocalDate(event.dateEnd) : parseLocalDate(event.date);
      if (!eventEnd) return;
      eventEnd.setHours(0, 0, 0, 0);

      const loopStart = new Date(Math.max(eventStart.getTime(), viewStart.getTime()));
      const loopEnd = new Date(Math.min(eventEnd.getTime(), viewEnd.getTime()));
      if (loopStart > loopEnd) {
        return;
      }

      const sportKey = (event.sport || event.type || 'other').toLowerCase();
      const baseColor = event.color || sportColors[sportKey] || sportColors.other;
      const color = event.type === 'race' ? '#FFDF00' : baseColor;
      const athleteName = athleteId
        ? athleteNameLookup.get(athleteId) || (athleteId === user.id ? `${user.firstName} ${user.lastName}` : event.athleteName)
        : event.athleteName;

      const current = new Date(loopStart);
      const finalDay = new Date(loopEnd);
      const eventStartISO = parseLocalDate(event.date);
      if (!eventStartISO) return;
      const eventStartDay = eventStartISO.toISOString().split('T')[0];
      const eventStartTime = eventStartISO.toISOString().split('T')[1]?.slice(0, 5);

      while (current <= finalDay) {
        const dayISO = current.toISOString().split('T')[0];
        const dayDate = new Date(current);

        expandedEvents.push({
          id: `${event.type}-${event.id}-${dayISO}`,
          sourceId: event.id,
          title: event.title,
          type: event.type,
          date: dayDate,
          endDate: finalDay,
          time: dayISO === eventStartDay ? eventStartTime : undefined,
          sport: event.sport || event.type,
          location: event.location,
          description: event.description ?? event.notes ?? '',
          notes: event.notes ?? '',
          distance: event.distance,
          athlete: athleteName,
          athleteId,
          color,
          duration: undefined
        });

        current.setDate(current.getDate() + 1);
      }
    });

    if (!isCoachView) {
      return expandedEvents.filter(event => !event.athleteId || event.athleteId === user.id);
    }

    return expandedEvents;
  }, [rawCalendarEvents, athleteOptions, userRole, user.id, user.firstName, user.lastName, period.start, period.end]);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
      return newDate;
    });
  };

  // Single click on date - just select the day
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
  };

  // Double click on date - open create event modal
  const handleDateDoubleClick = (date: Date) => {
    setSelectedDate(date);
    setIsEventModalOpen(true);
  };

  // Click on event - open event details
  const handleEventClick = useCallback((event: CalendarDisplayEvent, e: React.MouseEvent) => {
    e.stopPropagation();

    if (isEventLoading || saveEventMutation.isLoading || deleteEventMutation.isLoading) {
      return;
    }

    const baseDetails: CalendarEvent = {
      id: event.sourceId,
      type: event.type,
      title: event.title,
      date: event.date,
      time: event.time,
      location: event.location,
      description: event.description,
      duration: event.duration,
      notes: event.notes,
      athlete: event.athlete,
      athleteName: event.athlete,
      sport: event.sport,
      dateEnd: event.endDate ? event.endDate.toISOString().split('T')[0] : undefined,
      color: event.color,
      ...(event.type === 'race' ? { raceDistance: event.distance, distance: event.distance } : {}),
      ...(event.type === 'custom' ? { customEventColor: event.color } : {})
    };

    const openModalWithEvent = (details: CalendarEvent) => {
      setSelectedEvent(details);
      setSelectedDisplayEvent(event);
      setIsEventDetailsOpen(true);
    };

    if (event.type === 'training') {
      setIsEventLoading(true);
      (async () => {
        try {
          const training = await trainingService.getTrainingEventById(event.sourceId);
          const durationMinutes = parseDurationMinutes(training.duration) ?? baseDetails.duration;
          const trainingBlocks = mapTrainingDataToBlocks(training.training_data);

          const trainingDetails: TrainingEventDetails = {
            id: String(training.id ?? baseDetails.id),
            type: 'training',
            title: training.title ?? baseDetails.title,
            date: parseLocalDate(training.date ?? baseDetails.date) || new Date(),
            time: training.time || baseDetails.time,
            startTime: training.start_time || baseDetails.startTime,
            endTime: training.end_time || baseDetails.endTime,
            dateStart: training.date_start || baseDetails.dateStart,
            dateEnd: training.date_end || baseDetails.dateEnd,
            duration: durationMinutes,
            location: training.location || baseDetails.location,
            description: training.description || training.notes || baseDetails.description,
            notes: training.notes || training.training_data?.notes || baseDetails.notes,
            trainingBlocks,
            coach: training.coach_name || training.coach || undefined,
            sport: training.sport || baseDetails.sport,
            athlete: training.athlete_name || baseDetails.athlete || baseDetails.athleteName,
            athleteName: training.athlete_name || baseDetails.athlete || baseDetails.athleteName,
            trainingName: training.training_name || training.training_data?.name || baseDetails.trainingName
          };

          openModalWithEvent(trainingDetails);
        } catch (error) {
          console.error('Failed to load training event details', error);
          openModalWithEvent(baseDetails);
        } finally {
          setIsEventLoading(false);
        }
      })();
      return;
    }

    openModalWithEvent(baseDetails);
  }, [isEventLoading, saveEventMutation.isLoading, deleteEventMutation.isLoading]);

  const handleEventMove = (eventId: string, newDate: Date) => {
    console.log(`Moving event ${eventId} to ${newDate.toDateString()}`);
    // Here you would typically update the event in your state management or API
    // For now, we'll just log it - in a real app, this would update the event's date
    // You could also show a toast notification here
  };

  const handleDeleteSelectedEvent = useCallback(async (calendarEvent: CalendarEvent) => {
    if (!calendarEvent.id) {
      return;
    }

    // Use optimistic mutation for instant feedback
    deleteEventMutation.mutate({
      eventType: calendarEvent.type,
      eventId: calendarEvent.id
    });
  }, [deleteEventMutation]);

  const getCurrentPeriodLabel = useCallback(() => {
    if (viewMode === 'month') {
      return `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    } else {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      return formatDateRange(startOfWeek, endOfWeek);
    }
  }, [currentDate, viewMode, monthNames]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 md:mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>

        <button
          onClick={() => setIsEventModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors active:scale-95"
        >
          <Plus size={20} />
          <span className="font-medium text-sm md:text-base" style={{ textTransform: 'none', letterSpacing: '0px' }}>{t('addEvent')}</span>
        </button>
      </div>

      {/* Calendar Controls */}
      <div className="bg-white p-3 md:p-4 rounded-xl border border-border/20 shadow-sm mb-4 md:mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-4">
          {/* Date Navigation - Centered on mobile */}
          <div className="flex items-center justify-center md:justify-start gap-4">
            <button
              onClick={() => viewMode === 'month' ? navigateMonth('prev') : navigateWeek('prev')}
              className="p-3 md:p-2 hover:bg-muted rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronLeft size={20} />
            </button>
            
            <h2 className="text-lg md:text-xl font-semibold text-foreground min-w-0 text-center md:text-left">
              {getCurrentPeriodLabel()}
            </h2>
            
            <button
              onClick={() => viewMode === 'month' ? navigateMonth('next') : navigateWeek('next')}
              className="p-3 md:p-2 hover:bg-muted rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* View Controls - Stacked vertically on mobile, horizontal on desktop */}
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
            {/* Filters Row - Side by side on mobile */}
            <div className="flex gap-2">
              {/* Athlete Filter (Coach Only) */}
              {isCoach && (
                <select
                  value={selectedAthlete}
                  onChange={(e) => setSelectedAthlete(e.target.value)}
                  className="flex-1 md:flex-none px-3 py-2 bg-muted text-foreground rounded-lg border border-border/20 text-sm min-h-[44px]"
                  disabled={athletesLoading}
                >
                  <option value="all">{t('filters.allAthletes')}</option>
                  {athleteOptions.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Event Type Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="flex-1 md:flex-none px-3 py-2 bg-muted text-foreground rounded-lg border border-border/20 text-sm min-h-[44px]"
              >
                <option value="all">{t('filters.allEvents')}</option>
                <option value="training">{t('filters.training')}</option>
                <option value="race">{t('filters.races')}</option>
                <option value="custom">{t('filters.custom')}</option>
              </select>
            </div>

            {/* View Mode Toggle - Centered on mobile */}
            <div className="flex bg-muted rounded-lg p-1 mx-auto md:mx-0">
              <button
                onClick={() => setViewMode('month')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors min-h-[42px] ${
                  viewMode === 'month'
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid3X3 size={16} />
                <span className="text-sm font-medium">{t('viewModes.month')}</span>
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors min-h-[42px] ${
                  viewMode === 'week'
                    ? 'bg-white text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <List size={16} />
                <span className="text-sm font-medium">{t('viewModes.week')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Content */}
      <div className="bg-white rounded-xl border border-border/20 shadow-sm overflow-hidden">
        {eventsError ? (
          <div className="p-6 text-sm text-destructive">
            {t('errorLoading')}
          </div>
        ) : (
          <LoadingOverlay
            loading={eventsLoading}
            skeleton={<div className="p-6 text-sm text-muted-foreground">{t('loading')}</div>}
            overlay
          >
            {viewMode === 'month' ? (
              <CalendarGrid 
                events={calendarEvents}
                currentDate={currentDate}
                filter={filter}
                selectedAthlete={selectedAthlete}
                onDateClick={handleDateClick}
                onDateDoubleClick={handleDateDoubleClick}
                onEventClick={handleEventClick}
                onEventMove={handleEventMove}
                selectedDate={selectedDate}
                userRole={userRole}
              />
            ) : (
              <WeekView 
                events={calendarEvents}
                currentDate={currentDate}
                filter={filter}
                selectedAthlete={selectedAthlete}
                onDateClick={handleDateClick}
                onDateDoubleClick={handleDateDoubleClick}
                onEventClick={handleEventClick}
                selectedDate={selectedDate}
                userRole={userRole}
              />
            )}
          </LoadingOverlay>
        )}
      </div>

      {/* Event Modal */}
      {isEventModalOpen && (
        <EventModal
          isOpen={isEventModalOpen}
          onClose={() => {
            if (!saveEventMutation.isLoading) {
              setIsEventModalOpen(false);
              setSelectedDate(null);
            }
          }}
          onSave={async (event) => {
            const payload = {
              ...event,
              athlete: userRole === 'coach' ? event.athlete : undefined,
            };

            // Use optimistic mutation for instant feedback
            await saveEventMutation.mutateAsync(payload);
          }}
          onDelete={async (event) => {
            if (!event.id || !event.type) {
              return;
            }

            // Use optimistic mutation for instant feedback
            await deleteEventMutation.mutateAsync({
              eventType: event.type,
              eventId: event.id
            });
          }}
          selectedDate={selectedDate || new Date()}
          userRole={userRole}
        />
      )}

      {/* Event Details Modal */}
      <EventDetailsModal
        event={selectedEvent}
        isOpen={isEventDetailsOpen}
        viewerRole={userRole}
        onClose={() => {
          setIsEventDetailsOpen(false);
          setSelectedEvent(null);
          setSelectedDisplayEvent(null);
        }}
        onEdit={(event) => {
          if (onEditEvent) {
            const normalizedType: 'training' | 'race' | 'custom' =
              event.type === 'race'
                ? 'race'
                : event.type === 'custom'
                  ? 'custom'
                  : 'training';

            const trainingEvent: TrainingEvent = {
              id: event.id,
              title: event.title,
              description: event.description,
              date: event.date,
              startTime: event.time,
              endTime: undefined,
              type: normalizedType,
              sport: event.sport,
              location: event.location,
              duration: event.duration,
              intensity: undefined,
              notes: event.notes,
              completed: false,
              createdBy: event.athleteId || user.id,
              createdAt: event.date,
              updatedAt: event.date,
              // Include training blocks if available
              trainingBlocks: (event as any).trainingBlocks,
              // Include race-specific fields
              athlete: event.athleteId,
              distance: event.distance,
              timeObjective: event.timeObjective,
              dateStart: event.dateStart,
              dateEnd: event.dateEnd,
              raceCategory: event.raceCategory,
              // Include color information from the original display event
              customEventColor: selectedDisplayEvent?.color,
              color: selectedDisplayEvent?.color
            };
            onEditEvent(trainingEvent);
          }
          setIsEventDetailsOpen(false);
          setSelectedEvent(null);
          setSelectedDisplayEvent(null);
        }}
        onDelete={handleDeleteSelectedEvent}
      />
    </div>
  );
});
