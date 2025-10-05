import i18n from '../../../i18n';

/**
 * Field validation utilities for Event Modal
 * Following the same pattern as authentication validation
 */

export interface FieldErrors {
  // Common fields
  title?: string;
  sport?: string;
  athlete?: string;

  // Training fields
  date?: string;
  duration?: string;
  time?: string;

  // Race fields
  dateStart?: string;
  location?: string;
  distance?: string;
  timeObjective?: string;

  // Custom event fields
  dateEnd?: string;
  customEventColor?: string;

  // General error
  general?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: FieldErrors;
}

/**
 * Validate common event fields (all event types)
 */
export function validateCommonFields(
  eventType: 'training' | 'race' | 'custom',
  title: string,
  selectedSport: string,
  selectedAthlete: string,
  userRole: string
): FieldErrors {
  const errors: FieldErrors = {};

  // Title is always required
  if (!title || !title.trim()) {
    errors.title = i18n.t('calendar:validation.title.required');
  } else if (title.trim().length < 2) {
    errors.title = i18n.t('calendar:validation.title.minLength', { min: 2 });
  } else if (title.trim().length > 100) {
    errors.title = i18n.t('calendar:validation.title.maxLength', { max: 100 });
  }

  // Sport is required for training and race events
  if ((eventType === 'training' || eventType === 'race') && !selectedSport) {
    errors.sport = i18n.t('calendar:validation.sport.required');
  }

  // Athlete is required for coaches
  if (userRole === 'coach' && !selectedAthlete) {
    errors.athlete = i18n.t('calendar:validation.athlete.required');
  }

  return errors;
}

/**
 * Validate training-specific fields
 */
export function validateTrainingFields(
  date: string,
  duration: string,
  time: string
): FieldErrors {
  const errors: FieldErrors = {};

  // Date is required
  if (!date || !date.trim()) {
    errors.date = i18n.t('calendar:validation.training.dateRequired');
  }

  // Duration validation (optional field, but if provided must be valid)
  if (duration && duration.trim()) {
    const durationNum = parseFloat(duration);
    if (isNaN(durationNum)) {
      errors.duration = i18n.t('calendar:validation.training.durationNumber');
    } else if (durationNum <= 0) {
      errors.duration = i18n.t('calendar:validation.training.durationPositive');
    } else if (durationNum > 1440) {
      errors.duration = i18n.t('calendar:validation.training.durationMax');
    }
  }

  // Time validation (optional field, but if provided must be valid format)
  if (time && time.trim()) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      errors.time = i18n.t('calendar:validation.time.format');
    }
  }

  return errors;
}

/**
 * Validate race-specific fields
 */
export function validateRaceFields(
  dateStart: string,
  time: string,
  location: string,
  distance: string,
  dateEnd?: string
): FieldErrors {
  const errors: FieldErrors = {};

  // Date is required
  if (!dateStart || !dateStart.trim()) {
    errors.dateStart = i18n.t('calendar:validation.race.dateRequired');
  }

  // Time validation (optional field, but if provided must be valid format)
  if (time && time.trim()) {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(time)) {
      errors.time = i18n.t('calendar:validation.time.format');
    }
  }

  // Date end validation (if provided, must be after start date)
  if (dateEnd && dateEnd.trim() && dateStart && dateStart.trim()) {
    if (new Date(dateEnd) < new Date(dateStart)) {
      errors.dateEnd = i18n.t('calendar:validation.date.afterStart');
    }
  }

  return errors;
}

/**
 * Validate custom event fields
 */
export function validateCustomEventFields(
  dateStart: string,
  customEventColor: string,
  dateEnd?: string
): FieldErrors {
  const errors: FieldErrors = {};

  // Date is required
  if (!dateStart || !dateStart.trim()) {
    errors.dateStart = i18n.t('calendar:validation.custom.dateRequired');
  }

  // Color is required
  if (!customEventColor || !customEventColor.trim()) {
    errors.customEventColor = i18n.t('calendar:validation.custom.colorRequired');
  }

  // Date end validation (if provided, must be after start date)
  if (dateEnd && dateEnd.trim() && dateStart && dateStart.trim()) {
    if (new Date(dateEnd) < new Date(dateStart)) {
      errors.dateEnd = i18n.t('calendar:validation.date.afterStart');
    }
  }

  return errors;
}

/**
 * Validate interval component fields (for training builder)
 * Returns validation errors for conditional fields
 */
export function validateIntervalComponent(
  component: any,
  componentType: 'warmup' | 'interval' | 'rest' | 'cooldown'
): Record<string, string> {
  const errors: Record<string, string> = {};

  // Name is always required
  if (!component.name || !component.name.trim()) {
    errors.name = i18n.t('calendar:validation.component.nameRequired');
  }

  // For warmup, rest, and cooldown: duration is required
  if (componentType === 'warmup' || componentType === 'rest' || componentType === 'cooldown') {
    if (!component.duration || !component.duration.toString().trim()) {
      errors.duration = i18n.t('calendar:validation.component.durationRequired');
    } else {
      const dur = parseFloat(component.duration);
      if (isNaN(dur) || dur <= 0) {
        errors.duration = i18n.t('calendar:validation.component.durationPositive');
      }
    }

    // Duration unit is required if duration is set
    if (component.duration && !component.durationUnit) {
      errors.durationUnit = i18n.t('calendar:validation.component.unitRequired');
    }
  }

  // For intervals: either duration or distance is required (unless has children)
  if (componentType === 'interval') {
    const hasChildren = component.children && component.children.length > 0;

    if (!hasChildren) {
      const hasDuration = component.duration && component.duration.toString().trim();
      const hasDistance = component.distance && component.distance.toString().trim();

      if (!hasDuration && !hasDistance) {
        const message = i18n.t('calendar:validation.component.durationOrDistance');
        errors.duration = message;
        errors.distance = message;
      }

      // Validate duration if provided
      if (hasDuration) {
        const dur = parseFloat(component.duration);
        if (isNaN(dur) || dur <= 0) {
          errors.duration = i18n.t('calendar:validation.component.durationPositive');
        }
        // Duration unit is required if duration is set
        if (!component.durationUnit) {
          errors.durationUnit = i18n.t('calendar:validation.component.unitRequired');
        }
      }

      // Validate distance if provided
      if (hasDistance) {
        const dist = parseFloat(component.distance);
        if (isNaN(dist) || dist <= 0) {
          errors.distance = i18n.t('calendar:validation.component.distancePositive');
        }
        // Distance unit is required if distance is set
        if (!component.distanceUnit) {
          errors.distanceUnit = i18n.t('calendar:validation.component.unitRequired');
        }
      }

      // Validate intensity if provided
      if (component.intensity !== undefined && component.intensity !== null && component.intensity !== '') {
        const intensity = parseFloat(component.intensity);
        if (isNaN(intensity)) {
          errors.intensity = i18n.t('calendar:validation.component.intensityNumber');
        } else if (intensity < 1 || intensity > 110) {
          errors.intensity = i18n.t('calendar:validation.component.intensityRange');
        }

        // Intensity unit is required if intensity is set
        if (!component.intensityUnit) {
          errors.intensityUnit = i18n.t('calendar:validation.component.intensityUnit');
        }
      }
    }
  }

  return errors;
}

/**
 * Comprehensive validation for all event fields based on event type
 */
export function validateEventForm(
  eventType: 'training' | 'race' | 'custom',
  formData: {
    title: string;
    selectedSport: string;
    selectedAthlete: string;
    userRole: string;
    date?: string;
    duration?: string;
    time?: string;
    dateStart?: string;
    dateEnd?: string;
    location?: string;
    distance?: string;
    timeObjective?: string;
    customEventColor?: string;
  }
): ValidationResult {
  const errors: FieldErrors = {};

  // Validate common fields
  Object.assign(errors, validateCommonFields(
    eventType,
    formData.title,
    formData.selectedSport,
    formData.selectedAthlete,
    formData.userRole
  ));

  // Validate event-type-specific fields
  if (eventType === 'training') {
    Object.assign(errors, validateTrainingFields(
      formData.date || '',
      formData.duration || '',
      formData.time || ''
    ));
  } else if (eventType === 'race') {
    Object.assign(errors, validateRaceFields(
      formData.dateStart || '',
      formData.time || '',
      formData.location || '',
      formData.distance || '',
      formData.dateEnd
    ));
  } else if (eventType === 'custom') {
    Object.assign(errors, validateCustomEventFields(
      formData.dateStart || '',
      formData.customEventColor || '',
      formData.dateEnd
    ));
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
