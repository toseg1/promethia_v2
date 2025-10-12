// Custom Event Service - Handles custom event retrieval and persistence

import { apiClient } from './apiClient';
import { errorLogger } from './errorLogger';

export interface CustomEventResponse {
  id: number;
  title: string;
  date: string;
  date_end?: string | null;
  location?: string | null;
  description?: string | null;
  event_color?: string | null;
  athlete?: number | null;
  athlete_name?: string | null;
}

export class CustomEventService {
  /**
   * Retrieve a single custom event with full detail.
   */
  async getCustomEventById(eventId: string): Promise<CustomEventResponse> {
    try {
      console.log('🔍 [CustomEventService] Fetching custom event details for ID:', eventId);
      const response = await apiClient.get(`/custom-events/${eventId}/`);

      if (!response.success || !response.data) {
        console.error('❌ [CustomEventService] Failed to fetch custom event details:', response.error);
        throw new Error('Failed to fetch custom event details');
      }

      console.log('✅ [CustomEventService] Custom event fetched successfully:', response.data);
      return response.data as CustomEventResponse;
    } catch (error) {
      console.error('❌ [CustomEventService] Error fetching custom event:', error);
      errorLogger.logAsyncError(error as Error, 'getCustomEventById');
      throw error;
    }
  }
}

export const customEventService = new CustomEventService();
