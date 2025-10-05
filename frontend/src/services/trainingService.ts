// Training Service - Handles training events, programs, and analytics

import { TrainingEvent, AnalyticsData } from '../types';
import { apiClient } from './apiClient';
import { errorLogger } from './errorLogger';
import { mapTrainingEventFromApi, extractResultsArray } from './adapters';

function parseDurationToMinutes(duration: string): number {
  if (!duration) {
    return 0;
  }

  if (duration.startsWith('P')) {
    const hoursMatch = duration.match(/(\d+)H/);
    const minutesMatch = duration.match(/(\d+)M/);
    const secondsMatch = duration.match(/(\d+)S/);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;

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

  return Number(duration) || 0;
}

export interface TrainingEventCreate {
  title: string;
  type: 'training' | 'race' | 'custom';
  sport?: string;
  date: string | Date;
  startTime?: string;
  endTime?: string;
  duration?: number;
  location?: string;
  notes?: string;
  intensity?: 'low' | 'medium' | 'high' | 'recovery';
  athleteId?: string;
}

export interface TrainingEventUpdate extends Partial<TrainingEventCreate> {
  id: string;
}

export interface TrainingProgram {
  id: string;
  name: string;
  description: string;
  duration: number; // weeks
  sport: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  events: TrainingEvent[];
  isActive: boolean;
}

export interface TrainingStats {
  totalEvents: number;
  completedEvents: number;
  totalDistance: number;
  totalDuration: number; // minutes
  averageIntensity: number;
  completionRate: number;
  streakDays: number;
}

class TrainingService {
  /**
   * Get user's training events
   */
  async getTrainingEvents(
    athleteId?: string | null,
    startDate?: Date,
    endDate?: Date,
    eventType?: string
  ): Promise<TrainingEvent[]> {
    try {
      const params: Record<string, string> = {};

      if (startDate) params.date_after = startDate.toISOString();
      if (endDate) params.date_before = endDate.toISOString();
      if (eventType && eventType !== 'all') params.sport = eventType;
      if (athleteId) params.athlete = athleteId;

      const response = await apiClient.get(`/training/`, {
        params
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch training events');
      }

      const events = extractResultsArray<any>(response.data);
      return events.map(mapTrainingEventFromApi);

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'getTrainingEvents');
      throw error;
    }
  }

  /**
   * Create new training event
   */
  async createTrainingEvent(userId: string, eventData: TrainingEventCreate): Promise<TrainingEvent> {
    try {
      const payload: Record<string, unknown> = {
        title: eventData.title,
        sport: eventData.sport,
        date: eventData.date instanceof Date ? eventData.date.toISOString() : eventData.date,
        time: eventData.startTime,
        notes: eventData.notes,
        training_data: {
          intensity: eventData.intensity,
        }
      };

      if (eventData.duration !== undefined) {
        const hours = Math.floor(eventData.duration / 60);
        const minutes = Math.floor(eventData.duration % 60);
        const seconds = Math.floor((eventData.duration % 1) * 60);
        payload.duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      const athleteId = eventData.athleteId ?? userId;
      if (athleteId) {
        payload.athlete = athleteId;
      }

      const response = await apiClient.post(`/training/`, payload);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to create training event');
      }

      errorLogger.addBreadcrumb('Training event created', 'training');
      return mapTrainingEventFromApi(response.data);

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'createTrainingEvent');
      throw error;
    }
  }

  /**
   * Update training event
   */
  async updateTrainingEvent(eventData: TrainingEventUpdate): Promise<TrainingEvent> {
    try {
      const payload: Record<string, unknown> = {
        title: eventData.title,
        sport: eventData.sport,
        notes: eventData.notes
      };

      if (eventData.date) {
        payload.date = eventData.date instanceof Date ? eventData.date.toISOString() : eventData.date;
      }

      if (eventData.startTime) {
        payload.time = eventData.startTime;
      }

      if (eventData.duration !== undefined) {
        const hours = Math.floor(eventData.duration / 60);
        const minutes = Math.floor(eventData.duration % 60);
        const seconds = Math.floor((eventData.duration % 1) * 60);
        payload.duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }

      const response = await apiClient.patch(`/training/${eventData.id}/`, payload);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to update training event');
      }

      errorLogger.addBreadcrumb('Training event updated', 'training');
      return mapTrainingEventFromApi(response.data);

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'updateTrainingEvent');
      throw error;
    }
  }

  /**
   * Delete training event
   */
  async deleteTrainingEvent(eventId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/training/${eventId}/`);
      
      if (!response.success) {
        throw new Error('Failed to delete training event');
      }

      errorLogger.addBreadcrumb('Training event deleted', 'training');

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'deleteTrainingEvent');
      throw new Error('Failed to delete training event. Please try again.');
    }
  }

  /**
   * Mark event as completed
   */
  async completeTrainingEvent(eventId: string, completionData?: any): Promise<TrainingEvent> {
    try {
      const response = await apiClient.patch(`/training/${eventId}/`, completionData ?? {});
      
      if (!response.success || !response.data) {
        throw new Error('Failed to complete training event');
      }

      errorLogger.addBreadcrumb('Training event completed', 'training');
      return mapTrainingEventFromApi(response.data);

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'completeTrainingEvent');
      throw new Error('Failed to mark event as completed.');
    }
  }

  /**
   * Get training analytics
   */
  async getTrainingAnalytics(
    userId: string, 
    period: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<AnalyticsData> {
    try {
      const backendPeriod = period === 'quarter' ? 'month' : period;
      const response = await apiClient.get(`/training/stats/`, {
        params: {
          period: backendPeriod,
        }
      });
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch training analytics');
      }

      const stats = response.data as any;
      const workouts = stats.total_sessions ?? 0;
      const totalDurationMinutes = stats.total_duration ? parseDurationToMinutes(stats.total_duration) : 0;
      const avgDurationMinutes = stats.average_duration ? parseDurationToMinutes(stats.average_duration) : 0;
      const completionRate = stats.completion_rate !== undefined ? Number(stats.completion_rate) : 0;
      const averageIntensity = stats.average_intensity !== undefined ? Number(stats.average_intensity) : 0;
      const sportsBreakdownDict = stats.sports_breakdown ?? {};
      const sportsBreakdownValues = Object.values(sportsBreakdownDict as Record<string, number>);

      return {
        period,
        workoutCount: workouts,
        totalDuration: totalDurationMinutes,
        averageIntensity,
        completionRate,
        trends: {
          workouts: sportsBreakdownValues.length ? sportsBreakdownValues : Array(4).fill(Math.max(workouts, 0)),
          duration: sportsBreakdownValues.length ? sportsBreakdownValues.map(() => avgDurationMinutes) : Array(4).fill(avgDurationMinutes),
          intensity: sportsBreakdownValues.length ? sportsBreakdownValues.map(() => averageIntensity) : Array(4).fill(averageIntensity)
        },
        sportsBreakdown: sportsBreakdownDict,
        averageDuration: avgDurationMinutes
      };

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'getTrainingAnalytics');
      throw error;
    }
  }

  /**
   * Fetch training sessions scheduled for the current week
   */
  async getThisWeekTrainings(): Promise<TrainingEvent[]> {
    try {
      const response = await apiClient.get(`/training/this-week/`);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch this week\'s training sessions');
      }

      const trainings = Array.isArray(response.data) ? response.data : extractResultsArray<any>(response.data);

      return trainings.map(mapTrainingEventFromApi);

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'getThisWeekTrainings');
      throw error;
    }
  }

  /**
   * Retrieve a single training event with full detail
   */
  async getTrainingEventById(eventId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/training/${eventId}/`);

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch training event details');
      }

      return response.data;

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'getTrainingEventById');
      throw error;
    }
  }

  /**
   * Get training statistics
   */
  async getTrainingStats(userId: string): Promise<TrainingStats> {
    try {
      const response = await apiClient.get(`/training/stats/`, {
        params: {
          period: 'month'
        }
      });
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch training statistics');
      }

      const stats = response.data as any;
      const totalDurationMinutes = stats.total_duration ? parseDurationToMinutes(stats.total_duration) : 0;
      const avgDurationMinutes = stats.average_duration ? parseDurationToMinutes(stats.average_duration) : 0;

      return {
        totalEvents: stats.total_sessions ?? 0,
        completedEvents: stats.total_sessions ?? 0,
        totalDistance: 0,
        totalDuration: totalDurationMinutes,
        averageIntensity: 0,
        completionRate: 0,
        streakDays: 0
      };

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'getTrainingStats');
      throw error;
    }
  }

  /**
   * Get available training programs
   */
  async getTrainingPrograms(sport?: string, level?: string): Promise<TrainingProgram[]> {
    errorLogger.addBreadcrumb('Training programs endpoint not implemented', 'training');
    return [];
  }

  /**
   * Enroll in training program
   */
  async enrollInProgram(userId: string, programId: string): Promise<void> {
    errorLogger.addBreadcrumb('Enroll in program called without implementation', 'training');
    throw new Error('Training programs are not available yet.');
  }
}

// Export singleton instance
export const trainingService = new TrainingService();

// Export class for testing
export { TrainingService };
