/**
 * PHASE 1.2: Activity Tracker Hook
 *
 * Tracks user activity to implement sliding session expiry.
 * Session extends automatically on user interaction without manual prompts.
 *
 * Tracked events: click, keydown, touchstart, scroll
 * Debounce: 5 minutes between activity notifications
 * Threshold: Refresh when token has <10 minutes remaining
 */

import { useEffect, useRef, useCallback } from 'react';
import { authService } from '../services/authService';

interface UseActivityTrackerOptions {
  enabled?: boolean;
  debounceMs?: number; // Minimum time between activity notifications (default: 5 minutes)
  refreshThresholdMs?: number; // Refresh when token has this much time left (default: 10 minutes)
  onActivity?: () => void;
  onInactiveTimeout?: () => void;
}

/**
 * Hook to track user activity and trigger token refresh
 */
export function useActivityTracker(options: UseActivityTrackerOptions = {}) {
  const {
    enabled = true,
    debounceMs = 5 * 60 * 1000, // 5 minutes
    refreshThresholdMs = 10 * 60 * 1000, // 10 minutes
    onActivity,
    onInactiveTimeout
  } = options;

  const lastActivityRef = useRef<number>(Date.now());
  const refreshInProgressRef = useRef<boolean>(false);
  const activityDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Handle user activity and potentially trigger token refresh
   */
  const handleActivity = useCallback(async () => {
    if (!enabled) return;

    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // Debounce: Ignore activity if we recently processed one
    if (timeSinceLastActivity < debounceMs) {
      return;
    }

    lastActivityRef.current = now;

    // Notify parent component
    onActivity?.();

    // Check if token needs refresh
    if (authService.isAuthenticated() && !refreshInProgressRef.current) {
      const token = authService.getStoredToken();

      if (token) {
        // For now, use the simple needsRefresh check
        // Will be enhanced in Phase 2.1 with JWT parsing
        if (authService.needsRefresh()) {
          try {
            refreshInProgressRef.current = true;
            console.log('🔄 Activity detected, refreshing token due to proximity to expiry...');

            await authService.ensureValidToken();

            console.log('✅ Token refreshed successfully after user activity');
          } catch (error) {
            console.error('❌ Failed to refresh token on activity:', error);
            // Token refresh failed - user will be logged out by existing error handlers
          } finally {
            refreshInProgressRef.current = false;
          }
        }
      }
    }
  }, [enabled, debounceMs, onActivity]);

  /**
   * Throttled activity handler to avoid excessive calls
   */
  const throttledActivityHandler = useCallback(() => {
    if (activityDebounceTimerRef.current) {
      return; // Already scheduled
    }

    activityDebounceTimerRef.current = setTimeout(() => {
      handleActivity();
      activityDebounceTimerRef.current = null;
    }, 1000); // Short delay to batch rapid events
  }, [handleActivity]);

  /**
   * Setup activity listeners
   */
  useEffect(() => {
    if (!enabled) return;

    // Activity events to track
    const events = ['click', 'keydown', 'touchstart', 'scroll'] as const;

    // Add listeners to document
    events.forEach(event => {
      document.addEventListener(event, throttledActivityHandler, { passive: true });
    });

    // Initial activity timestamp
    lastActivityRef.current = Date.now();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledActivityHandler);
      });

      if (activityDebounceTimerRef.current) {
        clearTimeout(activityDebounceTimerRef.current);
      }
    };
  }, [enabled, throttledActivityHandler]);

  return {
    lastActivity: lastActivityRef.current,
    recordActivity: handleActivity
  };
}
