/**
 * Utility functions for phone number handling
 */

// Country codes mapping (same as in authService)
const countryDialCodes: Record<string, string> = {
  'FR': '+33', 'US': '+1', 'GB': '+44', 'DE': '+49', 'ES': '+34',
  'IT': '+39', 'CA': '+1', 'AU': '+61', 'JP': '+81', 'KR': '+82',
  'CN': '+86', 'IN': '+91', 'BR': '+55', 'MX': '+52', 'AR': '+54',
  'CL': '+56', 'CO': '+57', 'PE': '+51', 'VE': '+58', 'ZA': '+27',
  'EG': '+20', 'NG': '+234', 'KE': '+254', 'MA': '+212', 'TN': '+216',
  'RU': '+7', 'TR': '+90', 'SA': '+966', 'AE': '+971', 'IL': '+972'
};

// Reverse mapping for dial code to country code
const dialCodeToCountry: Record<string, string> = Object.entries(countryDialCodes)
  .reduce((acc, [country, dialCode]) => {
    acc[dialCode] = country;
    return acc;
  }, {} as Record<string, string>);

/**
 * Parse a full phone number from backend (e.g., "+33757593955") 
 * into country code and phone number for frontend display
 */
export function parsePhoneNumber(fullPhoneNumber: string): {
  countryCode: string;
  phoneNumber: string;
} {
  if (!fullPhoneNumber) {
    return { countryCode: 'FR', phoneNumber: '' };
  }

  // Remove any formatting characters
  const cleanNumber = fullPhoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Try to match dial codes from longest to shortest to avoid false matches
  const sortedDialCodes = Object.keys(dialCodeToCountry)
    .sort((a, b) => b.length - a.length);

  for (const dialCode of sortedDialCodes) {
    if (cleanNumber.startsWith(dialCode)) {
      const phoneNumber = cleanNumber.slice(dialCode.length);
      const countryCode = dialCodeToCountry[dialCode];
      
      return {
        countryCode: countryCode || 'FR',
        phoneNumber: phoneNumber
      };
    }
  }

  // If no dial code found, assume it's a local number
  return {
    countryCode: 'FR', // Default country
    phoneNumber: cleanNumber
  };
}

/**
 * Combine country code and phone number into full format for backend
 */
export function formatPhoneForBackend(countryCode: string, phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  const dialCode = countryDialCodes[countryCode] || '+33';
  const cleanPhoneNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  return `${dialCode}${cleanPhoneNumber}`;
}

/**
 * Format phone number for display (with spaces for readability)
 */
export function formatPhoneForDisplay(phoneNumber: string): string {
  if (!phoneNumber) return '';
  
  // Remove any existing formatting
  const cleanNumber = phoneNumber.replace(/[\s\-\(\)]/g, '');
  
  // Add spaces for French phone numbers (2 digits groups)
  if (cleanNumber.length >= 8) {
    return cleanNumber.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }
  
  return cleanNumber;
}