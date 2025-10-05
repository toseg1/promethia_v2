import { useState, useEffect, useCallback, useRef } from 'react';
import { parsePhoneNumber } from '../../../utils/phoneUtils';
import { profileService, UserProfileBundle, ProfileAthleticSummary, ProfileProfessionalSummary } from '../../../services/profileService';
import {
  User as UserType,
  ProfileData,
  PerformanceMetrics as PerformanceMetricsType,
  ProfessionalDetails as ProfessionalDetailsType,
  CoachInfo,
  Certification,
  Achievement,
} from '../types';

const normalizeNumericId = (value: unknown): string | null => {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null;
  }

  const asString = typeof value === 'number' ? String(value) : value.trim();
  if (!/^[0-9]+$/.test(asString)) {
    return null;
  }

  return Number(asString) > 0 ? asString : null;
};

function mapAchievementsForUi(items: ProfileAthleticSummary['achievements'] | ProfileProfessionalSummary['coachAchievements'] = []): Achievement[] {
  console.log('🔄 mapAchievementsForUi - Mapping backend achievements:', items);
  
  const mapped = items.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description ?? '',
    year: item.year !== undefined ? String(item.year) : '',
    category: item.category ?? 'Other',
  }));
  
  console.log('✅ mapAchievementsForUi - Mapped achievements for UI:', mapped);
  return mapped;
}

function mapCertificationsForUi(items: ProfileProfessionalSummary['certifications'] = []): Certification[] {
  return items.map(item => ({
    id: item.id,
    sport: item.sport ?? 'Other',
    title: item.title,
    issuer: item.issuingOrganization ?? '',
    year: item.year !== undefined ? String(item.year) : '',
    isCustom: false,
  }));
}

function mapCoachesForUi(bundle: UserProfileBundle, currentRole: string): CoachInfo[] {
  if (currentRole !== 'athlete') {
    return [];
  }

  return bundle.coachingSummary.coaches.map(coach => {
    const fullName = coach.fullName ?? '';
    const [firstName, ...rest] = fullName.split(' ').filter(Boolean);
    const lastName = rest.join(' ');

    return {
      id: coach.id,
      firstName: firstName || coach.username || 'Coach',
      lastName: lastName || '',
      username: coach.username,
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
      avatarUrl: coach.profileImage,
    };
  });
}

function normalizeMetrics(bundle: UserProfileBundle): PerformanceMetricsType {
  const { user } = bundle;
  return {
    mas: user.mas !== undefined && user.mas !== null ? String(user.mas) : '',
    fpp: user.fpp !== undefined && user.fpp !== null ? String(user.fpp) : '',
    css: user.cssDisplay ?? '',
  };
}

function normalizeProfileData(bundle: UserProfileBundle, fallbackUser: UserType): ProfileData {
  const backendParsedPhone = parsePhoneNumber(bundle.user.phone || fallbackUser.phone || '');

  return {
    firstName: bundle.user.firstName || fallbackUser.firstName,
    lastName: bundle.user.lastName || fallbackUser.lastName,
    email: bundle.user.email || fallbackUser.email,
    phone: backendParsedPhone.phoneNumber || '',
    countryCode: backendParsedPhone.countryCode || 'FR',
    dateOfBirth: bundle.user.dateOfBirth || '',
    weight: '',
    height: '',
  };
}

function normalizeProfessionalDetails(
  bundle: UserProfileBundle,
  currentRole: string,
): ProfessionalDetailsType {
  console.log('🔄 normalizeProfessionalDetails - Role:', currentRole);
  console.log('🔍 Bundle professionalProfile:', bundle.professionalProfile);
  console.log('🔍 Bundle athleticProfile:', bundle.athleticProfile);
  
  if (currentRole === 'coach') {
    const profile = bundle.professionalProfile;
    console.log('👨‍🏫 Processing coach profile - coachAchievements:', profile?.coachAchievements);
    
    return {
      yearsExperience: profile?.experienceYears !== undefined && profile.experienceYears !== null && profile.experienceYears !== 0 ? String(profile.experienceYears) : '',
      about: profile?.aboutNotes ?? '',
      certifications: mapCertificationsForUi(profile?.certifications),
      achievements: mapAchievementsForUi(profile?.coachAchievements),
      sportsInvolved: undefined,
    };
  }

  const profile = bundle.athleticProfile;
  console.log('🏃‍♂️ Processing athlete profile - achievements:', profile?.achievements);
  
  return {
    yearsExperience: profile?.experienceYears !== undefined && profile.experienceYears !== null && profile.experienceYears !== 0 ? String(profile.experienceYears) : '',
    about: profile?.aboutNotes ?? '',
    certifications: [],
    achievements: mapAchievementsForUi(profile?.achievements),
    sportsInvolved: profile?.sportsInvolved ?? [],
  };
}

function validateCssFormat(value: string): boolean {
  const cssRegex = /^\d{1,2}:\d{2}$/;
  return cssRegex.test(value);
}

export function useProfileData(user: UserType, currentRole: string) {
  const initialPhone = parsePhoneNumber(user.phone || '');
  const initialProfileData: ProfileData = {
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    phone: initialPhone.phoneNumber || '',
    countryCode: initialPhone.countryCode || 'FR',
    dateOfBirth: '',
    weight: '',
    height: '',
  };

  const [originalData, setOriginalData] = useState<ProfileData>(initialProfileData);
  const [originalMetrics, setOriginalMetrics] = useState<PerformanceMetricsType>({ mas: '', fpp: '', css: '' });

  const [profileData, setProfileData] = useState<ProfileData>(initialProfileData);
  const [metrics, setMetrics] = useState<PerformanceMetricsType>({ mas: '', fpp: '', css: '' });
  const [professionalDetails, setProfessionalDetails] = useState<ProfessionalDetailsType>({
    yearsExperience: '',
    about: '',
    certifications: [],
    achievements: [],
    sportsInvolved: currentRole === 'athlete' ? [] : undefined,
  });
  const [coaches, setCoaches] = useState<CoachInfo[]>([]);
  const [myCoachCode, setMyCoachCode] = useState(user.coachId ?? '');
  const [athleticProfileId, setAthleticProfileId] = useState<string | null>(null);
  const [professionalProfileId, setProfessionalProfileId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStates, setLoadingStates] = useState({
    profile: false,
    professional: false,
    certifications: false,
    achievements: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [dataLoadedAt, setDataLoadedAt] = useState<Date | null>(null);

  const hasChangesRef = useRef(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      setIsLoading(true);
      setError(null);
      setLoadingStates({
        profile: true,
        professional: currentRole === 'coach',
        certifications: currentRole === 'coach',
        achievements: true,
      });

      try {
        const bundle = await profileService.getProfile();

        const normalizedProfile = normalizeProfileData(bundle, user);
        const normalizedMetrics = normalizeMetrics(bundle);
        const normalizedProfessionalDetails = normalizeProfessionalDetails(bundle, currentRole);
        const normalizedCoaches = mapCoachesForUi(bundle, currentRole);

        setOriginalData(normalizedProfile);
        setProfileData(normalizedProfile);

        setOriginalMetrics(normalizedMetrics);
        setMetrics(normalizedMetrics);

        setProfessionalDetails(normalizedProfessionalDetails);
        setCoaches(normalizedCoaches);

        setMyCoachCode(bundle.user.coachId ?? user.coachId ?? '');
        setAthleticProfileId(normalizeNumericId(bundle.athleticProfile?.id));
        setProfessionalProfileId(normalizeNumericId(bundle.professionalProfile?.id));
        setDataLoadedAt(new Date());
        setLoadingStates({ profile: false, professional: false, certifications: false, achievements: false });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load profile data';
        setError(message);

        setProfessionalDetails({
          yearsExperience: '',
          about: '',
          certifications: [],
          achievements: [],
          sportsInvolved: currentRole === 'athlete' ? [] : undefined,
        });

        setProfileData(initialProfileData);
        setMetrics({ mas: '', fpp: '', css: '' });
        setCoaches([]);
        setMyCoachCode(user.coachId ?? '');
        setAthleticProfileId(null);
        setProfessionalProfileId(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileData();
  }, [user.id, currentRole]);

  const checkForChanges = useCallback(() => {
    const profileChanged = (
      profileData.firstName !== originalData.firstName ||
      profileData.lastName !== originalData.lastName ||
      profileData.phone !== originalData.phone ||
      profileData.countryCode !== originalData.countryCode ||
      profileData.dateOfBirth !== originalData.dateOfBirth
    );

    const metricsChanged = (
      metrics.mas !== originalMetrics.mas ||
      metrics.fpp !== originalMetrics.fpp ||
      metrics.css !== originalMetrics.css
    );

    const newValue = profileChanged || metricsChanged;
    if (newValue !== hasChangesRef.current) {
      hasChangesRef.current = newValue;
      setHasChanges(newValue);
    }
  }, [profileData, originalData, metrics, originalMetrics]);

  useEffect(() => {
    checkForChanges();
  }, [checkForChanges]);

  const updateProfileData = useCallback((field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateMetric = useCallback((metric: keyof PerformanceMetricsType, value: string) => {
    // Always allow the update - validation happens on blur/save, not during typing
    setMetrics(prev => ({ ...prev, [metric]: value }));
  }, []);

  return {
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
  };
}
