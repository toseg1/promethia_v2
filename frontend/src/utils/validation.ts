// Input Validation and Sanitization Utilities
import i18n from '../i18n';

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData: Record<string, any>;
}

/**
 * HTML sanitization to prevent XSS attacks
 */
export function sanitizeHTML(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize and validate text input
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Email validation with sanitization
 */
export function validateEmail(email: string): { isValid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeText(email, 254).toLowerCase();
  
  if (!sanitized) {
    return { isValid: false, sanitized: '', error: i18n.t('validation:email.required') };
  }
  
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: i18n.t('validation:email.invalid') };
  }
  
  return { isValid: true, sanitized };
}

/**
 * Password validation with security requirements
 */
export function validatePassword(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!password) {
    errors.push(i18n.t('validation:password.required'));
    return { isValid: false, errors };
  }
  
  if (password.length < 8) {
    errors.push(i18n.t('validation:password.tooShort'));
  }
  
  if (password.length > 128) {
    errors.push(i18n.t('validation:password.tooLong'));
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push(i18n.t('validation:password.needsLowercase'));
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push(i18n.t('validation:password.needsUppercase'));
  }
  
  if (!/\d/.test(password)) {
    errors.push(i18n.t('validation:password.needsNumber'));
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>?]/.test(password)) {
    errors.push(i18n.t('validation:password.needsSpecialChar'));
  }
  
  return { isValid: errors.length === 0, errors };
}

/**
 * Phone number validation and sanitization
 */
export function validatePhone(phone: string): { isValid: boolean; sanitized: string; error?: string } {
  if (!phone) {
    return { isValid: false, sanitized: '', error: i18n.t('validation:phone.required') };
  }
  
  // Remove all non-digit characters except + for international prefix
  const sanitized = phone.replace(/[^\d+]/g, '');
  
  // Basic phone validation (supports international format)
  const phoneRegex = /^(\+\d{1,3})?[\d\s-()]{8,15}$/;
  
  if (!phoneRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: i18n.t('validation:phone.invalid') };
  }
  
  return { isValid: true, sanitized };
}

/**
 * Name validation (first name, last name)
 */
export function validateName(name: string, fieldName: string): { isValid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeText(name, 50);
  
  if (!sanitized) {
    return { isValid: false, sanitized: '', error: i18n.t('validation:name.required', { fieldName }) };
  }
  
  if (sanitized.length < 2) {
    return { isValid: false, sanitized, error: i18n.t('validation:name.tooShort', { fieldName }) };
  }
  
  // Allow letters, spaces, hyphens, apostrophes
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  
  if (!nameRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: i18n.t('validation:name.invalidChars', { fieldName }) };
  }
  
  return { isValid: true, sanitized };
}

/**
 * Username validation
 */
export function validateUsername(username: string): { isValid: boolean; sanitized: string; error?: string } {
  const sanitized = sanitizeText(username, 30).toLowerCase();
  
  if (!sanitized) {
    return { isValid: false, sanitized: '', error: i18n.t('validation:username.required') };
  }
  
  if (sanitized.length < 3) {
    return { isValid: false, sanitized, error: i18n.t('validation:username.tooShort') };
  }
  
  // Allow letters, numbers, underscores, hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  
  if (!usernameRegex.test(sanitized)) {
    return { isValid: false, sanitized, error: i18n.t('validation:username.invalidChars') };
  }
  
  return { isValid: true, sanitized };
}

/**
 * Generic text field validation
 */
export function validateTextField(
  value: string, 
  fieldName: string, 
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    patternError?: string;
  } = {}
): { isValid: boolean; sanitized: string; error?: string } {
  const { 
    required = false, 
    minLength = 0, 
    maxLength = 1000, 
    pattern, 
    patternError = i18n.t('validation:field.invalidFormat') 
  } = options;
  
  const sanitized = sanitizeText(value, maxLength);
  
  if (required && !sanitized) {
    return { isValid: false, sanitized: '', error: i18n.t('validation:field.required', { fieldName }) };
  }
  
  if (sanitized && sanitized.length < minLength) {
    return { isValid: false, sanitized, error: i18n.t('validation:field.tooShort', { fieldName, minLength }) };
  }
  
  if (pattern && sanitized && !pattern.test(sanitized)) {
    return { isValid: false, sanitized, error: patternError };
  }
  
  return { isValid: true, sanitized };
}

/**
 * Validate complete form data
 */
export function validateFormData(data: Record<string, any>, schema: Record<string, any>): ValidationResult {
  const errors: ValidationError[] = [];
  const sanitizedData: Record<string, any> = {};
  
  Object.keys(schema).forEach(field => {
    const fieldSchema = schema[field];
    const fieldValue = data[field];
    
    switch (fieldSchema.type) {
      case 'email': {
        const result = validateEmail(fieldValue);
        if (!result.isValid && fieldSchema.required !== false) {
          errors.push({ field, message: result.error || i18n.t('validation:email.invalid'), code: 'INVALID_EMAIL' });
        }
        sanitizedData[field] = result.sanitized;
        break;
      }
      
      case 'password': {
        const result = validatePassword(fieldValue);
        if (!result.isValid) {
          result.errors.forEach(error => {
            errors.push({ field, message: error || i18n.t('validation:password.required'), code: 'INVALID_PASSWORD' });
          });
        }
        sanitizedData[field] = fieldValue; // Don't sanitize passwords
        break;
      }
      
      case 'name': {
        const result = validateName(fieldValue, fieldSchema.label || field);
        if (!result.isValid && fieldSchema.required !== false) {
          errors.push({ field, message: result.error || i18n.t('validation:name.invalidChars', { fieldName: fieldSchema.label || field }), code: 'INVALID_NAME' });
        }
        sanitizedData[field] = result.sanitized;
        break;
      }
      
      case 'username': {
        const result = validateUsername(fieldValue);
        if (!result.isValid && fieldSchema.required !== false) {
          errors.push({ field, message: result.error || i18n.t('validation:username.invalidChars'), code: 'INVALID_USERNAME' });
        }
        sanitizedData[field] = result.sanitized;
        break;
      }
      
      case 'phone': {
        const result = validatePhone(fieldValue);
        if (!result.isValid && fieldSchema.required !== false) {
          errors.push({ field, message: result.error || i18n.t('validation:phone.invalid'), code: 'INVALID_PHONE' });
        }
        sanitizedData[field] = result.sanitized;
        break;
      }
      
      case 'text':
      default: {
        const result = validateTextField(fieldValue, fieldSchema.label || field, fieldSchema);
        if (!result.isValid) {
          errors.push({ field, message: result.error || i18n.t('validation:field.invalidFormat'), code: 'INVALID_TEXT' });
        }
        sanitizedData[field] = result.sanitized;
        break;
      }
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData
  };
}

/**
 * CSRF Token utilities
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

export function validateCSRFToken(token: string, expectedToken: string): boolean {
  if (!token || !expectedToken) return false;
  return token === expectedToken;
}

/**
 * Rate limiting helpers
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  
  constructor(private maxAttempts: number = 5, private windowMs: number = 15 * 60 * 1000) {} // 15 minutes
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(key);
    
    if (!attempt || now > attempt.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + this.windowMs });
      return true;
    }
    
    if (attempt.count >= this.maxAttempts) {
      return false;
    }
    
    attempt.count++;
    return true;
  }
  
  getRemainingAttempts(key: string): number {
    const attempt = this.attempts.get(key);
    if (!attempt || Date.now() > attempt.resetTime) {
      return this.maxAttempts;
    }
    return Math.max(0, this.maxAttempts - attempt.count);
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}
