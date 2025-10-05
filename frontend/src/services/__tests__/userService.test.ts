// User Service Tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { userService } from '../userService';
import { mockUser, createMockApiResponse } from '../../test/setup';

// Mock the API client
const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  patch: vi.fn()
};

vi.mock('../apiClient', () => ({
  apiClient: mockApiClient
}));

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getUserProfile', () => {
    it('fetches user profile successfully', async () => {
      const mockResponse = createMockApiResponse(mockUser);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await userService.getUserProfile('user-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/user-1/profile');
      expect(result).toEqual(mockUser);
    });

    it('handles network errors gracefully', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Network error'));

      await expect(userService.getUserProfile('user-1')).rejects.toThrow('Network error');
      expect(mockApiClient.get).toHaveBeenCalledWith('/users/user-1/profile');
    });

    it('handles API error responses', async () => {
      const errorResponse = createMockApiResponse(null, false);
      mockApiClient.get.mockResolvedValue(errorResponse);

      await expect(userService.getUserProfile('user-1')).rejects.toThrow('Mock error');
    });
  });

  describe('updateProfile', () => {
    const updateData = {
      firstName: 'Updated',
      lastName: 'Name',
      email: 'updated@example.com'
    };

    it('updates profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateData };
      const mockResponse = createMockApiResponse(updatedUser);
      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await userService.updateProfile('user-1', updateData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1/profile', updateData);
      expect(result).toEqual(updatedUser);
    });

    it('validates required fields', async () => {
      const invalidData = { email: '' };

      await expect(userService.updateProfile('user-1', invalidData)).rejects.toThrow();
    });

    it('handles password updates', async () => {
      const passwordData = {
        currentPassword: 'oldpass',
        newPassword: 'newpass123'
      };

      const mockResponse = createMockApiResponse({ success: true });
      mockApiClient.put.mockResolvedValue(mockResponse);

      await userService.updateProfile('user-1', passwordData);

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1/profile', passwordData);
    });
  });

  describe('uploadAvatar', () => {
    it('uploads avatar successfully', async () => {
      const file = new File(['avatar'], 'avatar.jpg', { type: 'image/jpeg' });
      const mockResponse = createMockApiResponse({ avatarUrl: 'avatar.jpg' });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.uploadAvatar('user-1', file);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/users/user-1/avatar',
        expect.any(FormData),
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      expect(result.avatarUrl).toBe('avatar.jpg');
    });

    it('validates file type', async () => {
      const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });

      await expect(userService.uploadAvatar('user-1', invalidFile)).rejects.toThrow('Invalid file type');
    });

    it('validates file size', async () => {
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });

      await expect(userService.uploadAvatar('user-1', largeFile)).rejects.toThrow('File too large');
    });
  });

  describe('getConnectedAthletes', () => {
    it('fetches connected athletes for coach', async () => {
      const athletes = [
        { ...mockUser, id: 'athlete-1', role: 'athlete' },
        { ...mockUser, id: 'athlete-2', role: 'athlete' }
      ];
      const mockResponse = createMockApiResponse(athletes);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await userService.getConnectedAthletes('coach-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/coach-1/athletes');
      expect(result).toEqual(athletes);
    });

    it('returns empty array for users without athletes', async () => {
      const mockResponse = createMockApiResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await userService.getConnectedAthletes('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getConnectedCoaches', () => {
    it('fetches connected coaches for athlete', async () => {
      const coaches = [
        { ...mockUser, id: 'coach-1', role: 'coach' }
      ];
      const mockResponse = createMockApiResponse(coaches);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await userService.getConnectedCoaches('athlete-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/athlete-1/coaches');
      expect(result).toEqual(coaches);
    });
  });

  describe('searchUsers', () => {
    it('searches users by query', async () => {
      const searchResults = [mockUser];
      const mockResponse = createMockApiResponse(searchResults);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await userService.searchUsers('test user', { role: 'athlete' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/search', {
        params: {
          q: 'test user',
          role: 'athlete'
        }
      });
      expect(result).toEqual(searchResults);
    });

    it('handles empty search results', async () => {
      const mockResponse = createMockApiResponse([]);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await userService.searchUsers('nonexistent');

      expect(result).toEqual([]);
    });
  });

  describe('connectToCoach', () => {
    it('sends connection request to coach', async () => {
      const mockResponse = createMockApiResponse({ success: true });
      mockApiClient.post.mockResolvedValue(mockResponse);

      const result = await userService.connectToCoach('athlete-1', 'coach-1');

      expect(mockApiClient.post).toHaveBeenCalledWith('/users/athlete-1/connect', {
        coachId: 'coach-1'
      });
      expect(result.success).toBe(true);
    });
  });

  describe('acceptConnectionRequest', () => {
    it('accepts connection request', async () => {
      const mockResponse = createMockApiResponse({ success: true });
      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await userService.acceptConnectionRequest('request-1');

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/connections/request-1/accept');
      expect(result.success).toBe(true);
    });
  });

  describe('deleteAccount', () => {
    it('deletes user account', async () => {
      const mockResponse = createMockApiResponse({ success: true });
      mockApiClient.delete.mockResolvedValue(mockResponse);

      const result = await userService.deleteAccount('user-1');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/users/user-1');
      expect(result.success).toBe(true);
    });

    it('requires confirmation', async () => {
      await expect(userService.deleteAccount('user-1', false)).rejects.toThrow('Account deletion must be confirmed');
    });
  });

  describe('getUserStats', () => {
    it('fetches user statistics', async () => {
      const stats = {
        totalWorkouts: 25,
        totalDuration: 1500,
        avgIntensity: 3.2,
        streak: 7
      };
      const mockResponse = createMockApiResponse(stats);
      mockApiClient.get.mockResolvedValue(mockResponse);

      const result = await userService.getUserStats('user-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/user-1/stats');
      expect(result).toEqual(stats);
    });

    it('handles date range parameters', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await userService.getUserStats('user-1', startDate, endDate);

      expect(mockApiClient.get).toHaveBeenCalledWith('/users/user-1/stats', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      });
    });
  });

  describe('updatePreferences', () => {
    it('updates user preferences', async () => {
      const preferences = {
        notifications: true,
        theme: 'dark',
        language: 'en',
        timezone: 'UTC'
      };
      const mockResponse = createMockApiResponse(preferences);
      mockApiClient.put.mockResolvedValue(mockResponse);

      const result = await userService.updatePreferences('user-1', preferences);

      expect(mockApiClient.put).toHaveBeenCalledWith('/users/user-1/preferences', preferences);
      expect(result).toEqual(preferences);
    });
  });
});