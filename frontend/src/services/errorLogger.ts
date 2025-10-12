// Error logging service for Promethia
// This service handles error reporting, logging, and analytics
import { AuthError, ComponentErrorContext, AsyncOperationContext, ErrorLoggerProps } from '../types';
import { logger } from '../utils/logger';

interface ErrorContext {
  userId?: string;
  userRole?: string;
  currentView?: string;
  userAgent?: string;
  timestamp: number;
  buildVersion?: string;
}

interface ErrorReport {
  error: Error;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'component' | 'async' | 'network' | 'auth' | 'unknown';
  stack?: string;
  breadcrumbs?: string[];
}

class ErrorLogger {
  private breadcrumbs: string[] = [];
  private maxBreadcrumbs = 10;
  private context: Partial<ErrorContext> = {};

  constructor() {
    this.initializeContext();
  }

  private initializeContext() {
    this.context = {
      userAgent: navigator.userAgent,
      buildVersion: import.meta.env.VITE_APP_VERSION || 'development',
      timestamp: Date.now()
    };
  }

  /**
   * Set user context for error reporting
   */
  setUserContext(userId: string, userRole: string, currentView?: string) {
    this.context = {
      ...this.context,
      userId,
      userRole,
      currentView,
      timestamp: Date.now()
    };
  }

  /**
   * Add a breadcrumb for debugging context
   */
  addBreadcrumb(message: string, category: 'navigation' | 'action' | 'api' | 'error' = 'action') {
    const breadcrumb = `[${new Date().toISOString()}] ${category}: ${message}`;
    this.breadcrumbs.push(breadcrumb);
    
    // Keep only the last N breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.maxBreadcrumbs);
    }
  }

  /**
   * Log an error with context
   */
  logError(
    error: Error, 
    type: ErrorReport['type'] = 'unknown',
    severity: ErrorReport['severity'] = 'medium',
    additionalContext?: Record<string, any>
  ) {
    const errorReport: ErrorReport = {
      error,
      context: {
        ...this.context,
        timestamp: Date.now(),
        ...additionalContext
      },
      severity,
      type,
      stack: error.stack,
      breadcrumbs: [...this.breadcrumbs]
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      logger.error(`🚨 Error Report - ${severity.toUpperCase()}`, error);
      logger.debug('Type:', type);
      logger.debug('Context:', errorReport.context);
      logger.debug('Breadcrumbs:', errorReport.breadcrumbs);
    }

    // Send to error tracking service in production
    if (import.meta.env.PROD) {
      this.sendToErrorService(errorReport);
    }

    // Store in local storage for debugging (last 5 errors)
    this.storeErrorLocally(errorReport);
  }

  /**
   * Log component errors
   */
  logComponentError(error: Error, componentName: string, props?: ComponentErrorContext) {
    this.addBreadcrumb(`Component error in ${componentName}`, 'error');
    this.logError(error, 'component', 'high', {
      componentName,
      props: this.sanitizeProps(props)
    });
  }

  /**
   * Log async operation errors
   */
  logAsyncError(error: Error, operation: string, context?: AsyncOperationContext) {
    this.addBreadcrumb(`Async error in ${operation}`, 'error');
    this.logError(error, 'async', 'medium', {
      operation,
      asyncContext: context
    });
  }

  /**
   * Log authentication errors
   */
  logAuthError(error: Error, authAction: string) {
    this.logError(error, 'auth', 'high', {
      authAction,
      sensitive: true // Flag for sensitive data handling
    });
  }

  /**
   * Log network/API errors
   */
  logNetworkError(error: Error, endpoint: string, method: string) {
    this.addBreadcrumb(`Network error: ${method} ${endpoint}`, 'api');
    this.logError(error, 'network', 'medium', {
      endpoint,
      method
    });
  }

  /**
   * Send error to external service (placeholder)
   */
  private async sendToErrorService(errorReport: ErrorReport) {
    try {
      // Example: Send to Sentry, LogRocket, Bugsnag, etc.
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });
      
      logger.info('Error would be sent to monitoring service:', errorReport);
    } catch (sendError) {
      logger.error('Failed to send error report:', sendError as Error);
    }
  }

  /**
   * Store error locally for debugging
   */
  private storeErrorLocally(errorReport: ErrorReport) {
    try {
      const stored = localStorage.getItem('promethia_errors');
      const errors = stored ? JSON.parse(stored) : [];
      
      errors.push({
        ...errorReport,
        error: {
          message: errorReport.error.message,
          name: errorReport.error.name,
          stack: errorReport.error.stack
        }
      });
      
      // Keep only last 5 errors
      const recentErrors = errors.slice(-5);
      localStorage.setItem('promethia_errors', JSON.stringify(recentErrors));
    } catch (storageError) {
      logger.warn('Could not store error locally:', storageError);
    }
  }

  /**
   * Sanitize props to remove sensitive data
   */
  private sanitizeProps(props: ErrorLoggerProps | undefined) {
    if (!props) return null;
    
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret'];
    const sanitized = { ...props };
    
    Object.keys(sanitized).forEach(key => {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Get stored errors for debugging
   */
  getStoredErrors() {
    try {
      const stored = localStorage.getItem('promethia_errors');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear stored errors
   */
  clearStoredErrors() {
    try {
      localStorage.removeItem('promethia_errors');
    } catch (error) {
      logger.warn('Could not clear stored errors:', error);
    }
  }
}

// Create singleton instance
export const errorLogger = new ErrorLogger();

// Export types for use in components
export type { ErrorReport, ErrorContext };
