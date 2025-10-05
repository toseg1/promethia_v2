import React, { memo, useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { User as UserType } from './types';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import { profileService } from '../../services/profileService';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface ProfileHeaderProps {
  user: UserType;
  currentRole: string;
  onUserUpdate?: (updatedUser: Partial<UserType>) => void;
}

export const ProfileHeader = memo(function ProfileHeader({ user, currentRole, onUserUpdate }: ProfileHeaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>(undefined);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  
  const { t } = useTranslation('profile');
  
  // Fetch current profile image from backend on mount and when user changes
  useEffect(() => {
    const fetchProfileImage = async () => {
      try {
        const bundle = await profileService.getProfile();
        const imageUrl = bundle.user.profileImage ?? bundle.user.avatarUrl;
        if (imageUrl) {
          setProfileImageUrl(imageUrl);
        } else {
          setProfileImageUrl(undefined);
        }
      } catch (error) {
        console.error('Failed to fetch profile image:', error);
        setProfileImageUrl(undefined);
      }
    };
    
    if (user.id) {
      fetchProfileImage();
    }
  }, [user.id]);

  const handlePhotoChange = async (file: File) => {
    try {
      setIsUploading(true);
      
      // Upload to backend
      const updatedBundle = await profileService.uploadProfileImage(user.id, file);
      const imageUrl = updatedBundle.user.profileImage ?? updatedBundle.user.avatarUrl;

      if (imageUrl) {
        setProfileImageUrl(imageUrl);
        if (onUserUpdate) {
          onUserUpdate({ avatarUrl: imageUrl });
        }
      }

      toast.success('Profile image updated successfully!');
    } catch (error) {
      console.error('Failed to upload profile image:', error);
      toast.error('Failed to upload profile image. Please try again.');
      
      // Fallback to local preview if backend fails
      const imageUrl = URL.createObjectURL(file);
      setProfileImageUrl(imageUrl);
      if (onUserUpdate) {
        onUserUpdate({
          avatarUrl: imageUrl
        });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveClick = () => {
    setShowRemoveConfirm(true);
  };

  const handlePhotoRemove = async () => {
    try {
      setIsUploading(true);
      setShowRemoveConfirm(false);
      
      // Remove from backend
      const updatedBundle = await profileService.removeProfileImage(user.id);
      const imageUrl = updatedBundle.user.profileImage ?? updatedBundle.user.avatarUrl;

      setProfileImageUrl(imageUrl);

      if (onUserUpdate) {
        onUserUpdate({
          avatarUrl: imageUrl,
        });
      }

      toast.success('Profile image removed successfully!');
    } catch (error) {
      console.error('Failed to remove profile image:', error);
      toast.error('Failed to remove profile image. Please try again.');
      
      // Still remove from UI even if backend fails
      if (onUserUpdate) {
        onUserUpdate({
          avatarUrl: undefined
        });
      }
    } finally {
      setIsUploading(false);
    }
  };
  return (
    <div className="bg-white p-4 md:p-6 rounded-xl border border-border/20 shadow-sm">
      <div className="flex items-center gap-4 md:gap-6">
        {/* Profile Avatar */}
        <div className="relative">
          <ProfileAvatar
            firstName={user.firstName}
            lastName={user.lastName}
            userId={user.id}
            avatarUrl={profileImageUrl}
            avatarColor={user.avatarColor}
            size="md"
            editable={true}
            onPhotoChange={handlePhotoChange}
            onPhotoRemove={handleRemoveClick}
          />
          {isUploading && (
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-lg">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-foreground">
            {user.firstName} {user.lastName}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base">
            @{user.username}
          </p>
          
          
        </div>

        {/* Quick Actions */}
        <div className="hidden md:flex items-center gap-2">
          <button className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
            <User size={16} />
          </button>
        </div>
      </div>
      
      {/* Remove Profile Picture Confirmation Modal */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">
              {t('picture.remove')}
            </h3>
            <p className="text-muted-foreground text-sm mb-6">
              {t('picture.comfirmMessage')}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRemoveConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                disabled={isUploading}
              >
                {t('picture.cancel')}
              </button>
              <button
                onClick={handlePhotoRemove}
                disabled={isUploading}
                className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUploading ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
