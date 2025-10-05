// Profile Component Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { Profile } from '../Profile';
import { renderWithProviders, mockUser, mockCoachUser } from '../../test/utils';

// Mock the services
vi.mock('../../services/userService', () => ({
  userService: {
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    deleteAccount: vi.fn()
  }
}));

describe('Profile Component', () => {
  const defaultProps = {
    user: mockUser,
    onBack: vi.fn(),
    onUserUpdate: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders user profile information correctly', () => {
    renderWithProviders(<Profile {...defaultProps} />);

    expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
    expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
  });

  it('renders different sections for athlete vs coach', () => {
    const { rerender } = renderWithProviders(<Profile {...defaultProps} />);

    // Test athlete view
    expect(screen.getByText('Training Preferences')).toBeInTheDocument();
    expect(screen.getByText('Performance Goals')).toBeInTheDocument();

    // Test coach view
    rerender(<Profile {...defaultProps} user={mockCoachUser} />);
    expect(screen.getByText('Coaching Credentials')).toBeInTheDocument();
    expect(screen.getByText('Specializations')).toBeInTheDocument();
  });

  it('handles form submission correctly', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ success: true });
    vi.mocked(require('../../services/userService').userService.updateProfile).mockImplementation(mockUpdate);

    renderWithProviders(<Profile {...defaultProps} />);

    // Modify a field
    const firstNameInput = screen.getByDisplayValue('Test');
    fireEvent.change(firstNameInput, { target: { value: 'Updated' } });

    // Submit form
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          firstName: 'Updated'
        })
      );
    });

    expect(defaultProps.onUserUpdate).toHaveBeenCalled();
  });

  it('handles profile image upload', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ avatarUrl: 'new-avatar.jpg' });
    vi.mocked(require('../../services/userService').userService.uploadAvatar).mockImplementation(mockUpload);

    renderWithProviders(<Profile {...defaultProps} />);

    // Simulate file upload
    const fileInput = screen.getByLabelText(/upload avatar/i);
    const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(mockUser.id, file);
    });
  });

  it('validates form fields correctly', async () => {
    renderWithProviders(<Profile {...defaultProps} />);

    // Clear required field
    const emailInput = screen.getByDisplayValue('test@example.com');
    fireEvent.change(emailInput, { target: { value: '' } });

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('handles password change', async () => {
    renderWithProviders(<Profile {...defaultProps} />);

    // Open password change section
    const changePasswordButton = screen.getByText(/change password/i);
    fireEvent.click(changePasswordButton);

    // Fill password fields
    const currentPasswordInput = screen.getByLabelText(/current password/i);
    const newPasswordInput = screen.getByLabelText(/new password/i);
    const confirmPasswordInput = screen.getByLabelText(/confirm password/i);

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

    const updatePasswordButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(updatePasswordButton);

    // Should validate and call update
    await waitFor(() => {
      expect(require('../../services/userService').userService.updateProfile).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          currentPassword: 'currentpass',
          newPassword: 'newpass123'
        })
      );
    });
  });

  it('handles account deletion with confirmation', async () => {
    const mockDelete = vi.fn().mockResolvedValue({ success: true });
    vi.mocked(require('../../services/userService').userService.deleteAccount).mockImplementation(mockDelete);

    renderWithProviders(<Profile {...defaultProps} />);

    // Open danger zone
    const dangerButton = screen.getByText(/delete account/i);
    fireEvent.click(dangerButton);

    // Confirm deletion
    const confirmInput = screen.getByLabelText(/type "DELETE" to confirm/i);
    fireEvent.change(confirmInput, { target: { value: 'DELETE' } });

    const confirmDeleteButton = screen.getByRole('button', { name: /permanently delete account/i });
    fireEvent.click(confirmDeleteButton);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith(mockUser.id);
    });
  });

  it('displays loading states correctly', () => {
    renderWithProviders(<Profile {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    // Should show loading state
    expect(screen.getByText(/saving.../i)).toBeInTheDocument();
  });

  it('handles error states correctly', async () => {
    const mockUpdate = vi.fn().mockRejectedValue(new Error('Update failed'));
    vi.mocked(require('../../services/userService').userService.updateProfile).mockImplementation(mockUpdate);

    renderWithProviders(<Profile {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
    });
  });

  it('calls onBack when back button is clicked', () => {
    renderWithProviders(<Profile {...defaultProps} />);

    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);

    expect(defaultProps.onBack).toHaveBeenCalled();
  });
});