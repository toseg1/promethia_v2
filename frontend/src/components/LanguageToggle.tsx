import React from 'react';
import { Languages } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageToggleProps {
  variant?: 'default' | 'mobile';
}

export function LanguageToggle({ variant = 'default' }: LanguageToggleProps) {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();

  const currentLangData = availableLanguages.find(lang => lang.code === currentLanguage);

  if (variant === 'mobile') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <Languages size={18} />
            <span>{currentLangData?.nativeName}</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          {availableLanguages.map(lang => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`cursor-pointer ${currentLanguage === lang.code ? 'bg-primary/10 text-primary' : ''}`}
            >
              <span className="flex items-center justify-between w-full">
                <span>{lang.nativeName}</span>
                {currentLanguage === lang.code && (
                  <span className="text-xs">✓</span>
                )}
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground bg-muted/50 rounded-md hover:bg-muted transition-colors">
          <Languages size={16} />
          <span className="uppercase">{currentLanguage}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {availableLanguages.map(lang => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => changeLanguage(lang.code)}
            className={`cursor-pointer ${currentLanguage === lang.code ? 'bg-primary/10 text-primary' : ''}`}
          >
            <span className="flex items-center justify-between w-full">
              <span>{lang.nativeName}</span>
              {currentLanguage === lang.code && (
                <span className="text-xs">✓</span>
              )}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
