// EventModal Component Tests

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { EventModal } from '../EventModal';
import { renderWithProviders, mockUser, mockTrainingEvent } from '../../test/utils';

// Mock the training service
vi.mock('../../services/trainingService', () => ({
  trainingService: {
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn()
  }
}));

describe('EventModal Component', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    user: mockUser,
    editingEvent: null
  };

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

  it('renders modal when open', () => {
    renderWithProviders(<EventModal {...defaultProps} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Add New Training Event')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderWithProviders(<EventModal {...defaultProps} isOpen={false} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders in edit mode with existing event data', () => {
    renderWithProviders(
      <EventModal {...defaultProps} editingEvent={mockTrainingEvent} />
    );

    expect(screen.getByText('Edit Training Event')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Morning Run')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Running')).toBeInTheDocument();
  });

  it('handles form submission for new event', async () => {
    const mockCreate = vi.fn().mockResolvedValue({ id: 'new-event-1', ...mockTrainingEvent });
    vi.mocked(require('../../services/trainingService').trainingService.createEvent).mockImplementation(mockCreate);

    renderWithProviders(<EventModal {...defaultProps} />);

    // Fill form
    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: 'New Training' }
    });
    fireEvent.change(screen.getByLabelText(/sport/i), {
      target: { value: 'Cycling' }
    });
    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2024-08-25' }
    });
    fireEvent.change(screen.getByLabelText(/start time/i), {
      target: { value: '10:00' }
    });
    fireEvent.change(screen.getByLabelText(/duration/i), {
      target: { value: '90' }
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /save event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Training',
          sport: 'Cycling',
          date: '2024-08-25',
          startTime: '10:00',
          duration: 90,
          createdBy: mockUser.id
        })
      );
    });

    expect(defaultProps.onSave).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('handles form submission for editing existing event', async () => {
    const mockUpdate = vi.fn().mockResolvedValue({ ...mockTrainingEvent, title: 'Updated Run' });
    vi.mocked(require('../../services/trainingService').trainingService.updateEvent).mockImplementation(mockUpdate);

    renderWithProviders(
      <EventModal {...defaultProps} editingEvent={mockTrainingEvent} />
    );

    // Modify title
    const titleInput = screen.getByDisplayValue('Morning Run');
    fireEvent.change(titleInput, { target: { value: 'Updated Run' } });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /update event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        mockTrainingEvent.id,
        expect.objectContaining({
          title: 'Updated Run'
        })
      );
    });
  });

  it('validates required fields', async () => {
    renderWithProviders(<EventModal {...defaultProps} />);

    // Try to submit without filling required fields
    const submitButton = screen.getByRole('button', { name: /save event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/title is required/i)).toBeInTheDocument();
      expect(screen.getByText(/date is required/i)).toBeInTheDocument();
    });

    // Should not call create service
    expect(require('../../services/trainingService').trainingService.createEvent).not.toHaveBeenCalled();
  });

  it('handles intensity selection', () => {
    renderWithProviders(<EventModal {...defaultProps} />);

    const intensitySelect = screen.getByLabelText(/intensity/i);
    fireEvent.change(intensitySelect, { target: { value: 'high' } });

    expect(intensitySelect.value).toBe('high');
  });

  it('handles training type selection', () => {
    renderWithProviders(<EventModal {...defaultProps} />);

    const typeSelect = screen.getByLabelText(/training type/i);
    fireEvent.change(typeSelect, { target: { value: 'race' } });

    expect(typeSelect.value).toBe('race');
  });

  it('handles event deletion', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithProviders(
      <EventModal
        {...defaultProps}
        editingEvent={mockTrainingEvent}
        onDelete={onDelete}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalled();
    });
  });

  it('handles notes and description fields', () => {
    renderWithProviders(<EventModal {...defaultProps} />);

    const notesTextarea = screen.getByLabelText(/notes/i);
    fireEvent.change(notesTextarea, { 
      target: { value: 'Focus on maintaining steady pace' } 
    });

    expect(notesTextarea.value).toBe('Focus on maintaining steady pace');
  });

  it('handles recurring event options', () => {
    renderWithProviders(<EventModal {...defaultProps} />);

    // Enable recurring
    const recurringCheckbox = screen.getByLabelText(/recurring event/i);
    fireEvent.click(recurringCheckbox);

    // Should show recurring options
    expect(screen.getByLabelText(/repeat frequency/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/end date/i)).toBeInTheDocument();
  });

  it('closes modal on cancel', () => {
    renderWithProviders(<EventModal {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('closes modal on backdrop click', () => {
    renderWithProviders(<EventModal {...defaultProps} />);

    const backdrop = screen.getByRole('dialog').parentElement;
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('displays loading state during submission', () => {
    const mockCreate = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    vi.mocked(require('../../services/trainingService').trainingService.createEvent).mockImplementation(mockCreate);

    renderWithProviders(<EventModal {...defaultProps} />);

    // Fill minimal required fields
    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: 'Test Event' }
    });
    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2024-08-25' }
    });

    // Submit
    const submitButton = screen.getByRole('button', { name: /save event/i });
    fireEvent.click(submitButton);

    // Should show loading state
    expect(screen.getByText(/saving.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it('handles error states correctly', async () => {
    const mockCreate = vi.fn().mockRejectedValue(new Error('Failed to create event'));
    vi.mocked(require('../../services/trainingService').trainingService.createEvent).mockImplementation(mockCreate);

    renderWithProviders(<EventModal {...defaultProps} />);

    // Fill minimal required fields
    fireEvent.change(screen.getByLabelText(/event title/i), {
      target: { value: 'Test Event' }
    });
    fireEvent.change(screen.getByLabelText(/date/i), {
      target: { value: '2024-08-25' }
    });

    // Submit
    const submitButton = screen.getByRole('button', { name: /save event/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to save event/i)).toBeInTheDocument();
    });
  });
});
