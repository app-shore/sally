/**
 * Email and phone validation utilities
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Please enter a valid email address' };
  }

  return { valid: true };
}

/**
 * Validate phone number format
 * Supports: +1234567890, (123) 456-7890, 123-456-7890, etc.
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || !phone.trim()) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Basic phone validation (adjust regex for your requirements)
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
  if (!phoneRegex.test(phone)) {
    return { valid: false, error: 'Please enter a valid phone number' };
  }

  return { valid: true };
}
