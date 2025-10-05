import { generateCSRFToken, validateCSRFToken } from './validation';

/**
 * CSRF Protection Utility
 */
class CSRFProtection {
  private token: string | null = null;
  private readonly TOKEN_HEADER = 'X-CSRFToken';  // Match Django's expected header name
  private readonly TOKEN_META = 'csrf-token';
  
  /**
   * Initialize CSRF protection
   */
  init(): void {
    this.token = generateCSRFToken();
    this.addMetaTag();
    this.addToForms();
  }
  
  /**
   * Get current CSRF token
   */
  getToken(): string | null {
    return this.token;
  }
  
  /**
   * Add CSRF token to meta tag
   */
  private addMetaTag(): void {
    if (!this.token) return;
    
    let meta = document.querySelector(`meta[name="${this.TOKEN_META}"]`) as HTMLMetaElement;
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = this.TOKEN_META;
      document.head.appendChild(meta);
    }
    meta.content = this.token;
  }
  
  /**
   * Add CSRF token to all forms
   */
  private addToForms(): void {
    if (!this.token) return;
    
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
      this.addTokenToForm(form);
    });
  }
  
  /**
   * Add CSRF token to a specific form
   */
  addTokenToForm(form: HTMLFormElement): void {
    if (!this.token) return;
    
    let input = form.querySelector('input[name="csrf_token"]') as HTMLInputElement;
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'csrf_token';
      form.appendChild(input);
    }
    input.value = this.token;
  }
  
  /**
   * Get CSRF header for requests
   */
  getHeader(): Record<string, string> {
    if (!this.token) return {};
    
    return {
      [this.TOKEN_HEADER]: this.token
    };
  }
  
  /**
   * Validate CSRF token
   */
  validate(token: string): boolean {
    if (!this.token) return false;
    return validateCSRFToken(token, this.token);
  }
  
  /**
   * Refresh CSRF token
   */
  refresh(): void {
    this.init();
  }
}

/**
 * Security Monitoring
 */
class SecurityMonitor {
  private violations: Array<{
    type: string;
    details: string;
    timestamp: number;
  }> = [];
  
  private readonly MAX_VIOLATIONS = 10;
  
  /**
   * Report security violation
   */
  reportViolation(type: string, details: string): void {
    const violation = {
      type,
      details,
      timestamp: Date.now()
    };
    
    this.violations.unshift(violation);
    
    // Keep only recent violations
    if (this.violations.length > this.MAX_VIOLATIONS) {
      this.violations = this.violations.slice(0, this.MAX_VIOLATIONS);
    }
    
    // Log violation
    console.warn(`🛡️ Security violation detected: ${type}`, details);
    
    // In production, you would send this to your security monitoring service
    if (import.meta.env.PROD) {
      this.sendToSecurityService(violation);
    }
  }
  
  /**
   * Get recent violations
   */
  getViolations(): Array<{type: string; details: string; timestamp: number}> {
    return [...this.violations];
  }
  
  /**
   * Clear violations
   */
  clearViolations(): void {
    this.violations = [];
  }
  
  /**
   * Send violation to security service (mock implementation)
   */
  private sendToSecurityService(violation: {type: string; details: string; timestamp: number}): void {
    // Mock implementation - replace with actual security service endpoint
    fetch('/api/security/violations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(violation)
    }).catch(error => {
      console.warn('Failed to report security violation:', error);
    });
  }
}

/**
 * Input Sanitization for DOM manipulation
 */
export class DOMSanitizer {
  /**
   * Safely set innerHTML with sanitization
   */
  static setInnerHTML(element: HTMLElement, html: string): void {
    // Basic HTML sanitization - remove script tags and event handlers
    const sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+="[^"]*"/gi, '')
      .replace(/javascript:/gi, '');
    
    element.innerHTML = sanitized;
  }
  
  /**
   * Safely set text content
   */
  static setText(element: HTMLElement, text: string): void {
    element.textContent = text;
  }
  
  /**
   * Safely set attribute value
   */
  static setAttribute(element: HTMLElement, name: string, value: string): void {
    // Block potentially dangerous attributes
    const dangerousAttributes = [
      'onload', 'onerror', 'onclick', 'onmouseover',
      'onfocus', 'onblur', 'onchange', 'onsubmit'
    ];
    
    if (dangerousAttributes.includes(name.toLowerCase())) {
      console.warn(`Blocked dangerous attribute: ${name}`);
      return;
    }
    
    element.setAttribute(name, value);
  }
}

/**
 * Secure Local Storage wrapper
 */
export class SecureLocalStorage {
  private static readonly PREFIX = 'secure_';
  
  /**
   * Set item with timestamp and validation
   */
  static setItem(key: string, value: string, maxAge?: number): void {
    const data = {
      value,
      timestamp: Date.now(),
      maxAge: maxAge || (24 * 60 * 60 * 1000), // 24 hours default
    };
    
    try {
      localStorage.setItem(
        this.PREFIX + key,
        btoa(JSON.stringify(data)) // Base64 encode for basic obfuscation
      );
    } catch (error) {
      console.warn('Failed to set secure localStorage item:', error);
    }
  }
  
  /**
   * Get item with validation
   */
  static getItem(key: string): string | null {
    try {
      const item = localStorage.getItem(this.PREFIX + key);
      if (!item) return null;
      
      const data = JSON.parse(atob(item));
      
      // Check if item has expired
      if (Date.now() - data.timestamp > data.maxAge) {
        this.removeItem(key);
        return null;
      }
      
      return data.value;
    } catch (error) {
      console.warn('Failed to get secure localStorage item:', error);
      return null;
    }
  }
  
  /**
   * Remove item
   */
  static removeItem(key: string): void {
    localStorage.removeItem(this.PREFIX + key);
  }
  
  /**
   * Clear all secure items
   */
  static clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Global instances
export const csrfProtection = new CSRFProtection();
export const securityMonitor = new SecurityMonitor();

/**
 * Initialize security systems
 */
export function initializeSecuritySystems(): void {
  // Initialize CSRF protection
  csrfProtection.init();
  
  // Set up security monitoring
  if (typeof window !== 'undefined') {
    // Monitor for suspicious activity
    window.addEventListener('error', (event) => {
      if (event.error) {
        securityMonitor.reportViolation('script_error', event.error.message);
      }
    });
    
    // Monitor for CSP violations
    window.addEventListener('securitypolicyviolation', (event) => {
      securityMonitor.reportViolation('csp_violation', `${event.violatedDirective}: ${event.blockedURI}`);
    });
    
    // Monitor for unusual navigation patterns
    let navigationCount = 0;
    window.addEventListener('beforeunload', () => {
      navigationCount++;
      if (navigationCount > 20) { // Threshold for suspicious activity
        securityMonitor.reportViolation('excessive_navigation', `${navigationCount} navigations in session`);
      }
    });
  }
}

/**
 * Security utility functions
 */
export const SecurityUtils = {
  /**
   * Check if current context is secure (HTTPS)
   */
  isSecureContext(): boolean {
    return window.isSecureContext || window.location.protocol === 'https:';
  },
  
  /**
   * Generate secure random string
   */
  generateSecureRandom(length: number = 32): string {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  },
  
  /**
   * Simple hash function for integrity checks
   */
  async simpleHash(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },
  
  /**
   * Validate URL to prevent open redirects
   */
  isValidRedirectURL(url: string, allowedDomains: string[] = []): boolean {
    try {
      const parsed = new URL(url, window.location.origin);
      
      // Allow relative URLs
      if (parsed.origin === window.location.origin) {
        return true;
      }
      
      // Check allowed domains
      return allowedDomains.some(domain => 
        parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`)
      );
    } catch {
      return false;
    }
  }
};