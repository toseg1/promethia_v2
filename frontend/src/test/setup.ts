// Test Setup - Global test configuration and mocks

import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Global mocks
beforeEach(() => {
  // Mock window.matchMedia (for responsive components)
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock window.ResizeObserver
  global.ResizeObserver = vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));

  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock sessionStorage
  Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock fetch
  global.fetch = vi.fn();

  // Mock console.error to avoid noise in tests (but still allow actual errors)
  const originalError = console.error;
  console.error = vi.fn((message: string, ...args: any[]) => {
    // Allow React error boundary errors to show
    if (typeof message === 'string' && message.includes('Error boundaries')) {
      originalError(message, ...args);
    }
  });
});

// Global test utilities
export const mockUser = {
  id: 'test-user-1',
  username: 'testuser',
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  role: 'athlete' as const,
  phone: '+33123456789',
  countryCode: 'FR'
};

export const mockCoachUser = {
  ...mockUser,
  id: 'test-coach-1',
  username: 'testcoach',
  role: 'coach' as const
};

export const mockTrainingEvent = {
  id: 'event-1',
  title: 'Morning Run',
  type: 'training' as const,
  sport: 'Running',
  date: '2024-08-24',
  startTime: '09:00',
  duration: 60,
  intensity: 'medium' as const,
  completed: false,
  createdBy: 'test-user-1',
  createdAt: '2024-08-24T08:00:00.000Z',
  updatedAt: '2024-08-24T08:00:00.000Z'
};

// Mock API responses
export const createMockApiResponse = <T>(data: T, success = true) => ({
  success,
  data: success ? data : null,
  error: success ? undefined : { message: 'Mock error', code: 'TEST_ERROR' },
  timestamp: new Date().toISOString()
});

// Helper to create mock promises
export const createMockPromise = <T>(data: T, delay = 0, shouldReject = false) => {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      if (shouldReject) {
        reject(new Error('Mock error'));
      } else {
        resolve(data);
      }
    }, delay);
  });
};