/**
 * Training Builder Auto-Naming Utilities
 * Generates smart, contextual names for training components and templates
 */

import { IntervalComponent } from '../types';
import i18next from 'i18next';

// Component naming configuration
interface ComponentNameConfig {
  baseName: string;
  useNumbering: boolean;
  startFrom: number;
  format: 'suffix' | 'prefix';
}

const COMPONENT_NAME_CONFIG: Record<string, ComponentNameConfig> = {
  warmup: {
    baseName: 'Warm Up',
    useNumbering: true,
    startFrom: 2, // First is "Warm Up", second is "Warm Up 2"
    format: 'suffix'
  },
  interval: {
    baseName: 'Interval Set',
    useNumbering: true,
    startFrom: 1, // "Interval Set 1", "Interval Set 2"
    format: 'suffix'
  },
  rest: {
    baseName: 'Recovery',
    useNumbering: true,
    startFrom: 2,
    format: 'suffix'
  },
  cooldown: {
    baseName: 'Cool Down',
    useNumbering: true,
    startFrom: 2,
    format: 'suffix'
  }
};

/**
 * Generate a name for a new component based on existing components
 */
export function generateComponentName(
  type: 'warmup' | 'interval' | 'rest' | 'cooldown',
  existingComponents: IntervalComponent[]
): string {
  const config = COMPONENT_NAME_CONFIG[type];

  // Count existing components of the same type
  const sameTypeCount = existingComponents.filter(c => c.type === type).length;

  // First one gets base name without number
  if (sameTypeCount === 0) {
    return config.baseName;
  }

  if (!config.useNumbering) {
    return config.baseName;
  }

  // Calculate the number for this component
  const number = config.startFrom + sameTypeCount - 1;

  if (config.format === 'prefix') {
    return `${number}. ${config.baseName}`;
  } else {
    return `${config.baseName} ${number}`;
  }
}

/**
 * Generate a name for a child component (work/rest in a complex interval)
 */
export function generateChildName(
  childType: 'interval' | 'rest',
  existingChildren: any[]
): string {
  const childrenOfType = existingChildren.filter(c => c.type === childType);
  const count = childrenOfType.length + 1;

  if (childType === 'interval') {
    return `Rep ${count}`;
  } else {
    return `Recovery ${count}`;
  }
}

/**
 * Calculate total duration of all components in minutes
 */
function calculateTotalDuration(components: IntervalComponent[]): number {
  let total = 0;

  components.forEach(component => {
    if (component.duration) {
      const duration = parseFloat(component.duration.toString());
      const unit = component.durationUnit;

      if (unit === 'min') {
        total += duration;
      } else if (unit === 'sec') {
        total += duration / 60;
      }
    }

    // Add children durations for complex intervals
    if (component.children && component.children.length > 0) {
      const childDuration = calculateTotalDuration(component.children as IntervalComponent[]);
      const reps = component.repetitions || 1;
      total += childDuration * reps;
    }
  });

  return total;
}

/**
 * Get the maximum intensity across all components
 */
function getMaxIntensity(components: IntervalComponent[]): number {
  let maxIntensity = 0;

  components.forEach(component => {
    if (component.intensity && component.intensity > maxIntensity) {
      maxIntensity = component.intensity;
    }

    // Check children
    if (component.children && component.children.length > 0) {
      component.children.forEach((child: any) => {
        if (child.intensity && child.intensity > maxIntensity) {
          maxIntensity = child.intensity;
        }
      });
    }
  });

  return maxIntensity;
}

/**
 * Count how many interval sets have children (complex intervals)
 */
function countComplexIntervals(components: IntervalComponent[]): number {
  return components.filter(c =>
    c.type === 'interval' &&
    c.children &&
    c.children.length > 0
  ).length;
}

/**
 * Suggest a template name based on workout structure
 */
export interface TemplateNameSuggestion {
  primary: string;
  alternatives: string[];
}

export function suggestTemplateName(
  components: IntervalComponent[],
  sport: string = 'Running'
): TemplateNameSuggestion {
  // Default if no components
  if (components.length === 0) {
    return {
      primary: `${sport} Session`,
      alternatives: ['Training', 'Workout']
    };
  }

  const hasComplexIntervals = countComplexIntervals(components) > 0;
  const intervalCount = components.filter(c => c.type === 'interval').length;
  const totalDuration = calculateTotalDuration(components);
  const maxIntensity = getMaxIntensity(components);

  // Case 1: Complex intervals (work+rest sequences)
  if (hasComplexIntervals) {
    const complexIntervals = components.filter(c =>
      c.type === 'interval' &&
      c.children &&
      c.children.length > 0
    );

    // Get first complex interval details
    const firstSet = complexIntervals[0];
    const reps = firstSet.repetitions || 1;
    const workIntervals = firstSet.children?.filter((c: any) => c.type === 'interval') || [];

    if (workIntervals.length > 0) {
      const firstWork = workIntervals[0];

      // Check if it's distance-based
      if (firstWork.distance && firstWork.distanceUnit) {
        const distance = firstWork.distance;
        const unit = firstWork.distanceUnit === 'km' ? 'km' : 'm';
        return {
          primary: `${reps} x ${distance}${unit} Repeats`,
          alternatives: [
            'Interval Training',
            'Speed Work',
            `${distance}${unit} Intervals`
          ]
        };
      }
    }

    // Time-based or no specific distance
    const setCount = complexIntervals.length;
    if (setCount === 1) {
      return {
        primary: 'Interval Training',
        alternatives: [
          'Speed Work',
          'Interval Session',
          'Fartlek Workout'
        ]
      };
    } else {
      return {
        primary: `${setCount} x Interval Sets`,
        alternatives: [
          'Speed Work',
          'Multi-Set Intervals',
          'Interval Training'
        ]
      };
    }
  }

  // Case 2: Multiple simple intervals
  if (intervalCount > 1) {
    return {
      primary: `${intervalCount} x Intervals`,
      alternatives: [
        'Interval Training',
        'Speed Work',
        `${sport} Intervals`
      ]
    };
  }

  // Case 3: Long duration (endurance)
  if (totalDuration > 60) {
    return {
      primary: `Long ${sport}`,
      alternatives: [
        'Endurance Session',
        'Base Training',
        'Long Run'
      ]
    };
  }

  // Case 4: High intensity
  if (maxIntensity > 85) {
    return {
      primary: 'Tempo Session',
      alternatives: [
        'Threshold Training',
        'Hard Effort',
        'Tempo Run'
      ]
    };
  }

  // Case 5: Easy/Recovery (low intensity)
  if (maxIntensity > 0 && maxIntensity < 75) {
    return {
      primary: 'Easy Session',
      alternatives: [
        'Recovery Run',
        'Base Training',
        'Easy Workout'
      ]
    };
  }

  // Default case
  return {
    primary: `${sport} Session`,
    alternatives: [
      'Training',
      'Workout',
      `${sport} Training`
    ]
  };
}

/**
 * Get sport display name
 */
export function getSportDisplayName(sport: string): string {
  const fallbackNames: Record<string, string> = {
    running: 'Running',
    cycling: 'Cycling',
    swimming: 'Swimming',
    strength: 'Strength',
    triathlon: 'Triathlon',
    other: 'Training'
  };

  const fallback = fallbackNames[sport] || fallbackNames.other;
  return i18next.t(`common:sports.${sport}`, {
    defaultValue: fallback
  });
}

/**
 * Update all component names to follow auto-naming convention
 * Useful for "Reset Names" functionality
 */
export function renumberAllComponents(components: IntervalComponent[]): IntervalComponent[] {
  const typeCounts: Record<string, number> = {
    warmup: 0,
    interval: 0,
    rest: 0,
    cooldown: 0
  };

  return components.map(component => {
    const type = component.type;
    const count = typeCounts[type] || 0;

    let newName: string;
    if (count === 0) {
      newName = COMPONENT_NAME_CONFIG[type].baseName;
    } else {
      const number = COMPONENT_NAME_CONFIG[type].startFrom + count - 1;
      newName = `${COMPONENT_NAME_CONFIG[type].baseName} ${number}`;
    }

    typeCounts[type] = count + 1;

    // Renumber children if they exist
    let updatedChildren = component.children;
    if (component.children && component.children.length > 0) {
      const childTypeCounts: Record<string, number> = {
        interval: 0,
        rest: 0
      };

      updatedChildren = component.children.map((child: any) => {
        const childType = child.type as 'interval' | 'rest';
        const childCount = childTypeCounts[childType] || 0;
        childTypeCounts[childType] = childCount + 1;

        const childName = childType === 'interval'
          ? `Rep ${childCount + 1}`
          : `Recovery ${childCount + 1}`;

        return {
          ...child,
          name: childName
        };
      });
    }

    return {
      ...component,
      name: newName,
      children: updatedChildren
    };
  });
}
