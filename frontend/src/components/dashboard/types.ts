// Dashboard-specific types and interfaces
import { User } from '../../types';

export interface DashboardProps {
  user: User;
  onNavigate?: (view: 'calendar' | 'metrics' | 'profile' | 'coach' | 'device-sync', options?: NavigationOptions) => void;
  onAddEvent?: () => void;
}

export interface NavigationOptions {
  athleteFilter?: {
    id: string;
    name: string;
    sport?: string;
  };
}

export interface Athlete {
  id: string;
  name: string;
  username: string;
  email: string;
  sport: string;
  status: 'active' | 'inactive';
  upcomingEvents: number;
  completionRate: number | 'N/A';
  lastActivity: string;
  initials: string;
  phone?: string;
  joinedDate?: string;
  bio?: string;
  sports: string[];
  achievements?: string[];
  mas?: number | string;
  fpp?: number | string;
  css?: number | string;
  cssDisplay?: string;
  yearsTraining?: number;
  avatarUrl?: string;
}

export interface Activity {
  id: string;
  type: 'training' | 'race' | 'achievement' | 'custom' | 'profile_update';
  title: string;
  time: string;
  athlete?: string;
  sport?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

export interface CoachStats {
  totalAthletes: number;
  activeAthletes: number;
  avgCompletion: number;
  upcomingTrainings: number;
  totalEvents: number;
}
