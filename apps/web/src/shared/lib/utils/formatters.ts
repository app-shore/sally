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
