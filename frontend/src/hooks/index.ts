// Hooks Index - Centralized exports for all custom hooks

// Core query hooks
export { useQuery, useMutation, queryClient } from './useQuery';
export type { QueryState, QueryOptions } from './useQuery';

// Query keys factory
export { queryKeys, queryKeyUtils } from './queryKeys';
export type { QueryKey, QueryKeyPrefix } from './queryKeys';

// Optimistic mutation hooks
export { useOptimisticMutation, useSimpleMutation } from './useOptimisticMutation';
export type { OptimisticMutationOptions, OptimisticMutationResult } from './useOptimisticMutation';

// Authentication hooks
export {
  useUserProfile,
  useConnectedAthletes,
  useConnectedCoaches,
  useUpdateProfile,
  useUpdatePerformanceMetrics,
  useConnectToCoach,
  useUploadAvatar,
  useRemoveAvatar,
  useAuthStatus,
  useUserStats
} from './useAuth';

// Training hooks
export {
  useTrainingEvents,
  useCalendarEvents,
  useTrainingAnalytics,
  useTrainingStats,
  useTrainingPrograms,
  useCreateTrainingEvent,
  useUpdateTrainingEvent,
  useDeleteTrainingEvent,
  useCompleteTrainingEvent,
  useEnrollInProgram,
  useCurrentMonthEvents,
  useUpcomingEvents,
  useThisWeekTrainings
} from './useTraining';

export { useDashboardSummary, useAthleteDashboardStats } from './useDashboard';
