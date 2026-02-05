export function validatePositive(value: number, fieldName = 'value'): void {
  if (value < 0) {
    throw new Error(`${fieldName} must be positive, got ${value}`);
  }
}

export function validateRange(
  value: number,
  minValue: number,
  maxValue: number,
  fieldName = 'value',
): void {
  if (value < minValue || value > maxValue) {
    throw new Error(
      `${fieldName} must be between ${minValue} and ${maxValue}, got ${value}`,
    );
  }
}

export function validateHours(value: number, fieldName = 'hours'): void {
  validateRange(value, 0.0, 24.0, fieldName);
}
