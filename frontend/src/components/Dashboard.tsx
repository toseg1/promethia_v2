import React, { memo } from 'react';
import { ErrorBoundary } from './error/ErrorBoundary';
import { DashboardErrorFallback } from './error/DashboardErrorFallback';
import { CoachDashboard } from './dashboard/CoachDashboard';
import { AthleteDashboard } from './dashboard/AthleteDashboard';
import { DashboardProps } from '../types';
import { errorLogger } from '../services/errorLogger';

export const Dashboard = memo(function Dashboard({ user, onNavigate, onAddEvent }: DashboardProps) {
  const isCoach = user.role === 'coach';

  const handleDashboardError = (error: Error) => {
    errorLogger.logComponentError(error, isCoach ? 'CoachDashboard' : 'AthleteDashboard', {
      userId: user.id,
      userRole: user.role,
      isCoach
    });
  };

  if (isCoach) {
    return (
      <ErrorBoundary 
        fallback={DashboardErrorFallback}
        onError={handleDashboardError}
      >
        <CoachDashboard 
          user={user} 
          onNavigate={onNavigate} 
          onAddEvent={onAddEvent} 
        />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary 
      fallback={DashboardErrorFallback}
      onError={handleDashboardError}
    >
      <AthleteDashboard 
        user={user} 
        onNavigate={onNavigate} 
        onAddEvent={onAddEvent} 
      />
    </ErrorBoundary>
  );
});

// Add default export for lazy loading
export default Dashboard;