import React, { useState, memo } from 'react';
import { User, Copy, Check, UserPlus, X, Eye, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PhoneInput } from '../auth/PhoneInput';
import { User as UserType, ProfileData, CoachInfo } from './types';

interface PersonalInfoFormProps {
  user: UserType;
  currentRole: string;
  profileData: ProfileData;
  onUpdateProfileData: (field: keyof ProfileData, value: string) => void;
  myCoachCode: string;
  isCodeCopied: boolean;
  onCopyCoachCode: () => void;
  coaches: CoachInfo[];
  onAddCoach: (coachCode: string) => void;
  onRemoveCoach: (coach: CoachInfo) => void;
  onViewCoachDetails: (coach: CoachInfo) => void;
  newCoachCode: string;
  coachCodeError: string;
  onNewCoachCodeChange: (code: string) => void;
}

export const PersonalInfoForm = memo(function PersonalInfoForm({
  user,
  currentRole,
  profileData,
  onUpdateProfileData,
  myCoachCode,
  isCodeCopied,
  onCopyCoachCode,
  coaches,
  onAddCoach,
  onRemoveCoach,
  onViewCoachDetails,
  newCoachCode,
  coachCodeError,
  onNewCoachCodeChange
}: PersonalInfoFormProps) {
  const { t } = useTranslation('profile');
  const [isAddingCoach, setIsAddingCoach] = useState(false);

  const handleAddCoach = () => {
    onAddCoach(newCoachCode);
    setIsAddingCoach(false);
  };

  const handleCancelAddCoach = () => {
    setIsAddingCoach(false);
    onNewCoachCodeChange('');
  };

  return (
    <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
      <div className="flex items-center gap-3 mb-4 md:mb-6">
        <div className="p-2 bg-primary/10 rounded-lg">
          <User size={20} className="text-primary md:w-6 md:h-6" />
        </div>
        <h2 className="text-lg md:text-xl font-semibold text-foreground">{t('personalInfo.title')}</h2>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('personalInfo.username')}</label>
            <input
              type="text"
              value={user.username}
              readOnly
              className="w-full px-3 py-2 border border-border/20 rounded-lg bg-muted/30 text-foreground cursor-default focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('personalInfo.firstName')}</label>
            <input
              type="text"
              value={profileData.firstName}
              onChange={(e) => onUpdateProfileData('firstName', e.target.value)}
              className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('personalInfo.lastName')}</label>
            <input
              type="text"
              value={profileData.lastName}
              onChange={(e) => onUpdateProfileData('lastName', e.target.value)}
              className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('personalInfo.email')}</label>
            <input
              type="email"
              value={profileData.email}
              readOnly
              className="w-full px-3 py-2 border border-border/20 rounded-lg bg-muted/30 text-foreground cursor-default focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('personalInfo.phone')}</label>
            <PhoneInput
              value={profileData.phone}
              countryCode={profileData.countryCode}
              onChange={(phone, countryCode) => {
                onUpdateProfileData('phone', phone);
                onUpdateProfileData('countryCode', countryCode);
              }}
              placeholder={t('personalInfo.phoneNumberPlaceholder')}
              variant="profile"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">{t('personalInfo.dateOfBirth')}</label>
            <input
              type="date"
              value={profileData.dateOfBirth}
              onChange={(e) => onUpdateProfileData('dateOfBirth', e.target.value)}
              className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>
        </div>

     

        {/* Coach-specific section: Show unique coach ID */}
        {currentRole === 'coach' && (
          <div className="pt-4 border-t border-border/20">
            <div className="mb-4">
              <h3 className="text-base font-semibold text-foreground">{t('personalInfo.coachRelationshipTitle')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('personalInfo.coachRelationshipDesc')}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">{t('personalInfo.yourCoachId')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={myCoachCode}
                    readOnly
                    className="w-full px-3 py-2 border border-border/20 rounded-lg bg-muted/30 text-foreground font-mono tracking-wider cursor-default focus:outline-none"
                  />
                  <button
                    onClick={onCopyCoachCode}
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm"
                  >
                    {isCodeCopied ? (
                      <>
                        <Check size={14} />
                        {t('personalInfo.copied')}
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        {t('personalInfo.copy')}
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {t('personalInfo.shareCoachIdMessage')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Athlete-specific section: Coach Connection */}
        {currentRole === 'athlete' && (
          <div className="pt-4 border-t border-border/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">{t('personalInfo.coachConnectionsTitle')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('personalInfo.coachConnectionsDesc')}
                </p>
              </div>
              {!isAddingCoach && (
                <button
                  onClick={() => setIsAddingCoach(true)}
                  className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium"
                >
                  <UserPlus size={16} />
                  {t('personalInfo.addCoach')}
                </button>
              )}
            </div>

            {/* Add Coach Form */}
            {isAddingCoach && (
              <div className="mb-4 p-4 bg-muted/30 rounded-lg">
                <label className="block text-sm font-medium text-foreground mb-2">{t('personalInfo.coachCode')}</label>
                <input
                  type="text"
                  value={newCoachCode}
                  onChange={(e) => onNewCoachCodeChange(e.target.value)}
                  placeholder={t('personalInfo.enterCoachCode')}
                  className="w-full px-3 py-2 border border-border/20 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary mb-3"
                />
                {coachCodeError && (
                  <p className="text-sm text-destructive mb-3">{coachCodeError}</p>
                )}
                <p className="text-xs text-muted-foreground mb-4">
                  {t('personalInfo.askCoachCodeMessage')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddCoach}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    {t('personalInfo.connect')}
                  </button>
                  <button
                    onClick={handleCancelAddCoach}
                    className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 transition-colors"
                  >
                    {t('personalInfo.cancel')}
                  </button>
                </div>
              </div>
            )}

            {/* Connected Coaches List */}
            {coaches.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-foreground">{t('personalInfo.connectedCoaches', { count: coaches.length })}</p>
                {coaches.map((coach) => (
                  <div key={coach.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {coach.firstName[0]}{coach.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {coach.firstName} {coach.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{coach.specialty}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewCoachDetails(coach)}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        title={t('personalInfo.viewDetails')}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => onRemoveCoach(coach)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title={t('personalInfo.disconnectCoach')}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {coaches.length === 0 && !isAddingCoach && (
              <div className="text-center py-6 text-muted-foreground">
                <Users size={24} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('personalInfo.noCoaches')}</p>
                <p className="text-xs">{t('personalInfo.addCoachMessage')}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});