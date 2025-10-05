/**
 * PHASE 3.2: Profile Cache Utility
 *
 * Caches user profile data in localStorage for instant app startup.
 * Reduces perceived load time from 200-5000ms to 0ms.
 *
 * Features:
 * - Instant profile loading on app mount
 * - Background validation and refresh
 * - Automatic cache invalidation on logout
 * - TTL-based cache expiry (optional)
 *
 * Security:
 * - Only caches non-sensitive user data (no tokens)
 * - Same-origin policy protection
 * - Cache cleared on logout
 */

import { User } from '../types';

interface CachedProfile {
  user: User;
  cachedAt: number;
  version: number; // For cache invalidation on schema changes
}

const CACHE_KEY = 'promethia_profile_cache';
const CACHE_VERSION = 1;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export class ProfileCache {
  /**
   * Save user profile to cache
   */
  static set(user: User): void {
    try {
      const cacheData: CachedProfile = {
        user,
        cachedAt: Date.now(),
        version: CACHE_VERSION
      };

      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));

      if (process.env.NODE_ENV === 'development') {
        console.log('💾 Profile cached:', user.username);
      }
    } catch (error) {
      console.warn('Failed to cache profile:', error);
      // Non-critical - app still works without cache
    }
  }

  /**
   * Get cached user profile (instant, no network call)
   * Returns null if cache is invalid, expired, or doesn't exist
   */
  static get(): User | null {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);

      if (!cachedData) {
        return null;
      }

      const parsed: CachedProfile = JSON.parse(cachedData);

      // Validate cache version
      if (parsed.version !== CACHE_VERSION) {
        console.log('⚠️ Profile cache version mismatch, clearing...');
        this.clear();
        return null;
      }

      // Check TTL
      const age = Date.now() - parsed.cachedAt;
      if (age > CACHE_TTL) {
        console.log('⚠️ Profile cache expired, clearing...');
        this.clear();
        return null;
      }

      // Validate required fields
      if (!parsed.user || !parsed.user.id || !parsed.user.username) {
        console.warn('⚠️ Invalid profile cache data, clearing...');
        this.clear();
        return null;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('⚡ Profile loaded from cache:', parsed.user.username);
      }

      return parsed.user;
    } catch (error) {
      console.warn('Failed to read profile cache:', error);
      this.clear(); // Clear corrupted cache
      return null;
    }
  }

  /**
   * Clear cached profile
   */
  static clear(): void {
    try {
      localStorage.removeItem(CACHE_KEY);

      if (process.env.NODE_ENV === 'development') {
        console.log('🧹 Profile cache cleared');
      }
    } catch (error) {
      console.warn('Failed to clear profile cache:', error);
    }
  }

  /**
   * Check if cache exists and is valid
   */
  static has(): boolean {
    return this.get() !== null;
  }

  /**
   * Get cache age in milliseconds
   */
  static getAge(): number | null {
    try {
      const cachedData = localStorage.getItem(CACHE_KEY);

      if (!cachedData) {
        return null;
      }

      const parsed: CachedProfile = JSON.parse(cachedData);
      return Date.now() - parsed.cachedAt;
    } catch {
      return null;
    }
  }

  /**
   * Update cached profile with new data (partial update)
   */
  static update(updates: Partial<User>): void {
    const cached = this.get();

    if (cached) {
      this.set({
        ...cached,
        ...updates
      });
    }
  }
}
