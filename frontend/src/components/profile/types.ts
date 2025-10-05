// Profile component shared types and interfaces
export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  countryCode?: string;
  role: string;
  avatarUrl?: string;
  avatarColor?: string;
}

export interface ProfileProps {
  user: User;
  currentRole: string;
  onLogout?: () => void;
}

export interface PerformanceMetrics {
  mas: string; // Maximum Aerobic Speed
  fpp: string; // Functional Power Threshold
  css: string; // Critical Swim Speed in mm:ss/100m format
}

export interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  countryCode: string;
  dateOfBirth: string;
  weight: string;
  height: string;
}

export interface ProfessionalDetails {
  yearsExperience: string;
  about: string;
  certifications: Certification[];
  achievements: Achievement[];
  sportsInvolved?: string[]; // For athletes
}

export interface Certification {
  id: string;
  sport: string;
  title: string;
  issuer: string;
  year: string;
  isCustom: boolean;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  year: string;
  category: string;
}

export interface CoachInfo {
  id: string;
  firstName: string;
  lastName: string;
  username?: string;
  email: string;
  phone: string;
  specialty: string;
  yearsExperience: number;
  certifications: string[];
  coachCode: string;
  bio?: string;
  location?: string;
  joinedDate?: string;
  totalAthletes?: number;
  achievements?: string[];
  avatarUrl?: string;
}