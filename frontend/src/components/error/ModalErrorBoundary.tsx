import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { FormErrorFallback } from './FormErrorFallback';
import { ErrorFallbackProps } from '../../types';
import { errorLogger } from '../../services/errorLogger';

interface ModalErrorBoundaryProps {
  children: ReactNode;
  modalName: string;
  onClose?: () => void;
}

/**
 * Modal-specific Error Boundary
 * 
 * Provides error handling specifically designed for modal components.
 * Shows appropriate fallback UI and allows users to close the modal
 * on error while maintaining the exact same user experience.
 */
export function ModalErrorBoundary({ children, modalName, onClose }: ModalErrorBoundaryProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log the modal error with context
    errorLogger.logComponentError(error, modalName, {
      componentName: modalName,
      modalType: 'dialog',
      timestamp: new Date().toISOString()
    });
  };

  const ModalErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
    return (
      <FormErrorFallback
        error={error}
        resetErrorBoundary={resetErrorBoundary}
        onClose={onClose}
        formName={modalName}
      />
    );
  };

  return (
    <ErrorBoundary 
      fallback={ModalErrorFallback}
      onError={handleError}
    >
      {children}
    </ErrorBoundary>
  );
}