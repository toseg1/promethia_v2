import React, { useState, useRef, useEffect } from 'react';
import { Phone, ChevronDown, Search, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

interface PhoneInputProps {
  value: string;
  countryCode: string;
  onChange: (phone: string, countryCode: string) => void;
  placeholder?: string;
  error?: string;
  variant?: 'auth' | 'profile';
}

const countries: Country[] = [
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
  { code: 'VE', name: 'Venezuela', dialCode: '+58', flag: '🇻🇪' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { code: 'TN', name: 'Tunisia', dialCode: '+216', flag: '🇹🇳' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { code: 'NZ', name: 'New Zealand', dialCode: '+64', flag: '🇳🇿' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'PL', name: 'Poland', dialCode: '+48', flag: '🇵🇱' },
  { code: 'CZ', name: 'Czech Republic', dialCode: '+420', flag: '🇨🇿' },
  { code: 'HU', name: 'Hungary', dialCode: '+36', flag: '🇭🇺' },
  { code: 'RO', name: 'Romania', dialCode: '+40', flag: '🇷🇴' },
  { code: 'BG', name: 'Bulgaria', dialCode: '+359', flag: '🇧🇬' },
  { code: 'HR', name: 'Croatia', dialCode: '+385', flag: '🇭🇷' },
  { code: 'SI', name: 'Slovenia', dialCode: '+386', flag: '🇸🇮' },
  { code: 'SK', name: 'Slovakia', dialCode: '+421', flag: '🇸🇰' },
  { code: 'LT', name: 'Lithuania', dialCode: '+370', flag: '🇱🇹' },
  { code: 'LV', name: 'Latvia', dialCode: '+371', flag: '🇱🇻' },
  { code: 'EE', name: 'Estonia', dialCode: '+372', flag: '🇪🇪' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
  { code: 'PT', name: 'Portugal', dialCode: '+351', flag: '🇵🇹' },
  { code: 'GR', name: 'Greece', dialCode: '+30', flag: '🇬🇷' },
  { code: 'CY', name: 'Cyprus', dialCode: '+357', flag: '🇨🇾' },
  { code: 'MT', name: 'Malta', dialCode: '+356', flag: '🇲🇹' },
  { code: 'IS', name: 'Iceland', dialCode: '+354', flag: '🇮🇸' },
  { code: 'LU', name: 'Luxembourg', dialCode: '+352', flag: '🇱🇺' }
];

export function PhoneInput({
  value,
  countryCode,
  onChange,
  placeholder = "Phone number",
  error,
  variant = 'auth'
}: PhoneInputProps) {
  const { t } = useTranslation('auth');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isButtonFocused, setIsButtonFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCountry = countries.find(c => c.code === countryCode) || countries[0];

  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCountrySelect = (country: Country) => {
    onChange(value, country.code);
    setIsDropdownOpen(false);
    setSearchTerm('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Remove all non-digit characters except spaces and common separators
    const cleanedValue = inputValue.replace(/[^\d\s\-\(\)\.]/g, '');
    onChange(cleanedValue, countryCode);
  };

  const formatDisplayValue = (phoneValue: string): string => {
    if (!phoneValue) return '';
    
    // Basic formatting - can be enhanced based on country-specific patterns
    const digitsOnly = phoneValue.replace(/\D/g, '');
    
    // Format based on common patterns
    if (digitsOnly.length <= 3) {
      return digitsOnly;
    } else if (digitsOnly.length <= 6) {
      return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3)}`;
    } else if (digitsOnly.length <= 10) {
      return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6)}`;
    } else {
      return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3, 6)} ${digitsOnly.slice(6, 10)} ${digitsOnly.slice(10)}`;
    }
  };

  if (variant === 'profile') {
    return (
      <div className="relative">
        <div className="flex">
          {/* Country Selector - Profile Style */}
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            onFocus={() => setIsButtonFocused(true)}
            onBlur={() => setIsButtonFocused(false)}
            className={`flex items-center justify-center gap-2 px-3 py-2 border border-border/20 border-r-0 rounded-l-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 min-w-[90px] ${
              error ? 'border-red-300' : 'border-border/20'
            }`}
            style={{ 
              fontFamily: 'var(--font-secondary)',
              fontSize: '14px',
              background: 'white',
              color: 'hsl(var(--foreground))'
            }}
          >
            <span className="text-base">{selectedCountry.flag}</span>
            <span className="text-xs font-medium text-muted-foreground tracking-wider">
              {selectedCountry.dialCode}
            </span>
            <ChevronDown 
              size={14} 
              className={`text-muted-foreground transition-transform duration-300 ${
                isDropdownOpen ? 'rotate-180' : 'rotate-0'
              }`} 
            />
          </button>

          {/* Phone Input - Profile Style */}
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="tel"
              placeholder={placeholder}
              value={formatDisplayValue(value)}
              onChange={handlePhoneChange}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              className={`w-full px-3 py-2 pr-10 border border-border/20 border-l-0 rounded-r-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-300 ${
                error ? 'border-red-300' : 'border-border/20'
              }`}
              style={{ 
                fontFamily: 'var(--font-secondary)',
                fontSize: '14px',
                background: 'white',
                color: 'hsl(var(--foreground))'
              }}
            />
            
            {/* Phone Icon - Profile Style */}
            <Phone 
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" 
            />
          </div>
        </div>

        {/* Country Dropdown - Profile Style */}
        {isDropdownOpen && (
          <div
            ref={dropdownRef}
            className="absolute top-full left-0 right-0 z-50 mt-2 bg-white border border-border/20 rounded-lg shadow-lg overflow-hidden max-h-80"
          >
            {/* Search */}
            <div className="p-3 border-b border-border/20">
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('phoneInput.searchCountries')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 pr-8 py-2 bg-white border border-border/20 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <Search 
                  size={14} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </div>

            {/* Countries List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full p-3 text-left cursor-pointer transition-colors duration-200 flex items-center gap-3 hover:bg-gray-50
                    ${country.code === selectedCountry.code ? 'bg-primary/5' : ''}
                  `}
                >
                  <span className="text-base min-w-[24px]">{country.flag}</span>
                  <span className="flex-1 text-sm text-foreground">{country.name}</span>
                  <span className="text-xs text-muted-foreground font-medium tracking-wider">
                    {country.dialCode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Auth variant - matching email input exactly
  return (
    <div className="input-field">
      <div className="flex">
        {/* Country Selector */}
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className={`flex items-center gap-2 px-3 border-0 border-r border-white/20 focus:outline-none ${error ? 'error' : ''}`}
          style={{ 
            background: error ? 'rgba(255, 87, 34, 0.1)' : 'var(--glass-bg-strong)',
            backdropFilter: 'var(--backdrop-blur)',
            WebkitBackdropFilter: 'var(--backdrop-blur)',
            border: error ? '1px solid #ff5722' : '1px solid var(--glass-border)',
            borderRight: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: 'var(--md-sys-shape-corner-medium)',
            borderTopRightRadius: '0',
            borderBottomRightRadius: '0',
            color: 'white',
            height: '48px',
            transition: 'all var(--md-sys-motion-duration-medium1) var(--md-sys-motion-easing-standard)'
          }}
          onMouseEnter={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.6)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = 'var(--glass-border)';
              e.currentTarget.style.background = 'var(--glass-bg-strong)';
            }
          }}
        >
          <span>{selectedCountry.flag}</span>
          <span className="text-xs font-medium">{selectedCountry.dialCode}</span>
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-300 ${
              isDropdownOpen ? 'rotate-180' : 'rotate-0'
            }`} 
          />
        </button>

        {/* Phone Input - using standard input styling with extended width */}
        <div className="relative" style={{ width: 'calc(100% + 20px)' }}>
          <input
            ref={inputRef}
            type="tel"
            placeholder={placeholder}
            value={formatDisplayValue(value)}
            onChange={handlePhoneChange}
            className={error ? 'error' : ''}
            style={{ 
              height: '48px',
              borderTopLeftRadius: '0',
              borderBottomLeftRadius: '0',
              borderLeft: '0',
              paddingLeft: 'var(--md-sys-spacing-4)',
              paddingRight: 'var(--md-sys-spacing-12)',
              width: '100%'
            }}
          />
          <Phone className="input-icon" size={20} />
        </div>
      </div>

      {/* Country Dropdown - Auth Style */}
      {isDropdownOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 z-50 mt-2 overflow-hidden max-h-80"
          style={{
            background: 'rgba(255, 255, 255, 0.8)', // More opaque
            backdropFilter: 'var(--backdrop-blur)',
            WebkitBackdropFilter: 'var(--backdrop-blur)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--md-sys-shape-corner-medium)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)', // Stronger shadow
            maxHeight: window.innerHeight < 600 ? '200px' : '320px' // Responsive height
          }}
        >
            {/* Search */}
            <div className="p-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t('phoneInput.searchCountries')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 pr-8 py-2 text-sm outline-none rounded-lg"
                  style={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#333'
                  }}
                />
                <Search 
                  size={14} 
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
                />
              </div>
            </div>

            {/* Countries List */}
            <div className="max-h-60 overflow-y-auto">
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className={`w-full p-3 text-left cursor-pointer transition-colors duration-200 flex items-center gap-3 hover:bg-white/20 border-none
                    ${country.code === selectedCountry.code ? 'bg-white/30' : 'bg-transparent'}
                  `}
                  style={{ color: '#333' }}
                >
                  <span className="text-base min-w-[24px]">{country.flag}</span>
                  <span className="flex-1 text-sm">{country.name}</span>
                  <span className="text-xs text-gray-600 font-medium tracking-wider">
                    {country.dialCode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Error Message - matching renderFieldError style */}
      {error && (
        <div className="input-error">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
}