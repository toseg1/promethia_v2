import React, { useState } from 'react';
import { User, Lock, Mail, UserCheck, AlertCircle } from 'lucide-react';

interface AuthInputProps {
  type: 'text' | 'email' | 'password';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  icon?: 'user' | 'lock' | 'mail' | 'userCheck';
  required?: boolean;
  autoComplete?: string;
}

const iconMap = {
  user: User,
  lock: Lock,
  mail: Mail,
  userCheck: UserCheck,
};

export function AuthInput({ 
  type, 
  placeholder, 
  value, 
  onChange, 
  error, 
  icon = 'user',
  required = false,
  autoComplete 
}: AuthInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const IconComponent = iconMap[icon];

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`auth-input w-full pl-12 pr-4 py-3 rounded-xl border transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-0 ${
            error 
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' 
              : 'border-gray-200 focus:border-primary/50 focus:ring-primary/20'
          } ${isFocused ? 'shadow-lg transform scale-[1.01]' : ''}`}
          required={required}
          autoComplete={autoComplete}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{ 
            fontFamily: 'var(--font-secondary)',
            fontSize: '14px'
          }}
        />
        <div className={`absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-300 ${
          isFocused 
            ? 'text-primary' 
            : error 
              ? 'text-red-400' 
              : 'text-gray-400'
        }`}>
          <IconComponent size={18} />
        </div>
      </div>
      {error && (
        <div className="flex items-center space-x-2 text-red-500 text-sm pl-1">
          <AlertCircle size={14} />
          <span style={{ fontFamily: 'var(--font-secondary)' }}>{error}</span>
        </div>
      )}
    </div>
  );
}