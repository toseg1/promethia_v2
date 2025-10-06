import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { apiClient } from '../services/apiClient';
import { backendWakeupEmitter } from '../utils/backendWakeupEmitter';

interface BackendWakeupContextValue {
  isBackendAwake: boolean;
  isChecking: boolean;
  attempts: number;
  lastCheckedAt: number | null;
  lastError: string | null;
  showWakeupOverlay: boolean;
  remainingRetries: number;
  retry: () => void;
}

const BackendWakeupContext = createContext<BackendWakeupContextValue | undefined>(undefined);

const HEALTH_ENDPOINT = '/api/health/';
const CHECK_TIMEOUT_MS = 9000;
const OVERLAY_DELAY_MS = 600;
const RETRY_SEQUENCE_MS = [1500, 3000, 6000, 10000];

interface BackendWakeupProviderProps {
  children: React.ReactNode;
}

export function BackendWakeupProvider({ children }: BackendWakeupProviderProps) {
  const [isBackendAwake, setIsBackendAwake] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [attempts, setAttempts] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [showWakeupOverlay, setShowWakeupOverlay] = useState(false);
  const [remainingRetries, setRemainingRetries] = useState(RETRY_SEQUENCE_MS.length);

  const retryDelayIndexRef = useRef(0);
  const retryTimeoutRef = useRef<number | null>(null);
  const overlayTimeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isCheckingRef = useRef(false);

  // Track mount status and clear timers when unmounting
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
      }
      if (overlayTimeoutRef.current !== null) {
        window.clearTimeout(overlayTimeoutRef.current);
      }
    };
  }, []);

  const clearRetryTimeout = () => {
    if (retryTimeoutRef.current !== null) {
      window.clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  };

  const clearOverlayTimeout = () => {
    if (overlayTimeoutRef.current !== null) {
      window.clearTimeout(overlayTimeoutRef.current);
      overlayTimeoutRef.current = null;
    }
  };

  const computeHealthUrl = useCallback(() => {
    const baseOrigin = apiClient.getBaseOrigin().replace(/\/$/, '');
    if (HEALTH_ENDPOINT.startsWith('/')) {
      return `${baseOrigin}${HEALTH_ENDPOINT}`;
    }
    return `${baseOrigin}/${HEALTH_ENDPOINT}`;
  }, []);

  const performHealthCheck = useCallback(async (): Promise<boolean> => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

    try {
      const response = await fetch(computeHealthUrl(), {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown status'}`);
      }

      // Best effort JSON parsing to surface backend messages, but ignore parse errors
      try {
        const data = await response.json();
        if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
          console.log(`ℹ️ Backend health check message: ${data.message}`);
        }
      } catch (parseError) {
        // Non-fatal: health responses might not always be JSON
      }

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown network error';
      if (isMountedRef.current) {
        setLastError(message);
      }
      return false;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }, [computeHealthUrl]);

  const checkBackend = useCallback(async () => {
    if (isCheckingRef.current) {
      return false;
    }

    isCheckingRef.current = true;
    setAttempts(prev => prev + 1);
    setIsChecking(true);
    const success = await performHealthCheck();

    if (!isMountedRef.current) {
      isCheckingRef.current = false;
      return success;
    }

    clearRetryTimeout();
    clearOverlayTimeout();
    setLastCheckedAt(Date.now());

    if (success) {
      retryDelayIndexRef.current = 0;
      setIsBackendAwake(true);
      setLastError(null);
      setShowWakeupOverlay(false);
      setRemainingRetries(RETRY_SEQUENCE_MS.length);
    } else {
      setIsBackendAwake(false);
      setShowWakeupOverlay(true);
      const currentIndex = retryDelayIndexRef.current;
      const retryDelay = RETRY_SEQUENCE_MS[Math.min(currentIndex, RETRY_SEQUENCE_MS.length - 1)];
      retryTimeoutRef.current = window.setTimeout(() => {
        if (!isMountedRef.current) {
          return;
        }
        void checkBackend();
      }, retryDelay);
      retryDelayIndexRef.current = Math.min(currentIndex + 1, RETRY_SEQUENCE_MS.length - 1);
      setRemainingRetries(Math.max(RETRY_SEQUENCE_MS.length - (currentIndex + 1), 0));
    }

    setIsChecking(false);
    isCheckingRef.current = false;

    return success;
  }, [performHealthCheck]);

  const beginWakeupFlow = useCallback((showImmediately: boolean = false) => {
    if (!isMountedRef.current) {
      return;
    }

    clearRetryTimeout();
    clearOverlayTimeout();
    retryDelayIndexRef.current = 0;
    setRemainingRetries(RETRY_SEQUENCE_MS.length);

    if (showImmediately) {
      setShowWakeupOverlay(true);
    } else {
      setShowWakeupOverlay(false);
      overlayTimeoutRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          setShowWakeupOverlay(true);
        }
      }, OVERLAY_DELAY_MS);
    }

    setIsChecking(true);
    setIsBackendAwake(false);
    void checkBackend();
  }, [checkBackend]);

  const retry = useCallback(() => {
    beginWakeupFlow(true);
  }, [beginWakeupFlow]);

  // Start wake-up flow on mount
  useEffect(() => {
    beginWakeupFlow(false);
  }, [beginWakeupFlow]);

  // Listen for network failures triggered outside React (e.g., apiClient retries)
  useEffect(() => {
    return backendWakeupEmitter.subscribe('backendUnreachable', () => {
      beginWakeupFlow(true);
    });
  }, [beginWakeupFlow]);

  const value = useMemo<BackendWakeupContextValue>(() => ({
    isBackendAwake,
    isChecking,
    attempts,
    lastCheckedAt,
    lastError,
    showWakeupOverlay,
    remainingRetries,
    retry,
  }), [
    attempts,
    isBackendAwake,
    isChecking,
    lastCheckedAt,
    lastError,
    remainingRetries,
    retry,
    showWakeupOverlay,
  ]);

  return (
    <BackendWakeupContext.Provider value={value}>
      {children}
    </BackendWakeupContext.Provider>
  );
}

export function useBackendWakeup(): BackendWakeupContextValue {
  const context = React.useContext(BackendWakeupContext);
  if (!context) {
    throw new Error('useBackendWakeup must be used within a BackendWakeupProvider');
  }
  return context;
}
