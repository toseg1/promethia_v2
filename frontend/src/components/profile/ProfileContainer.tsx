import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProfileHeader } from './ProfileHeader';
import { PersonalInfoForm } from './PersonalInfoForm';
import { PerformanceMetrics } from './PerformanceMetrics';
import { ProfessionalDetails } from './ProfessionalDetails';
import { CoachDetailsModal } from './CoachDetailsModal';
import { ProfileActions } from './ProfileActions';
import { useUserProfile, useUserStats } from '../../hooks';
import { SkeletonProfile, LoadingOverlay } from '../ui/SkeletonLoader';
import { Achievement, CoachInfo } from './types';
import { useProfileData } from './hooks/useProfileData';
import { useProfileActions } from './hooks/useProfileActions';
import { debounce } from '../../utils/debounce';
import { toast } from 'sonner';
import { DeleteConfirmation } from '../ui/DeleteConfirmation';
import { 
  User as UserType, 
  ProfessionalDetails as ProfessionalDetailsType,
} from './types';

interface ProfileContainerProps {
  user: UserType;
  currentRole: string;
  onLogout?: () => void;
}

export function ProfileContainer({ user, currentRole, onLogout }: ProfileContainerProps) {
  const { t } = useTranslation('profile');

  // Local user state to handle avatar updates
  const [localUser, setLocalUser] = useState<UserType>(user);

  // Use hooks for data fetching with loading states
  const { data: profileApiData, loading: profileLoading } = useUserProfile(user.id);
  const { data: statsData, loading: statsLoading } = useUserStats(user.id);

  // Handle user updates (like avatar changes)
  const handleUserUpdate = useCallback((updatedFields: Partial<UserType>) => {
    setLocalUser(prev => ({ ...prev, ...updatedFields }));
  }, []);
  
  // Custom hooks for data management and actions with optimized loading
  const {
    profileData,
    metrics,
    professionalDetails,
    coaches,
    myCoachCode,
    hasChanges,
    isLoading,
    loadingStates,
    error,
    dataLoadedAt,
    updateProfileData,
    updateMetric,
    setProfessionalDetails,
    setCoaches,
    setOriginalData,
    setOriginalMetrics,
    athleticProfileId,
    professionalProfileId,
    setAthleticProfileId,
    setProfessionalProfileId,
  } = useProfileData(user, currentRole);

  // Additional state for professional details modal management
  const [isProfessionalModalOpen, setIsProfessionalModalOpen] = useState(false);
  const [isCustomCertificationExpanded, setIsCustomCertificationExpanded] = useState(false);
  const [isOfficialCertificationsExpanded, setIsOfficialCertificationsExpanded] = useState(false);
  const [expandedSportCertifications, setExpandedSportCertifications] = useState<string | null>(null);
  const [isAchievementsExpanded, setIsAchievementsExpanded] = useState(false);
  const [customCertification, setCustomCertification] = useState({
    id: '',
    sport: 'Running', // Default, will be updated after hooks initialize
    title: '',
    issuer: '',
    year: new Date().getFullYear().toString(),
    isCustom: true
  });

  // Achievement state
  const [customAchievement, setCustomAchievement] = useState({
    id: '',
    title: '',
    category: 'Race Achievement',
    year: new Date().getFullYear().toString(),
    description: ''
  });

  // Delete account dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [coachToRemove, setCoachToRemove] = useState<CoachInfo | null>(null);
  const [showRemoveCoachConfirm, setShowRemoveCoachConfirm] = useState(false);
  const [isRemovingCoach, setIsRemovingCoach] = useState(false);

  // Performance metrics editing state
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  // Draft state for professional details to prevent auto-save conflicts
  const [draftProfessionalDetails, setDraftProfessionalDetails] = useState(professionalDetails);

  // Cleanup refs for debounced functions
  const debouncedSaveRefs = useRef<{ [key: string]: ReturnType<typeof debounce> }>({});
  
  // Cleanup debounced functions on unmount
  useEffect(() => {
    return () => {
      Object.values(debouncedSaveRefs.current).forEach(debouncedFn => {
        if (debouncedFn?.cancel) {
          debouncedFn.cancel();
        }
      });
    };
  }, []);

  // Sync draft state when modal opens or professional details change
  useEffect(() => {
    if (isProfessionalModalOpen) {
      setDraftProfessionalDetails(professionalDetails);
    }
  }, [isProfessionalModalOpen, professionalDetails]);

  // Initialize draft state when professionalDetails is loaded for the first time
  useEffect(() => {
    if (professionalDetails && Object.keys(professionalDetails).length > 0) {
      setDraftProfessionalDetails(professionalDetails);
    }
  }, [professionalDetails]);

  const {
    isCodeCopied,
    showCoachModal,
    selectedCoach,
    achievementCategories: backendAchievementCategories,
    certificationSports,
    handleSave: originalHandleSave,
    handleSaveProfessionalDetails,
    handleSaveYearsExperience,
    handleSaveAbout,
    handleSaveSportsInvolved,
    handleCopyCoachCode,
    handleViewCoachDetails,
    handleCloseCoachModal,
    handleAddCoach,
    handleRemoveCoach,
    handleAddCertification,
    handleSaveCertification,
    handleUpdateCertification,
    handleRemoveCertification,
    handleAddAchievement,
    handleSaveAchievement,
    handleUpdateAchievement,
    handleRemoveAchievement,
    handleToggleSport,
    newCoachCode,
    setNewCoachCode,
    coachCodeError,
    setCoachCodeError,
  } = useProfileActions({
    userId: user.id,
    currentRole,
    profileData,
    metrics,
    coaches,
    myCoachCode,
    setProfessionalDetails,
    setCoaches,
    setOriginalData,
    setOriginalMetrics,
    athleticProfileId,
    professionalProfileId,
    setAthleticProfileId,
    setProfessionalProfileId,
  });

  // Wrap handleSave to close active metric after save
  const handleSave = useCallback(async () => {
    await originalHandleSave();
    setActiveMetric(null);
  }, [originalHandleSave]);

  // Update customCertification sport when certificationSports becomes available
  useEffect(() => {
    if (certificationSports && certificationSports.length > 0 && customCertification.sport === 'Running') {
      setCustomCertification(prev => ({
        ...prev,
        sport: certificationSports[0]
      }));
    }
  }, [certificationSports, customCertification.sport]);

  const handlePromptRemoveCoach = useCallback((coach: CoachInfo) => {
    setCoachToRemove(coach);
    setShowRemoveCoachConfirm(true);
  }, []);

  const handleCancelRemoveCoach = useCallback(() => {
    if (isRemovingCoach) {
      return;
    }
    setShowRemoveCoachConfirm(false);
    setCoachToRemove(null);
  }, [isRemovingCoach]);

  const handleConfirmRemoveCoach = useCallback(async () => {
    if (!coachToRemove || isRemovingCoach) {
      return;
    }

    try {
      setIsRemovingCoach(true);
      await handleRemoveCoach(coachToRemove);
    } catch (error) {
      console.error('Failed to disconnect coach:', error);
    } finally {
      setIsRemovingCoach(false);
      setShowRemoveCoachConfirm(false);
      setCoachToRemove(null);
    }
  }, [coachToRemove, handleRemoveCoach, isRemovingCoach]);

  // Optimized auto-save with proper debouncing
  const createDebouncedSave = useCallback((field: string, saveFunction: Function, delay: number = 1000) => {
    if (!debouncedSaveRefs.current[field]) {
      debouncedSaveRefs.current[field] = debounce(async (value: any) => {
        try {
          await saveFunction(value, currentRole);
          toast.success(`${field.charAt(0).toUpperCase() + field.slice(1)} saved successfully!`);
        } catch (error) {
          console.error(`Auto-save failed for ${field}:`, error);
          toast.error(`Failed to save ${field}. Please try again.`);
        }
      }, delay);
    }
    return debouncedSaveRefs.current[field];
  }, [currentRole, handleSaveYearsExperience, handleSaveAbout]);
  
  // Draft-aware professional details handler with optimized auto-save
  const handleDraftUpdateProfessionalDetails = useCallback((field: keyof ProfessionalDetailsType, value: unknown) => {
    setDraftProfessionalDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-save individual fields with proper debouncing
    if (field === 'yearsExperience' && typeof value === 'string' && value.trim() !== '') {
      const debouncedSave = createDebouncedSave('yearsExperience', handleSaveYearsExperience, 1000);
      debouncedSave(value.trim());
    }
    
    if (field === 'about' && typeof value === 'string' && value.trim() !== '') {
      const debouncedSave = createDebouncedSave('about', handleSaveAbout, 2000);
      debouncedSave(value.trim());
    }
  }, [createDebouncedSave, handleSaveYearsExperience, handleSaveAbout]);

  // Additional handlers for professional details
  const handleAddCustomCertification = useCallback(() => {
    if (customCertification.title && customCertification.sport) {
      handleAddCertification();
      setCustomCertification({
        id: '',
        sport: '',
        title: '',
        issuer: '',
        year: new Date().getFullYear().toString(),
        isCustom: true
      });
      setIsCustomCertificationExpanded(false);
    }
  }, [customCertification, handleAddCertification]);

  // Wrapper for official certification addition
  const handleAddOfficialCertification = useCallback((sport: string, title: string) => {
    const newCertification: Certification = {
      id: Date.now().toString(),
      sport,
      title,
      issuer: 'Official Certification',
      year: new Date().getFullYear().toString(),
      isCustom: false
    };
    
    setProfessionalDetails(prev => ({
      ...prev,
      certifications: [...prev.certifications, newCertification]
    }));
  }, [setProfessionalDetails]);

  // Delete account handlers
  const handleDeleteAccount = useCallback(() => {
    toast.info('Account deletion would be processed here. In a real app, this would permanently delete the user account.');
    setIsDeleteDialogOpen(false);
  }, []);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteDialogOpen(false);
  }, []);

  // Professional details save handler (save to backend and apply to state)
  const handleSaveProfessionalDetailsToBackend = useCallback(async () => {
    try {
      await handleSaveProfessionalDetails(draftProfessionalDetails, currentRole);
      
      // Update the main professional details state (from useProfileData)
      setProfessionalDetails(draftProfessionalDetails);
      
      // Close the modal after successful save
      setIsProfessionalModalOpen(false);
      
      // Show success message
      toast.success('Athletic profile updated successfully!');
    } catch (error) {
      console.error('Failed to save professional details:', error);
      toast.error('Failed to save changes. Please try again.');
    }
  }, [draftProfessionalDetails, currentRole, handleSaveProfessionalDetails, setProfessionalDetails]);

  // Draft-aware achievement handlers (for modal editing)
  const handleDraftUpdateAchievement = useCallback((id: string, field: keyof Achievement, value: string) => {
    setDraftProfessionalDetails(prev => ({
      ...prev,
      achievements: prev.achievements.map(achievement =>
        achievement.id === id ? { ...achievement, [field]: value } : achievement
      )
    }));
  }, []);

  const handleDraftAddAchievement = useCallback(() => {
    const newAchievement = {
      id: crypto.randomUUID(),
      title: '',
      category: backendAchievementCategories[0],
      year: new Date().getFullYear().toString(),
      description: ''
    };

    setDraftProfessionalDetails(prev => ({
      ...prev,
      achievements: [...prev.achievements, newAchievement]
    }));
  }, [backendAchievementCategories]);

  const handleDraftRemoveAchievement = useCallback(async (id: string) => {
    try {
      // If it's a real achievement from backend, delete it
      if (!id.startsWith('temp-') && !id.startsWith('achievement-')) {
        await handleRemoveAchievement(id, currentRole);
      }
      
      // Update both draft and main state
      setDraftProfessionalDetails(prev => ({
        ...prev,
        achievements: prev.achievements.filter(achievement => achievement.id !== id)
      }));
      
      setProfessionalDetails(prev => ({
        ...prev,
        achievements: prev.achievements.filter(achievement => achievement.id !== id)
      }));
      
      toast.success('Achievement removed successfully!');
    } catch (error) {
      console.error('Failed to remove achievement:', error);
      toast.error('Failed to remove achievement. Please try again.');
    }
  }, [handleRemoveAchievement, currentRole, setProfessionalDetails]);

  // Draft-aware certification handlers
  const handleDraftAddCertification = useCallback(async () => {
    console.log('🎯 handleDraftAddCertification - Starting with data:', customCertification);
    
    // Enhanced validation
    if (!customCertification.title?.trim()) {
      console.warn('⚠️ Certification validation failed: Missing title');
      toast.error('Certification title is required');
      return;
    }
    
    if (!customCertification.sport?.trim()) {
      console.warn('⚠️ Certification validation failed: Missing sport');
      toast.error('Sport selection is required');
      return;
    }

    try {
      console.log('💾 Attempting to save certification with payload:', {
        id: customCertification.id || `temp-cert-${Date.now()}`,
        sport: customCertification.sport,
        title: customCertification.title.trim(),
        issuer: customCertification.issuer?.trim() || 'Custom Certification',
        year: customCertification.year || new Date().getFullYear().toString(),
        isCustom: customCertification.isCustom,
      });

      const savedCertification = await handleSaveCertification({
        id: customCertification.id || `temp-cert-${Date.now()}`,
        sport: customCertification.sport,
        title: customCertification.title.trim(),
        issuer: customCertification.issuer?.trim() || 'Custom Certification',
        year: customCertification.year || new Date().getFullYear().toString(),
        isCustom: customCertification.isCustom,
      });

      console.log('✅ Certification saved successfully:', savedCertification);

      setDraftProfessionalDetails(prev => ({
        ...prev,
        certifications: [
          ...prev.certifications.filter(cert => cert.id !== savedCertification.id),
          savedCertification,
        ],
      }));

      setProfessionalDetails(prev => ({
        ...prev,
        certifications: [
          ...prev.certifications.filter(cert => cert.id !== savedCertification.id),
          savedCertification,
        ],
      }));

      setCustomCertification({
        id: '',
        sport: certificationSports?.[0] || 'Running',
        title: '',
        issuer: '',
        year: new Date().getFullYear().toString(),
        isCustom: true
      });
      
      setIsCustomCertificationExpanded(false);
      toast.success('Certification added successfully!');
    } catch (error) {
      console.error('❌ Detailed certification save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save certification: ${errorMessage}`);
    }
  }, [customCertification, handleSaveCertification, setProfessionalDetails, certificationSports]);

  const handleDraftAddOfficialCertification = useCallback(async (certification: any) => {
    try {
      const savedCertification = await handleSaveCertification({
        id: certification.id || `temp-cert-${Date.now()}`,
        sport: certification.sport,
        title: certification.title,
        issuer: certification.issuer || 'Official Certification',
        year: certification.year || new Date().getFullYear().toString(),
        isCustom: false,
      });

      setDraftProfessionalDetails(prev => ({
        ...prev,
        certifications: [
          ...prev.certifications.filter(cert => cert.id !== savedCertification.id),
          savedCertification,
        ],
      }));

      setProfessionalDetails(prev => ({
        ...prev,
        certifications: [
          ...prev.certifications.filter(cert => cert.id !== savedCertification.id),
          savedCertification,
        ],
      }));
    } catch (error) {
      console.error('Failed to save official certification:', error);
    }
  }, [handleSaveCertification, setProfessionalDetails]);

  const handleDraftUpdateCertification = useCallback((id: string, field: string, value: string) => {
    setDraftProfessionalDetails(prev => ({
      ...prev,
      certifications: prev.certifications.map(cert =>
        cert.id === id ? { ...cert, [field]: value } : cert
      )
    }));
  }, []);

  const handleDraftRemoveCertification = useCallback(async (id: string) => {
    const removed = await handleRemoveCertification(id);
    if (!removed) {
      return;
    }

    setDraftProfessionalDetails(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert.id !== id)
    }));
  }, [handleRemoveCertification]);

  // Draft-aware custom achievement handler
  const handleDraftAddCustomAchievement = useCallback(async () => {
    console.log('🏆 handleDraftAddCustomAchievement - Starting with data:', customAchievement);
    
    // Enhanced validation
    if (!customAchievement.title?.trim()) {
      console.warn('⚠️ Achievement validation failed: Missing title');
      toast.error('Achievement title is required');
      return;
    }
    
    if (!customAchievement.category?.trim()) {
      console.warn('⚠️ Achievement validation failed: Missing category');
      toast.error('Achievement category is required');
      return;
    }

    try {
      const achievementPayload = {
        id: customAchievement.id || `temp-achievement-${Date.now()}`,
        title: customAchievement.title.trim(),
        category: customAchievement.category,
        year: customAchievement.year || new Date().getFullYear().toString(),
        description: customAchievement.description?.trim() || '',
      };

      console.log('💾 Attempting to save achievement with payload:', achievementPayload);
      console.log('🔄 Current role for achievement save:', currentRole);

      const savedAchievement = await handleSaveAchievement(achievementPayload);

      console.log('✅ Achievement saved successfully:', savedAchievement);

      setDraftProfessionalDetails(prev => ({
        ...prev,
        achievements: [
          ...prev.achievements.filter(item => item.id !== savedAchievement.id),
          savedAchievement,
        ],
      }));

      setProfessionalDetails(prev => ({
        ...prev,
        achievements: [
          ...prev.achievements.filter(item => item.id !== savedAchievement.id),
          savedAchievement,
        ],
      }));

      setCustomAchievement({
        id: '',
        title: '',
        category: backendAchievementCategories[0] || 'Race Achievement',
        year: new Date().getFullYear().toString(),
        description: ''
      });
      
      setIsAchievementsExpanded(false);
      toast.success('Achievement added successfully!');
    } catch (error) {
      console.error('❌ Detailed achievement save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save achievement: ${errorMessage}`);
    }
  }, [customAchievement, handleSaveAchievement, backendAchievementCategories, setProfessionalDetails, currentRole]);

  // Constants for ProfessionalDetails (aligned with backend)
  const sports = certificationSports;
  const officialCertifications = {
    'Running': ['USATF Level 1', 'USATF Level 2', 'RRCA Certified Coach'],
    'Cycling': ['USA Cycling Level 1', 'USA Cycling Level 2', 'USA Cycling Level 3'],
    'Swimming': ['USA Swimming Coach', 'ASCA Level 1', 'ASCA Level 2', 'ASCA Level 3'],
    'Triathlon': ['USA Triathlon Level I', 'USA Triathlon Level II', 'IRONMAN Certified Coach'],
    'Other': ['Custom Certification']
  };
  const achievementCategories = backendAchievementCategories;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">{t('title')}</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        
        {/* Save Changes Button - Only show when there are changes */}
        {hasChanges && (
          <ProfileActions 
            onSave={handleSave} 
            hasChanges={hasChanges}
            isLoading={isLoading}
          />
        )}
      </div>

      <LoadingOverlay 
        loading={isLoading || profileLoading}
        skeleton={<SkeletonProfile />}
      >
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive font-medium">Error loading profile data:</p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-2 text-sm text-destructive underline hover:no-underline"
            >
              Retry loading
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:gap-6">
          {/* Profile Header */}
          <ProfileHeader 
            user={profileApiData || localUser} 
            currentRole={currentRole} 
            onUserUpdate={handleUserUpdate}
          />

          {/* Personal Information Form */}
          <PersonalInfoForm
            user={profileApiData || user}
            currentRole={currentRole}
            profileData={profileData}
            onUpdateProfileData={updateProfileData}
            myCoachCode={myCoachCode}
            isCodeCopied={isCodeCopied}
            onCopyCoachCode={handleCopyCoachCode}
            coaches={coaches}
            onAddCoach={(code) => handleAddCoach(code, newCoachCode, setNewCoachCode, setCoachCodeError)}
            onRemoveCoach={handlePromptRemoveCoach}
            onViewCoachDetails={handleViewCoachDetails}
            newCoachCode={newCoachCode}
            coachCodeError={coachCodeError}
            onNewCoachCodeChange={setNewCoachCode}
          />

          {/* Performance Metrics */}
          <PerformanceMetrics
            metrics={metrics}
            activeMetric={activeMetric}
            onSetActiveMetric={setActiveMetric}
            onUpdateMetric={updateMetric}
          />

          {/* Professional Details */}
          {loadingStates.professional ? (
            <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-2/10 rounded-lg animate-pulse">
                    <div className="w-5 h-5 bg-chart-2/30 rounded"></div>
                  </div>
                  <div>
                    <div className="h-6 bg-gray-200 rounded w-48 mb-2 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-64 animate-pulse"></div>
                  </div>
                </div>
                <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="h-20 bg-gray-100 rounded animate-pulse"></div>
            </div>
          ) : (
            <ProfessionalDetails
            currentRole={currentRole}
            professionalDetails={isProfessionalModalOpen ? draftProfessionalDetails : professionalDetails}
            originalProfessionalDetails={professionalDetails}
            onUpdateProfessionalDetails={handleDraftUpdateProfessionalDetails}
            isProfessionalModalOpen={isProfessionalModalOpen}
            onSetIsProfessionalModalOpen={setIsProfessionalModalOpen}
            onSaveProfessionalDetails={handleSaveProfessionalDetailsToBackend}
            isCustomCertificationExpanded={isCustomCertificationExpanded}
            onSetIsCustomCertificationExpanded={setIsCustomCertificationExpanded}
            isOfficialCertificationsExpanded={isOfficialCertificationsExpanded}
            onSetIsOfficialCertificationsExpanded={setIsOfficialCertificationsExpanded}
            expandedSportCertifications={expandedSportCertifications}
            onSetExpandedSportCertifications={setExpandedSportCertifications}
            customCertification={customCertification}
            onSetCustomCertification={setCustomCertification}
            onAddCustomCertification={handleDraftAddCertification}
            onAddCertification={handleDraftAddOfficialCertification}
            onSaveCertification={handleSaveCertification}
            onUpdateCertification={handleDraftUpdateCertification}
            onRemoveCertification={handleDraftRemoveCertification}
            isAchievementsExpanded={isAchievementsExpanded}
            onSetIsAchievementsExpanded={setIsAchievementsExpanded}
            customAchievement={customAchievement}
            onSetCustomAchievement={setCustomAchievement}
            onAddCustomAchievement={handleDraftAddCustomAchievement}
            onSaveAchievement={handleSaveAchievement}
            onRemoveAchievement={handleDraftRemoveAchievement}
            onToggleSport={handleToggleSport}
            sports={sports}
            officialCertifications={officialCertifications}
            achievementCategories={achievementCategories}
          />
          )}
          
          {/* Delete Account */}
          <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-foreground mb-2">{t('accountDeletion.title')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('accountDeletion.description')}
                </p>
              </div>
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex-shrink-0"
              >
                <Trash2 size={16} />
                <span className="text-sm font-medium" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                  {t('accountDeletion.button')}
                </span>
              </button>
            </div>
          </div>

          {/* Privacy Policy Link */}
          <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {t('privacyPolicy')}
              </p>
              <a
                href="/privacy-policy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
              >
               {t('viewPrivacy')}
              </a>
            </div>
          </div>
        </div>
      </LoadingOverlay>

      <DeleteConfirmation
        open={showRemoveCoachConfirm && Boolean(coachToRemove)}
        title="Disconnect coach?"
        description={coachToRemove
          ? `Disconnecting ${coachToRemove.firstName} ${coachToRemove.lastName} will revoke their access to your training data.`
          : 'Disconnecting this coach will revoke their access to your training data.'}
        onCancel={handleCancelRemoveCoach}
        onConfirm={handleConfirmRemoveCoach}
        confirmLabel={isRemovingCoach ? 'Disconnecting…' : 'Disconnect Coach'}
        cancelLabel="Keep Coach"
        confirming={isRemovingCoach}
      />

      {/* Delete Account Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">{t('accountDeletion.title')}</h3>
            </div>

            <p className="text-sm text-muted-foreground mb-6">
              {t('accountDeletion.description')}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                {t('accountDeletion.confirmButton')}
              </button>
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                {t('accountDeletion.cancelButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Coach Details Modal */}
      <CoachDetailsModal
        isCoachModalOpen={showCoachModal}
        selectedCoach={selectedCoach}
        onCloseCoachModal={handleCloseCoachModal}
      />
    </div>
  );
}
