import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface LanguageSwitcherProps {
  variant?: 'default' | 'compact';
  className?: string;
}

export function LanguageSwitcher({ variant = 'default', className = '' }: LanguageSwitcherProps) {
  const { currentLanguage, changeLanguage, availableLanguages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLanguageChange = (langCode: 'en' | 'fr') => {
    changeLanguage(langCode);
    setIsOpen(false);
  };

  const currentLang = availableLanguages.find(lang => lang.code === currentLanguage);

  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-sm"
          aria-label="Change language"
        >
          <Globe size={18} className="text-muted-foreground" />
          <span className="font-medium text-foreground">{currentLang?.code.toUpperCase()}</span>
          <ChevronDown size={14} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white border border-border/20 rounded-lg shadow-lg py-1 min-w-[140px] z-50">
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-muted/50 transition-colors flex items-center justify-between ${
                  currentLanguage === lang.code ? 'bg-primary/10' : ''
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className="font-medium">{lang.nativeName}</span>
                </span>
                {currentLanguage === lang.code && (
                  <Check size={16} className="text-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-border/20 hover:bg-muted/50 transition-colors"
        aria-label="Change language"
      >
        <Globe size={20} className="text-primary" />
        <div className="flex flex-col items-start">
          <span className="text-xs text-muted-foreground">Language</span>
          <span className="text-sm font-medium text-foreground">{currentLang?.nativeName}</span>
        </div>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-border/20 rounded-lg shadow-lg py-2 z-50">
          {availableLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center justify-between ${
                currentLanguage === lang.code ? 'bg-primary/10' : ''
              }`}
            >
              <div className="flex flex-col">
                <span className="font-medium text-foreground">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              </div>
              {currentLanguage === lang.code && (
                <Check size={18} className="text-primary" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
