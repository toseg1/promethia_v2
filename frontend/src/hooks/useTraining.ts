// Training Query Hooks - Specialized hooks for training-related data fetching

import { TrainingEvent } from '../types';
import { trainingService, eventService } from '../services';
import type { CalendarEventModel } from '../services/eventService';
import { useQuery, useMutation, queryClient } from './useQuery';
import { queryKeys } from './queryKeys';

/**
 * Hook for user's training events with date filtering
 */
export function useTrainingEvents(
  athleteId: string | null,
  startDate?: Date,
  endDate?: Date,
  eventType?: string,
  enabled: boolean = true
) {
  return useQuery(
    queryKeys.training.events(athleteId ?? undefined, startDate, endDate, eventType),
    () => {
      return trainingService.getTrainingEvents(athleteId ?? undefined, startDate, endDate, eventType);
    },
    {
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true
    }
  );
}

/**
 * Hook for combined calendar events (training, races, custom)
 * Enhanced with background refetching for real-time updates
 */
export function useCalendarEvents(
  startDate?: Date,
  endDate?: Date,
  enabled: boolean = true
) {
  return useQuery<CalendarEventModel[]>(
    queryKeys.calendar.events(startDate, endDate),
    () => eventService.getCalendarEvents({ dateAfter: startDate, dateBefore: endDate }),
    {
      enabled,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true
    }
  );
}

/**
 * Hook for training analytics
 */
export function useTrainingAnalytics(
  userId: string | null,
  period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  enabled: boolean = true
) {
  return useQuery(
    queryKeys.training.analytics(userId!, period),
    () => {
      if (!userId) throw new Error('User ID is required');
      return trainingService.getTrainingAnalytics(userId, period);
    },
    {
      enabled: enabled && !!userId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false
    }
  );
}

/**
 * Hook for training statistics
 */
export function useTrainingStats(userId: string | null, enabled: boolean = true) {
  return useQuery(
    queryKeys.training.stats(userId!),
    () => {
      if (!userId) throw new Error('User ID is required');
      return trainingService.getTrainingStats(userId);
    },
    {
      enabled: enabled && !!userId,
      staleTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: true
    }
  );
}

/**
 * Hook for available training programs
 */
export function useTrainingPrograms(sport?: string, level?: string, enabled: boolean = true) {
  return useQuery(
    queryKeys.training.programs(sport, level),
    () => trainingService.getTrainingPrograms(sport, level),
    {
      enabled,
      staleTime: 30 * 60 * 1000, // 30 minutes (programs don't change often)
      refetchOnWindowFocus: false
    }
  );
}

/**
 * Mutation hook for creating training events
 */
export function useCreateTrainingEvent() {
  return useMutation(
    async ({ userId, eventData }: { userId: string; eventData: any }) => {
      const result = await trainingService.createTrainingEvent(userId, eventData);

      // Invalidate training events cache using entity invalidation
      queryClient.invalidateEntity('training');
      queryClient.invalidateEntity('calendar');
      queryClient.invalidateEntity('dashboard');

      return result;
    }
  );
}

/**
 * Mutation hook for updating training events
 */
export function useUpdateTrainingEvent() {
  return useMutation(
    async (eventData: any) => {
      const result = await trainingService.updateTrainingEvent(eventData);

      // Invalidate related caches
      queryClient.invalidateEntity('training');
      queryClient.invalidateEntity('calendar');
      queryClient.invalidateEntity('dashboard');

      return result;
    }
  );
}

/**
 * Mutation hook for deleting training events
 */
export function useDeleteTrainingEvent() {
  return useMutation(
    async (eventId: string) => {
      await trainingService.deleteTrainingEvent(eventId);

      // Invalidate training events cache
      queryClient.invalidateEntity('training');
      queryClient.invalidateEntity('calendar');
      queryClient.invalidateEntity('dashboard');

      return true;
    }
  );
}

/**
 * Mutation hook for completing training events
 */
export function useCompleteTrainingEvent() {
  return useMutation(
    async ({ eventId, completionData }: { eventId: string; completionData?: any }) => {
      const result = await trainingService.completeTrainingEvent(eventId, completionData);

      // Invalidate related caches
      queryClient.invalidateEntity('training');
      queryClient.invalidateEntity('dashboard');

      return result;
    }
  );
}

/**
 * Mutation hook for enrolling in training programs
 */
export function useEnrollInProgram() {
  return useMutation(
    async ({ userId, programId }: { userId: string; programId: string }) => {
      await trainingService.enrollInProgram(userId, programId);

      // Invalidate user's training events as new program events will be added
      queryClient.invalidateEntity('training');
      queryClient.invalidateEntity('calendar');

      return true;
    }
  );
}

/**
 * Hook for real-time training events (for current month)
 */
export function useCurrentMonthEvents(athleteId: string | null) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return useTrainingEvents(athleteId, startOfMonth, endOfMonth, undefined, true);
}

/**
 * Hook for upcoming events (next 7 days)
 */
export function useUpcomingEvents(athleteId: string | null) {
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return useTrainingEvents(athleteId, now, weekFromNow, undefined, true);
}

/**
 * Hook for current week's training sessions
 */
export function useThisWeekTrainings(enabled: boolean = true) {
  return useQuery(
    queryKeys.training.thisWeek(),
    () => trainingService.getThisWeekTrainings(),
    {
      enabled,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true
    }
  );
}
