import {
  TrainingEvent,
  User,
  DashboardTrainingSummary,
  DashboardRaceSummary,
  DashboardAchievementSummary,
  CoachingRelationshipSummary,
  DashboardSummary
} from '../types';
import { apiClient } from './apiClient';

const API_ORIGIN = apiClient.getBaseOrigin();

function generateLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Math.random().toString(36).slice(2, 11)}`;
}

function resolveMediaUrl(url?: string | null): string | undefined {
  if (!url) {
    return undefined;
  }

  if (url.startsWith('http') || url.startsWith('data:')) {
    return url;
  }

  const normalizedPath = url.startsWith('/') ? url : `/${url}`;
  return `${API_ORIGIN}${normalizedPath}`;
}

function toCssDisplay(seconds?: number | null): string | undefined {
  if (seconds === null || seconds === undefined) {
    return undefined;
  }

  const totalSeconds = Number(seconds);
  if (Number.isNaN(totalSeconds) || totalSeconds <= 0) {
    return undefined;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.round(totalSeconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function toTitleCase(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(/[_\s]+/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export interface ProfileAchievement {
  id: string;
  title: string;
  description?: string;
  year?: number;
  category?: string;
  profileId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileCertification {
  id: string;
  sport?: string;
  title: string;
  issuingOrganization?: string;
  year?: number;
  profileId?: string;
  isRecent?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileAthleticSummary {
  id: string;
  userId: string;
  experienceYears?: number;
  aboutNotes?: string;
  sportsInvolved: string[];
  totalAchievements?: number;
  recentAchievements: ProfileAchievement[];
  achievements: ProfileAchievement[];
  createdAt?: string;
  updatedAt?: string;
}

export interface ProfileProfessionalSummary {
  id: string;
  userId: string;
  experienceYears?: number;
  aboutNotes?: string;
  totalCertifications?: number;
  totalAchievements?: number;
  activeCertifications: ProfileCertification[];
  certifications: ProfileCertification[];
  coachAchievements: ProfileAchievement[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserProfileBundle {
  user: User;
  athleticProfile?: ProfileAthleticSummary;
  professionalProfile?: ProfileProfessionalSummary;
  coachingSummary: CoachingRelationshipSummary;
}

export function mapProfileAchievementFromApi(item: any): ProfileAchievement {
  if (!item) {
    return {
      id: generateLocalId(),
      title: ''
    };
  }

  return {
    id: String(item.id ?? generateLocalId()),
    title: item.title ?? '',
    description: item.description ?? undefined,
    year: item.year !== undefined && item.year !== null ? Number(item.year) : undefined,
    category: toTitleCase(item.category) ?? undefined,
    profileId: item.profile ? String(item.profile) : undefined,
    createdAt: item.created_at ?? undefined,
    updatedAt: item.updated_at ?? undefined,
  };
}

export function mapProfileCertificationFromApi(item: any): ProfileCertification {
  if (!item) {
    return {
      id: generateLocalId(),
      title: ''
    };
  }

  return {
    id: String(item.id ?? generateLocalId()),
    sport: toTitleCase(item.sport) ?? undefined,
    title: item.title ?? '',
    issuingOrganization: item.issuing_organization ?? undefined,
    year: item.year !== undefined && item.year !== null ? Number(item.year) : undefined,
    profileId: item.profile ? String(item.profile) : undefined,
    isRecent: Boolean(item.is_recent ?? false),
    createdAt: item.created_at ?? undefined,
    updatedAt: item.updated_at ?? undefined,
  };
}

export function mapAthleticProfileSummaryFromApi(payload: any): ProfileAthleticSummary {
  const achievementsRaw = Array.isArray(payload?.achievements) ? payload.achievements : [];
  const recentAchievementsRaw = Array.isArray(payload?.recent_achievements) ? payload.recent_achievements : [];
  const sportsRaw = Array.isArray(payload?.sports_involved) ? payload.sports_involved : [];

  const sportsInvolved = sportsRaw
    .map((sport: unknown) => (typeof sport === 'string' ? toTitleCase(sport) : undefined))
    .filter((sport): sport is string => Boolean(sport));

  const rawId = payload?.id;
  const normalizedId = typeof rawId === 'number'
    ? String(rawId)
    : typeof rawId === 'string'
      ? rawId.trim()
      : '';
  const validId = /^[0-9]+$/.test(normalizedId) && Number(normalizedId) > 0 ? normalizedId : '';

  return {
    id: validId,
    userId: String(payload?.user ?? payload?.user_id ?? ''),
    experienceYears: payload?.experience_years !== undefined && payload?.experience_years !== null
      ? Number(payload.experience_years)
      : undefined,
    aboutNotes: payload?.about_notes ?? undefined,
    sportsInvolved,
    totalAchievements: payload?.total_achievements !== undefined ? Number(payload.total_achievements) : undefined,
    recentAchievements: recentAchievementsRaw.map(mapProfileAchievementFromApi),
    achievements: achievementsRaw.map(mapProfileAchievementFromApi),
    createdAt: payload?.created_at ?? undefined,
    updatedAt: payload?.updated_at ?? undefined,
  };
}

export function mapProfessionalProfileSummaryFromApi(payload: any): ProfileProfessionalSummary {
  const certificationsRaw = Array.isArray(payload?.certifications) ? payload.certifications : [];
  const activeCertificationsRaw = Array.isArray(payload?.active_certifications) ? payload.active_certifications : [];
  const coachAchievementsRaw = Array.isArray(payload?.coach_achievements) ? payload.coach_achievements : [];

  const rawId = payload?.id;
  const normalizedId = typeof rawId === 'number'
    ? String(rawId)
    : typeof rawId === 'string'
      ? rawId.trim()
      : '';
  const validId = /^[0-9]+$/.test(normalizedId) && Number(normalizedId) > 0 ? normalizedId : '';

  return {
    id: validId,
    userId: String(payload?.user ?? payload?.user_id ?? ''),
    experienceYears: payload?.experience_years !== undefined && payload?.experience_years !== null
      ? Number(payload.experience_years)
      : undefined,
    aboutNotes: payload?.about_notes ?? undefined,
    totalCertifications: payload?.total_certifications !== undefined ? Number(payload.total_certifications) : undefined,
    totalAchievements: payload?.total_achievements !== undefined ? Number(payload.total_achievements) : undefined,
    activeCertifications: activeCertificationsRaw.map(mapProfileCertificationFromApi),
    certifications: certificationsRaw.map(mapProfileCertificationFromApi),
    coachAchievements: coachAchievementsRaw.map(mapProfileAchievementFromApi),
    createdAt: payload?.created_at ?? undefined,
    updatedAt: payload?.updated_at ?? undefined,
  };
}

export function mapUserProfileFromApi(payload: any): UserProfileBundle {
  if (!payload) {
    throw new Error('Invalid profile payload received from API');
  }

  const user = mapUserFromApi(payload);
  const athleticProfile = payload.athletic_profile ? mapAthleticProfileSummaryFromApi(payload.athletic_profile) : undefined;
  const professionalProfile = payload.professional_profile ? mapProfessionalProfileSummaryFromApi(payload.professional_profile) : undefined;
  const coachingSummary = mapCoachingRelationshipSummaryFromApi(payload.coaching_summary);

  return {
    user,
    athleticProfile,
    professionalProfile,
    coachingSummary,
  };
}

function toMinutes(duration: string | number | null | undefined): number | undefined {
  if (!duration) {
    return undefined;
  }

  if (typeof duration === 'number') {
    return Math.round(duration / 60);
  }

  // DurationField may serialize as ISO 8601 (e.g. "PT1H30M") or "HH:MM:SS"
  if (duration.startsWith('P')) {
    const hoursMatch = duration.match(/(\d+)H/);
    const minutesMatch = duration.match(/(\d+)M/);
    const secondsMatch = duration.match(/(\d+)S/);

    const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
    const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
    const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;

    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  const timeParts = duration.split(':').map(Number);
  if (timeParts.length === 3) {
    const [hours, minutes, seconds] = timeParts;
    return hours * 60 + minutes + Math.round(seconds / 60);
  }

  if (timeParts.length === 2) {
    const [minutes, seconds] = timeParts;
    return minutes + Math.round(seconds / 60);
  }

  return undefined;
}

export function mapUserFromApi(backendUser: any): User {
  if (!backendUser) {
    throw new Error('Invalid user payload received from API');
  }

  const id = backendUser.id ?? backendUser.user?.id;
  if (!id) {
    throw new Error('Backend user payload missing id field');
  }

  const firstName = backendUser.first_name ?? backendUser.user?.first_name ?? '';
  const lastName = backendUser.last_name ?? backendUser.user?.last_name ?? '';
  const profileImageRaw = backendUser.profile_image ?? backendUser.user?.profile_image;
  const masRaw = backendUser.mas ?? backendUser.user?.mas;
  const fppRaw = backendUser.fpp ?? backendUser.user?.fpp;
  const cssRaw = backendUser.css ?? backendUser.user?.css;
  const cssDisplay = backendUser.css_display ?? backendUser.user?.css_display ?? toCssDisplay(cssRaw);

  const athleticProfileRaw =
    backendUser.athletic_profile ??
    backendUser.profile?.athletic_profile ??
    backendUser.user?.athletic_profile;

  let sportsInvolved: string[] | undefined;
  let athleticProfileSummary: {
    id: string;
    experienceYears?: number;
    aboutNotes?: string;
    sportsInvolved: string[];
    achievements: ReturnType<typeof mapProfileAchievementFromApi>[];
  } | undefined;

  if (athleticProfileRaw) {
    const summary = mapAthleticProfileSummaryFromApi(athleticProfileRaw);
    if (summary.sportsInvolved.length > 0) {
      sportsInvolved = summary.sportsInvolved;
    }
    athleticProfileSummary = {
      id: summary.id,
      experienceYears: summary.experienceYears,
      aboutNotes: summary.aboutNotes,
      sportsInvolved: summary.sportsInvolved,
      achievements: summary.achievements,
    };
  } else {
    const sportsSource =
      backendUser.sports_involved ??
      backendUser.sports ??
      backendUser.user?.sports_involved ??
      backendUser.user?.sports;

    if (Array.isArray(sportsSource)) {
      const normalized = sportsSource
        .map((sport: unknown) => (typeof sport === 'string' ? toTitleCase(sport) : undefined))
        .filter((sport): sport is string => Boolean(sport));

      if (normalized.length > 0) {
        sportsInvolved = Array.from(new Set(normalized));
      }
    } else if (typeof sportsSource === 'string' && sportsSource.trim().length > 0) {
      const sport = toTitleCase(sportsSource.trim());
      sportsInvolved = sport ? [sport] : undefined;
    }
  }

  return {
    id: String(id),
    username: backendUser.username ?? backendUser.user?.username ?? backendUser.email ?? '',
    firstName,
    lastName,
    email: backendUser.email ?? backendUser.user?.email ?? '',
    phone: backendUser.country_number && backendUser.phone_number 
      ? `${backendUser.country_number}${backendUser.phone_number}`
      : backendUser.user?.country_number && backendUser.user?.phone_number
        ? `${backendUser.user.country_number}${backendUser.user.phone_number}`
        : backendUser.full_phone_number ?? backendUser.user?.full_phone_number ?? backendUser.phone_number ?? backendUser.user?.phone_number ?? undefined,
    countryCode: backendUser.country_number ?? backendUser.user?.country_number ?? '+1',
    role: backendUser.user_type ?? backendUser.user?.user_type ?? 'athlete',
    avatarUrl: resolveMediaUrl(profileImageRaw),
    profileImage: resolveMediaUrl(profileImageRaw),
    avatarColor: backendUser.avatar_color ?? backendUser.user?.avatar_color,
    coachId: backendUser.coach_id ?? backendUser.user?.coach_id,
    dateOfBirth: backendUser.date_of_birth ?? backendUser.user?.date_of_birth ?? undefined,
    mas: masRaw !== undefined && masRaw !== null ? masRaw : undefined,
    fpp: fppRaw !== undefined && fppRaw !== null ? fppRaw : undefined,
    css: cssRaw !== undefined && cssRaw !== null ? cssRaw : undefined,
    cssDisplay,
    isVerified: backendUser.is_verified ?? backendUser.user?.is_verified ?? undefined,
    createdAt: backendUser.created_at ?? backendUser.user?.created_at ?? undefined,
    updatedAt: backendUser.updated_at ?? backendUser.user?.updated_at ?? undefined,
    dateJoined: backendUser.date_joined ?? backendUser.user?.date_joined ?? undefined,
    sportsInvolved,
    athleticProfile: athleticProfileSummary,
    performanceMetrics: {
      mas: masRaw,
      fpp: fppRaw,
      css: cssRaw,
      totalWorkouts: backendUser.total_workouts ?? 0,
      weeklyAverage: backendUser.weekly_average ?? 0,
      monthlyGoal: backendUser.monthly_goal ?? 0,
      personalBests: backendUser.personal_bests ?? {},
      recentActivities: [],
      completionRate: backendUser.completion_rate ?? 0,
      streakDays: backendUser.streak_days ?? 0
    }
  };
}

export function mapTrainingEventFromApi(item: any): TrainingEvent {
  if (!item) {
    throw new Error('Invalid training payload received from API');
  }

  const id = item.id ?? item.pk;
  if (!id) {
    throw new Error('Training event payload missing id field');
  }

  const durationMinutes = toMinutes(item.duration);

  // Import the reverse mapper dynamically to avoid circular dependencies
  let trainingBlocks: any[] = [];
  console.log('📥 Raw training event from API:', JSON.stringify(item, null, 2));
  if (item.training_data) {
    // Use the reverse mapper to convert training_data to TrainingBlock[]
    const { mapTrainingDataToBlocks } = require('./eventNormalization');
    trainingBlocks = mapTrainingDataToBlocks(item.training_data);
  } else {
    console.warn('⚠️ No training_data in API response!');
  }

  return {
    id: String(id),
    title: item.title ?? 'Training Session',
    description: item.notes ?? '',
    date: item.date ?? item.start_time ?? new Date().toISOString(),
    startTime: item.time ?? undefined,
    time: item.time ?? undefined,
    endTime: undefined,
    type: 'training',
    sport: item.sport,
    location: item.location,
    duration: durationMinutes,
    intensity: item.training_data?.intensity ?? item.intensity,
    notes: item.notes,
    athlete: item.athlete ? String(item.athlete) : undefined,
    trainingBlocks: trainingBlocks, // Map training_data to frontend structure
    trainingName: item.training_data?.name, // Training builder name
    completed: item.completed ?? false,
    createdBy: item.athlete ? String(item.athlete) : 'self',
    createdAt: item.created_at ?? item.date,
    updatedAt: item.updated_at ?? item.date,
  };
}

export function extractResultsArray<T>(payload: any): T[] {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload as T[];
  }

  if (Array.isArray(payload.results)) {
    return payload.results as T[];
  }

  if (Array.isArray(payload.data?.results)) {
    return payload.data.results as T[];
  }

  return [];
}

function normalizeName(firstName?: string, lastName?: string): string | undefined {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || undefined;
}

export function mapDashboardTrainingSummaryFromApi(item: any): DashboardTrainingSummary {
  const durationMinutes = toMinutes(item?.duration);

  return {
    id: String(item?.id ?? ''),
    title: item?.title ?? 'Training Session',
    athlete: String(item?.athlete ?? ''),
    athleteName: item?.athlete_name ?? normalizeName(item?.athlete_first_name, item?.athlete_last_name),
    date: item?.date ?? '',
    time: item?.time ?? undefined,
    sport: item?.sport ?? undefined,
    durationMinutes: durationMinutes ?? undefined,
    isUpcoming: item?.is_upcoming ?? undefined,
    isToday: item?.is_today ?? undefined,
  };
}

export function mapDashboardRaceSummaryFromApi(item: any): DashboardRaceSummary {
  return {
    id: String(item?.id ?? ''),
    title: item?.title ?? 'Race',
    athlete: String(item?.athlete ?? ''),
    athleteName: item?.athlete_name ?? normalizeName(item?.athlete_first_name, item?.athlete_last_name),
    date: item?.date ?? '',
    sport: item?.sport ?? undefined,
    location: item?.location ?? undefined,
    distance: item?.distance !== undefined ? String(item.distance) : undefined,
    isUpcoming: item?.is_upcoming ?? undefined,
    isToday: item?.is_today ?? undefined,
    isCompleted: item?.is_completed ?? undefined,
  };
}

export function mapDashboardAchievementSummaryFromApi(item: any): DashboardAchievementSummary {
  return {
    id: String(item?.id ?? ''),
    title: item?.title ?? 'Achievement',
    category: item?.category ?? undefined,
    year: item?.year !== undefined ? Number(item.year) : undefined,
  };
}

function mapCoachingRelationshipSummaryFromApi(data: any = {}): CoachingRelationshipSummary {
  const coaches = Array.isArray(data?.coaches) ? data.coaches : [];
  const mentees = Array.isArray(data?.mentees) ? data.mentees : [];

  return {
    coachesCount: Number(data?.coaches_count ?? coaches.length ?? 0),
    menteesCount: Number(data?.mentees_count ?? mentees.length ?? 0),
    coaches: coaches.map((coach: any) => ({
      id: String(coach?.id ?? ''),
      username: coach?.username ?? '',
      fullName: coach?.full_name ?? normalizeName(coach?.first_name, coach?.last_name) ?? '',
      email: coach?.email ?? '',
      phone: coach?.country_number && coach?.phone_number 
        ? `${coach.country_number}${coach.phone_number}` 
        : coach?.full_phone_number ?? coach?.phone_number ?? '',
      profileImage: resolveMediaUrl(coach?.profile_image),
      firstName: coach?.first_name ?? '',
      lastName: coach?.last_name ?? ''
    })),
    mentees: mentees.map((mentee: any) => ({
      id: String(mentee?.id ?? ''),
      username: mentee?.username ?? '',
      fullName: mentee?.full_name ?? normalizeName(mentee?.first_name, mentee?.last_name) ?? '',
      email: mentee?.email ?? ''
    })),
  };
}

export function mapDashboardSummaryFromApi(payload: any): DashboardSummary {
  const trainingsRaw = Array.isArray(payload?.upcoming_trainings) ? payload.upcoming_trainings : [];
  const racesRaw = Array.isArray(payload?.upcoming_races) ? payload.upcoming_races : [];
  const achievementsRaw = Array.isArray(payload?.recent_achievements) ? payload.recent_achievements : [];
  const statsRaw = payload?.this_week_stats ?? {};

  const totalDurationSeconds = Number(statsRaw?.total_duration ?? 0);

  return {
    upcomingTrainings: trainingsRaw.map(mapDashboardTrainingSummaryFromApi),
    upcomingRaces: racesRaw.map(mapDashboardRaceSummaryFromApi),
    thisWeekStats: {
      totalSessions: Number(statsRaw?.total_sessions ?? 0),
      totalDurationMinutes: Math.round(totalDurationSeconds / 60) || 0,
      sportsBreakdown: statsRaw?.sports_breakdown ?? {},
    },
    recentAchievements: achievementsRaw.map(mapDashboardAchievementSummaryFromApi),
    coachingSummary: mapCoachingRelationshipSummaryFromApi(payload?.coaching_summary),
  };
}

export function extractCount(payload: any): number | undefined {
  if (!payload) {
    return undefined;
  }

  if (typeof payload.count === 'number') {
    return payload.count;
  }

  if (typeof payload.data?.count === 'number') {
    return payload.data.count;
  }

  return undefined;
}
