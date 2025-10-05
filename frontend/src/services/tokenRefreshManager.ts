/**
 * PHASE 1.3: Token Refresh Manager
 *
 * Centralized singleton to handle token refresh and prevent race conditions.
 * Ensures only ONE refresh happens at a time across the entire application.
 *
 * Features:
 * - Single refresh promise queue
 * - Request queuing during refresh
 * - Event-based token update notifications
 * - Subscriber pattern for components
 */

import { AuthTokens } from './authService';

type RefreshFunction = () => Promise<AuthTokens>;
type SubscriberCallback = (tokens: AuthTokens | null) => void;
type QueuedRequest = () => void;

interface TokenRefreshState {
  isRefreshing: boolean;
  lastRefreshTime: number;
  failureCount: number;
}

export class TokenRefreshManager {
  private static instance: TokenRefreshManager | null = null;

  private refreshPromise: Promise<AuthTokens> | null = null;
  private refreshFunction: RefreshFunction | null = null;
  private subscribers: Set<SubscriberCallback> = new Set();
  private requestQueue: QueuedRequest[] = [];
  private state: TokenRefreshState = {
    isRefreshing: false,
    lastRefreshTime: 0,
    failureCount: 0
  };

  // Singleton pattern
  private constructor() {}

  static getInstance(): TokenRefreshManager {
    if (!TokenRefreshManager.instance) {
      TokenRefreshManager.instance = new TokenRefreshManager();
    }
    return TokenRefreshManager.instance;
  }

  /**
   * Set the refresh function (should be called once during app initialization)
   */
  setRefreshFunction(refreshFn: RefreshFunction): void {
    this.refreshFunction = refreshFn;
  }

  /**
   * Main refresh method - ensures only one refresh happens at a time
   */
  async refresh(): Promise<AuthTokens> {
    // If refresh already in progress, return existing promise
    if (this.refreshPromise) {
      console.log('⏳ Token refresh already in progress, waiting...');
      return this.refreshPromise;
    }

    // Ensure refresh function is set
    if (!this.refreshFunction) {
      throw new Error('Refresh function not set. Call setRefreshFunction() first.');
    }

    // Rate limiting: Prevent excessive refresh attempts
    const timeSinceLastRefresh = Date.now() - this.state.lastRefreshTime;
    const MIN_REFRESH_INTERVAL = 5000; // 5 seconds

    if (timeSinceLastRefresh < MIN_REFRESH_INTERVAL && this.state.failureCount === 0) {
      console.warn('⚠️ Token refresh rate limited (too soon after last refresh)');
      throw new Error('Token refresh rate limited');
    }

    // Start new refresh
    console.log('🔄 Starting token refresh...');
    this.state.isRefreshing = true;

    this.refreshPromise = this.performRefresh();

    try {
      const tokens = await this.refreshPromise;

      // Success - reset failure count
      this.state.failureCount = 0;
      this.state.lastRefreshTime = Date.now();

      console.log('✅ Token refresh successful');

      // Notify all subscribers
      this.notifySubscribers(tokens);

      // Process queued requests
      this.processQueue();

      return tokens;
    } catch (error) {
      // Track failures
      this.state.failureCount++;

      console.error(`❌ Token refresh failed (attempt ${this.state.failureCount}):`, error);

      // Notify subscribers of failure
      this.notifySubscribers(null);

      throw error;
    } finally {
      // Clear refresh state
      this.refreshPromise = null;
      this.state.isRefreshing = false;
    }
  }

  /**
   * Internal refresh execution
   */
  private async performRefresh(): Promise<AuthTokens> {
    if (!this.refreshFunction) {
      throw new Error('Refresh function not configured');
    }

    return await this.refreshFunction();
  }

  /**
   * Subscribe to token refresh events
   * Returns unsubscribe function
   */
  subscribe(callback: SubscriberCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Notify all subscribers of token update
   */
  private notifySubscribers(tokens: AuthTokens | null): void {
    this.subscribers.forEach(callback => {
      try {
        callback(tokens);
      } catch (error) {
        console.error('Error in token refresh subscriber:', error);
      }
    });
  }

  /**
   * Queue a request to be executed after refresh completes
   */
  queueRequest(request: QueuedRequest): void {
    console.log('📥 Queuing request until token refresh completes...');
    this.requestQueue.push(request);
  }

  /**
   * Process all queued requests
   */
  private processQueue(): void {
    if (this.requestQueue.length === 0) return;

    console.log(`📤 Processing ${this.requestQueue.length} queued requests...`);

    const queue = [...this.requestQueue];
    this.requestQueue = [];

    queue.forEach(request => {
      try {
        request();
      } catch (error) {
        console.error('Error processing queued request:', error);
      }
    });
  }

  /**
   * Check if refresh is currently in progress
   */
  isRefreshing(): boolean {
    return this.state.isRefreshing;
  }

  /**
   * Get refresh state for debugging
   */
  getState(): Readonly<TokenRefreshState> {
    return { ...this.state };
  }

  /**
   * Reset state (for testing or after logout)
   */
  reset(): void {
    this.refreshPromise = null;
    this.requestQueue = [];
    this.state = {
      isRefreshing: false,
      lastRefreshTime: 0,
      failureCount: 0
    };
    // Keep subscribers - they'll need to handle logout separately
  }
}

// Export singleton instance
export const tokenRefreshManager = TokenRefreshManager.getInstance();
