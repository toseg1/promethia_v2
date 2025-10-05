// Metrics-specific type definitions

export type MetricType = 'mas' | 'fpp' | 'css';
export type CalculationType = 'distance' | 'time';

export interface CalculationResults {
  speed: number; // km/h
  pace: string; // mm:ss format
  distance?: string;
  time?: string;
}

export interface MetricsUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export interface MetricsProps {
  user: MetricsUser;
  onNavigate?: (view: 'profile') => void;
}

export interface MetricConfig {
  type: MetricType;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
  units: string[];
  defaultUnit: string;
  presets: MetricsPreset[];
  setCalculationValue: (value: string) => void;
  getCalculationValue: () => string;
  validateValue: (value: string) => boolean;
}

export interface TimePreset {
  label: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export interface DistancePreset {
  label: string;
  value: string;
}

export interface CssPreset {
  label: string;
  value: string;
}