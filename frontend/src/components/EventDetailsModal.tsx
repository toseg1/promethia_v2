import React from 'react';
import { TrainingEventCard } from './TrainingEventCard';
import { RaceEventCard } from './RaceEventCard';
import { CustomEventCard } from './CustomEventCard';
import type { TrainingBlock } from './eventcards/types';

// Base event interface
interface BaseEvent {
  id: string;
  title: string;
  type: 'training' | 'race' | 'custom';
  date: Date;
  time?: string;
  startTime?: string;
  endTime?: string;
  dateStart?: string;
  dateEnd?: string;
  location?: string;
  description?: string;
  sport?: string;
  athlete?: string;
  athleteName?: string;
  athleteId?: string;
  color?: string;
  customEventColor?: string;
  notes?: string;
}

// Training event interface
export interface TrainingEventDetails extends BaseEvent {
  type: 'training';
  duration?: number;
  trainingBlocks?: TrainingBlock[];
  coach?: string;
  trainingName?: string;
}

// Race event interface
export interface RaceEventDetails extends BaseEvent {
  type: 'race';
  raceDistance?: string;
  distance?: string;
  raceCategory?: string;
  startWave?: string;
  bibNumber?: string;
  goalTime?: string;
  timeObjective?: string;
  pacePlan?: string;
  estimatedFinish?: string;
  coach?: string;
  registrationStatus?: 'registered' | 'pending' | 'waitlist';
  duration?: string;
  trainingBlocks?: TrainingBlock[];
}

// Custom event interface
export interface CustomEventDetails extends BaseEvent {
  type: 'custom';
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  attendees?: string[];
  organizer?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  reminders?: string[];
  tags?: string[];
  isAllDay?: boolean;
  duration?: string;
}

export type CalendarEvent = TrainingEventDetails | RaceEventDetails | CustomEventDetails;

interface EventDetailsModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: CalendarEvent) => void;
  onDelete?: (event: CalendarEvent) => Promise<void> | void;
  viewerRole?: string;
}

export function EventDetailsModal({ event, isOpen, onClose, onEdit, onDelete, viewerRole }: EventDetailsModalProps) {
  if (!isOpen || !event) return null;

  const handleEdit = () => {
    if (onEdit) {
      onEdit(event);
    }
    onClose();
  };

  const normalizedRole = viewerRole?.toLowerCase().trim();
  const showAthlete = normalizedRole ? normalizedRole === 'coach' : true;

  const handleDelete = async () => {
    if (!onDelete) {
      return;
    }

    await onDelete(event);
  };

  // Render the appropriate card based on event type
  switch (event.type) {
    case 'training':
      return (
        <TrainingEventCard
          event={event as TrainingEventDetails}
          onClose={onClose}
          onEdit={onEdit ? handleEdit : undefined}
          onDelete={onDelete ? handleDelete : undefined}
          showAthlete={showAthlete}
        />
      );
    
    case 'race':
      return (
        <RaceEventCard
          event={event as RaceEventDetails}
          onClose={onClose}
          onEdit={onEdit ? handleEdit : undefined}
          onDelete={onDelete ? handleDelete : undefined}
          showAthlete={showAthlete}
        />
      );
    
    case 'custom':
      return (
        <CustomEventCard
          event={event as CustomEventDetails}
          onClose={onClose}
          onEdit={onEdit ? handleEdit : undefined}
          onDelete={onDelete ? handleDelete : undefined}
          showAthlete={showAthlete}
        />
      );
    
    default:
      return null;
  }
}

// Example data for testing purposes
