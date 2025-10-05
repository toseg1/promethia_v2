/**
 * Training Builder Validation Utilities
 * Provides validation for training components (warmup, interval, rest, cooldown)
 */

import { IntervalComponent } from '../types';

export interface ComponentFieldErrors {
  name?: string;
  duration?: string;
  durationUnit?: string;
  distance?: string;
  distanceUnit?: string;
  intensity?: string;
  intensityUnit?: string;
  repetitions?: string;
  notes?: string;
  children?: Array<{
    [key: string]: string;
  }>;
}

/**
 * Validate a single training component
 * Returns errors object for that component
 */
export function validateTrainingComponent(
  component: IntervalComponent,
  validateChildren: boolean = false
): ComponentFieldErrors {
  const errors: ComponentFieldErrors = {};

  // Name validation (all components)
  if (!component.name?.trim()) {
    errors.name = 'Component name is required';
  } else if (component.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  // Type-specific validation
  if (component.type === 'warmup' || component.type === 'rest' || component.type === 'cooldown') {
    // Duration is required
    if (!component.duration || !component.duration.toString().trim()) {
      errors.duration = 'Duration is required';
    } else {
      const dur = parseFloat(component.duration.toString());
      if (isNaN(dur) || dur <= 0) {
        errors.duration = 'Duration must be greater than 0';
      }
    }

    // Duration unit required if duration is set
    if (component.duration && !component.durationUnit) {
      errors.durationUnit = 'Unit is required';
    }
  }

  if (component.type === 'interval') {
    const hasChildren = component.children && component.children.length > 0;

    if (hasChildren) {
      // Complex interval: validate repetitions
      if (!component.repetitions || component.repetitions < 1) {
        errors.repetitions = 'Repetitions must be at least 1';
      }

      // Validate children if requested
      if (validateChildren && component.children) {
        const childErrors: any[] = [];
        component.children.forEach((child, index) => {
          const childError = validateTrainingComponent(child as IntervalComponent, false);
          if (Object.keys(childError).length > 0) {
            childErrors[index] = childError;
          }
        });
        if (childErrors.length > 0) {
          errors.children = childErrors;
        }
      }
    } else {
      // Simple interval: validate duration OR distance
      const hasDuration = component.duration && component.duration.toString().trim();
      const hasDistance = component.distance && component.distance.toString().trim();

      if (!hasDuration && !hasDistance) {
        errors.duration = 'Duration or distance is required';
        errors.distance = 'Duration or distance is required';
      }

      // Validate duration if provided
      if (hasDuration) {
        const dur = parseFloat(component.duration!.toString());
        if (isNaN(dur) || dur <= 0) {
          errors.duration = 'Duration must be greater than 0';
        }
        if (!component.durationUnit) {
          errors.durationUnit = 'Unit is required';
        }
      }

      // Validate distance if provided
      if (hasDistance) {
        const dist = parseFloat(component.distance!.toString());
        if (isNaN(dist) || dist <= 0) {
          errors.distance = 'Distance must be greater than 0';
        }
        if (!component.distanceUnit) {
          errors.distanceUnit = 'Unit is required';
        }
      }

      // Validate intensity if provided
      if (component.intensity !== undefined && component.intensity !== null && component.intensity !== '') {
        const intensity = parseFloat(component.intensity.toString());
        if (isNaN(intensity)) {
          errors.intensity = 'Intensity must be a valid number';
        } else if (intensity < 1 || intensity > 110) {
          errors.intensity = 'Intensity must be between 1% and 110%';
        }

        if (!component.intensityUnit) {
          errors.intensityUnit = 'Zone type is required';
        }
      }
    }
  }

  return errors;
}

/**
 * Validate all components in the builder
 * Returns Map of component IDs to their errors
 */
export function validateAllComponents(
  components: IntervalComponent[]
): Map<string, ComponentFieldErrors> {
  const errorsMap = new Map<string, ComponentFieldErrors>();

  components.forEach((component) => {
    const errors = validateTrainingComponent(component, true);
    if (Object.keys(errors).length > 0) {
      errorsMap.set(component.id, errors);
    }
  });

  return errorsMap;
}

/**
 * Check if a component has any validation errors
 */
export function hasValidationErrors(errors: ComponentFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Get a summary count of errors
 */
export function getErrorCount(errors: ComponentFieldErrors): number {
  let count = 0;
  Object.keys(errors).forEach((key) => {
    if (key !== 'children') {
      count++;
    } else if (errors.children) {
      count += errors.children.length;
    }
  });
  return count;
}
