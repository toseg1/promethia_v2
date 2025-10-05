import React, { useState, useEffect } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { ProfileHeader } from './ProfileHeader';
import { PersonalInfoForm } from './PersonalInfoForm';
import { PerformanceMetrics } from './PerformanceMetrics';
import { ProfessionalDetails } from './ProfessionalDetails';
import { CoachDetailsModal } from './CoachDetailsModal';
import { ProfileActions } from './ProfileActions';
import { useUserProfile, useUserStats } from '../../hooks';
import { SkeletonProfile, LoadingOverlay } from '../ui/SkeletonLoader';
import { Achievement, ProfessionalDetails as ProfessionalDetailsType } from './types';
import { useProfileData } from './hooks/useProfileData';
import { useProfileActions } from './hooks/useProfileActions';
import { 
  User as UserType, 
  ProfileData, 
  PerformanceMetrics as PerformanceMetricsType,
  ProfessionalDetails as ProfessionalDetailsType,
  CoachInfo,
  Certification,
} from './types';

interface ProfileContainerProps {
  user: UserType;
  currentRole: string;
  onLogout?: () => void;
}

export function ProfileContainer({ user, currentRole, onLogout }: ProfileContainerProps) {
  // Local user state to handle avatar updates
  const [localUser, setLocalUser] = useState<UserType>(user);
  
  // Use hooks for data fetching with loading states
  const { data: profileApiData, loading: profileLoading } = useUserProfile(user.id);
  const { data: statsData, loading: statsLoading } = useUserStats(user.id);

  // Handle user updates (like avatar changes)
  const handleUserUpdate = (updatedFields: Partial<UserType>) => {
    setLocalUser(prev => ({ ...prev, ...updatedFields }));
  };
  
  // Custom hooks for data management and actions
  const {
    profileData,
    metrics,
    professionalDetails,
    coaches,
    myCoachCode,
    hasChanges,
    updateProfileData,
    updateMetric,
    setProfessionalDetails,
    setCoaches,
  } = useProfileData(user, currentRole);

  // Debug: Log professional details whenever they change
  useEffect(() => {
    console.log('=== PROFILE CONTAINER ===');
    console.log('Professional details from useProfileData:', professionalDetails);
    console.log('Has changes:', hasChanges);
  }, [professionalDetails, hasChanges]);
  
  // Additional state for coach management
  const [newCoachCode, setNewCoachCode] = useState('');
  const [coachCodeError, setCoachCodeError] = useState('');

  // Additional state for professional details modal management
  const [isProfessionalModalOpen, setIsProfessionalModalOpen] = useState(false);
  const [isCustomCertificationExpanded, setIsCustomCertificationExpanded] = useState(false);
  const [isOfficialCertificationsExpanded, setIsOfficialCertificationsExpanded] = useState(false);
  const [expandedSportCertifications, setExpandedSportCertifications] = useState<string | null>(null);
  const [isAchievementsExpanded, setIsAchievementsExpanded] = useState(false);
  const [customCertification, setCustomCertification] = useState({
    id: '',
    sport: '',
    title: '',
    issuer: '',
    year: new Date().getFullYear().toString(),
    isCustom: true
  });

  // Achievement state
  const [customAchievement, setCustomAchievement] = useState({
    id: '',
    title: '',
    category: 'Race Achievement', // Use backend-aligned default category
    year: new Date().getFullYear().toString(),
    description: ''
  });

  // Delete account dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Performance metrics editing state
  const [activeMetric, setActiveMetric] = useState<string | null>(null);

  // Draft state for professional details to prevent auto-save
  const [draftProfessionalDetails, setDraftProfessionalDetails] = useState(professionalDetails);

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
      console.log('Initialized draft professional details:', professionalDetails);
    }
  }, [professionalDetails]);

  const {
    isCodeCopied,
    showCoachModal,
    selectedCoach,
    achievementCategories: backendAchievementCategories,
    certificationSports,
    handleSave,
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
  } = useProfileActions({
    profileData,
    metrics,
    coaches,
    myCoachCode,
    setProfessionalDetails,
    setCoaches,
  });

  // Additional handlers for professional details
  const handleAddCustomCertification = () => {
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
  };

  // Wrapper for official certification addition
  const handleAddOfficialCertification = (sport: string, title: string) => {
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
  };

  // Delete account handlers
  const handleDeleteAccount = () => {
    // In a real app, this would call an API to delete the account
    console.log('Account deletion requested');
    
    // For demo purposes, show alert
    alert('Account deletion would be processed here. In a real app, this would permanently delete the user account.');
    
    setIsDeleteDialogOpen(false);
  };

  const handleCancelDelete = () => {
    setIsDeleteDialogOpen(false);
  };

  // Professional details save handler (save to backend and apply to state)
  const handleSaveProfessionalDetailsToBackend = async () => {
    try {
      // Save to backend using the hook's method
      await handleSaveProfessionalDetails(draftProfessionalDetails, currentRole);
      
      // Apply all draft changes to the actual state only after successful backend save
      setProfessionalDetails(draftProfessionalDetails);
      
      // Close the modal after successful save
      setIsProfessionalModalOpen(false);
    } catch (error) {
      console.error('Failed to save professional details:', error);
      // Error is already handled in the hook with alert
    }
  };

  // Draft-aware achievement handlers (for modal editing)
  const handleDraftUpdateAchievement = (id: string, field: keyof Achievement, value: string) => {
    setDraftProfessionalDetails(prev => ({
      ...prev,
      achievements: prev.achievements.map(achievement =>
        achievement.id === id ? { ...achievement, [field]: value } : achievement
      )
    }));
  };

  const handleDraftAddAchievement = () => {
    const newAchievement = {
      id: crypto.randomUUID(),
      title: '',
      category: backendAchievementCategories[0], // Use backend-aligned categories
      year: new Date().getFullYear().toString(),
      description: ''
    };

    setDraftProfessionalDetails(prev => ({
      ...prev,
      achievements: [...prev.achievements, newAchievement]
    }));
  };

  const handleDraftRemoveAchievement = (id: string) => {
    setDraftProfessionalDetails(prev => ({
      ...prev,
      achievements: prev.achievements.filter(achievement => achievement.id !== id)
    }));
  };

  // Draft-aware certification handlers
  const handleDraftAddCertification = async () => {
    if (customCertification.title && customCertification.sport) {
      try {
        // Save directly to backend using profileService
        const certificationData = {
          sport: customCertification.sport,
          title: customCertification.title,
          issuer: customCertification.issuer,
          year: customCertification.year
        };
        
        console.log('Saving custom certification:', certificationData);
        await handleSaveCertification(certificationData);
        
        // Add to draft state for UI purposes (without isCustom since it's saved)
        const newCertification = {
          ...customCertification,
          id: crypto.randomUUID(),
          isCustom: false // Mark as saved
        };

        setDraftProfessionalDetails(prev => ({
          ...prev,
          certifications: [...prev.certifications, newCertification]
        }));

        // Reset form
        setCustomCertification({
          id: '',
          sport: '',
          title: '',
          issuer: '',
          year: new Date().getFullYear().toString(),
          isCustom: true
        });
        
        setIsCustomCertificationExpanded(false);
      } catch (error) {
        console.error('Failed to save certification:', error);
      }
    }
  };

  const handleDraftAddOfficialCertification = async (certification: any) => {
    try {
      // Save directly to backend using profileService
      const certificationData = {
        sport: certification.sport,
        title: certification.title,
        issuer: certification.issuer || 'Official Certification',
        year: certification.year || new Date().getFullYear().toString()
      };
      
      console.log('Saving official certification:', certificationData);
      await handleSaveCertification(certificationData);
      
      // Add to draft state for UI purposes
      const newCertification = {
        ...certification,
        id: crypto.randomUUID(),
        isCustom: false
      };

      setDraftProfessionalDetails(prev => ({
        ...prev,
        certifications: [...prev.certifications, newCertification]
      }));
    } catch (error) {
      console.error('Failed to save official certification:', error);
    }
  };

  const handleDraftUpdateCertification = (id: string, field: string, value: string) => {
    setDraftProfessionalDetails(prev => ({
      ...prev,
      certifications: prev.certifications.map(cert =>
        cert.id === id ? { ...cert, [field]: value } : cert
      )
    }));
  };

  const handleDraftRemoveCertification = (id: string) => {
    setDraftProfessionalDetails(prev => ({
      ...prev,
      certifications: prev.certifications.filter(cert => cert.id !== id)
    }));
  };

  // Draft-aware professional details handler with auto-save
  const handleDraftUpdateProfessionalDetails = (field: keyof ProfessionalDetailsType, value: unknown) => {
    console.log(`Updating ${field}:`, value);
    
    setDraftProfessionalDetails(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Auto-save individual fields with debounce
    if (field === 'yearsExperience' && typeof value === 'string' && value.trim() !== '') {
      console.log('Scheduling auto-save for years of experience:', value);
      // Debounce the save after 1 second of no changes
      const timeoutId = setTimeout(async () => {
        try {
          console.log('Auto-saving years of experience:', value.trim());
          await handleSaveYearsExperience(value.trim(), currentRole);
          console.log('Years of experience auto-saved successfully');
        } catch (error) {
          console.error('Auto-save failed for years of experience:', error);
        }
      }, 1000);
      
      // Store timeout ID for potential cleanup (you might want to implement cleanup logic)
      return () => clearTimeout(timeoutId);
    }
    
    if (field === 'about' && typeof value === 'string' && value.trim() !== '') {
      console.log('Scheduling auto-save for about section:', value.substring(0, 50) + '...');
      // Debounce the save after 2 seconds for longer text fields
      const timeoutId = setTimeout(async () => {
        try {
          console.log('Auto-saving about section');
          await handleSaveAbout(value.trim(), currentRole);
          console.log('About section auto-saved successfully');
        } catch (error) {
          console.error('Auto-save failed for about section:', error);
        }
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  };

  // Draft-aware custom achievement handler
  const handleDraftAddCustomAchievement = async () => {
    if (customAchievement.title && customAchievement.title.trim()) {
      try {
        // Save directly to backend using profileService
        const achievementData = {
          title: customAchievement.title,
          category: customAchievement.category,
          year: customAchievement.year,
          description: customAchievement.description
        };
        
        console.log('Saving custom achievement:', achievementData);
        await handleSaveAchievement(achievementData);
        
        // Add to draft state for UI purposes
        const newAchievement = {
          ...customAchievement,
          id: crypto.randomUUID(),
        };

        setDraftProfessionalDetails(prev => ({
          ...prev,
          achievements: [...prev.achievements, newAchievement]
        }));

        // Reset form
        setCustomAchievement({
          id: '',
          title: '',
          category: backendAchievementCategories[0], // Use backend-aligned categories
          year: new Date().getFullYear().toString(),
          description: ''
        });
        
        // Close the collapsible after adding
        setIsAchievementsExpanded(false);
      } catch (error) {
        console.error('Failed to save achievement:', error);
      }
    }
  };

  // Constants for ProfessionalDetails (aligned with backend)
  const sports = certificationSports; // Use backend-aligned sports from hook
  const officialCertifications = {
    'Running': ['USATF Level 1', 'USATF Level 2', 'RRCA Certified Coach'],
    'Cycling': ['USA Cycling Level 1', 'USA Cycling Level 2', 'USA Cycling Level 3'],
    'Swimming': ['USA Swimming Coach', 'ASCA Level 1', 'ASCA Level 2', 'ASCA Level 3'],
    'Triathlon': ['USA Triathlon Level I', 'USA Triathlon Level II', 'IRONMAN Certified Coach'],
    'Other': ['Custom Certification']
  };
  const achievementCategories = backendAchievementCategories; // Use backend-aligned categories from hook

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Profile</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your personal information and performance metrics
          </p>
        </div>
        
        {/* Save Changes Button - Only show when there are changes */}
        {hasChanges && (
          <ProfileActions onSave={handleSave} />
        )}
      </div>

      <LoadingOverlay 
        loading={profileLoading}
        skeleton={<SkeletonProfile />}
      >
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
            onRemoveCoach={handleRemoveCoach}
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
          {/* Delete Account */}
          <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex-1 pr-4">
                <h3 className="font-semibold text-foreground mb-2">Delete Account</h3>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setIsDeleteDialogOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors flex-shrink-0"
              >
                <Trash2 size={16} />
                <span className="text-sm font-medium" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                  Delete Account
                </span>
              </button>
            </div>
          </div>

          {/* Privacy Policy Link */}
          <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                By using Promethia, you agree to our terms of service and acknowledge our commitment to your privacy.
              </p>
              <a
                href="https://promethia.com/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors underline underline-offset-2"
              >
                View Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </LoadingOverlay>

      {/* Delete Account Confirmation Dialog */}
      {isDeleteDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground">Delete Account</h3>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Are you absolutely sure you want to delete your account? This will permanently delete your profile, training data, and all associated information. This action cannot be undone.
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
              >
                Yes, Delete Account
              </button>
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                Cancel
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