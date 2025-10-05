import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthError } from '../../types';
import { AtSign, Lock, UserPlus, AlertCircle } from 'lucide-react';
import { validateUsername, validateTextField, sanitizeText, RateLimiter } from '../../utils/validation';
import { tokenStorage } from '../../utils/secureStorage';

interface LoginFormProps {
  onSwitchToSignup: () => void;
  onSwitchToPasswordReset: () => void;
  onLogin: (username: string, password: string, rememberMe: boolean) => void;
}

interface FieldErrors {
  username?: string;
  password?: string;
  general?: string;
}

export function LoginForm({ onSwitchToSignup, onSwitchToPasswordReset, onLogin }: LoginFormProps) {
  const { t } = useTranslation(['auth', 'common', 'validation']);

  // REFACTORED: Load remembered username on mount
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Load remembered username on component mount
  useEffect(() => {
    const rememberedUsername = tokenStorage.getRememberedUsername();
    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRememberMe(true); // Check "Remember Me" if we have a remembered username
    }
  }, []);
  
  // Rate limiting for login attempts
  const [rateLimiter] = useState(() => new RateLimiter(5, 15 * 60 * 1000)); // 5 attempts per 15 minutes

  const validateUsernameField = (username: string): string | null => {
    const result = validateUsername(username);
    return result.isValid ? null : (result.error || t('validation:username.invalidChars'));
  };

  const validatePasswordField = (password: string): string | null => {
    const result = validateTextField(password, t('common:password'), { 
      required: true, 
      minLength: 1, // For login, we only require non-empty
      maxLength: 128 
    });
    return result.isValid ? null : (result.error || t('validation:password.required'));
  };

  const validateForm = () => {
    const errors: FieldErrors = {};
    let isValid = true;

    const usernameError = validateUsernameField(username);
    if (usernameError) {
      errors.username = usernameError;
      isValid = false;
    }
    
    const passwordError = validatePasswordField(password);
    if (passwordError) {
      errors.password = passwordError;
      isValid = false;
    }
    
    setFieldErrors(errors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check rate limiting first
    const clientIP = 'user'; // In a real app, this would be the user's IP or ID
    if (!rateLimiter.isAllowed(clientIP)) {
      const remaining = rateLimiter.getRemainingAttempts(clientIP);
      setFieldErrors({
        general: t('errors.tooManyAttempts', { remaining })
      });
      return;
    }
    
    // Fast client-side validation
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFieldErrors({});
    
    try {
      // Sanitize inputs before sending
      const sanitizedUsername = sanitizeText(username, 30).toLowerCase();
      
      // Call the login function - let App.tsx handle the authentication logic
      await onLogin(sanitizedUsername, password, rememberMe);
      
    } catch (error: unknown) {
      // Handle authentication errors from App.tsx
      const errors: FieldErrors = {};
      
      // Check the error field property first, then fall back to message checking
      const authError = error as AuthError;
      if (authError.field) {
        switch (authError.field) {
          case 'username_not_found':
            errors.username = t('errors.usernameNotRegistered');
            break;
          case 'account_disabled':
            errors.username = t('errors.accountDisabled');
            break;
          case 'invalid_password':
            errors.password = t('errors.incorrectPassword');
            break;
          default:
            errors.general = t('errors.loginFailed');
        }
      } else if (authError.message) {
        // Fallback to message checking
        const errorMessage = authError.message.toLowerCase();
        
        if (errorMessage.includes('username not found') || errorMessage.includes('not registered')) {
          errors.username = t('errors.usernameNotRegistered');
        } else if (errorMessage.includes('account disabled') || errorMessage.includes('disabled')) {
          errors.username = t('errors.accountDisabled');
        } else if (errorMessage.includes('invalid password') || errorMessage.includes('incorrect password')) {
          errors.password = t('errors.incorrectPassword');
        } else {
          errors.general = t('errors.loginFailed');
        }
      } else {
        errors.general = t('errors.networkError');
      }
      
      setFieldErrors(errors);
      console.error('Login failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    // Sanitize input as user types (basic sanitization)
    const sanitized = sanitizeText(value, 30);
    setUsername(sanitized);
    // Clear errors immediately when user starts typing
    if (fieldErrors.username || fieldErrors.general) {
      setFieldErrors(prev => ({ ...prev, username: undefined, general: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    // Clear errors immediately when user starts typing
    if (fieldErrors.password || fieldErrors.general) {
      setFieldErrors(prev => ({ ...prev, password: undefined, general: undefined }));
    }
  };

  const handleUsernameBlur = () => {
    // Lightweight validation on blur
    if (username.trim()) {
      const usernameError = validateUsernameField(username);
      if (usernameError) {
        setFieldErrors(prev => ({ ...prev, username: usernameError }));
      }
    }
  };

  const handlePasswordBlur = () => {
    // Lightweight validation on blur
    if (password.trim()) {
      const passwordError = validatePasswordField(password);
      if (passwordError) {
        setFieldErrors(prev => ({ ...prev, password: passwordError }));
      }
    }
  };

  const renderFieldError = (field: keyof FieldErrors) => {
    if (!fieldErrors[field]) return null;
    
    return (
      <div className="input-error">
        <AlertCircle size={14} />
        {fieldErrors[field]}
      </div>
    );
  };

  return (
    <div className="auth-card">
      {/* Header */}
      <h1 className="auth-title">{t('common:appName', 'PROMETHIA')}</h1>
      <p className="auth-subtitle">
        {t('welcomeMessage')}
      </p>

      {/* Form - noValidate for custom validation control */}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Username Field */}
        <div className="input-field">
          <input
            type="text"
            placeholder={t('fields.username')}
            value={username}
            onChange={(e) => handleUsernameChange(e.target.value)}
            onBlur={handleUsernameBlur}
            required
            autoComplete="username"
            className={fieldErrors.username ? 'error' : ''}
            style={{ height: '48px' }}
            disabled={isLoading}
          />
          <AtSign className="input-icon" size={20} />
          {renderFieldError('username')}
        </div>

        {/* Password Field */}
        <div className="input-field">
          <input
            type="password"
            placeholder={t('fields.password')}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            onBlur={handlePasswordBlur}
            required
            autoComplete="current-password"
            className={fieldErrors.password ? 'error' : ''}
            style={{ height: '48px' }}
            disabled={isLoading}
          />
          <Lock className="input-icon" size={20} />
          {renderFieldError('password')}
        </div>

        {/* General Error Message */}
        {fieldErrors.general && (
          <div className="input-error">
            <AlertCircle size={14} />
            {fieldErrors.general}
          </div>
        )}

        {/* Remember Me Checkbox */}
        <div className="checkbox-field">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            disabled={isLoading}
          />
          <label htmlFor="rememberMe">
            {t('rememberMe')}
          </label>
        </div>

        {/* Sign In Button */}
        <button
          type="submit"
          className={`btn-primary ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? <div className="loading-spinner" /> : t('signIn')}
        </button>

        {/* Forgot Password Link */}
        <button
          type="button"
          onClick={onSwitchToPasswordReset}
          className="auth-link"
          disabled={isLoading}
        >
          {t('forgotPassword')}
        </button>

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          margin: 'var(--md-sys-spacing-6) 0',
          gap: 'var(--md-sys-spacing-4)'
        }}>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'rgba(255, 255, 255, 0.3)'
          }} />
          <span style={{
            padding: '0 var(--md-sys-spacing-2)',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--backdrop-blur)',
            WebkitBackdropFilter: 'var(--backdrop-blur)',
            borderRadius: '20px',
            font: 'var(--md-sys-typescale-body-small)',
            color: 'rgba(255, 255, 255, 0.7)',
            whiteSpace: 'nowrap'
          }}>
            {t('newToPromethia')}
          </span>
          <div style={{
            flex: 1,
            height: '1px',
            background: 'rgba(255, 255, 255, 0.3)'
          }} />
        </div>

        {/* Create Account Button */}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="btn-secondary"
          disabled={isLoading}
        >
          <UserPlus size={18} />
          {t('createAccount')}
        </button>
      </form>
    </div>
  );
}
