import React, { memo } from 'react';
import {
  Home,
  Calendar,
  Users,
  BarChart3,
  User,
  Target,
  Plus
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavigationItem } from '../types';

interface MobileNavigationProps {
  currentView: string;
  onViewChange: (view: 'dashboard' | 'calendar' | 'athletes' | 'metrics' | 'analytics' | 'profile' | 'coach' | 'device-sync') => void;
  userRole: string;
  onAddEvent: () => void;
}

export const MobileNavigation = memo(function MobileNavigation({ currentView, onViewChange, userRole, onAddEvent }: MobileNavigationProps) {
  const { t } = useTranslation('common');

  const leftNavigationItems = [
    {
      id: 'dashboard',
      label: t('dashboard', 'Home'),
      icon: Home,
      available: true
    },
    {
      id: 'calendar',
      label: t('calendar', 'Calendar'),
      icon: Calendar,
      available: true
    }
  ];

  const rightNavigationItems = [
    {
      id: 'analytics',
      label: t('analytics', 'Analytics'),
      icon: BarChart3,
      available: true
    },
    {
      id: 'metrics',
      label: t('metrics', 'Metrics'),
      icon: Target,
      available: true
    },

    {
      id: 'profile',
      label: t('profile', 'Profile'),
      icon: User,
      available: true
    }
  ].filter(item => item.available).slice(0, 2); // Take only 2 items for the right side

  const renderNavButton = (item: NavigationItem, className = '') => {
    const Icon = item.icon;
    const isActive = currentView === item.id;
    
    return (
      <button
        key={item.id}
        onClick={() => onViewChange(item.id)}
        className={`
          flex flex-col items-center justify-center py-2 px-1 min-h-[64px] transition-colors
          ${isActive 
            ? 'text-primary' 
            : 'text-gray-500'
          }
          ${className}
        `}
      >
        <Icon 
          size={24} 
          className={`mb-1 ${isActive ? 'text-primary' : 'text-gray-500'}`}
        />
        <span 
          className={`
            text-xs font-medium leading-tight
            ${isActive ? 'text-primary' : 'text-gray-500'}
          `}
          style={{ 
            fontFamily: 'var(--font-secondary)',
            fontSize: '10px',
            textTransform: 'none',
            letterSpacing: '0px'
          }}
        >
          {item.label}
        </span>
      </button>
    );
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="grid grid-cols-5 items-center h-16">
        {/* Left Navigation Items - Always 2 columns */}
        {leftNavigationItems.map((item, index) => 
          renderNavButton(item, 'col-span-1')
        )}

        {/* Center Add Button - iOS Style - 1 column */}
        <div className="col-span-1 flex justify-center">
          <button
            onClick={onAddEvent}
            className="
              w-14 h-14 bg-black rounded-full flex items-center justify-center
              shadow-lg active:scale-95 transition-transform
            "
          >
            <Plus size={28} className="text-white" />
          </button>
        </div>

        {/* Right Navigation Items - Always 2 columns */}
        {rightNavigationItems.map((item, index) => 
          renderNavButton(item, 'col-span-1')
        )}
      </div>

      {/* iOS-style Home Indicator */}
      <div className="flex justify-center pb-1">
        <div className="w-32 h-1 bg-gray-300 rounded-full"></div>
      </div>
    </nav>
  );
});