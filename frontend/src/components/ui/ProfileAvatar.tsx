import React, { useState, useRef, useCallback } from 'react';
import { Camera, User, X, AlertTriangle, Upload } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

// 6 predefined avatar colors as requested
export const AVATAR_COLORS = [
  { bg: '#FF6B6B', text: '#FFFFFF', name: 'coral' },     // Coral Red
  { bg: '#4ECDC4', text: '#FFFFFF', name: 'teal' },      // Teal
  { bg: '#45B7D1', text: '#FFFFFF', name: 'blue' },      // Sky Blue  
  { bg: '#96CEB4', text: '#FFFFFF', name: 'mint' },      // Mint Green
  { bg: '#FECA57', text: '#2C2C2C', name: 'yellow' },    // Golden Yellow
  { bg: '#FF9FF3', text: '#2C2C2C', name: 'pink' },      // Light Pink
];


interface ProfileAvatarProps {
  firstName: string;
  lastName: string;
  userId?: string;
  avatarUrl?: string;
  avatarColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  onPhotoChange?: (file: File, processedUrl?: string) => void;
  onPhotoRemove?: () => void;
  showBorder?: boolean;
  className?: string;
}

export function ProfileAvatar({ 
  firstName, 
  lastName,
  userId,
  avatarUrl, 
  avatarColor,
  size = 'md',
  editable = false,
  onPhotoChange,
  onPhotoRemove,
  showBorder = true,
  className = ''
}: ProfileAvatarProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasError, setHasError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get initials with improved logic
  const getInitials = useCallback(() => {
    const first = firstName?.trim() || '';
    const last = lastName?.trim() || '';
    
    if (first && last) {
      // Both names: first letter of each
      return `${first[0]}${last[0]}`.toUpperCase();
    } else if (first) {
      // Only first name: first 2 letters
      return first.substring(0, 2).toUpperCase();
    } else if (last) {
      // Only last name: first 2 letters  
      return last.substring(0, 2).toUpperCase();
    }
    
    return 'U'; // Default fallback
  }, [firstName, lastName]);

  // Get color scheme with consistent hashing
  const getColorScheme = useCallback(() => {
    let colorIndex = 0;
    
    if (avatarColor) {
      // Find existing color by background value
      colorIndex = AVATAR_COLORS.findIndex(color => color.bg === avatarColor);
      if (colorIndex === -1) colorIndex = 0; // Fallback to first color
    } else {
      // Generate consistent hash from userId (preferred) or name
      const hashSource = userId || `${firstName}${lastName}`.toLowerCase();
      const hash = hashSource
        .split('')
        .reduce((acc, char) => {
          const charCode = char.charCodeAt(0);
          return acc + charCode + ((acc << 5) - acc);
        }, 0);
      colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
    }
    
    return AVATAR_COLORS[colorIndex];
  }, [avatarColor, userId, firstName, lastName]);

  // Enhanced size configurations
  const sizeClasses = {
    sm: { 
      container: 'w-10 h-10', 
      text: 'text-sm',
      icon: 16,
      camera: 'w-6 h-6',
      cameraIcon: 12,
      spinner: 'w-4 h-4'
    },
    md: { 
      container: 'w-16 h-16 md:w-20 md:h-20', 
      text: 'text-lg md:text-xl',
      icon: 24,
      camera: 'w-7 h-7 md:w-8 md:h-8',
      cameraIcon: 14,
      spinner: 'w-5 h-5'
    },
    lg: { 
      container: 'w-24 h-24 md:w-28 md:h-28', 
      text: 'text-2xl md:text-3xl',
      icon: 32,
      camera: 'w-9 h-9 md:w-10 md:h-10',
      cameraIcon: 16,
      spinner: 'w-6 h-6'
    },
    xl: { 
      container: 'w-32 h-32 md:w-36 md:h-36', 
      text: 'text-3xl md:text-4xl',
      icon: 40,
      camera: 'w-10 h-10 md:w-12 md:h-12',
      cameraIcon: 18,
      spinner: 'w-8 h-8'
    },
  };

  // Image processing and compression
  const processImage = useCallback(async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        reject(new Error('Canvas not available'));
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      const img = new Image();
      img.onload = () => {
        // Determine output size (optimize for web)
        const maxSize = 400; // Max 400px for avatar
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(URL.createObjectURL(blob));
          } else {
            reject(new Error('Failed to compress image'));
          }
        }, 'image/jpeg', 0.8); // 80% quality JPEG
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }, []);

  const handlePhotoClick = useCallback(() => {
    if (editable && !isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [editable, isUploading]);

  const handleRemovePhoto = useCallback(() => {
    if (onPhotoRemove) {
      onPhotoRemove();
    }
  }, [onPhotoRemove]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset error state
    setHasError(false);

    // Validate file type (PNG, JPG, JPEG, WebP)
    const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      toast.error('Please select a PNG, JPG, JPEG, or WebP image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      // Process and compress image
      const processedUrl = await processImage(file);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Simulate final upload delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (onPhotoChange) {
        onPhotoChange(file, processedUrl);
      }
      
      toast.success('Profile picture updated successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      setHasError(true);
      toast.error('Failed to update profile picture. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [onPhotoChange, processImage]);

  const colorScheme = getColorScheme();
  const sizes = sizeClasses[size];
  const initials = getInitials();
  

  return (
    <>
      <div className={`relative inline-block ${className}`}>
        {/* Hidden canvas for image processing */}
        <canvas
          ref={canvasRef}
          style={{ display: 'none' }}
        />
        
        <div 
          className={`${sizes.container} rounded-full flex items-center justify-center transition-all duration-200 ${
            showBorder ? 'border-2' : ''
          } ${
            hasError ? 'border-red-300 bg-red-50' : showBorder ? 'border-gray-200' : ''
          } ${
            editable && !isUploading ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''
          } ${
            isUploading ? 'opacity-70' : ''
          }`}
          onClick={handlePhotoClick}
          style={{
            borderColor: showBorder && !hasError ? colorScheme.bg + '40' : undefined,
          }}
        >
          {avatarUrl && !hasError ? (
            <img
              src={avatarUrl}
              alt={`${firstName} ${lastName}`.trim() || 'User avatar'}
              className="w-full h-full rounded-full object-cover"
              onError={() => setHasError(true)}
            />
          ) : (
            <div 
              className="w-full h-full rounded-full flex items-center justify-center"
              style={{ 
                backgroundColor: colorScheme.bg,
                color: colorScheme.text
              }}
            >
              {firstName || lastName ? (
                <span 
                  className={`${sizes.text} font-bold font-primary`}
                  style={{ color: colorScheme.text }}
                >
                  {initials}
                </span>
              ) : (
                <User size={sizes.icon} className="opacity-80" />
              )}
            </div>
          )}
          
          {/* Interactive overlay for editable avatars */}
          {editable && !isUploading && (
            <div className="absolute inset-0 rounded-full bg-black/0 hover:bg-black/20 flex items-center justify-center transition-all duration-300 group">
              {avatarUrl && !hasError ? (
                // Show edit and remove buttons when there's a custom photo
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div 
                    className={`${sizes.camera} bg-white/95 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm`}
                    title="Change profile picture"
                  >
                    <Camera size={sizes.cameraIcon} className="text-gray-700" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto();
                    }}
                    className={`${sizes.camera} bg-red-500/95 hover:bg-red-600/95 rounded-full flex items-center justify-center shadow-lg transition-colors backdrop-blur-sm`}
                    title="Remove profile picture"
                  >
                    <X size={sizes.cameraIcon} className="text-white" />
                  </button>
                </div>
              ) : (
                // Show upload button when using initials
                <div 
                  className={`${sizes.camera} bg-white/95 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm`}
                  title="Upload profile picture"
                >
                  <Upload size={sizes.cameraIcon} className="text-gray-700" />
                </div>
              )}
            </div>
          )}

          {/* Loading indicator with progress */}
          {isUploading && (
            <div className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm">
              <div className={`${sizes.spinner} border-2 border-white/30 border-t-white rounded-full animate-spin mb-1`} />
              {uploadProgress > 0 && (
                <div className="text-white text-xs font-medium">
                  {Math.round(uploadProgress)}%
                </div>
              )}
            </div>
          )}

          {/* Error state indicator */}
          {hasError && !isUploading && (
            <div className="absolute inset-0 rounded-full bg-red-50/90 flex items-center justify-center backdrop-blur-sm">
              <AlertTriangle size={sizes.icon * 0.6} className="text-red-500" />
            </div>
          )}
        </div>

        {/* Hidden file input */}
        {editable && (
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpg,image/jpeg,image/webp"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />
        )}
      </div>

    </>
  );
}

// Utility function to assign avatar color to new users
export function assignAvatarColor(firstName: string, lastName: string, userId?: string): string {
  // Use consistent hashing based on userId (preferred) or name
  const hashSource = userId || `${firstName}${lastName}`.toLowerCase();
  const hash = hashSource
    .split('')
    .reduce((acc, char) => {
      const charCode = char.charCodeAt(0);
      return acc + charCode + ((acc << 5) - acc);
    }, 0);
  const colorIndex = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[colorIndex].bg;
}

// Helper function to get contrasting text color
export function getContrastingTextColor(backgroundColor: string): string {
  const color = AVATAR_COLORS.find(c => c.bg === backgroundColor);
  return color?.text || '#FFFFFF';
}

// Helper to get all available colors
export function getAvailableAvatarColors() {
  return AVATAR_COLORS;
}