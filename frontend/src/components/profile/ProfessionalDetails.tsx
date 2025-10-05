import React, { memo, useEffect, useMemo } from 'react';
import { Briefcase, Medal, FileText, X, Plus, GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProfessionalDetails as ProfessionalDetailsType, Certification, Achievement } from './types';
import { useDraggableModal } from '../../hooks/useDraggableModal';

interface ProfessionalDetailsProps {
  currentRole: string;
  professionalDetails: ProfessionalDetailsType;
  originalProfessionalDetails: ProfessionalDetailsType; // For comparison to detect changes
  onUpdateProfessionalDetails: (field: keyof ProfessionalDetailsType, value: unknown) => void;
  isProfessionalModalOpen: boolean;
  onSetIsProfessionalModalOpen: (open: boolean) => void;
  onSaveProfessionalDetails?: () => void;
  
  // Certifications
  isCustomCertificationExpanded: boolean;
  onSetIsCustomCertificationExpanded: (expanded: boolean) => void;
  isOfficialCertificationsExpanded: boolean;
  onSetIsOfficialCertificationsExpanded: (expanded: boolean) => void;
  expandedSportCertifications: string | null;
  onSetExpandedSportCertifications: (sport: string | null) => void;
  customCertification: Certification;
  onSetCustomCertification: (cert: Certification) => void;
  onAddCustomCertification: () => void;
  onAddCertification: (sport: string, title: string) => void;
  onSaveCertification?: (certification: any) => void;
  onRemoveCertification: (id: string) => void;
  
  // Achievements
  isAchievementsExpanded: boolean;
  onSetIsAchievementsExpanded: (expanded: boolean) => void;
  customAchievement: Achievement;
  onSetCustomAchievement: (achievement: Achievement) => void;
  onAddCustomAchievement: () => void;
  onSaveAchievement?: (achievement: Achievement) => void;
  onRemoveAchievement: (id: string) => void;
  
  // Sports and constants
  sports: string[];
  officialCertifications: Record<string, string[]>;
  achievementCategories: string[];
  onToggleSport: (sport: string) => void;
}

export const ProfessionalDetails = memo(function ProfessionalDetails({
  currentRole,
  professionalDetails,
  onUpdateProfessionalDetails,
  isProfessionalModalOpen,
  onSetIsProfessionalModalOpen,
  
  isCustomCertificationExpanded,
  onSetIsCustomCertificationExpanded,
  isOfficialCertificationsExpanded,
  onSetIsOfficialCertificationsExpanded,
  expandedSportCertifications,
  onSetExpandedSportCertifications,
  customCertification,
  onSetCustomCertification,
  onAddCustomCertification,
  onAddCertification,
  onSaveCertification,
  onRemoveCertification,
  
  isAchievementsExpanded,
  onSetIsAchievementsExpanded,
  customAchievement,
  onSetCustomAchievement,
  onAddCustomAchievement,
  onSaveAchievement,
  onRemoveAchievement,
  
  sports,
  officialCertifications,
  achievementCategories,
  onToggleSport,
  onSaveProfessionalDetails,
  originalProfessionalDetails
}: ProfessionalDetailsProps) {
  const { t } = useTranslation('profile');

  // Debug: Log received props
  useEffect(() => {
    console.log('=== PROFESSIONAL DETAILS COMPONENT ===');
    console.log('Current Role:', currentRole);
    console.log('Professional Details received:', professionalDetails);
    console.log('Years Experience:', professionalDetails.yearsExperience);
  }, [professionalDetails, currentRole]);

  // Draggable modal hook
  const { modalRef, resetPosition, getTransform, getDragHandleProps } = useDraggableModal();

  // Reset position when modal opens
  useEffect(() => {
    if (isProfessionalModalOpen) {
      resetPosition();
    }
  }, [isProfessionalModalOpen, resetPosition]);

  // Detect if there are changes between current and original state
  const hasChanges = useMemo(() => {
    return JSON.stringify(professionalDetails) !== JSON.stringify(originalProfessionalDetails);
  }, [professionalDetails, originalProfessionalDetails]);

  return (
    <>
      {/* Professional Details Button */}
      <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-chart-2/10 rounded-lg">
              {currentRole === 'coach' ? (
                <Briefcase size={20} className="text-chart-2 md:w-6 md:h-6" />
              ) : (
                <Medal size={20} className="text-chart-2 md:w-6 md:h-6" />
              )}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-semibold text-foreground">
  {t(currentRole === 'coach' ? 'profile.professionalTitle' : 'profile.athleticTitle')}
</h2>
<p className="text-sm text-muted-foreground">
  {t(currentRole === 'coach' ? 'profile.professionalDesc' : 'profile.athleticDesc')}
</p>
            </div>
          </div>
          <button
            onClick={() => onSetIsProfessionalModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <FileText size={16} />
            <span className="text-sm font-medium" style={{ textTransform: 'none', letterSpacing: '0px' }}>
              {t('professionalDetails.view')}
            </span>
          </button>
        </div>

        {/* Quick Preview */}
        <div className="mt-4 pt-4 border-t border-border/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
             <p className="text-xs text-muted-foreground mb-1">
  {t(currentRole === 'coach' ? 'professionalDetails.yearsExperience' : 'professionalDetails.yearsTraining')}
</p>
             <p className="text-sm font-medium text-foreground">
  {professionalDetails.yearsExperience ? `${professionalDetails.yearsExperience} ${t('professionalDetails.years')}` : t('professionalDetails.notSpecified')}
</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
  {t(currentRole === 'athlete' ? 'professionalDetails.sports' : 'professionalDetails.certifications')}
</p>
              {currentRole === 'athlete' ? (
                <div className="flex flex-wrap gap-1">
                  {professionalDetails.sportsInvolved && professionalDetails.sportsInvolved.length > 0 ? (
                    <>
                      {professionalDetails.sportsInvolved.slice(0, 3).map((sport, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium"
                        >
                          {sport}
                        </span>
                      ))}
                      {professionalDetails.sportsInvolved.length > 3 && (
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                          +{professionalDetails.sportsInvolved.length - 3}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm font-medium text-foreground">
  {t('professionalDetails.noSportsYet')}
</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {professionalDetails.certifications && professionalDetails.certifications.length > 0 ? (
                    <>
                      {professionalDetails.certifications.slice(0, 3).map((certification, index) => (
                        <span
                          key={index}
                          className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium"
                        >
                          {certification.title}
                        </span>
                      ))}
                      {(professionalDetails.certifications?.length || 0) > 3 && (
                        <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium">
                          +{(professionalDetails.certifications?.length || 0) - 3}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm font-medium text-foreground">
  {t('professionalDetails.noCertificationsYet')}
</span>
                  )}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">
  {t('professionalDetails.achievements')} {professionalDetails.achievements && professionalDetails.achievements.length > 0 && 
    <span className="text-primary font-medium">({professionalDetails.achievements.length})</span>
  }
</p>
              <div className="flex flex-wrap gap-1">
                {professionalDetails.achievements && professionalDetails.achievements.length > 0 ? (
                  <>
                    {professionalDetails.achievements.slice(0, 3).map((achievement, index) => (
                      <span
                        key={index}
                        className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium"
                        title={`${achievement.category} (${achievement.year}): ${achievement.description || achievement.title}`}
                      >
                        {achievement.title}
                      </span>
                    ))}
                    {professionalDetails.achievements.length > 3 && (
                      <span 
                        className="px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs font-medium"
                        title={`View all ${professionalDetails.achievements.length} achievements`}
                      >
                        +{professionalDetails.achievements.length - 3}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-sm font-medium text-foreground">
  {t('professionalDetails.noAchievementsYet')}
</span>
                )}
            </div>
          </div>
        </div>
      </div>
      </div>

      {/* Professional Details Modal */}
      {isProfessionalModalOpen && (
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
              onSetIsProfessionalModalOpen(false);
            }
          }}
        >
          <div 
            ref={modalRef}
            className="bg-white rounded-lg sm:rounded-xl border border-border/20 shadow-xl overflow-hidden flex flex-col"
            style={{
              width: '90%',
              maxWidth: '672px',
              maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 32px)',
              ...getTransform()
            }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/20" {...getDragHandleProps()}>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
  {t(currentRole === 'coach' ? 'professionalDetails.modalTitleCoach' : 'professionalDetails.modalTitleAthlete')}
</h2>
                <p className="text-sm text-muted-foreground">
  {t(currentRole === 'coach' ? 'professionalDetails.modalDescCoach' : 'professionalDetails.modalDescAthlete')}
</p>
              </div>
              <button
                onClick={() => onSetIsProfessionalModalOpen(false)}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div 
              className="overflow-y-auto" 
              style={{ 
                maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 180px)'
              }}
            >
              <div className="p-4 sm:p-6">
              <div className="space-y-8">
                {/* Years of Experience */}
                <div>
                 <label className="block text-sm font-medium text-foreground mb-2">
  {t(currentRole === 'coach' ? 'professionalDetails.yearsCoachingLabel' : 'professionalDetails.yearsTrainingLabel')}
</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={professionalDetails.yearsExperience}
                    onChange={(e) => onUpdateProfessionalDetails('yearsExperience', e.target.value)}
                    placeholder={t('professionalDetails.yearsExperiencePlaceholder')}
                    className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>

                {/* About Section */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
  {t(currentRole === 'coach' ? 'professionalDetails.aboutCoachingLabel' : 'professionalDetails.aboutAthleteLabel')}
</label>
                  <textarea
                    value={professionalDetails.about}
                    onChange={(e) => onUpdateProfessionalDetails('about', e.target.value)}
                    placeholder={t(currentRole === 'coach' ? 'professionalDetails.aboutCoachingPlaceholder' : 'professionalDetails.aboutAthletePlaceholder')}
                    rows={4}
                    className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                  />
                </div>

                {/* Sports Involved (Athletes only) */}
                {currentRole === 'athlete' && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
  {t('professionalDetails.sportsInvolvedLabel')}
</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {sports.map((sport) => (
                        <button
                          key={sport}
                          onClick={() => onToggleSport(sport)}
                          className={`p-3 rounded-lg border transition-colors text-left ${
                            professionalDetails.sportsInvolved?.includes(sport)
                              ? 'bg-primary/10 border-primary text-primary'
                              : 'bg-muted/30 border-border/20 text-foreground hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full border-2 ${
                              professionalDetails.sportsInvolved?.includes(sport)
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground'
                            }`} />
                            <span className="text-sm font-medium">{sport}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Certifications - Only for Coaches */}
                {currentRole === 'coach' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                     <label className="text-sm font-medium text-foreground">
  {t('professionalDetails.coachingCertificationsLabel')}
</label>
                    </div>

                    {/* Existing Certifications */}
                    <div className="space-y-3 mb-6">
                      {professionalDetails.certifications.map((cert) => (
                        <div key={cert.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">
                                {cert.sport}
                              </span>
                              <span className="text-sm font-medium text-foreground">{cert.title}</span>
                              {cert.isCustom && (
                                <span className="text-xs px-2 py-1 bg-chart-4/10 text-chart-4 rounded-full">
  {t('professionalDetails.custom')}
</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              {cert.isCustom && cert.issuer && (
                                <span>{t('professionalDetails.issuer')}: {cert.issuer}</span>
                              )}
                              <span>{t('professionalDetails.year')}: {cert.year}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => onRemoveCertification(cert.id)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Custom Certification - Collapsible */}
                    <div className="mb-6 border border-border/20 rounded-lg overflow-hidden">
                      <button
                        onClick={() => onSetIsCustomCertificationExpanded(!isCustomCertificationExpanded)}
                        className="w-full p-4 bg-muted/20 hover:bg-muted/30 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <FileText size={16} />
                          <span className="text-sm font-medium text-foreground">{t('professionalDetails.addCertification')}</span>
                        </div>
                        <div className={`transform transition-transform ${
                          isCustomCertificationExpanded ? 'rotate-45' : ''
                        }`}>
                          <Plus size={16} />
                        </div>
                      </button>
                      {isCustomCertificationExpanded && (
                        <div className="p-4 bg-white">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">{t('professionalDetails.sport')}</label>
                              <select
                                value={customCertification.sport}
                                onChange={(e) => onSetCustomCertification({...customCertification, sport: e.target.value})}
                                className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                              >
                                {sports.map((sport) => (
                                  <option key={sport} value={sport}>{sport}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">{t('professionalDetails.year')}</label>
                              <input
                                type="number"
                                min="1900"
                                max={new Date().getFullYear()}
                                value={customCertification.year}
                                onChange={(e) => onSetCustomCertification({...customCertification, year: e.target.value})}
                                className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                              />
                            </div>
                          </div>
                          <div className="mb-4">
                            <label className="block text-xs text-muted-foreground mb-1">{t('professionalDetails.certificationTitle')}</label>
                            <input
                              type="text"
                              value={customCertification.title}
                              onChange={(e) => onSetCustomCertification({...customCertification, title: e.target.value})}
                              placeholder={t('professionalDetails.certificationNamePlaceholder')}
                              className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                            />
                          </div>
                          <div className="mb-4">
                            <label className="block text-xs text-muted-foreground mb-1">{t('professionalDetails.issuingOrganization')}</label>
                            <input
                              type="text"
                              value={customCertification.issuer}
                              onChange={(e) => onSetCustomCertification({...customCertification, issuer: e.target.value})}
                              placeholder={t('professionalDetails.issuingOrgPlaceholder')}
                              className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                            />
                          </div>
                          <button
                            onClick={onAddCustomCertification}
                            disabled={!customCertification.title.trim()}
                            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            {t('professionalDetails.addCertification')}
                          </button>
                        </div>
                      )}
                    </div>

                    
                  </div>
                )}

                {/* Achievements - Available for both Athlete and Coach */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                   <label className="text-sm font-medium text-foreground">
  {t('professionalDetails.achievements')}
</label>
                  </div>

                  {/* Existing Achievements */}
                  <div className="space-y-3 mb-6">
                    {professionalDetails.achievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-1 bg-chart-4/10 text-chart-4 rounded-full">
                              {achievement.category}
                            </span>
                            <span className="text-sm font-medium text-foreground">{achievement.title}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{t('professionalDetails.year')}: {achievement.year}</span>
                          </div>
                          {achievement.description && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                              {achievement.description}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => onRemoveAchievement(achievement.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Achievement - Collapsible */}
                  <div className="border border-border/20 rounded-lg overflow-hidden">
                    <button
                      onClick={() => onSetIsAchievementsExpanded(!isAchievementsExpanded)}
                      className="w-full p-4 bg-muted/20 hover:bg-muted/30 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Medal size={16} />
                        <span className="text-sm font-medium text-foreground">{t('professionalDetails.addAchievement')}</span>
                      </div>
                      <div className={`transform transition-transform ${
                        isAchievementsExpanded ? 'rotate-45' : ''
                      }`}>
                        <Plus size={16} />
                      </div>
                    </button>
                    {isAchievementsExpanded && (
                      <div className="p-4 bg-white">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">{t('professionalDetails.category')}</label>
                            <select
                              value={customAchievement.category}
                              onChange={(e) => onSetCustomAchievement({...customAchievement, category: e.target.value})}
                              className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                            >
                              {achievementCategories.map((category) => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">{t('professionalDetails.year')}</label>
                            <input
                              type="number"
                              min="1900"
                              max={new Date().getFullYear()}
                              value={customAchievement.year}
                              onChange={(e) => onSetCustomAchievement({...customAchievement, year: e.target.value})}
                              className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                            />
                          </div>
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs text-muted-foreground mb-1">{t('professionalDetails.achievementTitle')}</label>
                          <input
                            type="text"
                            value={customAchievement.title}
                            onChange={(e) => onSetCustomAchievement({...customAchievement, title: e.target.value})}
                            placeholder={t('professionalDetails.achievementTitlePlaceholder')}
                            className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="block text-xs text-muted-foreground mb-1">{t('professionalDetails.descriptionOptional')}</label>
                          <textarea
                            value={customAchievement.description}
                            onChange={(e) => onSetCustomAchievement({...customAchievement, description: e.target.value})}
                            placeholder={t('professionalDetails.achievementDescriptionPlaceholder')}
                            rows={2}
                            className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm resize-none"
                          />
                        </div>
                        <button
                          onClick={onAddCustomAchievement}
                          disabled={!customAchievement.title.trim()}
                          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                          {t('professionalDetails.addAchievement')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

              </div>
              </div>
            </div>

            {/* Modal Footer - Save Button (only show when there are changes) */}
            {hasChanges && (
              <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-border/20 bg-muted/10">
                <button
                  onClick={() => {
                    if (onSaveProfessionalDetails) {
                      onSaveProfessionalDetails();
                    }
                    // Don't close modal here - let the save handler decide when to close
                  }}
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                >
                  {t('professionalDetails.saveChanges')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
});
