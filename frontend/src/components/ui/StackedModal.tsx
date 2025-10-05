import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { useModalStack } from '../../contexts/ModalStackContext';

interface StackedModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  level?: number;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'auto';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  maxHeight?: string;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl', 
  lg: 'max-w-[600px]',  // Desktop: max 600px as per requirements
  xl: 'max-w-6xl',
  auto: 'max-w-fit'
};

export function StackedModal({
  id,
  isOpen,
  onClose,
  children,
  level = 1,
  title,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  maxHeight
}: StackedModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { 
    registerModal, 
    unregisterModal, 
    closeModal, 
    isModalTopmost, 
    hasOverlayModals 
  } = useModalStack();

  // Register/unregister modal with stack
  useEffect(() => {
    if (isOpen) {
      registerModal({
        id,
        level,
        onClose,
        closeOnBackdropClick,
        closeOnEscape
      });
    } else {
      unregisterModal(id);
    }

    return () => unregisterModal(id);
  }, [isOpen, id, level, onClose, closeOnBackdropClick, closeOnEscape, registerModal, unregisterModal]);

  // Handle backdrop clicks with proper event delegation
  useEffect(() => {
    if (!isOpen || !closeOnBackdropClick) return;

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const modalBackdrop = target.closest(`[data-modal-id="${id}"]`);
      const modalContent = target.closest('.relative.bg-white');
      
      // Only close if click is on this modal's backdrop but not on modal content
      if (modalBackdrop?.getAttribute('data-modal-id') === id && !modalContent) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    document.addEventListener('mousedown', handleDocumentClick, true);
    return () => document.removeEventListener('mousedown', handleDocumentClick, true);
  }, [isOpen, closeOnBackdropClick, id, onClose]);

  // Fallback backdrop click handler for direct clicks
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Only handle click if it's directly on the backdrop (not bubbled from modal content)
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);

  // Prevent scroll on body when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => {
        // Only restore scroll if this is the last modal
        const hasOtherModals = document.querySelectorAll('[data-modal-backdrop]').length > 1;
        if (!hasOtherModals) {
          document.body.style.overflow = 'unset';
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isTopmost = isModalTopmost(id);
  const hasOverlay = hasOverlayModals(id);
  
  // Z-index hierarchy: Base modal 1050, Layer 2: 1060, Layer 3: 1070
  const getZIndex = () => {
    switch (level) {
      case 1: return 1050;  // Base modal
      case 2: return 1060;  // Second layer (training builders)
      case 3: return 1070;  // Third layer (component editors)
      default: return 1050 + (level * 10);  // Fallback for higher levels
    }
  };
  
  const zIndex = getZIndex();

  // Calculate modal sizing based on level and size prop
  // Consistent width across all levels but leave space for backdrop clicks
  const getModalSizing = () => {
    // Ensure there's always backdrop click space - use 88% instead of 92% 
    // This leaves 6% on each side (12% total) for backdrop clicking
    return {
      width: 'w-[88%]',  // Reduced from 92% to ensure backdrop click areas
      maxWidth: sizeClasses[size]  // Desktop: max 600px for lg size
    };
  };

  const modalSizing = getModalSizing();

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center transition-all duration-300 ${
        level === 1 
          ? `modal-base ${hasOverlay ? 'has-overlay' : ''}` 
          : level === 2 
            ? 'modal-layer-2' 
            : level === 3 
              ? 'modal-layer-3' 
              : 'modal-overlay'
      }`}
      style={{
        zIndex,
        paddingTop: 'var(--header-height, 64px)',
        paddingBottom: 'var(--footer-height, 84px)',
        paddingLeft: '24px',  // Increased from 16px to ensure backdrop click area
        paddingRight: '24px', // Increased from 16px to ensure backdrop click area
      }}
      onClick={handleBackdropClick}
      data-modal-backdrop
      data-modal-id={id}
      data-modal-level={level}
      tabIndex={-1}
    >
      {/* Backdrop overlay - removed redundant click handler */}
      <div 
        className={`absolute inset-0 transition-all duration-300 ${
          level === 1 
            ? (hasOverlay ? 'bg-black/30' : 'bg-black/50') 
            : 'bg-black/40'
        } ${
          hasOverlay ? 'backdrop-blur-sm' : 'backdrop-blur-none'
        }`}
      />

      {/* Modal container */}
      <div
        ref={modalRef}
        className={`relative bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${modalSizing.width} ${modalSizing.maxWidth} ${
          hasOverlay 
            ? 'transform scale-95 filter blur-[1px] opacity-70' 
            : 'transform scale-100 filter blur-0 opacity-100'
        } ${
          isTopmost 
            ? 'transform scale-100 filter blur-0 opacity-100' 
            : ''
        } my-4 ${className}`}
        style={{
          maxHeight: maxHeight || '85vh', // Mobile: max-height 85vh
          ...(!isTopmost && hasOverlay ? {
            transform: 'scale(0.95)',
            filter: 'blur(1px)',
            opacity: 0.7
          } : {})
        }}
        onClick={(e) => {
          e.stopPropagation(); // Prevent backdrop click when clicking modal content
        }}
      >
        {/* Header with title and close button */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            {title && (
              <h2 className="text-lg font-semibold text-gray-900 truncate">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={() => closeModal(id)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content area */}
        <div 
          className="overflow-y-auto"
          style={{
            maxHeight: title || showCloseButton 
              ? 'calc(85vh - 100px)'  // Account for modal header
              : '85vh'
          }}
        >
          {children}
        </div>

        {/* Visual indicator for stacked modals */}
        {level > 1 && (
          <div className="absolute top-2 right-2 flex items-center space-x-1">
            {Array.from({ length: level }, (_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i === level - 1 ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}