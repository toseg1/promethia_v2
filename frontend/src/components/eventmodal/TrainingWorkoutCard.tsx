import React, { memo } from 'react';
import { 
  Play, 
  Repeat, 
  Zap, 
  Heart, 
  Target, 
  Square, 
  RotateCcw, 
  Clock, 
  Timer, 
  TrendingUp,
  Activity,
  ChevronRight
} from 'lucide-react';
import { IntervalComponent } from './types';

interface TrainingWorkoutCardProps {
  title: string;
  stages: IntervalComponent[];
  sport: string;
  className?: string;
}

// Color system for workout display
const getStageColor = (type: IntervalComponent['type']) => {
  switch (type) {
    case 'warmup': return { 
      bg: 'bg-gradient-to-r from-orange-50 to-orange-100', 
      border: 'border-orange-200', 
      text: 'text-orange-700',
      icon: 'text-orange-600',
      accent: 'bg-orange-500'
    };
    case 'repeat': return { 
      bg: 'bg-gradient-to-r from-purple-50 to-purple-100', 
      border: 'border-purple-200', 
      text: 'text-purple-700',
      icon: 'text-purple-600',
      accent: 'bg-purple-500'
    };
    case 'run': return { 
      bg: 'bg-gradient-to-r from-red-50 to-red-100', 
      border: 'border-red-200', 
      text: 'text-red-700',
      icon: 'text-red-600',
      accent: 'bg-red-500'
    };
    case 'recover': return { 
      bg: 'bg-gradient-to-r from-emerald-50 to-emerald-100', 
      border: 'border-emerald-200', 
      text: 'text-emerald-700',
      icon: 'text-emerald-600',
      accent: 'bg-emerald-500'
    };
    case 'interval': return { 
      bg: 'bg-gradient-to-r from-blue-50 to-blue-100', 
      border: 'border-blue-200', 
      text: 'text-blue-700',
      icon: 'text-blue-600',
      accent: 'bg-blue-500'
    };
    case 'rest': return { 
      bg: 'bg-gradient-to-r from-gray-50 to-gray-100', 
      border: 'border-gray-200', 
      text: 'text-gray-700',
      icon: 'text-gray-600',
      accent: 'bg-gray-500'
    };
    case 'cooldown': return { 
      bg: 'bg-gradient-to-r from-green-50 to-green-100', 
      border: 'border-green-200', 
      text: 'text-green-700',
      icon: 'text-green-600',
      accent: 'bg-green-500'
    };
    default: return { 
      bg: 'bg-gradient-to-r from-gray-50 to-gray-100', 
      border: 'border-gray-200', 
      text: 'text-gray-700',
      icon: 'text-gray-600',
      accent: 'bg-gray-500'
    };
  }
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

const getStageIcon = (type: IntervalComponent['type']) => {
  const colors = getStageColor(type);
  switch (type) {
    case 'warmup': return <Play size={18} className={colors.icon} />;
    case 'repeat': return <Repeat size={18} className={colors.icon} />;
    case 'run': return <Zap size={18} className={colors.icon} />;
    case 'recover': return <Heart size={18} className={colors.icon} />;
    case 'interval': return <Target size={18} className={colors.icon} />;
    case 'rest': return <Square size={18} className={colors.icon} />;
    case 'cooldown': return <RotateCcw size={18} className={colors.icon} />;
    default: return <Target size={18} className={colors.icon} />;
  }
};

// Format duration display
const formatDuration = (duration?: string) => {
  if (!duration) return '';
  if (duration.includes(':')) {
    return duration;
  }
  const num = parseInt(duration);
  if (num >= 60) {
    const minutes = Math.floor(num / 60);
    const seconds = num % 60;
    return seconds > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${minutes}:00`;
  }
  return `0:${num.toString().padStart(2, '0')}`;
};

// Recursive component to render nested intervals
const NestedStageRenderer: React.FC<{
  stage: IntervalComponent;
  level: number;
  isLast?: boolean;
}> = memo(({ stage, level, isLast = false }) => {
  const colors = getStageColor(stage.type);
  const hasChildren = stage.children && stage.children.length > 0;
  const indentLevel = level * 20;

  return (
    <div className="relative" style={{ marginLeft: `${indentLevel}px` }}>
      {/* Connection lines for nested structure */}
      {level > 0 && (
        <>
          <div 
            className="absolute -left-3 top-0 bottom-0 w-px bg-gray-300" 
            style={{ left: `${-indentLevel/2}px` }}
          />
          <div 
            className="absolute top-6 w-3 h-px bg-gray-300" 
            style={{ left: `${-indentLevel/2}px` }}
          />
        </>
      )}

      <div className={`${colors.bg} ${colors.border} border rounded-xl p-4 mb-3 relative overflow-hidden`}>
        {/* Accent bar */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.accent}`} />
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStageIcon(stage.type)}
            <div>
              <div className={`font-semibold text-base ${colors.text} flex items-center gap-2`}>
                {stage.name}
                {stage.count && (
                  <span className={`px-2 py-1 ${colors.accent} text-white rounded-full text-xs font-bold`}>
                    {stage.count}×
                  </span>
                )}
              </div>
              
              {/* Stage details */}
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                {stage.duration && (
                  <div className="flex items-center gap-1">
                    <Clock size={14} />
                    <span>{formatDuration(stage.duration)}</span>
                  </div>
                )}
                {stage.intensity !== undefined && stage.intensity !== null && (
                  <div className="flex items-center gap-1">
                    <TrendingUp size={14} />
                    <span>
                      {stage.intensity}%
                      {formatZoneLabel(stage.intensityUnit) ? ` ${formatZoneLabel(stage.intensityUnit)}` : ''}
                    </span>
                  </div>
                )}
                {stage.trigger && (
                  <div className="flex items-center gap-1">
                    <Timer size={14} />
                    <span className="capitalize">{stage.trigger.replace('_', ' ')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Nested indicator */}
          {hasChildren && (
            <div className={`flex items-center gap-1 px-2 py-1 ${colors.bg} border ${colors.border} rounded-lg`}>
              <Activity size={14} className={colors.icon} />
              <span className={`text-xs font-medium ${colors.text}`}>
                {stage.children!.length} steps
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {stage.notes && (
          <div className="mt-3 p-2 bg-white/50 rounded-lg">
            <p className="text-sm text-muted-foreground">{stage.notes}</p>
          </div>
        )}
      </div>

      {/* Render nested children */}
      {hasChildren && (
        <div className="ml-4 relative">
          {stage.children!.map((child, index) => (
            <NestedStageRenderer
              key={child.id || index}
              stage={child}
              level={level + 1}
              isLast={index === stage.children!.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
});

// Calculate total workout metrics
const calculateWorkoutMetrics = (stages: IntervalComponent[]) => {
  let totalDuration = 0;
  let totalIntervals = 0;
  let maxIntensity = 0;

  const processStage = (stage: IntervalComponent, multiplier = 1) => {
    const currentMultiplier = multiplier * (stage.count || 1);
    
    if (stage.duration) {
      const duration = parseFloat(stage.duration.replace(':', '.')) || 0;
      totalDuration += duration * currentMultiplier;
    }

    if (stage.type === 'run' || stage.type === 'interval') {
      totalIntervals += currentMultiplier;
    }

    if (stage.intensity && stage.intensity > maxIntensity) {
      maxIntensity = stage.intensity;
    }

    if (stage.children) {
      stage.children.forEach(child => processStage(child, currentMultiplier));
    }
  };

  stages.forEach(stage => processStage(stage));

  return {
    duration: totalDuration,
    intervals: totalIntervals,
    maxIntensity
  };
};

const formatTotalTime = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins}min`;
};

export const TrainingWorkoutCard = memo(function TrainingWorkoutCard({
  title,
  stages,
  sport,
  className = ''
}: TrainingWorkoutCardProps) {
  const metrics = calculateWorkoutMetrics(stages);

  return (
    <div className={`bg-white rounded-xl border border-border/20 shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold mb-2">{title}</h2>
            <div className="flex items-center gap-4 text-primary-foreground/80">
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span className="font-medium">{formatTotalTime(metrics.duration)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Target size={16} />
                <span className="font-medium">{metrics.intervals} intervals</span>
              </div>
              {metrics.maxIntensity > 0 && (
                <div className="flex items-center gap-1">
                  <TrendingUp size={16} />
                  <span className="font-medium">{metrics.maxIntensity}% max</span>
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-primary-foreground/80 text-sm uppercase tracking-wider font-medium">
              {sport}
            </div>
            <div className="text-2xl font-bold">{stages.length}</div>
            <div className="text-primary-foreground/80 text-sm">stages</div>
          </div>
        </div>
      </div>

      {/* Workout Stages */}
      <div className="p-6">
        <div className="space-y-4">
          {stages.map((stage, index) => (
            <div key={stage.id || index} className="relative">
              <NestedStageRenderer 
                stage={stage} 
                level={0}
                isLast={index === stages.length - 1}
              />
              {/* Stage separator */}
              {index < stages.length - 1 && (
                <div className="flex items-center justify-center py-2">
                  <ChevronRight size={20} className="text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer Summary */}
      <div className="bg-muted/30 px-6 py-4 border-t border-border/20">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Complete this training to improve your {sport.toLowerCase()} performance
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Activity size={16} className="text-primary" />
            Ready to start
          </div>
        </div>
      </div>
    </div>
  );
});
