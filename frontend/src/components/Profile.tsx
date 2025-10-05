import React from 'react';
import { ProfileContainer } from './profile/ProfileContainer';
import { User as UserType } from './profile/types';

interface ProfileProps {
  user: UserType;
  currentRole: string;
  onLogout?: () => void;
}

export function Profile({ user, currentRole, onLogout }: ProfileProps) {
  return (
    <ProfileContainer 
      user={user} 
      currentRole={currentRole} 
      onLogout={onLogout} 
    />
  );
}