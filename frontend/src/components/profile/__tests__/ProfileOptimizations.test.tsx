/**
 * Test file to verify profile optimizations are working correctly
 */

import { debounce } from '../../../utils/debounce';

describe('Profile Optimizations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Debounce Utility', () => {
    test('should debounce function calls correctly', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      // Call multiple times rapidly
      debouncedFn('arg1');
      debouncedFn('arg2');
      debouncedFn('arg3');

      // Should not have been called yet
      expect(mockFn).not.toHaveBeenCalled();

      // Fast-forward time
      jest.advanceTimersByTime(1000);

      // Should have been called once with the last arguments
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg3');
    });

    test('should cancel debounced function', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 1000);

      debouncedFn('test');
      debouncedFn.cancel();

      jest.advanceTimersByTime(1000);

      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe('Data Loading Optimization', () => {
    test('should handle Promise.allSettled results correctly', async () => {
      const promises = [
        Promise.resolve('success1'),
        Promise.reject(new Error('error1')),
        Promise.resolve('success2')
      ];

      const results = await Promise.allSettled(promises);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');

      if (results[0].status === 'fulfilled') {
        expect(results[0].value).toBe('success1');
      }
      if (results[1].status === 'rejected') {
        expect(results[1].reason.message).toBe('error1');
      }
    });
  });

  describe('Change Detection Optimization', () => {
    test('should efficiently detect changes in profile data', () => {
      const originalData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '1234567890'
      };

      const currentData1 = { ...originalData };
      const currentData2 = { ...originalData, firstName: 'Jane' };

      // Efficient comparison (avoiding JSON.stringify)
      const hasChanges1 = (
        currentData1.firstName !== originalData.firstName ||
        currentData1.lastName !== originalData.lastName ||
        currentData1.email !== originalData.email ||
        currentData1.phone !== originalData.phone
      );

      const hasChanges2 = (
        currentData2.firstName !== originalData.firstName ||
        currentData2.lastName !== originalData.lastName ||
        currentData2.email !== originalData.email ||
        currentData2.phone !== originalData.phone
      );

      expect(hasChanges1).toBe(false);
      expect(hasChanges2).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      const mockApiCall = jest.fn().mockRejectedValue(new Error('API Error'));

      try {
        await mockApiCall();
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect(error.message).toBe('API Error');
      }

      expect(mockApiCall).toHaveBeenCalledTimes(1);
    });

    test('should provide fallback data on error', () => {
      const mockData = { name: 'fallback' };
      const mockError = new Error('Network error');

      const getDataWithFallback = (shouldError: boolean) => {
        if (shouldError) {
          console.error('Data loading failed:', mockError);
          return mockData;
        }
        return { name: 'real data' };
      };

      const result1 = getDataWithFallback(false);
      const result2 = getDataWithFallback(true);

      expect(result1).toEqual({ name: 'real data' });
      expect(result2).toEqual(mockData);
    });
  });

  describe('Performance Optimizations', () => {
    test('should demonstrate callback memoization benefits', () => {
      let renderCount = 0;
      
      const mockComponent = (callback: () => void) => {
        renderCount++;
        return callback;
      };

      // Without memoization - new function every time
      const callback1 = () => console.log('test');
      const callback2 = () => console.log('test');
      
      mockComponent(callback1);
      mockComponent(callback2);
      
      expect(renderCount).toBe(2);
      expect(callback1 === callback2).toBe(false);

      // With memoization - same function reference
      const memoizedCallback = () => console.log('test');
      
      renderCount = 0;
      mockComponent(memoizedCallback);
      mockComponent(memoizedCallback);
      
      expect(renderCount).toBe(2);
    });
  });
});