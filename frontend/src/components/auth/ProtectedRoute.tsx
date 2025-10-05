import React, { ReactNode } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingState } from '../ui/LoadingState';

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
  requireAuth?: boolean;
  requiredRole?: 'athlete' | 'coach';
  fallback?: ReactNode;
}

/**
 * ProtectedRoute Component
 * 
 * Protects routes based on authentication status and user roles.
 * Integrates with the AuthContext to check user authentication.
 */
export function ProtectedRoute({ 
  children, 
  requireAuth = true,
  requiredRole,
  fallback 
}: ProtectedRouteProps) {
  const { user, currentRole } = useAuth();

  // If authentication is required but user is not logged in
  if (requireAuth && !user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    // Return loading state while auth initializes
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingState size="lg" text="Checking authentication..." />
      </div>
    );
  }

  // If specific role is required but user doesn't have it
  if (requiredRole && user && currentRole !== requiredRole) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <div className="bg-white p-6 rounded-xl shadow-lg max-w-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Access Restricted
          </h2>
          <p className="text-gray-600 mb-4">
            This page is only available for {requiredRole}s. 
            Your current role is {currentRole}.
          </p>
          <p className="text-sm text-gray-500">
            Switch to {requiredRole} mode or contact support if you need access.
          </p>
        </div>
      </div>
    );
  }

  // If authentication is not required (public route)
  if (!requireAuth) {
    return <>{children}</>;
  }

  // User is authenticated and has required role
  return <>{children}</>;
}

/**
 * Hook to check if user has access to a specific route
 */
export function useRouteAccess() {
  const { user, currentRole } = useAuth();

  const hasAccess = (requireAuth: boolean = true, requiredRole?: string) => {
    if (requireAuth && !user) {
      return false;
    }
    
    if (requiredRole && currentRole !== requiredRole) {
      return false;
    }
    
    return true;
  };

  return { hasAccess, isAuthenticated: !!user, currentRole };
}

/**
 * Higher Order Component for route protection
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<ProtectedRouteProps, 'children'> = {}
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}