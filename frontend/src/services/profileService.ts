// Profile Service - Normalized access to profile, athletic, and coaching data

import { apiClient } from './apiClient';
import {
  mapUserProfileFromApi,
  mapAthleticProfileSummaryFromApi,
  mapProfessionalProfileSummaryFromApi,
  mapProfileAchievementFromApi,
  mapProfileCertificationFromApi,
  ProfileAthleticSummary,
  ProfileProfessionalSummary,
  ProfileAchievement,
  ProfileCertification,
  UserProfileBundle,
} from './adapters';
import { formatPhoneForBackend } from '../utils/phoneUtils';
import { ApiResponse } from '../types';

export interface ProfileUpdateData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  countryCode?: string;
  dateOfBirth?: string;
}

export interface PerformanceMetrics {
  mas?: string;
  fpp?: string;
  css?: string; // mm:ss or seconds
}

export interface AthleticProfileUpdate {
  experienceYears?: string;
  about?: string;
  sportsInvolved?: string[];
}

export interface ProfessionalProfileUpdate {
  experienceYears?: string;
  about?: string;
}

export interface AchievementPayload {
  title: string;
  category: string;
  year: string;
  description: string;
}

export interface CertificationPayload {
  sport: string;
  title: string;
  issuer: string;
  year: string;
}

const ACHIEVEMENT_CATEGORY_MAP: Record<string, string> = {
  'Race Achievement': 'race_achievement',
  'Personal Record': 'personal_record',
  'Competition Results': 'competition_results',
  'Training Milestone': 'training_milestone',
  Other: 'other',
};

const SPORT_MAP: Record<string, string> = {
  Running: 'running',
  Cycling: 'cycling',
  Swimming: 'swimming',
  Triathlon: 'triathlon',
  Other: 'other',
};

const isValidProfileIdentifier = (value?: string | null): value is string => {
  if (typeof value !== 'string') {
    return false;
  }

  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    return false;
  }

  return Number(trimmed) > 0;
};

function ensureSuccess<T>(response: ApiResponse<T>, fallbackMessage: string): T {
  if (response.success && response.data !== undefined && response.data !== null) {
    return response.data;
  }

  const message = response.error?.message ?? fallbackMessage;
  throw new Error(message);
}

function toSnakeCasePayload(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [
      key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
      value,
    ]),
  );
}

function parseOptionalInt(value?: string): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parsePerformanceNumber(value?: string): number | null | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }

  const parsed = Number(trimmed);
  if (Number.isNaN(parsed)) {
    return undefined;
  }

  return parsed;
}

function parseCssToSeconds(value?: string): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }

  if (!trimmed.includes(':')) {
    const numeric = Number(trimmed);
    return Number.isNaN(numeric) ? undefined : numeric;
  }

  const [minutes, seconds] = trimmed.split(':').map(part => Number(part));
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return undefined;
  }

  return minutes * 60 + seconds;
}

function mapAchievementCategoryToBackend(category: string): string {
  return ACHIEVEMENT_CATEGORY_MAP[category] ?? ACHIEVEMENT_CATEGORY_MAP.Other;
}

function mapSportToBackend(sport: string): string {
  return SPORT_MAP[sport] ?? SPORT_MAP.Other;
}

function mapSportsInvolvedToBackend(sports?: string[]): string[] | undefined {
  if (!sports) {
    return undefined;
  }

  const normalized = sports
    .map((sport) => (typeof sport === 'string' ? sport.trim() : ''))
    .filter(Boolean)
    .map((sport) => sport.toLowerCase().replace(/\s+/g, '_'));

  return Array.from(new Set(normalized));
}

class ProfileService {
  async getProfile(): Promise<UserProfileBundle> {
    const response = await apiClient.get('/users/profile/');
    const data = ensureSuccess(response, 'Failed to fetch profile');
    return mapUserProfileFromApi(data);
  }

  async updateProfile(userId: string, profileData: ProfileUpdateData): Promise<UserProfileBundle> {
    const payload: Record<string, unknown> = {};

    if (profileData.firstName !== undefined) {
      payload.firstName = profileData.firstName;
    }
    if (profileData.lastName !== undefined) {
      payload.lastName = profileData.lastName;
    }
    if (profileData.dateOfBirth !== undefined) {
      payload.dateOfBirth = profileData.dateOfBirth || null;
    }
    if (profileData.phone !== undefined) {
      payload.phoneNumber = profileData.phone;
    }
    if (profileData.countryCode !== undefined) {
      // Convert country code to dial code
      const countryDialCodes: Record<string, string> = {
        'FR': '+33', 'US': '+1', 'GB': '+44', 'DE': '+49', 'ES': '+34',
        'IT': '+39', 'CA': '+1', 'AU': '+61', 'JP': '+81', 'KR': '+82',
        'CN': '+86', 'IN': '+91', 'BR': '+55', 'MX': '+52', 'AR': '+54',
        'CL': '+56', 'CO': '+57', 'PE': '+51', 'VE': '+58', 'ZA': '+27',
        'EG': '+20', 'NG': '+234', 'KE': '+254', 'MA': '+212', 'TN': '+216',
        'RU': '+7', 'TR': '+90', 'SA': '+966', 'AE': '+971', 'IL': '+972'
      };
      payload.countryNumber = countryDialCodes[profileData.countryCode] || '+33';
    }

    if (Object.keys(payload).length === 0) {
      return this.getProfile();
    }

    const backendPayload = toSnakeCasePayload(payload);
    const response = await apiClient.patch(`/users/${userId}/`, backendPayload);
    if (!response.success) {
      const message = response.error?.message ?? 'Failed to update profile';
      throw new Error(message);
    }

    return this.getProfile();
  }

  async updatePerformanceMetrics(userId: string, metrics: PerformanceMetrics): Promise<UserProfileBundle> {
    const payload: Record<string, unknown> = {};

    const masValue = parsePerformanceNumber(metrics.mas);
    if (masValue !== undefined) {
      payload.mas = masValue;
    }

    const fppValue = parsePerformanceNumber(metrics.fpp);
    if (fppValue !== undefined) {
      payload.fpp = fppValue;
    }

    if (metrics.css !== undefined) {
      const cssSeconds = parseCssToSeconds(metrics.css);
      payload.css = cssSeconds ?? null;
    }

    if (Object.keys(payload).length === 0) {
      return this.getProfile();
    }

    const response = await apiClient.patch(`/users/${userId}/`, payload);
    if (!response.success) {
      const message = response.error?.message ?? 'Failed to update performance metrics';
      throw new Error(message);
    }

    return this.getProfile();
  }

  async upsertAthleticProfile(
    userId: string,
    profileId: string | null,
    update: AthleticProfileUpdate,
  ): Promise<ProfileAthleticSummary> {
    const payload: Record<string, unknown> = {};

    const experience = parseOptionalInt(update.experienceYears);
    if (experience !== undefined) {
      payload.experience_years = experience;
    }

    if (update.about !== undefined) {
      payload.about_notes = update.about;
    }

    if (update.sportsInvolved !== undefined) {
      const normalizedSports = mapSportsInvolvedToBackend(update.sportsInvolved);
      payload.sports_involved = normalizedSports ?? [];
    }

    let response: ApiResponse<any>;

    if (isValidProfileIdentifier(profileId)) {
      response = await apiClient.patch(`/athletic-profiles/${profileId}/`, payload);
    } else {
      response = await apiClient.post('/athletic-profiles/', {
        user: userId,
        ...payload,
      });
    }

    const data = ensureSuccess(response, 'Failed to save athletic profile');
    return mapAthleticProfileSummaryFromApi(data);
  }

  async upsertProfessionalProfile(
    userId: string,
    profileId: string | null,
    update: ProfessionalProfileUpdate,
  ): Promise<ProfileProfessionalSummary> {
    const payload: Record<string, unknown> = {};

    const experience = parseOptionalInt(update.experienceYears);
    if (experience !== undefined) {
      payload.experience_years = experience;
    }

    if (update.about !== undefined) {
      payload.about_notes = update.about;
    }

    let response: ApiResponse<any>;

    if (isValidProfileIdentifier(profileId)) {
      response = await apiClient.patch(`/professional-profiles/${profileId}/`, payload);
    } else {
      response = await apiClient.post('/professional-profiles/', {
        user: userId,
        ...payload,
      });
    }

    const data = ensureSuccess(response, 'Failed to save professional profile');
    return mapProfessionalProfileSummaryFromApi(data);
  }

  private mapAchievementPayload(profileId: number, payload: AchievementPayload): Record<string, unknown> {
    return {
      profile: profileId,
      title: payload.title,
      description: payload.description,
      category: mapAchievementCategoryToBackend(payload.category),
      year: parseOptionalInt(payload.year),
    };
  }

  async createAchievement(profileId: string, payload: AchievementPayload): Promise<ProfileAchievement> {
    const profileKey = Number(profileId);
    if (!Number.isInteger(profileKey) || profileKey <= 0) {
      throw new Error('Invalid athletic profile identifier.');
    }

    const response = await apiClient.post('/achievements/', this.mapAchievementPayload(profileKey, payload));
    const data = ensureSuccess(response, 'Failed to create achievement');
    return mapProfileAchievementFromApi(data);
  }

  async updateAchievement(achievementId: string, payload: AchievementPayload): Promise<ProfileAchievement> {
    const backendPayload = {
      title: payload.title,
      description: payload.description,
      category: mapAchievementCategoryToBackend(payload.category),
      year: parseOptionalInt(payload.year),
    };

    const response = await apiClient.patch(`/achievements/${achievementId}/`, backendPayload);
    const data = ensureSuccess(response, 'Failed to update achievement');
    return mapProfileAchievementFromApi(data);
  }

  async deleteAchievement(achievementId: string): Promise<void> {
    console.log('🔗 profileService.deleteAchievement - Deleting athlete achievement ID:', achievementId);
    const response = await apiClient.delete(`/achievements/${achievementId}/`);
    console.log('📡 Delete athlete achievement API response:', response);
    
    if (!response.success) {
      const message = response.error?.message ?? 'Failed to delete achievement';
      console.error('❌ Athlete achievement deletion failed:', message);
      throw new Error(message);
    }
    
    console.log('✅ Athlete achievement deleted successfully via API');
  }

  async createCoachAchievement(profileId: string, payload: AchievementPayload): Promise<ProfileAchievement> {
    console.log('🔗 profileService.createCoachAchievement - Profile ID:', profileId, 'Payload:', payload);
    
    const profileKey = Number(profileId);
    if (!Number.isInteger(profileKey) || profileKey <= 0) {
      throw new Error('Invalid professional profile identifier.');
    }

    const mappedPayload = this.mapAchievementPayload(profileKey, payload);
    console.log('📋 Mapped payload for coach achievement:', mappedPayload);
    
    const response = await apiClient.post('/coach-achievements/', mappedPayload);
    console.log('📡 Create coach achievement API response:', response);
    
    const data = ensureSuccess(response, 'Failed to create coach achievement');
    console.log('✅ Raw coach achievement data from backend:', data);
    
    const mapped = mapProfileAchievementFromApi(data);
    console.log('🔄 Mapped coach achievement for frontend:', mapped);
    
    return mapped;
  }

  async updateCoachAchievement(achievementId: string, payload: AchievementPayload): Promise<ProfileAchievement> {
    const backendPayload = {
      title: payload.title,
      description: payload.description,
      category: mapAchievementCategoryToBackend(payload.category),
      year: parseOptionalInt(payload.year),
    };

    const response = await apiClient.patch(`/coach-achievements/${achievementId}/`, backendPayload);
    const data = ensureSuccess(response, 'Failed to update coach achievement');
    return mapProfileAchievementFromApi(data);
  }

  async deleteCoachAchievement(achievementId: string): Promise<void> {
    console.log('🔗 profileService.deleteCoachAchievement - Deleting coach achievement ID:', achievementId);
    const response = await apiClient.delete(`/coach-achievements/${achievementId}/`);
    console.log('📡 Delete coach achievement API response:', response);
    
    if (!response.success) {
      const message = response.error?.message ?? 'Failed to delete coach achievement';
      console.error('❌ Coach achievement deletion failed:', message);
      throw new Error(message);
    }
    
    console.log('✅ Coach achievement deleted successfully via API');
  }

  async createCertification(profileId: string, payload: CertificationPayload): Promise<ProfileCertification> {
    const profileKey = Number(profileId);
    if (Number.isNaN(profileKey)) {
      throw new Error('Invalid professional profile identifier.');
    }

    const response = await apiClient.post('/certifications/', {
      profile: profileKey,
      sport: mapSportToBackend(payload.sport),
      title: payload.title,
      issuing_organization: payload.issuer,
      year: parseOptionalInt(payload.year),
    });

    const data = ensureSuccess(response, 'Failed to create certification');
    return mapProfileCertificationFromApi(data);
  }

  async updateCertification(certificationId: string, payload: CertificationPayload): Promise<ProfileCertification> {
    const response = await apiClient.patch(`/certifications/${certificationId}/`, {
      sport: mapSportToBackend(payload.sport),
      title: payload.title,
      issuing_organization: payload.issuer,
      year: parseOptionalInt(payload.year),
    });

    const data = ensureSuccess(response, 'Failed to update certification');
    return mapProfileCertificationFromApi(data);
  }

  async deleteCertification(certificationId: string): Promise<void> {
    console.log('🔗 profileService.deleteCertification - Deleting certification ID:', certificationId);
    const response = await apiClient.delete(`/certifications/${certificationId}/`);
    console.log('📡 Delete certification API response:', response);
    
    if (!response.success) {
      const message = response.error?.message ?? 'Failed to delete certification';
      console.error('❌ Certification deletion failed:', message);
      throw new Error(message);
    }
    
    console.log('✅ Certification deleted successfully via API');
  }

  async uploadProfileImage(userId: string, imageFile: File): Promise<UserProfileBundle> {
    const formData = new FormData();
    formData.append('profile_image', imageFile);

    const response = await apiClient.post(`/users/${userId}/upload_profile_image/`, formData);
    if (!response.success) {
      const message = response.error?.message ?? 'Failed to upload profile image';
      throw new Error(message);
    }

    return this.getProfile();
  }

  async removeProfileImage(userId: string): Promise<UserProfileBundle> {
    const response = await apiClient.delete(`/users/${userId}/remove_profile_image/`);
    if (!response.success) {
      const message = response.error?.message ?? 'Failed to remove profile image';
      throw new Error(message);
    }

    return this.getProfile();
  }
}

export const profileService = new ProfileService();
export type { UserProfileBundle, ProfileAthleticSummary, ProfileProfessionalSummary };
