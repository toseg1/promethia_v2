// ============================================================================
// PROMETHIA - TYPE DEFINITIONS
// ============================================================================
// This file contains all TypeScript interfaces and types used throughout
// the Promethia training platform application.

// ============================================================================
// USER & AUTHENTICATION TYPES
// ============================================================================

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  countryCode?: string;
  role: string; // Can be 'athlete', 'coach', or other values
  avatarUrl?: string; // URL to uploaded profile picture
  avatarColor?: string; // Theme-based color for initials avatar
  coachId?: string;
  profileImage?: string;
  dateOfBirth?: string;
  mas?: number | string;
  fpp?: number | string;
  css?: number | string;
  cssDisplay?: string;
  isVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  dateJoined?: string;
  sportsInvolved?: string[];
  athleticProfile?: AthleticProfileSummary;
  performanceMetrics?: PerformanceMetrics & {
    mas?: number | string;
    fpp?: number | string;
    css?: number | string;
  };
}

export interface ProfileAchievementSummary {
  id: string;
  title: string;
  description?: string;
  year?: number;
  category?: string;
}

export interface AthleticProfileSummary {
  id: string;
  experienceYears?: number;
  aboutNotes?: string;
  sportsInvolved: string[];
  achievements: ProfileAchievementSummary[];
}

export interface AuthError {
  type: 'login' | 'signup' | 'reset' | 'general';
  message: string;
  field?: string;
}

export interface SignupData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  role: 'athlete' | 'coach';
  password: string;
  confirmPassword: string;
}

// ============================================================================
// TRAINING & EVENT TYPES
// ============================================================================

export type EventType = 'training' | 'race' | 'recovery' | 'meeting' | 'other';

export interface TrainingEvent {
  id: string;
  title: string;
  description?: string;
  date: Date | string;
  startTime?: string;
  endTime?: string;
  type: EventType;
  sport?: string;
  location?: string;
  duration?: number; // in minutes
  intensity?: 'low' | 'medium' | 'high' | 'recovery';
  notes?: string;
  completed?: boolean;
  createdBy: string; // User ID
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface IntervalComponent {
  id: string;
  type: 'warmup' | 'interval' | 'recovery' | 'cooldown';
  duration: number; // in minutes
  intensity: 'low' | 'medium' | 'high';
  description?: string;
  targetHeartRate?: number;
  targetPower?: number;
  targetPace?: string;
}

// ============================================================================
// ATHLETE & PERFORMANCE TYPES
// ============================================================================

export interface Athlete {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfBirth?: Date | string;
  sport: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  coachId?: string;
  joinDate: Date | string;
  isActive: boolean;
  avatar?: string;
  performance?: PerformanceMetrics;
}

export interface PerformanceMetrics {
  totalWorkouts: number;
  weeklyAverage: number;
  monthlyGoal?: number;
  personalBests?: Record<string, number | string>;
  recentActivities: TrainingEvent[];
  completionRate: number; // percentage
  streakDays: number;
}

// ============================================================================
// UI & COMPONENT TYPES
// ============================================================================

export type ViewType = 'dashboard' | 'calendar' | 'metrics' | 'analytics' | 'profile' | 'coach' | 'device-sync';

export interface NavigationItem {
  id: 'dashboard' | 'calendar' | 'athletes' | 'metrics' | 'analytics' | 'profile' | 'coach' | 'device-sync';
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  available: boolean;
  comingSoon?: boolean;
  badge?: string | number;
  disabled?: boolean;
}

export interface DashboardProps {
  user: User;
  onNavigate?: (view: ViewType) => void;
  onAddEvent?: (event?: TrainingEvent) => void;
}

export interface CalendarProps {
  user: User;
  userRole: 'athlete' | 'coach';
  onEditEvent?: (event: TrainingEvent) => void;
}

// ============================================================================
// MODAL & FORM TYPES
// ============================================================================

export interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: TrainingEvent) => Promise<void>;
  selectedDate?: Date;
  userRole: 'athlete' | 'coach';
  event?: TrainingEvent; // Optional existing event for editing
  onDelete?: (event: TrainingEvent) => Promise<void>;
}

export interface AuthModalProps {
  onAuthSuccess: (user: User) => void;
  onAuthError?: (error: AuthError) => void;
  onLogin?: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  onSignup?: (userData: SignupData) => Promise<void>;
  onPasswordReset?: (email: string) => Promise<void>;
  authError?: AuthError | null;
}

// ============================================================================
// API & SERVICE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================================
// CONFIGURATION & UTILITY TYPES
// ============================================================================

export interface AppConfig {
  api: {
    baseUrl: string;
    timeout: number;
  };
  app: {
    name: string;
    version: string;
  };
  features: {
    enableAnalytics: boolean;
    enableNotifications: boolean;
    enableOfflineMode: boolean;
  };
}

export interface FormValidationError {
  field: string;
  message: string;
}

// ============================================================================
// DASHBOARD & ANALYTICS TYPES
// ============================================================================

export interface AnalyticsData {
  period: 'week' | 'month' | 'quarter' | 'year';
  workoutCount: number;
  totalDuration: number; // in minutes
  averageIntensity: number;
  completionRate: number;
  trends: {
    workouts: number[];
    duration: number[];
    intensity: number[];
  };
  sportsBreakdown?: Record<string, number>;
  averageDuration?: number;
}

export interface DashboardTrainingSummary {
  id: string;
  title: string;
  athlete: string;
  athleteName?: string;
  date: string;
  time?: string;
  sport?: string;
  durationMinutes?: number;
  isUpcoming?: boolean;
  isToday?: boolean;
}

export interface DashboardRaceSummary {
  id: string;
  title: string;
  athlete: string;
  athleteName?: string;
  date: string;
  sport?: string;
  location?: string;
  distance?: string;
  isUpcoming?: boolean;
  isToday?: boolean;
  isCompleted?: boolean;
}

export interface DashboardAchievementSummary {
  id: string;
  title: string;
  category?: string;
  year?: number;
}

export interface CoachingRelationshipSummary {
  coachesCount: number;
  menteesCount: number;
  coaches: Array<{
    id: string;
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    profileImage?: string;
    firstName?: string;
    lastName?: string;
  }>;
  mentees: Array<{
    id: string;
    username: string;
    fullName: string;
    email: string;
  }>;
}

export interface DashboardSummary {
  upcomingTrainings: DashboardTrainingSummary[];
  upcomingRaces: DashboardRaceSummary[];
  thisWeekStats: {
    totalSessions: number;
    totalDurationMinutes: number;
    sportsBreakdown: Record<string, number>;
  };
  recentAchievements: DashboardAchievementSummary[];
  coachingSummary: CoachingRelationshipSummary;
}

export interface MetricsConfig {
  id: string;
  name: string;
  sport: string;
  presets: MetricsPreset[];
  customFields?: CustomField[];
}

export interface MetricsPreset {
  id: string;
  name: string;
  description: string;
  metrics: string[];
  isDefault?: boolean;
}

export interface CustomField {
  id: string;
  name: string;
  type: 'number' | 'text' | 'select' | 'boolean';
  unit?: string;
  options?: string[]; // For select type
  required?: boolean;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

// ============================================================================
// UTILITY FUNCTION TYPES
// ============================================================================

export type DebounceFunction<T extends (...args: unknown[]) => void> = (
  func: T,
  wait: number
) => (...args: Parameters<T>) => void;

export interface ValidationResult {
  isValid: boolean;
  errors: FormValidationError[];
}

// ============================================================================
// ADDITIONAL SPECIALIZED TYPES
// ============================================================================

export interface ComponentErrorContext {
  componentName?: string;
  props?: Record<string, unknown>;
  userId?: string;
  userRole?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface AsyncOperationContext {
  operation?: string;
  asyncContext?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ErrorLoggerProps {
  [key: string]: unknown;
}

// ============================================================================
// EXPORT ALL TYPES
// ============================================================================
// This ensures all types are available for import throughout the application
