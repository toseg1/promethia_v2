import React, { useState } from 'react';
import { Users, User, ChevronDown } from 'lucide-react';

interface RoleSelectProps {
  value: string;
  onChange: (role: string) => void;
}

export function RoleSelect({ value, onChange }: RoleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const roles = [
    { value: 'athlete', label: 'Athlete', icon: User, description: 'I want to track my personal training' },
    { value: 'coach', label: 'Coach', icon: Users, description: 'I want to manage athletes and training programs' }
  ];

  const selectedRole = roles.find(role => role.value === value);

  const handleSelect = (roleValue: string) => {
    onChange(roleValue);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      {/* Selected Role Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="promethia-auth-input flex items-center justify-between w-full cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {selectedRole && (
            <>
              <selectedRole.icon className="promethia-input-icon" />
              <div className="text-left">
                <div style={{ 
                  color: 'white', 
                  fontFamily: 'var(--font-secondary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {selectedRole.label}
                </div>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.85)', 
                  fontFamily: 'var(--font-secondary)',
                  fontSize: '12px',
                  fontWeight: '400',
                  textTransform: 'none',
                  letterSpacing: '0px'
                }}>
                  {selectedRole.description}
                </div>
              </div>
            </>
          )}
        </div>
        <ChevronDown 
          className={`promethia-input-icon transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Options */}
      {isOpen && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 z-50"
          style={{
            background: 'rgba(255, 255, 255, 0.25)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.35)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
          }}
        >
          {roles.map((role) => (
            <button
              key={role.value}
              type="button"
              onClick={() => handleSelect(role.value)}
              className={`w-full p-4 flex items-center gap-3 transition-all duration-200 border-none cursor-pointer ${
                value === role.value 
                  ? 'bg-white/20' 
                  : 'bg-transparent hover:bg-white/10'
              }`}
            >
              <role.icon className="promethia-input-icon" />
              <div className="text-left">
                <div style={{ 
                  color: 'white', 
                  fontFamily: 'var(--font-secondary)',
                  fontSize: '14px',
                  fontWeight: '500',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {role.label}
                </div>
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.85)', 
                  fontFamily: 'var(--font-secondary)',
                  fontSize: '12px',
                  fontWeight: '400',
                  textTransform: 'none',
                  letterSpacing: '0px'
                }}>
                  {role.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}