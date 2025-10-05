import { TrainingBlock } from '../types';

const DEFAULT_RUNNING_PACE_MIN_PER_KM = 5.0;
const DEFAULT_CYCLING_PACE_MIN_PER_KM = 2.0; // ~30 km/h
const DEFAULT_SWIM_PACE_MIN_PER_KM = 16.0; // 1:36 per 100m
const DEFAULT_OTHER_PACE_MIN_PER_KM = 5.5;

function parseNumber(value?: string | number | null): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  const str = String(value).trim();
  if (!str) {
    return undefined;
  }

  const numeric = Number(str);
  if (!Number.isNaN(numeric)) {
    return numeric;
  }

  return undefined;
}

function parseDurationToMinutes(duration?: string | number | null, unit?: string | null): number | undefined {
  if (duration === null || duration === undefined) {
    return undefined;
  }

  const numeric = parseNumber(duration);
  if (numeric !== undefined) {
    switch ((unit || 'min').toLowerCase()) {
      case 'sec':
      case 'second':
      case 'seconds':
        return numeric / 60;
      case 'hour':
      case 'hr':
      case 'hours':
        return numeric * 60;
      default:
        return numeric;
    }
  }

  const str = String(duration).trim();
  if (str.includes(':')) {
    const parts = str.split(':').map((part) => Number(part));
    if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      if ([hours, minutes, seconds].every((part) => Number.isFinite(part))) {
        return hours * 60 + minutes + seconds / 60;
      }
    }
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      if ([minutes, seconds].every((part) => Number.isFinite(part))) {
        return minutes + seconds / 60;
      }
    }
  }

  return undefined;
}

function parseDistanceToKilometers(distance?: string | number | null, unit?: string | null, intervalType?: string | null): number | undefined {
  if (distance === null || distance === undefined) {
    return undefined;
  }

  const numeric = parseNumber(distance);
  if (numeric === undefined) {
    return undefined;
  }

  let normalizedUnit = (unit || '').toLowerCase();

  if (!normalizedUnit && (intervalType || '').toLowerCase() === 'distance') {
    // Assume kilometers for small values, meters for larger by default
    normalizedUnit = numeric <= 10 ? 'km' : 'm';
  }

  if (!normalizedUnit) {
    normalizedUnit = 'km';
  }
  switch (normalizedUnit) {
    case 'km':
    case 'kilometer':
    case 'kilometers':
      return numeric;
    case 'm':
    case 'meter':
    case 'meters':
      return numeric / 1000;
    case 'mile':
    case 'miles':
      return numeric * 1.60934;
    case 'yard':
    case 'yards':
      return numeric * 0.0009144;
    default:
      return numeric;
  }
}

function getDefaultPaceMinutesPerKm(sport?: string | null): number {
  switch ((sport || '').toLowerCase()) {
    case 'cycling':
      return DEFAULT_CYCLING_PACE_MIN_PER_KM;
    case 'swimming':
      return DEFAULT_SWIM_PACE_MIN_PER_KM;
    case 'running':
      return DEFAULT_RUNNING_PACE_MIN_PER_KM;
    default:
      return DEFAULT_OTHER_PACE_MIN_PER_KM;
  }
}

function computeScaledPace(baseMinutesPerKm: number, intensity?: number): number {
  const percent = intensity && intensity > 0 ? intensity : 100;
  const ratio = percent / 100;
  if (ratio <= 0) {
    return baseMinutesPerKm;
  }
  return baseMinutesPerKm / ratio;
}

function estimatePaceMinutesPerKm(intensityUnit?: string | null, intensityValue?: number, sport?: string | null): number {
  const unit = (intensityUnit || '').toLowerCase();
  const intensity = intensityValue ?? undefined;

  if (unit === 'heart_rate' || unit === 'hr') {
    if (!intensity) {
      return getDefaultPaceMinutesPerKm(sport);
    }

    if (intensity <= 65) return 6.2;
    if (intensity <= 75) return 5.6;
    if (intensity <= 85) return 5.0;
    if (intensity <= 92) return 4.5;
    if (intensity <= 98) return 4.2;
    return 4.0;
  }

  if (unit === 'mas') {
    const baseMasPace = 3.3; // ~18 km/h at 100%
    return computeScaledPace(baseMasPace, intensity);
  }

  if (unit === 'fpp') {
    const baseFppPace = 3.8; // threshold pace baseline
    return computeScaledPace(baseFppPace, intensity);
  }

  if (unit === 'css') {
    const baseCssPace = DEFAULT_SWIM_PACE_MIN_PER_KM; // swim baseline
    return computeScaledPace(baseCssPace, intensity);
  }

  return getDefaultPaceMinutesPerKm(sport);
}

function getRepetitions(value?: number | null): number {
  if (value === null || value === undefined) {
    return 1;
  }
  const numeric = Math.max(1, Math.round(value));
  return Number.isFinite(numeric) ? numeric : 1;
}

function calculateBlockMinutes(block: TrainingBlock, sport?: string | null): number {
  const reps = getRepetitions(block.repetitions);
  let minutes = 0;

  const children = Array.isArray(block.children)
    ? (block.children.filter(Boolean) as TrainingBlock[])
    : [];

  if (children.length > 0) {
    const childMinutes = children.reduce((total, child) => total + calculateBlockMinutes(child, sport), 0);
    return childMinutes * reps;
  }

  const durationMinutes = parseDurationToMinutes(block.duration, block.durationUnit);
  if (durationMinutes !== undefined) {
    minutes += durationMinutes;
  } else {
    const distanceKm = parseDistanceToKilometers(block.distance, block.distanceUnit, block.intervalType);
    if (distanceKm !== undefined && distanceKm > 0) {
      const intensity = block.intensity !== undefined ? Number(block.intensity) : undefined;
      const pace = estimatePaceMinutesPerKm(block.intensityUnit, intensity, sport);
      minutes += distanceKm * pace;
    }
  }

  return minutes * reps;
}

export function estimateTrainingDurationMinutes(trainingBlocks: TrainingBlock[] | undefined, sport?: string | null): number | undefined {
  if (!trainingBlocks || trainingBlocks.length === 0) {
    return undefined;
  }

  const total = trainingBlocks
    .filter(Boolean)
    .reduce((sum, block) => sum + calculateBlockMinutes(block, sport), 0);

  if (!Number.isFinite(total) || total <= 0) {
    return undefined;
  }

  return total;
}
