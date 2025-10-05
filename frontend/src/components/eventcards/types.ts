export interface TrainingBlock {
  id: string;
  type: 'warmup' | 'run' | 'recovery' | 'cooldown' | 'interval' | 'custom' | 'rest';
  name: string;
  duration?: string;
  durationUnit?: string;
  distance?: string;
  distanceUnit?: string;
  intensity?: number;
  intensityUnit?: string;
  repetitions?: number;
  children?: TrainingBlock[];
  notes?: string;
  intervalType?: 'time' | 'distance';
  trigger?: 'lap_button' | 'time' | 'distance';
  distanceTime?: string;
}
