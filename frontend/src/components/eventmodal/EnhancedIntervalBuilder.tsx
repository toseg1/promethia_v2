import React, { memo, useState, useCallback } from 'react';
import {
  Target,
  ChevronDown,
  ChevronUp,
  Footprints,
  Bike,
  Waves,
  Dumbbell,
  X,
  Plus,
  GripVertical,
  Copy,
  Edit3,
  Play,
  Square,
  RotateCcw,
  Save,
  Repeat,
  Clock,
  Zap,
  Heart,
  Timer,
  ChevronRight,
  Layers,
  Move3D
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { IntervalComponent, TrainingTemplate } from './types';
import { StackedModal } from '../ui/StackedModal';
import { useStackedModal } from '../../hooks/useStackedModal';

interface EnhancedIntervalBuilderProps {
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
  
  // Template management
  newTemplateName: string;
  onTemplateNameChange: (name: string) => void;
  onSaveTemplate: () => void;
  onLoadTemplate: (template: TrainingTemplate) => void;
  
  // Components management
  intervalComponents: IntervalComponent[];
  onAddComponent: (type: IntervalComponent['type'], parentId?: string) => void;
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

// Enhanced color system for cascade structure
const getComponentColor = (type: IntervalComponent['type']) => {
  switch (type) {
    case 'warmup': return { 
      border: 'border-l-orange-500', 
      bg: 'bg-orange-50', 
      text: 'text-orange-600',
      icon: 'text-orange-600'
    };
    case 'repeat': return { 
      border: 'border-l-purple-500', 
      bg: 'bg-purple-50', 
      text: 'text-purple-600',
      icon: 'text-purple-600'
    };
    case 'run': return { 
      border: 'border-l-blue-500', 
      bg: 'bg-blue-50', 
      text: 'text-blue-600',
      icon: 'text-blue-600'
    };
    case 'recover': return { 
      border: 'border-l-emerald-500', 
      bg: 'bg-emerald-50', 
      text: 'text-emerald-600',
      icon: 'text-emerald-600'
    };
    case 'interval': return { 
      border: 'border-l-red-500', 
      bg: 'bg-red-50', 
      text: 'text-red-600',
      icon: 'text-red-600'
    };
    case 'rest': return { 
      border: 'border-l-gray-500', 
      bg: 'bg-gray-50', 
      text: 'text-gray-600',
      icon: 'text-gray-600'
    };
    case 'cooldown': return { 
      border: 'border-l-green-500', 
      bg: 'bg-green-50', 
      text: 'text-green-600',
      icon: 'text-green-600'
    };
    default: return { 
      border: 'border-l-gray-300', 
      bg: 'bg-gray-50', 
      text: 'text-gray-600',
      icon: 'text-gray-600'
    };
  }
};

const getComponentIcon = (type: IntervalComponent['type']) => {
  const colors = getComponentColor(type);
  switch (type) {
    case 'warmup': return <Play size={16} className={colors.icon} />;
    case 'repeat': return <Repeat size={16} className={colors.icon} />;
    case 'run': return <Zap size={16} className={colors.icon} />;
    case 'recover': return <Heart size={16} className={colors.icon} />;
    case 'interval': return <Target size={16} className={colors.icon} />;
    case 'rest': return <Square size={16} className={colors.icon} />;
    case 'cooldown': return <RotateCcw size={16} className={colors.icon} />;
    default: return <Target size={16} className={colors.icon} />;
  }
};

const getSportIcon = (sport: string) => {
  switch (sport) {
    case 'running': return <Footprints size={16} />;
    case 'cycling': return <Bike size={16} />;
    case 'swimming': return <Waves size={16} />;
    case 'strength': return <Dumbbell size={16} />;
    default: return <Target size={16} />;
  }
};

// Recursive component renderer for nested intervals
const IntervalComponentRenderer: React.FC<{
  component: IntervalComponent;
  level: number;
  onEdit: (component: IntervalComponent) => void;
  onRemove: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddChild: (type: IntervalComponent['type'], parentId: string) => void;
}> = memo(({ component, level, onEdit, onRemove, onDuplicate, onAddChild }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const colors = getComponentColor(component.type);
  const indentLevel = level * 16; // 16px per level

const formatDuration = (duration?: string) => {
  if (!duration) return '';
  return duration.includes(':') ? duration : `${duration}s`;
};

const formatZoneLabel = (unit?: string | null) => {
  if (!unit) {
    return undefined;
  }

  switch (unit) {
    case 'heart_rate':
    case 'hr':
      return 'Heart Rate';
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

  const getComponentSummary = (comp: IntervalComponent) => {
    const parts = [];
    if (comp.count) parts.push(`${comp.count}x`);
    if (comp.duration) parts.push(formatDuration(comp.duration));
    if (comp.intensity !== undefined && comp.intensity !== null) {
      const label = formatZoneLabel(comp.intensityUnit);
      parts.push(`${comp.intensity}%${label ? ` ${label}` : ''}`);
    }
    return parts.length > 0 ? parts.join(' • ') : '';
  };

  return (
    <div style={{ marginLeft: `${indentLevel}px` }}>
      <div className={`${colors.border} ${colors.bg} p-3 rounded-lg mb-2 border-l-4`}>
        <div className="flex items-center justify-between">
          {/* Left side - Component info */}
          <div className="flex items-center gap-3 flex-1">
            {/* Drag handle */}
            <button className="cursor-grab text-muted-foreground hover:text-foreground">
              <GripVertical size={14} />
            </button>
            
            {/* Expand/collapse for nested components */}
            {component.children && component.children.length > 0 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDown 
                  size={16} 
                  className={`transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} 
                />
              </button>
            )}
            
            {/* Component icon and name */}
            <div className="flex items-center gap-2">
              {getComponentIcon(component.type)}
              <div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${colors.text}`}>
                    {component.name}
                  </span>
                  {component.count && (
                    <span className="px-2 py-0.5 bg-black/10 rounded-full text-xs font-semibold">
                      {component.count}x
                    </span>
                  )}
                </div>
                {getComponentSummary(component) && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {getComponentSummary(component)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-1">
            {/* Add nested component for repeat blocks */}
            {(component.type === 'repeat') && (
              <div className="relative group">
                <button
                  className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                  title="Add nested interval"
                >
                  <Plus size={14} />
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white shadow-lg border rounded-lg p-2 hidden group-hover:block z-10 min-w-[120px]">
                  <button
                    onClick={() => onAddChild('run', component.id)}
                    className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded text-sm flex items-center gap-2"
                  >
                    <Zap size={12} className="text-blue-600" />
                    Run
                  </button>
                  <button
                    onClick={() => onAddChild('recover', component.id)}
                    className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded text-sm flex items-center gap-2"
                  >
                    <Heart size={12} className="text-emerald-600" />
                    Recover
                  </button>
                  <button
                    onClick={() => onAddChild('repeat', component.id)}
                    className="w-full text-left px-2 py-1 hover:bg-gray-50 rounded text-sm flex items-center gap-2"
                  >
                    <Repeat size={12} className="text-purple-600" />
                    Repeat
                  </button>
                </div>
              </div>
            )}
            
            <button
              onClick={() => onEdit(component)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
              title="Edit"
            >
              <Edit3 size={14} />
            </button>
            <button
              onClick={() => onDuplicate(component.id)}
              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
              title="Duplicate"
            >
              <Copy size={14} />
            </button>
            <button
              onClick={() => onRemove(component.id)}
              className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
              title="Remove"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Render nested children */}
      {isExpanded && component.children && component.children.length > 0 && (
        <div className="ml-4 border-l-2 border-dashed border-gray-200 pl-4">
          {component.children.map((child) => (
            <IntervalComponentRenderer
              key={child.id}
              component={child}
              level={level + 1}
              onEdit={onEdit}
              onRemove={onRemove}
              onDuplicate={onDuplicate}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Training Summary Card Component
const TrainingSummaryCard: React.FC<{
  components: IntervalComponent[];
  templateName: string;
}> = memo(({ components, templateName }) => {
  const calculateTotalDuration = (comps: IntervalComponent[]): number => {
    let total = 0;
    comps.forEach(comp => {
      if (comp.duration) {
        const duration = parseFloat(comp.duration.replace(':', '.')) || 0;
        const multiplier = comp.count || 1;
        total += duration * multiplier;
      }
      if (comp.children) {
        total += calculateTotalDuration(comp.children) * (comp.count || 1);
      }
    });
    return total;
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const totalDuration = calculateTotalDuration(components);
  const totalComponents = components.reduce((count, comp) => {
    return count + 1 + (comp.children?.length || 0);
  }, 0);

  return (
    <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
          <Layers size={20} className="text-primary" />
          {templateName || 'Training Workout'}
        </h3>
        <div className="text-sm text-muted-foreground">
          {totalComponents} {t('intervalBuilder.components')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">{t('intervalBuilder.duration')}</div>
            <div className="font-semibold text-foreground">{formatTime(totalDuration)}</div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Target size={16} className="text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">{t('intervalBuilder.intervals')}</div>
            <div className="font-semibold text-foreground">
              {components.filter(c => c.type === 'repeat' || c.type === 'interval').length}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Move3D size={16} className="text-primary" />
          <div>
            <div className="text-sm text-muted-foreground">{t('intervalBuilder.structure')}</div>
            <div className="font-semibold text-foreground">{t('intervalBuilder.nested')}</div>
          </div>
        </div>
      </div>
    </div>
  );
});

export const EnhancedIntervalBuilder = memo(function EnhancedIntervalBuilder({
  isTrainingBlocksExpanded,
  onToggleTrainingBlocks,
  selectedTrainingSport,
  onTrainingSportChange,
  isTemplatesExpanded,
  onToggleTemplates,
  showIntervalBuilder,
  onCloseIntervalBuilder,
  newTemplateName,
  onTemplateNameChange,
  onSaveTemplate,
  onLoadTemplate,
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
}: EnhancedIntervalBuilderProps) {
  const { t } = useTranslation('calendar');
  const translateSportName = useCallback(
    (sport: string) => t(`common:sports.${sport}`, {
      defaultValue: sport.charAt(0).toUpperCase() + sport.slice(1)
    }),
    [t]
  );

  // Stacked modal hook
  const enhancedModal = useStackedModal('enhanced-training-builder-modal', {
    level: 2,
    onClose: onCloseIntervalBuilder,
  });

  // Enhanced component types for nested intervals
  const componentTypes = [
    { type: 'warmup' as const, label: 'Warm-up', icon: Play, description: 'Preparation phase' },
    { type: 'repeat' as const, label: 'Repeat Block', icon: Repeat, description: 'Nested interval sets' },
    { type: 'run' as const, label: 'Run', icon: Zap, description: 'High intensity effort' },
    { type: 'recover' as const, label: 'Recover', icon: Heart, description: 'Active recovery' },
    { type: 'interval' as const, label: 'Interval', icon: Target, description: 'Standard interval' },
    { type: 'rest' as const, label: 'Rest', icon: Square, description: 'Complete rest' },
    { type: 'cooldown' as const, label: 'Cool-down', icon: RotateCcw, description: 'Recovery phase' },
  ];

  const mockTemplates = [
    {
      id: '1',
      sport: 'running',
      name: '2×10×30/30',
      description: 'Classic VO2max intervals',
      components: [],
    },
    {
      id: '2',
      sport: 'running',
      name: '4×1km @ 5K pace',
      description: 'Threshold training',
      components: [],
    }
  ];

  const handleAddNestedComponent = useCallback((type: IntervalComponent['type'], parentId: string) => {
    onAddComponent(type, parentId);
  }, [onAddComponent]);

  return (
    <StackedModal
      id="enhanced-training-builder-modal"
      isOpen={showIntervalBuilder}
      onClose={onCloseIntervalBuilder}
      size="xl"
      level={2}
      closeOnBackdropClick={true}
      closeOnEscape={true}
      showCloseButton={false}
      widthVariant="calendar-card"
    >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Layers size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-foreground">
                Enhanced Training Builder
              </h2>
              <p className="text-sm text-muted-foreground">
                Create complex nested interval workouts
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div 
          className="flex-1 overflow-auto p-4 sm:p-6"
          style={{ 
            maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 180px)'
          }}
        >
          {/* Training Summary */}
          <TrainingSummaryCard 
            components={intervalComponents} 
            templateName={newTemplateName} 
          />

          {/* Sport Selection */}
          <div className="mb-6">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Target size={16} />
              Sport Selection
            </h3>
            <div className="flex gap-2 p-1 bg-muted/50 rounded-lg">
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
          </div>

          {/* Add Components */}
          <div className="mb-6">
            <h3 className="font-medium text-foreground mb-3 flex items-center gap-2">
              <Plus size={16} />
              Add Training Components
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {componentTypes.map((componentType) => {
                const Icon = componentType.icon;
                const colors = getComponentColor(componentType.type);
                return (
                  <button
                    key={componentType.type}
                    type="button"
                    onClick={() => onAddComponent(componentType.type)}
                    className={`flex items-center gap-3 p-3 rounded-lg border border-border/20 hover:bg-muted/50 transition-all duration-200 hover:scale-105 text-left ${colors.bg}`}
                  >
                    <Icon size={18} className={colors.icon} />
                    <div>
                      <div className={`font-medium text-sm ${colors.text}`}>
                        {componentType.label}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {componentType.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Training Components */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Layers size={16} />
                Training Structure
              </h3>
              <div className="text-sm text-muted-foreground">
                {intervalComponents.length} components
              </div>
            </div>
            
            {intervalComponents.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Layers size={32} className="mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium mb-1">{t('intervalBuilder.noComponentsYet')}</p>
                <p className="text-sm">{t('intervalBuilder.addComponentsMessage')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {intervalComponents.map((component) => (
                  <IntervalComponentRenderer
                    key={component.id}
                    component={component}
                    level={0}
                    onEdit={onEditComponent}
                    onRemove={onRemoveComponent}
                    onDuplicate={onDuplicateComponent}
                    onAddChild={handleAddNestedComponent}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-t border-border/20 bg-muted/30">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('intervalBuilder.trainingNamePlaceholder')}
              value={newTemplateName}
              onChange={(e) => onTemplateNameChange(e.target.value)}
              className="px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCloseIntervalBuilder}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('intervalBuilder.cancel')}
            </button>
            <button
              onClick={onSaveTemplate}
              disabled={!newTemplateName || intervalComponents.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save size={16} />
              {t('intervalBuilder.saveTraining')}
            </button>
          </div>
        </div>
      </div>
    </StackedModal>
  );
});
