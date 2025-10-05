import { TrainingBlock, TrainingTemplate, EventData, trainingSports, raceSports, IntervalComponent } from '../types';
import { estimateTrainingDurationMinutes } from '../utils/calculateTrainingDuration';
import { createSavedTraining, getSavedTrainings, deleteSavedTraining } from '../../../services/savedTrainingService';
import { mapTrainingBlocksToTrainingData } from '../../../services/eventNormalization';
import { generateComponentName, generateChildName } from '../utils/trainingNaming';

function ensureSeconds(timeValue: string): string {
  const parts = timeValue.split(':');
  if (parts.length === 2) {
    const [hours, minutes] = parts;
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
  }
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:${seconds.padStart(2, '0')}`;
  }
  return timeValue;
}

function combineDateAndTimeLocal(dateValue?: string | Date | null, timeValue?: string | null): string | undefined {
  if (!dateValue) {
    return undefined;
  }

  const normalizedTime = timeValue?.trim();
  let datePart: string | undefined;

  if (dateValue instanceof Date) {
    const year = dateValue.getFullYear();
    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getDate()).padStart(2, '0');
    datePart = `${year}-${month}-${day}`;
  } else {
    const trimmedDate = dateValue.trim();
    if (!trimmedDate) {
      return undefined;
    }
    datePart = trimmedDate.includes('T') ? trimmedDate.split('T')[0] : trimmedDate;
  }

  if (!datePart) {
    return undefined;
  }

  if (!normalizedTime) {
    return datePart;
  }

  return `${datePart}T${ensureSeconds(normalizedTime)}`;
}

interface UseEventModalActionsProps {
  // Form state
  isSubmitting: boolean;
  eventType: 'training' | 'race' | 'custom';
  selectedSport: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  location: string;
  description: string;
  selectedAthlete: string;
  trainingBlocks: TrainingBlock[];
  distance: string;
  timeObjective: string;
  dateStart: string;
  dateEnd: string;
  raceCategory: string;
  customEventColor: string;
  newTemplateName: string;
  saveToLibrary: boolean;
  savedTrainings: any[];

  // Callbacks
  onSave: (event: EventData) => Promise<void>;
  onClose: () => void;
  updateState: (key: string, value: any) => void;
  existingEvent?: EventData;
  onDelete?: (event: EventData) => Promise<void>;
}

/**
 * Custom hook to manage EventModal actions
 */
export function useEventModalActions({
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
  saveToLibrary,
  savedTrainings,
  onSave,
  onClose,
  updateState,
  existingEvent,
  onDelete,
}: UseEventModalActionsProps) {

  const applyTrainingBlocks = (blocks: TrainingBlock[]) => {
    updateState('trainingBlocks', blocks);

    if (eventType !== 'training') {
      return;
    }

    const estimatedMinutes = estimateTrainingDurationMinutes(blocks, selectedSport);
    if (estimatedMinutes === undefined || !Number.isFinite(estimatedMinutes) || estimatedMinutes <= 0) {
      return;
    }

    const roundedMinutes = Math.round(estimatedMinutes);
    const currentDurationNumeric = Number(duration);

    if (Number.isNaN(currentDurationNumeric) || Math.abs(currentDurationNumeric - roundedMinutes) > 0.5) {
      updateState('duration', String(roundedMinutes));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    updateState('isSubmitting', true);
    const trimmedDescription = description.trim();

    const trimmedTimeInput = time?.trim();
    const normalizedTimeForDate = trimmedTimeInput ? trimmedTimeInput.slice(0, 5) : undefined;
    const sanitizedTime = normalizedTimeForDate ? ensureSeconds(normalizedTimeForDate) : undefined;
    const sanitizedDuration = duration?.trim() ? duration : undefined;
    const sanitizedLocation = location?.trim() ? location : undefined;
    const sanitizedAthlete = selectedAthlete?.trim() ? selectedAthlete : undefined;
    const sanitizedDistance = distance?.trim() ? distance : undefined;
    const sanitizedTimeObjective = timeObjective?.trim() ? timeObjective : undefined;
    const sanitizedDateStart = dateStart?.trim() ? dateStart : undefined;
    const sanitizedDateEnd = dateEnd?.trim() ? dateEnd : undefined;

    const isRace = eventType === 'race';
    const isCustom = eventType === 'custom';
    const baseDate = (() => {
      if (isCustom) {
        return sanitizedDateStart || date?.trim() || undefined;
      }

      if (date?.trim()) {
        return date;
      }

      return sanitizedDateStart;
    })();

    const eventDate = combineDateAndTimeLocal(baseDate, normalizedTimeForDate) ?? baseDate;

    const eventData: EventData = {
      id: existingEvent?.id,
      type: eventType,
      sport: eventType !== 'custom' ? selectedSport : undefined,
      title: title || `${eventType} session`,
      date: eventDate,
      time: sanitizedTime,
      duration: eventType === 'training' ? sanitizedDuration : undefined,
      location: eventType !== 'training' ? sanitizedLocation : undefined,
      description: trimmedDescription || undefined,
      notes: trimmedDescription || undefined,
      athlete: sanitizedAthlete,
      trainingBlocks: eventType === 'training' ? trainingBlocks : undefined,
      trainingName: eventType === 'training' && newTemplateName ? newTemplateName : undefined,
      distance: isRace ? sanitizedDistance : undefined,
      timeObjective: isRace ? sanitizedTimeObjective : undefined,
      dateStart: (isRace || isCustom) ? sanitizedDateStart : undefined,
      dateEnd: isRace ? sanitizedDateEnd : (sanitizedDateEnd && sanitizedDateEnd !== baseDate ? sanitizedDateEnd : undefined),
      raceCategory: isRace ? raceCategory : undefined,
      customEventColor: isCustom ? customEventColor : undefined,
    };

    try {
      // Save to library if requested (BEFORE saving the event)
      if (saveToLibrary && eventType === 'training' && trainingBlocks.length > 0) {
        await handleSaveToLibrary();
      }

      // Save the training event
      await onSave(eventData);
    } catch (error) {
      console.error('Failed to save event', error);
    } finally {
      updateState('isSubmitting', false);
    }
  };

  const handleEventTypeChange = (type: 'training' | 'race' | 'custom') => {
    updateState('eventType', type);

    if (type === 'training' || type === 'race') {
      const sportOptions = type === 'race' ? raceSports : trainingSports;
      const hasValidSport = sportOptions.some((sport) => sport.id === selectedSport);
      if (!hasValidSport && sportOptions.length > 0) {
        updateState('selectedSport', sportOptions[0].id);
      }
    }
  };

  const handleTemplateSelect = (template: TrainingTemplate) => {
    updateState('selectedTemplate', template);
    updateState('title', template.name);
    updateState('newTemplateName', template.name);
    
    // Convert template components to training blocks
    const convertIntensityUnit = (unit?: IntervalComponent['intensityUnit']) => {
      if (!unit) return undefined;
      const normalized = unit.toLowerCase();
      const map: Record<string, TrainingBlock['intensityUnit']> = {
        heart_rate: 'heart_rate',
        hr: 'heart_rate',
        mas: 'MAS',
        fpp: 'FPP',
        css: 'CSS',
      };
      return map[normalized] || undefined;
    };

    const blocks: TrainingBlock[] = template.components.map((component, index) => ({
      id: `block-${Date.now()}-${index}`,
      type: component.type,
      name: component.name,
      duration: component.duration,
      durationUnit: component.durationUnit,
      distance: component.distance,
      distanceUnit: component.distanceUnit,
      intensity: component.intensity,
      intensityUnit: convertIntensityUnit(component.intensityUnit),
      repetitions: component.repetitions,
      notes: component.notes,
      intervalType: component.intervalType,
      children: component.children?.map((child, childIndex) => ({
        id: `child-${Date.now()}-${childIndex}`,
        type: child.type,
        name: child.name,
        duration: child.duration,
        durationUnit: child.durationUnit,
        distance: child.distance,
        distanceUnit: child.distanceUnit,
        intensity: child.intensity,
        intensityUnit: convertIntensityUnit(child.intensityUnit),
        repetitions: child.repetitions,
        notes: child.notes,
        intervalType: child.intervalType,
        children: child.children as TrainingBlock[] | undefined,
      })) || []
    }));
    
    applyTrainingBlocks(blocks);
    updateState('showTemplates', false);
  };

  const handleIntervalSave = (blocks: TrainingBlock[]) => {
    applyTrainingBlocks(blocks);
  };

  const handleAddBlock = (type: 'warmup' | 'interval' | 'rest' | 'cooldown' = 'interval') => {
    // Generate auto-name based on existing components
    const autoName = generateComponentName(type, trainingBlocks);

    const newBlock: TrainingBlock = {
      id: `block-${Date.now()}`,
      type: type,
      name: autoName,
      duration: undefined,
      durationUnit: undefined,
      distance: undefined,
      distanceUnit: undefined,
      intensity: undefined,
      intensityUnit: undefined,
      repetitions: undefined,
      notes: undefined,
      children: [],
      intervalType: undefined,
    };

    if (type === 'warmup') {
      newBlock.duration = '20';
      newBlock.durationUnit = 'min';
      newBlock.intensity = 70;
      newBlock.intensityUnit = 'heart_rate';
      newBlock.intervalType = 'time';
    } else if (type === 'cooldown') {
      newBlock.duration = '10';
      newBlock.durationUnit = 'min';
      newBlock.intensity = 70;
      newBlock.intensityUnit = 'heart_rate';
      newBlock.intervalType = 'time';
    }
    
    // Smart positioning: warm-up first, cool-down last
    let newBlocks = [...trainingBlocks];
    
    if (type === 'warmup') {
      // Always put warm-up at the beginning
      newBlocks.unshift(newBlock);
    } else if (type === 'cooldown') {
      // Always put cool-down at the end
      newBlocks.push(newBlock);
    } else {
      // For intervals and rest, find the right position:
      // After any warm-up components, but before any cool-down components
      const cooldownIndex = newBlocks.findIndex(block => block.type === 'cooldown');
      
      if (cooldownIndex !== -1) {
        // Insert before the first cool-down
        newBlocks.splice(cooldownIndex, 0, newBlock);
      } else {
        // No cool-down exists, add at the end
        newBlocks.push(newBlock);
      }
    }
    
    applyTrainingBlocks(newBlocks);
  };

  const handleAddChildBlock = (parentId: string, childType: 'interval' | 'rest') => {
    // Find parent to get existing children
    const parentBlock = trainingBlocks.find(block => block.id === parentId);
    const existingChildren = parentBlock?.children || [];

    // Generate auto-name based on existing children
    const autoName = generateChildName(childType, existingChildren);

    const newChild: TrainingBlock = {
      id: `child-${Date.now()}-${Math.random()}`,
      type: childType,
      name: autoName,
      duration: childType === 'rest' ? '90' : '4',
      durationUnit: childType === 'rest' ? 'sec' : 'min',
      distance: undefined,
      distanceUnit: undefined,
      intensity: childType === 'interval' ? 90 : undefined,
      intensityUnit: childType === 'interval' ? 'MAS' : undefined,
      repetitions: undefined,
      notes: undefined,
      children: [],
      intervalType: childType === 'interval' ? 'time' : undefined,
    };

    const newBlocks = trainingBlocks.map(block => {
      if (block.id === parentId) {
        return {
          ...block,
          children: [...(block.children || []), newChild]
        };
      }
      return block;
    });

    applyTrainingBlocks(newBlocks);
  };

  const handleUpdateBlock = (blockId: string, updatedBlock: Partial<TrainingBlock>) => {
    const newBlocks = trainingBlocks.map(block =>
      block.id === blockId ? { ...block, ...updatedBlock } : block
    );
    applyTrainingBlocks(newBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    const newBlocks = trainingBlocks.filter(block => block.id !== blockId);
    applyTrainingBlocks(newBlocks);
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    const currentIndex = trainingBlocks.findIndex(block => block.id === blockId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= trainingBlocks.length) return;

    const newBlocks = [...trainingBlocks];
    [newBlocks[currentIndex], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[currentIndex]];

    applyTrainingBlocks(newBlocks);
  };

  const handleDuplicateBlock = (blockId: string) => {
    const blockToDuplicate = trainingBlocks.find(block => block.id === blockId);
    if (!blockToDuplicate) return;

    const duplicatedBlock: TrainingBlock = {
      ...blockToDuplicate,
      id: `block-${Date.now()}`,
      name: `${blockToDuplicate.name} (Copy)`,
      children: blockToDuplicate.children?.map(child => ({
        ...child,
        id: `child-${Date.now()}-${Math.random()}`
      })) || []
    };

    const blockIndex = trainingBlocks.findIndex(block => block.id === blockId);
    const newBlocks = [...trainingBlocks];
    newBlocks.splice(blockIndex + 1, 0, duplicatedBlock);

    applyTrainingBlocks(newBlocks);
  };

  const handleDeleteEvent = async () => {
    if (!existingEvent || !existingEvent.id || !onDelete) {
      return;
    }

    await onDelete(existingEvent);
  };

  const handleSaveToLibrary = async () => {
    if (!newTemplateName || !selectedSport || trainingBlocks.length === 0) {
      console.warn('Cannot save to library: missing name, sport, or training blocks');
      return;
    }

    try {
      const training_data = mapTrainingBlocksToTrainingData(trainingBlocks, newTemplateName);

      await createSavedTraining({
        name: newTemplateName,
        sport: selectedSport,
        description: description || undefined,
        training_data,
      });

      // Reload saved trainings
      const updated = await getSavedTrainings(selectedSport);
      updateState('savedTrainings', updated);

      console.log('✅ Training saved to library!');
    } catch (error) {
      console.error('❌ Failed to save training to library:', error);
      throw error;
    }
  };

  const handleDeleteSavedTraining = async (id: string) => {
    try {
      await deleteSavedTraining(id);

      // Reload saved trainings
      if (selectedSport) {
        const updated = await getSavedTrainings(selectedSport);
        updateState('savedTrainings', updated);
      }

      console.log('✅ Template deleted!');
    } catch (error) {
      console.error('❌ Failed to delete template:', error);
      throw error;
    }
  };

  return {
    handleSubmit,
    handleEventTypeChange,
    handleTemplateSelect,
    handleIntervalSave,
    handleAddBlock,
    handleAddChildBlock,
    handleUpdateBlock,
    handleDeleteBlock,
    handleMoveBlock,
    handleDuplicateBlock,
    handleDeleteEvent,
    handleSaveToLibrary,
    handleDeleteSavedTraining,
  };
}
