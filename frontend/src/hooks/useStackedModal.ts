import { useState, useCallback, useEffect } from 'react';
import { useModalStack } from '../contexts/ModalStackContext';

interface UseStackedModalOptions {
  level?: number;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
}

export function useStackedModal(id: string, options: UseStackedModalOptions = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    registerModal, 
    unregisterModal, 
    isModalTopmost, 
    hasOverlayModals 
  } = useModalStack();

  const {
    level = 1,
    closeOnBackdropClick = true,
    closeOnEscape = true,
    onOpen,
    onClose
  } = options;

  const openModal = useCallback(() => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    onClose?.();
  }, [onClose]);

  const toggleModal = useCallback(() => {
    if (isOpen) {
      closeModal();
    } else {
      openModal();
    }
  }, [isOpen, openModal, closeModal]);

  // Register with stack when open
  useEffect(() => {
    if (isOpen) {
      registerModal({
        id,
        level,
        onClose: closeModal,
        closeOnBackdropClick,
        closeOnEscape
      });
    } else {
      unregisterModal(id);
    }

    return () => unregisterModal(id);
  }, [isOpen, id, level, closeModal, closeOnBackdropClick, closeOnEscape, registerModal, unregisterModal]);

  return {
    isOpen,
    openModal,
    closeModal,
    toggleModal,
    isTopmost: isModalTopmost(id),
    hasOverlay: hasOverlayModals(id),
    level
  };
}

// Convenience hook for second-level modals
export function useOverlayModal(id: string, options: Omit<UseStackedModalOptions, 'level'> = {}) {
  return useStackedModal(id, { ...options, level: 2 });
}

// Hook for managing modal sequences (e.g., multi-step flows)
export function useModalSequence(modalIds: string[], startLevel = 1) {
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isSequenceActive, setIsSequenceActive] = useState(false);

  const startSequence = useCallback(() => {
    setCurrentIndex(0);
    setIsSequenceActive(true);
  }, []);

  const nextModal = useCallback(() => {
    if (currentIndex < modalIds.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, modalIds.length]);

  const prevModal = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const closeSequence = useCallback(() => {
    setCurrentIndex(-1);
    setIsSequenceActive(false);
  }, []);

  const goToModal = useCallback((index: number) => {
    if (index >= 0 && index < modalIds.length) {
      setCurrentIndex(index);
    }
  }, [modalIds.length]);

  return {
    currentModalId: currentIndex >= 0 ? modalIds[currentIndex] : null,
    currentIndex,
    isSequenceActive,
    isFirstModal: currentIndex === 0,
    isLastModal: currentIndex === modalIds.length - 1,
    startSequence,
    nextModal,
    prevModal,
    closeSequence,
    goToModal,
    totalModals: modalIds.length
  };
}