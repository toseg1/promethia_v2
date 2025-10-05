import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { EventFormFields } from './EventFormFields';
import { TrainingSessionFields } from './TrainingSessionFields';
import { RaceEventFields } from './RaceEventFields';
import { CustomEventFields } from './CustomEventFields';
import { IntervalBuilder } from './IntervalBuilder';
import { EventModalFooter } from './EventModalFooter';
import { useEventModalData, normalizeEventType } from './hooks/useEventModalData';
import { useEventModalActions } from './hooks/useEventModalActions';
import { StackedModal } from '../ui/StackedModal';
import { useStackedModal } from '../../hooks/useStackedModal';
import { EventModalProps } from './types';
import { DeleteConfirmation } from '../ui/DeleteConfirmation';
import { useAuth } from '../../contexts';
import { useConnectedAthletes } from '../../hooks';
import { FieldErrors, validateEventForm } from './utils/fieldValidation';

export function EventModalContainer({ isOpen, onClose, onSave, selectedDate, userRole, event, onDelete }: EventModalProps) {
  const { t } = useTranslation('calendar');
  const { user } = useAuth();
  // Stacked modal hook for base level
  const eventModal = useStackedModal('event-modal', {
    level: 1,
    onClose: onClose
  });

  // Custom hooks for data management and actions
  const {
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
    updateState,
  } = useEventModalData(isOpen, selectedDate, event);

  const isCoach = userRole === 'coach';
  const coachId = isCoach && user?.id ? user.id : null;
  const { data: connectedAthletes } = useConnectedAthletes(coachId, Boolean(coachId));

  const athleteOptions = useMemo(() => {
    if (!connectedAthletes) {
      return [];
    }

    return connectedAthletes.map((athlete) => {
      const fullName = `${athlete.firstName ?? ''} ${athlete.lastName ?? ''}`.trim();

      return {
        id: athlete.id,
        name: fullName || athlete.username || t('eventModal.unknownAthlete'),
      };
    });
  }, [connectedAthletes, t]);

  useEffect(() => {
    if (!isCoach) {
      return;
    }

    if (!selectedAthlete) {
      return;
    }

    const hasSelectedAthlete = athleteOptions.some((athlete) => athlete.id === selectedAthlete);

    if (!hasSelectedAthlete) {
      updateState('selectedAthlete', '');
    }
  }, [athleteOptions, isCoach, selectedAthlete, updateState]);

  const {
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
    handleDeleteSavedTraining,
  } = useEventModalActions({
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
    saveToLibrary,
    savedTrainings,
    distance,
    timeObjective,
    dateStart,
    dateEnd,
    raceCategory,
    customEventColor,
    newTemplateName,
    onSave,
    onClose,
    updateState,
    existingEvent: event,
    onDelete,
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Field errors state
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Clear specific field error
  const clearFieldError = (field: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field as keyof FieldErrors];
      return newErrors;
    });
  };

  // Validate form before submission
  const validateForm = (): boolean => {
    const validation = validateEventForm(eventType, {
      title,
      selectedSport,
      selectedAthlete,
      userRole,
      date,
      duration,
      time,
      dateStart,
      dateEnd,
      location,
      distance,
      timeObjective,
      customEventColor
    });

    if (!validation.isValid) {
      setFieldErrors(validation.errors);
      return false;
    }

    setFieldErrors({});
    return true;
  };

  const handleDeleteClick = async () => {
    if (!event?.id || !onDelete) {
      return;
    }

    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      await handleDeleteEvent();
      setShowDeleteConfirm(false);
      eventModal.closeModal();
      onClose();
    } catch (error) {
      console.error('Failed to delete event', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const isEditing = Boolean(event?.id);
  const lockedEventType = isEditing ? normalizeEventType(event?.type) : null;

  // Wrap handleSubmit to include validation
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Run validation
    if (!validateForm()) {
      console.warn('Form validation failed:', fieldErrors);
      return;
    }

    // Proceed with original submit handler
    await handleSubmit(e);
  };

  return (
    <StackedModal
      id="event-modal"
      isOpen={isOpen}
      onClose={eventModal.closeModal}
      title={event && event.id ? t('eventModal.editEvent') : t('eventModal.createEvent')}
      size="lg"
      level={1}
      closeOnBackdropClick={true}
      closeOnEscape={true}
      showCloseButton={false}
    >
      <div>
        {/* Remove header as it's handled by StackedModal */}

        <form onSubmit={handleFormSubmit} className="relative p-4 md:p-8 space-y-6 md:space-y-8" noValidate>
          

          <DeleteConfirmation
            open={showDeleteConfirm}
            title={t('deleteEventTitle')}
            description={t('deleteEventDescription')}
            onCancel={() => setShowDeleteConfirm(false)}
            onConfirm={confirmDelete}
            confirmLabel={isDeleting ? t('deleting') : t('deleteEvent')}
            cancelLabel={t('keepEvent')}
            confirming={isDeleting}
          />
          {/* Event Form Fields */}
          <EventFormFields
            eventType={eventType}
            onEventTypeChange={handleEventTypeChange}
            selectedSport={selectedSport}
            onSportChange={(sport) => updateState('selectedSport', sport)}
            title={title}
            onTitleChange={(title) => updateState('title', title)}
            selectedAthlete={selectedAthlete}
            onAthleteChange={(athlete) => updateState('selectedAthlete', athlete)}
            userRole={userRole}
            athletes={athleteOptions}
            isEditing={isEditing}
            lockedEventType={lockedEventType}
            errors={fieldErrors}
            onClearError={clearFieldError}
          />

          {/* Training Session Fields */}
          {eventType === 'training' && (
            <TrainingSessionFields
              date={date}
              onDateChange={(date) => updateState('date', date)}
              duration={duration}
              onDurationChange={(duration) => updateState('duration', duration)}
              time={time}
              onTimeChange={(time) => updateState('time', time)}
              description={description}
              onDescriptionChange={(value) => updateState('description', value)}
              errors={fieldErrors}
              onClearError={clearFieldError}
            />
          )}

          {/* Race Event Fields */}
          {eventType === 'race' && (
            <RaceEventFields
              location={location}
              onLocationChange={(location) => updateState('location', location)}
              distance={distance}
              onDistanceChange={(distance) => updateState('distance', distance)}
              time={time}
              onTimeChange={(time) => updateState('time', time)}
              timeObjective={timeObjective}
              onTimeObjectiveChange={(timeObjective) => updateState('timeObjective', timeObjective)}
              description={description}
              onDescriptionChange={(value) => updateState('description', value)}
              dateStart={dateStart}
              onDateStartChange={(dateStart) => updateState('dateStart', dateStart)}
              dateEnd={dateEnd}
              onDateEndChange={(dateEnd) => updateState('dateEnd', dateEnd)}
              errors={fieldErrors}
              onClearError={clearFieldError}
            />
          )}

          {/* Custom Event Fields */}
          {eventType === 'custom' && (
              <CustomEventFields
                dateStart={dateStart}
                onDateStartChange={(value) => updateState('dateStart', value)}
                dateEnd={dateEnd}
                onDateEndChange={(value) => updateState('dateEnd', value)}
                location={location}
                onLocationChange={(value) => updateState('location', value)}
                customEventColor={customEventColor}
                onCustomEventColorChange={(color) => updateState('customEventColor', color)}
                description={description}
                onDescriptionChange={(value) => updateState('description', value)}
                errors={fieldErrors}
                onClearError={clearFieldError}
              />
          )}

          {/* Training Templates and Interval Builder - Only for training events */}
          {eventType === 'training' && (
            <div className="space-y-4 md:space-y-6">
        
              {/* Interval Builder */}
              <IntervalBuilder
                isTrainingBlocksExpanded={isTrainingBlocksExpanded}
                onToggleTrainingBlocks={() => updateState('isTrainingBlocksExpanded', !isTrainingBlocksExpanded)}
                selectedTrainingSport={selectedSport}
                onTrainingSportChange={(sport) => updateState('selectedSport', sport)}
                isTemplatesExpanded={showTemplates}
                onToggleTemplates={() => updateState('showTemplates', !showTemplates)}
                showIntervalBuilder={showIntervalBuilder}
                onCloseIntervalBuilder={() => updateState('showIntervalBuilder', false)}
                onOpenIntervalBuilder={() => updateState('showIntervalBuilder', true)}
                selectedTemplateId={selectedTemplateId}
                onTemplateSelect={(templateId) => updateState('selectedTemplateId', templateId)}
                onEditTemplate={(template) => {
                  // Load template data into training blocks for editing
                  const templateComponents = template.components || [];
                  const unitMap: Record<string, TrainingBlock['intensityUnit']> = {
                    heart_rate: 'heart_rate',
                    hr: 'heart_rate',
                    mas: 'MAS',
                    fpp: 'FPP',
                    css: 'CSS',
                  };
                  const normalizeIntensityUnit = (unit?: string) => {
                    if (!unit) return undefined;
                    return unitMap[unit.toLowerCase()] || undefined;
                  };

                  const mapComponentToBlock = (comp: any): TrainingBlock => ({
                    id: comp.id || `block-${Date.now()}-${Math.random()}`,
                    type: comp.type,
                    name: comp.name,
                    duration: comp.duration,
                    durationUnit: comp.durationUnit,
                    distance: comp.distance,
                    distanceUnit: comp.distanceUnit,
                    intensity: comp.intensity,
                    intensityUnit: normalizeIntensityUnit(comp.intensityUnit),
                    repetitions: comp.repetitions,
                    notes: comp.notes,
                    children: (comp.children || []).map(mapComponentToBlock),
                    intervalType: comp.intervalType,
                  });

                  const trainingBlocks = templateComponents.map(mapComponentToBlock);

                  // Load template data and open builder
                  handleIntervalSave(trainingBlocks);
                  updateState('newTemplateName', template.name);
                  updateState('selectedTemplateId', template.id);
                  updateState('showIntervalBuilder', true);
                }}
                onCreateNew={() => {
                  // Clear existing training blocks and start fresh
                  handleIntervalSave([]);
                  updateState('selectedTemplateId', null);
                  updateState('newTemplateName', t('intervalBuilder.defaultName'));
                  updateState('showIntervalBuilder', true);
                }}
                newTemplateName={newTemplateName}
                onTemplateNameChange={(name) => updateState('newTemplateName', name)}
                onSaveTemplate={() => {
                  // Save the current training blocks as a template
                  console.log('Saving template:', newTemplateName, trainingBlocks);
                  updateState('showIntervalBuilder', false);
                }}
                onLoadTemplate={handleTemplateSelect}
                intervalComponents={trainingBlocks.map(block => ({
                  id: block.id,
                  type: block.type,
                  name: block.name,
                  duration: block.duration,
                  notes: block.notes || '',
                  repetitions: block.repetitions,
                  intensity: block.intensity,
                  intensityUnit: block.intensityUnit,
                  distance: block.distance,
                  distanceUnit: block.distanceUnit,
                  durationUnit: block.durationUnit,
                  children: block.children?.map(child => ({
                    id: child.id,
                    type: child.type,
                    name: child.name,
                    duration: child.duration,
                    notes: child.notes || '',
                    repetitions: child.repetitions,
                    intensity: child.intensity,
                    intensityUnit: child.intensityUnit,
                    distance: child.distance,
                    distanceUnit: child.distanceUnit,
                    durationUnit: child.durationUnit,
                  })),
                  intervalType: block.intervalType,
                }))}
                onAddComponent={(type, parentId) => {
                  if (parentId) {
                    // Adding a child to a parent block
                    handleAddChildBlock(parentId, type as 'interval' | 'rest');
                  } else {
                    // Adding a top-level block
                    handleAddBlock(type);
                  }
                }}
                onUpdateComponent={(id: string, field: string, value: string | number | any) => {
                  // Convert IntervalComponent update to TrainingBlock update
                  const updateData: any = {};
                  switch (field) {
                    case 'name': updateData.name = value; break;
                    case 'duration': updateData.duration = value; break;
                    case 'durationUnit': updateData.durationUnit = value || undefined; break;
                    case 'distance': updateData.distance = value; break;
                    case 'distanceUnit': updateData.distanceUnit = value || undefined; break;
                    case 'repetitions': updateData.repetitions = value; break;
                    case 'intensity': updateData.intensity = value; break;
                    case 'intensityUnit': updateData.intensityUnit = value || undefined; break;
                    case 'notes': updateData.notes = value; break;
                    case 'intervalType': updateData.intervalType = value; break;
                    case 'children': updateData.children = value; break;
                    default: break;
                  }

                  // Update the main component
                  handleUpdateBlock(id, updateData);

                  // Also update the editing component if it's the same one being edited
                  updateState('editingComponent', (prev: any) => {
                    if (prev && prev.id === id) {
                      return { ...prev, [field]: value };
                    }
                    if (editingComponent && editingComponent.id === id) {
                      return { ...editingComponent, [field]: value };
                    }
                    return prev;
                  });
                }}
                onRemoveComponent={(id: string) => handleDeleteBlock(id)}
                onDuplicateComponent={(id: string) => handleDuplicateBlock(id)}
                onMoveComponent={(fromIndex: number, toIndex: number) => {
                  // Reorder training blocks array
                  const newBlocks = [...trainingBlocks];
                  const [movedBlock] = newBlocks.splice(fromIndex, 1);
                  newBlocks.splice(toIndex, 0, movedBlock);
                  handleIntervalSave(newBlocks);
                }}
                showComponentEditor={showComponentEditor}
                editingComponent={editingComponent}
                onEditComponent={(component) => {
                  updateState('editingComponent', component);
                  updateState('showComponentEditor', true);
                }}
                onCloseComponentEditor={() => {
                  updateState('showComponentEditor', false);
                  updateState('editingComponent', null);
                }}
                saveToLibrary={saveToLibrary}
                onToggleSaveToLibrary={(value) => updateState('saveToLibrary', value)}
                savedTrainings={savedTrainings}
                onDeleteSavedTraining={handleDeleteSavedTraining}
              />
            </div>
          )}

          {eventType === 'race' && showIntervalBuilder && (
            <IntervalBuilder
              isTrainingBlocksExpanded={isTrainingBlocksExpanded}
              onToggleTrainingBlocks={() => updateState('isTrainingBlocksExpanded', !isTrainingBlocksExpanded)}
              selectedTrainingSport={selectedSport}
              onTrainingSportChange={(sport) => updateState('selectedSport', sport)}
              isTemplatesExpanded={showTemplates}
              onToggleTemplates={() => updateState('showTemplates', !showTemplates)}
              showIntervalBuilder={showIntervalBuilder}
              onCloseIntervalBuilder={() => updateState('showIntervalBuilder', false)}
              onOpenIntervalBuilder={() => updateState('showIntervalBuilder', true)}
              selectedTemplateId={selectedTemplateId}
              onTemplateSelect={(templateId) => updateState('selectedTemplateId', templateId)}
              onEditTemplate={() => undefined}
              onCreateNew={() => undefined}
              newTemplateName={newTemplateName}
              onTemplateNameChange={() => undefined}
              onSaveTemplate={() => updateState('showIntervalBuilder', false)}
              onLoadTemplate={() => undefined}
              intervalComponents={[]}
              onAddComponent={() => undefined}
              onUpdateComponent={() => undefined}
              onRemoveComponent={() => undefined}
              onDuplicateComponent={() => undefined}
              onMoveComponent={() => undefined}
              showComponentEditor={showComponentEditor}
              editingComponent={editingComponent}
              onEditComponent={() => undefined}
              onCloseComponentEditor={() => undefined}
            />
          )}

          {/* Footer */}
          <EventModalFooter
            isSubmitting={isSubmitting}
            onCancel={eventModal.closeModal}
          />
        </form>
      </div>
    </StackedModal>
  );
}
