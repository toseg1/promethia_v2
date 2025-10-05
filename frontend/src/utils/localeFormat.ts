import i18n from '../i18n';

/**
 * Get current locale from i18n
 */
export function getCurrentLocale(): string {
  return i18n.language || 'en';
}

function resolveLocaleTag(): string {
  const locale = getCurrentLocale();
  return locale === 'fr' ? 'fr-FR' : 'en-US';
}

/**
 * Format a number according to the current locale
 * French uses comma for decimal separator (3,5)
 * English uses period for decimal separator (3.5)
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions
): string {
  const locale = resolveLocaleTag();
  return new Intl.NumberFormat(locale, options).format(value);
}

/**
 * Format a decimal number (e.g., for metrics like MAS: 15.5 km/h)
 */
export function formatDecimal(value: number, decimals: number = 1): string {
  return formatNumber(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format a date according to the current locale
 * French: DD/MM/YYYY
 * English: MM/DD/YYYY
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'full' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = resolveLocaleTag();

  const options: Intl.DateTimeFormatOptions =
    format === 'short' ? { day: '2-digit', month: '2-digit', year: 'numeric' } :
    format === 'long' ? { day: 'numeric', month: 'long', year: 'numeric' } :
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };

  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format a date and time according to the current locale
 */
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = resolveLocaleTag();

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

/**
 * Format a time duration in minutes to a readable format
 * @param minutes - Duration in minutes
 * @returns Formatted string like "1h 30min" or "45min"
 */
export function formatDuration(minutes: number): string {
  const locale = getCurrentLocale();
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours > 0 && mins > 0) {
    return locale === 'fr' ? `${hours}h ${mins}min` : `${hours}h ${mins}min`;
  } else if (hours > 0) {
    return locale === 'fr' ? `${hours}h` : `${hours}h`;
  } else {
    return locale === 'fr' ? `${mins}min` : `${mins}min`;
  }
}

/**
 * Get month names for the current locale
 */
export function getMonthNames(): string[] {
  const locale = resolveLocaleTag();
  const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });

  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2024, i, 1);
    return formatter.format(date);
  });
}

/**
 * Get short month names for the current locale
 */
export function getShortMonthNames(): string[] {
  const locale = resolveLocaleTag();
  const formatter = new Intl.DateTimeFormat(locale, { month: 'short' });

  return Array.from({ length: 12 }, (_, i) => {
    const date = new Date(2024, i, 1);
    return formatter.format(date);
  });
}

/**
 * Get weekday names for the current locale
 */
export function getWeekdayNames(format: 'long' | 'short' = 'long'): string[] {
  const locale = resolveLocaleTag();
  const formatter = new Intl.DateTimeFormat(locale, { weekday: format });

  // Start from Sunday (day 0)
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(2024, 0, i); // January 2024 starts on Monday, so day 0 is Sunday Dec 31, 2023
    return formatter.format(new Date(2024, 0, 7 + i)); // Start from Jan 7, 2024 which is a Sunday
  });
}

/**
 * Format a percentage value
 */
export function formatPercentage(value: number, decimals: number = 0): string {
  return formatNumber(value, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format a distance value with unit
 * @param distance - Distance in meters
 * @param unit - 'km' or 'm'
 */
export function formatDistance(distance: number, unit: 'km' | 'm' = 'km'): string {
  const locale = getCurrentLocale();
  if (unit === 'km') {
    const km = distance / 1000;
    return `${formatDecimal(km, 1)} km`;
  }
  return `${formatNumber(distance, { maximumFractionDigits: 0 })} m`;
}

/**
 * Format speed with unit
 * @param speed - Speed value
 * @param unit - 'km/h', 'm/s', or 'mph'
 */
export function formatSpeed(speed: number, unit: 'km/h' | 'm/s' | 'mph' = 'km/h'): string {
  return `${formatDecimal(speed, 1)} ${unit}`;
}

/**
 * Format a time string or Date object according to locale
 */
export function formatTime(value: string | Date, options: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' }): string {
  const locale = resolveLocaleTag();
  const dateObj = typeof value === 'string'
    ? new Date(`1970-01-01T${value.length <= 5 ? `${value}:00` : value}`)
    : value;

  return new Intl.DateTimeFormat(locale, options).format(dateObj);
}

/**
 * Format a simple date range (start to end). If both dates share the same month/year, omit duplicates.
 */
export function formatDateRange(start: Date, end: Date): string {
  const locale = resolveLocaleTag();
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const sameYear = start.getFullYear() === end.getFullYear();

  const monthFormatter = new Intl.DateTimeFormat(locale, { month: sameMonth ? 'long' : 'short' });
  const dayFormatter = new Intl.DateTimeFormat(locale, { day: 'numeric' });
  const fullFormatter = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric', year: 'numeric' });

  if (sameMonth) {
    return `${monthFormatter.format(start)} ${dayFormatter.format(start)} - ${dayFormatter.format(end)}${sameYear ? '' : ` ${end.getFullYear()}`}`;
  }

  if (sameYear) {
    const monthDayFormatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    return `${monthDayFormatter.format(start)} - ${monthDayFormatter.format(end)} ${end.getFullYear()}`;
  }

  return `${fullFormatter.format(start)} - ${fullFormatter.format(end)}`;
}
