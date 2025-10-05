import React, { useEffect } from 'react';
import {
  Trophy,
  Clock,
  MapPin,
  Calendar,
  Users,
  Target,
  Flag,
  Medal,
  Timer,
  Route,
  X,
  Edit3,
  Trash2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDraggableModal } from '../hooks/useDraggableModal';
import { DeleteConfirmation } from './ui/DeleteConfirmation';
import { formatDate, formatDateRange, formatTime } from '../utils/localeFormat';
import type { TrainingBlock } from './eventcards/types';
import { TrainingBlocksSection } from './eventcards/TrainingBlocksSection';

interface RaceEvent {
  id: string;
  title: string;
  type: 'race';
  date: Date;
  time?: string;
  startTime?: string;
  endTime?: string;
  dateStart?: string;
  dateEnd?: string;
  location?: string;
  description?: string;
  raceDistance?: string;
  distance?: string;
  raceCategory?: string;
  startWave?: string;
  bibNumber?: string;
  goalTime?: string;
  timeObjective?: string;
  pacePlan?: string;
  estimatedFinish?: string;
  coach?: string;
  notes?: string;
  registrationStatus?: 'registered' | 'pending' | 'waitlist';
  sport?: string;
  athlete?: string;
  duration?: string;
  trainingBlocks?: TrainingBlock[];
}

interface RaceEventCardProps {
  event: RaceEvent;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void> | void;
  showAthlete?: boolean;
}

export function RaceEventCard({ event, onClose, onEdit, onDelete, showAthlete = true }: RaceEventCardProps) {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registered': return 'bg-green-500/10 text-green-700 border-green-200';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'waitlist': return 'bg-orange-500/10 text-orange-700 border-orange-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'registered':
        return t('eventCards.registrationStatus.registered');
      case 'pending':
        return t('eventCards.registrationStatus.pending');
      case 'waitlist':
        return t('eventCards.registrationStatus.waitlist');
      default:
        return t('eventCards.registrationStatus.unknown');
    }
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
        <div className="relative bg-gradient-to-r from-yellow-500/10 to-orange-500/10 px-6 py-4 border-b border-border/20" {...getDragHandleProps()}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 bg-yellow-500/20 rounded-lg">
                  <Trophy size={16} className="text-yellow-600" />
                </div>
                <span className="text-sm font-medium text-yellow-600 uppercase tracking-wide">{t('eventCards.raceEvent')}</span>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-1">{event.title}</h2>
              <p className="text-sm text-muted-foreground">{formatDate(event.date, 'full')}</p>
              {event.registrationStatus && (
                <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(event.registrationStatus)}`}>
                  {getStatusText(event.registrationStatus)}
                </span>
              )}
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

        <DeleteConfirmation
          open={showDeleteConfirm}
          title={t('eventCards.deleteRaceTitle')}
          description={t('eventCards.deleteRaceDescription')}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          confirming={isDeleting}
          confirmLabel={isDeleting ? t('eventCards.deleteRaceProgress') : t('eventCards.deleteRaceConfirm')}
        />

        {/* Content */}
        <div 
          className="px-6 py-4 overflow-y-auto" 
          style={{ 
            maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 140px)' 
          }}
        >
          {/* Key Race Information */}
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

            {/* Time or Time Range */}
            {formatTimeRange() && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{event.startTime && event.endTime ? t('eventCards.fields.timeRange') : t('eventCards.fields.startTime')}</p>
                  <p className="font-semibold text-foreground">{formatTimeRange()}</p>
                </div>
              </div>
            )}

            {/* Distance */}
            {(event.raceDistance || event.distance) && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-1/10 rounded-lg">
                  <Route size={18} className="text-chart-1" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.distance')}</p>
                  <p className="font-semibold text-foreground">{event.raceDistance || event.distance}</p>
                </div>
              </div>
            )}

            {/* Duration */}
            {event.duration && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-4/10 rounded-lg">
                  <Timer size={18} className="text-chart-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.duration')}</p>
                  <p className="font-semibold text-foreground">{event.duration}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-3 col-span-2">
                <div className="p-2 bg-chart-2/10 rounded-lg">
                  <MapPin size={18} className="text-chart-2" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.location')}</p>
                  <p className="font-semibold text-foreground">{event.location}</p>
                </div>
              </div>
            )}

            {/* Athlete */}
            {event.athlete && showAthlete && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <Users size={18} className="text-chart-3" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.athlete')}</p>
                  <p className="font-semibold text-foreground">{event.athlete}</p>
                </div>
              </div>
            )}
          </div>

          {/* Date Range (for multi-day races) */}
          {formatDateRangeLabel() && (
            <div className="mb-6 p-4 bg-blue-50/50 rounded-xl border border-blue-200/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Calendar size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.racePeriod')}</p>
                  <p className="font-semibold text-foreground">{formatDateRangeLabel()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Race Details */}
          <div className="grid grid-cols-1 gap-4 mb-6">
            {event.raceCategory && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Medal size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.raceCategory')}</p>
                  <p className="font-semibold text-foreground">{event.raceCategory}</p>
                </div>
              </div>
            )}

            {event.startWave && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Flag size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.startWave')}</p>
                  <p className="font-semibold text-foreground">{event.startWave}</p>
                </div>
              </div>
            )}

            {event.bibNumber && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Users size={18} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.bibNumber')}</p>
                  <p className="font-semibold text-foreground">#{event.bibNumber}</p>
                </div>
              </div>
            )}
          </div>

          {/* Performance Goals */}
          {(event.goalTime || event.timeObjective || event.pacePlan || event.estimatedFinish) && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">{t('eventCards.performanceGoals')}</h3>
              <div className="space-y-3">
                {event.goalTime && (
                  <div className="p-4 bg-green-50/50 rounded-lg border border-green-200/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <Target size={18} className="text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('eventCards.goalTime')}</p>
                        <p className="font-semibold text-foreground">{event.goalTime}</p>
                      </div>
                    </div>
                  </div>
                )}

                {event.timeObjective && (
                  <div className="p-4 bg-emerald-50/50 rounded-lg border border-emerald-200/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Clock size={18} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('eventCards.timeObjective')}</p>
                        <p className="font-semibold text-foreground">{event.timeObjective}</p>
                      </div>
                    </div>
                  </div>
                )}

                {event.pacePlan && (
                  <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-200/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Timer size={18} className="text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('eventCards.pacePlan')}</p>
                        <p className="font-semibold text-foreground">{event.pacePlan}</p>
                      </div>
                    </div>
                  </div>
                )}

                {event.estimatedFinish && (
                  <div className="p-4 bg-purple-50/50 rounded-lg border border-purple-200/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Flag size={18} className="text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{t('eventCards.estimatedFinish')}</p>
                        <p className="font-semibold text-foreground">{event.estimatedFinish}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <TrainingBlocksSection blocks={event.trainingBlocks} />

          {/* Coach Information */}
          {event.coach && (
            <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border/20">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.raceCoach')}</p>
                  <p className="font-semibold text-foreground">{event.coach}</p>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('eventCards.raceDescription')}</h3>
              <div className="p-4 bg-muted/30 rounded-xl border border-border/20">
                <p className="text-muted-foreground leading-relaxed">{event.description}</p>
              </div>
            </div>
          )}

          {/* Race Strategy Notes */}
          {event.notes && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('eventCards.raceStrategy')}</h3>
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
