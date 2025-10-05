import {
  Trophy,
  Calendar,
  Bike,
  Activity as ActivityIcon,
  Dumbbell,
  User,
  Star
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Activity Icon Selection System
 *
 * This module provides intelligent icon selection for dashboard activities based on:
 * - Event type (training, race, custom, achievement, profile_update)
 * - Sport type (running, cycling, swimming, triathlon, etc.)
 *
 * Icon Selection Logic:
 * - Race events → Trophy icon
 * - Custom events → Calendar icon
 * - Achievements → Star icon
 * - Profile updates → User icon
 * - Training events → Sport-specific icons (Bike for cycling, Activity for running/swimming, etc.)
 *
 * To add profile update tracking to activities:
 * 1. Create activity log entries when profile is updated (in profileService.ts or userService.ts)
 * 2. Fetch these activities in dashboard hooks
 * 3. Include them in recentActivities with type: 'profile_update'
 */

/**
 * Maps sport names to their corresponding Lucide icons
 */
export function getSportIcon(sport?: string): LucideIcon {
  if (!sport) {
    return ActivityIcon;
  }

  const normalizedSport = sport.toLowerCase().trim();

  // Cycling/Biking
  if (normalizedSport.includes('cycl') || normalizedSport.includes('bike')) {
    return Bike;
  }

  // Running - use Activity icon (represents running/movement)
  if (normalizedSport.includes('run')) {
    return ActivityIcon;
  }

  // Swimming - use Activity icon (best available option)
  if (normalizedSport.includes('swim')) {
    return ActivityIcon;
  }

  // Triathlon - use Activity icon (represents multi-sport)
  if (normalizedSport.includes('triathlon')) {
    return ActivityIcon;
  }

  // Generic fitness/training
  if (normalizedSport.includes('fitness') || normalizedSport.includes('gym') || normalizedSport.includes('strength')) {
    return Dumbbell;
  }

  // Default fallback
  return ActivityIcon;
}

/**
 * Gets the appropriate icon for an activity based on event type and sport
 */
export function getActivityIcon(
  eventType: 'training' | 'race' | 'custom' | 'achievement' | 'profile_update',
  sport?: string
): LucideIcon {
  switch (eventType) {
    case 'race':
      return Trophy;

    case 'custom':
      return Calendar;

    case 'achievement':
      return Star;

    case 'profile_update':
      return User;

    case 'training':
      // For training events, use sport-specific icons
      return getSportIcon(sport);

    default:
      return Calendar;
  }
}
