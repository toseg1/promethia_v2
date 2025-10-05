import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface ModalConfig {
  id: string;
  level: number;
  onClose?: () => void;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

interface ModalStackContextType {
  modals: ModalConfig[];
  registerModal: (config: ModalConfig) => void;
  unregisterModal: (id: string) => void;
  closeModal: (id: string) => void;
  closeTopModal: () => void;
  getModalLevel: (id: string) => number;
  isModalTopmost: (id: string) => boolean;
  hasOverlayModals: (id: string) => boolean;
}

const ModalStackContext = createContext<ModalStackContextType | null>(null);

export function ModalStackProvider({ children }: { children: React.ReactNode }) {
  const [modals, setModals] = useState<ModalConfig[]>([]);

  const registerModal = useCallback((config: ModalConfig) => {
    setModals(prev => {
      // Remove if already exists, then add with updated config
      const filtered = prev.filter(modal => modal.id !== config.id);
      return [...filtered, config].sort((a, b) => a.level - b.level);
    });
  }, []);

  const unregisterModal = useCallback((id: string) => {
    setModals(prev => prev.filter(modal => modal.id !== id));
  }, []);

  const closeModal = useCallback((id: string) => {
    setModals((currentModals: ModalConfig[]) => {
      const modal = currentModals.find((m: ModalConfig) => m.id === id);
      if (modal?.onClose) {
        modal.onClose();
      }
      return currentModals.filter((modal: ModalConfig) => modal.id !== id);
    });
  }, []);

  const closeTopModal = useCallback(() => {
    setModals((currentModals: ModalConfig[]) => {
      const topModal = currentModals[currentModals.length - 1];
      if (topModal) {
        if (topModal.onClose) {
          topModal.onClose();
        }
        return currentModals.filter((modal: ModalConfig) => modal.id !== topModal.id);
      }
      return currentModals;
    });
  }, []);

  const getModalLevel = useCallback((id: string) => {
    const modal = modals.find(m => m.id === id);
    return modal?.level ?? 0;
  }, [modals]);

  const isModalTopmost = useCallback((id: string) => {
    const topModal = modals[modals.length - 1];
    return topModal?.id === id;
  }, [modals]);

  const hasOverlayModals = useCallback((id: string) => {
    const modalLevel = getModalLevel(id);
    return modals.some(modal => modal.level > modalLevel);
  }, [modals, getModalLevel]);

  // Handle ESC key for top-most modal
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const topModal = modals[modals.length - 1];
        if (topModal && topModal.closeOnEscape !== false) {
          event.preventDefault();
          closeModal(topModal.id);
        }
      }
    };

    if (modals.length > 0) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [modals, closeModal]);

  // Focus management
  useEffect(() => {
    const topModal = modals[modals.length - 1];
    if (topModal) {
      // Focus the top-most modal
      const modalElement = document.querySelector(`[data-modal-id="${topModal.id}"]`) as HTMLElement;
      if (modalElement) {
        // Find first focusable element or focus the modal itself
        const focusableElement = modalElement.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement;
        
        setTimeout(() => {
          if (focusableElement) {
            focusableElement.focus();
          } else {
            modalElement.focus();
          }
        }, 100);
      }
    }
  }, [modals]);

  const value: ModalStackContextType = {
    modals,
    registerModal,
    unregisterModal,
    closeModal,
    closeTopModal,
    getModalLevel,
    isModalTopmost,
    hasOverlayModals,
  };

  return (
    <ModalStackContext.Provider value={value}>
      {children}
    </ModalStackContext.Provider>
  );
}

export function useModalStack() {
  const context = useContext(ModalStackContext);
  if (!context) {
    throw new Error('useModalStack must be used within a ModalStackProvider');
  }
  return context;
}