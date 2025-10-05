// useQuery Hook Tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useQuery, useMutation, clearQueryCache } from '../useQuery';
import { createMockPromise } from '../../test/setup';

describe('useQuery', () => {
  beforeEach(() => {
    clearQueryCache();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('returns initial loading state', () => {
    const queryFn = vi.fn().mockResolvedValue('data');
    const { result } = renderHook(() => useQuery('test-key', queryFn));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
  });

  it('fetches data successfully', async () => {
    const mockData = { id: 1, name: 'Test' };
    const queryFn = vi.fn().mockResolvedValue(mockData);
    
    const { result } = renderHook(() => useQuery('test-key', queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
    expect(queryFn).toHaveBeenCalledTimes(1);
  });

  it('handles query errors', async () => {
    const error = new Error('Query failed');
    const queryFn = vi.fn().mockRejectedValue(error);
    
    const { result } = renderHook(() => useQuery('test-key', queryFn));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toEqual(error);
  });

  it('uses cached data for same query key', async () => {
    const mockData = { id: 1, name: 'Test' };
    const queryFn = vi.fn().mockResolvedValue(mockData);

    // First render
    const { result: result1 } = renderHook(() => useQuery('test-key', queryFn));
    await waitFor(() => expect(result1.current.loading).toBe(false));

    // Second render with same key
    const { result: result2 } = renderHook(() => useQuery('test-key', queryFn));

    expect(result2.current.loading).toBe(false);
    expect(result2.current.data).toEqual(mockData);
    expect(queryFn).toHaveBeenCalledTimes(1); // Only called once due to cache
  });

  it('respects enabled option', async () => {
    const queryFn = vi.fn().mockResolvedValue('data');
    
    const { result } = renderHook(() => 
      useQuery('test-key', queryFn, { enabled: false })
    );

    expect(result.current.loading).toBe(false);
    expect(queryFn).not.toHaveBeenCalled();
  });

  it('refetches when enabled changes from false to true', async () => {
    const queryFn = vi.fn().mockResolvedValue('data');
    let enabled = false;
    
    const { result, rerender } = renderHook(() => 
      useQuery('test-key', queryFn, { enabled })
    );

    expect(queryFn).not.toHaveBeenCalled();

    enabled = true;
    rerender();

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(1);
    });
  });

  it('uses staleTime to determine when to refetch', async () => {
    const queryFn = vi.fn().mockResolvedValue('data');
    
    // First render with staleTime
    const { result, unmount } = renderHook(() => 
      useQuery('test-key', queryFn, { staleTime: 5000 })
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    unmount();

    // Second render within stale time - should use cache
    const { result: result2 } = renderHook(() => 
      useQuery('test-key', queryFn, { staleTime: 5000 })
    );

    expect(result2.current.loading).toBe(false);
    expect(queryFn).toHaveBeenCalledTimes(1);

    // Advance time past stale time
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Third render after stale time - should refetch
    const { result: result3 } = renderHook(() => 
      useQuery('test-key', queryFn, { staleTime: 5000 })
    );

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('handles array query keys', async () => {
    const queryFn = vi.fn().mockResolvedValue('data');
    
    const { result } = renderHook(() => 
      useQuery(['user', 'profile', '123'], queryFn)
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(queryFn).toHaveBeenCalled();
  });

  it('refetches when query key changes', async () => {
    const queryFn = vi.fn().mockResolvedValue('data');
    let userId = '1';
    
    const { result, rerender } = renderHook(() => 
      useQuery(['user', userId], queryFn)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(queryFn).toHaveBeenCalledTimes(1);

    userId = '2';
    rerender();

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(2);
    });
  });

  it('provides refetch function', async () => {
    const queryFn = vi.fn().mockResolvedValue('data');
    
    const { result } = renderHook(() => useQuery('test-key', queryFn));

    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.refetch();
    });

    expect(queryFn).toHaveBeenCalledTimes(2);
  });

  it('handles onSuccess callback', async () => {
    const mockData = { id: 1, name: 'Test' };
    const queryFn = vi.fn().mockResolvedValue(mockData);
    const onSuccess = vi.fn();
    
    renderHook(() => useQuery('test-key', queryFn, { onSuccess }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockData);
    });
  });

  it('handles onError callback', async () => {
    const error = new Error('Query failed');
    const queryFn = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    
    renderHook(() => useQuery('test-key', queryFn, { onError }));

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error);
    });
  });
});

describe('useMutation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const mutationFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useMutation(mutationFn));

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.mutate).toBe('function');
  });

  it('executes mutation successfully', async () => {
    const mockResult = { id: 1, success: true };
    const mutationFn = vi.fn().mockResolvedValue(mockResult);
    const { result } = renderHook(() => useMutation(mutationFn));

    act(() => {
      result.current.mutate({ input: 'test' });
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockResult);
    expect(result.current.error).toBe(null);
    expect(mutationFn).toHaveBeenCalledWith({ input: 'test' });
  });

  it('handles mutation errors', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const { result } = renderHook(() => useMutation(mutationFn));

    act(() => {
      result.current.mutate({ input: 'test' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toEqual(error);
  });

  it('calls onSuccess callback', async () => {
    const mockResult = { success: true };
    const mutationFn = vi.fn().mockResolvedValue(mockResult);
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useMutation(mutationFn, { onSuccess }));

    act(() => {
      result.current.mutate({ input: 'test' });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledWith(mockResult, { input: 'test' });
    });
  });

  it('calls onError callback', async () => {
    const error = new Error('Mutation failed');
    const mutationFn = vi.fn().mockRejectedValue(error);
    const onError = vi.fn();
    const { result } = renderHook(() => useMutation(mutationFn, { onError }));

    act(() => {
      result.current.mutate({ input: 'test' });
    });

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error, { input: 'test' });
    });
  });

  it('resets state correctly', async () => {
    const mutationFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => useMutation(mutationFn));

    act(() => {
      result.current.mutate({ input: 'test' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.loading).toBe(false);
  });

  it('invalidates queries on success', async () => {
    const mutationFn = vi.fn().mockResolvedValue('result');
    const { result } = renderHook(() => 
      useMutation(mutationFn, { invalidateQueries: ['test-key'] })
    );

    // First populate cache
    const queryFn = vi.fn().mockResolvedValue('cached data');
    const { result: queryResult } = renderHook(() => useQuery('test-key', queryFn));
    await waitFor(() => expect(queryResult.current.loading).toBe(false));

    // Execute mutation
    act(() => {
      result.current.mutate({ input: 'test' });
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Query should be invalidated and refetch
    expect(queryFn).toHaveBeenCalledTimes(2);
  });
});