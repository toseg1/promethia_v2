import React, { useEffect } from 'react';
import {
  Clock,
  Target,
  MapPin,
  Calendar,
  Users,
  Play,
  X,
  Edit3,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatDate, formatDateRange, formatDuration, formatTime } from '../utils/localeFormat';
import { useDraggableModal } from '../hooks/useDraggableModal';
import { DeleteConfirmation } from './ui/DeleteConfirmation';
import type { TrainingBlock } from './eventcards/types';
import { TrainingBlocksSection } from './eventcards/TrainingBlocksSection';

interface TrainingEvent {
  id: string;
  title: string;
  type: 'training';
  date: Date;
  time?: string;
  startTime?: string;
  endTime?: string;
  dateStart?: string;
  dateEnd?: string;
  duration?: number;
  location?: string;
  description?: string;
  trainingBlocks?: TrainingBlock[];
  coach?: string;
  notes?: string;
  sport?: string;
  athlete?: string;
  trainingName?: string;
}

interface TrainingEventCardProps {
  event: TrainingEvent;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void> | void;
  showAthlete?: boolean;
}


export function TrainingEventCard({ event, onClose, onEdit, onDelete, showAthlete = true }: TrainingEventCardProps) {
  const { t } = useTranslation('calendar');

  // Draggable modal hook
  const { modalRef, resetPosition, getTransform, getDragHandleProps } = useDraggableModal();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Reset position when modal opens
  useEffect(() => {
    resetPosition();
  }, [resetPosition]);

  const formatDateRangeLabel = () => {
    if (event.dateStart && event.dateEnd) {
      const start = new Date(event.dateStart);
      const end = new Date(event.dateEnd);
      return formatDateRange(start, end);
    }
    return null;
  };

  const formatTimeRange = () => {
    if (event.startTime && event.endTime) {
      return `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
    } else if (event.startTime) {
      return formatTime(event.startTime);
    } else if (event.time) {
      return formatTime(event.time);
    }
    return null;
  };

  const getTotalDuration = () => {
    if (event.duration) return formatDuration(event.duration);
    
    // Calculate from blocks if available
    const totalMinutes = event.trainingBlocks?.reduce((total, block) => {
      const duration = block.duration;
      if (duration && duration.includes('min')) {
        return total + parseInt(duration);
      }
      return total;
    }, 0) || 0;
    
    return totalMinutes > 0 ? formatDuration(totalMinutes) : t('common:notSet');
  };

  const getAverageIntensity = () => {
    if (!event.trainingBlocks?.length) return null;
    
    const blocksWithIntensity = event.trainingBlocks.filter(block => block.intensity);
    if (blocksWithIntensity.length === 0) return null;
    
    const avgIntensity = blocksWithIntensity.reduce((sum, block) => sum + (block.intensity || 0), 0) / blocksWithIntensity.length;
    return Math.round(avgIntensity);
  };

  const handleDelete = async () => {
    if (!onDelete) {
      return;
    }

    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!onDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      await onDelete();
      setShowDeleteConfirm(false);
      setIsDeleting(false);
    } catch (error) {
      setIsDeleting(false);
      throw error;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      style={{
        paddingTop: 'var(--header-height, 64px)',
        paddingBottom: 'var(--footer-height, 84px)',
        paddingLeft: '16px',
        paddingRight: '16px'
      }}
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="relative bg-white/95 backdrop-blur-sm rounded-lg sm:rounded-2xl shadow-2xl border border-border/20 overflow-hidden"
        style={{
          width: '90%',
          maxWidth: '512px',
          maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 32px)',
          ...getTransform()
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-blue-500/10 to-blue-600/10 px-6 py-4 border-b border-border/20" {...getDragHandleProps()}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                  <Play size={16} className="text-blue-600" />
                </div>
                <span className="text-sm font-medium text-blue-600 uppercase tracking-wide">{t('eventCards.trainingSession')}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">{event.title}</h2>
              <p className="text-sm text-muted-foreground">{formatDate(event.date, 'full')}</p>
            </div>
            <div className="flex gap-1">
              {onEdit && (
                <button
                  onClick={onEdit}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                  title={t('eventCards.actions.edit')}
                >
                  <Edit3 size={18} className="text-muted-foreground" />
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                  title={t('eventCards.actions.delete')}
                >
                  <Trash2 size={18} className="text-muted-foreground" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                title={t('eventCards.actions.close')}
              >
                <X size={18} className="text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Delete confirmation */}
        <DeleteConfirmation
          open={showDeleteConfirm}
          title={t('eventCards.deleteTrainingTitle')}
          description={t('eventCards.deleteTrainingDescription')}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          confirming={isDeleting}
          confirmLabel={isDeleting ? t('eventCards.deleteTrainingProgress') : t('eventCards.deleteTrainingConfirm')}
        />

        {/* Content */}
        <div 
          className="px-6 py-4 overflow-y-auto" 
          style={{ 
            maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 140px)' 
          }}
        >
          {/* Key Information */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Sport */}
            {event.sport && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.sport')}</p>
                  <p className="font-semibold text-foreground capitalize">{event.sport}</p>
                </div>
              </div>
            )}

            {/* Duration */}
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('eventCards.fields.duration')}</p>
                <p className="font-semibold text-foreground">{getTotalDuration()}</p>
              </div>
            </div>

            {/* Time or Time Range */}
            {formatTimeRange() && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <Calendar size={18} className="text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.time')}</p>
                  <p className="font-semibold text-foreground">{formatTimeRange()}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <MapPin size={18} className="text-chart-3" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.location')}</p>
                  <p className="font-semibold text-foreground">{event.location}</p>
                </div>
              </div>
            )}

            {/* Athlete */}
            {showAthlete && showAthlete && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-1/10 rounded-lg">
                  <Users size={18} className="text-chart-1" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.athlete')}</p>
                  <p className="font-semibold text-foreground">{event.athlete}</p>
                </div>
              </div>
            )}
          </div>

          {/* Date Range (for multi-day events) */}
          {formatDateRangeLabel() && (
            <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-200/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.trainingPeriod')}</p>
                  <p className="font-semibold text-foreground">{formatDateRangeLabel()}</p>
                </div>
              </div>
            </div>
          )}

        
          {/* Coach Information */}
          {event.coach && (
            <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.assignedCoach')}</p>
                  <p className="font-semibold text-foreground">{event.coach}</p>
                </div>
              </div>
            </div>
          )}

          <TrainingBlocksSection blocks={event.trainingBlocks} />

          {/* Description */}
          {event.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('eventCards.fields.description')}</h3>
              <div className="p-4 bg-muted/30 rounded-xl border border-border/20">
                <p className="text-muted-foreground leading-relaxed">{event.description}</p>
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('eventCards.fields.notes')}</h3>
              <div className="p-4 bg-yellow-50/50 rounded-xl border border-yellow-200/50">
                <p className="text-muted-foreground leading-relaxed">{event.notes}</p>
              </div>
            </div>
          )}
        </div>

       
      </div>
    </div>
  );
}
