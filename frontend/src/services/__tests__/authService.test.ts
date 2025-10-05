// Authentication Service Tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authService } from '../authService';
import { mockUser, createMockPromise } from '../../test/setup';

// Mock the API client
vi.mock('../apiClient', () => ({
  apiClient: {
    setAuthToken: vi.fn(),
    clearAuth: vi.fn()
  }
}));

// Mock error logger
vi.mock('../errorLogger', () => ({
  errorLogger: {
    addBreadcrumb: vi.fn(),
    logAuthError: vi.fn(),
    logAsyncError: vi.fn()
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('login', () => {
    it('successfully logs in with valid credentials', async () => {
      const credentials = {
        username: 'testuser',
        password: 'password123',
        rememberMe: true
      };

      const result = await authService.login(credentials);

      expect(result.user.username).toBe('testuser');
      expect(result.user.firstName).toBe('Testuser');
      expect(result.token).toMatch(/^mock_token_/);
      expect(result.refreshToken).toMatch(/^mock_refresh_/);
    });

    it('throws error for invalid username', async () => {
      const credentials = {
        username: 'notfound',
        password: 'password123',
        rememberMe: false
      };

      await expect(authService.login(credentials)).rejects.toMatchObject({
        type: 'login',
        message: 'Username not found',
        field: 'username_not_found'
      });
    });

    it('throws error for disabled account', async () => {
      const credentials = {
        username: 'disabled',
        password: 'password123',
        rememberMe: false
      };

      await expect(authService.login(credentials)).rejects.toMatchObject({
        type: 'login',
        message: 'Account disabled',
        field: 'account_disabled'
      });
    });

    it('throws error for invalid password', async () => {
      const credentials = {
        username: 'testinvalidpassword',
        password: 'wrongpassword',
        rememberMe: false
      };

      await expect(authService.login(credentials)).rejects.toMatchObject({
        type: 'login',
        message: 'Invalid password',
        field: 'invalid_password'
      });
    });

    it('stores authentication data when rememberMe is true', async () => {
      const credentials = {
        username: 'testuser',
        password: 'password123',
        rememberMe: true
      };

      await authService.login(credentials);

      expect(localStorage.getItem('auth_user')).toBeTruthy();
      expect(localStorage.getItem('auth_token')).toBeTruthy();
      expect(localStorage.getItem('auth_refresh_token')).toBeTruthy();
    });

    it('does not store authentication data when rememberMe is false', async () => {
      const credentials = {
        username: 'testuser',
        password: 'password123',
        rememberMe: false
      };

      await authService.login(credentials);

      expect(localStorage.getItem('auth_user')).toBeFalsy();
      expect(localStorage.getItem('auth_token')).toBeFalsy();
      expect(localStorage.getItem('auth_refresh_token')).toBeFalsy();
    });
  });

  describe('signup', () => {
    it('successfully creates new user account', async () => {
      const userData = {
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        email: 'new@example.com',
        phone: '+33123456789',
        countryCode: 'FR',
        role: 'athlete' as const,
        password: 'password123',
        confirmPassword: 'password123'
      };

      const result = await authService.signup(userData);

      expect(result.user.username).toBe('newuser');
      expect(result.user.firstName).toBe('New');
      expect(result.user.lastName).toBe('User');
      expect(result.user.email).toBe('new@example.com');
    });

    it('throws error for taken username', async () => {
      const userData = {
        username: 'taken',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+33123456789',
        countryCode: 'FR',
        role: 'athlete' as const,
        password: 'password123',
        confirmPassword: 'password123'
      };

      await expect(authService.signup(userData)).rejects.toMatchObject({
        type: 'signup',
        message: 'Username already taken',
        field: 'username_taken'
      });
    });
  });

  describe('logout', () => {
    it('clears authentication data', async () => {
      // First login to set data
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      localStorage.setItem('auth_token', 'test_token');
      localStorage.setItem('auth_refresh_token', 'test_refresh');

      await authService.logout();

      expect(localStorage.getItem('auth_user')).toBeNull();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('auth_refresh_token')).toBeNull();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when token exists', () => {
      localStorage.setItem('auth_token', 'test_token');
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('returns false when no token exists', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('getStoredUser', () => {
    it('returns user data when stored', () => {
      localStorage.setItem('auth_user', JSON.stringify(mockUser));
      const user = authService.getStoredUser();
      expect(user).toEqual(mockUser);
    });

    it('returns null when no user data stored', () => {
      const user = authService.getStoredUser();
      expect(user).toBeNull();
    });

    it('returns null when stored data is invalid', () => {
      localStorage.setItem('auth_user', 'invalid json');
      const user = authService.getStoredUser();
      expect(user).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('refreshes token when refresh token exists', async () => {
      localStorage.setItem('auth_refresh_token', 'refresh_token');

      const result = await authService.refreshToken();

      expect(result.token).toMatch(/^refreshed_token_/);
      expect(result.refreshToken).toMatch(/^refreshed_refresh_/);
    });

    it('throws error when no refresh token exists', async () => {
      await expect(authService.refreshToken()).rejects.toThrow('No refresh token available');
    });
  });
});