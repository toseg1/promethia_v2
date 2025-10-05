/**
 * Django REST API Configuration
 */

export const djangoConfig = {
  api: {
    baseUrl: import.meta.env.VITE_DJANGO_API_URL || 'http://localhost:8001/api/v1',
    timeout: 10000,
    
    // Django REST Framework endpoints (matching actual backend)
    endpoints: {
      // Authentication
      auth: {
        login: '/users/login/',
        logout: '/users/logout/',
        register: '/users/register/',
        refresh: '/users/refresh/',
        profile: '/users/profile/',
        dashboard: '/users/dashboard/',
        passwordReset: '/users/request-password-reset/',
        passwordResetConfirm: '/users/confirm-password-reset/',
      },
      
      // User management
      users: '/users/',
      myAthletes: '/users/my-athletes/',
      addCoachAccess: '/users/add-coach-access/',
      removeCoachAccess: '/users/remove-coach-access/',
      uploadProfileImage: '/users/{id}/upload_profile_image/',
      removeProfileImage: '/users/{id}/remove_profile_image/',
      
      // Athletic profiles
      athleticProfiles: '/athletic-profiles/',
      professionalProfiles: '/professional-profiles/',
      achievements: '/achievements/',
      certifications: '/certifications/',
      coachAchievements: '/coach-achievements/',
      coachAssignments: '/coach-assignments/',
      
      // Training data
      training: '/training/',
      trainingCalendar: '/training/calendar/',
      trainingUpcoming: '/training/upcoming/',
      trainingThisWeek: '/training/this-week/',
      trainingStats: '/training/stats/',
      trainingDuplicate: '/training/{id}/duplicate/',
      
      // Race events
      races: '/races/',
      racesUpcoming: '/races/upcoming/',
      racesResults: '/races/results/',
      racesBySport: '/races/by-sport/',
      
      // Custom events
      customEvents: '/custom-events/',
      
      // Combined events (calendar)
      eventsCalendar: '/events/calendar/',
      eventsThisWeek: '/events/this-week/',
    }
  },
  
  // Django CSRF configuration
  csrf: {
    headerName: 'X-CSRFToken',
    cookieName: 'csrftoken',
    metaName: 'csrf-token',
  },
  
  // Django-specific headers
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json',
  },
  
  // Pagination settings (matching Django REST)
  pagination: {
    pageSize: 20,
    maxPageSize: 100,
  },
  
  // WebSocket configuration (for Django Channels)
  websocket: {
    url: import.meta.env.VITE_DJANGO_WS_URL || 'ws://localhost:8000/ws',
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  },
  
  // Environment-specific settings
  environment: {
    development: {
      debug: true,
      mockAPI: false,
    },
    production: {
      debug: false,
      mockAPI: false,
    },
    testing: {
      debug: true,
      mockAPI: true,
    }
  }
};

/**
 * Get current environment configuration
 */
export function getCurrentConfig() {
  const env = import.meta.env.MODE as keyof typeof djangoConfig.environment;
  return {
    ...djangoConfig,
    ...djangoConfig.environment[env] || djangoConfig.environment.development
  };
}

/**
 * Django model field types for TypeScript integration
 */
export const DjangoFieldTypes = {
  // Common Django field types
  CharField: 'string',
  TextField: 'string',
  EmailField: 'string',
  URLField: 'string',
  SlugField: 'string',
  
  IntegerField: 'number',
  FloatField: 'number',
  DecimalField: 'string', // Use string for precise decimal handling
  
  BooleanField: 'boolean',
  
  DateField: 'string',        // ISO date string
  DateTimeField: 'string',    // ISO datetime string
  TimeField: 'string',        // ISO time string
  
  JSONField: 'Record<string, any>',
  
  // Relationship fields
  ForeignKey: 'number | string', // ID reference
  ManyToManyField: 'number[] | string[]', // Array of IDs
  OneToOneField: 'number | string', // ID reference
} as const;

/**
 * Django REST Framework response formats (matching backend)
 */
export interface DjangoAPIResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  status_code: number;
  errors?: Record<string, string[]>;
  detail?: string;
}

export interface DjangoPaginatedResponse<T = any> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Django error response format
 */
export interface DjangoErrorResponse {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  non_field_errors?: string[];
}

/**
 * Utility functions for Django integration
 */
export const DjangoUtils = {
  /**
   * Convert Django field names to camelCase
   */
  toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  },
  
  /**
   * Convert camelCase to Django snake_case
   */
  toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  },
  
  /**
   * Transform object keys from snake_case to camelCase
   */
  transformKeysToCamelCase<T>(obj: any): T {
    if (Array.isArray(obj)) {
      return obj.map(item => this.transformKeysToCamelCase(item)) as T;
    }
    
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const camelKey = this.toCamelCase(key);
        acc[camelKey] = this.transformKeysToCamelCase(obj[key]);
        return acc;
      }, {} as any) as T;
    }
    
    return obj;
  },
  
  /**
   * Transform object keys from camelCase to snake_case
   */
  transformKeysToSnakeCase<T>(obj: any): T {
    if (Array.isArray(obj)) {
      return obj.map(item => this.transformKeysToSnakeCase(item)) as T;
    }
    
    if (obj !== null && typeof obj === 'object') {
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = this.toSnakeCase(key);
        acc[snakeKey] = this.transformKeysToSnakeCase(obj[key]);
        return acc;
      }, {} as any) as T;
    }
    
    return obj;
  },
  
  /**
   * Parse Django form errors into frontend format
   */
  parseFormErrors(errors: Record<string, string[]>): Record<string, string> {
    const parsed: Record<string, string> = {};
    
    Object.entries(errors).forEach(([field, messages]) => {
      const camelField = this.toCamelCase(field);
      parsed[camelField] = messages.join(', ');
    });
    
    return parsed;
  }
};
