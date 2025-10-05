import React from 'react';
import { Save, Loader2 } from 'lucide-react';
import { useOptimisticUpdates } from '../../hooks/useOptimisticUpdates';

interface ProfileActionsProps {
  onSave: () => Promise<void>;
  hasChanges?: boolean;
  isLoading?: boolean;
}

export function ProfileActions({ 
  onSave, 
  hasChanges = false, 
  isLoading = false 
}: ProfileActionsProps) {
  const { addOptimisticUpdate, isPending } = useOptimisticUpdates();
  
  const handleSave = async () => {
    if (!hasChanges || isLoading || isPending()) return;
    
    await addOptimisticUpdate(
      { saved: true },
      onSave,
      () => {}, // No revert needed for save action
      {
        successMessage: 'Profile updated successfully!',
        errorMessage: 'Failed to save profile changes'
      }
    );
  };
  
  const isSaving = isLoading || isPending();

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <button
        onClick={handleSave}
        disabled={!hasChanges || isSaving}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:active:scale-100"
      >
        {isSaving ? (
          <Loader2 size={20} className="animate-spin" />
        ) : (
          <Save size={20} />
        )}
        <span className="font-medium text-sm md:text-base" style={{ textTransform: 'none', letterSpacing: '0px' }}>
          {isSaving ? 'Saving...' : 'Save Changes'}
        </span>
      </button>
    </div>
  );
}