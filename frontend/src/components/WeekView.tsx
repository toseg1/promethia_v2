import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Trophy, Bike, Waves, Footprints, ChevronRight, Star, Dumbbell } from 'lucide-react';
import { getWeekdayNames, formatTime, formatDuration, getCurrentLocale } from '../utils/localeFormat';

interface WeekViewProps {
  events: Event[];
  currentDate: Date;
  filter: string;
  selectedAthlete: string;
  onDateClick: (date: Date) => void;
  onDateDoubleClick: (date: Date) => void;
  onEventClick: (event: Event, e: React.MouseEvent) => void;
  selectedDate: Date | null;
  userRole: string;
}

interface Event {
  id: string;
  sourceId?: string;
  title: string;
  type: 'training' | 'race' | 'custom';
  sport: string;
  date: Date;
  time?: string;
  duration?: number; // in minutes
  athlete?: string;
  athleteId?: string;
  athleteName?: string;
  color: string;
}

export function WeekView({ events, currentDate, filter, selectedAthlete, onDateClick, onDateDoubleClick, onEventClick, selectedDate, userRole }: WeekViewProps) {
  const { t } = useTranslation('calendar');
  const [isMobile, setIsMobile] = useState(false);
  const localeTag = useMemo(() => (getCurrentLocale() === 'fr' ? 'fr-FR' : 'en-US'), [t]);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredEvents = events.filter(event => {
    // Filter by event type
    const typeMatch = filter === 'all' || event.type === filter;
    
    // Filter by athlete (only for coaches)
    const athleteMatch = userRole !== 'coach' || 
                        selectedAthlete === 'all' || 
                        event.athleteId === selectedAthlete;
    
    return typeMatch && athleteMatch;
  });

  const getWeekDays = (date: Date) => {
    const startOfWeek = new Date(date);
    // Convert to Monday-first format (Monday = 0, Sunday = 6)
    const dayOfWeek = date.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(date.getDate() - daysFromMonday);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    ).sort((a, b) => {
      if (!a.time || !b.time) return 0;
      return a.time.localeCompare(b.time);
    });
  };

const getEventIcon = (event: Event) => {
  if (event.type === 'race') {
    return <Trophy size={14} />;
  }

  if (event.type === 'custom') {
    return <Star size={14} />;
  }

  switch ((event.sport || '').toLowerCase()) {
    case 'running':
      return <Footprints size={14} />;
    case 'cycling':
      return <Bike size={14} />;
    case 'swimming':
      return <Waves size={14} />;
    case 'strenght':
      return <Dumbbell size={14} />;
    default:
      return <Target size={14} />;
  }
};

  const weekDays = getWeekDays(currentDate);
  const today = new Date();
  const dayNames = useMemo(() => {
    const names = getWeekdayNames('long');
    if (names.length === 0) {
      return names;
    }
    const [sunday, ...rest] = names;
    return [...rest, sunday];
  }, [t]);

  // Mobile Vertical Layout
  if (isMobile) {
    return (
      <div className="p-3">
        <div className="space-y-3">
          {weekDays.map((day, index) => {
            const events = getEventsForDate(day);
            const isToday = 
              day.getDate() === today.getDate() &&
              day.getMonth() === today.getMonth() &&
              day.getFullYear() === today.getFullYear();
            
            const isSelected = selectedDate &&
              day.getDate() === selectedDate.getDate() &&
              day.getMonth() === selectedDate.getMonth() &&
              day.getFullYear() === selectedDate.getFullYear();

            return (
              <div
                key={index}
                className={`
                  bg-white rounded-xl border border-border/20 shadow-sm transition-all duration-200 active:scale-[0.98] select-none
                  ${isToday ? 'border-primary/30 bg-primary/5' : ''}
                  ${isSelected ? 'border-primary/50 ring-2 ring-primary/20' : ''}
                `}
                onClick={() => onDateClick(day)}
                onDoubleClick={(e) => {
                  e.preventDefault();
                  onDateDoubleClick(day);
                }}
              >
                {/* Day Header */}
                <div className={`
                  flex items-center justify-between px-4 py-3 border-b border-border/10
                  ${isToday ? 'bg-primary/5' : 'bg-muted/20'}
                `}>
                  <div className="flex items-center gap-3">
                    <div className={`
                      text-2xl font-bold
                      ${isToday ? 'text-primary' : 'text-foreground'}
                    `}>
                      {day.getDate()}
                    </div>
                    <div>
                      <div className={`
                        text-sm font-semibold
                        ${isToday ? 'text-primary' : 'text-foreground'}
                      `} style={{ fontFamily: 'var(--font-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {dayNames[index]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {day.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {events.length > 0 && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        {t('weekView.eventCount', { count: events.length })}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </div>

                {/* Events */}
                <div className="p-4">
                  {events.length > 0 ? (
                    <div className="space-y-3">
                      {events.map(event => (
                        <div
                          key={event.id}
                          onClick={(e) => onEventClick(event, e)}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border/20 hover:border-border/40 cursor-pointer transition-all duration-200 active:scale-[0.98] bg-white"
                          style={{ borderLeftColor: event.color, borderLeftWidth: '4px' }}
                        >
                          <div 
                            className="p-2 rounded-lg text-white flex items-center justify-center"
                            style={{ backgroundColor: event.color }}
                          >
                            {getEventIcon(event)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h4 className="font-semibold text-foreground truncate text-sm" style={{ fontFamily: 'var(--font-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {event.title}
                              </h4>
                              {event.time && (
                                <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                                  {formatTime(event.time)}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {event.duration && (
                                <span className="bg-muted/50 px-2 py-1 rounded">
                                  {formatDuration(event.duration)}
                                </span>
                              )}
                              {userRole === 'coach' && event.athlete && (
                                <span className="bg-primary/10 text-primary px-2 py-1 rounded font-medium">
                                  {event.athlete}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <div className="text-sm mb-1">{t('weekView.noEvents')}</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Desktop Horizontal Layout (unchanged)
  return (
    <div className="p-2 md:p-4">
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day, index) => {
          const events = getEventsForDate(day);
          const isToday = 
            day.getDate() === today.getDate() &&
            day.getMonth() === today.getMonth() &&
            day.getFullYear() === today.getFullYear();
          
          const isSelected = selectedDate &&
            day.getDate() === selectedDate.getDate() &&
            day.getMonth() === selectedDate.getMonth() &&
            day.getFullYear() === selectedDate.getFullYear();

          return (
            <div
              key={index}
              className={`
                min-h-64 md:min-h-96 border border-border/20 p-2 md:p-3 cursor-pointer hover:bg-muted/30 transition-all duration-200 active:scale-95 select-none
                ${isToday ? 'bg-primary/5 border-primary/30' : 'bg-white'}
                ${isSelected ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20' : ''}
              `}
              onClick={() => onDateClick(day)}
              onDoubleClick={(e) => {
                e.preventDefault();
                onDateDoubleClick(day);
              }}
            >
              {/* Day Header */}
              <div className="mb-2 md:mb-3 text-center">
                <div className="text-xs text-muted-foreground font-medium">
                  {dayNames[index].substring(0, 3).toUpperCase()}
                </div>
                <div className={`
                  text-base md:text-lg font-semibold mt-1
                  ${isToday ? 'text-primary' : 'text-foreground'}
                `}>
                  {day.getDate()}
                </div>
              </div>

              {/* Events */}
              <div className="space-y-2">
                {events.map(event => (
                  <div
                    key={event.id}
                    onClick={(e) => onEventClick(event, e)}
                    className="p-2 rounded-lg text-white text-xs shadow-sm hover:opacity-80 cursor-pointer transition-opacity"
                    style={{ backgroundColor: event.color }}
                  >
                    <div className="flex items-center gap-1 mb-1">
                      <div className="hidden md:block">
                            {getEventIcon(event)}
                      </div>
                      <span className="font-medium truncate text-xs">{event.title}</span>
                    </div>
                    
                    {event.time && (
                      <div className="text-xs opacity-90">
                        {formatTime(event.time)}
                        {event.duration && (
                          <span> • {formatDuration(event.duration)}</span>
                        )}
                      </div>
                    )}
                    
                    {userRole === 'coach' && event.athlete && (
                      <div className="text-xs opacity-80 mt-1 truncate">
                        {event.athlete}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Event Hint */}
              {events.length === 0 && (
                <div className="text-center text-muted-foreground text-xs mt-8">
                  {t('weekView.noEvents')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
