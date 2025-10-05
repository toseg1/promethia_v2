import { useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AuthRedirectOptions {
  redirectOnLogin?: string;
  redirectOnLogout?: string;
  redirectOnRoleChange?: boolean;
  onAuthSuccess?: (user: any) => void;
  onAuthError?: (error: any) => void;
}

/**
 * Custom hook to handle authentication-based redirects and side effects
 */
export function useAuthRedirect(options: AuthRedirectOptions = {}) {
  const { 
    redirectOnLogin = '/dashboard',
    redirectOnLogout = '/',
    redirectOnRoleChange = true,
    onAuthSuccess,
    onAuthError
  } = options;

  const { user, currentRole, authError, setCurrentView } = useAuth();

  // Handle successful authentication
  useEffect(() => {
    if (user && !authError) {
      // Store intended destination before login (if any)
      const intendedDestination = sessionStorage.getItem('intendedDestination');
      
      if (intendedDestination) {
        sessionStorage.removeItem('intendedDestination');
        // Parse the intended destination and set appropriate view
        const view = parseDestinationToView(intendedDestination);
        setCurrentView(view);
      } else {
        // Default redirect behavior
        setCurrentView('dashboard');
      }
      
      // Call success callback
      if (onAuthSuccess) {
        onAuthSuccess(user);
      }
      
      // Log successful authentication
      console.info(`User ${user.username} authenticated successfully as ${currentRole}`);
    }
  }, [user, authError, setCurrentView, onAuthSuccess, currentRole]);

  // Handle authentication errors
  useEffect(() => {
    if (authError) {
      if (onAuthError) {
        onAuthError(authError);
      }
      
      // Log authentication error
      console.warn('Authentication error:', authError);
    }
  }, [authError, onAuthError]);

  // Handle role changes
  useEffect(() => {
    if (user && redirectOnRoleChange) {
      // Reset view to dashboard when role changes
      setCurrentView('dashboard');
      console.info(`User role changed to: ${currentRole}`);
    }
  }, [currentRole, redirectOnRoleChange, setCurrentView, user]);

  // Utility function to store intended destination
  const storeIntendedDestination = useCallback((destination: string) => {
    sessionStorage.setItem('intendedDestination', destination);
  }, []);

  // Utility function to parse destination to view type
  const parseDestinationToView = useCallback((destination: string) => {
    const viewMap: Record<string, any> = {
      '/dashboard': 'dashboard',
      '/calendar': 'calendar',
      '/metrics': 'metrics',
      '/analytics': 'analytics',
      '/profile': 'profile',
      '/coach': 'coach'
    };
    
    return viewMap[destination] || 'dashboard';
  }, []);

  // Check if user should be redirected
  const shouldRedirect = useCallback((requireAuth: boolean = true) => {
    if (requireAuth && !user) {
      return { shouldRedirect: true, destination: redirectOnLogout };
    }
    
    if (!requireAuth && user) {
      return { shouldRedirect: true, destination: redirectOnLogin };
    }
    
    return { shouldRedirect: false, destination: null };
  }, [user, redirectOnLogin, redirectOnLogout]);

  return {
    isAuthenticated: !!user,
    isLoading: !user && !authError,
    error: authError,
    currentRole,
    storeIntendedDestination,
    shouldRedirect
  };
}

/**
 * Hook for handling login redirects specifically
 */
export function useLoginRedirect() {
  return useAuthRedirect({
    redirectOnLogin: '/dashboard',
    onAuthSuccess: (user) => {
      // Show welcome message
      console.info(`Welcome back, ${user.firstName}!`);
    }
  });
}

/**
 * Hook for handling logout redirects specifically  
 */
export function useLogoutRedirect() {
  const { handleLogout } = useAuth();
  
  const logout = useCallback(async () => {
    try {
      await handleLogout();
      // Clear any stored destinations
      sessionStorage.removeItem('intendedDestination');
      
      // The AuthContext will handle state reset
      console.info('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  }, [handleLogout]);

  return { logout };
}