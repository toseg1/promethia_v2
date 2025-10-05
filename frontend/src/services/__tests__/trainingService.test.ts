import { describe, it, expect, vi, beforeEach } from 'vitest';
import { trainingService } from '../trainingService';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn()
};

describe('trainingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  vi.mock('../apiClient', () => ({
    apiClient: mockApiClient
  }));

  describe('getTrainingEvents', () => {
    it('maps backend payload to training events', async () => {
      const backendEvent = {
        id: 1,
        title: 'Morning Run',
        athlete: 7,
        date: '2024-01-02T07:00:00Z',
        time: '07:00:00',
        sport: 'running',
        duration: '01:00:00'
      };

      mockApiClient.get.mockResolvedValue({
        success: true,
        data: {
          count: 1,
          results: [backendEvent]
        }
      });

      const result = await trainingService.getTrainingEvents('7');

      expect(mockApiClient.get).toHaveBeenCalledWith('/training/', {
        params: { athlete: '7' }
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
      expect(result[0].createdBy).toBe('7');
      expect(result[0].sport).toBe('running');
    });
  });

  describe('createTrainingEvent', () => {
    it('posts new training session to API', async () => {
      mockApiClient.post.mockResolvedValue({
        success: true,
        data: {
          id: 10,
          title: 'Intervals',
          athlete: 3,
          date: '2024-02-01T06:00:00Z',
          time: '06:00:00',
          sport: 'running'
        }
      });

      const event = await trainingService.createTrainingEvent('3', {
        title: 'Intervals',
        type: 'training',
        sport: 'running',
        date: new Date('2024-02-01T06:00:00Z'),
        startTime: '06:00',
        duration: 60
      });

      expect(mockApiClient.post).toHaveBeenCalled();
      expect(event.id).toBe('10');
      expect(event.createdBy).toBe('3');
    });
  });

  describe('updateTrainingEvent', () => {
    it('patches existing training session', async () => {
      mockApiClient.patch.mockResolvedValue({
        success: true,
        data: {
          id: 5,
          title: 'Tempo Run',
          athlete: 2,
          date: '2024-02-10T09:00:00Z',
          sport: 'running'
        }
      });

      const updated = await trainingService.updateTrainingEvent({
        id: '5',
        title: 'Tempo Run'
      });

      expect(mockApiClient.patch).toHaveBeenCalledWith('/training/5/', {
        title: 'Tempo Run'
      });
      expect(updated.title).toBe('Tempo Run');
    });
  });

  describe('deleteTrainingEvent', () => {
    it('calls delete endpoint', async () => {
      mockApiClient.delete.mockResolvedValue({ success: true });

      await trainingService.deleteTrainingEvent('12');

      expect(mockApiClient.delete).toHaveBeenCalledWith('/training/12/');
    });
  });

  describe('getTrainingAnalytics', () => {
    it('maps stats payload to analytics data', async () => {
      mockApiClient.get.mockResolvedValue({
        success: true,
        data: {
          total_sessions: 4,
          total_duration: '04:30:00',
          average_duration: '01:07:30',
          sports_breakdown: {
            running: 3,
            cycling: 1
          }
        }
      });

      const analytics = await trainingService.getTrainingAnalytics('7', 'month');

      expect(analytics.workoutCount).toBe(4);
      expect(analytics.totalDuration).toBeGreaterThan(0);
      expect(analytics.sportsBreakdown?.running).toBe(3);
    });
  });
});
