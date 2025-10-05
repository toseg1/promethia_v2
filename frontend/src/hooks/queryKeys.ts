/**
 * Centralized Query Key Factory
 *
 * Provides type-safe, consistent query keys across the application.
 * This prevents cache invalidation mismatches and provides a single source of truth.
 *
 * Best practices:
 * - Use nested structure for related queries
 * - Return `as const` for type inference
 * - Include all parameters that affect the data
 * - Use optional parameters consistently
 */

export const queryKeys = {
  /**
   * Authentication & User queries
   */
  auth: {
    all: () => ['auth'] as const,
    user: () => ['auth', 'user'] as const,
    profile: () => ['auth', 'profile'] as const,
    status: () => ['auth', 'status'] as const,
    stats: () => ['auth', 'stats'] as const,
  },

  /**
   * User-related queries (connected athletes, coaches, etc.)
   */
  users: {
    all: () => ['users'] as const,
    profile: (userId: string) => ['users', 'profile', userId] as const,
    connectedAthletes: (coachId: string | null) =>
      ['users', 'connected-athletes', coachId] as const,
    connectedCoaches: (athleteId: string | null) =>
      ['users', 'connected-coaches', athleteId] as const,
    stats: (userId: string) => ['users', 'stats', userId] as const,
  },

  /**
   * Calendar & Events queries
   */
  calendar: {
    all: () => ['calendar'] as const,
    events: (start?: Date, end?: Date) =>
      ['calendar', 'events', start?.toISOString(), end?.toISOString()] as const,
    event: (eventType: string, eventId: string) =>
      ['calendar', 'event', eventType, eventId] as const,
    athleteEvents: (athleteId: string, start?: Date, end?: Date) =>
      ['calendar', 'events', 'athlete', athleteId, start?.toISOString(), end?.toISOString()] as const,
  },

  /**
   * Training queries
   */
  training: {
    all: () => ['training'] as const,
    events: (athleteId?: string, start?: Date, end?: Date, eventType?: string) =>
      ['training', 'events', athleteId, start?.toISOString(), end?.toISOString(), eventType] as const,
    event: (eventId: string) =>
      ['training', 'event', eventId] as const,
    analytics: (userId: string, period: 'week' | 'month' | 'quarter' | 'year') =>
      ['training', 'analytics', userId, period] as const,
    stats: (userId: string) =>
      ['training', 'stats', userId] as const,
    programs: (sport?: string, level?: string) =>
      ['training', 'programs', sport, level] as const,
    thisWeek: () =>
      ['training', 'this-week'] as const,
    currentMonth: (athleteId: string | null) =>
      ['training', 'current-month', athleteId] as const,
    upcoming: (athleteId: string | null) =>
      ['training', 'upcoming', athleteId] as const,
  },

  /**
   * Dashboard queries
   */
  dashboard: {
    all: () => ['dashboard'] as const,
    summary: () => ['dashboard', 'summary'] as const,
    athleteStats: (userId: string) =>
      ['dashboard', 'athlete', userId] as const,
    coachStats: (coachId: string) =>
      ['dashboard', 'coach', coachId] as const,
  },

  /**
   * Metrics queries
   */
  metrics: {
    all: () => ['metrics'] as const,
    user: (userId: string) => ['metrics', userId] as const,
  },

  /**
   * Profile queries
   */
  profile: {
    all: () => ['profile'] as const,
    data: (userId: string) => ['profile', 'data', userId] as const,
    performanceMetrics: (userId: string) =>
      ['profile', 'performance-metrics', userId] as const,
  },
} as const;

/**
 * Query key utilities
 */
export const queryKeyUtils = {
  /**
   * Check if a query key matches a pattern
   */
  matches: (queryKey: readonly unknown[], pattern: readonly unknown[]): boolean => {
    if (pattern.length > queryKey.length) return false;

    return pattern.every((part, index) => {
      // Undefined in pattern acts as wildcard
      if (part === undefined) return true;
      return queryKey[index] === part;
    });
  },

  /**
   * Check if a query key starts with a prefix
   */
  startsWith: (queryKey: readonly unknown[], prefix: readonly unknown[]): boolean => {
    if (prefix.length > queryKey.length) return false;

    return prefix.every((part, index) => queryKey[index] === part);
  },

  /**
   * Get all query keys for a specific entity type
   */
  getEntityKeys: (entity: keyof typeof queryKeys): readonly unknown[][] => {
    const entityKeys = queryKeys[entity];
    if (typeof entityKeys === 'function') {
      return [entityKeys()];
    }

    return Object.values(entityKeys)
      .filter((fn): fn is () => readonly unknown[] => typeof fn === 'function')
      .map(fn => fn());
  },
};

/**
 * Type helpers for query keys
 */
export type QueryKey = ReturnType<
  | typeof queryKeys.auth[keyof typeof queryKeys.auth]
  | typeof queryKeys.users[keyof typeof queryKeys.users]
  | typeof queryKeys.calendar[keyof typeof queryKeys.calendar]
  | typeof queryKeys.training[keyof typeof queryKeys.training]
  | typeof queryKeys.dashboard[keyof typeof queryKeys.dashboard]
  | typeof queryKeys.metrics[keyof typeof queryKeys.metrics]
  | typeof queryKeys.profile[keyof typeof queryKeys.profile]
>;

export type QueryKeyPrefix =
  | 'auth'
  | 'users'
  | 'calendar'
  | 'training'
  | 'dashboard'
  | 'metrics'
  | 'profile';
