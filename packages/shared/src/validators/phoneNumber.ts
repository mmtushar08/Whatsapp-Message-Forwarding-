/**
 * Validates and cleans a phone number.
 * Removes all non-digit characters and validates length.
 *
 * @param phoneNumber - Raw phone number input (may contain +, spaces, dashes)
 * @returns { valid: boolean, cleaned: string, error?: string }
 */
export function validatePhoneNumber(phoneNumber: string): {
  valid: boolean;
  cleaned: string;
  error?: string;
} {
  const cleaned = phoneNumber.replace(/\D/g, '');

  if (cleaned.length < 7) {
    return { valid: false, cleaned, error: 'Phone number too short. Minimum 7 digits.' };
  }

  if (cleaned.length > 15) {
    return { valid: false, cleaned, error: 'Phone number too long. Maximum 15 digits.' };
  }

  return { valid: true, cleaned };
}

/**
 * Formats a phone number for display.
 * Example: "12345678900" → "+12345678900"
 * Falls back to adding + prefix if format is not recognized.
 *
 * @param phoneNumber - Raw phone number (digits only or with formatting)
 * @returns Formatted phone number string with + prefix
 */
export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  return `+${cleaned}`;
}
