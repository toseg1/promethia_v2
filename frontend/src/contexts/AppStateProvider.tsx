import React, { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';
import { TrainingEvent } from '../types';

// App-level state interface (currently in App.tsx)
interface AppStateContextType {
  // Mobile detection
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
  
  // Event modal state
  isEventModalOpen: boolean;
  setIsEventModalOpen: (isOpen: boolean) => void;
  editingEvent: TrainingEvent | null;
  setEditingEvent: (event: TrainingEvent | null) => void;
  
  // Event handling functions
  handleAddEvent: (event?: TrainingEvent) => void;
  handleCloseEventModal: () => void;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

export function useAppState(): AppStateContextType {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

interface AppStateProviderProps {
  children: ReactNode;
}

/**
 * AppStateProvider Component
 * 
 * Manages app-level state like modals and mobile detection.
 * Preserves exact same behavior as current App.tsx implementation.
 */
export function AppStateProvider({ children }: AppStateProviderProps) {
  // State - exactly same as current App.tsx
  const [isMobile, setIsMobile] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TrainingEvent | null>(null);

  // Memoized event handling functions - prevent unnecessary re-renders
  const handleAddEvent = useCallback((event?: TrainingEvent) => {
    // Explicitly set editingEvent to event if provided, null if not
    setEditingEvent(event ?? null);
    setIsEventModalOpen(true);
  }, []);

  const handleCloseEventModal = useCallback(() => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  }, []);

  // Memoized context value - only recreated when state changes
  const value: AppStateContextType = useMemo(() => ({
    isMobile,
    setIsMobile,
    isEventModalOpen,
    setIsEventModalOpen,
    editingEvent,
    setEditingEvent,
    handleAddEvent,
    handleCloseEventModal,
  }), [isMobile, isEventModalOpen, editingEvent, handleAddEvent, handleCloseEventModal]);

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}