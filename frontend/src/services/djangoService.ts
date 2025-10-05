/**
 * Django REST API Service
 * Handles all interactions with Django backend
 */

import { apiClient } from './apiClient';
import { djangoConfig, getCurrentConfig, DjangoUtils } from '../config/django';
import { 
  DjangoUser,
  DjangoAuthResponse,
  DjangoTokenRefreshResponse,
  TrainingSession,
  TrainingProgram,
  PerformanceMetrics,
  UserProfile,
  AthleteProfile,
  CoachProfile,
  Exercise,
  HealthRecord,
  Notification,
  Team,
  DjangoListResponse,
  DjangoQueryParams,
  SessionQueryParams,
  UserQueryParams,
  DjangoFileUploadResponse,
  BulkCreateRequest,
  BulkUpdateRequest,
  BulkDeleteRequest,
  BulkOperationResponse
} from '../types/django';
import { tokenStorage } from '../utils/secureStorage';
import { errorLogger } from './errorLogger';

class DjangoAPIService {
  private config = getCurrentConfig();
  
  /**
   * Authentication Services
   */
  
  async login(username: string, password: string, rememberMe: boolean = false): Promise<DjangoAuthResponse> {
    try {
      // Get CSRF token first
      const csrfToken = await this.getCSRFToken();
      
      const response = await apiClient.post<DjangoAuthResponse>(
        this.config.api.endpoints.auth.login,
        DjangoUtils.transformKeysToSnakeCase({
          username,
          password,
          rememberMe
        }),
        {
          headers: {
            [this.config.csrf.headerName]: csrfToken
          }
        }
      );
      
      // Store tokens securely
      if (response.data) {
        tokenStorage.setTokens({
          token: response.data.access,
          refreshToken: response.data.refresh,
          expiresAt: Date.now() + (response.data.expires_in * 1000),
          userId: response.data.user.id.toString()
        });
      }
      
      errorLogger.addBreadcrumb('Django login successful', 'auth');
      return response.data;
      
    } catch (error) {
      errorLogger.logAuthError(error as Error, 'django_login');
      throw error;
    }
  }
  
  async register(userData: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'athlete' | 'coach';
    phone?: string;
    countryCode?: string;
  }): Promise<DjangoAuthResponse> {
    try {
      const csrfToken = await this.getCSRFToken();
      
      const response = await apiClient.post<DjangoAuthResponse>(
        this.config.api.endpoints.auth.register,
        DjangoUtils.transformKeysToSnakeCase(userData),
        {
          headers: {
            [this.config.csrf.headerName]: csrfToken
          }
        }
      );
      
      // Store tokens securely
      if (response.data) {
        tokenStorage.setTokens({
          token: response.data.access,
          refreshToken: response.data.refresh,
          expiresAt: Date.now() + (response.data.expires_in * 1000),
          userId: response.data.user.id.toString()
        });
      }
      
      errorLogger.addBreadcrumb('Django registration successful', 'auth');
      return response.data;
      
    } catch (error) {
      errorLogger.logAuthError(error as Error, 'django_register');
      throw error;
    }
  }
  
  async refreshToken(): Promise<DjangoTokenRefreshResponse> {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      const response = await apiClient.post<DjangoTokenRefreshResponse>(
        this.config.api.endpoints.auth.refresh,
        { refresh: refreshToken }
      );
      
      // Update stored tokens
      if (response.data) {
        tokenStorage.updateAccessToken(
          response.data.access,
          Date.now() + (response.data.expires_in * 1000)
        );
      }
      
      return response.data;
      
    } catch (error) {
      // Clear invalid tokens
      tokenStorage.clearTokens();
      errorLogger.logAuthError(error as Error, 'django_token_refresh');
      throw error;
    }
  }
  
  async logout(): Promise<void> {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      
      if (refreshToken) {
        await apiClient.post(this.config.api.endpoints.auth.logout, {
          refresh: refreshToken
        });
      }
      
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      tokenStorage.clearTokens();
      errorLogger.addBreadcrumb('Django logout completed', 'auth');
    }
  }
  
  async getCurrentUser(): Promise<DjangoUser> {
    const response = await apiClient.get<DjangoUser>(
      this.config.api.endpoints.auth.profile
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  /**
   * CSRF Token Management
   */
  
  async getCSRFToken(): Promise<string> {
    const response = await apiClient.get<{token: string}>(
      this.config.api.endpoints.auth.csrfToken
    );
    return response.data.token;
  }
  
  /**
   * User Management Services
   */
  
  async getUsers(params: UserQueryParams = {}): Promise<DjangoListResponse<DjangoUser>> {
    const response = await apiClient.get<DjangoListResponse<DjangoUser>>(
      this.config.api.endpoints.users,
      { params: DjangoUtils.transformKeysToSnakeCase(params) }
    );
    
    return {
      ...response.data,
      results: response.data.results.map(user => 
        DjangoUtils.transformKeysToCamelCase(user)
      )
    };
  }
  
  async getUser(userId: number): Promise<DjangoUser> {
    const response = await apiClient.get<DjangoUser>(
      `${this.config.api.endpoints.users}${userId}/`
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  async updateUser(userId: number, userData: Partial<DjangoUser>): Promise<DjangoUser> {
    const response = await apiClient.patch<DjangoUser>(
      `${this.config.api.endpoints.users}${userId}/`,
      DjangoUtils.transformKeysToSnakeCase(userData)
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  async getUserProfile(userId: number): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>(
      `${this.config.api.endpoints.users}${userId}/profile/`
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  async updateUserProfile(userId: number, profileData: Partial<UserProfile>): Promise<UserProfile> {
    const response = await apiClient.patch<UserProfile>(
      `${this.config.api.endpoints.users}${userId}/profile/`,
      DjangoUtils.transformKeysToSnakeCase(profileData)
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  /**
   * Training Session Services
   */
  
  async getTrainingSessions(params: SessionQueryParams = {}): Promise<DjangoListResponse<TrainingSession>> {
    const response = await apiClient.get<DjangoListResponse<TrainingSession>>(
      this.config.api.endpoints.sessions,
      { params: DjangoUtils.transformKeysToSnakeCase(params) }
    );
    
    return {
      ...response.data,
      results: response.data.results.map(session => 
        DjangoUtils.transformKeysToCamelCase(session)
      )
    };
  }
  
  async getTrainingSession(sessionId: number): Promise<TrainingSession> {
    const response = await apiClient.get<TrainingSession>(
      `${this.config.api.endpoints.sessions}${sessionId}/`
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  async createTrainingSession(sessionData: Omit<TrainingSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingSession> {
    const response = await apiClient.post<TrainingSession>(
      this.config.api.endpoints.sessions,
      DjangoUtils.transformKeysToSnakeCase(sessionData)
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  async updateTrainingSession(sessionId: number, sessionData: Partial<TrainingSession>): Promise<TrainingSession> {
    const response = await apiClient.patch<TrainingSession>(
      `${this.config.api.endpoints.sessions}${sessionId}/`,
      DjangoUtils.transformKeysToSnakeCase(sessionData)
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  async deleteTrainingSession(sessionId: number): Promise<void> {
    await apiClient.delete(`${this.config.api.endpoints.sessions}${sessionId}/`);
  }
  
  /**
   * Training Program Services
   */
  
  async getTrainingPrograms(params: DjangoQueryParams = {}): Promise<DjangoListResponse<TrainingProgram>> {
    const response = await apiClient.get<DjangoListResponse<TrainingProgram>>(
      this.config.api.endpoints.programs,
      { params: DjangoUtils.transformKeysToSnakeCase(params) }
    );
    
    return {
      ...response.data,
      results: response.data.results.map(program => 
        DjangoUtils.transformKeysToCamelCase(program)
      )
    };
  }
  
  async createTrainingProgram(programData: Omit<TrainingProgram, 'id' | 'createdAt' | 'updatedAt'>): Promise<TrainingProgram> {
    const response = await apiClient.post<TrainingProgram>(
      this.config.api.endpoints.programs,
      DjangoUtils.transformKeysToSnakeCase(programData)
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  /**
   * Exercise Services
   */
  
  async getExercises(params: DjangoQueryParams = {}): Promise<DjangoListResponse<Exercise>> {
    const response = await apiClient.get<DjangoListResponse<Exercise>>(
      this.config.api.endpoints.training, // Adjust endpoint
      { params: DjangoUtils.transformKeysToSnakeCase(params) }
    );
    
    return {
      ...response.data,
      results: response.data.results.map(exercise => 
        DjangoUtils.transformKeysToCamelCase(exercise)
      )
    };
  }
  
  /**
   * Performance Metrics Services
   */
  
  async getPerformanceMetrics(athleteId: number, params: DjangoQueryParams = {}): Promise<DjangoListResponse<PerformanceMetrics>> {
    const response = await apiClient.get<DjangoListResponse<PerformanceMetrics>>(
      this.config.api.endpoints.metrics,
      { 
        params: DjangoUtils.transformKeysToSnakeCase({
          athlete: athleteId,
          ...params
        })
      }
    );
    
    return {
      ...response.data,
      results: response.data.results.map(metric => 
        DjangoUtils.transformKeysToCamelCase(metric)
      )
    };
  }
  
  async createPerformanceMetric(metricData: Omit<PerformanceMetrics, 'id' | 'createdAt' | 'updatedAt'>): Promise<PerformanceMetrics> {
    const response = await apiClient.post<PerformanceMetrics>(
      this.config.api.endpoints.metrics,
      DjangoUtils.transformKeysToSnakeCase(metricData)
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  /**
   * File Upload Services
   */
  
  async uploadAvatar(userId: number, file: File): Promise<DjangoFileUploadResponse> {
    const formData = new FormData();
    formData.append('avatar', file);
    formData.append('user_id', userId.toString());
    
    const response = await apiClient.post<DjangoFileUploadResponse>(
      this.config.api.endpoints.avatars,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }
    );
    
    return response.data;
  }
  
  async uploadFile(file: File, category: string = 'general'): Promise<DjangoFileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    
    const response = await apiClient.post<DjangoFileUploadResponse>(
      this.config.api.endpoints.uploads,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }
    );
    
    return response.data;
  }
  
  /**
   * Bulk Operations
   */
  
  async bulkCreateSessions(request: BulkCreateRequest<TrainingSession>): Promise<BulkOperationResponse> {
    const response = await apiClient.post<BulkOperationResponse>(
      `${this.config.api.endpoints.sessions}bulk_create/`,
      {
        objects: request.objects.map(obj => DjangoUtils.transformKeysToSnakeCase(obj))
      }
    );
    
    return response.data;
  }
  
  async bulkUpdateSessions(request: BulkUpdateRequest<TrainingSession>): Promise<BulkOperationResponse> {
    const response = await apiClient.patch<BulkOperationResponse>(
      `${this.config.api.endpoints.sessions}bulk_update/`,
      {
        objects: request.objects.map(obj => DjangoUtils.transformKeysToSnakeCase(obj))
      }
    );
    
    return response.data;
  }
  
  async bulkDeleteSessions(request: BulkDeleteRequest): Promise<BulkOperationResponse> {
    const response = await apiClient.post<BulkOperationResponse>(
      `${this.config.api.endpoints.sessions}bulk_delete/`,
      request
    );
    
    return response.data;
  }
  
  /**
   * Analytics Services
   */
  
  async getAthleteAnalytics(athleteId: number, params: {
    start_date?: string;
    end_date?: string;
    metrics?: string[];
  } = {}): Promise<any> {
    const response = await apiClient.get(
      `${this.config.api.endpoints.analytics}athlete/${athleteId}/`,
      { params: DjangoUtils.transformKeysToSnakeCase(params) }
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  async getCoachAnalytics(coachId: number, params: {
    start_date?: string;
    end_date?: string;
    athletes?: number[];
  } = {}): Promise<any> {
    const response = await apiClient.get(
      `${this.config.api.endpoints.analytics}coach/${coachId}/`,
      { params: DjangoUtils.transformKeysToSnakeCase(params) }
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
  
  /**
   * Notification Services
   */
  
  async getNotifications(params: DjangoQueryParams = {}): Promise<DjangoListResponse<Notification>> {
    const response = await apiClient.get<DjangoListResponse<Notification>>(
      '/notifications/', // Adjust endpoint
      { params: DjangoUtils.transformKeysToSnakeCase(params) }
    );
    
    return {
      ...response.data,
      results: response.data.results.map(notification => 
        DjangoUtils.transformKeysToCamelCase(notification)
      )
    };
  }
  
  async markNotificationRead(notificationId: number): Promise<void> {
    await apiClient.patch(`/notifications/${notificationId}/`, {
      is_read: true
    });
  }
  
  /**
   * Health Services
   */
  
  async getHealthRecords(athleteId: number): Promise<DjangoListResponse<HealthRecord>> {
    const response = await apiClient.get<DjangoListResponse<HealthRecord>>(
      '/health-records/',
      { params: { athlete: athleteId } }
    );
    
    return {
      ...response.data,
      results: response.data.results.map(record => 
        DjangoUtils.transformKeysToCamelCase(record)
      )
    };
  }
  
  async createHealthRecord(recordData: Omit<HealthRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<HealthRecord> {
    const response = await apiClient.post<HealthRecord>(
      '/health-records/',
      DjangoUtils.transformKeysToSnakeCase(recordData)
    );
    
    return DjangoUtils.transformKeysToCamelCase(response.data);
  }
}

// Export singleton instance
export const djangoService = new DjangoAPIService();

// Export class for testing
export { DjangoAPIService };