import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { validatePassword } from '../../utils/validation';

interface PasswordResetConfirmFormProps {
  uid: string;
  token: string;
  onSwitchToLogin: () => void;
  onResetConfirm: (token: string, password: string) => Promise<void>;
}

interface FieldErrors {
  password?: string;
  confirmPassword?: string;
  general?: string;
}

export function PasswordResetConfirmForm({ uid, token, onSwitchToLogin, onResetConfirm }: PasswordResetConfirmFormProps) {
  const { t } = useTranslation(['auth', 'common', 'validation']);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Validate we have the required parameters
  useEffect(() => {
    if (!uid || !token) {
      setFieldErrors({
        general: t('errors.missingResetLink')
      });
    }
  }, [uid, token, t]);

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    // Clear errors when user starts typing
    if (fieldErrors.password || fieldErrors.general) {
      setFieldErrors({ ...fieldErrors, password: undefined, general: undefined });
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    // Clear errors when user starts typing
    if (fieldErrors.confirmPassword || fieldErrors.general) {
      setFieldErrors({ ...fieldErrors, confirmPassword: undefined, general: undefined });
    }
  };

  const handlePasswordBlur = () => {
    if (password.trim() && password.length > 3) {
      const passwordResult = validatePassword(password);
      if (!passwordResult.isValid) {
        setFieldErrors({ ...fieldErrors, password: passwordResult.errors[0] });
      }
    }
  };

  const handleConfirmPasswordBlur = () => {
    if (confirmPassword.trim() && confirmPassword.length > 3) {
      if (password !== confirmPassword) {
        setFieldErrors({ ...fieldErrors, confirmPassword: t('errors.passwordsDoNotMatch') });
      }
    }
  };

  const validateForm = () => {
    const errors: FieldErrors = {};

    const passwordResult = validatePassword(password);
    if (!passwordResult.isValid) {
      errors.password = passwordResult.errors[0]; // Show first error for cleaner UI
    }

    if (!confirmPassword.trim()) {
      errors.confirmPassword = t('errors.confirmPassword');
    } else if (password !== confirmPassword) {
      errors.confirmPassword = t('errors.passwordsDoNotMatch');
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!uid || !token) {
      setFieldErrors({
        general: t('errors.invalidResetLink')
      });
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setFieldErrors({});

    try {
      // Combine uid and token for backend
      const combinedToken = `${uid}-${token}`;
      await onResetConfirm(combinedToken, password);
      setIsSuccess(true);
    } catch (error: any) {
      const errors: FieldErrors = {};

      if (error.message) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
          errors.general = t('errors.expiredResetLink');
        } else if (errorMessage.includes('password')) {
          errors.password = error.message;
        } else {
          errors.general = error.message;
        }
      } else {
        errors.general = t('errors.passwordResetFailed');
      }

      setFieldErrors(errors);
    } finally {
      setIsLoading(false);
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

  // Success screen
  if (isSuccess) {
    return (
      <div className="auth-card">
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
        <h2 className="auth-title" style={{ fontSize: '24px', marginBottom: 'var(--md-sys-spacing-4)' }}>{t('passwordResetConfirm.sucessTitle')}</h2>
        <p className="auth-subtitle">
          {t('passwordResetConfirm.sucess')}
        </p>

        <div className="auth-form" style={{ marginTop: 'var(--md-sys-spacing-6)' }}>
          <button
            type="button"
            onClick={onSwitchToLogin}
            className="btn-primary"
          >
            <ArrowLeft size={18} />
            {t('signIn')}
          </button>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="auth-card">
      <h1 className="auth-title">{t('common:appName')}</h1>
      <h2 className="auth-title" style={{ fontSize: '24px', marginBottom: 'var(--md-sys-spacing-4)' }}>{t('passwordResetConfirm.title')}</h2>
      <p className="auth-subtitle">
        {t('passwordResetConfirm.subtitle')}
      </p>

      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        {/* Password Field */}
        <div className="input-field">
          <input
            type="password"
            placeholder={t('passwordResetConfirm.newPasswordPlaceholder')}
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            onBlur={handlePasswordBlur}
            required
            autoComplete="new-password"
            className={fieldErrors.password ? 'error' : ''}
            style={{ height: '48px' }}
            disabled={isLoading}
          />
          <Lock className="input-icon" size={20} />
          {renderFieldError('password')}
        </div>

        {/* Confirm Password Field */}
        <div className="input-field">
          <input
            type="password"
            placeholder={t('passwordResetConfirm.confirmPasswordPlaceholder')}
            value={confirmPassword}
            onChange={(e) => handleConfirmPasswordChange(e.target.value)}
            onBlur={handleConfirmPasswordBlur}
            required
            autoComplete="new-password"
            className={fieldErrors.confirmPassword ? 'error' : ''}
            style={{ height: '48px' }}
            disabled={isLoading}
          />
          <Lock className="input-icon" size={20} />
          {renderFieldError('confirmPassword')}
        </div>

        {/* Password Requirements */}
        <div style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--backdrop-blur)',
          WebkitBackdropFilter: 'var(--backdrop-blur)',
          border: '1px solid var(--glass-border)',
          borderRadius: '12px',
          padding: 'var(--md-sys-spacing-4)',
          marginBottom: 'var(--md-sys-spacing-5)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertCircle size={16} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: '500' }}>
              {t('password.requirements')}
            </span>
          </div>
          <ul style={{
            margin: 0,
            paddingLeft: '20px',
            fontSize: 'var(--text-sm)',
            color: 'rgba(255, 255, 255, 0.7)',
            lineHeight: '1.6'
          }}>
            <li>{t('password.characters')}</li>
            <li>{t('password.uppercase')}</li>
            <li>{t('password.number')}</li>
          </ul>
        </div>

        {/* General Error Message */}
        {fieldErrors.general && (
          <div className="input-error">
            <AlertCircle size={14} />
            {fieldErrors.general}
          </div>
        )}

        {/* Reset Password Button */}
        <button
          type="submit"
          className={`btn-primary ${isLoading ? 'loading' : ''}`}
          disabled={isLoading || !uid || !token}
        >
          {isLoading ? <div className="loading-spinner" /> : t('passwordResetConfirm.confirmResetPassword')}
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
      </form>
    </div>
  );
}
