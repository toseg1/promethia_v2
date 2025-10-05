import React, { useState, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTrainingAnalytics, useConnectedAthletes } from '../hooks';
import { LoadingOverlay } from './ui/SkeletonLoader';
import { Users, Activity, BarChart3, Target } from 'lucide-react';
import { User as UserType } from '../types';

interface AnalyticsProps {
  user: UserType;
}

type TimeRange = '7d' | '30d' | '90d' | '180d' | '1y';

const timeRangeToPeriod: Record<TimeRange, 'week' | 'month' | 'quarter' | 'year'> = {
  '7d': 'week',
  '30d': 'month',
  '90d': 'quarter',
  '180d': 'quarter',
  '1y': 'year'
};

function formatDuration(totalMinutes: number): string {
  if (!totalMinutes) return '0h';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) {
    return `${minutes} min`;
  }
  if (minutes === 0) {
    return `${hours} h`;
  }
  return `${hours} h ${minutes} min`;
}

export const Analytics = memo(function Analytics({ user }: AnalyticsProps) {
  const { t } = useTranslation('dashboard');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const period = timeRangeToPeriod[timeRange];
  const isCoach = user.role === 'coach';

  const {
    data: analytics,
    loading: analyticsLoading,
    error: analyticsError
  } = useTrainingAnalytics(user.id, period, !!user.id);

  const {
    data: connectedAthletes,
    loading: athletesLoading
  } = useConnectedAthletes(isCoach ? user.id : null, isCoach);

  const athleteCount = useMemo(() => {
    if (isCoach) {
      return connectedAthletes?.length ?? 0;
    }
    // Athlete accounts always include themselves
    return 1;
  }, [connectedAthletes, isCoach]);

  const sportBreakdown = useMemo(() => {
    const entries = Object.entries(analytics?.sportsBreakdown ?? {});
    return entries.sort(([, a], [, b]) => b - a);
  }, [analytics?.sportsBreakdown]);

  const totalSessions = analytics?.workoutCount ?? 0;
  const totalDurationMinutes = analytics?.totalDuration ?? 0;
  const averageDuration = analytics?.averageDuration ?? 0;
  const completionRate = analytics?.completionRate ?? 0;

  const isLoading = analyticsLoading || (isCoach && athletesLoading);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t('analytics.title')}</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your recent training activity and sport distribution
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d', '180d', '1y'] as TimeRange[]).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {range === '7d' && 'Last 7 days'}
              {range === '30d' && 'Last 30 days'}
              {range === '90d' && 'Last 90 days'}
              {range === '180d' && 'Last 180 days'}
              {range === '1y' && 'Last year'}
            </button>
          ))}
        </div>
      </div>

      <LoadingOverlay loading={isLoading} skeleton={<div className="p-6 text-sm text-muted-foreground">Loading analytics…</div>} overlay>
        {analyticsError ? (
          <div className="bg-white rounded-xl border border-border/20 shadow-sm p-6 text-sm text-destructive">
            Unable to load analytics right now. Please try again later.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-border/20 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">{t('analytics.totalSessions')}</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{totalSessions}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <Activity size={20} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border/20 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">{t('analytics.totalDuration')}</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{formatDuration(totalDurationMinutes)}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <Target size={20} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border/20 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">{t('analytics.averageSession')}</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{formatDuration(Math.round(averageDuration ?? 0))}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <BarChart3 size={20} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-border/20 shadow-sm p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">Athletes</p>
                    <p className="text-2xl font-bold text-foreground mt-2">{athleteCount}</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    <Users size={20} />
                  </div>
                </div>
              </div>
            </div>

            {/* Sport distribution */}
            <div className="bg-white rounded-xl border border-border/20 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">{t('analytics.sportDistribution')}</h2>
                <span className="text-xs text-muted-foreground">
                  {sportBreakdown.length > 0 ? `${sportBreakdown.length} sports tracked` : 'No sport data yet'}
                </span>
              </div>

              {sportBreakdown.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Add training sessions to see sport distribution analytics.
                </div>
              ) : (
                <div className="space-y-3">
                  {sportBreakdown.map(([sport, count]) => (
                    <div key={sport} className="flex items-center justify-between">
                      <span className="text-sm capitalize text-foreground">{sport.replace('_', ' ')}</span>
                      <span className="text-sm font-medium text-foreground">{count} session{count === 1 ? '' : 's'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Athlete list for coaches */}
            {isCoach && (
              <div className="bg-white rounded-xl border border-border/20 shadow-sm p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Athletes</h2>
                  <span className="text-xs text-muted-foreground">
                    {athleteCount} {athleteCount === 1 ? 'athlete' : 'athletes'}
                  </span>
                </div>

                {athleteCount === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Connect with athletes to begin tracking their performance.
                  </div>
                ) : (
                  <ul className="divide-y divide-border/60">
                    {(connectedAthletes || []).map((athlete) => (
                      <li key={athlete.id} className="py-3">
                        <p className="font-medium text-foreground">
                          {`${athlete.firstName} ${athlete.lastName}`.trim() || athlete.username}
                        </p>
                        <p className="text-xs text-muted-foreground">{athlete.email}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Completion rate */}
            <div className="bg-white rounded-xl border border-border/20 shadow-sm p-4">
              <h2 className="text-lg font-semibold text-foreground mb-2">{t('analytics.completionRate')}</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Percentage of sessions completed vs. scheduled during the selected period.
              </p>
              <div className="text-3xl font-bold text-foreground">{Math.round(completionRate)}%</div>
            </div>
          </div>
        )}
      </LoadingOverlay>
    </div>
  );
});
