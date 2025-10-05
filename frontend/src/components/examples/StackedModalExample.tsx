import React from 'react';
import { StackedModal } from '../ui/StackedModal';
import { useStackedModal, useOverlayModal } from '../../hooks/useStackedModal';
import { Button } from '../ui/button';
import { Settings, Edit, Trash2, Info } from 'lucide-react';

export function StackedModalExample() {
  // Base modal (level 1)
  const baseModal = useStackedModal('base-modal', {
    onOpen: () => console.log('Base modal opened'),
    onClose: () => console.log('Base modal closed'),
  });

  // Overlay modal (level 2)
  const confirmModal = useOverlayModal('confirm-modal', {
    onOpen: () => console.log('Confirmation modal opened'),
    onClose: () => console.log('Confirmation modal closed'),
  });

  // Third level modal
  const detailModal = useStackedModal('detail-modal', {
    level: 3,
    onOpen: () => console.log('Detail modal opened'),
    onClose: () => console.log('Detail modal closed'),
  });

  const handleDeleteAction = () => {
    // Close confirmation modal and show result
    confirmModal.closeModal();
    alert('Item deleted successfully!');
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Stacked Modal System Demo</h2>
      
      <div className="space-y-4">
        <Button onClick={baseModal.openModal}>
          <Settings className="w-4 h-4 mr-2" />
          Open Settings Modal
        </Button>
        
        <div className="text-sm text-gray-600">
          <p>Click the button above to see the stacked modal system in action.</p>
          <p>The system supports nested modals with proper sizing hierarchy and visual effects.</p>
        </div>
      </div>

      {/* Base Modal (Level 1) */}
      <StackedModal
        id="base-modal"
        isOpen={baseModal.isOpen}
        onClose={baseModal.closeModal}
        title="Application Settings"
        size="lg"
        level={1}
      >
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold mb-3">User Preferences</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Theme</span>
                <select className="px-3 py-2 border rounded-md">
                  <option>Light</option>
                  <option>Dark</option>
                  <option>Auto</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span>Language</span>
                <select className="px-3 py-2 border rounded-md">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-3">Account Actions</h3>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={detailModal.openModal}
                className="flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={confirmModal.openModal}
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-gray-600">
              Try opening the confirmation modal to see the stacking effect. 
              The base modal will be dimmed and slightly scaled down.
            </p>
          </div>
        </div>
      </StackedModal>

      {/* Confirmation Modal (Level 2) */}
      <StackedModal
        id="confirm-modal"
        isOpen={confirmModal.isOpen}
        onClose={confirmModal.closeModal}
        title="Confirm Deletion"
        size="sm"
        level={2}
      >
        <div className="p-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Account
              </h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete your account? This action cannot be undone 
                and will permanently remove all your data.
              </p>
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={confirmModal.closeModal}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteAction}
                  className="flex-1"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </div>
      </StackedModal>

      {/* Detail Modal (Level 3) */}
      <StackedModal
        id="detail-modal"
        isOpen={detailModal.isOpen}
        onClose={detailModal.closeModal}
        title="Edit Profile"
        size="md"
        level={3}
      >
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Third-level modal</p>
              <p>Notice how all previous modals are now dimmed and scaled down to create a clear hierarchy.</p>
            </div>
          </div>

          <form className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                defaultValue="John Doe"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                defaultValue="john@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                defaultValue="Tell us about yourself..."
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                type="button"
                variant="outline" 
                onClick={detailModal.closeModal}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="button"
                onClick={() => {
                  detailModal.closeModal();
                  alert('Profile updated!');
                }}
                className="flex-1"
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </StackedModal>
    </div>
  );
}