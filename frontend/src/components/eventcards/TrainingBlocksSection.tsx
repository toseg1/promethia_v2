import React from 'react';
import { useTranslation } from 'react-i18next';
import { Heart, Play, Zap, Timer, Target } from 'lucide-react';
import type { TrainingBlock } from './types';

type BlockStyle = {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const blockTypeStyles: Record<TrainingBlock['type'] | 'default', BlockStyle> = {
  warmup: { color: 'text-red-600', bgColor: 'bg-red-500/10', borderColor: 'border-l-red-500', icon: Heart },
  run: { color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-l-blue-500', icon: Play },
  interval: { color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-l-blue-500', icon: Zap },
  recovery: { color: 'text-gray-600', bgColor: 'bg-gray-500/10', borderColor: 'border-l-gray-500', icon: Timer },
  rest: { color: 'text-gray-600', bgColor: 'bg-gray-500/10', borderColor: 'border-l-gray-500', icon: Timer },
  cooldown: { color: 'text-green-600', bgColor: 'bg-green-500/10', borderColor: 'border-l-green-500', icon: Timer },
  custom: { color: 'text-purple-600', bgColor: 'bg-purple-500/10', borderColor: 'border-l-purple-500', icon: Target },
  default: { color: 'text-slate-600', bgColor: 'bg-slate-500/10', borderColor: 'border-l-slate-500', icon: Target }
};

function getBlockStyles(type: TrainingBlock['type']): BlockStyle {
  return blockTypeStyles[type] ?? blockTypeStyles.default;
}

function formatZoneLabel(unit?: string): string | undefined {
  if (!unit) return undefined;

  switch (unit.toLowerCase()) {
    case 'heart_rate':
    case 'hr':
      return 'Heart Rate';
    case 'mas':
      return 'MAS';
    case 'fpp':
      return 'FPP';
    case 'css':
      return 'CSS';
    default:
      return unit;
  }
}

function formatDuration(duration?: string, unit?: string, fallback?: string): string | undefined {
  if (!duration) {
    return fallback;
  }

  return unit ? `${duration} ${unit}` : duration;
}

function formatDistance(distance?: string, unit?: string): string | undefined {
  if (!distance) {
    return undefined;
  }

  return unit ? `${distance} ${unit}` : distance;
}

function formatIntensity(intensity?: number, unit?: string): string | undefined {
  if (intensity === undefined || intensity === null) {
    return undefined;
  }

  const zoneLabel = formatZoneLabel(unit);
  return `${intensity}%${zoneLabel ? ` ${zoneLabel}` : ''}`;
}

function renderInfoItems(items: string[], textClass: string): React.ReactNode {
  return items.map((item, index) => (
    <React.Fragment key={`${item}-${index}`}>
      {index > 0 && <span className={textClass}>•</span>}
      <span className={textClass}>{item}</span>
    </React.Fragment>
  ));
}

function buildInfoItems(
  block: TrainingBlock,
  labels: {
    time: string;
    distance: string;
    intensity: string;
    repetitions: string;
    notes:string
  },
  includeRepetitions: boolean
): string[] {
  const items: string[] = [];

  if (includeRepetitions && block.repetitions && block.repetitions > 1) {
    items.push(`${labels.repetitions}: ${block.repetitions}x`);
  }

  const durationFallback = (block as any).distance_time as string | undefined;
  const durationValue = formatDuration(block.duration, block.durationUnit, durationFallback);
  if (durationValue) {
    items.push(`${labels.time}: ${durationValue}`);
  }

  const distanceValue = formatDistance(block.distance, block.distanceUnit);
  if (distanceValue) {
    items.push(`${labels.distance}: ${distanceValue}`);
  }

  const intensityValue = formatIntensity(block.intensity, block.intensityUnit);
  if (intensityValue) {
    items.push(`${labels.intensity}: ${intensityValue}`);
  }

  return items;
}

interface TrainingBlocksSectionProps {
  blocks?: TrainingBlock[];
  heading?: string;
  className?: string;
}

export function TrainingBlocksSection({ blocks, heading, className }: TrainingBlocksSectionProps) {
  const { t } = useTranslation('calendar');

  if (!blocks || blocks.length === 0) {
    return null;
  }

  const resolvedHeading = heading ?? t('eventCards.trainingBlocks');
  const detailLabels = {
    time: t('eventCards.detailLabels.time'),
    distance: t('eventCards.detailLabels.distance'),
    intensity: t('eventCards.detailLabels.intensity'),
    repetitions: t('eventCards.detailLabels.repetitions'),
    notes:t('eventCards.detailLabels.notes')
  };

  return (
    <section className={className ?? 'mb-6'}>
      {resolvedHeading && (
        <h3 className="text-lg font-semibold text-foreground mb-3">{resolvedHeading}</h3>
      )}
      <div className="space-y-3">
        {blocks.map((block, index) => {
          const styles = getBlockStyles(block.type);
          const IconComponent = styles.icon;
          const infoItems = buildInfoItems(block, detailLabels, true);
          const hasInfoItems = infoItems.length > 0;

          return (
            <div key={block.id}>
              <div className={`p-4 ${styles.bgColor} rounded-lg border-l-4 ${styles.borderColor} border border-border/20`}>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 bg-white/50 rounded-lg">
                    <IconComponent size={16} className={styles.color} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-foreground">
                        {block.name || t(`eventCards.blockTypes.${block.type}`, { defaultValue: block.type })}
                      </h4>
                      <div className="flex items-center gap-2">
                        {block.repetitions && block.repetitions > 1 && (
                          <span className="px-2 py-1 bg-muted rounded-full text-xs font-medium">
                            {block.repetitions}x
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">#{index + 1}</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {infoItems.length > 0 && renderInfoItems(infoItems, 'text-muted-foreground')}
                      {block.children && block.children.length > 0 && (
                        <span className="text-blue-600 font-medium"></span>
                      )}
                    </div>
                    {block.notes && (
                      <div className="mt-2 text-xs text-muted-foreground italic">
                        {block.notes}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {block.children && block.children.length > 0 && (
                <div className="mt-3 ml-6 space-y-2 border-l-2 border-dashed border-gray-200 pl-3">
                  {block.children.map((child) => {
                    const childStyles = getBlockStyles(child.type);
                    const ChildIcon = childStyles.icon;
                    const childDetails = buildInfoItems(child, detailLabels, true);

                    return (
                      <div key={child.id} className={`p-2 rounded border-l-2 ${childStyles.borderColor} ${childStyles.bgColor}`}>
                        <div className="flex items-start gap-2">
                          <div className="p-1 bg-white/50 rounded">
                            <ChildIcon size={14} className={childStyles.color} />
                          </div>
                          <div className="flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-xs font-medium ${childStyles.color}`}>
                                {child.name || t(`eventCards.blockTypes.${child.type}`, { defaultValue: child.type })}
                              </span>
                              {childDetails.length > 0 && (
                                <span className="text-xs">
                                  {renderInfoItems(childDetails, 'text-xs text-muted-foreground')}
                                </span>
                              )}
                            </div>
                            {child.notes && (
                              <div className="mt-1 text-xs text-muted-foreground italic">
                                {child.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
