/**
 * Formats a Unix timestamp (string) to a human-readable date string.
 *
 * @param unixTimestamp - Unix timestamp as a string (from WhatsApp API)
 * @returns Formatted date string e.g. "2026-03-14 10:30:00"
 */
export function formatTimestamp(unixTimestamp: string): string {
  const date = new Date(parseInt(unixTimestamp, 10) * 1000);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Truncates a string to a maximum length, adding "..." if truncated.
 *
 * @param text - The input string
 * @param maxLength - Maximum allowed length (default: 100)
 * @returns Truncated string
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Masks a phone number for safe logging (shows only last 4 digits).
 * Example: "12345678900" → "****8900"
 *
 * @param phoneNumber - The phone number to mask
 * @returns Masked phone number
 */
export function maskPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length <= 4) return '****';
  return `****${cleaned.slice(-4)}`;
}
