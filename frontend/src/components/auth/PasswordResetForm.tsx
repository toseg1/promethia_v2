import React, { useState } from 'react';
import { AuthError } from '../../types';
import { ArrowLeft, UserPlus, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PasswordResetFormProps {
  onSwitchToLogin: () => void;
  onSwitchToSignup: () => void;
  onPasswordReset: (email: string) => void;
}

interface FieldErrors {
  email?: string;
  general?: string;
}

export function PasswordResetForm({ onSwitchToLogin, onSwitchToSignup, onPasswordReset }: PasswordResetFormProps) {
  const { t } = useTranslation(['auth', 'validation']);
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return t('validation:email.required');
    }

    // Basic email format validation only - optimized for performance
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return t('validation:email.invalid');
    }

    return null;
  };

  const validateForm = () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setFieldErrors({ email: emailError });
      return false;
    }
    
    setFieldErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Fast validation - no delays
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFieldErrors({});
    
    try {
      // Call the password reset function - let App.tsx handle any simulation
      await onPasswordReset(email);
      setIsSubmitted(true);
      
    } catch (error: unknown) {
      // Handle specific errors from the parent component
      const authError = error as AuthError;
      const errors: FieldErrors = {};
      
      // Check the error field property first, then fall back to message checking
      if (authError.field) {
        switch (authError.field) {
          case 'email_not_found':
            errors.email = t('errors.emailNotRegistered');
            break;
          default:
            errors.general = t('errors.passwordResetFailed');
        }
      } else if (error.message) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('not registered') || errorMessage.includes('not found')) {
          errors.email = t('errors.emailNotRegistered');
        } else {
          errors.general = t('errors.networkError');
        }
      } else {
        errors.general = t('errors.networkError');
      }
      
      setFieldErrors(errors);
      console.error('Password reset failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailChange = (value: string) => {
    setEmail(value);
    // Clear errors immediately when user starts typing
    if (fieldErrors.email || fieldErrors.general) {
      setFieldErrors({});
    }
  };

  const handleEmailBlur = () => {
    // Lightweight validation on blur - only if field has content
    if (email.trim() && email.length > 3) {
      const emailError = validateEmail(email);
      if (emailError) {
        setFieldErrors({ email: emailError });
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

  if (isSubmitted) {
    return (
      <div className="auth-card">
        {/* Header */}
        <h1 className="auth-title">{t('common:appName')}</h1>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: 'var(--md-sys-spacing-6)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'var(--glass-bg-strong)',
            backdropFilter: 'var(--backdrop-blur)',
            WebkitBackdropFilter: 'var(--backdrop-blur)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--glass-border)'
          }}>
            <CheckCircle size={32} style={{ color: 'white' }} />
          </div>
        </div>
        <h2 className="auth-title" style={{ fontSize: '24px', marginBottom: 'var(--md-sys-spacing-4)' }}>{t('passwordReset.checkEmailTitle')}</h2>
        <p className="auth-subtitle">
          {t('passwordReset.emailSentMessage', { email })}
        </p>
        <p className="auth-subtitle" style={{
          fontSize: 'var(--text-sm)',
          marginTop: 'var(--md-sys-spacing-4)',
          marginBottom: 'var(--md-sys-spacing-6)'
        }}>
          {t('passwordReset.spamNote')}
        </p>

        <div className="auth-form">
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="btn-primary"
          >
            <ArrowLeft size={18} />
            {t('backToSignIn')}
          </button>

          <button
            type="button"
            onClick={onSwitchToSignup}
            className="btn-secondary"
          >
            <UserPlus size={18} />
            {t('createAccount')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      {/* Header */}
      <h1 className="auth-title">{t('common:appName')}</h1>
      <h2 className="auth-title" style={{ fontSize: '24px', marginBottom: 'var(--md-sys-spacing-4)' }}>{t('passwordReset.title')}</h2>
      <p className="auth-subtitle">
        {t('passwordReset.enterEmailMessage')}
      </p>
      
      {/* Form - noValidate for custom validation control */}
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Email Field */}
        <div className="input-field">
          <input
            type="email"
            placeholder={t('fields.email')}
            value={email}
            onChange={(e) => handleEmailChange(e.target.value)}
            onBlur={handleEmailBlur}
            required
            autoComplete="email"
            className={fieldErrors.email ? 'error' : ''}
            style={{ height: '48px' }}
            disabled={isLoading}
            noValidate
          />
          <Mail className="input-icon" size={20} />
          {renderFieldError('email')}
        </div>

        {/* General Error Message */}
        {fieldErrors.general && (
          <div className="input-error">
            <AlertCircle size={14} />
            {fieldErrors.general}
          </div>
        )}

        {/* Send Reset Link Button */}
        <button
          type="submit"
          className={`btn-primary ${isLoading ? 'loading' : ''}`}
          disabled={isLoading}
        >
          {isLoading ? <div className="loading-spinner" /> : t('passwordReset.sendResetLink')}
        </button>

        {/* Back to Sign In */}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="auth-link"
          disabled={isLoading}
        >
          {t('backToSignIn')}
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
