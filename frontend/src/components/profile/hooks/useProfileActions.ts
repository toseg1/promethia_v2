import { useState } from 'react';
import { toast } from 'sonner';
import { profileService, AchievementPayload, CertificationPayload } from '../../../services/profileService';
import { userService } from '../../../services/userService';
import { queryClient } from '../../../hooks/useQuery';
import type { ProfileAchievement, ProfileCertification } from '../../../services/adapters';
import {
  ProfileData,
  PerformanceMetrics as PerformanceMetricsType,
  ProfessionalDetails as ProfessionalDetailsType,
  CoachInfo,
  Certification,
  Achievement,
} from '../types';
import { logger } from '../../../utils/logger';

interface UseProfileActionsProps {
  userId: string;
  currentRole: string;
  profileData: ProfileData;
  metrics: PerformanceMetricsType;
  coaches: CoachInfo[];
  myCoachCode: string;
  setProfessionalDetails: React.Dispatch<React.SetStateAction<ProfessionalDetailsType>>;
  setCoaches: React.Dispatch<React.SetStateAction<CoachInfo[]>>;
  setOriginalData: React.Dispatch<React.SetStateAction<ProfileData>>;
  setOriginalMetrics: React.Dispatch<React.SetStateAction<PerformanceMetricsType>>;
  athleticProfileId: string | null;
  professionalProfileId: string | null;
  setAthleticProfileId: React.Dispatch<React.SetStateAction<string | null>>;
  setProfessionalProfileId: React.Dispatch<React.SetStateAction<string | null>>;
}

const achievementCategories = [
  'Race Achievement',
  'Personal Record',
  'Competition Results',
  'Training Milestone',
  'Other',
];

const certificationSports = ['Running', 'Cycling', 'Swimming', 'Triathlon', 'Other'];

const isPositiveIntegerString = (value?: string | null): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    return false;
  }

  return Number(trimmed) > 0;
};

function mapAchievementResponseToUi(data: ProfileAchievement): Achievement {
  return {
    id: data.id,
    title: data.title,
    description: data.description ?? '',
    year: data.year !== undefined ? String(data.year) : '',
    category: data.category ?? 'Other',
  };
}

function mapCertificationResponseToUi(data: ProfileCertification): Certification {
  return {
    id: data.id,
    sport: data.sport ?? 'Other',
    title: data.title,
    issuer: data.issuingOrganization ?? '',
    year: data.year !== undefined ? String(data.year) : '',
    isCustom: false,
  };
}

export function useProfileActions({
  userId,
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
}: UseProfileActionsProps) {
  const [isCodeCopied, setIsCodeCopied] = useState(false);
  const [showCoachModal, setShowCoachModal] = useState(false);
  const [selectedCoach, setSelectedCoach] = useState<CoachInfo | null>(null);
  const [newCoachCode, setNewCoachCode] = useState('');
  const [coachCodeError, setCoachCodeError] = useState('');

  const ensureAthleticProfileId = async (): Promise<string> => {
    if (isPositiveIntegerString(athleticProfileId)) {
      return athleticProfileId;
    }

    const summary = await profileService.upsertAthleticProfile(userId, null, {});
    const nextId = isPositiveIntegerString(summary.id) ? summary.id : null;
    setAthleticProfileId(nextId);

    if (!nextId) {
      throw new Error('Unable to create athletic profile.');
    }

    return nextId;
  };

  const ensureProfessionalProfileId = async (): Promise<string> => {
    logger.debug('🔍 ensureProfessionalProfileId - Current professionalProfileId:', professionalProfileId);
    
    if (isPositiveIntegerString(professionalProfileId)) {
      logger.debug('✅ Using existing professional profile ID:', professionalProfileId);
      return professionalProfileId;
    }

    logger.debug('🔄 Creating new professional profile for user:', userId);
    try {
      const summary = await profileService.upsertProfessionalProfile(userId, null, {});
      logger.debug('📋 Professional profile upsert response:', summary);
      
      const nextId = isPositiveIntegerString(summary.id) ? summary.id : null;
      setProfessionalProfileId(nextId);

      if (!nextId) {
        logger.error('❌ Failed to create professional profile - invalid ID:', summary);
        throw new Error('Unable to create professional profile.');
      }

      logger.debug('✅ Created professional profile with ID:', nextId);
      return nextId;
    } catch (error) {
      logger.error('❌ Error creating professional profile:', error);
      throw error;
    }
  };

  const refreshCoaches = async () => {
    try {
      const bundle = await profileService.getProfile();
      const updatedCoaches = bundle.coachingSummary.coaches.map(coach => ({
        id: coach.id,
        firstName: coach.firstName || coach.fullName?.split(' ')[0] || coach.username || 'Coach',
        lastName: coach.lastName || coach.fullName?.split(' ').slice(1).join(' ') || '',
        email: coach.email ?? '',
        phone: coach.phone ?? '',
        specialty: 'Coach',
        yearsExperience: 0,
        certifications: [],
        coachCode: '',
        bio: undefined,
        location: undefined,
        joinedDate: undefined,
        totalAthletes: undefined,
        achievements: [],
        avatarUrl: coach.profileImage ?? undefined,
      }));
      setCoaches(updatedCoaches);
    } catch (error) {
      logger.error('Failed to refresh coaches list:', error);
    }
  };

  const handleSave = async () => {
    try {
      await profileService.updateProfile(userId, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        countryCode: profileData.countryCode,
        dateOfBirth: profileData.dateOfBirth || undefined,
      });

      await profileService.updatePerformanceMetrics(userId, metrics);

      setOriginalData(profileData);
      setOriginalMetrics(metrics);

      toast.success('Profile updated successfully!');
    } catch (error) {
      logger.error('Failed to save profile:', error);
      const message = error instanceof Error ? error.message : 'Failed to save profile';
      toast.error(`Error saving profile: ${message}`);
    }
  };

  const handleCopyCoachCode = async () => {
    try {
      await navigator.clipboard.writeText(myCoachCode);
      setIsCodeCopied(true);
      setTimeout(() => setIsCodeCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy coach code. Please try selecting and copying manually.');
    }
  };

  const handleViewCoachDetails = (coach: CoachInfo) => {
    setSelectedCoach(coach);
    setShowCoachModal(true);
  };

  const handleCloseCoachModal = () => {
    setShowCoachModal(false);
    setSelectedCoach(null);
  };

  const handleAddCoach = async (
    _code: string,
    currentNewCoachCode: string,
    setNewCoachCodeState: (value: string) => void,
    setCoachCodeErrorState: (value: string) => void,
  ) => {
    if (!currentNewCoachCode.trim()) {
      setCoachCodeErrorState('Please enter a coach code');
      return;
    }

    try {
      await userService.connectToCoach(userId, currentNewCoachCode.trim());
      await refreshCoaches();
      setNewCoachCodeState('');
      setCoachCodeErrorState('');
      toast.success('Coach connected successfully!');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to connect to coach';
      setCoachCodeErrorState(message);
    }
  };

  const handleRemoveCoach = async (coach: CoachInfo) => {
    try {
      await userService.removeCoachAssignment({ coachId: coach.id });

      // Update local state immediately for better UX
      setCoaches(prev => prev.filter((current) => current.id !== coach.id));
      toast.success(`${coach.firstName} ${coach.lastName} has been disconnected.`);

      // Invalidate cache to ensure fresh data on next fetch
      queryClient.invalidateQueries(['athlete', 'coaches', userId]);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to disconnect coach';
      logger.error('Error removing coach:', error);
      toast.error(message);

      // Refresh coaches list to ensure UI is in sync with backend
      try {
        await refreshCoaches();
      } catch (refreshError) {
        logger.error('Failed to refresh coaches after error:', refreshError);
      }

      throw error;
    }
  };

  const handleAddCertification = () => {
    const newCertification: Certification = {
      id: `temp-cert-${Date.now()}`,
      sport: certificationSports[0],
      title: '',
      issuer: '',
      year: new Date().getFullYear().toString(),
      isCustom: true,
    };

    setProfessionalDetails(prev => ({
      ...prev,
      certifications: [...prev.certifications, newCertification],
    }));
  };

  const handleSaveCertification = async (certification: Certification): Promise<Certification> => {
    logger.debug('🎓 handleSaveCertification - Starting with certification:', certification);
    
    try {
      if (!certification.title || !certification.issuer || !certification.sport) {
        logger.error('❌ Certification validation failed - missing required fields:', {
          title: certification.title,
          issuer: certification.issuer,
          sport: certification.sport
        });
        toast.error('Please fill in all required fields for the certification');
        throw new Error('Missing certification fields');
      }

      logger.debug('🔄 Getting professional profile ID...');
      const profileId = await ensureProfessionalProfileId();
      logger.debug('✅ Professional profile ID obtained:', profileId);
      
      const payload: CertificationPayload = {
        sport: certification.sport,
        title: certification.title,
        issuer: certification.issuer,
        year: certification.year,
      };

      logger.debug('📋 Certification payload prepared:', payload);

      let saved;
      if (!certification.isCustom && certification.id && !certification.id.startsWith('temp-')) {
        logger.debug('🔄 Updating existing certification with ID:', certification.id);
        saved = await profileService.updateCertification(certification.id, payload);
      } else {
        logger.debug('🔄 Creating new certification with profile ID:', profileId);
        saved = await profileService.createCertification(profileId, payload);
      }

      logger.debug('📥 Raw certification response from backend:', saved);

      const normalized = mapCertificationResponseToUi(saved);
      const normalizedCertification = {
        ...normalized,
        isCustom: certification.isCustom ?? normalized.isCustom,
      };

      logger.debug('🔄 Normalized certification for UI:', normalizedCertification);

      setProfessionalDetails(prev => ({
        ...prev,
        certifications: [...prev.certifications.filter(cert => cert.id !== certification.id), normalizedCertification],
      }));

      logger.debug('✅ Certification saved and state updated successfully');
      toast.success('Certification saved successfully!');
      return normalizedCertification;
    } catch (error) {
      logger.error('❌ handleSaveCertification - Detailed error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save certification: ${errorMessage}`);
      throw error;
    }
  };

  const handleUpdateCertification = (id: string, field: keyof Certification, value: string | boolean) => {
    setProfessionalDetails(prev => ({
      ...prev,
      certifications: prev.certifications.map(cert =>
        cert.id === id ? { ...cert, [field]: value } : cert,
      ),
    }));
  };

  const handleRemoveCertification = async (id: string): Promise<boolean> => {
    logger.debug('🗑️ handleRemoveCertification - Starting deletion for ID:', id);
    
    try {
      // Delete from backend first (linked to Professional Profile)
      if (!id.startsWith('temp-')) {
        logger.debug('🔄 Deleting certification from backend (linked to Professional Profile)');
        await profileService.deleteCertification(id);
        logger.debug('✅ Backend deletion successful for certification ID:', id);
      } else {
        logger.debug('⚠️ Skipping backend deletion for temporary certification ID:', id);
      }
      
      // Remove from local state after successful backend deletion
      setProfessionalDetails(prev => ({
        ...prev,
        certifications: prev.certifications.filter(cert => cert.id !== id),
      }));
      
      logger.debug('✅ Certification removed from UI state successfully');
      toast.success('Certification deleted successfully!');
      return true;
    } catch (error) {
      logger.error('❌ handleRemoveCertification - Detailed error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to delete certification: ${errorMessage}`);
      return false;
    }
  };

  const handleAddAchievement = () => {
    const newAchievement: Achievement = {
      id: `temp-achievement-${Date.now()}`,
      title: '',
      description: '',
      year: new Date().getFullYear().toString(),
      category: achievementCategories[0],
    };

    setProfessionalDetails(prev => ({
      ...prev,
      achievements: [...prev.achievements, newAchievement],
    }));
  };

  const handleSaveAchievement = async (achievement: Achievement, roleOverride?: string): Promise<Achievement> => {
    logger.debug('🏆 handleSaveAchievement - Starting with achievement:', achievement);
    
    try {
      if (!achievement.title || !achievement.category) {
        logger.error('❌ Achievement validation failed - missing required fields:', {
          title: achievement.title,
          category: achievement.category
        });
        toast.error('Please fill in all required fields for the achievement');
        throw new Error('Missing achievement fields');
      }

      const role = roleOverride ?? currentRole;
      logger.debug('🔄 Using role for achievement save:', role);
      
      const payload: AchievementPayload = {
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        year: achievement.year,
      };

      logger.debug('📋 Achievement payload prepared:', payload);

      let saved;
      if (role === 'coach') {
        logger.debug('🔄 Processing as coach achievement...');
        const profileId = await ensureProfessionalProfileId();
        logger.debug('✅ Professional profile ID obtained for coach:', profileId);
        
        if (achievement.id && !achievement.id.startsWith('temp-')) {
          logger.debug('🔄 Updating existing coach achievement with ID:', achievement.id);
          saved = await profileService.updateCoachAchievement(achievement.id, payload);
        } else {
          logger.debug('🔄 Creating new coach achievement with profile ID:', profileId);
          saved = await profileService.createCoachAchievement(profileId, payload);
        }
      } else {
        logger.debug('🔄 Processing as athlete achievement...');
        const profileId = await ensureAthleticProfileId();
        logger.debug('✅ Athletic profile ID obtained for athlete:', profileId);
        
        if (achievement.id && !achievement.id.startsWith('temp-')) {
          logger.debug('🔄 Updating existing athlete achievement with ID:', achievement.id);
          saved = await profileService.updateAchievement(achievement.id, payload);
        } else {
          logger.debug('🔄 Creating new athlete achievement with profile ID:', profileId);
          saved = await profileService.createAchievement(profileId, payload);
        }
      }

      logger.debug('📥 Raw achievement response from backend:', saved);

      const normalized = mapAchievementResponseToUi(saved);
      logger.debug('🔄 Normalized achievement for UI:', normalized);

      setProfessionalDetails(prev => ({
        ...prev,
        achievements: [...prev.achievements.filter(item => item.id !== achievement.id), normalized],
      }));

      logger.debug('✅ Achievement saved and state updated successfully');
      toast.success('Achievement saved successfully!');
      return normalized;
    } catch (error) {
      logger.error('❌ handleSaveAchievement - Detailed error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to save achievement: ${errorMessage}`);
      throw error;
    }
  };

  const handleUpdateAchievement = (id: string, field: keyof Achievement, value: string) => {
    setProfessionalDetails(prev => ({
      ...prev,
      achievements: prev.achievements.map(item =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    }));
  };

  const handleRemoveAchievement = async (id: string, roleOverride?: string) => {
    logger.debug('🗑️ handleRemoveAchievement - Starting deletion for ID:', id);
    
    // Get current professional details and find the achievement to delete
    let currentAchievements: Achievement[] = [];
    let achievementToDelete: Achievement | undefined;
    
    setProfessionalDetails(prev => {
      currentAchievements = prev.achievements;
      achievementToDelete = prev.achievements.find(ach => ach.id === id);
      logger.debug('🔍 Current professionalDetails.achievements:', prev.achievements);
      logger.debug('🎯 Achievement to delete:', achievementToDelete);
      return prev; // Don't change the state, just access it
    });
    
    try {
      const role = roleOverride ?? currentRole;
      logger.debug('🔄 Using role for achievement deletion:', role);
      logger.debug('📋 Available achievement IDs in state:', currentAchievements.map(a => a.id));
      
      // Delete from backend first (linked to Professional Profile)
      if (!id.startsWith('temp-')) {
        if (role === 'coach') {
          logger.debug('🔄 Deleting coach achievement from backend (linked to Professional Profile)');
          await profileService.deleteCoachAchievement(id);
          logger.debug('✅ Backend deletion successful for coach achievement ID:', id);
        } else {
          logger.debug('🔄 Deleting athlete achievement from backend (linked to Professional Profile)');
          await profileService.deleteAchievement(id);
          logger.debug('✅ Backend deletion successful for athlete achievement ID:', id);
        }
      } else {
        logger.debug('⚠️ Skipping backend deletion for temporary achievement ID:', id);
      }

      // Remove from local state after successful backend deletion
      setProfessionalDetails(prev => ({
        ...prev,
        achievements: prev.achievements.filter(item => item.id !== id),
      }));
      
      logger.debug('✅ Achievement removed from UI state successfully');
      toast.success('Achievement deleted successfully!');
    } catch (error) {
      logger.error('❌ handleRemoveAchievement - Detailed error:', error);
      logger.debug('🔍 Error details:', {
        errorType: typeof error,
        errorMessage: error instanceof Error ? error.message : 'Unknown',
        achievementId: id,
        achievementData: achievementToDelete,
        role: roleOverride ?? currentRole,
        availableIds: currentAchievements.map(a => a.id)
      });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to delete achievement: ${errorMessage}`);
    }
  };

  const handleToggleSport = async (sport: string) => {
    setProfessionalDetails(prev => {
      const current = prev.sportsInvolved ?? [];
      const exists = current.includes(sport);
      const updated = exists ? current.filter(item => item !== sport) : [...current, sport];

      (async () => {
        try {
          const profileId = await ensureAthleticProfileId();
          const summary = await profileService.upsertAthleticProfile(userId, profileId, {
            sportsInvolved: updated,
          });
          setProfessionalDetails(prevDetails => ({
            ...prevDetails,
            sportsInvolved: summary.sportsInvolved,
          }));
        } catch (error) {
          logger.error('Failed to save sports selection:', error);
          toast.error('Failed to save sports selection.');
        }
      })();

      return {
        ...prev,
        sportsInvolved: updated,
      };
    });
  };

  const handleSaveProfessionalDetails = async (details: ProfessionalDetailsType, role: string) => {
    try {
      if (role === 'coach') {
        const profileId = await ensureProfessionalProfileId();
        const summary = await profileService.upsertProfessionalProfile(userId, profileId, {
          experienceYears: details.yearsExperience,
          about: details.about,
        });
        if (isPositiveIntegerString(summary.id)) {
          setProfessionalProfileId(summary.id);
        }
        setProfessionalDetails(prev => ({
          ...prev,
          yearsExperience: summary.experienceYears !== undefined ? String(summary.experienceYears) : '',
          about: summary.aboutNotes ?? '',
        }));
      } else {
        const profileId = await ensureAthleticProfileId();
        const summary = await profileService.upsertAthleticProfile(userId, profileId, {
          experienceYears: details.yearsExperience,
          about: details.about,
          sportsInvolved: details.sportsInvolved ?? [],
        });
        if (isPositiveIntegerString(summary.id)) {
          setAthleticProfileId(summary.id);
        }
        setProfessionalDetails(prev => ({
          ...prev,
          yearsExperience: summary.experienceYears !== undefined ? String(summary.experienceYears) : '',
          about: summary.aboutNotes ?? '',
          sportsInvolved: summary.sportsInvolved,
        }));
      }

      toast.success('Professional details saved successfully!');
    } catch (error) {
      logger.error('Failed to save professional details:', error);
      const message = error instanceof Error ? error.message : 'Failed to save professional details';
      toast.error(`Error saving professional details: ${message}`);
    }
  };

  const handleSaveYearsExperience = async (yearsExperience: string, role: string) => {
    try {
      if (role === 'coach') {
        const profileId = await ensureProfessionalProfileId();
        const summary = await profileService.upsertProfessionalProfile(userId, profileId, { experienceYears: yearsExperience });
        if (isPositiveIntegerString(summary.id)) {
          setProfessionalProfileId(summary.id);
        }
      } else {
        const profileId = await ensureAthleticProfileId();
        const summary = await profileService.upsertAthleticProfile(userId, profileId, { experienceYears: yearsExperience });
        if (isPositiveIntegerString(summary.id)) {
          setAthleticProfileId(summary.id);
        }
      }
    } catch (error) {
      logger.error('Failed to save years of experience:', error);
      throw error;
    }
  };

  const handleSaveAbout = async (about: string, role: string) => {
    try {
      if (role === 'coach') {
        const profileId = await ensureProfessionalProfileId();
        const summary = await profileService.upsertProfessionalProfile(userId, profileId, { about });
        if (isPositiveIntegerString(summary.id)) {
          setProfessionalProfileId(summary.id);
        }
      } else {
        const profileId = await ensureAthleticProfileId();
        const summary = await profileService.upsertAthleticProfile(userId, profileId, { about });
        if (isPositiveIntegerString(summary.id)) {
          setAthleticProfileId(summary.id);
        }
      }
    } catch (error) {
      logger.error('Failed to save about section:', error);
      throw error;
    }
  };

  const handleSaveSportsInvolved = async (sportsInvolved: string[]) => {
    try {
      const profileId = await ensureAthleticProfileId();
      const summary = await profileService.upsertAthleticProfile(userId, profileId, { sportsInvolved });
      if (isPositiveIntegerString(summary.id)) {
        setAthleticProfileId(summary.id);
      }
      setProfessionalDetails(prev => ({
        ...prev,
        sportsInvolved: summary.sportsInvolved,
      }));
    } catch (error) {
      logger.error('Failed to save sports involved:', error);
      throw error;
    }
  };

  return {
    isCodeCopied,
    showCoachModal,
    selectedCoach,
    achievementCategories,
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
    newCoachCode,
    setNewCoachCode,
    coachCodeError,
    setCoachCodeError,
  };
}
