// Enhanced Skeleton Loader Components

import React, { memo } from 'react';
import { LoadingState } from './LoadingState';

// Re-export LoadingState for convenience
export { LoadingState };

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

export const SkeletonLine = memo(function SkeletonLine({ 
  className = "h-4 bg-muted", 
  animate = true 
}: SkeletonProps) {
  return (
    <div 
      className={`rounded ${className} ${animate ? 'animate-pulse' : ''}`}
      role="presentation"
      aria-hidden="true"
    />
  );
});

export const SkeletonCard = memo(function SkeletonCard({ animate = true }: { animate?: boolean }) {
  return (
    <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <SkeletonLine className="h-3 bg-muted mb-2 w-20" animate={animate} />
          <SkeletonLine className="h-8 bg-muted mb-1 w-16" animate={animate} />
          <SkeletonLine className="h-3 bg-muted w-24" animate={animate} />
        </div>
        <div className="p-3 bg-muted rounded-lg">
          <SkeletonLine className="h-6 w-6 bg-muted-foreground/20" animate={animate} />
        </div>
      </div>
    </div>
  );
});

export const SkeletonTable = memo(function SkeletonTable({ 
  rows = 5, 
  cols = 4,
  animate = true 
}: { 
  rows?: number; 
  cols?: number;
  animate?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-border/20 overflow-hidden">
      <div className="p-4 border-b border-border/20">
        <SkeletonLine className="h-5 bg-muted w-32" animate={animate} />
      </div>
      <div className="divide-y divide-border/20">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4">
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {Array.from({ length: cols }).map((_, colIndex) => (
                <SkeletonLine 
                  key={colIndex}
                  className={`h-4 bg-muted ${colIndex === 0 ? 'w-full' : 'w-3/4'}`}
                  animate={animate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

export const SkeletonChart = memo(function SkeletonChart({ 
  height = 300,
  animate = true 
}: { 
  height?: number;
  animate?: boolean;
}) {
  return (
    <div className="bg-white p-6 rounded-xl border border-border/20">
      <div className="mb-6">
        <SkeletonLine className="h-6 bg-muted w-48 mb-2" animate={animate} />
        <SkeletonLine className="h-4 bg-muted w-32" animate={animate} />
      </div>
      <div 
        className={`bg-muted rounded-lg ${animate ? 'animate-pulse' : ''}`}
        style={{ height: `${height}px` }}
        role="presentation"
        aria-hidden="true"
      >
        <div className="flex items-end justify-around h-full p-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={index}
              className="bg-muted-foreground/20 rounded-t"
              style={{ 
                height: `${Math.random() * 60 + 20}%`,
                width: '8%'
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

export const SkeletonProfile = memo(function SkeletonProfile({ animate = true }: { animate?: boolean }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-border/20">
      <div className="flex items-center gap-6 mb-6">
        <div className={`w-20 h-20 bg-muted rounded-full ${animate ? 'animate-pulse' : ''}`} />
        <div className="flex-1">
          <SkeletonLine className="h-6 bg-muted w-48 mb-2" animate={animate} />
          <SkeletonLine className="h-4 bg-muted w-32 mb-1" animate={animate} />
          <SkeletonLine className="h-4 bg-muted w-24" animate={animate} />
        </div>
      </div>
      <div className="space-y-4">
        <div>
          <SkeletonLine className="h-4 bg-muted w-24 mb-2" animate={animate} />
          <SkeletonLine className="h-10 bg-muted w-full" animate={animate} />
        </div>
        <div>
          <SkeletonLine className="h-4 bg-muted w-20 mb-2" animate={animate} />
          <SkeletonLine className="h-10 bg-muted w-full" animate={animate} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SkeletonLine className="h-4 bg-muted w-16 mb-2" animate={animate} />
            <SkeletonLine className="h-10 bg-muted w-full" animate={animate} />
          </div>
          <div>
            <SkeletonLine className="h-4 bg-muted w-20 mb-2" animate={animate} />
            <SkeletonLine className="h-10 bg-muted w-full" animate={animate} />
          </div>
        </div>
      </div>
    </div>
  );
});

export const SkeletonEventModal = memo(function SkeletonEventModal({ animate = true }: { animate?: boolean }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <SkeletonLine className="h-8 bg-muted w-48" animate={animate} />
        <SkeletonLine className="h-8 w-8 bg-muted rounded" animate={animate} />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <SkeletonLine className="h-4 bg-muted w-20 mb-2" animate={animate} />
          <SkeletonLine className="h-10 bg-muted w-full" animate={animate} />
        </div>
        <div>
          <SkeletonLine className="h-4 bg-muted w-16 mb-2" animate={animate} />
          <SkeletonLine className="h-10 bg-muted w-full" animate={animate} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <SkeletonLine className="h-4 bg-muted w-12 mb-2" animate={animate} />
          <SkeletonLine className="h-10 bg-muted w-full" animate={animate} />
        </div>
        <div>
          <SkeletonLine className="h-4 bg-muted w-20 mb-2" animate={animate} />
          <SkeletonLine className="h-10 bg-muted w-full" animate={animate} />
        </div>
        <div>
          <SkeletonLine className="h-4 bg-muted w-16 mb-2" animate={animate} />
          <SkeletonLine className="h-10 bg-muted w-full" animate={animate} />
        </div>
      </div>

      <div>
        <SkeletonLine className="h-4 bg-muted w-16 mb-2" animate={animate} />
        <SkeletonLine className="h-24 bg-muted w-full" animate={animate} />
      </div>

      <div className="flex justify-end gap-2">
        <SkeletonLine className="h-10 w-20 bg-muted" animate={animate} />
        <SkeletonLine className="h-10 w-24 bg-muted" animate={animate} />
      </div>
    </div>
  );
});

export const SkeletonList = memo(function SkeletonList({ 
  items = 5,
  animate = true 
}: { 
  items?: number;
  animate?: boolean;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border border-border/20">
          <div className={`w-10 h-10 bg-muted rounded-full ${animate ? 'animate-pulse' : ''}`} />
          <div className="flex-1">
            <SkeletonLine className="h-4 bg-muted w-3/4 mb-1" animate={animate} />
            <SkeletonLine className="h-3 bg-muted w-1/2" animate={animate} />
          </div>
          <SkeletonLine className="h-4 w-16 bg-muted" animate={animate} />
        </div>
      ))}
    </div>
  );
});

interface LoadingOverlayProps {
  loading: boolean;
  children: React.ReactNode;
  skeleton?: React.ReactNode;
  overlay?: boolean;
}

export const LoadingOverlay = memo(function LoadingOverlay({ 
  loading, 
  children, 
  skeleton,
  overlay = false 
}: LoadingOverlayProps) {
  if (loading && skeleton) {
    return <>{skeleton}</>;
  }

  if (loading && overlay) {
    return (
      <div className="relative">
        <div className="opacity-50">{children}</div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
          <LoadingState size="lg" />
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingState size="lg" />;
  }

  return <>{children}</>;
});