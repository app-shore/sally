/**
 * Display formatters based on user preferences
 * These functions format values according to user's preferred units and formats
 */

// ============================================================================
// DISTANCE FORMATTING
// ============================================================================

export function formatDistance(miles: number, unit: 'MILES' | 'KILOMETERS' = 'MILES'): string {
  if (unit === 'KILOMETERS') {
    const km = miles * 1.60934;
    return `${km.toFixed(1)} km`;
  }
  return `${miles.toFixed(1)} mi`;
}

// ============================================================================
// TIME FORMATTING
// ============================================================================

export function formatTime(date: Date, format: '12H' | '24H' = '12H'): string {
  if (format === '24H') {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatTimeString(timeString: string, format: '12H' | '24H' = '12H'): string {
  // Parse time string (e.g., "14:30" or "2:30 PM")
  const parts = timeString.match(/(\d+):(\d+)/);
  if (!parts) return timeString;

  const hours = parseInt(parts[1], 10);
  const minutes = parseInt(parts[2], 10);

  if (format === '24H') {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

// ============================================================================
// CURRENCY FORMATTING
// ============================================================================

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // Fallback if currency is invalid
    return `$${amount.toFixed(2)}`;
  }
}

/**
 * Format an amount in cents as a currency string.
 * Converts cents to dollars and formats with Intl.NumberFormat.
 * @param cents - Amount in cents (integer)
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string like "$1,234.56"
 */
export function formatCents(cents: number, currency: string = 'USD'): string {
  return formatCurrency(cents / 100, currency);
}

// ============================================================================
// TEMPERATURE FORMATTING
// ============================================================================

export function formatTemperature(fahrenheit: number, unit: 'F' | 'C' = 'F'): string {
  if (unit === 'C') {
    const celsius = (fahrenheit - 32) * (5 / 9);
    return `${celsius.toFixed(1)}°C`;
  }
  return `${fahrenheit.toFixed(1)}°F`;
}

// ============================================================================
// DATE FORMATTING
// ============================================================================

export function formatDate(date: Date, format: string = 'MM/DD/YYYY'): string {
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const year = date.getFullYear();

  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY':
    default:
      return `${month}/${day}/${year}`;
  }
}

export function formatDateTime(date: Date, dateFormat: string = 'MM/DD/YYYY', timeFormat: '12H' | '24H' = '12H'): string {
  return `${formatDate(date, dateFormat)} ${formatTime(date, timeFormat)}`;
}

/**
 * Format a date/time with a more readable, user-friendly format
 * Accepts both Date objects and ISO date strings
 * @param date - Date object or ISO date string
 * @returns Formatted string like "Jan 15, 2024, 3:45 PM"
 *
 * @example
 * formatDateTimeFriendly(new Date()) // "Jan 15, 2024, 3:45 PM"
 * formatDateTimeFriendly("2024-01-15T15:45:00Z") // "Jan 15, 2024, 3:45 PM"
 */
export function formatDateTimeFriendly(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format just the date portion in a friendly way
 * Accepts both Date objects and ISO date strings
 * @param date - Date object or ISO date string
 * @returns Formatted string like "Jan 15, 2024"
 *
 * @example
 * formatDateFriendly(new Date()) // "Jan 15, 2024"
 * formatDateFriendly("2024-01-15") // "Jan 15, 2024"
 */
export function formatDateFriendly(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format just the time portion in a friendly way
 * Accepts both Date objects and ISO date strings
 * @param date - Date object or ISO date string
 * @returns Formatted string like "3:45 PM"
 *
 * @example
 * formatTimeFriendly(new Date()) // "3:45 PM"
 * formatTimeFriendly("2024-01-15T15:45:00Z") // "3:45 PM"
 */
export function formatTimeFriendly(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  return dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date object or ISO date string
 * @returns Relative time string
 *
 * @example
 * formatRelativeTime(new Date(Date.now() - 2 * 60 * 60 * 1000)) // "2 hours ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1,
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(Math.abs(diffInSeconds) / secondsInUnit);

    if (interval >= 1) {
      const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
      return rtf.format(
        diffInSeconds > 0 ? -interval : interval,
        unit as Intl.RelativeTimeFormatUnit
      );
    }
  }

  return 'just now';
}

// ============================================================================
// DURATION FORMATTING
// ============================================================================

export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h ${m}m`;
}

// ============================================================================
// PERCENTAGE FORMATTING
// ============================================================================

export function formatPercentage(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`;
}

// ============================================================================
// WEIGHT FORMATTING (US/Metric)
// ============================================================================

export function formatWeight(lbs: number, system: 'US' | 'METRIC' = 'US'): string {
  if (system === 'METRIC') {
    const kg = lbs * 0.453592;
    return `${kg.toFixed(0)} kg`;
  }
  return `${lbs.toFixed(0)} lbs`;
}

// ============================================================================
// FUEL FORMATTING
// ============================================================================

export function formatFuelVolume(gallons: number, system: 'US' | 'METRIC' = 'US'): string {
  if (system === 'METRIC') {
    const liters = gallons * 3.78541;
    return `${liters.toFixed(1)} L`;
  }
  return `${gallons.toFixed(1)} gal`;
}

export function formatFuelPrice(pricePerGallon: number, currency: string = 'USD', system: 'US' | 'METRIC' = 'US'): string {
  if (system === 'METRIC') {
    const pricePerLiter = pricePerGallon / 3.78541;
    return `${formatCurrency(pricePerLiter, currency)}/L`;
  }
  return `${formatCurrency(pricePerGallon, currency)}/gal`;
}
