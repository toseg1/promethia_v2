import React, { useState } from 'react';
import { Copy, Check, User } from 'lucide-react';
import { Button } from '../ui/button';
import { StackedModal } from '../ui/StackedModal';
import { toast } from 'sonner@2.0.3';

interface MigratedAddAthleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  coachName: string;
}

/**
 * Example of how to migrate an existing modal to use the new StackedModal system.
 * 
 * MIGRATION STEPS:
 * 1. Replace custom modal wrapper with <StackedModal>
 * 2. Move title from content to title prop
 * 3. Remove manual backdrop handling
 * 4. Remove manual z-index and positioning
 * 5. Simplify content area (no need for custom containers)
 */
export function MigratedAddAthleteModal({ 
  isOpen, 
  onClose, 
  coachName 
}: MigratedAddAthleteModalProps) {
  const [isCopied, setIsCopied] = useState(false);

  // Generate unique code (in real app, this would come from backend)
  const uniqueCode = `COACH-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(uniqueCode);
      setIsCopied(true);
      toast.success('Code copied to clipboard!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleClose = () => {
    setIsCopied(false);
    onClose();
  };

  return (
    <StackedModal
      id="add-athlete-modal"
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Athlete"
      size="sm"
      level={1}
      closeOnBackdropClick={true}
      closeOnEscape={true}
    >
      {/* Content - No need for custom backdrop or positioning */}
      <div className="p-6 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <User size={32} className="text-blue-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Share Your Coach Code
          </h3>
          
          <p className="text-gray-600 mb-6">
            Send your unique code to your future athlete to link their calendar with yours.
          </p>
        </div>

        {/* Unique Code Display */}
        <div className="mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600 mb-1">Your Coach Code</p>
            <p className="text-2xl font-bold text-gray-900 font-mono tracking-wider">
              {uniqueCode}
            </p>
          </div>
          
          <Button 
            onClick={handleCopyCode} 
            className="w-full"
            disabled={isCopied}
          >
            {isCopied ? (
              <>
                <Check size={18} className="mr-2" />
                Code Copied!
              </>
            ) : (
              <>
                <Copy size={18} className="mr-2" />
                Copy Code
              </>
            )}
          </Button>
        </div>

        {/* Instructions */}
        <div className="text-left bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
          <ol className="text-sm text-blue-800 space-y-1">
            <li>1. Copy the code above</li>
            <li>2. Share it with your athlete via WhatsApp, email, or text</li>
            <li>3. Your athlete enters this code in their app</li>
            <li>4. You'll receive a notification to confirm the connection</li>
          </ol>
        </div>
      </div>
    </StackedModal>
  );
}

/* 
COMPARISON - OLD vs NEW:

OLD PATTERN:
- Manual backdrop div with onClick handler
- Custom z-index management (z-50)
- Manual padding calculations
- Custom modal container styling
- Manual header with close button
- More complex event handling

NEW PATTERN:
- Single <StackedModal> component
- Automatic z-index management based on level
- Built-in backdrop handling
- Consistent sizing rules
- Built-in header/title/close button
- Simplified props interface
- Automatic accessibility features
- Stack-aware behavior
*/