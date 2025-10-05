/**
 * Date utility functions for handling timezone-aware date operations
 */

/**
 * Parses a date string or Date object to a local Date object,
 * properly handling timezone issues from backend DateTimeField
 * 
 * @param dateInput - Date string (ISO format) or Date object
 * @returns Date object in local timezone, or null if invalid
 */
export function parseLocalDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  
  if (dateInput instanceof Date) {
    return dateInput;
  }
  
  try {
    // If the date string includes timezone info (ends with Z or has +/- offset)
    if (typeof dateInput === 'string' && (dateInput.includes('Z') || /[+-]\d{2}:\d{2}$/.test(dateInput))) {
      const utcDate = new Date(dateInput);
      // Create a new date that represents the same calendar date in local timezone
      return new Date(utcDate.getFullYear(), utcDate.getMonth(), utcDate.getDate());
    }
    
    // For date strings without timezone info, treat as local date
    return new Date(dateInput);
  } catch (error) {
    console.warn('Failed to parse date:', dateInput, error);
    return null;
  }
}

/**
 * Formats a date to ISO string without timezone (YYYY-MM-DD)
 * 
 * @param date - Date object
 * @returns ISO date string (YYYY-MM-DD) or null if invalid
 */
export function formatLocalDateISO(date: Date | null | undefined): string | null {
  if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
    return null;
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Checks if two dates represent the same calendar day (ignoring time)
 * 
 * @param date1 - First date
 * @param date2 - Second date  
 * @returns true if same calendar day, false otherwise
 */
export function isSameLocalDate(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;
  
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Creates a new Date object set to the start of the day (00:00:00.000)
 * 
 * @param date - Source date
 * @returns New Date object at start of day, or null if invalid
 */
export function startOfDay(date: Date | null | undefined): Date | null {
  if (!date || !(date instanceof Date)) return null;
  
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

/**
 * Creates a new Date object set to the end of the day (23:59:59.999)
 * 
 * @param date - Source date
 * @returns New Date object at end of day, or null if invalid
 */
export function endOfDay(date: Date | null | undefined): Date | null {
  if (!date || !(date instanceof Date)) return null;
  
  const newDate = new Date(date);
  newDate.setHours(23, 59, 59, 999);
  return newDate;
}