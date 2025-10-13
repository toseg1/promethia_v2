// Authentication Service - Handles all authentication-related API calls

import { User, SignupData, AuthError } from '../types';
import { apiClient } from './apiClient';
import { errorLogger } from './errorLogger';
import { tokenStorage, createSecureRequest, initializeSecurity } from '../utils/secureStorage';
import { formatPhoneForBackend } from '../utils/phoneUtils';
import { tokenRefreshManager } from './tokenRefreshManager';
import { JWTUtils } from '../utils/jwtUtils';

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface AuthTokens {
  token: string;
  refreshToken: string;
}

class AuthService {
  // PHASE 1.3: Token refresh now managed by centralized TokenRefreshManager
  // Keeping these for backward compatibility during migration
  private refreshPromise: Promise<AuthTokens> | null = null;
  private refreshCallbacks: Array<{
    resolve: (tokens: AuthTokens) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor() {
    // Initialize security settings on service creation
    initializeSecurity();

    // PHASE 1.3: Setup centralized refresh manager
    tokenRefreshManager.setRefreshFunction(() => this.performTokenRefresh());
  }

  /**
   * Login user with credentials
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      // Call real backend API
      const response = await apiClient.post('/users/login/', {
        username_or_email: credentials.username,
        password: credentials.password
      });

      if (response.success) {
        const tokens: AuthTokens = {
          token: response.data.tokens.access,
          refreshToken: response.data.tokens.refresh
        };

        // Transform backend user data to frontend format
        const userData: User = {
          id: response.data.user.id.toString(),
          username: response.data.user.username,
          firstName: response.data.user.first_name,
          lastName: response.data.user.last_name,
          email: response.data.user.email,
          phone: response.data.user.phone_number,
          countryCode: response.data.user.country_number || '+1',
          role: response.data.user.user_type as 'athlete' | 'coach',
          avatarUrl: response.data.user.profile_image,
          avatarColor: response.data.user.avatar_color,
          coachId: response.data.user.coach_id
        };

        // Store authentication data securely
        // REFACTORED: Always store tokens in localStorage
        // PHASE 2.1: Use JWT parsing for accurate expiry time
        const expiryDate = JWTUtils.getExpiryDate(tokens.token);
        const expiresAt = expiryDate ? expiryDate.getTime() : Date.now() + (60 * 60 * 1000);

        tokenStorage.setTokens({
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresAt: expiresAt,
          userId: userData.id
        });

        // REFACTORED: "Remember Me" only affects username pre-fill
        if (credentials.rememberMe) {
          tokenStorage.setRememberedUsername(credentials.username);
        } else {
          tokenStorage.clearRememberedUsername();
        }

        // Set API client auth header
        apiClient.setAuthToken(tokens.token);

        errorLogger.addBreadcrumb('User logged in successfully', 'auth');

        return {
          user: userData,
          token: tokens.token,
          refreshToken: tokens.refreshToken
        };
      } else {
        // Handle error response with validation errors
        const errorMessage = response.error?.message || 'Login failed';
        const validationErrors = response.error?.details || response.data;
        
        // If we have field-specific validation errors, throw with field info
        if (validationErrors && typeof validationErrors === 'object') {
          const firstError = Object.keys(validationErrors)[0];
          const firstErrorMessage = Array.isArray(validationErrors[firstError]) 
            ? validationErrors[firstError][0] 
            : validationErrors[firstError];
          throw new AuthenticationError(firstErrorMessage || errorMessage, firstError);
        }
        
        throw new AuthenticationError(errorMessage, 'login_failed');
      }

    } catch (error) {
      const authError = error instanceof AuthenticationError ? error : new Error('Unknown login error');
      
      errorLogger.logAuthError(authError, 'login');
      
      if (error instanceof AuthenticationError) {
        throw {
          type: 'login',
          message: error.message,
          field: error.field
        } as AuthError;
      }
      
      throw {
        type: 'login',
        message: 'Login failed. Please try again.'
      } as AuthError;
    }
  }

  /**
   * Register new user account
   */
  async signup(userData: SignupData): Promise<LoginResponse> {
    try {
      // Get country dial code for the backend - complete mapping from PhoneInput
      const countryDialCodes: Record<string, string> = {
        'FR': '+33', 'US': '+1', 'GB': '+44', 'DE': '+49', 'ES': '+34',
        'IT': '+39', 'CA': '+1', 'AU': '+61', 'JP': '+81', 'KR': '+82',
        'CN': '+86', 'IN': '+91', 'BR': '+55', 'MX': '+52', 'AR': '+54',
        'CL': '+56', 'CO': '+57', 'PE': '+51', 'VE': '+58', 'ZA': '+27',
        'EG': '+20', 'NG': '+234', 'KE': '+254', 'MA': '+212', 'TN': '+216',
        'RU': '+7', 'TR': '+90', 'SA': '+966', 'AE': '+971', 'IL': '+972',
        'TH': '+66', 'VN': '+84', 'MY': '+60', 'SG': '+65', 'PH': '+63',
        'ID': '+62', 'NZ': '+64', 'FI': '+358', 'SE': '+46', 'NO': '+47',
        'DK': '+45', 'NL': '+31', 'BE': '+32', 'CH': '+41', 'AT': '+43',
        'PL': '+48', 'CZ': '+420', 'HU': '+36', 'RO': '+40', 'BG': '+359',
        'HR': '+385', 'SI': '+386', 'SK': '+421', 'LT': '+370', 'LV': '+371',
        'EE': '+372', 'IE': '+353', 'PT': '+351', 'GR': '+30', 'CY': '+357',
        'MT': '+356', 'IS': '+354', 'LU': '+352'
      };
      
      const countryCode = countryDialCodes[userData.countryCode] || '+33';

      console.log('AuthService: Sending registration request with data:', {
        username: userData.username,
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        user_type: userData.role,
        country_number: countryCode,
        phone_number: userData.phone
      });

      // Call real backend API for registration
      const response = await apiClient.post('/users/register/', {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        password_confirm: userData.confirmPassword,
        first_name: userData.firstName,
        last_name: userData.lastName,
        user_type: userData.role,
        country_number: countryCode,        // Send country code separately
        phone_number: userData.phone        // Send local phone number only
      });

      console.log('AuthService: API response received:', response);

      if (response.success) {
        const tokens: AuthTokens = {
          token: response.data.tokens.access,
          refreshToken: response.data.tokens.refresh
        };

        // Transform backend user data to frontend format
        const newUser: User = {
          id: response.data.user.id.toString(),
          username: response.data.user.username,
          firstName: response.data.user.first_name,
          lastName: response.data.user.last_name,
          email: response.data.user.email,
          phone: response.data.user.phone_number,
          countryCode: response.data.user.country_number || '+1',
          role: response.data.user.user_type as 'athlete' | 'coach',
          coachId: response.data.user.coach_id
        };

        // Store authentication data securely (signup auto-logs in)
        // REFACTORED: Always store tokens (no rememberMe flag needed)
        // PHASE 2.1: Use JWT parsing for accurate expiry time
        const expiryDate = JWTUtils.getExpiryDate(tokens.token);
        const expiresAt = expiryDate ? expiryDate.getTime() : Date.now() + (60 * 60 * 1000);

        tokenStorage.setTokens({
          token: tokens.token,
          refreshToken: tokens.refreshToken,
          expiresAt: expiresAt,
          userId: newUser.id
        });

        // Don't remember username on signup - let user decide on next login

        // Set API client auth header
        apiClient.setAuthToken(tokens.token);

        errorLogger.addBreadcrumb('User registered successfully', 'auth');

        return {
          user: newUser,
          token: tokens.token,
          refreshToken: tokens.refreshToken
        };
      } else {
        // Handle error response with validation errors
        const errorMessage = response.error?.message || 'Registration failed';
        const validationErrors = response.error?.details || response.data;
        
        // Parse Django ValidationError format from message
        if (errorMessage.includes('{') && errorMessage.includes('}')) {
          try {
            // Extract JSON-like error from Django ValidationError string
            const match = errorMessage.match(/\{'([^']+)':\s*\[.*?string='([^']+)'/);
            if (match) {
              const fieldName = match[1];
              const fieldError = match[2];
              throw new AuthenticationError(fieldError, fieldName);
            }
          } catch (e) {
            // Fall through to default error handling
          }
        }
        
        // If we have field-specific validation errors, throw with field info
        if (validationErrors && typeof validationErrors === 'object') {
          const firstError = Object.keys(validationErrors)[0];
          const firstErrorMessage = Array.isArray(validationErrors[firstError]) 
            ? validationErrors[firstError][0] 
            : validationErrors[firstError];
          throw new AuthenticationError(firstErrorMessage || errorMessage, firstError);
        }
        
        throw new AuthenticationError(errorMessage, 'registration_failed');
      }

    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw {
          type: 'signup',
          message: error.message,
          field: error.field
        } as AuthError;
      }
      
      throw {
        type: 'signup',
        message: 'Account creation failed. Please try again.'
      } as AuthError;
    }
  }


  /**
   * Logout user and clear stored data
   * PHASE 1.3: Also reset token refresh manager
   */
  async logout(): Promise<void> {
    try {
      // Clear stored authentication data securely
      tokenStorage.clearTokens();

      // Clear API client auth header
      apiClient.clearAuth();

      // PHASE 1.3: Reset token refresh manager state
      tokenRefreshManager.reset();

      errorLogger.addBreadcrumb('User logged out', 'auth');

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'logout');
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return tokenStorage.isAuthenticated();
  }

  /**
   * Get stored user data by fetching from API with valid token
   */
  async getStoredUser(): Promise<User | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      // Ensure we have a valid token first
      const token = await this.ensureValidToken();
      if (!token) {
        return null;
      }

      // Fetch user data from backend
      const response = await apiClient.get('/users/profile/');
      
      if (response.success && response.data) {
        // Transform backend user data to frontend format
        const userData: User = {
          id: response.data.id.toString(),
          username: response.data.username,
          firstName: response.data.first_name,
          lastName: response.data.last_name,
          email: response.data.email,
          phone: response.data.phone_number,
          countryCode: response.data.country_number || '+1',
          role: response.data.user_type as 'athlete' | 'coach',
          avatarUrl: response.data.profile_image,
          avatarColor: response.data.avatar_color,
          coachId: response.data.coach_id
        };

        return userData;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to fetch stored user data:', error);
      // If fetching user data fails, clear tokens to force re-authentication
      tokenStorage.clearTokens();
      return null;
    }
  }

  /**
   * Get stored authentication token
   */
  getStoredToken(): string | null {
    return tokenStorage.getAccessToken();
  }

  /**
   * PHASE 1.3: Internal token refresh implementation
   * Called by TokenRefreshManager to perform actual refresh
   */
  private async performTokenRefresh(): Promise<AuthTokens> {
    const refreshToken = tokenStorage.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    console.log('🔄 Performing token refresh...');

    const response = await apiClient.post('/users/refresh/', {
      refresh: refreshToken
    });

    if (response.success) {
      const newTokens: AuthTokens = {
        token: response.data.access,
        refreshToken: response.data.refresh || refreshToken
      };

      // PHASE 2.1: Use JWT parsing for accurate expiry time
      const expiryDate = JWTUtils.getExpiryDate(newTokens.token);
      const expiresAt = expiryDate ? expiryDate.getTime() : Date.now() + (60 * 60 * 1000);

      // PHASE 2.3: Update both tokens to handle refresh token rotation
      // Backend may return new refresh token (rotation) or reuse existing one
      tokenStorage.updateAccessToken(newTokens.token, expiresAt, newTokens.refreshToken);

      // Update API client
      apiClient.setAuthToken(newTokens.token);

      return newTokens;
    } else {
      // Refresh failed, clear tokens
      tokenStorage.clearTokens();
      apiClient.clearAuth();
      tokenRefreshManager.reset();

      throw new Error(response.error?.message || 'Token refresh failed');
    }
  }

  /**
   * Refresh authentication token using centralized manager
   * PHASE 1.3: Now delegates to TokenRefreshManager to prevent race conditions
   */
  async refreshToken(): Promise<AuthTokens> {
    try {
      return await tokenRefreshManager.refresh();
    } catch (error) {
      console.error('❌ Token refresh error:', error);

      // Refresh failed, clear tokens
      tokenStorage.clearTokens();
      apiClient.clearAuth();

      throw new Error('Token refresh failed');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/users/request_password_reset/', {
        email: email
      });

      return {
        success: response.success,
        message: response.message
      };
    } catch (error: any) {
      throw new AuthenticationError(
        error.message || 'Password reset request failed',
        'password_reset'
      );
    }
  }

  /**
   * Confirm password reset with token
   */
  async confirmPasswordReset(uid: string, token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post('/users/confirm_password_reset/', {
        uid: uid,
        token: token,
        new_password: newPassword
      });

      return {
        success: response.success,
        message: response.message
      };
    } catch (error: any) {
      throw new AuthenticationError(
        error.message || 'Password reset confirmation failed',
        'password_reset_confirm'
      );
    }
  }
  
  /**
   * Check if tokens need refresh
   * PHASE 2.1: Use JWT parsing for accurate expiry check
   */
  needsRefresh(): boolean {
    const token = tokenStorage.getAccessToken();

    if (!token) {
      return false;
    }

    // Use JWT Utils for accurate expiry check (10-minute threshold)
    return JWTUtils.needsRefresh(token, 10 * 60 * 1000);
  }

  /**
   * Auto-refresh token if needed with retry logic
   */
  async ensureValidToken(retryCount = 0): Promise<string | null> {
    const maxRetries = 2;
    
    if (!this.isAuthenticated()) {
      return null;
    }
    
    if (this.needsRefresh()) {
      try {
        const tokens = await this.refreshToken();
        console.log('✅ Token refreshed successfully');
        return tokens.token;
      } catch (error) {
        console.warn('Token refresh failed:', error);
        
        // Check if it's a network error (not auth error) and we haven't exceeded retries
        const isNetworkError = !error.message?.includes('401') && 
                              !error.message?.includes('403') && 
                              !error.message?.includes('Invalid token');
        
        if (isNetworkError && retryCount < maxRetries) {
          // Network error - retry after exponential backoff
          const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s
          console.log(`🔄 Retrying token refresh in ${delay}ms (attempt ${retryCount + 1}/${maxRetries})`);
          
          await new Promise(resolve => setTimeout(resolve, delay));
          return this.ensureValidToken(retryCount + 1);
        }
        
        // Auth error or max retries reached - clear tokens
        console.log('❌ Token refresh failed permanently, clearing tokens');
        tokenStorage.clearTokens();
        return null;
      }
    }
    
    return this.getStoredToken();
  }

}

// Authentication error class
class AuthenticationError extends Error {
  field?: string;
  
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'AuthenticationError';
    this.field = field;
  }
}

// Export singleton instance
export const authService = new AuthService();

// Export class for testing
export { AuthService, AuthenticationError };
