/**
 * PHASE 2.1: JWT Utilities
 *
 * Client-side JWT parsing and validation without external dependencies.
 * Provides accurate token expiry calculation from actual JWT payload.
 *
 * Features:
 * - Parse JWT payload without verification (verification done server-side)
 * - Extract expiry time from token
 * - Check if token is expired
 * - Calculate time until expiry
 * - Determine if token needs refresh
 */

export interface JWTPayload {
  user_id: string;
  exp: number; // Expiry timestamp (seconds since epoch)
  iat: number; // Issued at timestamp
  token_type: string;
  jti?: string; // JWT ID
  [key: string]: any; // Allow additional claims
}

export class JWTUtils {
  /**
   * Parse JWT token to extract payload
   * Note: Does NOT verify signature - that's done server-side
   */
  static parseToken(token: string): JWTPayload | null {
    try {
      // JWT format: header.payload.signature
      const parts = token.split('.');

      if (parts.length !== 3) {
        console.warn('Invalid JWT format: expected 3 parts');
        return null;
      }

      const [header, payload, signature] = parts;

      if (!payload) {
        console.warn('JWT payload is empty');
        return null;
      }

      // Decode base64url encoded payload
      const decodedPayload = this.base64UrlDecode(payload);

      if (!decodedPayload) {
        console.warn('Failed to decode JWT payload');
        return null;
      }

      // Parse JSON
      const parsedPayload: JWTPayload = JSON.parse(decodedPayload);

      // Validate required fields
      if (!parsedPayload.exp || !parsedPayload.user_id) {
        console.warn('JWT missing required fields (exp, user_id)');
        return null;
      }

      return parsedPayload;
    } catch (error) {
      console.error('Error parsing JWT:', error);
      return null;
    }
  }

  /**
   * Base64URL decode (JWT uses base64url encoding, not standard base64)
   */
  private static base64UrlDecode(str: string): string | null {
    try {
      // Convert base64url to base64
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/');

      // Add padding if necessary
      const pad = base64.length % 4;
      if (pad) {
        if (pad === 1) {
          throw new Error('Invalid base64url string');
        }
        base64 += '='.repeat(4 - pad);
      }

      // Decode base64
      return atob(base64);
    } catch (error) {
      console.error('Base64URL decode error:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   */
  static isExpired(token: string): boolean {
    const payload = this.parseToken(token);

    if (!payload || !payload.exp) {
      return true; // Treat invalid tokens as expired
    }

    // Convert exp (seconds) to milliseconds and compare with current time
    const expiryTime = payload.exp * 1000;
    const currentTime = Date.now();

    return currentTime >= expiryTime;
  }

  /**
   * Get time until token expiry in milliseconds
   * Returns 0 if token is expired or invalid
   */
  static getTimeUntilExpiry(token: string): number {
    const payload = this.parseToken(token);

    if (!payload || !payload.exp) {
      return 0;
    }

    const expiryTime = payload.exp * 1000;
    const currentTime = Date.now();
    const timeRemaining = expiryTime - currentTime;

    return Math.max(0, timeRemaining);
  }

  /**
   * Check if token needs refresh based on threshold
   * Default threshold: 10 minutes before expiry
   */
  static needsRefresh(token: string, thresholdMs: number = 10 * 60 * 1000): boolean {
    const timeUntilExpiry = this.getTimeUntilExpiry(token);

    if (timeUntilExpiry === 0) {
      return true; // Already expired
    }

    return timeUntilExpiry <= thresholdMs;
  }

  /**
   * Get expiry date as Date object
   */
  static getExpiryDate(token: string): Date | null {
    const payload = this.parseToken(token);

    if (!payload || !payload.exp) {
      return null;
    }

    return new Date(payload.exp * 1000);
  }

  /**
   * Get issued at date as Date object
   */
  static getIssuedAtDate(token: string): Date | null {
    const payload = this.parseToken(token);

    if (!payload || !payload.iat) {
      return null;
    }

    return new Date(payload.iat * 1000);
  }

  /**
   * Get user ID from token
   */
  static getUserId(token: string): string | null {
    const payload = this.parseToken(token);
    return payload?.user_id || null;
  }

  /**
   * Get token type (access or refresh)
   */
  static getTokenType(token: string): string | null {
    const payload = this.parseToken(token);
    return payload?.token_type || null;
  }

  /**
   * Format time remaining in human-readable format
   */
  static formatTimeRemaining(token: string): string {
    const timeMs = this.getTimeUntilExpiry(token);

    if (timeMs === 0) {
      return 'Expired';
    }

    const minutes = Math.floor(timeMs / (60 * 1000));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  }

  /**
   * Validate token structure (basic checks)
   * Does NOT verify signature - that's server-side responsibility
   */
  static isValidStructure(token: string): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    const parts = token.split('.');

    if (parts.length !== 3) {
      return false;
    }

    const payload = this.parseToken(token);
    return payload !== null;
  }
}
