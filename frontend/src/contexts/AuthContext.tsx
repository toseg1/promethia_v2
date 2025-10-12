import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';
import { User, AuthError, SignupData } from '../types';
import { errorLogger } from '../services/errorLogger';
import { assignAvatarColor } from '../components/ui/ProfileAvatar';
import { authService } from '../services/authService';
import { queryClient } from '../hooks';
import { useActivityTracker } from '../hooks/useActivityTracker';
import { ProfileCache } from '../utils/profileCache';
import { logger } from '../utils/logger';

// AuthContext interface - enhanced with authentication state tracking
interface AuthContextType {
  // Current user state
  user: User | null;
  currentRole: string;
  authError: AuthError | null;

  // Enhanced authentication state
  isInitializing: boolean;

  // Authentication functions
  handleAuthSuccess: (userData: User) => void;
  handleAuthError: (error: AuthError) => void;
  handleLogin: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  handleSignup: (userData: SignupData) => Promise<void>;
  handlePasswordReset: (email: string) => Promise<void>;
  handlePasswordResetConfirm: (token: string, password: string) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleRoleSwitch: () => void;

  // View state
  currentView: 'dashboard' | 'calendar' | 'metrics' | 'analytics' | 'profile' | 'coach' | 'device-sync';
  setCurrentView: (view: 'dashboard' | 'calendar' | 'metrics' | 'analytics' | 'profile' | 'coach' | 'device-sync') => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the AuthContext
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// AuthProvider props
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider Component
 * 
 * Provides authentication state and functions to all child components.
 * This replaces prop drilling while maintaining exact same behavior.
 * 
 * IMPORTANT: All logic is identical to current App.tsx implementation
 * to ensure zero functional changes.
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // State - enhanced with initialization tracking
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar' | 'metrics' | 'analytics' | 'profile' | 'coach' | 'device-sync'>('dashboard');
  const [currentRole, setCurrentRole] = useState<string>('athlete');
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Initialize authentication state on mount with enhanced error handling
  // PHASE 3.2: Optimized with profile cache for instant UI rendering
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Skip auto-login if on password reset confirm page
        const pathParts = window.location.pathname.split('/');
        if (pathParts[1] === 'reset-password' && pathParts[2] && pathParts[3]) {
          logger.debug('🔓 On password reset page, skipping auto-login');
          setIsInitializing(false);
          return;
        }

        // Check if tokens exist in storage
        if (authService.isAuthenticated()) {
          logger.debug('🔐 Found existing authentication tokens');

          // PHASE 3.2: Try to load cached profile FIRST for instant UI
          const cachedProfile = ProfileCache.get();
          if (cachedProfile) {
            logger.debug('⚡ Loading profile from cache (instant)');
            setUser(cachedProfile);
            setCurrentRole(cachedProfile.role);
            setIsInitializing(false); // Stop loading spinner immediately
          }

          // Validate token in background (don't block UI)
          const token = await authService.ensureValidToken();

          if (token) {
            // Fetch fresh user data from backend (background refresh)
            try {
              const storedUser = await authService.getStoredUser();
              if (storedUser) {
                // PHASE 3.2: Update cache with fresh data
                ProfileCache.set(storedUser);

                // Update UI with fresh data (silent update if cached was shown)
                setUser(storedUser);
                setCurrentRole(storedUser.role);
                logger.info('✅ Authentication restored successfully for user:', storedUser.username);
              }
            } catch (error) {
              logger.error('Failed to fetch user data:', error);

              // Only logout on auth errors, not network errors
              if (error.message?.includes('401') || error.message?.includes('403')) {
                await authService.logout();
                ProfileCache.clear(); // PHASE 3.2: Clear cache on logout
                setUser(null);
              } else {
                logger.warn('Network error during session restore, keeping tokens for retry');
                // Keep cached profile if we have it
              }
            }
          } else {
            // Token refresh failed
            logger.info('⚠️ Token refresh failed during initialization');
            ProfileCache.clear(); // PHASE 3.2: Clear cache on auth failure
            setUser(null);
          }
        } else {
          logger.debug('🔓 No existing authentication found');
          ProfileCache.clear(); // PHASE 3.2: Ensure cache is clear
        }
      } catch (error) {
        logger.error('Auth initialization error:', error);
      } finally {
        // Only set to false if we didn't already set it (from cache)
        setIsInitializing(false);
      }
    };

    initAuth();
  }, []);

  // PHASE 1.2: Activity-based token refresh (replaces time-based interval)
  // Token refresh now happens automatically on user activity, no manual intervention
  useActivityTracker({
    enabled: !!user, // Only track activity when user is logged in
    debounceMs: 5 * 60 * 1000, // Check at most once per 5 minutes
    refreshThresholdMs: 10 * 60 * 1000, // Refresh when <10 minutes remaining
    onActivity: () => {
      logger.debug('👆 User activity detected');
    }
  });

  // Fallback: Background check for expired sessions (catches edge cases)
  useEffect(() => {
    if (!user) return;

    const checkSessionExpiry = async () => {
      if (authService.isAuthenticated()) {
        const token = authService.getStoredToken();
        if (!token) {
          logger.info('⚠️ Session expired due to missing token - logging out');
          await handleLogout();
        }
      }
    };

    // Check every 10 minutes for expired sessions
    const interval = setInterval(checkSessionExpiry, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  // Authentication functions - copied exactly from App.tsx to preserve behavior
  const handleAuthSuccess = (userData: User) => {
    setUser(userData);
    setCurrentRole(userData.role);
    setAuthError(null);
  };

  const handleAuthError = (error: AuthError) => {
    setAuthError(error);
    logger.error('Authentication error:', error);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      logger.warn('Logout service call failed:', error);
    }

    // Clear ALL cached queries on logout
    logger.info('🧹 Clearing all cached data on logout...');
    queryClient.clear();

    // PHASE 3.2: Clear profile cache on logout
    ProfileCache.clear();

    setUser(null);
    setCurrentView('dashboard');
    setCurrentRole('athlete');
    setAuthError(null);

    logger.debug('✅ Cache cleared and user logged out');
  };

  const handleRoleSwitch = () => {
    const newRole = currentRole === 'coach' ? 'athlete' : 'coach';
    setCurrentRole(newRole);
    setCurrentView('dashboard');

    // Invalidate role-specific data
    logger.info(`🔄 Role switched to ${newRole}, invalidating role-specific caches...`);
    queryClient.invalidateEntity('dashboard');
    queryClient.invalidateEntity('calendar');
    queryClient.invalidateEntity('training');

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Role-specific caches invalidated');
    }
  };

  // Login function - now using real backend authentication
  // PHASE 3.2: Now caches profile for instant subsequent loads
  const handleLogin = async (username: string, password: string, rememberMe: boolean): Promise<void> => {
    try {
      const loginResponse = await authService.login({
        username,
        password,
        rememberMe
      });

      // Clear cache before login to ensure fresh data
      console.log('🧹 Clearing cache before login...');
      queryClient.clear();

      // Add avatar color to user data
      const userData: User = {
        ...loginResponse.user,
        avatarColor: assignAvatarColor(loginResponse.user.firstName, loginResponse.user.lastName)
      };

      // PHASE 3.2: Cache profile for instant subsequent loads
      ProfileCache.set(userData);

      handleAuthSuccess(userData);

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ User logged in with fresh cache');
      }

    } catch (error) {
      // Log authentication error
      errorLogger.logAuthError(error as Error, 'login');

      if (error && typeof error === 'object' && 'type' in error) {
        handleAuthError(error as AuthError);
      } else {
        handleAuthError({
          type: 'login',
          message: 'Login failed. Please try again.'
        });
      }
      throw error;
    }
  };

  // Signup function - now using real backend authentication
  // PHASE 3.2: Now caches profile for instant subsequent loads
  const handleSignup = async (userData: SignupData): Promise<void> => {
    try {
      console.log('AuthContext: Calling authService.signup with:', userData);
      const signupResponse = await authService.signup(userData);
      console.log('AuthContext: Signup response received:', signupResponse);

      // Add avatar color to user data
      const newUser: User = {
        ...signupResponse.user,
        avatarColor: assignAvatarColor(signupResponse.user.firstName, signupResponse.user.lastName)
      };

      // PHASE 3.2: Cache profile for instant subsequent loads
      ProfileCache.set(newUser);

      handleAuthSuccess(newUser);

    } catch (error) {
      // Re-throw the error so SignupForm can handle field-specific validation errors
      throw error;
    }
  };

  // Password reset function - now using real backend authentication
  const handlePasswordReset = async (email: string): Promise<void> => {
    try {
      const resetResponse = await authService.requestPasswordReset(email);

      if (!resetResponse.success) {
        throw new Error(resetResponse.message);
      }

      console.log('Password reset email sent to:', email);

    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error) {
        handleAuthError(error as AuthError);
      } else {
        handleAuthError({
          type: 'reset',
          message: 'Password reset failed. Please try again.'
        });
      }
      throw error;
    }
  };

  // Password reset confirm function - validates token and sets new password
  const handlePasswordResetConfirm = async (combinedToken: string, password: string): Promise<void> => {
    try {
      // Split the combined token into uid and token (format: "uid-token")
      const [uid, token] = combinedToken.split('-', 2);

      if (!uid || !token) {
        throw new Error('Invalid reset token format');
      }

      const confirmResponse = await authService.confirmPasswordReset(uid, token, password);

      if (!confirmResponse.success) {
        throw new Error(confirmResponse.message);
      }

      console.log('Password reset confirmed successfully');

    } catch (error) {
      if (error && typeof error === 'object' && 'type' in error) {
        handleAuthError(error as AuthError);
      } else {
        handleAuthError({
          type: 'reset-confirm',
          message: 'Password reset failed. Please try again.'
        });
      }
      throw error;
    }
  };

  // Memoized context value - only recreated when state changes
  const value: AuthContextType = useMemo(() => ({
    user,
    currentRole,
    authError,
    isInitializing,
    currentView,
    setCurrentView,
    handleAuthSuccess,
    handleAuthError,
    handleLogin,
    handleSignup,
    handlePasswordReset,
    handlePasswordResetConfirm,
    handleLogout,
    handleRoleSwitch,
  }), [user, currentRole, authError, isInitializing, currentView]);

  // Expose test functions to window for debugging
  React.useEffect(() => {
    (window as any).testApiConnection = async () => {
      console.log('Testing API connection...');
      try {
        const response = await fetch('http://localhost:8001/api/v1/users/register/', {
          method: 'OPTIONS',
          headers: {
            'Origin': 'http://localhost:3002',
            'Content-Type': 'application/json'
          }
        });
        console.log('API Test Response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
      } catch (error) {
        console.error('API Test Failed:', error);
      }
    };

    (window as any).testRegistration = async () => {
      console.log('Testing actual registration...');
      try {
        const testData = {
          username: "testuser" + Date.now(),
          email: "testuser" + Date.now() + "@example.com", 
          password: "TestPassword123!",
          password_confirm: "TestPassword123!",
          first_name: "Test",
          last_name: "User",
          user_type: "athlete",
          country_number: "+1",
          phone_number: "1234567890"
        };

        console.log('Sending registration data:', testData);

        const response = await fetch('http://localhost:8001/api/v1/users/register/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'http://localhost:3002'
          },
          body: JSON.stringify(testData)
        });

        console.log('Registration response status:', response.status);
        const data = await response.json();
        console.log('Registration response data:', data);

      } catch (error) {
        console.error('Registration Test Failed:', error);
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
