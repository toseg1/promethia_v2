// EventModal component shared types and interfaces

export interface EventData {
  id?: string;
  title: string;
  date: Date | string;
  startTime?: string;
  endTime?: string;
  type: 'training' | 'race' | 'custom';
  sport?: string;
  location?: string;
  description?: string;
  notes?: string;
  time?: string;
  duration?: string;
  athlete?: string;
  trainingBlocks?: TrainingBlock[];
  trainingName?: string; // Name of the training builder
  distance?: string;
  timeObjective?: string;
  dateStart?: string;
  dateEnd?: string;
  raceCategory?: string;
  customEventColor?: string;
  color?: string;
}

// Alias for compatibility
export type TrainingEvent = EventData;

export interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: EventData) => Promise<void>;
  selectedDate: Date | null;
  userRole: string;
  event?: TrainingEvent;
  onDelete?: (event: EventData) => Promise<void>;
}

export interface Sport {
  id: string;
  name: string;
  color: string;
}

export interface IntervalComponent {
  id: string;
  type: 'warmup' | 'interval' | 'rest' | 'cooldown' | 'repeat' | 'run' | 'recover';
  name: string;
  duration?: string;
  durationUnit?: 'min' | 'sec';
  distance?: string;
  distanceUnit?: 'm' | 'km';
  intensity?: number;
  intensityUnit?: 'heart_rate' | 'MAS' | 'FPP' | 'CSS';
  notes?: string;
  repetitions?: number;
  count?: number; // For repeat blocks
  children?: IntervalComponent[];
  trigger?: 'lap_button' | 'time' | 'distance';
  skipLastRecovery?: boolean;
  intervalType?: 'time' | 'distance'; // For interval toggle
}

export interface TrainingTemplate {
  id: string;
  sport: string;
  name: string;
  description: string;
  components: IntervalComponent[];
  isCustom?: boolean;
}

export interface TrainingBlock {
  id: string;
  type: 'warmup' | 'interval' | 'rest' | 'cooldown';
  name: string;
  duration?: string;
  durationUnit?: 'min' | 'sec';
  distance?: string;
  distanceUnit?: 'm' | 'km';
  intensity?: number;
  intensityUnit?: 'heart_rate' | 'MAS' | 'FPP' | 'CSS';
  repetitions?: number;
  notes?: string;
  children?: TrainingBlock[];
  intervalType?: 'time' | 'distance';
}

export interface Athlete {
  id: string;
  name: string;
}

// Shared constants
export const trainingSports: Sport[] = [
  { id: 'running', name: 'Running', color: '#ef4444' },
  { id: 'cycling', name: 'Cycling', color: '#10b981' },
  { id: 'swimming', name: 'Swimming', color: '#3b82f6' },
  { id: 'strength', name: 'Strength', color: '#8b5cf6' },
  { id: 'other', name: 'Other', color: '#ec4899' }
];

export const raceSports: Sport[] = [
  { id: 'running', name: 'Running', color: '#ef4444' },
  { id: 'cycling', name: 'Cycling', color: '#10b981' },
  { id: 'swimming', name: 'Swimming', color: '#3b82f6' },
  { id: 'triathlon', name: 'Triathlon', color: '#f59e0b' },
  { id: 'other', name: 'Other', color: '#ec4899' }
];

export const customEventColors = [
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#eab308', // yellow
  '#8b5cf6', // purple
  '#f97316', // orange
];
