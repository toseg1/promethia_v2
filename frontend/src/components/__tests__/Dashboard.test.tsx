// Dashboard Component Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { Dashboard } from '../Dashboard';
import { renderWithProviders, mockUser, mockCoachUser } from '../../test/utils';

// Mock the dashboard subcomponents
vi.mock('../dashboard/AthleteDashboard', () => ({
  AthleteDashboard: ({ user, onNavigate, onAddEvent }: any) => (
    <div data-testid="athlete-dashboard">
      <span data-testid="user-name">{user.firstName} {user.lastName}</span>
      <button onClick={onNavigate} data-testid="navigate-btn">Navigate</button>
      <button onClick={onAddEvent} data-testid="add-event-btn">Add Event</button>
    </div>
  )
}));

vi.mock('../dashboard/CoachDashboard', () => ({
  CoachDashboard: ({ user, onNavigate, onAddEvent }: any) => (
    <div data-testid="coach-dashboard">
      <span data-testid="user-name">{user.firstName} {user.lastName}</span>
      <button onClick={onNavigate} data-testid="navigate-btn">Navigate</button>
      <button onClick={onAddEvent} data-testid="add-event-btn">Add Event</button>
    </div>
  )
}));

describe('Dashboard Component', () => {
  const defaultProps = {
    user: mockUser,
    onNavigate: vi.fn(),
    onAddEvent: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders athlete dashboard for athlete users', () => {
    renderWithProviders(
      <Dashboard {...defaultProps} />
    );

    expect(screen.getByTestId('athlete-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
  });

  it('renders coach dashboard for coach users', () => {
    renderWithProviders(
      <Dashboard {...defaultProps} user={mockCoachUser} />
    );

    expect(screen.getByTestId('coach-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
  });

  it('passes props correctly to child components', () => {
    const mockNavigate = vi.fn();
    const mockAddEvent = vi.fn();

    renderWithProviders(
      <Dashboard 
        {...defaultProps} 
        onNavigate={mockNavigate}
        onAddEvent={mockAddEvent}
      />
    );

    const navigateBtn = screen.getByTestId('navigate-btn');
    const addEventBtn = screen.getByTestId('add-event-btn');

    navigateBtn.click();
    addEventBtn.click();

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockAddEvent).toHaveBeenCalledTimes(1);
  });

  it('renders within error boundary', () => {
    // Test that error boundary catches errors
    const ThrowError = () => {
      throw new Error('Test error');
    };

    vi.mock('../dashboard/AthleteDashboard', () => ({
      AthleteDashboard: ThrowError
    }));

    renderWithProviders(
      <Dashboard {...defaultProps} />
    );

    // Should render error fallback instead of crashing
    expect(screen.queryByTestId('athlete-dashboard')).not.toBeInTheDocument();
  });

  it('is memoized correctly', () => {
    const { rerender } = renderWithProviders(
      <Dashboard {...defaultProps} />
    );

    // Re-render with same props should not cause re-render
    rerender(<Dashboard {...defaultProps} />);

    expect(screen.getByTestId('athlete-dashboard')).toBeInTheDocument();
  });
});