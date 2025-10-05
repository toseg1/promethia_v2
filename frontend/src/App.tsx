import React, { useState, useEffect, Suspense, lazy, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { AuthManager } from './components/auth/AuthManager';
import { LoadingState } from './components/ui/LoadingState';
import './i18n';

// Code splitting: Lazy load major components
const Dashboard = lazy(() => import('./components/Dashboard'));
const CalendarView = lazy(() => import('./components/CalendarView').then(module => ({ default: module.CalendarView })));
const Profile = lazy(() => import('./components/Profile').then(module => ({ default: module.Profile })));
const Metrics = lazy(() => import('./components/Metrics'));
const Analytics = lazy(() => import('./components/Analytics').then(module => ({ default: module.Analytics })));
import { EventModal } from './components/EventModal';
const Navigation = lazy(() => import('./components/Navigation').then(module => ({ default: module.Navigation })));
import { MobileNavigation } from './components/MobileNavigation';
const WorkInProgress = lazy(() => import('./components/WorkInProgress').then(module => ({ default: module.WorkInProgress })));
import { QueryDevtools } from './components/devtools/QueryDevtools';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from './components/ui/dropdown-menu';
import { User as UserIcon, Settings, LogOut, Users, RefreshCw, Languages } from 'lucide-react';
import { LanguageToggle } from './components/LanguageToggle';
import { useLanguage } from './contexts/LanguageContext';
import { User, AuthError, ViewType, TrainingEvent, SignupData } from './types';
import { NavigationOptions } from './components/dashboard/types';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { ModalErrorBoundary } from './components/error/ModalErrorBoundary';
import { NavigationErrorBoundary } from './components/error/NavigationErrorBoundary';
import { AsyncErrorHandler } from './components/error/AsyncErrorHandler';
import { AuthProvider, AppStateProvider, ModalStackProvider, LanguageProvider, useAuth, useAppState } from './contexts';
import { errorLogger } from './services/errorLogger';
import { eventService } from './services';
import { initializeSecuritySystems } from './utils/security';
import { queryClient, queryKeys, useOptimisticMutation } from './hooks';
import type { EventData } from './components/eventmodal/types';
import type { UpdateCalendarEventPayload } from './services/eventService';

// Suspense wrapper component for lazy-loaded routes
function SuspenseWrapper({ children, isPending }: { children: React.ReactNode; isPending?: boolean }) {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <LoadingState size="lg" />
      </div>
    }>
      <div className={isPending ? 'opacity-70 transition-opacity' : ''}>
        {children}
      </div>
    </Suspense>
  );
}

function AppContent() {
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS

  // Get auth state from Context API
  const {
    user,
    currentRole,
    authError,
    isInitializing,
    sessionStatus,
    currentView,
    setCurrentView,
    handleAuthSuccess,
    handleAuthError,
    handleLogin,
    handleSignup,
    handlePasswordReset,
    handlePasswordResetConfirm,
    handleLogout,
    handleRoleSwitch
  } = useAuth();

  // Use transition for smooth navigation between lazy-loaded components
  const [isPending, startTransition] = useTransition();

  // Navigation options state for passing filters and other options between views
  const [navigationOptions, setNavigationOptions] = useState<NavigationOptions | null>(null);

  // Translation hook
  const { t } = useTranslation(['common', 'auth', 'errors', 'soon']);

  // Get app state from Context API
  const {
    isMobile,
    setIsMobile,
    isEventModalOpen,
    editingEvent,
    handleAddEvent,
    handleCloseEventModal,
  } = useAppState();

  // Get language context
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();

  // Optimistic mutation for saving events from the global event modal
  const saveEventMutation = useOptimisticMutation({
    mutationFn: async (payload: any) => {
      if (payload.id) {
        return await eventService.updateCalendarEvent(payload as UpdateCalendarEventPayload);
      } else {
        const { id: _unusedId, ...createPayload } = payload;
        return await eventService.createCalendarEvent(createPayload);
      }
    },
    onSuccess: () => {
      handleCloseEventModal();
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Event saved successfully from App.tsx');
      }
    },
    onError: (error) => {
      errorLogger.logAsyncError(error, 'persistEvent');
      console.error('❌ Failed to save event from App.tsx:', error);
    },
    invalidateEntities: ['calendar', 'dashboard', 'training']
  });

  // Optimistic mutation for deleting events from the global event modal
  const deleteEventMutation = useOptimisticMutation({
    mutationFn: async ({ eventType, eventId }: { eventType: string; eventId: string }) => {
      return await eventService.deleteCalendarEvent(eventType as 'training' | 'race' | 'custom', eventId);
    },
    onSuccess: () => {
      handleCloseEventModal();
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Event deleted successfully from App.tsx');
      }
    },
    onError: (error) => {
      errorLogger.logAsyncError(error, 'deleteEvent');
      console.error('❌ Failed to delete event from App.tsx:', error);
    },
    invalidateEntities: ['calendar', 'dashboard', 'training']
  });

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile]);

  // Set user context for error logging
  useEffect(() => {
    if (user) {
      errorLogger.setUserContext(user.id, user.role, currentView);
      errorLogger.addBreadcrumb(`User logged in as ${user.role}`, 'navigation');
    }
  }, [user, currentView]);

  // Show loading screen while authentication is being initialized
  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <LoadingState size="lg" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">{t('errors:sessionRestore.title')}</h2>
            <p className="text-sm text-muted-foreground">
              {sessionStatus === 'error' ? t('errors:sessionRestore.retrying') : t('errors:sessionRestore.pleaseWait')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Wrap setCurrentView with startTransition to handle lazy component loading
  const handleViewChange = (view: ViewType, options?: NavigationOptions) => {
    startTransition(() => {
      setCurrentView(view);
      setNavigationOptions(options || null);
    });
  };

  // Handle async errors
  const handleAsyncError = (error: Error, context?: string) => {
    errorLogger.logAsyncError(error, context || 'Unknown async operation');
  };

  const persistEvent = async (event: EventData) => {
    const payload = {
      ...event,
      athlete: currentRole === 'coach' ? event.athlete : undefined,
    };

    // Use optimistic mutation for instant feedback
    await saveEventMutation.mutateAsync(payload);
  };

  const deleteEvent = async (event: EventData) => {
    if (!event.id || !event.type) {
      return;
    }

    // Use optimistic mutation for instant feedback
    await deleteEventMutation.mutateAsync({
      eventType: event.type,
      eventId: event.id
    });
  };

  // All authentication and app state functions now come from Context API
  // This eliminates prop drilling while maintaining exact same behavior

  // Authentication functions now handled in AuthContext
  // This reduces App.tsx complexity while maintaining identical behavior

  const renderCurrentView = () => {
    if (!user) return null;

    switch (currentView) {
      case 'dashboard':
        // Dashboard now handles both athlete and coach views internally
        return (
          <ErrorBoundary>
            <Dashboard user={{ ...user, role: currentRole }} onNavigate={handleViewChange} onAddEvent={handleAddEvent} />
          </ErrorBoundary>
        );
      case 'calendar':
        return (
          <ErrorBoundary>
            <SuspenseWrapper isPending={isPending}>
              <CalendarView 
                user={user} 
                userRole={currentRole} 
                onEditEvent={handleAddEvent}
                initialAthleteFilter={navigationOptions?.athleteFilter}
              />
            </SuspenseWrapper>
          </ErrorBoundary>
        );
      case 'metrics':
        return (
          <ErrorBoundary>
            <SuspenseWrapper isPending={isPending}>
              <Metrics user={user} onNavigate={handleViewChange} />
            </SuspenseWrapper>
          </ErrorBoundary>
        );
      case 'analytics':
        return (
          <ErrorBoundary>
            <SuspenseWrapper isPending={isPending}>
              <WorkInProgress 
                title="Analytics"
                description={t('soon:analyticsText')}
              />
            </SuspenseWrapper>
          </ErrorBoundary>
        );
      case 'profile':
        return (
          <ErrorBoundary>
            <SuspenseWrapper isPending={isPending}>
              <Profile user={user} currentRole={currentRole} onLogout={handleLogout} />
            </SuspenseWrapper>
          </ErrorBoundary>
        );
      case 'coach':
        return (
          <ErrorBoundary>
            <SuspenseWrapper isPending={isPending}>
              <WorkInProgress 
                title="My Promethia Coach"
                description={t('soon:coachText')}
              />
            </SuspenseWrapper>
          </ErrorBoundary>
        );
      case 'device-sync':
        return (
          <ErrorBoundary>
            <SuspenseWrapper isPending={isPending}>
              <WorkInProgress 
                title="Device Sync"
                description={t('soon:syncText')}
              />
            </SuspenseWrapper>
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary>
            <SuspenseWrapper isPending={isPending}>
              <Dashboard user={{ ...user, role: currentRole }} onNavigate={handleViewChange} />
            </SuspenseWrapper>
          </ErrorBoundary>
        );
    }
  };

  // If user is authenticated, show the main app
  if (user) {
    if (isMobile) {
      // Mobile Layout - iOS style
      return (
        <div className="min-h-screen bg-gray-50 text-foreground">
          {/* Mobile Header */}
          <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between">
                {/* Left side - empty for symmetry */}
                <div className="w-10"></div>
                
                {/* Center - App Title */}
                <h1 className="text-xl font-bold text-primary tracking-wider">
                  {t('common:appName')}
                </h1>
                
                {/* Right side - Profile Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 hover:bg-primary/20 transition-all duration-200 active:scale-95 border border-primary/20 cursor-pointer">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={8} className="w-48 mr-2">
                    <div className="px-2 py-1.5">
                      <div className="text-sm font-medium text-foreground">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {user.email}
                      </div>
                      <div className="flex items-center mt-1">
                        <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          currentRole === 'coach'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {currentRole === 'coach' ? t('auth:coachView') : t('auth:athleteView')}
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleViewChange('profile')}
                      className="cursor-pointer"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      {t('common:profile')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="cursor-pointer">
                        <Languages className="mr-2 h-4 w-4" />
                        {availableLanguages.find(lang => lang.code === currentLanguage)?.nativeName}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        {availableLanguages.map(lang => (
                          <DropdownMenuItem
                            key={lang.code}
                            onClick={() => changeLanguage(lang.code)}
                            className={`cursor-pointer ${currentLanguage === lang.code ? 'bg-primary/10 text-primary' : ''}`}
                          >
                            <span className="flex items-center justify-between w-full">
                              <span>{lang.nativeName}</span>
                              {currentLanguage === lang.code && (
                                <span className="text-xs ml-2">✓</span>
                              )}
                            </span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleRoleSwitch}
                      className="cursor-pointer"
                    >
                      {currentRole === 'coach' ? (
                        <>
                          <UserIcon className="mr-2 h-4 w-4" />
                          {t('auth:switchToAthlete')}
                        </>
                      ) : (
                        <>
                          <Users className="mr-2 h-4 w-4" />
                          {t('auth:switchToCoach')}
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      variant="destructive"
                      className="cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      {t('common:logout')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Mobile Content */}
          <main className="pb-24 min-h-[calc(100vh-60px)]">
            {renderCurrentView()}
          </main>

          {/* Mobile Bottom Navigation */}
          <NavigationErrorBoundary navigationType="mobile">
            <SuspenseWrapper isPending={isPending}>
              <MobileNavigation 
                currentView={currentView}
                onViewChange={handleViewChange}
                userRole={currentRole}
                onAddEvent={handleAddEvent}
              />
            </SuspenseWrapper>
          </NavigationErrorBoundary>

          {/* Event Modal for Mobile */}
          {isEventModalOpen && (
            <ModalErrorBoundary modalName="EventModal (Mobile)" onClose={handleCloseEventModal}>
              <EventModal
                isOpen={isEventModalOpen}
                onClose={() => {
                  if (!saveEventMutation.isLoading && !deleteEventMutation.isLoading) {
                    handleCloseEventModal();
                  }
                }}
                onSave={persistEvent}
                onDelete={deleteEvent}
                selectedDate={new Date()}
                userRole={currentRole}
                event={editingEvent}
              />
            </ModalErrorBoundary>
          )}
        </div>
      );
    }

    // Desktop Layout
    return (
      <div className="min-h-screen bg-background text-foreground">
        {/* Desktop Header */}
        <header className="bg-white border-b border-border/20 shadow-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold text-primary">
                  {t('common:appName')}
                </h1>
                <span className="text-sm text-muted-foreground">
                  {t('common:appSubtitle')}
                </span>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-sm text-foreground">
                  <span className="text-muted-foreground">{t('common:welcome')},</span>{' '}
                  <span className="font-medium">{user.firstName}</span>
                  <span className={`ml-2 text-xs px-2 py-1 rounded-full font-medium ${
                    currentRole === 'coach'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {currentRole === 'coach' ? t('common:coach') : t('common:athlete')}
                  </span>
                </div>
                <LanguageToggle />
                <button
                  onClick={handleRoleSwitch}
                  className="px-3 py-1.5 text-sm font-medium text-primary bg-primary/10 rounded-md hover:bg-primary/20 transition-colors flex items-center gap-2"
                >
                  {currentRole === 'coach' ? (
                    <>
                      <UserIcon size={16} />
                      {t('auth:switchToAthlete')}
                    </>
                  ) : (
                    <>
                      <Users size={16} />
                      {t('auth:switchToCoach')}
                    </>
                  )}
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-destructive-foreground bg-destructive rounded-md hover:bg-destructive/90 transition-colors"
                >
                  {t('common:logout')}
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex h-[calc(100vh-4rem)]">
          {/* Desktop Navigation Sidebar */}
          <NavigationErrorBoundary navigationType="desktop">
            <SuspenseWrapper isPending={isPending}>
              <Navigation 
                currentView={currentView}
                onViewChange={handleViewChange}
                userRole={currentRole}
              />
            </SuspenseWrapper>
          </NavigationErrorBoundary>

          {/* Desktop Main Content */}
          <main className="flex-1 overflow-y-auto bg-muted/30">
            {renderCurrentView()}
          </main>
        </div>

        {/* Event Modal for Desktop */}
        {isEventModalOpen && (
          <ModalErrorBoundary modalName="EventModal (Desktop)" onClose={handleCloseEventModal}>
            <EventModal
              isOpen={isEventModalOpen}
              onClose={() => {
                if (!saveEventMutation.isLoading && !deleteEventMutation.isLoading) {
                  handleCloseEventModal();
                }
              }}
              onSave={persistEvent}
              onDelete={deleteEvent}
              selectedDate={new Date()}
              userRole={currentRole}
              event={editingEvent}
            />
          </ModalErrorBoundary>
        )}
      </div>
    );
  }

  // Show authentication forms
  return (
    <ErrorBoundary>
      <AuthManager
        onAuthSuccess={handleAuthSuccess}
        onAuthError={handleAuthError}
        onLogin={handleLogin}
        onSignup={handleSignup}
        onPasswordReset={handlePasswordReset}
        onPasswordResetConfirm={handlePasswordResetConfirm}
        authError={authError}
      />
    </ErrorBoundary>
  );
}

// Custom error class for authentication errors
class AuthError extends Error {
  field?: string;
  
  constructor(message: string, field?: string) {
    super(message);
    this.name = 'AuthError';
    this.field = field;
  }
}

// Main App component with Context providers and enhanced error handling
export default function App() {
  // Initialize security systems on app load
  useEffect(() => {
    initializeSecuritySystems();
  }, []);
  
  return (
    <ErrorBoundary>
      <AsyncErrorHandler onError={(error, context) => {
        errorLogger.logAsyncError(error, context || 'App level async error');
      }}>
        <LanguageProvider>
          <AuthProvider>
            <AppStateProvider>
              <ModalStackProvider>
                <AppContent />
                {/* Query Devtools - only renders in development */}
                <QueryDevtools />
              </ModalStackProvider>
            </AppStateProvider>
          </AuthProvider>
        </LanguageProvider>
      </AsyncErrorHandler>
    </ErrorBoundary>
  );
}
