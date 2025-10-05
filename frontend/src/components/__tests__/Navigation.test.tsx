// Navigation Component Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { Navigation } from '../Navigation';
import { renderWithProviders, mockUser, mockCoachUser } from '../../test/utils';

describe('Navigation Component', () => {
  const defaultProps = {
    user: mockUser,
    currentView: 'dashboard' as const,
    onNavigate: vi.fn(),
    onLogout: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders navigation menu correctly', () => {
    renderWithProviders(<Navigation {...defaultProps} />);

    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders different menu items for athlete vs coach', () => {
    const { rerender } = renderWithProviders(<Navigation {...defaultProps} />);

    // Test athlete navigation
    expect(screen.getByText('My Training')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();

    // Test coach navigation
    rerender(<Navigation {...defaultProps} user={mockCoachUser} />);
    expect(screen.getByText('Athletes')).toBeInTheDocument();
    expect(screen.getByText('Programs')).toBeInTheDocument();
  });

  it('highlights current active view', () => {
    renderWithProviders(<Navigation {...defaultProps} currentView="calendar" />);

    const calendarItem = screen.getByText('Calendar').closest('button');
    expect(calendarItem).toHaveClass('active');
  });

  it('handles navigation item clicks', () => {
    renderWithProviders(<Navigation {...defaultProps} />);

    const calendarButton = screen.getByText('Calendar').closest('button');
    if (calendarButton) {
      fireEvent.click(calendarButton);
      expect(defaultProps.onNavigate).toHaveBeenCalledWith('calendar');
    }
  });

  it('displays user information correctly', () => {
    renderWithProviders(<Navigation {...defaultProps} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
    expect(screen.getByText('athlete')).toBeInTheDocument();
  });

  it('handles logout button click', () => {
    renderWithProviders(<Navigation {...defaultProps} />);

    const logoutButton = screen.getByText('Logout').closest('button');
    if (logoutButton) {
      fireEvent.click(logoutButton);
      expect(defaultProps.onLogout).toHaveBeenCalled();
    }
  });

  it('shows role-specific menu sections', () => {
    renderWithProviders(<Navigation {...defaultProps} />);

    // Should show athlete-specific sections
    expect(screen.getByText('Training')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('handles role switching for multi-role users', () => {
    const multiRoleUser = {
      ...mockUser,
      roles: ['athlete', 'coach']
    };

    renderWithProviders(<Navigation {...defaultProps} user={multiRoleUser} />);

    // Should show role switcher
    const roleSwitcher = screen.getByLabelText(/switch role/i);
    expect(roleSwitcher).toBeInTheDocument();

    fireEvent.click(roleSwitcher);
    expect(screen.getByText('Coach View')).toBeInTheDocument();
  });

  it('displays notification badges', () => {
    const userWithNotifications = {
      ...mockUser,
      notifications: {
        unread: 3,
        messages: 1,
        alerts: 2
      }
    };

    renderWithProviders(<Navigation {...defaultProps} user={userWithNotifications} />);

    expect(screen.getByText('3')).toBeInTheDocument(); // notification count
  });

  it('handles keyboard navigation', () => {
    renderWithProviders(<Navigation {...defaultProps} />);

    const firstMenuItem = screen.getByText('Dashboard').closest('button');
    if (firstMenuItem) {
      firstMenuItem.focus();
      
      // Simulate arrow key navigation
      fireEvent.keyDown(firstMenuItem, { key: 'ArrowDown' });
      
      const nextItem = screen.getByText('Calendar').closest('button');
      expect(nextItem).toHaveFocus();
    }
  });

  it('shows/hides navigation items based on permissions', () => {
    const restrictedUser = {
      ...mockUser,
      permissions: ['dashboard', 'calendar']
    };

    renderWithProviders(<Navigation {...defaultProps} user={restrictedUser} />);

    // Should show permitted items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Calendar')).toBeInTheDocument();

    // Should hide restricted items
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
  });

  it('handles navigation collapse/expand', () => {
    renderWithProviders(<Navigation {...defaultProps} />);

    const collapseButton = screen.getByLabelText(/collapse navigation/i);
    fireEvent.click(collapseButton);

    // Should collapse navigation
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('collapsed');
  });

  it('displays breadcrumbs for current location', () => {
    renderWithProviders(<Navigation {...defaultProps} currentView="metrics" />);

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Metrics')).toBeInTheDocument();
  });

  it('handles search functionality', () => {
    renderWithProviders(<Navigation {...defaultProps} />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'calendar' } });

    // Should highlight matching menu items
    const calendarItem = screen.getByText('Calendar').closest('button');
    expect(calendarItem).toHaveClass('highlighted');
  });
});