// Authentication utility functions based on AuthManager specifications

export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface IOSOptimizations {
  preventZoom: boolean;
  handleKeyboard: boolean;
}

export class AuthFormManager {
  private formElement: HTMLFormElement | null = null;
  private submitButton: HTMLButtonElement | null = null;
  private notificationTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.setupIOSOptimizations();
  }

  // Initialize form handling
  init(formId: string, submitBtnId: string): boolean {
    this.formElement = document.getElementById(formId) as HTMLFormElement;
    this.submitButton = document.getElementById(submitBtnId) as HTMLButtonElement;
    
    if (!this.formElement || !this.submitButton) {
      console.warn('AuthFormManager: Could not find form or submit button');
      return false;
    }

    this.setupFormListeners();
    return true;
  }

  // Auto-detect and initialize common form patterns
  autoInit(): boolean {
    const formConfigs = [
      { formId: 'loginForm', btnId: 'signinBtn' },
      { formId: 'signupForm', btnId: 'signupBtn' },
      { formId: 'resetForm', btnId: 'resetBtn' },
      { formId: 'authForm', btnId: 'submitBtn' }
    ];

    for (const config of formConfigs) {
      if (this.init(config.formId, config.btnId)) {
        return true;
      }
    }

    return false;
  }

  // Validate form fields
  validateForm(): FormValidationResult {
    if (!this.formElement) {
      return { isValid: false, errors: { form: 'Form not initialized' } };
    }

    const errors: Record<string, string> = {};
    const formData = new FormData(this.formElement);
    const requiredFields = this.formElement.querySelectorAll('[required]');

    requiredFields.forEach((field) => {
      const input = field as HTMLInputElement;
      const value = formData.get(input.name)?.toString() || '';
      
      if (!value.trim()) {
        errors[input.name] = `${this.getFieldLabel(input)} is required`;
      } else {
        // Type-specific validation
        if (input.type === 'email' && !this.isValidEmail(value)) {
          errors[input.name] = 'Please enter a valid email address';
        }
        
        if (input.type === 'password' && value.length < 8) {
          errors[input.name] = 'Password must be at least 8 characters';
        }
      }
    });

    // Password confirmation validation
    const password = formData.get('password')?.toString();
    const confirmPassword = formData.get('confirmPassword')?.toString();
    
    if (password && confirmPassword && password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Add error to specific field
  addFieldError(fieldName: string, message: string): void {
    const field = this.formElement?.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
    if (!field) return;

    field.classList.add('error');
    
    // Remove existing error message
    this.clearFieldError(fieldName);
    
    // Add new error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'input-error';
    errorDiv.innerHTML = `<span class="error-icon">⚠</span><span>${message}</span>`;
    
    field.parentNode?.insertBefore(errorDiv, field.nextSibling);
  }

  // Clear error from specific field
  clearFieldError(fieldName: string): void {
    const field = this.formElement?.querySelector(`[name="${fieldName}"]`) as HTMLInputElement;
    if (!field) return;

    field.classList.remove('error');
    
    // Remove error message
    const errorDiv = field.parentNode?.querySelector('.input-error');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  // Show notification
  showNotification(message: string, type: 'success' | 'error' = 'success'): void {
    // Clear existing notification
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }

    // Create new notification
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
      <div style="color: white; font-family: var(--font-secondary); font-weight: 500; font-size: 14px;">
        ${message}
      </div>
    `;

    document.body.appendChild(notification);

    // Show notification
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);

    // Auto-hide notification
    this.notificationTimeout = setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    }, 5000);
  }

  // Reset form to initial state
  resetForm(): void {
    if (!this.formElement) return;

    this.formElement.reset();
    
    // Clear all field errors
    const errorFields = this.formElement.querySelectorAll('.error');
    errorFields.forEach(field => {
      field.classList.remove('error');
    });
    
    const errorMessages = this.formElement.querySelectorAll('.input-error');
    errorMessages.forEach(error => error.remove());
  }

  // Show loading state on button
  showButtonLoading(button?: HTMLButtonElement): void {
    const btn = button || this.submitButton;
    if (!btn) return;

    btn.classList.add('loading');
    btn.disabled = true;
    
    if (!btn.querySelector('.loading-spinner')) {
      const spinner = document.createElement('div');
      spinner.className = 'loading-spinner';
      btn.appendChild(spinner);
    }
  }

  // Hide loading state on button
  hideButtonLoading(button?: HTMLButtonElement): void {
    const btn = button || this.submitButton;
    if (!btn) return;

    btn.classList.remove('loading');
    btn.disabled = false;
    
    const spinner = btn.querySelector('.loading-spinner');
    if (spinner) {
      spinner.remove();
    }
  }

  // iOS-specific optimizations
  private setupIOSOptimizations(): void {
    // Prevent zoom on input focus
    const meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    
    // Only apply on iOS
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
      document.head.appendChild(meta);
    }

    // Handle iOS keyboard
    window.addEventListener('resize', () => {
      if (window.innerHeight < 500) {
        document.body.classList.add('keyboard-open');
      } else {
        document.body.classList.remove('keyboard-open');
      }
    });
  }

  // Setup form event listeners
  private setupFormListeners(): void {
    if (!this.formElement) return;

    // Auto-focus first input
    const firstInput = this.formElement.querySelector('input:not([type="hidden"])') as HTMLInputElement;
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 100);
    }

    // Enter key navigation
    const inputs = this.formElement.querySelectorAll('input');
    inputs.forEach((input, index) => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          
          if (index < inputs.length - 1) {
            (inputs[index + 1] as HTMLInputElement).focus();
          } else {
            this.submitButton?.click();
          }
        }
      });

      // Clear errors on input
      input.addEventListener('input', () => {
        if (input.classList.contains('error')) {
          this.clearFieldError(input.name);
        }
      });
    });
  }

  // Helper methods
  private getFieldLabel(input: HTMLInputElement): string {
    const label = document.querySelector(`label[for="${input.id}"]`);
    return label?.textContent || input.placeholder || input.name;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const authManager = new AuthFormManager();
    authManager.autoInit();
  });
}

// Export utilities for React components
export const authValidation = {
  validateEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  validatePassword: (password: string) => password.length >= 8,
  validateRequired: (value: string) => value.trim().length > 0,
  validatePasswordMatch: (password: string, confirmPassword: string) => password === confirmPassword,
};

export const authHelpers = {
  formatFieldName: (fieldName: string) => {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  },
  
  generateStrongPassword: () => {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  },
  
  debounce: <T extends (...args: unknown[]) => void>(func: T, wait: number) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  }
};