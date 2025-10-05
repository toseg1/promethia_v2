import React, { memo } from 'react';
import { Activity } from './types';

interface ActivityItemProps {
  activity: Activity;
  showAthlete?: boolean;
}

export const ActivityItem = memo(function ActivityItem({ activity, showAthlete = false }: ActivityItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
        <activity.icon size={16} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{activity.title}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {showAthlete && activity.athlete && `${activity.athlete} • `}{activity.time}
        </p>
      </div>
    </div>
  );
});