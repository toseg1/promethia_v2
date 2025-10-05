// Loading State Component - Provides loading indicators that match existing styling

import React, { memo } from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingStateProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'skeleton' | 'minimal';
  className?: string;
  children?: React.ReactNode;
}

export const LoadingState = memo(function LoadingState({ 
  size = 'md', 
  variant = 'spinner',
  className = '',
  children 
}: LoadingStateProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6', 
    lg: 'w-8 h-8'
  };

  if (variant === 'minimal') {
    return (
      <div className={`inline-flex items-center gap-2 text-muted-foreground ${className}`}>
        <RefreshCw size={16} className="animate-spin" />
        {children}
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <RefreshCw className={`${sizeClasses[size]} animate-spin text-primary`} />
        {children && (
          <span className="text-sm text-muted-foreground">{children}</span>
        )}
      </div>
    </div>
  );
});

// Skeleton components for specific use cases
export const CardSkeleton = memo(function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse p-4 border border-border/20 rounded-lg ${className}`}>
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-1/4"></div>
        <div className="h-8 bg-muted rounded w-3/4"></div>
        <div className="h-3 bg-muted rounded w-1/2"></div>
      </div>
    </div>
  );
});

export const StatCardSkeleton = memo(function StatCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse p-4 bg-white rounded-lg border border-border/20 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 bg-muted rounded w-1/3"></div>
        <div className="h-4 w-4 bg-muted rounded"></div>
      </div>
      <div className="h-8 bg-muted rounded w-1/2 mb-2"></div>
      <div className="h-3 bg-muted rounded w-2/3"></div>
    </div>
  );
});

export const ChartSkeleton = memo(function ChartSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse p-6 bg-white rounded-lg border border-border/20 ${className}`}>
      <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
      <div className="h-64 bg-muted rounded"></div>
    </div>
  );
});

// Hook for managing loading states
export function useLoadingState(isLoading: boolean, delay: number = 200) {
  const [shouldShowLoading, setShouldShowLoading] = React.useState(false);

  React.useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (isLoading) {
      // Delay showing loading state to avoid flicker for fast requests
      timeoutId = setTimeout(() => {
        setShouldShowLoading(true);
      }, delay);
    } else {
      setShouldShowLoading(false);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isLoading, delay]);

  return shouldShowLoading;
}