import React, { memo } from 'react';
import {
  Home,
  Calendar,
  Users,
  BarChart3,
  User,
  Trophy,
  Target,
  UserCheck,
  Smartphone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavigationItem } from '../types';

interface NavigationProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'calendar' | 'athletes' | 'metrics' | 'analytics' | 'profile' | 'coach' | 'device-sync') => void;
  userRole: string;
}

export const Navigation = memo(function Navigation({ currentView, onViewChange, userRole }: NavigationProps) {
  const { t } = useTranslation('common');

  const navigationItems = [
    {
      id: 'dashboard',
      label: t('dashboard', 'Dashboard'),
      icon: Home,
      available: true
    },
    {
      id: 'calendar',
      label: t('calendar', 'Calendar'),
      icon: Calendar,
      available: true
    },
    {
      id: 'metrics',
      label: t('metrics', 'Metrics'),
      icon: Target,
      available: true
    },
        {
      id: 'analytics',
      label: t('analytics', 'Analytics'),
      icon: BarChart3,
      available: true,
      comingSoon: true
    },
    {
      id: 'coach',
      label: t('myCoach', 'My Promethia Coach'),
      icon: UserCheck,
      available: true,
      comingSoon: true
    },
    {
      id: 'device-sync',
      label: t('deviceSync', 'Device Sync'),
      icon: Smartphone,
      available: true,
      comingSoon: true
    },
    {
      id: 'profile',
      label: t('profile', 'Profile'),
      icon: User,
      available: true
    }
  ];

  return (
    <nav className="w-64 bg-white border-r border-border/20 overflow-y-auto">
      <div className="p-4">
        <div className="space-y-2">
          {navigationItems
            .filter(item => item.available)
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-all duration-200 h-12
                    ${isActive 
                      ? 'bg-primary text-primary-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }
                  `}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Icon size={20} className="flex-shrink-0" />
                    <span className="font-medium truncate" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                      {item.label}
                    </span>
                  </div>
                  {item.comingSoon && (
                    <span className="ml-2 text-xs bg-chart-1 text-white px-2 py-1 rounded-full font-bold uppercase tracking-wider flex-shrink-0">
                      {t('soon', 'Soon')}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      </div>
    </nav>
  );
});