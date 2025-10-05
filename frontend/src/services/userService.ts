// User Service - Handles user profile and related operations

import { User, PerformanceMetrics, ProfileData } from '../types';
import { apiClient } from './apiClient';
import { errorLogger } from './errorLogger';
import { mapUserFromApi, extractResultsArray, mapDashboardSummaryFromApi, mapAthleticProfileSummaryFromApi } from './adapters';
import { DashboardSummary } from '../types';

export interface UserUpdateRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  bio?: string;
}

export interface PerformanceMetricsUpdate {
  mas?: number;
  fpp?: number;
  css?: number;
}

export interface ProfileUpdateRequest {
  personalInfo?: UserUpdateRequest;
  performanceMetrics?: PerformanceMetricsUpdate;
  profileData?: Partial<ProfileData>;
}

class UserService {
  private pendingRemovals = new Set<string>();
  /**
   * Get current user profile - now uses real backend API
   */
  async getUserProfile(userId: string): Promise<User> {
    try {
      // Use the profile endpoint for current user
      const response = await apiClient.get(`/users/profile/`);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch user profile');
      }

      errorLogger.addBreadcrumb('User profile fetched successfully', 'user');
      return mapUserFromApi(response.data);

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'getUserProfile');
      throw error;
    }
  }

  /**
   * Update user profile - now uses real backend API
   */
  async updateUserProfile(userId: string, updates: ProfileUpdateRequest): Promise<User> {
    try {
      // Transform frontend data to backend format
      const backendUpdates: any = {};

      if (updates.personalInfo) {
        if (updates.personalInfo.firstName) backendUpdates.first_name = updates.personalInfo.firstName;
        if (updates.personalInfo.lastName) backendUpdates.last_name = updates.personalInfo.lastName;
        if (updates.personalInfo.email) backendUpdates.email = updates.personalInfo.email;
        if (updates.personalInfo.phone) backendUpdates.phone_number = updates.personalInfo.phone;
        if (updates.personalInfo.countryCode) {
          // Convert country code to dial code
          const countryDialCodes: Record<string, string> = {
            'FR': '+33', 'US': '+1', 'GB': '+44', 'DE': '+49', 'ES': '+34',
            'IT': '+39', 'CA': '+1', 'AU': '+61', 'JP': '+81', 'KR': '+82',
            'CN': '+86', 'IN': '+91', 'BR': '+55', 'MX': '+52', 'AR': '+54',
            'CL': '+56', 'CO': '+57', 'PE': '+51', 'VE': '+58', 'ZA': '+27',
            'EG': '+20', 'NG': '+234', 'KE': '+254', 'MA': '+212', 'TN': '+216',
            'RU': '+7', 'TR': '+90', 'SA': '+966', 'AE': '+971', 'IL': '+972'
          };
          backendUpdates.country_number = countryDialCodes[updates.personalInfo.countryCode] || '+33';
        }
        if (updates.personalInfo.bio) backendUpdates.bio = updates.personalInfo.bio;
      }
      
      if (updates.performanceMetrics) {
        if (updates.performanceMetrics.mas !== undefined) backendUpdates.mas = updates.performanceMetrics.mas;
        if (updates.performanceMetrics.fpp !== undefined) backendUpdates.fpp = updates.performanceMetrics.fpp;
        if (updates.performanceMetrics.css !== undefined) backendUpdates.css = updates.performanceMetrics.css;
      }

      // Use PATCH on users endpoint with user ID
      const response = await apiClient.patch(`/users/${userId}/`, backendUpdates);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to update user profile');
      }

      // Transform response back to frontend format
      return mapUserFromApi(response.data);

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'updateUserProfile');
      throw error;
    }
  }

  /**
   * Update performance metrics
   */
  async updatePerformanceMetrics(userId: string, metrics: PerformanceMetricsUpdate): Promise<PerformanceMetrics> {
    try {
      const response = await apiClient.patch(`/users/${userId}/`, {
        ...(metrics.mas !== undefined ? { mas: metrics.mas } : {}),
        ...(metrics.fpp !== undefined ? { fpp: metrics.fpp } : {}),
        ...(metrics.css !== undefined ? { css: metrics.css } : {}),
      });

      if (!response.success || !response.data) {
        throw new Error('Failed to update performance metrics');
      }

      errorLogger.addBreadcrumb('Performance metrics updated', 'user');
      return mapUserFromApi(response.data).performanceMetrics;

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'updatePerformanceMetrics');
      
      // Return mock metrics for development
      return {
        totalWorkouts: 150,
        weeklyAverage: 4.2,
        monthlyGoal: 20,
        personalBests: {
          '5K': '18:45',
          '10K': '39:12',
          halfMarathon: '1:25:30'
        },
        recentActivities: [],
        completionRate: 87,
        streakDays: 12,
        ...metrics
      };
    }
  }

  /**
   * Get user's connected athletes (for coaches) - now uses real backend API
   */
  async getConnectedAthletes(coachId: string): Promise<User[]> {
    const response = await apiClient.get(`/users/my-athletes/`);

    if (!response.success) {
      const statusCode = response.error?.status ?? Number(response.error?.code) ?? null;
      if (statusCode === 404) {
        return [];
      }

      const error = new Error(response.error?.message ?? 'Failed to fetch connected athletes');
      errorLogger.logAsyncError(error, 'getConnectedAthletes');
      throw error;
    }

    const rawAthletes = Array.isArray(response.data)
      ? response.data
      : extractResultsArray<any>(response.data);

    try {
      let mappedAthletes = rawAthletes.map(mapUserFromApi);

      const athletesMissingSports = mappedAthletes.filter((athlete) => !athlete.sportsInvolved || athlete.sportsInvolved.length === 0);

      if (athletesMissingSports.length > 0) {
        const profileResponse = await apiClient.get('/athletic-profiles/');

        if (profileResponse.success && profileResponse.data) {
          const rawProfiles = Array.isArray(profileResponse.data)
            ? profileResponse.data
            : extractResultsArray<any>(profileResponse.data);

          const profileMap = new Map<string, ReturnType<typeof mapAthleticProfileSummaryFromApi>>();

          rawProfiles.forEach((profile) => {
            try {
              const summary = mapAthleticProfileSummaryFromApi(profile);
              if (summary.userId) {
                profileMap.set(summary.userId, summary);
              }
            } catch (error) {
              errorLogger.logAsyncError(error as Error, 'mapAthleticProfileSummary');
            }
          });

          mappedAthletes = mappedAthletes.map((athlete) => {
            if (athlete.sportsInvolved && athlete.sportsInvolved.length > 0) {
              return athlete;
            }

            const profile = profileMap.get(athlete.id);
            if (profile && profile.sportsInvolved && profile.sportsInvolved.length > 0) {
              return {
                ...athlete,
                sportsInvolved: profile.sportsInvolved,
              };
            }

            return athlete;
          });
        }
      }

      return mappedAthletes;
    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'mapConnectedAthletes');
      throw error;
    }
  }

  /**
   * Get user's connected coaches (for athletes) - now uses real backend API
   */
  async getConnectedCoaches(athleteId: string): Promise<User[]> {
    try {
      // Get coaches from users endpoint (filtered for current athlete)
      const response = await apiClient.get(`/users/`);
      
      if (!response.success || !response.data) {
        throw new Error('Failed to fetch connected coaches');
      }

      const coaches = extractResultsArray<any>(response.data);

      return coaches.map(mapUserFromApi);

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'getConnectedCoaches');
      throw error;
    }
  }

  /**
   * Retrieve dashboard summary for the authenticated user
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    try {
      const response = await apiClient.get('/users/dashboard/');

      if (!response.success || !response.data) {
        throw new Error('Failed to fetch dashboard summary');
      }

      return mapDashboardSummaryFromApi(response.data);

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'getDashboardSummary');
      throw error;
    }
  }

  /**
   * Connect athlete to coach - now uses real backend API
   */
  async connectToCoach(athleteId: string, coachCode: string): Promise<void> {
    try {
      // Use the add-coach-access endpoint
      const response = await apiClient.post(`/users/add-coach-access/`, { 
        coach_id: coachCode 
      });
      
      if (!response.success) {
        throw new Error('Failed to connect to coach');
      }

      errorLogger.addBreadcrumb('Connected to coach successfully', 'user');

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'connectToCoach');
      throw new Error('Failed to connect to coach. Please check the code and try again.');
    }
  }

  /**
   * Remove coach access for an athlete (hard delete)
   */
  async removeCoachAssignment(
    params: string | { athleteId?: string; coachId?: string }
  ): Promise<void> {
    // Create a unique key for this removal request
    const requestKey = typeof params === 'string'
      ? `athlete_${params}`
      : `coach_${params.coachId || 'unknown'}_athlete_${params.athleteId || 'current'}`;

    // Check if this request is already in progress
    if (this.pendingRemovals.has(requestKey)) {
      console.warn('Coach removal already in progress for:', requestKey);
      return;
    }

    try {
      // Mark this request as pending
      this.pendingRemovals.add(requestKey);

      const payload: Record<string, string> = {};

      if (typeof params === 'string') {
        payload.athlete_id = params;
      } else {
        const { athleteId, coachId } = params;
        if (athleteId) {
          payload.athlete_id = athleteId;
        }
        if (coachId) {
          payload.coach_id = coachId;
        }
      }

      const response = await apiClient.post(`/users/remove-coach-access/`, payload);

      // Check if successful
      if (response.success) {
        errorLogger.addBreadcrumb('Coach assignment removed successfully', 'user');
        return;
      }

      // Handle error response - check if it's a 404 but with detailed error info
      const errorDetails = response.error?.details as any;
      const isNotFoundError = response.error?.status === 404 || response.error?.code === '404';

      // If we get a 404 with "No active coaching relationship", it might already be removed
      // Log it but don't throw - relationship is already gone
      if (isNotFoundError && response.error?.message?.includes('No active coaching relationship')) {
        console.warn('Coach relationship already removed or does not exist:', response.error.message);
        errorLogger.addBreadcrumb('Coach relationship not found (may already be removed)', 'user');
        return;
      }

      // For all other errors, throw
      throw new Error(response.error?.message ?? 'Failed to remove coach assignment');

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'removeCoachAssignment');
      throw error;
    } finally {
      // Always clear the pending request
      this.pendingRemovals.delete(requestKey);
    }
  }

  /**
   * Upload user avatar - now uses real backend API
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('profile_image', file);

      const response = await apiClient.post(`/users/${userId}/upload_profile_image/`, formData);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to upload profile image');
      }

      const updatedProfile = await this.getUserProfile(userId);

      errorLogger.addBreadcrumb('Profile image uploaded successfully', 'user');
      return updatedProfile.avatarUrl || '';

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'uploadAvatar');
      throw error;
    }
  }

  /**
   * Remove user avatar - now uses real backend API
   */
  async removeAvatar(userId: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/users/${userId}/remove_profile_image/`);
      if (!response.success) {
        throw new Error(response.error?.message || 'Failed to remove profile image');
      }

      errorLogger.addBreadcrumb('Profile image removed successfully', 'user');

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'removeAvatar');
      throw error;
    }
  }

  /**
   * Delete user account
   */
  async deleteAccount(userId: string, password: string): Promise<void> {
    try {
      const response = await apiClient.delete(`/users/${userId}`, {
        body: { password }
      });
      
      if (!response.success) {
        throw new Error('Failed to delete account');
      }

      errorLogger.addBreadcrumb('Account deleted', 'user');

    } catch (error) {
      errorLogger.logAsyncError(error as Error, 'deleteAccount');
      throw new Error('Failed to delete account. Please try again.');
    }
  }

  /**
   * Mock user profile for development
   */
  private getMockUserProfile(userId: string): User {
    return {
      id: userId,
      username: 'mockuser',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+33123456789',
      countryCode: 'FR',
      role: 'athlete',
      bio: 'Passionate triathlete training for my first Ironman.',
      avatar: `https://api.dicebear.com/7.x/avatars/svg?seed=${userId}`,
      performanceMetrics: {
        totalWorkouts: 150,
        weeklyAverage: 4.2,
        monthlyGoal: 20,
        personalBests: {
          '5K': '18:45',
          '10K': '39:12',
          halfMarathon: '1:25:30'
        },
        recentActivities: [],
        completionRate: 87,
        streakDays: 12
      }
    };
  }

  /**
   * Mock athletes data for development
   */
  private getMockAthletes(): User[] {
    return [
      {
        id: '1',
        username: 'athlete1',
        firstName: 'Sarah',
        lastName: 'Johnson',
        email: 'sarah.johnson@example.com',
        role: 'athlete'
      },
      {
        id: '2',
        username: 'athlete2',
        firstName: 'Mike',
        lastName: 'Wilson',
        email: 'mike.wilson@example.com',
        role: 'athlete'
      }
    ];
  }

  /**
   * Mock coaches data for development
   */
  private getMockCoaches(): User[] {
    return [
      {
        id: '1',
        username: 'coach1',
        firstName: 'David',
        lastName: 'Smith',
        email: 'david.smith@example.com',
        role: 'coach'
      }
    ];
  }
}

// Export singleton instance
export const userService = new UserService();

// Export class for testing
export { UserService };
