import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Target,
  ChevronDown,
  ChevronUp,
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  Plus,
  GripVertical,
  Copy,
  Edit3,
  Play,
  Square,
  RotateCcw,
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import { IntervalComponent, TrainingTemplate } from './types';
import { StackedModal } from '../ui/StackedModal';
import { DeleteConfirmation } from '../ui/DeleteConfirmation';
import { useStackedModal, useOverlayModal } from '../../hooks/useStackedModal';
import { convertTrainingDataToComponents } from '../../services/eventNormalization';
import {
  validateTrainingComponent,
  validateAllComponents,
  ComponentFieldErrors
} from './utils/trainingValidation';
import {
  suggestTemplateName,
  getSportDisplayName,
  generateChildName,
  TemplateNameSuggestion
} from './utils/trainingNaming';

interface IntervalBuilderProps {
  // Training blocks visibility
  isTrainingBlocksExpanded: boolean;
  onToggleTrainingBlocks: () => void;
  
  // Sport selection
  selectedTrainingSport: string;
  onTrainingSportChange: (sport: string) => void;
  
  // Templates
  isTemplatesExpanded: boolean;
  onToggleTemplates: () => void;
  
  // Interval Builder Modal
  showIntervalBuilder: boolean;
  onCloseIntervalBuilder: () => void;
  onOpenIntervalBuilder: () => void;
  
  // Template selection
  selectedTemplateId?: string | null;
  onTemplateSelect?: (templateId: string | null) => void;
  onEditTemplate?: (template: any) => void;
  onCreateNew?: () => void;
  
  // Template management
  newTemplateName: string;
  onTemplateNameChange: (name: string) => void;
  onSaveTemplate: () => void;
  onLoadTemplate: (template: TrainingTemplate) => void;

  // Save to library
  saveToLibrary?: boolean;
  onToggleSaveToLibrary?: (value: boolean) => void;
  savedTrainings?: any[];
  onDeleteSavedTraining?: (id: string) => void;

  // Components management
  intervalComponents: IntervalComponent[];
  onAddComponent: (type: IntervalComponent['type']) => void;
  onUpdateComponent: (id: string, field: keyof IntervalComponent, value: string | number) => void;
  onRemoveComponent: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onMoveComponent: (fromIndex: number, toIndex: number) => void;

  // Component editor
  showComponentEditor: boolean;
  editingComponent: IntervalComponent | null;
  onEditComponent: (component: IntervalComponent) => void;
  onCloseComponentEditor: () => void;
}

const getSportIcon = (sport: string) => {
  switch (sport) {
    case 'running': return <Footprints size={16} />;
    case 'cycling': return <Bike size={16} />;
    case 'swimming': return <Waves size={16} />;
    case 'strength': return <Dumbbell size={16} />;
    default: return <Target size={16} />;
  }
};

const getComponentColor = (type: IntervalComponent['type']) => {
  switch (type) {
    case 'warmup': return { 
      border: 'border-l-red-500', 
      bg: 'bg-red-50', 
      text: 'text-red-600',
      icon: 'text-red-600',
      button: 'bg-red-50 hover:bg-red-100'
    };
    case 'interval': return { 
      border: 'border-l-blue-500', 
      bg: 'bg-blue-50', 
      text: 'text-blue-600',
      icon: 'text-blue-600',
      button: 'bg-blue-50 hover:bg-blue-100'
    };
    case 'rest': return { 
      border: 'border-l-gray-500', 
      bg: 'bg-gray-50', 
      text: 'text-gray-600',
      icon: 'text-gray-600',
      button: 'bg-gray-50 hover:bg-gray-100'
    };
    case 'cooldown': return { 
      border: 'border-l-green-500', 
      bg: 'bg-green-50', 
      text: 'text-green-600',
      icon: 'text-green-600',
      button: 'bg-green-50 hover:bg-green-100'
    };
    default: return { 
      border: 'border-l-gray-300', 
      bg: 'bg-gray-50', 
      text: 'text-gray-600',
      icon: 'text-gray-600',
      button: 'bg-gray-50 hover:bg-gray-100'
    };
  }
};

const getComponentIcon = (type: IntervalComponent['type']) => {
  const colors = getComponentColor(type);
  switch (type) {
    case 'warmup': return <Play size={16} className={colors.icon} />;
    case 'interval': return <Target size={16} className={colors.icon} />;
    case 'rest': return <Square size={16} className={colors.icon} />;
    case 'cooldown': return <RotateCcw size={16} className={colors.icon} />;
    default: return <Target size={16} className={colors.icon} />;
  }
};

const formatZoneLabel = (unit?: string | null, t?: any) => {
  if (!unit) {
    return undefined;
  }

  switch (unit) {
    case 'heart_rate':
    case 'hr':
      return t ? t('intervalBuilder.zoneTypes.heartRate') : 'Heart Rate';
    case 'MAS':
    case 'mas':
      return 'MAS';
    case 'FPP':
    case 'fpp':
      return 'FPP';
    case 'CSS':
    case 'css':
      return 'CSS';
    default:
      return unit;
  }
};

/**
 * Field Error Display Component
 * Shows validation errors with AlertCircle icon
 */
const FieldError = ({ error }: { error?: string }) => {
  if (!error) return null;

  return (
    <div className="flex items-center gap-2 text-red-500 text-sm mt-1 pl-1">
      <AlertCircle size={14} />
      <span>{error}</span>
    </div>
  );
};

/**
 * Required Label Component
 * Shows asterisk for required fields
 */
const RequiredLabel = ({
  children,
  required = false,
  className = "block text-sm font-medium text-foreground mb-1"
}: {
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) => {
  return (
    <label className={className}>
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};

/**
 * Helper to get error styling classes for inputs
 */
const getInputClassName = (hasError: boolean, baseClass: string = '') => {
  const errorClasses = hasError
    ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
    : 'border-border/20 focus:ring-2 focus:ring-primary/20 focus:border-primary';

  return `${baseClass} ${errorClasses} transition-colors`;
};

export const IntervalBuilder = memo(function IntervalBuilder({
  isTrainingBlocksExpanded,
  onToggleTrainingBlocks,
  selectedTrainingSport,
  onTrainingSportChange,
  isTemplatesExpanded,
  onToggleTemplates,
  showIntervalBuilder,
  onCloseIntervalBuilder,
  onOpenIntervalBuilder,
  selectedTemplateId,
  onTemplateSelect,
  onEditTemplate,
  onCreateNew,
  newTemplateName,
  onTemplateNameChange,
  onSaveTemplate,
  onLoadTemplate,
  saveToLibrary,
  onToggleSaveToLibrary,
  savedTrainings = [],
  onDeleteSavedTraining,
  intervalComponents,
  onAddComponent,
  onUpdateComponent,
  onRemoveComponent,
  onDuplicateComponent,
  onMoveComponent,
  showComponentEditor,
  editingComponent,
  onEditComponent,
  onCloseComponentEditor
}: IntervalBuilderProps) {
  const { t } = useTranslation('calendar');
  const translateSportName = (sport: string) => t(`common:sports.${sport}`, {
    defaultValue: sport.charAt(0).toUpperCase() + sport.slice(1)
  });

  // Confirmation dialog state
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'template' | 'training-blocks';
    id?: string;
    name?: string;
  } | null>(null);

  // Validation state
  const [componentErrors, setComponentErrors] = useState<ComponentFieldErrors>({});
  const [builderErrors, setBuilderErrors] = useState<Map<string, ComponentFieldErrors>>(new Map());

  // Template name suggestion
  const [userEditedName, setUserEditedName] = React.useState(false);

  const templateSuggestion = React.useMemo(() => {
    const sportName = getSportDisplayName(selectedTrainingSport);
    return suggestTemplateName(intervalComponents, sportName);
  }, [intervalComponents, selectedTrainingSport]);

  // Auto-fill template name only if user hasn't manually edited it
  React.useEffect(() => {
    if (intervalComponents.length > 0 && !userEditedName) {
      onTemplateNameChange(templateSuggestion.primary);
    }
  }, [templateSuggestion.primary, onTemplateNameChange, intervalComponents.length, userEditedName]);

  // Stacked modal hooks
  const builderModal = useStackedModal('training-builder-modal', {
    level: 2,
    onClose: onCloseIntervalBuilder,
  });

  const componentModal = useStackedModal('component-editor-modal', {
    level: 2,
    onClose: onCloseComponentEditor,
  });

  // Validation helper functions
  const clearFieldError = (field: keyof ComponentFieldErrors) => {
    setComponentErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  const handleFieldChange = (field: string, value: any) => {
    onUpdateComponent(editingComponent?.id || '', field, value);
    clearFieldError(field as keyof ComponentFieldErrors);
  };

  const handleFieldBlur = (field: keyof ComponentFieldErrors) => {
    if (!editingComponent) return;
    const errors = validateTrainingComponent(editingComponent, false);
    if (errors[field]) {
      setComponentErrors(prev => ({
        ...prev,
        [field]: errors[field]
      }));
    }
  };

  // Child component validation helpers
  const handleChildFieldChange = (childIndex: number, field: string, value: any) => {
    if (!editingComponent?.children) return;

    const updatedChildren = editingComponent.children.map((child: any, index: number) =>
      index === childIndex ? { ...child, [field]: value } : child
    );
    onUpdateComponent(editingComponent.id, 'children', updatedChildren);

    // Clear child error if exists
    if (componentErrors.children?.[childIndex]?.[field]) {
      setComponentErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors.children) {
          const childErrors = [...newErrors.children];
          if (childErrors[childIndex]) {
            delete childErrors[childIndex][field];
            if (Object.keys(childErrors[childIndex]).length === 0) {
              childErrors.splice(childIndex, 1);
            }
          }
          newErrors.children = childErrors;
        }
        return newErrors;
      });
    }
  };

  const handleChildFieldBlur = (childIndex: number, field: string) => {
    if (!editingComponent?.children || !editingComponent.children[childIndex]) return;

    const child = editingComponent.children[childIndex];
    const childErrors = validateTrainingComponent(child as any, false);

    if (childErrors[field as keyof ComponentFieldErrors]) {
      setComponentErrors(prev => {
        const newErrors = { ...prev };
        if (!newErrors.children) {
          newErrors.children = [];
        }
        if (!newErrors.children[childIndex]) {
          newErrors.children[childIndex] = {};
        }
        newErrors.children[childIndex][field] = childErrors[field as keyof ComponentFieldErrors]!;
        return newErrors;
      });
    }
  };

  const handleSaveComponent = () => {
    if (!editingComponent) return;

    const errors = validateTrainingComponent(editingComponent, true);

    if (Object.keys(errors).length > 0) {
      setComponentErrors(errors);
      return;
    }

    setComponentErrors({});
    // Clear this component's errors from the builder errors map
    setBuilderErrors(prev => {
      const newErrors = new Map(prev);
      newErrors.delete(editingComponent.id);
      return newErrors;
    });
    onCloseComponentEditor();
  };

  const handleSaveBuilder = () => {
    const allErrors = validateAllComponents(intervalComponents);

    if (allErrors.size > 0) {
      setBuilderErrors(allErrors);
      return;
    }

    setBuilderErrors(new Map());
    onSaveTemplate();
    updateState('showIntervalBuilder', false);
  };

  // Handle both array and paginated response formats
  const savedTrainingsList = Array.isArray(savedTrainings)
    ? savedTrainings
    : (savedTrainings as any)?.results || [];

  const templates = savedTrainingsList.map((saved: any) => ({
    id: saved.id,
    sport: saved.sport,
    name: saved.name,
    description: saved.description || '',
    components: convertTrainingDataToComponents(saved.training_data),
    isCustom: true, // Mark as user-created
  }));

  return (
    <>
      {/* Advanced Training Blocks */}
      <div className="border border-border/20 rounded-lg overflow-hidden">
        {/* Collapsible Header */}
        <button
          type="button"
          onClick={onToggleTrainingBlocks}
          className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Target size={20} className="text-primary" />
            <span className="font-medium text-foreground">{t('intervalBuilder.title')}</span>
          </div>
          {isTrainingBlocksExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {/* Expanded Content */}
        {isTrainingBlocksExpanded && (
          <div className="p-4 space-y-4">
            {/* Sport Selection Tabs */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              {['running', 'cycling', 'swimming', 'strength'].map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => onTrainingSportChange(sport)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors flex-1 justify-center ${
                    selectedTrainingSport === sport
                      ? 'bg-white text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {getSportIcon(sport)}
                  <span className="text-sm font-medium capitalize hidden md:inline">
                    {translateSportName(sport)}
                  </span>
                </button>
              ))}
            </div>

            {/* Current Training (if blocks exist) */}
            {intervalComponents && intervalComponents.length > 0 && (
              <div className="mb-4">
      
                <div
                  className="border rounded-lg overflow-hidden hover:shadow-sm transition-all border-blue-500 bg-blue-50/50"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="flex items-center gap-3 p-3 hover:bg-blue-100/50 transition-colors cursor-pointer bg-blue-100/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenIntervalBuilder();
                      e.nativeEvent.stopImmediatePropagation();
                    }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground text-sm">{newTemplateName || t('intervalBuilder.title')}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {intervalComponents.length} {intervalComponents.length !== 1 ? t('intervalBuilder.blocks') : t('intervalBuilder.block')}: {' '}
                        {intervalComponents.map(c => c.type).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenIntervalBuilder();
                          e.nativeEvent.stopImmediatePropagation();
                        }}
                        className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded transition-colors"
                        title={t('intervalBuilder.editTrainingBuilder')}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete({ type: 'training-blocks', name: newTemplateName });
                          e.nativeEvent.stopImmediatePropagation();
                        }}
                        className="p-1 text-red-600 hover:text-red-700 hover:bg-red-100 rounded transition-colors"
                        title={t('intervalBuilder.removeTrainingBlocks')}
                      >
                        <X size={16} />
                      </button>

                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Templates Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>{t('intervalBuilder.templates')}</h4>
                  <button
                    type="button"
                    onClick={onToggleTemplates}
                    className="p-1 hover:bg-muted rounded transition-colors"
                  >
                    <div className={`transition-transform duration-200 ${isTemplatesExpanded ? 'rotate-180' : 'rotate-0'}`}>
                      <ChevronDown size={16} className="text-muted-foreground hover:text-foreground" />
                    </div>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateNew?.();
                  }}
                  className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-md hover:bg-primary/20 transition-colors text-sm"
                >
                  <Plus size={14} />
                  <span className="hidden md:inline">{t('intervalBuilder.create')}</span>
                </button>
              </div>

              {isTemplatesExpanded && (
                <div className="space-y-2">
                  {templates.map((template) => {
                    const isSelected = selectedTemplateId === template.id;
                    return (
                      <div
                        key={template.id}
                        className={`border rounded-lg overflow-hidden hover:shadow-sm transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                            : 'border-border/10'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.nativeEvent.stopImmediatePropagation();
                        }}
                      >
                        <div
                          className={`flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer ${
                            isSelected ? 'bg-primary/10' : 'bg-muted/30'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            // Toggle selection and load template
                            const newSelectedId = isSelected ? null : template.id;
                            onTemplateSelect?.(newSelectedId);
                            if (!isSelected) {
                              onLoadTemplate(template);
                            }
                          }}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-foreground text-sm">{template.name}</p>
                    
                              {isSelected && (
                                <div className="w-2 h-2 bg-primary rounded-full"></div>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{template.description}</p>

                          </div>

                          <div className="flex items-center gap-1">
                            {(template as any).isCustom && onDeleteSavedTraining && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.nativeEvent.stopImmediatePropagation();
                                  setConfirmDelete({
                                    type: 'template',
                                    id: template.id,
                                    name: template.name
                                  });
                                }}
                                className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                title={t('intervalBuilder.deleteTemplate')}
                              >
                                <X size={16} />
                              </button>
                            )}
        
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {templates.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {t('intervalBuilder.noTemplates', { sport: selectedTrainingSport })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Interval Builder Modal */}
      <StackedModal
        id="training-builder-modal"
        isOpen={showIntervalBuilder}
        onClose={onCloseIntervalBuilder}
        size="xl"
        level={2}
        closeOnBackdropClick={true}
        closeOnEscape={true}
        showCloseButton={false}
        widthVariant="calendar-card"
      >
        {/* Builder Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <div className="flex items-center gap-3">
            {getSportIcon(selectedTrainingSport)}
            <div>
              <h3 className="font-bold text-foreground">{t('intervalBuilder.title')}</h3>
              <p className="text-sm text-muted-foreground capitalize">{selectedTrainingSport}</p>
            </div>
          </div>
          <button
            onClick={onCloseIntervalBuilder}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content area with proper scrolling */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 180px)' }}>
              {/* Template Name */}
              <div className="mb-4">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => {
                    onTemplateNameChange(e.target.value);
                    setUserEditedName(true);
                  }}
                  placeholder={t('intervalBuilder.trainingNamePlaceholder')}
                  className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-lg font-medium"
                />

                {/* Save to Library Checkbox */}
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="save-to-library"
                    checked={saveToLibrary || false}
                    onChange={(e) => onToggleSaveToLibrary?.(e.target.checked)}
                    className="w-4 h-4 text-primary border-border/20 rounded focus:ring-2 focus:ring-primary/20"
                  />
                  <label htmlFor="save-to-library" className="text-sm text-muted-foreground cursor-pointer select-none">
                    {t('intervalBuilder.saveToLibrary')}
                  </label>
                </div>
              </div>

              {/* Add Component Buttons */}
              <div className="mb-6">
                <div className="grid grid-cols-2 gap-2">
                  {(['warmup', 'interval', 'rest', 'cooldown'] as const).map((type) => {
                    const colors = getComponentColor(type);
                    const getPositionHint = (type: string) => {
                      switch (type) {
                        case 'warmup': return '';
                        case 'cooldown': return '';
                        default: return '';
                      }
                    };
                    
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => onAddComponent(type)}
                        className={`flex flex-col items-start gap-1 p-3 rounded-lg border border-border/20 transition-colors ${colors.button} relative group`}
                        title={getPositionHint(type)}
                      >
                        <div className="flex items-center gap-2 w-full">
                          {getComponentIcon(type)}
                          <span className={`font-medium capitalize ${colors.text}`}>{type}</span>
                        </div>
                        {(type === 'warmup' || type === 'cooldown') && (
                          <div className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            {getPositionHint(type)}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Training Components */}
              <div className="space-y-3" id="training-components-container">
                {intervalComponents.map((component, index) => {
                  const colors = getComponentColor(component.type);
                  return (
                    <div key={`wrapper-${component.id}`} className="relative">
                      {/* Drop zone indicator above */}
                      <div 
                        className="h-2 mx-4 rounded opacity-0 transition-all duration-200 drop-zone"
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('opacity-100', 'bg-primary/30', 'border-2', 'border-dashed', 'border-primary');
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('opacity-100', 'bg-primary/30', 'border-2', 'border-dashed', 'border-primary');
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          const targetIndex = index;
                          
                          if (draggedIndex !== targetIndex) {
                            console.log(`Inserting component from ${draggedIndex} before ${targetIndex}`);
                            const adjustedTarget = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
                            onMoveComponent(draggedIndex, adjustedTarget);
                          }
                          
                          // Clean up visual feedback
                          e.currentTarget.classList.remove('opacity-100', 'bg-primary/30', 'border-2', 'border-dashed', 'border-primary');
                        }}
                      ></div>

                      {/* Main component */}
                      <div 
                        key={component.id} 
                        draggable={true}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', index.toString());
                          e.dataTransfer.effectAllowed = 'move';
                          // Add visual feedback
                          e.currentTarget.classList.add('opacity-50', 'scale-95');
                          
                          // Show all drop zones
                          const dropZones = document.querySelectorAll('.drop-zone');
                          dropZones.forEach(zone => zone.classList.add('opacity-30', 'bg-primary/10', 'border', 'border-dashed', 'border-primary/50'));
                        }}
                        onDragEnd={(e) => {
                          // Remove visual feedback
                          e.currentTarget.classList.remove('opacity-50', 'scale-95');
                          
                          // Hide all drop zones
                          const dropZones = document.querySelectorAll('.drop-zone');
                          dropZones.forEach(zone => zone.classList.remove('opacity-30', 'opacity-100', 'bg-primary/10', 'bg-primary/30', 'border', 'border-2', 'border-dashed', 'border-primary/50', 'border-primary'));
                        }}
                        className={`border-l-4 p-4 rounded-lg transition-all duration-200 ${colors.border} ${colors.bg} hover:shadow-md cursor-move select-none ${
                          builderErrors.has(component.id) ? 'ring-2 ring-red-500/50' : ''
                        }`}
                      >
                    <div className="flex items-center justify-between mb-2">
                      {/* Drag Handle */}
                      <div className="flex items-center gap-2">
                        <div className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing">
                          <GripVertical size={16} />
                        </div>

                        {/* Component Info */}
                        <div className="flex items-center gap-2">
                          {getComponentIcon(component.type)}
                          <span className={`font-medium text-sm ${colors.text}`}>{component.name}</span>
                          {component.children && component.children.length > 0 && component.repetitions && component.repetitions > 1 && (
                            <span className="px-2 py-1 bg-muted rounded-full text-xs font-medium">
                              {component.repetitions}x
                            </span>
                          )}
                          {builderErrors.has(component.id) && (
                            <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              <AlertCircle size={12} />
                              <span>{t('intervalBuilder.incomplete')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onEditComponent(component)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title={t('intervalBuilder.edit')}
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDuplicateComponent(component.id)}
                          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                          title={t('intervalBuilder.duplicate')}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveComponent(component.id)}
                          className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                          title={t('intervalBuilder.delete')}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Compact Summary */}
                    <div className="text-xs text-muted-foreground">
                      {component.duration && (
                        <span>
                          {component.duration}
                          {component.durationUnit ? ` ${component.durationUnit}` : ''}
                        </span>
                      )}
                      {component.distance && (
                        <span>
                          {component.duration ? ' • ' : ''}
                          {component.distance}
                          {component.distanceUnit ? ` ${component.distanceUnit}` : ''}
                        </span>
                      )}
                      {component.intensity !== undefined && component.intensity !== null && component.intensity !== '' && (
                        <span>
                          {(component.duration || component.distance) ? ' • ' : ''}@ {component.intensity}%
                          {formatZoneLabel(component.intensityUnit) ? ` ${formatZoneLabel(component.intensityUnit)}` : ''}
                        </span>
                      )}
                
                    </div>

                    {/* Show nested intervals */}
                    {component.children && component.children.length > 0 && (
                      <div className="mt-3 ml-6 space-y-2 border-l-2 border-dashed border-gray-200 pl-3">
                        {component.children.map((child: any) => {
                          const childColors = getComponentColor(child.type);
                          return (
                            <div key={child.id} className={`p-2 rounded border-l-2 ${childColors.border} ${childColors.bg}`}>
                              <div className="flex items-center gap-2">
                                {getComponentIcon(child.type)}
                                <span className={`text-xs font-medium ${childColors.text}`}>{child.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {child.duration && `${child.duration}${child.durationUnit || 'min'}`}
                                  {child.distance && `${child.distance}${child.distanceUnit || 'm'}`}
                                  {child.intensity && ` @ ${child.intensity}%`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                      </div>
                  );
                })}
                
                {/* Final drop zone at the end */}
                <div 
                  className="h-2 mx-4 rounded opacity-0 transition-all duration-200 drop-zone"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.currentTarget.classList.add('opacity-100', 'bg-primary/30', 'border-2', 'border-dashed', 'border-primary');
                  }}
                  onDragLeave={(e) => {
                    e.currentTarget.classList.remove('opacity-100', 'bg-primary/30', 'border-2', 'border-dashed', 'border-primary');
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                    const targetIndex = intervalComponents.length - 1; // Move to end
                    
                    if (draggedIndex !== targetIndex) {
                      console.log(`Moving component from ${draggedIndex} to end`);
                      onMoveComponent(draggedIndex, targetIndex);
                    }
                    
                    // Clean up visual feedback
                    e.currentTarget.classList.remove('opacity-100', 'bg-primary/30', 'border-2', 'border-dashed', 'border-primary');
                  }}
                ></div>
                
                {intervalComponents.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target size={24} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{t('intervalBuilder.addComponentsMessage')}</p>
                  </div>
                )}
              </div>

              {/* Save Actions */}
              <div className="flex gap-3 pt-6 border-t border-border/20 mt-6">
                <button
                  onClick={onCloseIntervalBuilder}
                  className="flex-1 px-4 py-2 border border-border/20 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  {t('intervalBuilder.cancel')}
                </button>
                <button
                  onClick={handleSaveBuilder}
                  disabled={!newTemplateName.trim() || intervalComponents.length === 0 || builderErrors.size > 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Save size={16} />
                  {t('intervalBuilder.save')}
                  {builderErrors.size > 0 && (
                    <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                      {builderErrors.size}
                    </span>
                  )}
                </button>
              </div>
              {builderErrors.size > 0 && (
                <div className="flex items-center gap-2 text-red-500 text-sm mt-2 px-4">
                  <AlertCircle size={14} />
                  <span>{t('intervalBuilder.validationErrors', { count: builderErrors.size })}</span>
                </div>
              )}
            </div>
      </StackedModal>

      {/* Component Editor Modal */}
      <StackedModal
        id="component-editor-modal"
        isOpen={showComponentEditor && !!editingComponent}
        onClose={onCloseComponentEditor}
        size="sm"
        level={2}
        closeOnBackdropClick={true}
        closeOnEscape={true}
        showCloseButton={false}
        widthVariant="calendar-card"
      >
        {editingComponent && (
          <>
            {/* Editor Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/20">
              <div className="flex items-center gap-3">
                {getComponentIcon(editingComponent.type)}
                <div>
                  <h3 className="font-bold text-foreground">{t('intervalBuilder.editComponent')}</h3>
                  <p className="text-sm text-muted-foreground capitalize">{editingComponent.type}</p>
                </div>
              </div>
              <button
                onClick={onCloseComponentEditor}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content area with proper scrolling */}
            <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 220px)' }}>
              {/* Component Name */}
              <div>
                <RequiredLabel required>{t('intervalBuilder.name')}</RequiredLabel>
                <input
                  type="text"
                  value={editingComponent.name}
                  onChange={(e) => handleFieldChange('name', e.target.value)}
                  onBlur={() => handleFieldBlur('name')}
                  className={getInputClassName(!!componentErrors.name, "w-full px-3 py-2 border rounded-lg")}
                  placeholder={t('intervalBuilder.enterComponentName')}
                />
                <FieldError error={componentErrors.name} />
              </div>

              {/* Fields for Warm-up, Rest, Cool-down: Only Duration and Notes */}
              {(editingComponent.type === 'warmup' || editingComponent.type === 'rest' || editingComponent.type === 'cooldown') && (
                <>
                  {/* Duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <RequiredLabel required>{t('intervalBuilder.duration')}</RequiredLabel>
                      <input
                        type="text"
                        value={editingComponent.duration || ''}
                        onChange={(e) => handleFieldChange('duration', e.target.value)}
                        onBlur={() => handleFieldBlur('duration')}
                        className={getInputClassName(!!componentErrors.duration, "w-full px-3 py-2 border rounded-lg")}
                        placeholder={t('intervalBuilder.enterDuration')}
                      />
                      <FieldError error={componentErrors.duration} />
                    </div>
                    <div>
                      <RequiredLabel required={!!editingComponent.duration}>{t('intervalBuilder.unit')}</RequiredLabel>
                      <select
                        value={editingComponent.durationUnit || ''}
                        onChange={(e) => handleFieldChange('durationUnit', e.target.value)}
                        onBlur={() => handleFieldBlur('durationUnit')}
                        className={getInputClassName(!!componentErrors.durationUnit, "w-full px-3 py-2 border rounded-lg")}
                      >
                        <option value="" disabled>{t('intervalBuilder.selectUnit')}</option>
                        <option value="sec">{t('intervalBuilder.seconds')}</option>
                        <option value="min">{t('intervalBuilder.minutes')}</option>
                      </select>
                      <FieldError error={componentErrors.durationUnit} />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t('intervalBuilder.notes')}</label>
                    <textarea
                      value={editingComponent.notes || ''}
                      onChange={(e) => onUpdateComponent(editingComponent.id, 'notes', e.target.value)}
                      className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      rows={3}
                      placeholder={t('intervalBuilder.notesPlaceholder')}
                    />
                  </div>
                </>
              )}

              {/* Fields for Intervals: Time/Distance toggle + complex options */}
              {editingComponent.type === 'interval' && (
                <>
                  {/* If no sub-intervals, show time/distance toggle and fields - SIMPLE INTERVAL */}
                  {(!editingComponent.children || editingComponent.children.length === 0) && (
                    <>

                      {/* Time/Distance Toggle */}
                      <div>
                        <label className="block text-sm font-medium text-foreground mb-2">{t('intervalBuilder.intervalType')}</label>
                        <div className="flex gap-2 p-1 bg-muted rounded-lg">
                          <button
                            type="button"
                            onClick={() => {
                              console.log('Setting intervalType to time for component:', editingComponent.id);
                              onUpdateComponent(editingComponent.id, 'intervalType', 'time');
                            }}
                            className={`flex-1 px-3 py-2 rounded-md transition-colors ${
                              (editingComponent.intervalType || 'time') === 'time'
                                ? 'bg-white text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {t('intervalBuilder.timeBased')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              console.log('Setting intervalType to distance for component:', editingComponent.id);
                              onUpdateComponent(editingComponent.id, 'intervalType', 'distance');
                            }}
                            className={`flex-1 px-3 py-2 rounded-md transition-colors ${
                              editingComponent.intervalType === 'distance'
                                ? 'bg-white text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {t('intervalBuilder.distanceBased')}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('intervalBuilder.currentType')}: {editingComponent.intervalType || 'time'}
                        </p>
                      </div>

                      {/* Time-based fields */}
                      {(editingComponent.intervalType || 'time') === 'time' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <RequiredLabel required>{t('intervalBuilder.duration')}</RequiredLabel>
                            <input
                              type="text"
                              value={editingComponent.duration || ''}
                              onChange={(e) => handleFieldChange('duration', e.target.value)}
                              onBlur={() => handleFieldBlur('duration')}
                              className={getInputClassName(!!componentErrors.duration, "w-full px-3 py-2 border rounded-lg")}
                              placeholder={t('intervalBuilder.enterDuration')}
                            />
                            <FieldError error={componentErrors.duration} />
                          </div>
                          <div>
                            <RequiredLabel required={!!editingComponent.duration}>{t('intervalBuilder.unit')}</RequiredLabel>
                            <select
                              value={editingComponent.durationUnit || ''}
                              onChange={(e) => handleFieldChange('durationUnit', e.target.value)}
                              onBlur={() => handleFieldBlur('durationUnit')}
                              className={getInputClassName(!!componentErrors.durationUnit, "w-full px-3 py-2 border rounded-lg")}
                            >
                              <option value="" disabled>{t('intervalBuilder.selectUnit')}</option>
                              <option value="sec">{t('intervalBuilder.seconds')}</option>
                              <option value="min">{t('intervalBuilder.minutes')}</option>
                            </select>
                            <FieldError error={componentErrors.durationUnit} />
                          </div>
                        </div>
                      )}

                      {/* Distance-based fields */}
                      {editingComponent.intervalType === 'distance' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <RequiredLabel required>{t('intervalBuilder.distance')}</RequiredLabel>
                            <input
                              type="text"
                              value={editingComponent.distance || ''}
                              onChange={(e) => handleFieldChange('distance', e.target.value)}
                              onBlur={() => handleFieldBlur('distance')}
                              classNamsubIntervalse={getInputClassName(!!componentErrors.distance, "w-full px-3 py-2 border rounded-lg")}
                              placeholder={t('intervalBuilder.enterDistance')}
                            />
                            <FieldError error={componentErrors.distance} />
                          </div>
                          <div>
                            <RequiredLabel required={!!editingComponent.distance}>{t('intervalBuilder.unit')}</RequiredLabel>
                            <select
                              value={editingComponent.distanceUnit || ''}
                              onChange={(e) => handleFieldChange('distanceUnit', e.target.value)}
                              onBlur={() => handleFieldBlur('distanceUnit')}
                              className={getInputClassName(!!componentErrors.distanceUnit, "w-full px-3 py-2 border rounded-lg")}
                            >
                              <option value="" disabled>{t('intervalBuilder.selectUnit')}</option>
                              <option value="m">{t('intervalBuilder.meters')}</option>
                              <option value="km">{t('intervalBuilder.kilometers')}</option>
                            </select>
                            <FieldError error={componentErrors.distanceUnit} />
                          </div>
                        </div>
                      )}

                      {/* Intensity for simple intervals */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-1">{t('intervalBuilder.intensity')}</label>
                          <input
                            type="number"
                            min="1"
                            max="110"
                            value={editingComponent.intensity ?? ''}
                            onChange={(e) => {
                              const rawValue = e.target.value;
                              if (rawValue === '') {
                                handleFieldChange('intensity', undefined);
                                return;
                              }
                              const parsedValue = parseInt(rawValue, 10);
                              handleFieldChange(
                                'intensity',
                                Number.isNaN(parsedValue) ? undefined : parsedValue
                              );
                            }}
                            onBlur={() => handleFieldBlur('intensity')}
                            className={getInputClassName(!!componentErrors.intensity, "w-full px-3 py-2 border rounded-lg")}
                            placeholder={t('intervalBuilder.optional')}
                          />
                          <FieldError error={componentErrors.intensity} />
                        </div>
                        <div>
                          <RequiredLabel required={editingComponent.intensity !== undefined && editingComponent.intensity !== null && editingComponent.intensity !== ''}>
                            {t('intervalBuilder.zoneType')}
                          </RequiredLabel>
                          <select
                            value={editingComponent.intensityUnit || ''}
                            onChange={(e) => handleFieldChange('intensityUnit', e.target.value)}
                            onBlur={() => handleFieldBlur('intensityUnit')}
                            className={getInputClassName(!!componentErrors.intensityUnit, "w-full px-3 py-2 border rounded-lg")}
                          >
                            <option value="" disabled>{t('intervalBuilder.selectZone')}</option>
                            <option value="heart_rate">{t('intervalBuilder.zoneTypes.heartRate')}</option>
                            <option value="MAS">{t('intervalBuilder.mas')}</option>
                            <option value="FPP">{t('intervalBuilder.fpp')}</option>
                            <option value="CSS">{t('intervalBuilder.css')}</option>
                          </select>
                          <FieldError error={componentErrors.intensityUnit} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* If has sub-intervals, show only name, repetitions, and sub-interval editor - COMPLEX INTERVAL */}
                  {(editingComponent.children && editingComponent.children.length > 0) && (
                    <>
                  

                      <div>
                        <RequiredLabel required>{t('intervalBuilder.setRepetitions')}</RequiredLabel>
                        <input
                          type="number"
                          min="1"
                          value={editingComponent.repetitions ?? ''}
                          onChange={(e) => {
                            const rawValue = e.target.value;
                            if (rawValue === '') {
                              handleFieldChange('repetitions', undefined);
                              return;
                            }
                            const parsedValue = parseInt(rawValue, 10);
                            handleFieldChange(
                              'repetitions',
                              Number.isNaN(parsedValue) || parsedValue < 1 ? 1 : parsedValue
                            );
                          }}
                          onBlur={() => handleFieldBlur('repetitions')}
                          className={getInputClassName(!!componentErrors.repetitions, "w-full px-3 py-2 border rounded-lg")}
                          placeholder={t('intervalBuilder.enterRepetitions')}
                        />
                        <FieldError error={componentErrors.repetitions} />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('intervalBuilder.repetitionsHint')}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Nested Intervals Section */}
                  <div className="border-t border-border/20 pt-4">
                    

                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-foreground">{t('intervalBuilder.subIntervals')}</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            // Add nested interval with auto-name
                            const baseChildren = (editingComponent.children || []).map((child: any) => ({
                              ...child,
                              _editing: false,
                            }));

                            // Generate auto-name for new work interval
                            const autoName = generateChildName('interval', baseChildren);

                            const newChild = {
                              id: `child-${Date.now()}`,
                              type: 'interval',
                              name: autoName,
                              duration: '',
                              durationUnit: undefined,
                              distance: '',

                              distanceUnit: undefined,
                              intensity: undefined,
                              intensityUnit: undefined,
                              intervalType: 'time',
                              _editing: true,
                            };

                            const updatedChildren = [...baseChildren, newChild];
                            onUpdateComponent(editingComponent.id, 'children', updatedChildren);
                            onUpdateComponent(editingComponent.id, 'duration', '');
                            onUpdateComponent(editingComponent.id, 'durationUnit', undefined);
                            onUpdateComponent(editingComponent.id, 'distance', '');
                            onUpdateComponent(editingComponent.id, 'distanceUnit', undefined);
                            onUpdateComponent(editingComponent.id, 'intensity', undefined);
                            onUpdateComponent(editingComponent.id, 'intensityUnit', undefined);
                            onUpdateComponent(editingComponent.id, 'intervalType', undefined);
                          }}
                          className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          + {t('intervalBuilder.work')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            // Add nested rest with auto-name
                            const baseChildren = (editingComponent.children || []).map((child: any) => ({
                              ...child,
                              _editing: false,
                            }));

                            // Generate auto-name for new rest interval
                            const autoName = generateChildName('rest', baseChildren);

                            const newChild = {
                              id: `child-${Date.now()}`,
                              type: 'rest',
                              name: autoName,
                              duration: '',
                              durationUnit: undefined,
                              distance: '',
                              distanceUnit: undefined,
                              _editing: true,
                            };
                            const updatedChildren = [...baseChildren, newChild];
                            onUpdateComponent(editingComponent.id, 'children', updatedChildren);
                            onUpdateComponent(editingComponent.id, 'duration', '');
                            onUpdateComponent(editingComponent.id, 'durationUnit', undefined);
                            onUpdateComponent(editingComponent.id, 'distance', '');
                            onUpdateComponent(editingComponent.id, 'distanceUnit', undefined);
                            onUpdateComponent(editingComponent.id, 'intensity', undefined);
                            onUpdateComponent(editingComponent.id, 'intensityUnit', undefined);
                            onUpdateComponent(editingComponent.id, 'intervalType', undefined);
                          }}
                          className="px-2 py-1 text-xs bg-gray-50 text-gray-600 rounded hover:bg-gray-100"
                        >
                          + {t('intervalBuilder.rest')}
                        </button>
                      </div>
                    </div>

                    {/* Display nested intervals */}
                    {editingComponent.children && editingComponent.children.length > 0 && (
                      <>
                        <div className="space-y-2 ml-4 border-l-2 border-dashed border-gray-200 pl-4">
                          {editingComponent.children.map((child: any, index: number) => {
                            const childColors = getComponentColor(child.type);
                            return (
                              <div key={child.id} className={`border border-border/20 rounded-lg overflow-hidden`}>
                                <div className={`flex items-center justify-between p-3 ${childColors.bg} ${childColors.border} border-l-4`}>
                                  <div className="flex items-center gap-2">
                                    {getComponentIcon(child.type)}
                                    <div>
                                      <span className={`text-sm font-medium ${childColors.text}`}>{child.name}</span>
                                      <div className="text-xs text-muted-foreground">
                                        {child.duration && (
                                          <span>
                                            {child.duration}
                                            {child.durationUnit ? ` ${child.durationUnit}` : ''}
                                          </span>
                                        )}
                                        {child.distance && (
                                          <span>
                                            {child.duration ? ' • ' : ''}
                                            {child.distance}
                                            {child.distanceUnit ? ` ${child.distanceUnit}` : ''}
                                          </span>
                                        )}
                                        {child.intensity !== undefined && child.intensity !== null && child.intensity !== '' && (
                                          <span>
                                            {(child.duration || child.distance) ? ' • ' : ''}@ {child.intensity}%
                                            {formatZoneLabel(child.intensityUnit) ? ` ${formatZoneLabel(child.intensityUnit)}` : ''}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Open inline editor for this sub-interval
                                        const expandedChildren = editingComponent.children.map((c: any, i: number) => 
                                          i === index ? { ...c, _editing: !c._editing } : { ...c, _editing: false }
                                        );
                                        onUpdateComponent(editingComponent.id, 'children', expandedChildren);
                                      }}
                                      className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                      title={t('intervalBuilder.edit')}
                                    >
                                      <Edit3 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedChildren = editingComponent.children.filter((_: any, i: number) => i !== index);
                                        onUpdateComponent(editingComponent.id, 'children', updatedChildren);
                                      }}
                                      className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                      title={t('intervalBuilder.delete')}
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>

                                {/* Inline Editor for Sub-interval */}
                                {child._editing && (
                                  <div className="p-4 bg-white border-t border-border/20 space-y-3">
                                    {/* Name */}
                                    <div>
                                      <RequiredLabel required className="block text-xs font-medium text-muted-foreground mb-1">
                                        {t('intervalBuilder.name')}
                                      </RequiredLabel>
                                      <input
                                        type="text"
                                        value={child.name}
                                        onChange={(e) => handleChildFieldChange(index, 'name', e.target.value)}
                                        onBlur={() => handleChildFieldBlur(index, 'name')}
                                        className={getInputClassName(
                                          !!(componentErrors.children?.[index]?.name),
                                          "w-full px-2 py-1 text-sm border rounded"
                                        )}
                                        placeholder={t('intervalBuilder.enterName')}
                                      />
                                      <FieldError error={componentErrors.children?.[index]?.name} />
                                    </div>

                                    {/* Duration/Distance based on type */}
                                    {child.type !== 'rest' && (
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <RequiredLabel required className="block text-xs font-medium text-muted-foreground mb-1">
                                            {child.intervalType === 'distance' ? t('intervalBuilder.distance') : t('intervalBuilder.duration')}
                                          </RequiredLabel>
                                          <input
                                            type="text"
                                            value={child.intervalType === 'distance' ? child.distance || '' : child.duration || ''}
                                            onChange={(e) => {
                                              const field = child.intervalType === 'distance' ? 'distance' : 'duration';
                                              handleChildFieldChange(index, field, e.target.value);
                                            }}
                                            onBlur={() => {
                                              const field = child.intervalType === 'distance' ? 'distance' : 'duration';
                                              handleChildFieldBlur(index, field);
                                            }}
                                            className={getInputClassName(
                                              !!(componentErrors.children?.[index]?.[child.intervalType === 'distance' ? 'distance' : 'duration']),
                                              "w-full px-2 py-1 text-sm border rounded"
                                            )}
                                            placeholder={child.intervalType === 'distance' ? t('intervalBuilder.enterDistance') : t('intervalBuilder.enterDuration')}
                                          />
                                          <FieldError error={componentErrors.children?.[index]?.[child.intervalType === 'distance' ? 'distance' : 'duration']} />
                                        </div>
                                        <div>
                                          <RequiredLabel
                                            required={!!(child.intervalType === 'distance' ? child.distance : child.duration)}
                                            className="block text-xs font-medium text-muted-foreground mb-1"
                                          >
                                            {t('intervalBuilder.unit')}
                                          </RequiredLabel>
                                          <select
                                            value={child.intervalType === 'distance' ? (child.distanceUnit || '') : (child.durationUnit || '')}
                                            onChange={(e) => {
                                              const field = child.intervalType === 'distance' ? 'distanceUnit' : 'durationUnit';
                                              handleChildFieldChange(index, field, e.target.value);
                                            }}
                                            onBlur={() => {
                                              const field = child.intervalType === 'distance' ? 'distanceUnit' : 'durationUnit';
                                              handleChildFieldBlur(index, field);
                                            }}
                                            className={getInputClassName(
                                              !!(componentErrors.children?.[index]?.[child.intervalType === 'distance' ? 'distanceUnit' : 'durationUnit']),
                                              "w-full px-2 py-1 text-sm border rounded"
                                            )}
                                          >
                                            {child.intervalType === 'distance' ? (
                                              <>
                                                <option value="" disabled>{t('intervalBuilder.selectUnit')}</option>
                                                <option value="m">{t('intervalBuilder.meters')}</option>
                                                <option value="km">{t('intervalBuilder.kilometers')}</option>
                                              </>
                                            ) : (
                                              <>
                                                <option value="" disabled>{t('intervalBuilder.selectUnit')}</option>
                                                <option value="sec">{t('intervalBuilder.seconds')}</option>
                                                <option value="min">{t('intervalBuilder.minutes')}</option>
                                              </>
                                            )}
                                          </select>
                                          <FieldError error={componentErrors.children?.[index]?.[child.intervalType === 'distance' ? 'distanceUnit' : 'durationUnit']} />
                                        </div>
                                      </div>
                                    )}

                                    {/* Duration for rest */}
                                    {child.type === 'rest' && (
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <RequiredLabel required className="block text-xs font-medium text-muted-foreground mb-1">
                                            Duration
                                          </RequiredLabel>
                                          <input
                                            type="text"
                                            value={child.duration || ''}
                                            onChange={(e) => handleChildFieldChange(index, 'duration', e.target.value)}
                                            onBlur={() => handleChildFieldBlur(index, 'duration')}
                                            className={getInputClassName(
                                              !!(componentErrors.children?.[index]?.duration),
                                              "w-full px-2 py-1 text-sm border rounded"
                                            )}
                                            placeholder={t('intervalBuilder.enterDuration')}
                                          />
                                          <FieldError error={componentErrors.children?.[index]?.duration} />
                                        </div>
                                        <div>
                                          <RequiredLabel required={!!child.duration} className="block text-xs font-medium text-muted-foreground mb-1">
                                            {t('intervalBuilder.unit')}
                                          </RequiredLabel>
                                          <select
                                            value={child.durationUnit || ''}
                                            onChange={(e) => handleChildFieldChange(index, 'durationUnit', e.target.value)}
                                            onBlur={() => handleChildFieldBlur(index, 'durationUnit')}
                                            className={getInputClassName(
                                              !!(componentErrors.children?.[index]?.durationUnit),
                                              "w-full px-2 py-1 text-sm border rounded"
                                            )}
                                          >
                                            <option value="" disabled>{t('intervalBuilder.selectUnit')}</option>
                                            <option value="sec">{t('intervalBuilder.seconds')}</option>
                                            <option value="min">{t('intervalBuilder.minutes')}</option>
                                          </select>
                                          <FieldError error={componentErrors.children?.[index]?.durationUnit} />
                                        </div>
                                      </div>
                                    )}

                                    {/* Intensity for work intervals */}
                                    {child.type === 'interval' && (
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="block text-xs font-medium text-muted-foreground mb-1">{t('intervalBuilder.intensity')}</label>
                                          <input
                                            type="number"
                                            min="1"
                                            max="110"
                                            value={child.intensity ?? ''}
                                            onChange={(e) => {
                                              const rawValue = e.target.value;
                                              if (rawValue === '') {
                                                handleChildFieldChange(index, 'intensity', undefined);
                                                return;
                                              }
                                              const parsedValue = parseInt(rawValue, 10);
                                              handleChildFieldChange(
                                                index,
                                                'intensity',
                                                Number.isNaN(parsedValue) ? undefined : parsedValue
                                              );
                                            }}
                                            onBlur={() => handleChildFieldBlur(index, 'intensity')}
                                            className={getInputClassName(
                                              !!(componentErrors.children?.[index]?.intensity),
                                              "w-full px-2 py-1 text-sm border rounded"
                                            )}
                                            placeholder={t('intervalBuilder.optional')}
                                          />
                                          <FieldError error={componentErrors.children?.[index]?.intensity} />
                                        </div>
                                        <div>
                                          <RequiredLabel
                                            required={child.intensity !== undefined && child.intensity !== null && child.intensity !== ''}
                                            className="block text-xs font-medium text-muted-foreground mb-1"
                                          >
                                            {t('intervalBuilder.zoneType')}
                                          </RequiredLabel>
                                          <select
                                            value={child.intensityUnit || ''}
                                            onChange={(e) => handleChildFieldChange(index, 'intensityUnit', e.target.value)}
                                            onBlur={() => handleChildFieldBlur(index, 'intensityUnit')}
                                            className={getInputClassName(
                                              !!(componentErrors.children?.[index]?.intensityUnit),
                                              "w-full px-2 py-1 text-sm border rounded"
                                            )}
                                          >
                                            <option value="" disabled>{t('intervalBuilder.selectZone')}</option>
                                            <option value="heart_rate">{t('intervalBuilder.zoneTypes.heartRate')}</option>
                                            <option value="MAS">{t('intervalBuilder.mas')}</option>
                                            <option value="FPP">{t('intervalBuilder.fpp')}</option>
                                            <option value="CSS">{t('intervalBuilder.css')}</option>
                                          </select>
                                          <FieldError error={componentErrors.children?.[index]?.intensityUnit} />
                                        </div>
                                      </div>
                                    )}

                                    {/* Toggle time/distance for work intervals */}
                                    {child.type === 'interval' && (
                                      <div>
                                        <label className="block text-xs font-medium text-muted-foreground mb-1">{t('intervalBuilder.intervalType')}</label>
                                        <div className="flex gap-1">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              console.log('🔄 Setting child intervalType to TIME for child:', child.name || `child-${index}`);
                                              const updatedChildren = editingComponent.children.map((c: any, i: number) =>
                                                i === index ? { ...c, intervalType: 'time' } : c
                                              );
                                              console.log('📝 Updated child:', updatedChildren[index]);
                                              onUpdateComponent(editingComponent.id, 'children', updatedChildren);
                                            }}
                                            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                              (child.intervalType || 'time') === 'time'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                            }`}
                                          >
                                            {t('intervalBuilder.timeBased')}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              console.log('🔄 Setting child intervalType to DISTANCE for child:', child.name || `child-${index}`);
                                              const updatedChildren = editingComponent.children.map((c: any, i: number) =>
                                                i === index ? { ...c, intervalType: 'distance' } : c
                                              );
                                              console.log('📝 Updated child:', updatedChildren[index]);
                                              onUpdateComponent(editingComponent.id, 'children', updatedChildren);
                                            }}
                                            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                                              child.intervalType === 'distance'
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-muted text-muted-foreground hover:bg-muted/70'
                                            }`}
                                          >
                                            {t('intervalBuilder.distanceBased')}
                                          </button>
                                        </div>
                                      </div>
                                    )}

                                    {/* Close editor */}
                                    <div className="flex justify-end pt-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedChildren = editingComponent.children.map((c: any) => 
                                            ({ ...c, _editing: false })
                                          );
                                          onUpdateComponent(editingComponent.id, 'children', updatedChildren);
                                        }}
                                        className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                      >
                                        {t('intervalBuilder.save')}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">{t('intervalBuilder.notes')}</label>
                    <textarea
                      value={editingComponent.notes || ''}
                      onChange={(e) => onUpdateComponent(editingComponent.id, 'notes', e.target.value)}
                      className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      rows={3}
                      placeholder={t('intervalBuilder.notesPlaceholder')}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-border/20">
              <button
                onClick={onCloseComponentEditor}
                className="flex-1 px-4 py-2 border border-border/20 rounded-lg hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveComponent}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </>
        )}
      </StackedModal>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        open={!!confirmDelete}
        title={confirmDelete?.type === 'template' ? 'Delete Template' : 'Remove Training Blocks'}
        description={
          confirmDelete?.type === 'template'
            ? `Are you sure you want to delete the template "${confirmDelete.name}"? This action cannot be undone.`
            : `Are you sure you want to remove all training blocks from "${confirmDelete?.name || 'this training'}"? This will not delete the template.`
        }
        confirmLabel={confirmDelete?.type === 'template' ? 'Delete Template' : 'Remove Blocks'}
        cancelLabel="Cancel"
        onConfirm={() => {
          if (confirmDelete?.type === 'template' && confirmDelete.id && onDeleteSavedTraining) {
            onDeleteSavedTraining(confirmDelete.id);
          } else if (confirmDelete?.type === 'training-blocks') {
            // Clear all training blocks by loading an empty template
            onLoadTemplate({
              id: 'empty',
              sport: selectedTrainingSport,
              name: newTemplateName,
              description: '',
              components: []
            });
          }
          setConfirmDelete(null);
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </>
  );
});
