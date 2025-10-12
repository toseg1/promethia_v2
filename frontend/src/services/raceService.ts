// Race Service - Handles race event retrieval and persistence

import { apiClient } from './apiClient';
import { errorLogger } from './errorLogger';

export interface RaceEventResponse {
  id: number;
  title: string;
  date: string;
  sport?: string;
  location?: string;
  distance?: string | null;
  description?: string | null;
  finish_time?: string | null;
  target_time?: string | null;
  athlete?: number | null;
  athlete_name?: string | null;
}

export class RaceService {
  /**
   * Retrieve a single race event with full detail.
   */
  async getRaceById(eventId: string): Promise<RaceEventResponse> {
    try {
      const response = await apiClient.get(`/races/${eventId}/`);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch race event details');
      }

      return response.data as RaceEventResponse;
    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'getRaceById');
      throw error;
    }
  }
}

export const raceService = new RaceService();
