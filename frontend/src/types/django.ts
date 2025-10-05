/**
 * Django Model Types
 * These interfaces match Django model structure for seamless backend integration
 */

// Base Django model interface
export interface DjangoModel {
  id: number;
  created_at: string;
  updated_at: string;
}

// Django User model (extends Django's AbstractUser)
export interface DjangoUser extends DjangoModel {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  date_joined: string;
  last_login: string | null;
  
  // Custom fields for Promethia
  phone?: string;
  country_code?: string;
  role: 'athlete' | 'coach';
  avatar?: string;
  bio?: string;
  date_of_birth?: string;
  
  // Django permissions
  groups: number[];
  user_permissions: number[];
}

// User Profile (separate model for extended user data)
export interface UserProfile extends DjangoModel {
  user: number; // FK to DjangoUser
  avatar: string | null;
  bio: string;
  date_of_birth: string | null;
  height: number | null; // in cm
  weight: number | null; // in kg
  emergency_contact: string;
  emergency_phone: string;
  medical_conditions: string;
  
  // Performance preferences
  units_preference: 'metric' | 'imperial';
  timezone: string;
  language: string;
}

// Athletic profile specific data
export interface AthleteProfile extends DjangoModel {
  user: number; // FK to DjangoUser
  sport: string;
  position: string;
  experience_level: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  goals: string;
  
  // Performance metrics
  fitness_level: number; // 1-10 scale
  injury_history: string;
  current_injuries: string;
  
  // Training preferences
  training_frequency: number; // sessions per week
  training_duration: number; // minutes per session
  preferred_training_time: 'morning' | 'afternoon' | 'evening';
}

// Coach profile specific data
export interface CoachProfile extends DjangoModel {
  user: number; // FK to DjangoUser
  specialization: string;
  certification: string;
  experience_years: number;
  bio: string;
  
  // Professional details
  qualifications: string[];
  languages: string[];
  coaching_philosophy: string;
  
  // Rates and availability
  hourly_rate: string; // DecimalField as string
  available_slots: string; // JSON field with availability
  max_athletes: number;
}

// Training Program model
export interface TrainingProgram extends DjangoModel {
  name: string;
  description: string;
  created_by: number; // FK to DjangoUser (Coach)
  
  // Program details
  duration_weeks: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  sport: string;
  goals: string[];
  
  // Program structure
  sessions_per_week: number;
  estimated_session_duration: number; // minutes
  
  // Relationships
  athletes: number[]; // M2M to DjangoUser
  exercises: number[]; // M2M to Exercise
  
  // Status
  is_active: boolean;
  is_template: boolean;
}

// Training Session model
export interface TrainingSession extends DjangoModel {
  program: number; // FK to TrainingProgram
  athlete: number; // FK to DjangoUser
  coach: number; // FK to DjangoUser
  
  // Session details
  title: string;
  description: string;
  scheduled_date: string; // ISO date
  scheduled_time: string; // ISO time
  duration_minutes: number;
  
  // Session data
  exercises: TrainingExercise[];
  notes: string;
  coach_feedback: string;
  athlete_feedback: string;
  
  // Performance metrics
  intensity_rating: number; // 1-10 scale
  difficulty_rating: number; // 1-10 scale
  completion_percentage: number; // 0-100
  
  // Status
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'missed';
  weather_conditions: string;
  location: string;
}

// Exercise model
export interface Exercise extends DjangoModel {
  name: string;
  description: string;
  category: string; // e.g., 'strength', 'cardio', 'flexibility'
  muscle_groups: string[]; // JSON field
  equipment_needed: string[];
  
  // Exercise parameters
  instructions: string;
  safety_notes: string;
  modifications: string;
  
  // Media
  demonstration_video: string | null;
  demonstration_images: string[];
  
  // Metadata
  created_by: number; // FK to DjangoUser (Coach)
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  estimated_duration: number; // seconds
}

// Training Exercise (through model for Session-Exercise relationship)
export interface TrainingExercise {
  exercise: number; // FK to Exercise
  sets: number;
  reps: number | null;
  weight: number | null; // kg
  duration_seconds: number | null;
  distance_meters: number | null;
  rest_seconds: number;
  
  // Performance tracking
  completed_sets: number;
  completed_reps: number[];
  completed_weight: number[];
  completed_duration: number | null;
  completed_distance: number | null;
  
  // Notes
  notes: string;
  perceived_exertion: number; // 1-10 RPE scale
}

// Performance Metrics model
export interface PerformanceMetrics extends DjangoModel {
  athlete: number; // FK to DjangoUser
  session: number | null; // FK to TrainingSession (optional)
  
  // Metric data
  metric_type: 'strength' | 'endurance' | 'speed' | 'flexibility' | 'power' | 'body_composition';
  metric_name: string;
  value: number;
  unit: string;
  measurement_date: string;
  
  // Context
  conditions: string; // weather, equipment, etc.
  notes: string;
  verified_by_coach: boolean;
}

// Injury/Health Record model
export interface HealthRecord extends DjangoModel {
  athlete: number; // FK to DjangoUser
  
  // Record details
  record_type: 'injury' | 'illness' | 'medical_clearance' | 'physical_assessment';
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe';
  
  // Dates
  incident_date: string;
  recovery_date: string | null;
  
  // Medical details
  body_part_affected: string;
  treatment_received: string;
  restrictions: string;
  
  // Status
  status: 'active' | 'recovering' | 'resolved';
  requires_medical_clearance: boolean;
}

// Notification model
export interface Notification extends DjangoModel {
  recipient: number; // FK to DjangoUser
  
  // Notification content
  title: string;
  message: string;
  notification_type: 'session_reminder' | 'program_update' | 'achievement' | 'injury_alert' | 'system';
  
  // Status
  is_read: boolean;
  is_sent: boolean;
  
  // Delivery
  send_email: boolean;
  send_push: boolean;
  scheduled_time: string | null;
}

// Team model (for group training)
export interface Team extends DjangoModel {
  name: string;
  description: string;
  coach: number; // FK to DjangoUser
  
  // Team details
  sport: string;
  season: string;
  team_code: string; // unique code for joining
  
  // Members
  athletes: number[]; // M2M to DjangoUser
  assistant_coaches: number[]; // M2M to DjangoUser
  
  // Settings
  is_active: boolean;
  max_members: number;
  is_public: boolean;
}

// Django REST Framework specific types
export interface DjangoListResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface DjangoDetailResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface DjangoErrorResponse {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  non_field_errors?: string[];
}

// Authentication response types
export interface DjangoAuthResponse {
  access: string; // JWT access token
  refresh: string; // JWT refresh token
  user: DjangoUser;
  expires_in: number; // seconds
}

export interface DjangoTokenRefreshResponse {
  access: string;
  expires_in: number;
}

// File upload response
export interface DjangoFileUploadResponse {
  id: number;
  file: string; // URL to the uploaded file
  original_name: string;
  size: number;
  content_type: string;
  uploaded_at: string;
}

// Django Channels WebSocket message types
export interface DjangoWebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface SessionUpdateMessage extends DjangoWebSocketMessage {
  type: 'session.update';
  data: {
    session_id: number;
    status: TrainingSession['status'];
    updates: Partial<TrainingSession>;
  };
}

export interface NotificationMessage extends DjangoWebSocketMessage {
  type: 'notification';
  data: Notification;
}

// Form validation types (matching Django serializer validation)
export interface DjangoFormError {
  field: string;
  message: string;
  code: string;
}

export interface DjangoFormErrors {
  [fieldName: string]: string[];
  non_field_errors?: string[];
}

// API Query parameters for Django filtering
export interface DjangoQueryParams {
  page?: number;
  page_size?: number;
  ordering?: string;
  search?: string;
  [key: string]: any; // For model-specific filters
}

// Session query parameters
export interface SessionQueryParams extends DjangoQueryParams {
  athlete?: number;
  coach?: number;
  program?: number;
  status?: TrainingSession['status'];
  date_after?: string;
  date_before?: string;
}

// User query parameters
export interface UserQueryParams extends DjangoQueryParams {
  role?: 'athlete' | 'coach';
  is_active?: boolean;
  sport?: string;
}

// Bulk operations (Django REST supports bulk create/update)
export interface BulkCreateRequest<T> {
  objects: Omit<T, 'id' | 'created_at' | 'updated_at'>[];
}

export interface BulkUpdateRequest<T> {
  objects: (Partial<T> & { id: number })[];
}

export interface BulkDeleteRequest {
  ids: number[];
}

export interface BulkOperationResponse {
  created?: number;
  updated?: number;
  deleted?: number;
  errors?: DjangoFormErrors[];
}