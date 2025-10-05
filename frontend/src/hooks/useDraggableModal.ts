import { useState, useRef, useEffect, useCallback } from 'react';

interface Position {
  x: number;
  y: number;
}

interface DragState {
  isDragging: boolean;
  startPosition: Position;
  startMousePosition: Position;
}

export function useDraggableModal() {
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 });
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    startPosition: { x: 0, y: 0 },
    startMousePosition: { x: 0, y: 0 }
  });
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset position when modal opens/closes
  const resetPosition = useCallback(() => {
    setPosition({ x: 0, y: 0 });
  }, []);

  // Handle mouse down (start drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the drag handle area (header)
    if (!modalRef.current) return;
    
    const rect = modalRef.current.getBoundingClientRect();
    setDragState({
      isDragging: true,
      startPosition: position,
      startMousePosition: { x: e.clientX, y: e.clientY }
    });
  };

  // Handle touch start (mobile drag)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!modalRef.current) return;
    
    const touch = e.touches[0];
    const rect = modalRef.current.getBoundingClientRect();
    setDragState({
      isDragging: true,
      startPosition: position,
      startMousePosition: { x: touch.clientX, y: touch.clientY }
    });
  };

  // Handle mouse/touch move
  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      if (!dragState.isDragging) return;

      const deltaX = clientX - dragState.startMousePosition.x;
      const deltaY = clientY - dragState.startMousePosition.y;

      // Calculate new position
      let newX = dragState.startPosition.x + deltaX;
      let newY = dragState.startPosition.y + deltaY;

      // Get viewport bounds with padding
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const padding = window.innerWidth < 640 ? 8 : 16; // 8px mobile, 16px desktop (matching p-2 sm:p-4)
      
      if (modalRef.current) {
        const rect = modalRef.current.getBoundingClientRect();
        const modalWidth = rect.width;
        const modalHeight = rect.height;

        // Constrain to viewport bounds with padding
        const maxX = (viewportWidth - modalWidth) / 2 - padding;
        const maxY = (viewportHeight - modalHeight) / 2 - padding;
        const minX = -maxX;
        const minY = -maxY;

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));
      }

      setPosition({ x: newX, y: newY });
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault(); // Prevent scrolling while dragging
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleEnd = () => {
      setDragState(prev => ({ ...prev, isDragging: false }));
    };

    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [dragState.isDragging, dragState.startPosition, dragState.startMousePosition]);

  // Get transform style
  const getTransform = () => ({
    transform: `translate(${position.x}px, ${position.y}px)`,
    transition: dragState.isDragging ? 'none' : 'transform 0.2s ease-out'
  });

  // Get drag handle props
  const getDragHandleProps = () => ({
    onMouseDown: handleMouseDown,
    onTouchStart: handleTouchStart,
    style: {
      cursor: dragState.isDragging ? 'grabbing' : 'grab',
      touchAction: 'none'
    }
  });

  return {
    modalRef,
    position,
    isDragging: dragState.isDragging,
    resetPosition,
    getTransform,
    getDragHandleProps
  };
}