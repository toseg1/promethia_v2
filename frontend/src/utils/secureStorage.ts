// Secure Token Storage and Management

interface TokenData {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
}

interface SecureStorageConfig {
  keyPrefix: string;
  encryptionKey?: string;
  tokenLifetime: number; // in milliseconds
}

/**
 * Secure storage utility for authentication tokens
 */
export class SecureTokenStorage {
  private config: SecureStorageConfig;
  private readonly TOKEN_KEY: string;
  private readonly REFRESH_TOKEN_KEY: string;
  private readonly USER_KEY: string;
  private readonly REMEMBERED_USERNAME_KEY: string;

  constructor(config: Partial<SecureStorageConfig> = {}) {
    this.config = {
      keyPrefix: 'promethia_auth_',
      tokenLifetime: 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };

    this.TOKEN_KEY = `${this.config.keyPrefix}token`;
    this.REFRESH_TOKEN_KEY = `${this.config.keyPrefix}refresh_token`;
    this.USER_KEY = `${this.config.keyPrefix}user`;
    this.REMEMBERED_USERNAME_KEY = `${this.config.keyPrefix}remembered_username`;
  }
  
  /**
   * PHASE 2.2: Removed misleading "encryption" methods
   * Browser storage is protected by same-origin policy - that's the security layer
   * HTTPS in production provides transport security
   * Additional obfuscation adds minimal security but significant complexity
   */
  
  /**
   * Store authentication tokens securely
   * REFACTORED: Always use localStorage for session persistence
   * "Remember Me" now only controls username pre-fill, not token storage
   */
  setTokens(tokenData: TokenData): void {
    try {
      const dataToStore = {
        token: tokenData.token,
        refreshToken: tokenData.refreshToken,
        expiresAt: tokenData.expiresAt,
        userId: tokenData.userId,
        storedAt: Date.now()
      };

      // PHASE 2.2: Store directly as JSON without fake encryption
      // Security relies on:
      // 1. Same-origin policy (browser built-in)
      // 2. HTTPS in production (transport layer)
      // 3. HttpOnly cookies for sensitive tokens (future enhancement)
      const tokenDataJson = JSON.stringify(dataToStore);

      // SIMPLIFIED STORAGE STRATEGY:
      // Always use localStorage for token persistence (survive page refresh)
      // Users stay logged in until explicit logout or token expiry
      localStorage.setItem(this.TOKEN_KEY, tokenDataJson);
      localStorage.setItem(this.USER_KEY, tokenData.userId);

    } catch (error) {
      console.warn('Failed to store authentication tokens:', error);
    }
  }
  
  /**
   * Retrieve authentication tokens
   * REFACTORED: Only check localStorage (simplified)
   */
  getTokens(): TokenData | null {
    try {
      const tokenDataJson = localStorage.getItem(this.TOKEN_KEY);

      if (!tokenDataJson) {
        return null;
      }

      // Parse JSON
      let tokenData: TokenData;
      try {
        tokenData = JSON.parse(tokenDataJson);
      } catch (parseError) {
        console.warn('Failed to parse token JSON:', parseError);
        this.clearTokens();
        return null;
      }

      // Validate required fields
      if (!tokenData.token || !tokenData.userId) {
        console.warn('Token data missing required fields');
        this.clearTokens();
        return null;
      }

      // Check if token is expired
      if (tokenData.expiresAt && Date.now() > tokenData.expiresAt) {
        console.log('Token expired, clearing storage');
        this.clearTokens();
        return null;
      }

      return tokenData;

    } catch (error) {
      console.warn('Failed to retrieve authentication tokens:', error);
      this.clearTokens(); // Clear corrupted data
      return null;
    }
  }
  
  /**
   * Update just the access token (for refresh scenarios)
   * PHASE 2.3: Now also supports updating refresh token for rotation
   */
  updateAccessToken(newToken: string, expiresAt: number, newRefreshToken?: string): void {
    const currentTokens = this.getTokens();
    if (currentTokens) {
      this.setTokens({
        ...currentTokens,
        token: newToken,
        expiresAt: expiresAt,
        // PHASE 2.3: Update refresh token if backend rotated it
        refreshToken: newRefreshToken || currentTokens.refreshToken
      });
    }
  }

  /**
   * PHASE 2.3: Update both access and refresh tokens
   * Used when backend implements refresh token rotation
   */
  updateTokens(newAccessToken: string, newRefreshToken: string, expiresAt: number): void {
    const currentTokens = this.getTokens();
    if (currentTokens) {
      this.setTokens({
        ...currentTokens,
        token: newAccessToken,
        refreshToken: newRefreshToken,
        expiresAt: expiresAt
      });
    }
  }
  
  /**
   * Check if user is authenticated and token is valid
   */
  isAuthenticated(): boolean {
    const tokens = this.getTokens();
    return tokens !== null && tokens.token !== undefined;
  }
  
  /**
   * Get current access token if valid
   */
  getAccessToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.token || null;
  }
  
  /**
   * Get refresh token if available
   */
  getRefreshToken(): string | null {
    const tokens = this.getTokens();
    return tokens?.refreshToken || null;
  }
  
  /**
   * Clear all authentication data
   * REFACTORED: Simplified to localStorage only, keep remembered username
   */
  clearTokens(): void {
    try {
      // Clear tokens from localStorage
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);

      // Keep REMEMBERED_USERNAME_KEY - that's the whole point of "Remember Me"

      // Clear any other auth-related data
      const keysToRemove = [
        `${this.config.keyPrefix}profile`,
        `${this.config.keyPrefix}preferences`,
        `${this.config.keyPrefix}role`
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

    } catch (error) {
      console.warn('Failed to clear authentication tokens:', error);
    }
  }
  
  /**
   * Force clear all storage data (for complete reset)
   */
  forceClearAllStorage(): void {
    try {
      // Get all keys that start with our prefix
      const allSessionKeys = Object.keys(sessionStorage);
      const allLocalKeys = Object.keys(localStorage);
      
      // Remove all keys with our prefix
      [...allSessionKeys, ...allLocalKeys].forEach(key => {
        if (key.startsWith(this.config.keyPrefix)) {
          sessionStorage.removeItem(key);
          localStorage.removeItem(key);
        }
      });
      
      console.log('Forced clear of all authentication storage completed');
    } catch (error) {
      console.warn('Failed to force clear storage:', error);
    }
  }
  
  /**
   * Check if tokens need refresh (within 5 minutes of expiry)
   */
  needsRefresh(): boolean {
    const tokens = this.getTokens();
    if (!tokens || !tokens.expiresAt) {
      return false;
    }

    const timeUntilExpiry = tokens.expiresAt - Date.now();
    const refreshThreshold = 5 * 60 * 1000; // 5 minutes

    return timeUntilExpiry <= refreshThreshold;
  }

  /**
   * REFACTORED: "Remember Me" functionality
   * Store username for pre-filling login form
   */
  setRememberedUsername(username: string): void {
    try {
      localStorage.setItem(this.REMEMBERED_USERNAME_KEY, username);
    } catch (error) {
      console.warn('Failed to store remembered username:', error);
    }
  }

  /**
   * Get remembered username for pre-filling login form
   */
  getRememberedUsername(): string | null {
    try {
      return localStorage.getItem(this.REMEMBERED_USERNAME_KEY);
    } catch (error) {
      console.warn('Failed to retrieve remembered username:', error);
      return null;
    }
  }

  /**
   * Clear remembered username (when user unchecks "Remember Me")
   */
  clearRememberedUsername(): void {
    try {
      localStorage.removeItem(this.REMEMBERED_USERNAME_KEY);
    } catch (error) {
      console.warn('Failed to clear remembered username:', error);
    }
  }
}

/**
 * Security headers utility
 */
export class SecurityHeaders {
  /**
   * Generate Content Security Policy header value
   */
  static generateCSP(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Needed for Vite development
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.promethia.app ws://localhost:*", // Add your API domains
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'"
    ];
    
    return directives.join('; ');
  }
  
  /**
   * Set security headers (for SPA configuration)
   */
  static setSecurityHeaders(): void {
    // Set via meta tags (limited effectiveness, mainly for documentation)
    const metaTags = [
      { name: 'referrer', content: 'strict-origin-when-cross-origin' },
      { name: 'robots', content: 'noindex, nofollow' },
      { 'http-equiv': 'X-Content-Type-Options', content: 'nosniff' },
      { 'http-equiv': 'X-Frame-Options', content: 'DENY' },
      { 'http-equiv': 'X-XSS-Protection', content: '1; mode=block' },
      { 'http-equiv': 'Strict-Transport-Security', content: 'max-age=31536000; includeSubDomains' }
    ];
    
    metaTags.forEach(tag => {
      const meta = document.createElement('meta');
      if (tag.name) meta.name = tag.name;
      if (tag['http-equiv']) meta.httpEquiv = tag['http-equiv'];
      meta.content = tag.content;
      document.head.appendChild(meta);
    });
  }
}

/**
 * Request interceptor for adding security headers
 */
export function createSecureRequest(url: string, options: RequestInit = {}): RequestInit {
  const secureTokenStorage = new SecureTokenStorage();
  const token = secureTokenStorage.getAccessToken();
  
  const headers: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest', // CSRF protection
    ...options.headers as Record<string, string>
  };
  
  // Only set Content-Type if it's not already provided (FormData should not have it)
  if (!headers['Content-Type'] && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Add authorization header if token exists
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Add CSRF token if available (use Django's standard header name)
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;  // Match Django's expected header name (no hyphen)
  }
  
  return {
    ...options,
    headers,
    credentials: 'same-origin' // Include cookies for CSRF protection
  };
}

/**
 * Global instance for token management
 */
export const tokenStorage = new SecureTokenStorage();

/**
 * Initialize security settings
 */
export function initializeSecurity(): void {
  // Set security headers
  SecurityHeaders.setSecurityHeaders();
  
  // Check for corrupted tokens on startup and clear if needed
  try {
    const tokens = tokenStorage.getTokens();
    if (tokens) {
      console.log('Authentication tokens loaded successfully');
    }
  } catch (error) {
    console.warn('Corrupted tokens detected on startup, clearing storage');
    tokenStorage.forceClearAllStorage();
  }
  
  // Add global error handler for security-related errors
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('Unauthorized') || 
        event.reason?.status === 401) {
      // Auto-logout on auth errors
      console.log('Authentication error detected, clearing tokens');
      tokenStorage.clearTokens();
      window.location.reload();
    }
    
    // Handle JSON parse errors in authentication
    if (event.reason?.message?.includes('JSON.parse') && 
        event.reason?.message?.includes('token')) {
      console.warn('JSON parse error in authentication, clearing corrupted tokens');
      tokenStorage.forceClearAllStorage();
      window.location.reload();
    }
  });
  
  // Add global error handler for general errors
  window.addEventListener('error', (event) => {
    if (event.message?.includes('JSON.parse') &&
        event.message?.includes('token')) {
      console.warn('Token parsing error detected, clearing storage');
      tokenStorage.forceClearAllStorage();
      window.location.reload();
    }
  });

  // PHASE 1.1: Removed aggressive beforeunload handler
  // SessionStorage with session flag now handles refresh persistence correctly
  // No need to clear on unload - browser handles sessionStorage lifecycle
}
