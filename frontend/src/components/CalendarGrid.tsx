import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, Trophy, Calendar, Bike, Waves, Footprints, Star } from 'lucide-react';
import { getWeekdayNames, formatTime } from '../utils/localeFormat';

interface CalendarGridProps {
  events: Event[];
  currentDate: Date;
  filter: string;
  selectedAthlete: string;
  onDateClick: (date: Date) => void;
  onDateDoubleClick: (date: Date) => void;
  onEventClick: (event: Event, e: React.MouseEvent) => void;
  onEventMove?: (eventId: string, newDate: Date) => void;
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
  athlete?: string;
  athleteId?: string;
  color: string;
}

export function CalendarGrid({ events, currentDate, filter, selectedAthlete, onDateClick, onDateDoubleClick, onEventClick, onEventMove, selectedDate, userRole }: CalendarGridProps) {
  const { t } = useTranslation('calendar');
  const [draggedEvent, setDraggedEvent] = useState<Event | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const filteredEvents = events.filter(event => {
    // Filter by event type
    const typeMatch = filter === 'all' || event.type === filter;
    
    // Filter by athlete (only for coaches)
    const athleteMatch = userRole !== 'coach' || 
                        selectedAthlete === 'all' || 
                        event.athleteId === selectedAthlete;
    
    return typeMatch && athleteMatch;
  });

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    // Get the day of the week (0 = Sunday, 1 = Monday, etc.)
    const day = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    // Convert to Monday-first format (Monday = 0, Sunday = 6)
    return day === 0 ? 6 : day - 1;
  };

  const getEventsForDate = (date: Date) => {
    return filteredEvents.filter(event => 
      event.date.getDate() === date.getDate() &&
      event.date.getMonth() === date.getMonth() &&
      event.date.getFullYear() === date.getFullYear()
    );
  };

  const getEventIcon = (event: Event) => {
    if (event.type === 'race') {
      return <Trophy size={12} />;
    }

    if (event.type === 'custom') {
      return <Star size={12} />;
    }

    switch ((event.sport || '').toLowerCase()) {
      case 'running':
        return <Footprints size={12} />;
      case 'cycling':
        return <Bike size={12} />;
      case 'swimming':
        return <Waves size={12} />;
      default:
        return <Target size={12} />;
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, event: Event) => {
    e.stopPropagation();
    setDraggedEvent(event);
    e.dataTransfer.setData('text/plain', event.sourceId || event.id);
    e.dataTransfer.effectAllowed = 'move';
    
    // Create custom drag image
    const dragElement = e.currentTarget as HTMLElement;
    const rect = dragElement.getBoundingClientRect();
    e.dataTransfer.setDragImage(dragElement, rect.width / 2, rect.height / 2);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only clear drag over if we're leaving the day cell entirely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const { clientX, clientY } = e;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      setDragOverDate(null);
    }
  };

  const handleDrop = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.stopPropagation();
    
    const eventId = draggedEvent?.sourceId || draggedEvent?.id || e.dataTransfer.getData('text/plain');
    if (eventId && draggedEvent && onEventMove) {
      // Check if the event is being dropped on a different date
      const originalDate = draggedEvent.date;
      const newDate = new Date(date);
      
      if (originalDate.getDate() !== newDate.getDate() || 
          originalDate.getMonth() !== newDate.getMonth() || 
          originalDate.getFullYear() !== newDate.getFullYear()) {
        onEventMove(eventId, newDate);
      }
    }
    
    setDraggedEvent(null);
    setDragOverDate(null);
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const today = new Date();

  const dayNames = useMemo(() => {
    const names = getWeekdayNames('short');
    if (names.length === 0) {
      return names;
    }
    const [sunday, ...rest] = names;
    return [...rest, sunday].map(name => name.replace(/\.$/, '').toUpperCase());
  }, [t]);
  const days = [];

  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  return (
    <div className="p-2 md:p-4">
      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(day => (
          <div key={day} className="p-1 md:p-2 text-center text-xs md:text-sm font-medium text-muted-foreground">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="h-32 p-1"></div>;
          }

          const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const events = getEventsForDate(date);
          const isToday = 
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();
          
          const isSelected = selectedDate &&
            date.getDate() === selectedDate.getDate() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getFullYear() === selectedDate.getFullYear();
          
          const isDragOver = dragOverDate &&
            date.getDate() === dragOverDate.getDate() &&
            date.getMonth() === dragOverDate.getMonth() &&
            date.getFullYear() === dragOverDate.getFullYear();

          return (
            <div
              key={`day-${day}-${index}`}
              onClick={() => onDateClick(date)}
              onDoubleClick={(e) => {
                e.preventDefault();
                onDateDoubleClick(date);
              }}
              onDragOver={(e) => handleDragOver(e, date)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, date)}
              className={`
                h-24 md:h-32 p-1 border border-border/20 hover:bg-muted/30 cursor-pointer transition-all duration-200 active:scale-95 select-none
                ${isToday ? 'bg-primary/5 border-primary/30' : 'bg-white'}
                ${isSelected ? 'bg-primary/10 border-primary/50 ring-2 ring-primary/20' : ''}
                ${isDragOver ? 'bg-green-100 border-green-400 border-2 border-dashed' : ''}
              `}
            >
              <div className={`
                text-xs md:text-sm font-medium mb-1 
                ${isToday ? 'text-primary' : 'text-foreground'}
              `}>
                {day}
              </div>
              
              <div className="space-y-1">
                {events.slice(0, 3).map(event => {
                  const tooltipDetails: string[] = [];
                  if (event.time) {
                    tooltipDetails.push(t('eventTooltip.atTime', { time: formatTime(event.time) }));
                  }
                  if (event.athlete) {
                    tooltipDetails.push(event.athlete);
                  }
                  const tooltip = `${event.title}${tooltipDetails.length ? ` • ${tooltipDetails.join(' • ')}` : ''} • ${t('eventTooltip.dragHint')}`;

                  return (
                    <div
                      key={event.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, event)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => onEventClick(event, e)}
                      className={`
                        text-xs p-1 rounded text-white truncate flex items-center gap-1 hover:opacity-80 cursor-pointer transition-all duration-200
                        ${draggedEvent?.id === event.id ? 'opacity-50 scale-95' : ''}
                        hover:scale-105 hover:shadow-lg
                      `}
                      style={{ backgroundColor: event.color }}
                      title={tooltip}
                    >
                      <div className="flex-shrink-0">
                        {getEventIcon(event)}
                      </div>
                      <span className="truncate text-xs">
                        {event.title}
                        {userRole === 'coach' && event.athlete && (
                          <span className="hidden md:block text-xs opacity-80">{event.athlete}</span>
                        )}
                      </span>
                    </div>
                  );
                })}

                {events.length > 3 && (
                  <div className="text-xs text-muted-foreground p-1">
                    {t('moreEvents', { count: events.length - 3 })}
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
