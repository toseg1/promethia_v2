import React, { useEffect, useState } from 'react';
import { X, Copy, Check, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { toast } from 'sonner@2.0.3';

interface AddAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachName: string;
  coachCode?: string;
}

export function AddAthleteModal({ isOpen, onClose, coachName, coachCode }: AddAthleteModalProps) {
  const { t } = useTranslation('dashboard');
  const [isCopied, setIsCopied] = useState(false);

  const displayCode = coachCode ?? t('coach.addAthleteModal.codeNotAvailable');
  const canCopy = Boolean(coachCode);

  useEffect(() => {
    setIsCopied(false);
  }, [coachCode, isOpen]);

  const handleCopyCode = async () => {
    if (!canCopy) {
      toast.error(t('coach.addAthleteModal.codeUnavailableError'));
      return;
    }

    try {
      await navigator.clipboard.writeText(coachCode!);
      setIsCopied(true);
      toast.success(t('coach.addAthleteModal.copiedSuccess'));
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error(t('coach.addAthleteModal.copyFailed'));
    }
  };

  const handleClose = () => {
    setIsCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        paddingTop: 'var(--header-height, 64px)',
        paddingBottom: 'var(--footer-height, 84px)',
        paddingLeft: '16px',
        paddingRight: '16px'
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-lg sm:rounded-xl shadow-xl overflow-hidden"
        style={{
          width: '90%',
          maxWidth: '448px',
          maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 32px)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <User size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {t('coach.addAthleteModal.title')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t('coach.addAthleteModal.subtitle')}{coachName ? ` (${coachName})` : ''}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleClose}
            className="h-8 w-8 rounded-full"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6" style={{ maxHeight: 'calc(100vh - var(--header-height, 64px) - var(--footer-height, 84px) - 160px)', overflowY: 'auto' }}>
          {/* Unique Code Section */}
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <h4 className="font-medium text-foreground" style={{ textTransform: 'none', letterSpacing: '0px' }}>
                {t('coach.addAthleteModal.yourCode')}
              </h4>
              <div className="bg-muted/50 border border-border/20 rounded-lg px-4 py-4">
                <div className="font-mono text-2xl font-bold text-center text-foreground tracking-wider mb-3">
                  {displayCode}
                </div>
                <Button
                  variant="outline"
                  onClick={handleCopyCode}
                  className="w-full"
                  disabled={!canCopy}
                  style={{ textTransform: 'none', letterSpacing: '0px' }}
                >
                  {isCopied ? (
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-green-600" />
                      {t('coach.addAthleteModal.codeCopied')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Copy size={16} />
                      {canCopy ? t('coach.addAthleteModal.copyCode') : t('coach.addAthleteModal.codeNotAvailable')}
                    </div>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              {canCopy ? (
                <p className="text-sm text-blue-800 text-center leading-relaxed">
                  {t('coach.addAthleteModal.instructions')}
                </p>
              ) : (
                <p className="text-sm text-blue-800 text-center leading-relaxed">
                  {t('coach.addAthleteModal.loadError')}
                </p>
              )}
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <Button
              onClick={handleClose}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              style={{ textTransform: 'none', letterSpacing: '0px' }}
            >
              {t('coach.addAthleteModal.done')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
