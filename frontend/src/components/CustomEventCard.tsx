import React, { useEffect } from 'react';
import {
  Star,
  Clock,
  MapPin,
  Calendar,
  Users,
  Tag,
  FileText,
  Link,
  Phone,
  Mail,
  Timer,
  X,
  Edit3,
  Trash2,
  Target
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDraggableModal } from '../hooks/useDraggableModal';
import { DeleteConfirmation } from './ui/DeleteConfirmation';
import { formatDate as formatLocaleDate, formatTime as formatLocaleTime, formatDateRange as formatLocaleDateRange } from '../utils/localeFormat';

interface CustomEvent {
  id: string;
  title: string;
  type: 'custom';
  date: Date;
  time?: string;
  startTime?: string;
  endTime?: string;
  dateStart?: string;
  dateEnd?: string;
  location?: string;
  description?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  attendees?: string[];
  organizer?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  reminders?: string[];
  tags?: string[];
  notes?: string;
  isAllDay?: boolean;
  duration?: string;
  athlete?: string;
  sport?: string;
  customEventColor?: string;
  color?: string;
}

interface CustomEventCardProps {
  event: CustomEvent;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => Promise<void> | void;
  showAthlete?: boolean;
}

export function CustomEventCard({ event, onClose, onEdit, onDelete, showAthlete = true }: CustomEventCardProps) {
  const { t } = useTranslation('calendar');

  // Draggable modal hook
  const { modalRef, resetPosition, getTransform, getDragHandleProps } = useDraggableModal();
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Reset position when modal opens
  useEffect(() => {
    resetPosition();
  }, [resetPosition]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/10 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-500/10 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-500/10 text-green-700 border-green-200';
      default: return 'bg-gray-500/10 text-gray-700 border-gray-200';
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'high':
        return t('eventCards.priority.high');
      case 'medium':
        return t('eventCards.priority.medium');
      case 'low':
      default:
        return t('eventCards.priority.low');
    }
  };

  const formatDateRangeLabel = () => {
    if (event.dateStart && event.dateEnd) {
      const start = new Date(event.dateStart);
      const end = new Date(event.dateEnd);
      return formatLocaleDateRange(start, end);
    }
    return null;
  };

  const formatTimeRange = () => {
    if (event.startTime && event.endTime) {
      return `${formatLocaleTime(event.startTime)} - ${formatLocaleTime(event.endTime)}`;
    } else if (event.startTime) {
      return formatLocaleTime(event.startTime);
    } else if (event.time) {
      return formatLocaleTime(event.time);
    }
    return null;
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
        <div
          className="relative bg-gradient-to-r from-purple-500/10 to-pink-500/10 px-6 py-4 border-b border-border/20"
          style={event.customEventColor || event.color ? {
            background: `linear-gradient(to right, ${event.customEventColor || event.color}15, ${event.customEventColor || event.color}10)`
          } : {}}
          {...getDragHandleProps()}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div
  className="p-1.5 bg-purple-500/20 rounded-lg"
>
  <Star
    size={16}
    className="text-purple-600"
  />
</div>
                <span
  className="text-sm font-medium text-purple-600 uppercase tracking-wide"
>
  {event.category || t('eventCards.customEvent')}
</span>
</div>
<h2 className="text-xl font-bold text-foreground mb-1">{event.title}</h2>
<p className="text-sm text-muted-foreground">{formatLocaleDate(event.date, 'full')}</p>
{event.priority && (
  <span className={`inline-block mt-2 px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(event.priority)}`}>
    {getPriorityText(event.priority)}
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
          title={t('eventCards.customDeleteTitle')}
          description={t('eventCards.customDeleteDescription')}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={confirmDelete}
          confirming={isDeleting}
          confirmLabel={isDeleting ? t('eventCards.customDeleteProgress') : t('eventCards.customDeleteConfirm')}
        />

        {/* Content */}
        <div 
          className="px-6 py-4 overflow-y-auto" 
          style={{ 
            maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 140px)' 
          }}
        >
          {/* Event Overview */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* All Day Event */}
            {event.isAllDay && (
              <div className="flex items-center gap-3 col-span-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Calendar size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.allDayEvent')}</p>
                  <p className="font-semibold text-foreground">{t('eventCards.fullDayDetail')}</p>
                </div>
              </div>
            )}

            {/* Time or Time Range */}
            {!event.isAllDay && formatTimeRange() && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t(event.startTime && event.endTime ? 'eventCards.fields.timeRange' : 'eventCards.fields.time')}</p>
                  <p className="font-semibold text-foreground">{formatTimeRange()}</p>
                </div>
              </div>
            )}

            {/* Duration */}
            {event.duration && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-1/10 rounded-lg">
                  <Timer size={18} className="text-chart-1" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.duration')}</p>
                  <p className="font-semibold text-foreground">{event.duration}</p>
                </div>
              </div>
            )}

            {/* Athlete */}
            {event.athlete && showAthlete && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-chart-4/10 rounded-lg">
                  <Users size={18} className="text-chart-4" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.athlete')}</p>
                  <p className="font-semibold text-foreground">{event.athlete}</p>
                </div>
              </div>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-center gap-3 col-span-2">
                <div className="p-2 bg-chart-3/10 rounded-lg">
                  <MapPin size={18} className="text-chart-3" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.fields.location')}</p>
                  <p className="font-semibold text-foreground">{event.location}</p>
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
                  <p className="text-sm text-muted-foreground">{t('eventCards.eventPeriod')}</p>
                  <p className="font-semibold text-foreground">{formatDateRangeLabel()}</p>
                </div>
              </div>
            </div>
          )}

          {/* Organizer Information */}
          {event.organizer && (
            <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border/20">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users size={18} className="text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('eventCards.organizedBy')}</p>
                  <p className="font-semibold text-foreground">{event.organizer}</p>
                </div>
              </div>

              {/* Contact Information */}
              {event.contactInfo && (
                <div className="space-y-2">
                  {event.contactInfo.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-muted-foreground" />
                      <a href={`tel:${event.contactInfo.phone}`} className="text-primary hover:underline">
                        {event.contactInfo.phone}
                      </a>
                    </div>
                  )}
                  {event.contactInfo.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail size={14} className="text-muted-foreground" />
                      <a href={`mailto:${event.contactInfo.email}`} className="text-primary hover:underline">
                        {event.contactInfo.email}
                      </a>
                    </div>
                  )}
                  {event.contactInfo.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Link size={14} className="text-muted-foreground" />
                      <a href={event.contactInfo.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {t('eventCards.website')}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">{t('eventCards.attendeesHeading', { count: event.attendees.length })}</h3>
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/50">
                <div className="flex flex-wrap gap-2">
                  {event.attendees.map((attendee, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white/80 rounded-full text-sm font-medium text-foreground border border-border/20"
                    >
                      {attendee}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Tags */}
          {event.tags && event.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">{t('eventCards.tags')}</h3>
              <div className="flex flex-wrap gap-2">
                {event.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
                  >
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {event.description && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('eventCards.fields.description')}</h3>
              <div className="p-4 bg-muted/30 rounded-xl border border-border/20">
                <p className="text-muted-foreground leading-relaxed">{event.description}</p>
              </div>
            </div>
          )}

          {/* Reminders */}
          {event.reminders && event.reminders.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">{t('eventCards.reminders')}</h3>
              <div className="space-y-2">
                {event.reminders.map((reminder, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-yellow-50/50 rounded-lg border border-yellow-200/50">
                    <div className="p-1.5 bg-yellow-500/20 rounded-lg">
                      <Clock size={14} className="text-yellow-600" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{reminder}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {event.notes && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-foreground mb-2">{t('eventCards.fields.notes')}</h3>
              <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-200/50">
                <div className="flex gap-3">
                  <div className="p-2 bg-gray-500/10 rounded-lg">
                    <FileText size={18} className="text-gray-600" />
                  </div>
                  <p className="text-muted-foreground leading-relaxed flex-1">{event.notes}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        
      </div>
    </div>
  );
}
