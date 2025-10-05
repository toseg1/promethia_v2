import React, { memo, useMemo, useEffect } from 'react';
import {
  Calendar,
  Plus,
  CalendarDays,
  Target,
  TrendingUp,
  Trophy,
  UserCheck,
  Smartphone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DashboardProps } from './types';
import { ActivityItem } from './ActivityItem';
import { LoadingOverlay } from '../ui/SkeletonLoader';
import { useDashboardSummary, useAthleteDashboardStats, useCalendarEvents } from '../../hooks';
import { useAsyncError } from '../error/AsyncErrorHandler';
import { getActivityIcon } from './activityIcons';
import { formatDate, formatDuration } from '../../utils/localeFormat';

export const AthleteDashboard = memo(function AthleteDashboard({ user, onNavigate, onAddEvent }: DashboardProps) {
  const { t } = useTranslation('dashboard');
  const { throwAsyncError } = useAsyncError();

  const recentRange = useMemo(() => {
    const now = new Date();
    return {
      start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    };
  }, []);

  const {
    data: calendarEvents,
    loading: calendarLoading,
    error: calendarError
  } = useCalendarEvents(recentRange.start, recentRange.end, true);

  const { metrics, analytics, thisWeek } = useAthleteDashboardStats(user.id, true, calendarEvents);
  const {
    data: dashboardSummary,
    loading: summaryLoading,
    error: summaryError
  } = useDashboardSummary(true);

  useEffect(() => {
    if (summaryError) {
      throwAsyncError(summaryError);
    }
  }, [summaryError, throwAsyncError]);

  useEffect(() => {
    if (analytics.error) {
      throwAsyncError(analytics.error);
    }
  }, [analytics.error, throwAsyncError]);

  useEffect(() => {
    if (thisWeek.error) {
      throwAsyncError(thisWeek.error);
    }
  }, [thisWeek.error, throwAsyncError]);

  useEffect(() => {
    if (calendarError) {
      throwAsyncError(calendarError);
    }
  }, [calendarError, throwAsyncError]);

  const isLoading = summaryLoading || analytics.loading || thisWeek.loading || calendarLoading;

  const recentActivities = useMemo(() => {
    const items = (calendarEvents || []).map((event) => {
      const eventDate = new Date(event.date);
      const type = event.type;
      const icon = getActivityIcon(type, event.sport);

      return {
        id: event.id,
        type,
        title: event.title,
        eventDate,
        sport: event.sport,
        icon
      };
    });

    if (items.length === 0 && thisWeek.data) {
      thisWeek.data.forEach((session) => {
        const eventDate = session.date instanceof Date ? session.date : new Date(session.date);
        const icon = getActivityIcon('training', session.sport);

        items.push({
          id: session.id,
          type: 'training' as const,
          title: session.title,
          eventDate,
          sport: session.sport,
          icon
        });
      });
    }

    return items
      .sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime())
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        type: item.type,
        title: item.title,
        time: formatDate(item.eventDate, 'short'),
        sport: item.sport,
        icon: item.icon
      }));
  }, [calendarEvents, thisWeek.data]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          {t('athlete.welcome', { name: user.firstName })}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t('athlete.subtitle')}
        </p>
      </div>

      <LoadingOverlay
        loading={isLoading}
        overlay
        skeleton={<div className="p-6 text-sm text-muted-foreground">{t('athlete.loading')}</div>}
      >
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('athlete.stats.thisWeek')}</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{metrics.weeklySessions}</p>
              <p className="text-xs text-muted-foreground">{t('athlete.stats.sessionsCompleted')}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Calendar size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('athlete.stats.weeklyVolume')}</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{formatDuration(metrics.weeklyMinutes)}</p>
              <p className="text-xs text-muted-foreground">{t('athlete.stats.totalTrainingTime')}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('athlete.stats.upcomingTrainings')}</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{metrics.upcomingTrainings}</p>
              <p className="text-xs text-muted-foreground">{t('athlete.stats.next30Days')}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <CalendarDays size={24} className="text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">{t('athlete.stats.upcomingRaces')}</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{metrics.upcomingRaces}</p>
              <p className="text-xs text-muted-foreground">{t('athlete.stats.next30Days')}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Trophy size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Quick Actions */}
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 md:mb-6">{t('athlete.quickActions')}</h2>
          <div className="space-y-3">
            <button
              onClick={onAddEvent}
              className="w-full flex items-center gap-3 p-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus size={20} />
              <span className="font-medium" style={{ textTransform: 'none', letterSpacing: '0px' }}>{t('actions.addEvent')}</span>
            </button>

            <button
              onClick={() => onNavigate?.('calendar')}
              className="w-full flex items-center gap-3 p-4 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <CalendarDays size={20} />
              <span className="font-medium" style={{ textTransform: 'none', letterSpacing: '0px' }}>{t('actions.viewCalendar')}</span>
            </button>

            <button
              onClick={() => onNavigate?.('metrics')}
              className="w-full flex items-center gap-3 p-4 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
            >
              <Target size={20} />
              <span className="font-medium" style={{ textTransform: 'none', letterSpacing: '0px' }}>{t('actions.metricsCalculator')}</span>
            </button>
          </div>
          
          {/* Coming Soon Features for Mobile */}
          <div className="md:hidden space-y-3 pt-2 border-t border-border/20">
            <button
              onClick={() => onNavigate?.('coach')}
              className="w-full flex items-center gap-3 p-4 bg-chart-1/10 text-foreground rounded-lg hover:bg-chart-1/20 transition-colors active:scale-95 relative"
            >
              <UserCheck size={20} className="text-chart-1" />
              <span className="font-medium text-sm" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {t('common:myCoach')}
              </span>
              <span className="ml-auto text-xs bg-chart-1 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {t('athlete.soon')}
              </span>
            </button>

            <button
              onClick={() => onNavigate?.('device-sync')}
              className="w-full flex items-center gap-3 p-4 bg-chart-2/10 text-foreground rounded-lg hover:bg-chart-2/20 transition-colors active:scale-95 relative"
            >
              <Smartphone size={20} className="text-chart-2" />
              <span className="font-medium text-sm" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {t('common:deviceSync')}
              </span>
              <span className="ml-auto text-xs bg-chart-1 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                {t('athlete.soon')}
              </span>
            </button>
          </div>
          
        </div>
        

        {/* Recent Activity */}
        <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
          <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4 md:mb-6">{t('athlete.recentActivity')}</h2>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('athlete.noActivity')}</p>
            ) : recentActivities.map((activity) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                showAthlete={false}
              />
            ))}
          </div>
        </div>
      </div>
      </LoadingOverlay>
    </div>
  );
});
