import type { EventData, TrainingBlock } from '../components/eventmodal/types';

type UpdateNormalizationResult = {
  endpoint: string;
  payload: Record<string, unknown>;
};

const COLOR_HEX_TO_CHOICE: Record<string, string> = {
  '#ef4444': 'red',
  '#3b82f6': 'blue',
  '#22c55e': 'green',
  '#eab308': 'yellow',
  '#8b5cf6': 'purple',
  '#f97316': 'orange',
};

const DURATION_UNIT_MAP: Record<string, string> = {
  min: 'minutes',
  mins: 'minutes',
  minute: 'minutes',
  minutes: 'minutes',
  sec: 'seconds',
  secs: 'seconds',
  second: 'seconds',
  seconds: 'seconds',
  hr: 'hours',
  hrs: 'hours',
  hour: 'hours',
  hours: 'hours',
};

const DISTANCE_UNIT_MAP: Record<string, string> = {
  m: 'meters',
  meter: 'meters',
  meters: 'meters',
  km: 'kilometers',
  k: 'kilometers',
  kilometer: 'kilometers',
  kilometers: 'kilometers',
};

export function normalizeEventForUpdate(event: EventData & { id: string }): UpdateNormalizationResult {
  const endpointMap: Record<EventData['type'], string> = {
    training: `/training/${event.id}/`,
    race: `/races/${event.id}/`,
    custom: `/custom-events/${event.id}/`,
  };

  const endpoint = endpointMap[event.type];
  if (!endpoint) {
    throw new Error('Unsupported event type for update.');
  }

  switch (event.type) {
    case 'training':
      return {
        endpoint,
        payload: buildTrainingUpdatePayload(event),
      };
    case 'race':
      return {
        endpoint,
        payload: buildRaceUpdatePayload(event),
      };
    case 'custom':
    default:
      return {
        endpoint,
        payload: buildCustomUpdatePayload(event),
      };
  }
}

function buildTrainingUpdatePayload(event: EventData): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (event.title?.trim()) {
    payload.title = event.title.trim();
  }

  const combinedDate = combineDateAndTime(event.date ?? event.dateStart, event.time);
  if (combinedDate) {
    payload.date = combinedDate;
  }

  const sanitizedTime = sanitizeTime(event.time);
  if (sanitizedTime) {
    payload.time = sanitizedTime;
  }

  const duration = toDurationString(event.duration);
  if (duration) {
    payload.duration = duration;
  }

  if (event.sport?.trim()) {
    payload.sport = event.sport.trim();
  }

  const trainingData = mapTrainingBlocksToTrainingData(event.trainingBlocks, event.trainingName);
  if (trainingData && Object.keys(trainingData).length > 0) {
    payload.training_data = trainingData;
    // Debug: Log the training data being sent
    console.log('🔍 Training data being sent to backend:', JSON.stringify(trainingData, null, 2));
  }

  const notes = event.description || event.notes;
  if (typeof notes === 'string') {
    payload.notes = notes.trim();
  }

  if (event.athlete) {
    payload.athlete = event.athlete;
  }

  return removeUndefined(payload);
}

function buildRaceUpdatePayload(event: EventData): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (event.title?.trim()) {
    payload.title = event.title.trim();
  }

  const combinedDate = combineDateAndTime(event.dateStart ?? event.date, event.time);
  if (combinedDate) {
    payload.date = combinedDate;
  }

  if (event.sport?.trim()) {
    payload.sport = event.sport.trim();
  }

  if (typeof event.location === 'string') {
    payload.location = event.location.trim();
  }

  if (typeof event.distance === 'string') {
    payload.distance = event.distance.trim() || null;
  }

  if (typeof event.description === 'string') {
    payload.description = event.description.trim();
  }

  if (typeof event.timeObjective === 'string' && event.timeObjective.trim() !== '') {
    payload.target_time = toDurationString(event.timeObjective);
  } else {
    payload.target_time = null;
  }

  if (event.athlete) {
    payload.athlete = event.athlete;
  }

  return removeUndefined(payload);
}

function buildCustomUpdatePayload(event: EventData): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  if (event.title?.trim()) {
    payload.title = event.title.trim();
  }

  const startDate = combineDateAndTime(event.dateStart ?? event.date, null);
  if (startDate) {
    payload.date = startDate;
  }

  let endDate: string | null | undefined = undefined;
  if (event.dateEnd === null) {
    endDate = null;
  } else if (event.dateEnd) {
    endDate = combineDateAndTime(event.dateEnd, null);
  }

  if (endDate && startDate && endDate < startDate) {
    endDate = startDate;
  }

  if (endDate !== undefined) {
    payload.date_end = endDate;
  }

  if (typeof event.location === 'string') {
    payload.location = event.location.trim();
  }

  const mappedColor = mapCustomEventColor(event.customEventColor || event.color);
  if (mappedColor) {
    payload.event_color = mappedColor;
  }

  if (typeof event.description === 'string') {
    payload.description = event.description.trim();
  }

  if (event.athlete) {
    payload.athlete = event.athlete;
  }

  return removeUndefined(payload);
}

function combineDateAndTime(dateInput?: string | Date | null, timeInput?: string | null): string | undefined {
  if (!dateInput) {
    return undefined;
  }

  let datePart: string | undefined;

  if (dateInput instanceof Date) {
    const year = dateInput.getFullYear();
    const month = (dateInput.getMonth() + 1).toString().padStart(2, '0');
    const day = dateInput.getDate().toString().padStart(2, '0');
    datePart = `${year}-${month}-${day}`;
  } else {
    const trimmed = dateInput.trim();
    if (!trimmed) {
      return undefined;
    }

    if (trimmed.includes('T')) {
      const [dateSection, timeSection] = trimmed.split('T');
      datePart = dateSection;

      const sanitizedExistingTime = sanitizeIsoTimeFragment(timeSection);
      const finalTime = timeInput ? ensureSeconds(timeInput) : sanitizedExistingTime;
      if (!datePart || !finalTime) {
        return undefined;
      }
      return `${datePart}T${finalTime}Z`;
    }

    datePart = trimmed;
  }

  if (!datePart) {
    return undefined;
  }

  const sanitizedTime = sanitizeTime(timeInput);
  if (!sanitizedTime) {
    return datePart;
  }

  return `${datePart}T${sanitizedTime}`;
}

function sanitizeTime(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  return ensureSeconds(trimmed);
}

function ensureSeconds(timeValue: string): string {
  if (timeValue.includes(':')) {
    const parts = timeValue.split(':');
    if (parts.length === 2) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
    }
    if (parts.length === 3) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    }
  }
  return timeValue;
}

function sanitizeIsoTimeFragment(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const withoutZone = value.replace('Z', '').split('+')[0].split('-')[0].split('.')[0];
  if (!withoutZone) {
    return undefined;
  }

  return ensureSeconds(withoutZone);
}

function toDurationString(value?: string | number | null): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const numeric = typeof value === 'number' ? value : Number(String(value).trim());
  if (Number.isNaN(numeric) || numeric < 0) {
    return undefined;
  }

  const totalSeconds = Math.round(numeric * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((unit) => unit.toString().padStart(2, '0'))
    .join(':');
}

export function mapTrainingBlocksToTrainingData(blocks?: TrainingBlock[], trainingName?: string): Record<string, unknown> {
  if (!blocks || blocks.length === 0) {
    return {};
  }

  // Debug: Log what we're converting
  console.log('🔧 Converting training blocks:', JSON.stringify(blocks, null, 2));

  const trainingData: Record<string, unknown> = {};

  // Add training name if provided
  if (trainingName?.trim()) {
    trainingData.name = trainingName.trim();
  }

  const intervals: Array<Record<string, unknown>> = [];
  const restPeriods: Array<Record<string, unknown>> = [];

  blocks.forEach((block, index) => {
    const type = block.type?.toLowerCase();
    const name = block.name?.trim() || defaultNameForType(type);

    if (type === 'warmup' || type === 'cooldown') {
      const durationValue = toPositiveNumber(block.duration);
      if (!durationValue) {
        return;
      }

      const unit = mapDurationUnit(block.durationUnit) || 'minutes';
      const phasePayload: Record<string, unknown> = {
        name,
        duration: durationValue,
        unit,
      };

      // Add intensity data for warmup/cooldown
      if (block.intensity !== undefined && block.intensity !== null) {
        phasePayload.intensity = block.intensity;
      }
      if (block.intensityUnit) {
        phasePayload.zone_type = mapIntensityUnitToBackend(block.intensityUnit);
      }
      if (block.notes && block.notes.trim()) {
        phasePayload.notes = block.notes.trim();
      }

      if (type === 'warmup') {
        trainingData.warmup = phasePayload;
      } else {
        trainingData.cooldown = phasePayload;
      }
      return;
    }

    if (type === 'interval') {
      // Check if this interval has actual children (not just an empty array)
      const hasChildren = Array.isArray(block.children) && block.children.length > 0;

      if (hasChildren) {
        // Interval with sub-intervals (nested structure)
        console.log(`📦 Processing interval "${name}" with ${block.children!.length} children`);
        const subIntervals = mapChildrenToSubIntervals(block.children!);
        console.log(`  ➡️ Converted to ${subIntervals.length} sub_intervals`);

        if (subIntervals.length > 0) {
          // Successfully created sub-intervals
          const complexInterval: Record<string, unknown> = {
            name,
            repetitions: ensurePositiveInt(block.repetitions, 1),
            sub_intervals: subIntervals,
          };

          if (block.notes && block.notes.trim()) {
            complexInterval.notes = block.notes.trim();
          }

          intervals.push(complexInterval);
        } else {
          // No valid sub-intervals created - skip this interval entirely
          console.warn(`  ⚠️ SKIPPED: Interval "${name}" has children but no valid sub_intervals were created!`);
          console.warn(`  💡 Make sure each sub-interval has either duration (for time-based) or distance (for distance-based) set.`);
        }
        // Don't process simple interval logic for complex intervals
        return;
      } else {
        // Simple interval without children
        const intervalType = block.intervalType === 'distance' ? 'distance' : 'time';
        const measurementValue = intervalType === 'distance' ? block.distance : block.duration;
        const numericValue = toPositiveNumber(measurementValue);

        if (!numericValue) {
          console.warn(`  ⚠️ Simple interval "${name}" has no valid ${intervalType} value, skipping`);
          return;
        }

        const unit = intervalType === 'distance'
          ? mapDistanceUnit(block.distanceUnit) || 'meters'
          : mapDurationUnit(block.durationUnit) || 'minutes';

        const intervalPayload: Record<string, unknown> = {
          name,
          type: intervalType,
          duration_or_distance: numericValue,
          unit,
          repetitions: ensurePositiveInt(block.repetitions, 1),
        };

        // Add intensity data for simple intervals
        if (block.intensity !== undefined && block.intensity !== null) {
          intervalPayload.intensity = block.intensity;
        }
        if (block.intensityUnit) {
          intervalPayload.zone_type = mapIntensityUnitToBackend(block.intensityUnit);
        }
        if (block.notes && block.notes.trim()) {
          intervalPayload.notes = block.notes.trim();
        }

        intervals.push(intervalPayload);
      }
      return;
    }

    if (type === 'rest') {
      const durationValue = toPositiveNumber(block.duration);
      if (!durationValue) {
        return;
      }

      const restPayload: Record<string, unknown> = {
        name,
        duration: durationValue,
        unit: mapDurationUnit(block.durationUnit) || 'minutes',
      };

      if (block.notes && block.notes.trim()) {
        restPayload.notes = block.notes.trim();
      }

      restPeriods.push(restPayload);
      return;
    }
  });

  if (intervals.length > 0) {
    trainingData.intervals = intervals;
  }

  if (restPeriods.length > 0) {
    trainingData.rest_periods = restPeriods;
  }

  console.log(`🏁 Final training data:`, JSON.stringify(trainingData, null, 2));
  if (intervals.length > 0) {
    intervals.forEach((interval, idx) => {
      console.log(`  📋 Interval ${idx}:`, {
        name: interval.name,
        hasSubIntervals: !!interval.sub_intervals,
        subIntervalsCount: interval.sub_intervals?.length || 0,
        hasType: 'type' in interval,
        hasDurationOrDistance: 'duration_or_distance' in interval,
      });
    });
  }

  return trainingData;
}

/**
 * Maps children blocks to sub_intervals structure expected by backend
 */
function mapChildrenToSubIntervals(children: TrainingBlock[]): Array<Record<string, unknown>> {
  const subIntervals: Array<Record<string, unknown>> = [];

  console.log(`  🔍 mapChildrenToSubIntervals: Processing ${children.length} children`);

  // Group children into work/rest pairs
  // Assumption: children alternate between work (interval) and rest blocks
  for (let i = 0; i < children.length; i++) {
    const child = children[i];
    const childType = child.type?.toLowerCase();

    console.log(`    [${i}] Child:`, {
      type: childType,
      name: child.name,
      intervalType: child.intervalType,
      duration: child.duration,
      distance: child.distance,
      durationUnit: child.durationUnit,
      distanceUnit: child.distanceUnit,
    });

    if (childType === 'interval') {
      // This is a work phase
      const intervalType = child.intervalType === 'distance' ? 'distance' : 'time';
      const measurementValue = intervalType === 'distance' ? child.distance : child.duration;
      console.log(`      📊 intervalType: ${intervalType}, measurementValue: ${measurementValue}`);
      const numericValue = toPositiveNumber(measurementValue);

      if (!numericValue) {
        console.warn(`      ⚠️ SKIPPED: No valid numeric value for ${intervalType}`);
        continue;
      }

      const unit = intervalType === 'distance'
        ? mapDistanceUnit(child.distanceUnit) || 'meters'
        : mapDurationUnit(child.durationUnit) || 'minutes';

      const workPayload: Record<string, unknown> = {
        name: child.name?.trim() || 'Work',
        type: intervalType,
        duration_or_distance: numericValue,
        unit,
      };

      // Add intensity data for work phase
      if (child.intensity !== undefined && child.intensity !== null) {
        workPayload.intensity = child.intensity;
      }
      if (child.intensityUnit) {
        workPayload.zone_type = mapIntensityUnitToBackend(child.intensityUnit);
      }

      const subInterval: Record<string, unknown> = {
        work: workPayload,
      };

      // Check if next child is a rest block
      const nextChild = children[i + 1];
      if (nextChild && nextChild.type?.toLowerCase() === 'rest') {
        const restDuration = toPositiveNumber(nextChild.duration);
        if (restDuration) {
          const restPayload: Record<string, unknown> = {
            name: nextChild.name?.trim() || 'Recovery',
            duration: restDuration,
            unit: mapDurationUnit(nextChild.durationUnit) || 'minutes',
          };
          if (nextChild.notes && nextChild.notes.trim()) {
            restPayload.notes = nextChild.notes.trim();
          }
          subInterval.rest = restPayload;
        }
        i++; // Skip the rest block since we've processed it
      }

      subIntervals.push(subInterval);
    } else if (childType === 'rest') {
      // Standalone rest block (not paired with work)
      const restDuration = toPositiveNumber(child.duration);
      if (restDuration) {
        const restPayload: Record<string, unknown> = {
          name: child.name?.trim() || 'Recovery',
          duration: restDuration,
          unit: mapDurationUnit(child.durationUnit) || 'minutes',
        };
        if (child.notes && child.notes.trim()) {
          restPayload.notes = child.notes.trim();
        }
        subIntervals.push({
          rest: restPayload,
        });
      }
    }
  }

  return subIntervals;
}

/**
 * Maps frontend intensity unit to backend zone_type
 */
function mapIntensityUnitToBackend(unit?: TrainingBlock['intensityUnit']): string | undefined {
  if (!unit) {
    return undefined;
  }

  const map: Record<string, string> = {
    'heart_rate': 'HR',
    'MAS': 'MAS',
    'FPP': 'FPP',
    'CSS': 'CSS',
  };

  return map[unit];
}

function defaultNameForType(type?: string): string {
  if (!type) {
    return 'Segment';
  }

  switch (type) {
    case 'warmup':
      return 'Warm Up';
    case 'cooldown':
      return 'Cool Down';
    case 'interval':
      return 'Interval';
    case 'rest':
      return 'Recovery';
    default:
      return type.charAt(0).toUpperCase() + type.slice(1);
  }
}

function mapDurationUnit(unit?: string | null): string | undefined {
  if (!unit) {
    return undefined;
  }

  return DURATION_UNIT_MAP[unit.trim().toLowerCase()] ?? undefined;
}

function mapDistanceUnit(unit?: string | null): string | undefined {
  if (!unit) {
    return undefined;
  }

  return DISTANCE_UNIT_MAP[unit.trim().toLowerCase()] ?? undefined;
}

function toPositiveNumber(value?: string | number | null): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  const numeric = typeof value === 'number' ? value : Number(String(value).trim());
  if (Number.isNaN(numeric) || numeric <= 0) {
    return undefined;
  }

  return numeric;
}

function ensurePositiveInt(value: string | number | undefined, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(String(value ?? '').trim());
  if (Number.isNaN(numeric) || numeric <= 0) {
    return fallback;
  }
  return Math.floor(numeric);
}

function mapCustomEventColor(color?: string | null): string | undefined {
  if (!color) {
    return undefined;
  }

  return COLOR_HEX_TO_CHOICE[color.trim().toLowerCase()];
}

function removeUndefined(payload: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(payload).reduce<Record<string, unknown>>((acc, [key, value]) => {
    if (value !== undefined) {
      acc[key] = value;
    }
    return acc;
  }, {});
}

/**
 * Reverse mapper: Converts backend training_data JSON to frontend TrainingBlock[]
 * Used when loading existing training sessions for editing
 */
export function mapTrainingDataToBlocks(trainingData: any): TrainingBlock[] {
  if (!trainingData || typeof trainingData !== 'object') {
    return [];
  }

  // Debug: Log what we're receiving from backend
  console.log('🔄 Converting training_data from backend:', JSON.stringify(trainingData, null, 2));

  const blocks: TrainingBlock[] = [];

  // Map warmup
  if (trainingData.warmup) {
    const warmup = trainingData.warmup;
    blocks.push({
      id: `warmup-${Date.now()}`,
      type: 'warmup',
      name: warmup.name || 'Warm Up',
      duration: String(warmup.duration || ''),
      durationUnit: mapBackendUnitToFrontend(warmup.unit, 'duration'),
      intensity: warmup.intensity,
      intensityUnit: mapBackendZoneTypeToFrontend(warmup.zone_type),
      intervalType: 'time',
      notes: warmup.notes,
    });
  }

  // Map intervals
  if (Array.isArray(trainingData.intervals)) {
    trainingData.intervals.forEach((interval: any, index: number) => {
      if (interval.sub_intervals && Array.isArray(interval.sub_intervals) && interval.sub_intervals.length > 0) {
        // Interval with nested sub-intervals
        blocks.push({
          id: `interval-${Date.now()}-${index}`,
          type: 'interval',
          name: interval.name || 'Main Set',
          repetitions: interval.repetitions || 1,
          children: mapBackendSubIntervalsToChildren(interval.sub_intervals),
          notes: interval.notes,
        });
      } else {
        // Simple interval
        const intervalType = interval.type === 'distance' ? 'distance' : 'time';
        blocks.push({
          id: `interval-${Date.now()}-${index}`,
          type: 'interval',
          name: interval.name || 'Interval',
          duration: intervalType === 'time' ? String(interval.duration_or_distance || '') : undefined,
          distance: intervalType === 'distance' ? String(interval.duration_or_distance || '') : undefined,
          durationUnit: intervalType === 'time' ? mapBackendUnitToFrontend(interval.unit, 'duration') : undefined,
          distanceUnit: intervalType === 'distance' ? mapBackendUnitToFrontend(interval.unit, 'distance') : undefined,
          intensity: interval.intensity,
          intensityUnit: mapBackendZoneTypeToFrontend(interval.zone_type),
          repetitions: interval.repetitions || 1,
          intervalType,
          notes: interval.notes,
        });
      }
    });
  }

  // Map rest periods (standalone rest blocks)
  if (Array.isArray(trainingData.rest_periods)) {
    trainingData.rest_periods.forEach((rest: any, index: number) => {
      blocks.push({
        id: `rest-${Date.now()}-${index}`,
        type: 'rest',
        name: rest.name || 'Recovery',
        duration: String(rest.duration || ''),
        durationUnit: mapBackendUnitToFrontend(rest.unit, 'duration'),
        notes: rest.notes,
      });
    });
  }

  // Map cooldown
  if (trainingData.cooldown) {
    const cooldown = trainingData.cooldown;
    blocks.push({
      id: `cooldown-${Date.now()}`,
      type: 'cooldown',
      name: cooldown.name || 'Cool Down',
      duration: String(cooldown.duration || ''),
      durationUnit: mapBackendUnitToFrontend(cooldown.unit, 'duration'),
      intensity: cooldown.intensity,
      intensityUnit: mapBackendZoneTypeToFrontend(cooldown.zone_type),
      intervalType: 'time',
      notes: cooldown.notes,
    });
  }

  return blocks;
}

/**
 * Maps backend sub_intervals to frontend children TrainingBlock[]
 */
function mapBackendSubIntervalsToChildren(subIntervals: any[]): TrainingBlock[] {
  const children: TrainingBlock[] = [];

  subIntervals.forEach((subInterval: any, index: number) => {
    // Map work phase
    if (subInterval.work) {
      const work = subInterval.work;
      const intervalType = work.type === 'distance' ? 'distance' : 'time';

      children.push({
        id: `work-${Date.now()}-${index}`,
        type: 'interval',
        name: work.name || 'Work',
        duration: intervalType === 'time' ? String(work.duration_or_distance || '') : undefined,
        distance: intervalType === 'distance' ? String(work.duration_or_distance || '') : undefined,
        durationUnit: intervalType === 'time' ? mapBackendUnitToFrontend(work.unit, 'duration') : undefined,
        distanceUnit: intervalType === 'distance' ? mapBackendUnitToFrontend(work.unit, 'distance') : undefined,
        intensity: work.intensity,
        intensityUnit: mapBackendZoneTypeToFrontend(work.zone_type),
        intervalType,
        notes: work.notes,
      });
    }

    // Map rest phase
    if (subInterval.rest) {
      const rest = subInterval.rest;
      children.push({
        id: `rest-${Date.now()}-${index}`,
        type: 'rest',
        name: rest.name || 'Recovery',
        duration: String(rest.duration || ''),
        durationUnit: mapBackendUnitToFrontend(rest.unit, 'duration'),
        notes: rest.notes,
      });
    }
  });

  return children;
}

/**
 * Maps backend unit strings to frontend unit types
 */
function mapBackendUnitToFrontend(unit?: string, type?: 'duration' | 'distance'): any {
  if (!unit) {
    return undefined;
  }

  if (type === 'duration') {
    const durationMap: Record<string, 'min' | 'sec'> = {
      'minutes': 'min',
      'seconds': 'sec',
      'hours': 'min', // Convert hours to minutes for display
    };
    return durationMap[unit.toLowerCase()];
  }

  if (type === 'distance') {
    const distanceMap: Record<string, 'm' | 'km'> = {
      'meters': 'm',
      'kilometers': 'km',
    };
    return distanceMap[unit.toLowerCase()];
  }

  return undefined;
}

/**
 * Maps backend zone_type to frontend intensityUnit
 */
function mapBackendZoneTypeToFrontend(zoneType?: string): TrainingBlock['intensityUnit'] {
  if (!zoneType) {
    return undefined;
  }

  const map: Record<string, TrainingBlock['intensityUnit']> = {
    'HR': 'heart_rate',
    'MAS': 'MAS',
    'FPP': 'FPP',
    'CSS': 'CSS',
  };

  return map[zoneType.toUpperCase()];
}

/**
 * Convert training_data to IntervalComponent[] for template loading
 * This is used when loading saved trainings as templates
 */
export function convertTrainingDataToComponents(training_data: any): any[] {
  // Convert training_data structure to IntervalComponent[] for template loading
  const blocks = mapTrainingDataToBlocks(training_data);

  return blocks.map(block => ({
    id: block.id,
    type: block.type,
    name: block.name,
    duration: block.duration,
    durationUnit: block.durationUnit,
    distance: block.distance,
    distanceUnit: block.distanceUnit,
    intensity: block.intensity,
    intensityUnit: block.intensityUnit,
    repetitions: block.repetitions,
    children: block.children,
    intervalType: block.intervalType,
  }));
}
