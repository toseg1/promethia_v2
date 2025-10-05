// Authentication Query Hooks - Specialized hooks for auth-related data fetching

import { useCallback } from 'react';
import { User, SignupData } from '../types';
import { authService, userService } from '../services';
import { useQuery, useMutation, queryClient } from './useQuery';

/**
 * Hook for user profile data with caching
 */
export function useUserProfile(userId: string | null, enabled: boolean = true) {
  return useQuery(
    ['user', 'profile', userId],
    () => {
      if (!userId) throw new Error('User ID is required');
      return userService.getUserProfile(userId);
    },
    {
      enabled: enabled && !!userId,
      staleTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false
    }
  );
}

/**
 * Hook for connected athletes (for coaches)
 */
export function useConnectedAthletes(coachId: string | null, enabled: boolean = true) {
  return useQuery(
    ['coach', 'athletes', coachId],
    () => {
      if (!coachId) throw new Error('Coach ID is required');
      return userService.getConnectedAthletes(coachId);
    },
    {
      enabled: enabled && !!coachId,
      staleTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: true
    }
  );
}

/**
 * Hook for connected coaches (for athletes)
 */
export function useConnectedCoaches(athleteId: string | null, enabled: boolean = true) {
  return useQuery(
    ['athlete', 'coaches', athleteId],
    () => {
      if (!athleteId) throw new Error('Athlete ID is required');
      return userService.getConnectedCoaches(athleteId);
    },
    {
      enabled: enabled && !!athleteId,
      staleTime: 15 * 60 * 1000, // 15 minutes
      refetchOnWindowFocus: false
    }
  );
}

/**
 * Mutation hook for updating user profile
 */
export function useUpdateProfile() {
  return useMutation(
    async ({ userId, updates }: { userId: string; updates: any }) => {
      const result = await userService.updateUserProfile(userId, updates);
      
      // Invalidate user profile cache
      queryClient.invalidateQueries(['user', 'profile', userId]);
      
      return result;
    }
  );
}

/**
 * Mutation hook for updating performance metrics
 */
export function useUpdatePerformanceMetrics() {
  return useMutation(
    async ({ userId, metrics }: { userId: string; metrics: any }) => {
      const result = await userService.updatePerformanceMetrics(userId, metrics);
      
      // Invalidate user profile cache
      queryClient.invalidateQueries(['user', 'profile', userId]);
      
      return result;
    }
  );
}

/**
 * Mutation hook for connecting to coach
 */
export function useConnectToCoach() {
  return useMutation(
    async ({ athleteId, coachCode }: { athleteId: string; coachCode: string }) => {
      await userService.connectToCoach(athleteId, coachCode);
      
      // Invalidate coaches cache for this athlete
      queryClient.invalidateQueries(['athlete', 'coaches', athleteId]);
      
      return true;
    }
  );
}

/**
 * Mutation hook for avatar upload
 */
export function useUploadAvatar() {
  return useMutation(
    async ({ userId, file }: { userId: string; file: File }) => {
      const avatarUrl = await userService.uploadAvatar(userId, file);
      
      // Update user profile cache with new avatar
      queryClient.invalidateQueries(['user', 'profile', userId]);
      
      return avatarUrl;
    }
  );
}

/**
 * Mutation hook for avatar removal
 */
export function useRemoveAvatar() {
  return useMutation(
    async ({ userId }: { userId: string }) => {
      await userService.removeAvatar(userId);
      
      // Invalidate user profile cache to trigger refetch
      queryClient.invalidateQueries(['user', 'profile', userId]);
    }
  );
}

/**
 * Check authentication status with automatic refresh
 */
export function useAuthStatus() {
  const isAuthenticated = authService.isAuthenticated();
  const storedUser = authService.getStoredUser();

  return useQuery(
    ['auth', 'status'],
    async () => {
      if (!isAuthenticated) return null;
      
      try {
        // Try to refresh token to ensure it's valid
        await authService.refreshToken();
        return storedUser;
      } catch {
        // If refresh fails, user is not authenticated
        await authService.logout();
        return null;
      }
    },
    {
      enabled: isAuthenticated,
      staleTime: 30 * 60 * 1000, // 30 minutes
      refetchOnWindowFocus: true,
      retry: 1
    }
  );
}

/**
 * Hook to fetch user statistics
 */
export function useUserStats(userId: string | null, enabled: boolean = true) {
  const options = {
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  };

  return useQuery(
    ['user', 'stats', userId],
    async () => {
      if (!userId) throw new Error('User ID required');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Mock data - replace with actual service call
      const mockStats = {
        weeklySessionsCompleted: 15,
        totalDistance: 52.3,
        personalBests: 4,
        completionRate: 88,
        totalWorkouts: 167,
        avgDuration: 68,
        streak: 9
      };
      
      return mockStats;
    },
    options
  );
}