import React from 'react';
import { Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WorkInProgressProps {
  title: string;
  description: string;
}

export function WorkInProgress({ title, description }: WorkInProgressProps) {
  const { t } = useTranslation('errors');
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        {/* Runner Icon with Animation */}
        <div className="relative mb-8">
          <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mb-4 animate-pulse">
            <Zap size={48} className="text-primary md:w-16 md:h-16" />
          </div>
          
          {/* Coming Soon Badge */}
          <div className="absolute -top-2 -right-2 bg-chart-1 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide animate-bounce">
            {t('common:comingSoon')}
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-4 text-center max-w-2xl">
          {title}
        </h1>

        {/* Description */}
        <p className="text-base md:text-lg text-muted-foreground mb-8 text-center max-w-2xl leading-relaxed">
          {description}
        </p>

        {/* Progress Indicators */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
            <span className="text-sm text-muted-foreground">{t('common:inDevelopment')}</span>
          </div>
          <div className="w-px h-4 bg-border"></div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-chart-2 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">{t('common:betaTesting')}</span>
          </div>
        </div>

        {/* Feature Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl">
          <div className="p-4 bg-white rounded-xl border border-border/20 shadow-sm">
            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mb-3">
              <div className="w-4 h-4 bg-primary/30 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-foreground mb-2">{t('workInProgress.enhancedPerformance')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('workInProgress.enhancedPerformanceDesc')}
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-border/20 shadow-sm">
            <div className="w-8 h-8 bg-chart-2/10 rounded-lg flex items-center justify-center mb-3">
              <div className="w-4 h-4 bg-chart-2/30 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-foreground mb-2">{t('workInProgress.smartIntegration')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('workInProgress.smartIntegrationDesc')}
            </p>
          </div>

          <div className="p-4 bg-white rounded-xl border border-border/20 shadow-sm">
            <div className="w-8 h-8 bg-chart-3/10 rounded-lg flex items-center justify-center mb-3">
              <div className="w-4 h-4 bg-chart-3/30 rounded-full"></div>
            </div>
            <h3 className="font-semibold text-foreground mb-2">{t('workInProgress.personalizedExperience')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('workInProgress.personalizedExperienceDesc')}
            </p>
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/20 text-center">
          <p className="text-sm text-primary font-medium mb-2">
            {t('workInProgress.notifyQuestion')}
          </p>
          <p className="text-xs text-muted-foreground">
            {t('workInProgress.stayTuned')}
          </p>
        </div>
      </div>
    </div>
  );
}