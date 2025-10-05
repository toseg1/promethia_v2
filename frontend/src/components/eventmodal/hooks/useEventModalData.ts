import { useState, useEffect } from 'react';
import {
  TrainingBlock,
  TrainingTemplate,
  TrainingEvent,
  customEventColors,
} from '../types';
import { getSavedTrainings, SavedTraining } from '../../../services/savedTrainingService';

/**
 * Utility function to format date to YYYY-MM-DD in local timezone
 * Avoids timezone shift issues with toISOString()
 */
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeDateValue(value?: string | Date | null): string {
  if (!value) {
    return '';
  }

  if (value instanceof Date) {
    return formatDateForInput(value);
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.includes('T')) {
    return trimmed.split('T')[0];
  }

  return trimmed;
}

function normalizeTimeValue(timeValue?: string | null, dateValue?: string | Date | null): string {
  const trimmedTime = timeValue?.trim();
  if (trimmedTime) {
    return trimmedTime.slice(0, 5);
  }

  if (!dateValue) {
    return '';
  }

  if (dateValue instanceof Date) {
    const hours = dateValue.getHours().toString().padStart(2, '0');
    const minutes = dateValue.getMinutes().toString().padStart(2, '0');
    if (hours === '00' && minutes === '00') {
      return '';
    }
    return `${hours}:${minutes}`;
  }

  const trimmedDate = dateValue.trim();
  if (!trimmedDate || !trimmedDate.includes('T')) {
    return '';
  }

  const [, timePart = ''] = trimmedDate.split('T');
  const cleanTime = timePart.replace('Z', '');
  const [timeSection] = cleanTime.split(/[+-]/);
  const baseTime = (timeSection || '').split('.')[0];
  if (!baseTime || baseTime === '00:00:00' || baseTime === '00:00') {
    return '';
  }
  return baseTime.slice(0, 5);
}

const COLOR_NAME_TO_HEX: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#8b5cf6',
  orange: '#f97316',
};

function normalizeCustomEventColor(color?: string | null): string {
  if (!color) {
    return customEventColors[0];
  }

  const trimmed = color.trim().toLowerCase();
  if (COLOR_NAME_TO_HEX[trimmed]) {
    return COLOR_NAME_TO_HEX[trimmed];
  }

  return trimmed.startsWith('#') ? trimmed : customEventColors[0];
}

/**
 * Custom hook to manage EventModal data state
 */
export function useEventModalData(isOpen: boolean, selectedDate?: Date, event?: TrainingEvent) {
  // Form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventType, setEventType] = useState<'training' | 'race' | 'custom'>('training');
  const [selectedSport, setSelectedSport] = useState<string>('running');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(selectedDate ? formatDateForInput(selectedDate) : '');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [trainingBlocks, setTrainingBlocks] = useState<TrainingBlock[]>([]);
  
  // Race-specific fields
  const [distance, setDistance] = useState('');
  const [timeObjective, setTimeObjective] = useState('');
  const [dateStart, setDateStart] = useState(selectedDate ? formatDateForInput(selectedDate) : '');
  const [dateEnd, setDateEnd] = useState('');
  const [raceCategory, setRaceCategory] = useState('');
  
  // Custom event fields
  const [customEventColor, setCustomEventColor] = useState(customEventColors[0]);
  
  // Template-related state
  const [newTemplateName, setNewTemplateName] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TrainingTemplate | null>(null);

  // Save to library state
  const [saveToLibrary, setSaveToLibrary] = useState(false);
  const [savedTrainings, setSavedTrainings] = useState<SavedTraining[]>([]);

  // Interval Builder state
  const [showIntervalBuilder, setShowIntervalBuilder] = useState(false);

  // Component Editor state
  const [showComponentEditor, setShowComponentEditor] = useState(false);
  const [editingComponent, setEditingComponent] = useState<any>(null);

  // Template selection state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  // Training Builder collapse state
  const [isTrainingBlocksExpanded, setIsTrainingBlocksExpanded] = useState(false);

  const trainingTemplates: TrainingTemplate[] = [
    {
      id: 'run-intervals-1',
      sport: 'running',
      name: 'Speed Intervals',
      description: 'High-intensity interval training for speed development',
      components: [
        { id: '1', type: 'warmup', name: 'Warm-up', duration: '15', durationUnit: 'min', notes: 'Easy jog + dynamic stretching' },
        { 
          id: '2', 
          type: 'interval', 
          name: 'Speed Set', 
          repetitions: 6,
          children: [
            { id: '2a', type: 'interval', name: '400m', distance: '400', distanceUnit: 'm', intensity: 95, intensityUnit: 'MAS' },
            { id: '2b', type: 'rest', name: 'Recovery', duration: '90', durationUnit: 'sec', notes: 'Walking recovery' }
          ]
        },
        { id: '3', type: 'cooldown', name: 'Cool-down', duration: '15', durationUnit: 'min', notes: 'Easy jog + stretching' }
      ]
    },
    {
      id: 'cycle-power-1',
      sport: 'cycling',
      name: 'Power Intervals',
      description: 'FTP building power intervals',
      components: [
        { id: '1', type: 'warmup', name: 'Warm-up', duration: '20', durationUnit: 'min', notes: 'Zone 1-2 build' },
        { 
          id: '2', 
          type: 'interval', 
          name: 'Power Set', 
          repetitions: 4,
          children: [
            { id: '2a', type: 'interval', name: '8min', duration: '8', durationUnit: 'min', intensity: 105, intensityUnit: 'FPP' },
            { id: '2b', type: 'rest', name: 'Recovery', duration: '4', durationUnit: 'min', notes: 'Zone 1 spinning' }
          ]
        },
        { id: '3', type: 'cooldown', name: 'Cool-down', duration: '15', durationUnit: 'min', notes: 'Zone 1 easy spin' }
      ]
    },
    {
      id: 'swim-technique-1',
      sport: 'swimming',
      name: 'Technique & Speed',
      description: 'Technique focus with speed development',
      components: [
        { id: '1', type: 'warmup', name: 'Warm-up', duration: '20', durationUnit: 'min', notes: '400m easy swim + 200m drill' },
        { 
          id: '2', 
          type: 'interval', 
          name: 'Main Set', 
          repetitions: 8,
          children: [
            { id: '2a', type: 'interval', name: '100m', distance: '100', distanceUnit: 'm', intensity: 90, intensityUnit: 'CSS' },
            { id: '2b', type: 'rest', name: 'Rest', duration: '20', durationUnit: 'sec', notes: 'Complete rest' }
          ]
        },
        { id: '3', type: 'cooldown', name: 'Cool-down', duration: '15', durationUnit: 'min', notes: '300m easy + stretching' }
      ]
    }
  ];

  // Reset form when modal opens with different event data
  useEffect(() => {
    if (isOpen) {
      setIsSubmitting(false);
      setEventType(normalizeEventType(event?.type));
      setSelectedSport(event?.sport || 'running');
      setTitle(event?.title || '');
      const normalizedDate = normalizeDateValue(event?.date) || (selectedDate ? formatDateForInput(selectedDate) : '');
      const normalizedStartDate = normalizeDateValue(event?.dateStart) || normalizedDate;
      const normalizedEndDate = normalizeDateValue(event?.dateEnd);
      const normalizedTime = normalizeTimeValue(event?.time, event?.date);

      setDate(normalizedDate);
      setTime(normalizedTime);
      setDuration(event?.duration ? String(event.duration) : '');
      setLocation(event?.location || '');
      setDescription(event?.description || event?.notes || '');
      setSelectedAthlete(event?.athlete || '');
      setTrainingBlocks(event?.trainingBlocks || []);
      setNewTemplateName((event as any)?.trainingName || event?.title || '');
      setDistance(event?.distance || '');
      setTimeObjective(event?.timeObjective || '');
      setDateStart(normalizedStartDate);
      setDateEnd(normalizedEndDate || '');
      setRaceCategory(event?.raceCategory || '');
      setCustomEventColor(normalizeCustomEventColor(event?.customEventColor || (event as any)?.color));

      // Auto-expand Training Builder if blocks exist
      const hasBlocks = Boolean(event?.trainingBlocks?.length);
      console.log('📋 Event loaded:', {
        trainingBlocks: event?.trainingBlocks,
        hasBlocks,
        willExpandTrainingBuilder: hasBlocks
      });

      setSelectedTemplate(null);
      setIsTrainingBlocksExpanded(hasBlocks);
      // Don't reset showIntervalBuilder or showTemplates - let user interactions control them
    }
  }, [isOpen, selectedDate, event]);

  // Load saved trainings when modal opens and sport changes
  useEffect(() => {
    if (isOpen && selectedSport && eventType === 'training') {
      getSavedTrainings(selectedSport)
        .then(setSavedTrainings)
        .catch(err => {
          console.error('Failed to load saved trainings:', err);
          setSavedTrainings([]);
        });
    }
  }, [isOpen, selectedSport, eventType]);

  // Generic state updater function
  const updateState = (key: string, value: any) => {
    switch (key) {
      case 'isSubmitting': setIsSubmitting(value); break;
      case 'eventType': setEventType(value); break;
      case 'selectedSport': setSelectedSport(value); break;
      case 'title': setTitle(value); break;
      case 'date': setDate(value); break;
      case 'time': setTime(value); break;
      case 'duration': setDuration(value); break;
      case 'location': setLocation(value); break;
      case 'description': setDescription(value); break;
      case 'selectedAthlete': setSelectedAthlete(value); break;
      case 'trainingBlocks': setTrainingBlocks(value); break;
      case 'distance': setDistance(value); break;
      case 'timeObjective': setTimeObjective(value); break;
      case 'dateStart': setDateStart(value); break;
      case 'dateEnd': setDateEnd(value); break;
      case 'raceCategory': setRaceCategory(value); break;
      case 'customEventColor': setCustomEventColor(value); break;
      case 'newTemplateName': setNewTemplateName(value); break;
      case 'showTemplates': setShowTemplates(value); break;
      case 'selectedTemplate': setSelectedTemplate(value); break;
      case 'showIntervalBuilder': setShowIntervalBuilder(value); break;
      case 'showComponentEditor': setShowComponentEditor(value); break;
      case 'editingComponent': {
        if (typeof value === 'function') {
          setEditingComponent((prev) => value(prev));
        } else {
          setEditingComponent(value);
        }
        break;
      }
      case 'selectedTemplateId': setSelectedTemplateId(value); break;
      case 'isTrainingBlocksExpanded': setIsTrainingBlocksExpanded(value); break;
      case 'saveToLibrary': setSaveToLibrary(value); break;
      case 'savedTrainings': setSavedTrainings(value); break;
      default: break;
    }
  };

  return {
    // Form state
    isSubmitting,
    eventType,
    selectedSport,
    title,
    date,
    time,
    duration,
    location,
    description,
    selectedAthlete,
    trainingBlocks,
    distance,
    timeObjective,
    dateStart,
    dateEnd,
    raceCategory,
    customEventColor,
    newTemplateName,
    showTemplates,
    selectedTemplate,
    showIntervalBuilder,
    showComponentEditor,
    editingComponent,
    selectedTemplateId,
    isTrainingBlocksExpanded,
    saveToLibrary,
    savedTrainings,

    trainingTemplates,

    // State updater
    updateState,
  };
}
export function normalizeEventType(type?: string | null): 'training' | 'race' | 'custom' {
  if (!type) {
    return 'training';
  }

  const normalized = type
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '_');

  if (normalized.includes('custom')) {
    return 'custom';
  }

  if (normalized.includes('race')) {
    return 'race';
  }

  if (normalized.includes('train')) {
    return 'training';
  }

  switch (normalized) {
    case 'training':
    case 'race':
    case 'custom':
      return normalized;
    default:
      return 'training';
  }
}
