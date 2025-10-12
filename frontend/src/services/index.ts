// Services Index - Centralized exports for all service modules

import { logger } from '../utils/logger';

// API Client
export { apiClient, ApiClient } from './apiClient';
export type { RequestConfig, ApiClientConfig } from './apiClient';

// Authentication Service
export { authService, AuthService } from './authService';
export type { 
  LoginCredentials, 
  LoginResponse, 
  PasswordResetRequest, 
  AuthTokens 
} from './authService';

// User Service
export { userService, UserService } from './userService';
export type {
  UserUpdateRequest,
  PerformanceMetricsUpdate,
  ProfileUpdateRequest
} from './userService';

// Training Service
export { trainingService, TrainingService } from './trainingService';
export type {
  TrainingEventCreate,
  TrainingEventUpdate,
  TrainingProgram,
  TrainingStats
} from './trainingService';

// Race Service
export { raceService, RaceService } from './raceService';
export type { RaceEventResponse } from './raceService';

// Custom Event Service
export { customEventService, CustomEventService } from './customEventService';
export type { CustomEventResponse } from './customEventService';

// Calendar/Event Service
export * as eventService from './eventService';

// Error Logger Service (existing)
export { errorLogger } from './errorLogger';

// Service initialization utility
export function initializeServices(): void {
  // Set up any cross-service dependencies or configurations
  // This could include setting up interceptors, error handlers, etc.
  
  logger.info('🔧 Services initialized');
}

// Service health check utility
export async function checkServicesHealth(): Promise<boolean> {
  try {
    // Could ping API endpoints or check service availability
    return true;
  } catch (error) {
    logger.error('Services health check failed:', error);
    return false;
  }
}
