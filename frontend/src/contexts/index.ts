// Context API exports
export { AuthProvider, useAuth } from './AuthContext';
export { AppStateProvider, useAppState } from './AppStateProvider';
export { ModalStackProvider, useModalStack } from './ModalStackContext';
export { LanguageProvider, useLanguage } from './LanguageContext';
export { BackendWakeupProvider, useBackendWakeup } from './BackendWakeupContext';

// Re-export types for convenience
export type { User, AuthError, SignupData, TrainingEvent } from '../types';
