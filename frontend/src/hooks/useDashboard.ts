import { useMemo } from 'react';
import { useQuery } from './useQuery';
import { useTrainingAnalytics, useThisWeekTrainings } from './useTraining';
import { DashboardSummary } from '../types';
import { userService } from '../services';
import { queryKeys } from './queryKeys';
import type { CalendarEventModel } from '../services/eventService';

export function useDashboardSummary(enabled: boolean = true) {
  return useQuery<DashboardSummary>(
    queryKeys.dashboard.summary(),
    () => userService.getDashboardSummary(),
    {
      enabled,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: true
    }
  );
}

interface AthleteDashboardMetrics {
  weeklySessions: number;
  weeklyMinutes: number;
  averageSessionMinutes: number;
  monthlyCompletionRate: number;
  monthlyWorkouts: number;
  monthlyDurationMinutes: number;
  upcomingTrainings: number;
  upcomingRaces: number;
}

export function useAthleteDashboardStats(
  userId: string | null,
  enabled: boolean = true,
  calendarEvents?: CalendarEventModel[]
) {
  const analytics = useTrainingAnalytics(userId, 'month', enabled);
  const thisWeek = useThisWeekTrainings(enabled && !!userId);

  const metrics = useMemo<AthleteDashboardMetrics>(() => {
    const weeklyTrainings = thisWeek.data ?? [];
    const weeklySessions = weeklyTrainings.length;
    const weeklyMinutes = weeklyTrainings.reduce((total, session) => {
      return total + (session.duration ?? 0);
    }, 0);

    const averageSessionMinutes = weeklySessions > 0 ? Math.round(weeklyMinutes / weeklySessions) : 0;

    const monthlyCompletionRate = analytics.data?.completionRate ?? 0;
    const monthlyWorkouts = analytics.data?.workoutCount ?? 0;
    const monthlyDurationMinutes = analytics.data?.totalDuration ?? 0;

    // Calculate upcoming trainings and races (next 30 days)
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const upcomingEvents = (calendarEvents || []).filter(event => {
      const eventDate = new Date(event.date);
      return eventDate > now && eventDate <= thirtyDaysFromNow;
    });

    const upcomingTrainings = upcomingEvents.filter(e => e.type === 'training').length;
    const upcomingRaces = upcomingEvents.filter(e => e.type === 'race').length;

    return {
      weeklySessions,
      weeklyMinutes,
      averageSessionMinutes,
      monthlyCompletionRate,
      monthlyWorkouts,
      monthlyDurationMinutes,
      upcomingTrainings,
      upcomingRaces,
    };
  }, [analytics.data, thisWeek.data, calendarEvents]);

  return {
    metrics,
    analytics,
    thisWeek,
  };
}
