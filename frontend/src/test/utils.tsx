// Test Utilities - Helper functions for testing React components

import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { AuthProvider, AppStateProvider } from '../contexts';
import { ErrorBoundary } from '../components/error/ErrorBoundary';
import { mockUser, mockCoachUser } from './setup';

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialUser?: typeof mockUser | null;
  initialRole?: string;
  withErrorBoundary?: boolean;
}

export function renderWithProviders(
  ui: React.ReactElement,
  {
    initialUser = mockUser,
    initialRole = 'athlete',
    withErrorBoundary = true,
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    const providers = (
      <AuthProvider>
        <AppStateProvider>
          {children}
        </AppStateProvider>
      </AuthProvider>
    );

    if (withErrorBoundary) {
      return (
        <ErrorBoundary>
          {providers}
        </ErrorBoundary>
      );
    }

    return providers;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock the contexts with specific values
export function renderWithMockedAuth(
  ui: React.ReactElement,
  mockAuthValues: any = {},
  mockAppStateValues: any = {}
) {
  const AuthContextMock = React.createContext({
    user: mockUser,
    currentRole: 'athlete',
    authError: null,
    currentView: 'dashboard',
    setCurrentView: vi.fn(),
    handleAuthSuccess: vi.fn(),
    handleAuthError: vi.fn(),
    handleLogin: vi.fn(),
    handleSignup: vi.fn(),
    handlePasswordReset: vi.fn(),
    handleLogout: vi.fn(),
    handleRoleSwitch: vi.fn(),
    ...mockAuthValues
  });

  const AppStateContextMock = React.createContext({
    isMobile: false,
    setIsMobile: vi.fn(),
    isEventModalOpen: false,
    setIsEventModalOpen: vi.fn(),
    editingEvent: null,
    setEditingEvent: vi.fn(),
    handleAddEvent: vi.fn(),
    handleCloseEventModal: vi.fn(),
    ...mockAppStateValues
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContextMock.Provider value={React.useContext(AuthContextMock)}>
        <AppStateContextMock.Provider value={React.useContext(AppStateContextMock)}>
          {children}
        </AppStateContextMock.Provider>
      </AuthContextMock.Provider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

// Async test helpers
export const waitFor = (condition: () => boolean, timeout = 1000) => {
  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now();
    
    function check() {
      if (condition()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error('Timeout waiting for condition'));
      } else {
        setTimeout(check, 10);
      }
    }
    
    check();
  });
};

// Mock service functions
export const createMockService = <T extends Record<string, any>>(
  serviceName: string,
  methods: Partial<T>
) => {
  const mockService = {} as T;
  
  Object.keys(methods).forEach(methodName => {
    mockService[methodName as keyof T] = vi.fn().mockImplementation(
      methods[methodName as keyof T]
    );
  });
  
  return mockService;
};

// Component testing helpers
export const getByTestId = (container: HTMLElement, testId: string) => {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Unable to find element with data-testid: ${testId}`);
  }
  return element;
};

export const queryByTestId = (container: HTMLElement, testId: string) => {
  return container.querySelector(`[data-testid="${testId}"]`);
};

// Form testing helpers
export const fillForm = async (form: HTMLElement, data: Record<string, string>) => {
  const { fireEvent } = await import('@testing-library/react');
  
  Object.entries(data).forEach(([name, value]) => {
    const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
    if (input) {
      fireEvent.change(input, { target: { value } });
    }
  });
};

export const submitForm = async (form: HTMLElement) => {
  const { fireEvent } = await import('@testing-library/react');
  fireEvent.submit(form);
};

// Navigation testing helpers
export const clickNavItem = async (container: HTMLElement, label: string) => {
  const { fireEvent } = await import('@testing-library/react');
  
  const navItem = container.querySelector(`button:contains("${label}")`) ||
                  container.querySelector(`[aria-label="${label}"]`);
  
  if (navItem) {
    fireEvent.click(navItem);
  }
};

// Error boundary testing
export const triggerErrorBoundary = (component: any) => {
  // Helper to trigger error boundary for testing
  const ThrowError = () => {
    throw new Error('Test error');
  };
  
  return render(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );
};

// Mock timers helper
export const advanceTimers = (ms: number) => {
  vi.advanceTimersByTime(ms);
};

export * from '@testing-library/react';
export { vi } from 'vitest';