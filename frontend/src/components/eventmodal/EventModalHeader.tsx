import React from 'react';
import { X } from 'lucide-react';
import { TrainingEvent } from './types';
import { useTranslation } from 'react-i18next';

interface EventModalHeaderProps {
  event?: TrainingEvent;
  onClose: () => void;
}

export function EventModalHeader({ event, onClose }: EventModalHeaderProps) {
  const { t } = useTranslation('calendar');
  // More explicit check for event existence
  const isEditing = event && event.id;
  
  return (
    <div className="flex items-center justify-between p-4 md:p-6 border-b border-border/20">
      <h2 className="text-xl md:text-2xl font-bold text-foreground">
        {isEditing ? 'Edit Event' : 'Create Event'}
      </h2>
      <button
        onClick={onClose}
        className="p-2 hover:bg-muted rounded-lg transition-colors"
        type="button"
      >
        <X size={20} />
      </button>
    </div>
  );
}