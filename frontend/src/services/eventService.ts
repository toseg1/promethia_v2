import { apiClient } from './apiClient';
import { errorLogger } from './errorLogger';
import type { EventData } from '../components/eventmodal/types';
import { normalizeEventForUpdate } from './eventNormalization';
import { parseLocalDate, formatLocalDateISO } from '../utils/dateUtils';

export interface CalendarEventResponse {
  id: number;
  title: string;
  date: string;
  date_end?: string;
  event_type: 'training' | 'race' | 'custom_event';
  sport?: string;
  location?: string;
  event_color?: string;
  is_completed?: boolean;
  athlete_id?: number;
  athlete_name?: string;
  description?: string;
  notes?: string;
  distance?: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  type: 'training' | 'race' | 'custom';
  date: string;
  dateEnd?: string;
  sport?: string;
  location?: string;
  color?: string;
  isCompleted?: boolean;
  athleteId?: string;
  athleteName?: string;
  description?: string;
  notes?: string;
  distance?: string;
}

function mapCalendarEventFromApi(item: CalendarEventResponse): CalendarEvent {
  const type = item.event_type === 'custom_event' ? 'custom' : item.event_type;

  return {
    id: String(item.id),
    title: item.title,
    type,
    date: formatLocalDateISO(parseLocalDate(item.date)) || item.date,
    dateEnd: item.date_end ? (formatLocalDateISO(parseLocalDate(item.date_end)) || item.date_end) : undefined,
    sport: item.sport,
    location: item.location,
    color: item.event_color,
    isCompleted: item.is_completed,
    athleteId: item.athlete_id !== undefined ? String(item.athlete_id) : undefined,
    athleteName: item.athlete_name,
    description: item.description,
    notes: item.notes,
    distance: item.distance ?? undefined
  };
}

interface CalendarQueryParams {
  dateAfter?: Date | string;
  dateBefore?: Date | string;
  athleteId?: string;
  sport?: string;
}

export async function getCalendarEvents(params: CalendarQueryParams = {}): Promise<CalendarEvent[]> {
  try {
    const response = await apiClient.get<CalendarEventResponse[]>(`/events/calendar/`, {
      params: {
        ...(params.dateAfter
          ? { date_after: params.dateAfter instanceof Date ? params.dateAfter.toISOString() : params.dateAfter }
          : {}),
        ...(params.dateBefore
          ? { date_before: params.dateBefore instanceof Date ? params.dateBefore.toISOString() : params.dateBefore }
          : {}),
        ...(params.athleteId ? { athlete: params.athleteId } : {}),
        ...(params.sport ? { sport: params.sport } : {}),
      }
    });

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to fetch calendar events');
    }

    return response.data.map(mapCalendarEventFromApi);
  } catch (error) {
    errorLogger.logAsyncError(error as Error, 'getCalendarEvents');
    throw error;
  }
}

export type { CalendarEvent as CalendarEventModel };

export interface CreateCalendarEventPayload {
  type: 'training' | 'race' | 'custom';
  title?: string;
  date?: string;
  dateStart?: string;
  dateEnd?: string;
  time?: string;
  duration?: string;
  sport?: string;
  location?: string;
  description?: string;
  notes?: string;
  athlete?: string;
  trainingBlocks?: Record<string, unknown>[];
  distance?: string;
  timeObjective?: string;
  customEventColor?: string;
}

export async function createCalendarEvent(payload: CreateCalendarEventPayload) {
  try {
    // Log the payload for debugging
    console.log('📤 Creating calendar event with payload:', payload);

    const response = await apiClient.post(`/events/`, payload);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to create event');
    }

    console.log('✅ Event created successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to create event:', error);
    errorLogger.logAsyncError(error as Error, 'createCalendarEvent');
    throw error;
  }
}

export async function deleteCalendarEvent(eventType: 'training' | 'race' | 'custom', eventId: string) {
  const endpointMap = {
    training: `/training/${eventId}/`,
    race: `/races/${eventId}/`,
    custom: `/custom-events/${eventId}/`,
  } as const;

  const endpoint = endpointMap[eventType];

  if (!endpoint) {
    throw new Error('Unsupported event type.');
  }

  try {
    const response = await apiClient.delete(endpoint);

    if (!response.success) {
      throw new Error(response.error?.message || 'Failed to delete event');
    }

    return true;
  } catch (error) {
    errorLogger.logAsyncError(error as Error, 'deleteCalendarEvent');
    throw error;
  }
}

export type UpdateCalendarEventPayload = (EventData & { id: string });

export async function updateCalendarEvent(payload: UpdateCalendarEventPayload) {
  if (!payload.id) {
    throw new Error('Event id is required for update.');
  }

  const { endpoint, payload: normalized } = normalizeEventForUpdate(payload);

  try {
    const response = await apiClient.patch(endpoint, normalized);

    if (!response.success || !response.data) {
      throw new Error(response.error?.message || 'Failed to update event');
    }

    return response.data;
  } catch (error) {
    errorLogger.logAsyncError(error as Error, 'updateCalendarEvent');
    throw error;
  }
}
