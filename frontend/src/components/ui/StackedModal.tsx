import React, { useEffect, useRef, useCallback, useState } from 'react';
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
  widthVariant?: 'default' | 'calendar-card';
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
  maxHeight,
  widthVariant = 'default'
}: StackedModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const scrollContentRef = useRef<HTMLDivElement>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStateRef = useRef({
    startY: 0,
    startX: 0,
    dragging: false,
    isDraggingVertically: false,
  });

  // Store onClose in a ref to avoid re-registering when it changes
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

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
        onClose: () => onCloseRef.current(),
        closeOnBackdropClick,
        closeOnEscape
      });
    } else {
      unregisterModal(id);
    }

    return () => unregisterModal(id);
  }, [isOpen, id, level, closeOnBackdropClick, closeOnEscape, registerModal, unregisterModal]);

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
        onCloseRef.current();
      }
    };

    document.addEventListener('mousedown', handleDocumentClick, true);
    return () => document.removeEventListener('mousedown', handleDocumentClick, true);
  }, [isOpen, closeOnBackdropClick, id]);

  // Fallback backdrop click handler for direct clicks
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    // Only handle click if it's directly on the backdrop (not bubbled from modal content)
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      e.preventDefault();
      e.stopPropagation();
      onCloseRef.current();
    }
  }, [closeOnBackdropClick]);

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

  // Disable inner scrolling while dragging the sheet
  useEffect(() => {
    const scrollElement = scrollContentRef.current;
    if (!scrollElement) {
      return;
    }

    if (!isOpen) {
      scrollElement.style.overflowY = '';
      return;
    }

    if (dragOffset > 0) {
      scrollElement.style.overflowY = 'hidden';
    } else {
      scrollElement.style.overflowY = '';
    }
  }, [dragOffset, isOpen]);

  // Reset drag state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setDragOffset(0);
      dragStateRef.current.dragging = false;
      dragStateRef.current.isDraggingVertically = false;
    }
  }, [isOpen]);

  // Touch handlers must be defined before the early return to avoid hook order issues
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (!scrollContentRef.current) {
      return;
    }

    const scrollable = scrollContentRef.current;
    const firstTouch = e.touches[0];

    // Record initial touch position
    dragStateRef.current.startY = firstTouch.clientY;
    dragStateRef.current.startX = firstTouch.clientX;

    // Only start drag when scrolled to the top
    if (scrollable.scrollTop <= 0) {
      dragStateRef.current.dragging = true;
      dragStateRef.current.isDraggingVertically = false; // Will be determined on move
    } else {
      dragStateRef.current.dragging = false;
      dragStateRef.current.isDraggingVertically = false;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragStateRef.current.dragging) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - dragStateRef.current.startY;
    const deltaX = currentX - dragStateRef.current.startX;

    // Determine drag direction on first significant movement
    if (!dragStateRef.current.isDraggingVertically && (Math.abs(deltaY) > 5 || Math.abs(deltaX) > 5)) {
      // If horizontal movement is greater than vertical, it's a horizontal swipe
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe detected - cancel dragging
        dragStateRef.current.dragging = false;
        dragStateRef.current.isDraggingVertically = false;
        setDragOffset(0);
        return;
      } else {
        // Vertical swipe confirmed
        dragStateRef.current.isDraggingVertically = true;
      }
    }

    // Only allow vertical dragging if it's been confirmed as vertical
    if (dragStateRef.current.isDraggingVertically) {
      if (deltaY > 0) {
        e.preventDefault();
        // Limit the drag distance to keep things tidy
        setDragOffset(Math.min(deltaY, 280));
      } else {
        setDragOffset(0);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!dragStateRef.current.dragging && !dragStateRef.current.isDraggingVertically) {
      setDragOffset(0);
      return;
    }

    // Only process close action if it was a vertical drag
    if (dragStateRef.current.isDraggingVertically) {
      const threshold = 120;
      if (dragOffset > threshold) {
        closeModal(id);
      } else {
        setDragOffset(0);
      }
    }

    // Reset drag state
    dragStateRef.current.dragging = false;
    dragStateRef.current.isDraggingVertically = false;
    setDragOffset(0);
  }, [closeModal, dragOffset, id]);

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
  const horizontalPadding = widthVariant === 'calendar-card' ? 16 : 24;

  const modalSizing = (() => {
    if (widthVariant === 'calendar-card') {
      return {
        widthClass: '',
        maxWidthClass: 'max-w-[512px]',
        widthStyle: {
          width: 'min(512px, calc(100vw - 32px))'
        }
      };
    }

    // Ensure there's always backdrop click space - use 88% instead of 92%
    // This leaves 6% on each side (12% total) for backdrop clicking
    return {
      widthClass: 'w-[88%]',
      maxWidthClass: sizeClasses[size],
      widthStyle: {}
    };
  })();

  const modalStyle: React.CSSProperties = {
    ...modalSizing.widthStyle,
    maxHeight: maxHeight || '85vh',
    filter: !isTopmost && hasOverlay ? 'blur(1px)' : undefined,
    opacity: !isTopmost && hasOverlay ? 0.7 : undefined,
  };

  const baseScale = !isTopmost && hasOverlay ? 0.95 : 1;
  const translateY = dragOffset > 0 ? dragOffset : 0;
  modalStyle.transform = `translateY(${translateY}px) scale(${baseScale})`;

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
        paddingLeft: `${horizontalPadding}px`,
        paddingRight: `${horizontalPadding}px`,
        touchAction: 'pan-y',
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
        className={`relative bg-white rounded-lg shadow-2xl overflow-hidden transition-all duration-300 ${modalSizing.widthClass} ${modalSizing.maxWidthClass} ${
          !isTopmost && hasOverlay ? 'filter blur-[1px] opacity-70' : 'filter blur-0 opacity-100'
        } my-4 ${className}`}
        style={{
          ...modalStyle,
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
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
          className="overflow-y-auto overflow-x-hidden"
          ref={scrollContentRef}
          style={{
            maxHeight: title || showCloseButton
              ? 'calc(85vh - 100px)'  // Account for modal header
              : '85vh',
            overscrollBehavior: 'contain',
            touchAction: 'pan-y',
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
