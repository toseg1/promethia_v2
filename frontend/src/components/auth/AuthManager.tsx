import React, { useState, useEffect } from 'react';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import { PasswordResetForm } from './PasswordResetForm';
import { PasswordResetConfirmForm } from './PasswordResetConfirmForm';
import { User, SignupData, AuthError } from '../../types';

interface AuthManagerProps {
  onAuthSuccess: (user: User) => void;
  onAuthError?: (error: AuthError) => void;
  onLogin?: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  onSignup?: (userData: SignupData) => Promise<void>;
  onPasswordReset?: (email: string) => Promise<void>;
  onPasswordResetConfirm?: (token: string, password: string) => Promise<void>;
  authError?: AuthError | null;
}

type AuthView = 'login' | 'signup' | 'reset' | 'reset-confirm';

export function AuthManager({
  onAuthSuccess,
  onAuthError,
  onLogin,
  onSignup,
  onPasswordReset,
  onPasswordResetConfirm,
  authError
}: AuthManagerProps) {
  const [currentView, setCurrentView] = useState<AuthView>('login');
  const [resetToken, setResetToken] = useState<{ uid: string; token: string } | null>(null);

  // Check URL for password reset token on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pathParts = window.location.pathname.split('/');

    // Check for /reset-password/:uid/:token pattern
    if (pathParts[1] === 'reset-password' && pathParts[2] && pathParts[3]) {
      setResetToken({ uid: pathParts[2], token: pathParts[3] });
      setCurrentView('reset-confirm');
    }
  }, []);

  // Default mock functions if not provided
  const defaultLogin = async (username: string, password: string, rememberMe: boolean): Promise<void> => {
    // Simple mock authentication
    if (username && password) {
      const mockUser: User = {
        id: '1',
        username: username,
        firstName: username.charAt(0).toUpperCase() + username.slice(1),
        lastName: 'User',
        email: `${username}@example.com`,
        phone: '+33123456789',
        countryCode: 'FR',
        role: 'athlete'
      };
      onAuthSuccess(mockUser);
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const defaultSignup = async (userData: SignupData): Promise<void> => {
    // Simple mock signup
    const mockUser: User = {
      id: Date.now().toString(),
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      phone: userData.phone,
      countryCode: userData.countryCode,
      role: userData.role
    };
    onAuthSuccess(mockUser);
  };

  const defaultPasswordReset = async (email: string): Promise<void> => {
    // Mock password reset - just log it
    console.log('Password reset requested for:', email);
  };

  const defaultPasswordResetConfirm = async (token: string, password: string): Promise<void> => {
    // Mock password reset confirm - just log it
    console.log('Password reset confirmed with token:', token);
  };

  const handleLogin = onLogin || defaultLogin;
  const handleSignup = onSignup || defaultSignup;
  const handlePasswordReset = onPasswordReset || defaultPasswordReset;
  const handlePasswordResetConfirm = onPasswordResetConfirm || defaultPasswordResetConfirm;

  const handleSwitchToSignup = () => {
    setCurrentView('signup');
  };

  const handleSwitchToLogin = () => {
    if (typeof window !== 'undefined') {
      const basePath = import.meta.env.BASE_URL || '/';
      if (window.location.pathname.includes('reset-password')) {
        window.history.replaceState({}, '', basePath);
      }
    }
    setCurrentView('login');
    setResetToken(null);
  };

  const handleSwitchToPasswordReset = () => {
    setCurrentView('reset');
  };

  const renderAuthView = () => {
    switch (currentView) {
      case 'signup':
        return (
          <SignupForm
            onSwitchToLogin={handleSwitchToLogin}
            onSignup={handleSignup}
          />
        );
      case 'reset':
        return (
          <PasswordResetForm
            onSwitchToLogin={handleSwitchToLogin}
            onSwitchToSignup={handleSwitchToSignup}
            onPasswordReset={handlePasswordReset}
          />
        );
      case 'reset-confirm':
        return resetToken ? (
          <PasswordResetConfirmForm
            uid={resetToken.uid}
            token={resetToken.token}
            onSwitchToLogin={handleSwitchToLogin}
            onResetConfirm={handlePasswordResetConfirm}
          />
        ) : null;
      case 'login':
      default:
        return (
          <LoginForm
            onSwitchToSignup={handleSwitchToSignup}
            onSwitchToPasswordReset={handleSwitchToPasswordReset}
            onLogin={handleLogin}
          />
        );
    }
  };

  return (
    <div className="auth-body">
      <div className="auth-container">
        {renderAuthView()}
      </div>
    </div>
  );
}
