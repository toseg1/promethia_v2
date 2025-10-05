import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingState } from '../ui/LoadingState';
import { authService } from '../../services/authService';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  requireAuth?: boolean;
  requiredRole?: 'athlete' | 'coach';
  onUnauthorized?: () => void;
}

/**
 * AuthGuard - Enhanced authentication wrapper
 * 
 * Provides comprehensive authentication checking including:
 * - Token validation and refresh
 * - Role-based access control
 * - Fallback UI for unauthorized access
 * - Auto-retry on token refresh
 */
export function AuthGuard({
  children,
  fallback,
  requireAuth = true,
  requiredRole,
  onUnauthorized
}: AuthGuardProps) {
  const { user, currentRole, handleLogout } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  // Validate authentication on mount
  useEffect(() => {
    const validateAuth = async () => {
      if (!requireAuth) {
        setIsValidating(false);
        setAuthChecked(true);
        return;
      }

      try {
        setIsValidating(true);
        
        // Check if user should be authenticated
        if (user) {
          // Ensure token is still valid
          const validToken = await authService.ensureValidToken();
          
          if (!validToken) {
            // Token invalid, logout user
            console.warn('Token validation failed, logging out user');
            await handleLogout();
          }
        }
      } catch (error) {
        console.error('Auth validation error:', error);
        
        // On validation error, logout user for security
        if (user) {
          await handleLogout();
        }
      } finally {
        setIsValidating(false);
        setAuthChecked(true);
      }
    };

    validateAuth();
  }, [requireAuth, user, handleLogout]);

  // Handle unauthorized access
  useEffect(() => {
    if (authChecked && requireAuth && !user && onUnauthorized) {
      onUnauthorized();
    }
  }, [authChecked, requireAuth, user, onUnauthorized]);

  // Show loading state while validating
  if (isValidating || !authChecked) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingState size="lg" text="Validating authentication..." />
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default fallback for unauthenticated users
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Authentication Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please log in to access this page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Check role requirement
  if (requiredRole && user && currentRole !== requiredRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600 mb-2">
            This page is only available for <span className="font-semibold">{requiredRole}s</span>.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Your current role: <span className="font-semibold">{currentRole}</span>
          </p>
          <div className="space-y-2">
            <button
              onClick={() => window.history.back()}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Go Back
            </button>
            <p className="text-xs text-gray-400">
              Contact support if you need {requiredRole} access
            </p>
          </div>
        </div>
      </div>
    );
  }

  // User is authenticated and authorized
  return <>{children}</>;
}

/**
 * Simple authentication check hook
 */
export function useAuthCheck() {
  const { user, currentRole } = useAuth();
  
  return {
    isAuthenticated: !!user,
    user,
    currentRole,
    canAccess: (requiredRole?: string) => {
      if (!user) return false;
      if (!requiredRole) return true;
      return currentRole === requiredRole;
    }
  };
}