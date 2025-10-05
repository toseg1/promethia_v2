import React, { memo, useEffect } from 'react';
import { X, Mail, Phone, GraduationCap, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CoachInfo } from './types';
import { useDraggableModal } from '../../hooks/useDraggableModal';

interface CoachDetailsModalProps {
  isCoachModalOpen: boolean;
  selectedCoach: CoachInfo | null;
  onCloseCoachModal: () => void;
}

export const CoachDetailsModal = memo(function CoachDetailsModal({
  isCoachModalOpen,
  selectedCoach,
  onCloseCoachModal
}: CoachDetailsModalProps) {
  const { t } = useTranslation('profile');
  
  // Draggable modal hook
  const { modalRef, resetPosition, getTransform, getDragHandleProps } = useDraggableModal();

  // Reset position when modal opens
  useEffect(() => {
    if (isCoachModalOpen) {
      resetPosition();
    }
  }, [isCoachModalOpen, resetPosition]);

  if (!isCoachModalOpen || !selectedCoach) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center"
      style={{
        paddingTop: 'var(--header-height, 64px)',
        paddingBottom: 'var(--footer-height, 84px)',
        paddingLeft: '16px',
        paddingRight: '16px'
      }}
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget) {
          onCloseCoachModal();
        }
      }}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg sm:rounded-xl border border-border/20 shadow-xl overflow-hidden"
        style={{
          width: '90%',
          maxWidth: '672px',
          maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 32px)',
          ...getTransform()
        }}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Coach Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/20" {...getDragHandleProps()}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center overflow-hidden">
              {selectedCoach.avatarUrl ? (
                <img
                  src={selectedCoach.avatarUrl}
                  alt={`${selectedCoach.firstName} ${selectedCoach.lastName}'s profile`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl font-bold text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                  {selectedCoach.firstName[0]}{selectedCoach.lastName[0]}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {selectedCoach.firstName} {selectedCoach.lastName}
              </h2>
              <p className="text-sm text-muted-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {selectedCoach.username ? `@${selectedCoach.username}` : selectedCoach.email}
              </p>
            </div>
          </div>
          <button
            onClick={onCloseCoachModal}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-foreground" />
          </button>
        </div>

        {/* Coach Modal Content */}
        <div 
          className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto" 
          style={{ 
            maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 140px)'
          }}
        >
          {/* Contact Information */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
              {t('coachDetails.contactInformation')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <Mail size={16} className="text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate">{selectedCoach.email}</span>
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <Phone size={16} className="text-muted-foreground flex-shrink-0" />
                <span className="text-sm text-foreground truncate">{selectedCoach.phone ?? t('coachDetails.notProvided')}</span>
              </div>
            </div>
          </div>

          {/* Coaching Metrics */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
              {t('coachDetails.coachingMetrics')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { 
                  label: t('coachDetails.yearsExperience'), 
                  value: selectedCoach.yearsExperience !== undefined && selectedCoach.yearsExperience !== null && selectedCoach.yearsExperience !== 0 
                    ? selectedCoach.yearsExperience 
                    : t('coachDetails.notProvided')
                },
                { label: t('coachDetails.athletesTrained'), value: selectedCoach.totalAthletes || 0 },
                { label: t('coachDetails.certifications'), value: selectedCoach.certifications?.length || 0 }
              ].map((metric) => (
                <div key={metric.label} className="p-4 bg-muted/30 rounded-xl border border-border/20">
                  <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">{metric.label}</p>
                  <p className="text-lg font-semibold text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Professional Profile */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
              {t('coachDetails.professionalProfile')}
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                <span className="font-semibold">{t('coachDetails.yearsOfCoachingExperience')}:</span> 
                <span className="text-muted-foreground"> {
                  selectedCoach.yearsExperience !== undefined && selectedCoach.yearsExperience !== null && selectedCoach.yearsExperience !== 0 
                    ? selectedCoach.yearsExperience 
                    : t('coachDetails.notProvided')
                }</span>
              </p>
              <p className="text-sm text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                <span className="font-semibold">{t('coachDetails.about')}:</span> 
                <span className="text-muted-foreground"> {selectedCoach.bio || t('coachDetails.noDescriptionProvided')}</span>
              </p>
            </div>
          </div>

          {/* Certifications */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
              {t('coachDetails.certificationsTitle')}
            </h3>
            {selectedCoach.certifications && selectedCoach.certifications.length > 0 ? (
              <div className="space-y-3">
                {selectedCoach.certifications.slice(0, 4).map((cert, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <GraduationCap size={16} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                      {cert}
                    </span>
                  </div>
                ))}
                {selectedCoach.certifications.length > 4 && (
                  <p className="text-sm text-muted-foreground mt-2" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                    {t('coachDetails.moreCertifications', { count: selectedCoach.certifications.length - 4 })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {t('coachDetails.noCertifications')}
              </p>
            )}
          </div>

          {/* Achievements */}
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4" style={{ textTransform: 'none', letterSpacing: '0px' }}>
              {t('coachDetails.achievementsTitle')}
            </h3>
            {selectedCoach.achievements && selectedCoach.achievements.length > 0 ? (
              <div className="space-y-3">
                {selectedCoach.achievements.slice(0, 3).map((achievement, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <Award size={16} className="text-muted-foreground flex-shrink-0" />
                    <span className="text-sm text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                      {achievement}
                    </span>
                  </div>
                ))}
                {selectedCoach.achievements.length > 3 && (
                  <p className="text-sm text-muted-foreground mt-2" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                    {t('coachDetails.moreAchievements', { count: selectedCoach.achievements.length - 3 })}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {t('coachDetails.noAchievements')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});