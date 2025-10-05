import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AtSign, UserCircle, Users, ChevronRight, ArrowLeft, Mail, ChevronDown, Lock, Info, AlertCircle } from 'lucide-react';
import { ProgressSteps } from './ProgressSteps';
import { PhoneInput } from './PhoneInput';
import {
  validateUsername,
  validateEmail,
  validateName,
  validatePassword,
  sanitizeText,
  sanitizeHTML,
  validateFormData,
  RateLimiter
} from '../../utils/validation';

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSignup: (userData: SignupData) => void;
}

interface SignupData {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  role: string;
  password: string;
  confirmPassword: string;
}

interface FieldErrors {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  role?: string;
  password?: string;
  confirmPassword?: string;
  privacy?: string;
}

export function SignupForm({ onSwitchToLogin, onSignup }: SignupFormProps) {
  const { t } = useTranslation(['auth', 'common', 'validation']);

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);

  // Rate limiting for signup attempts
  const [rateLimiter] = useState(() => new RateLimiter(3, 30 * 60 * 1000)); // 3 attempts per 30 minutes

  // Form data - Default to France
  const [formData, setFormData] = useState<SignupData>({
    username: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    countryCode: 'FR', // Default to France
    role: '',
    password: '',
    confirmPassword: ''
  });

  const steps = [t('steps.info'), t('steps.account'), t('steps.security')];
  const totalSteps = steps.length;

  const roles = [
    { value: 'athlete', label: t('roles.athlete') },
    { value: 'coach', label: t('roles.coach') }
  ];

  const updateFormData = (field: keyof SignupData, value: string) => {
    // Sanitize input based on field type
    let sanitizedValue = value;
    
    switch (field) {
      case 'username':
        sanitizedValue = sanitizeText(value, 30).toLowerCase();
        break;
      case 'firstName':
      case 'lastName':
        sanitizedValue = sanitizeText(value, 50);
        break;
      case 'email':
        sanitizedValue = sanitizeText(value, 254).toLowerCase();
        break;
      default:
        sanitizedValue = sanitizeText(value);
        break;
    }
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    // Clear field-specific error when user types
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handlePhoneChange = (phone: string, countryCode: string) => {
    setFormData(prev => ({ ...prev, phone, countryCode }));
    // Clear phone error when user types
    if (fieldErrors.phone) {
      setFieldErrors(prev => ({ ...prev, phone: undefined }));
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Basic validation - most phone numbers are between 7-15 digits
    if (cleanPhone.length < 7) {
      setFieldErrors(prev => ({ ...prev, phone: t('errors.phoneNumberTooShort') }));
      return false;
    }

    if (cleanPhone.length > 15) {
      setFieldErrors(prev => ({ ...prev, phone: t('errors.phoneNumberTooLong') }));
      return false;
    }
    
    return true;
  };

  const validateStep = (step: number): boolean => {
    const errors: FieldErrors = {};
    let isValid = true;

    switch (step) {
      case 1:
        // Username validation
        const usernameResult = validateUsername(formData.username);
        if (!usernameResult.isValid) {
          errors.username = usernameResult.error;
          isValid = false;
        }
        
        // First name validation
        const firstNameResult = validateName(formData.firstName, t('common:firstName'));
        if (!firstNameResult.isValid) {
          errors.firstName = firstNameResult.error;
          isValid = false;
        }
        
        // Last name validation
        const lastNameResult = validateName(formData.lastName, t('common:lastName'));
        if (!lastNameResult.isValid) {
          errors.lastName = lastNameResult.error;
          isValid = false;
        }
        break;

      case 2:
        // Email validation
        const emailResult = validateEmail(formData.email);
        if (!emailResult.isValid) {
          errors.email = emailResult.error;
          isValid = false;
        }
        
        // Phone validation using existing validatePhoneNumber
        if (!formData.phone.trim()) {
          errors.phone = t('validation:phone.required');
          isValid = false;
        } else if (!validatePhoneNumber(formData.phone)) {
          // validatePhoneNumber already sets the error
          isValid = false;
        }
        
        if (!formData.role) {
          errors.role = t('errors.selectRole');
          isValid = false;
        }
        break;

      case 3:
        // Password validation with comprehensive security checks
        const passwordResult = validatePassword(formData.password);
        if (!passwordResult.isValid) {
          errors.password = passwordResult.errors[0]; // Show first error for cleaner UI
          isValid = false;
        }

        if (!formData.confirmPassword) {
          errors.confirmPassword = t('errors.confirmPassword');
          isValid = false;
        } else if (formData.password !== formData.confirmPassword) {
          errors.confirmPassword = t('errors.passwordsDoNotMatch');
          isValid = false;
        }

        if (!acceptedPrivacy) {
          errors.privacy = t('errors.acceptPrivacy');
          isValid = false;
        }
        break;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setFieldErrors({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('HandleSubmit called - currentStep:', currentStep, 'totalSteps:', totalSteps);
    
    // Only submit on final step, otherwise just move to next step
    if (currentStep < totalSteps) {
      console.log('Not on final step, moving to next step');
      handleNext();
      return;
    }

    console.log('On final step, proceeding with account creation');

    // Check rate limiting first
    const clientIP = 'signup_user'; // In a real app, this would be the user's IP
    if (!rateLimiter.isAllowed(clientIP)) {
      const remaining = rateLimiter.getRemainingAttempts(clientIP);
      setFieldErrors({ 
        privacy: t('errors.tooManyAttempts', { remaining })
      });
      return;
    }
    
    if (!validateStep(currentStep)) {
      return;
    }

    setIsLoading(true);
    
    try {
      // Final comprehensive validation using the validation utility
      const validationResult = validateFormData(formData, {
        username: { type: 'username', required: true, label: t('common:username') },
        firstName: { type: 'name', required: true, label: t('common:firstName') },
        lastName: { type: 'name', required: true, label: t('common:lastName') },
        email: { type: 'email', required: true, label: t('common:email') },
        password: { type: 'password', required: true, label: t('common:password') }
      });
      
      if (!validationResult.isValid) {
        const newErrors: FieldErrors = {};
        validationResult.errors.forEach(error => {
          newErrors[error.field as keyof FieldErrors] = error.message;
        });
        setFieldErrors(newErrors);
        return;
      }
      
      // Use sanitized data for submission
      const sanitizedFormData = {
        ...validationResult.sanitizedData,
        phone: formData.phone, // Keep original phone (already validated)
        countryCode: formData.countryCode,
        role: formData.role,
        confirmPassword: formData.confirmPassword // Keep original (not sent to server)
      };
      
      console.log('Attempting signup with data:', sanitizedFormData);
      await onSignup(sanitizedFormData);
      console.log('Signup successful!');
    } catch (error: any) {
      console.error('Signup failed:', error);
      
      // Handle AuthError with field-specific validation errors
      if (error && typeof error === 'object' && error.type === 'signup') {
        if (error.field) {
          // Set error on specific field
          setFieldErrors({ [error.field]: error.message });
        } else {
          // General signup error
          setFieldErrors({ privacy: error.message || t('errors.signupFailed') });
        }
      } else {
        // Unknown error
        setFieldErrors({ privacy: t('errors.signupFailed') });
      }
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <>
            <h2 className="auth-title" style={{ fontSize: '24px', marginBottom: '8px' }}>{t('personalInfo.title')}</h2>
            <p className="auth-subtitle">{t('personalInfo.subtitle')}</p>

            <div className="input-field">
              <input
                type="text"
                placeholder={t('fields.username')}
                value={formData.username}
                onChange={(e) => updateFormData('username', e.target.value)}
                required
                autoComplete="username"
                className={fieldErrors.username ? 'error' : ''}
              />
              <AtSign className="input-icon" size={20} />
              {renderFieldError('username')}
            </div>

            <div className="input-field">
              <input
                type="text"
                placeholder={t('fields.firstName')}
                value={formData.firstName}
                onChange={(e) => updateFormData('firstName', e.target.value)}
                required
                autoComplete="given-name"
                className={fieldErrors.firstName ? 'error' : ''}
              />
              <UserCircle className="input-icon" size={20} />
              {renderFieldError('firstName')}
            </div>

            <div className="input-field">
              <input
                type="text"
                placeholder={t('fields.lastName')}
                value={formData.lastName}
                onChange={(e) => updateFormData('lastName', e.target.value)}
                required
                autoComplete="family-name"
                className={fieldErrors.lastName ? 'error' : ''}
              />
              <Users className="input-icon" size={20} />
              {renderFieldError('lastName')}
            </div>
          </>
        );

      case 2:
        return (
          <>
            <h2 className="auth-title" style={{ fontSize: '24px', marginBottom: '8px' }}>{t('accountDetails.title')}</h2>

            <div className="input-field">
              <input
                type="email"
                placeholder={t('fields.email')}
                value={formData.email}
                onChange={(e) => updateFormData('email', e.target.value)}
                required
                autoComplete="email"
                className={fieldErrors.email ? 'error' : ''}
                style={{ height: '48px' }}
              />
              <Mail className="input-icon" size={20} />
              {renderFieldError('email')}
            </div>

            <PhoneInput
              value={formData.phone}
              countryCode={formData.countryCode}
              onChange={handlePhoneChange}
              placeholder={t('fields.phone')}
              error={fieldErrors.phone}
            />

            {/* Role Selection - matching email input style */}
            <div className="input-field">
              <div className="flex gap-3">
                {roles.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => updateFormData('role', role.value)}
                    className={`flex-1 flex items-center justify-center gap-2 transition-all duration-300 ${
                      formData.role === role.value ? 'selected' : ''
                    }`}
                    style={{
                      background: formData.role === role.value ? 'rgba(255, 255, 255, 0.15)' : 'var(--glass-bg-strong)',
                      backdropFilter: 'var(--backdrop-blur)',
                      WebkitBackdropFilter: 'var(--backdrop-blur)',
                      border: formData.role === role.value ? '2px solid rgba(255, 255, 255, 0.8)' : '1px solid var(--glass-border)',
                      borderRadius: 'var(--md-sys-shape-corner-medium)',
                      padding: 'var(--md-sys-spacing-4) var(--md-sys-spacing-5)',
                      font: 'var(--md-sys-typescale-body-large)',
                      color: formData.role === role.value ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
                      opacity: formData.role === role.value ? 1 : 0.8,
                      height: '48px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      if (formData.role !== role.value) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (formData.role !== role.value) {
                        e.currentTarget.style.borderColor = 'var(--glass-border)';
                        e.currentTarget.style.background = 'var(--glass-bg-strong)';
                      }
                    }}
                  >
                    {role.value === 'athlete' ? (
                      <UserCircle size={18} />
                    ) : (
                      <Users size={18} />
                    )}
                    {role.label}
                  </button>
                ))}
              </div>
              {renderFieldError('role')}
            </div>

            <p 
              className="auth-subtitle" 
              style={{ 
                marginBottom: '0px',
                marginTop: '8px',
                fontSize: '14px',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Info size={16} style={{ color: 'rgba(255, 255, 255, 0.7)', flexShrink: 0 }} />
              {t('accountDetails.roleSubtitle')}
            </p>
          </>
        );

      case 3:
        return (
          <>
            <h2 className="auth-title" style={{ fontSize: '24px', marginBottom: '8px' }}>{t('securityDetails.title')}</h2>
            <p className="auth-subtitle">{t('securityDetails.subtitle')}</p>

            <div className="input-field">
              <input
                type="password"
                placeholder={t('fields.password')}
                value={formData.password}
                onChange={(e) => updateFormData('password', e.target.value)}
                required
                autoComplete="new-password"
                className={fieldErrors.password ? 'error' : ''}
                style={{ height: '48px' }}
              />
              <Lock className="input-icon" size={20} />
              {renderFieldError('password')}
            </div>

            <div className="input-field">
              <input
                type="password"
                placeholder={t('fields.confirmPassword')}
                value={formData.confirmPassword}
                onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                required
                autoComplete="new-password"
                className={fieldErrors.confirmPassword ? 'error' : ''}
                style={{ height: '48px' }}
              />
              <Lock className="input-icon" size={20} />
              {renderFieldError('confirmPassword')}
            </div>

            <div className="checkbox-field">
              <input
                type="checkbox"
                id="privacyPolicy"
                checked={acceptedPrivacy}
                onChange={(e) => {
                  setAcceptedPrivacy(e.target.checked);
                  if (fieldErrors.privacy) {
                    setFieldErrors(prev => ({ ...prev, privacy: undefined }));
                  }
                }}
              />
              <label htmlFor="privacyPolicy">
                {t('privacy.agreement')}{' '}
                <a
                  href="/privacy-policy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'white', textDecoration: 'underline' }}
                >
                  {t('privacy.policyLink')}
                </a>
              </label>
            </div>
            {renderFieldError('privacy')}
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="auth-card">
      {/* Header */}
      <h1 className="auth-title">{t('common:appName')}</h1>
      <p className="auth-subtitle">
        {t('signupMessage')}
      </p>

      {/* Progress Steps */}
      <ProgressSteps 
        currentStep={currentStep} 
        totalSteps={totalSteps}
        steps={steps}
      />

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="auth-form">
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: 'var(--md-sys-spacing-3)'
        }}>
          {/* Back Button - Show after first step */}
          {currentStep > 1 && (
            <button
              type="button"
              onClick={handleBack}
              className="btn-secondary"
              style={{ flex: '1' }}
            >
              <ArrowLeft size={18} />
              {t('common:back')}
            </button>
          )}

          {/* Next/Submit Button */}
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="btn-primary"
              style={{ flex: currentStep === 1 ? '1' : '1' }}
            >
              {t('common:next')}
              <ChevronRight size={18} />
            </button>
          ) : (
            <button
              type="submit"
              className={`btn-primary ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
              style={{ flex: '1' }}
            >
              {isLoading ? <div className="loading-spinner" /> : t('register')}
            </button>
          )}
        </div>

        {/* Sign In Link */}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="auth-link"
        >
          {t('alreadyHaveAccount')}
        </button>
      </form>
    </div>
  );
}
