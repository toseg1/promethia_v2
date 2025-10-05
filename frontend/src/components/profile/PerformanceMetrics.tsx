import React, { memo } from 'react';
import { Activity, Target, Waves } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PerformanceMetrics as PerformanceMetricsType } from './types';

interface PerformanceMetricsProps {
  metrics: PerformanceMetricsType;
  activeMetric: string | null;
  onSetActiveMetric: (metric: string | null) => void;
  onUpdateMetric: (metric: keyof PerformanceMetricsType, value: string) => void;
}

export const PerformanceMetrics = memo(function PerformanceMetrics({
  metrics,
  activeMetric,
  onSetActiveMetric,
  onUpdateMetric
}: PerformanceMetricsProps) {
  const { t } = useTranslation('profile');

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="p-2 bg-chart-1/10 rounded-lg">
          <Activity size={20} className="text-chart-1 md:w-6 md:h-6" />
        </div>
        <h2 className="text-lg md:text-xl font-semibold text-foreground">{t('performanceMetrics.title')}</h2>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* MAS - Maximum Aerobic Speed */}
        <div className="p-4 border border-border/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Target size={20} className="text-chart-1" />
              <h3 className="font-semibold text-foreground">{t('performanceMetrics.mas')}</h3>
            </div>
            <button
              onClick={() => onSetActiveMetric(activeMetric === 'mas' ? null : 'mas')}
              className="text-sm text-primary hover:text-primary/80"
            >
              {activeMetric === 'mas' ? t('performanceMetrics.close') : t('performanceMetrics.edit')}
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {t('performanceMetrics.masDescription')}
          </p>
          
          {activeMetric === 'mas' ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={metrics.mas}
                onChange={(e) => onUpdateMetric('mas', e.target.value)}
                className="flex-1 px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <span className="text-sm text-muted-foreground">{t('performanceMetrics.kmh')}</span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {metrics.mas} <span className="text-sm font-normal text-muted-foreground">{t('performanceMetrics.kmh')}</span>
            </div>
          )}
        </div>

        {/* FPP - Functional Power Prototype */}
        <div className="p-4 border border-border/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity size={20} className="text-chart-2" />
              <h3 className="font-semibold text-foreground">{t('performanceMetrics.fpp')}</h3>
            </div>
            <button
              onClick={() => onSetActiveMetric(activeMetric === 'fpp' ? null : 'fpp')}
              className="text-sm text-primary hover:text-primary/80"
            >
              {activeMetric === 'fpp' ? t('performanceMetrics.close') : t('performanceMetrics.edit')}
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {t('performanceMetrics.fppDescription')}
          </p>
          
          {activeMetric === 'fpp' ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="1"
                value={metrics.fpp}
                onChange={(e) => onUpdateMetric('fpp', e.target.value)}
                className="flex-1 px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
              <span className="text-sm text-muted-foreground">{t('performanceMetrics.watts')}</span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {metrics.fpp} <span className="text-sm font-normal text-muted-foreground">{t('performanceMetrics.watts')}</span>
            </div>
          )}
        </div>

        {/* CSS - Critical Swimming Speed */}
        <div className="p-4 border border-border/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Waves size={20} className="text-chart-3" />
              <h3 className="font-semibold text-foreground">{t('performanceMetrics.css')}</h3>
            </div>
            <button
              onClick={() => onSetActiveMetric(activeMetric === 'css' ? null : 'css')}
              className="text-sm text-primary hover:text-primary/80"
            >
              {activeMetric === 'css' ? t('performanceMetrics.close') : t('performanceMetrics.edit')}
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            {t('performanceMetrics.cssDescription')}
          </p>
          
          {activeMetric === 'css' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={metrics.css}
                onChange={(e) => onUpdateMetric('css', e.target.value)}
                placeholder={t('performanceMetrics.cssPlaceholder')}
                pattern="\d{1,2}:\d{2}"
                className="flex-1 px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono"
              />
              <span className="text-sm text-muted-foreground">{t('performanceMetrics.per100m')}</span>
            </div>
          ) : (
            <div className="text-2xl font-bold text-foreground">
              {metrics.css} <span className="text-sm font-normal text-muted-foreground">{t('performanceMetrics.per100m')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});