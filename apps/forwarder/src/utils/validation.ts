const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizePhoneNumber(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) {
    throw new Error('Phone numbers must be 7-15 digits with country code and no plus sign.');
  }
  return cleaned;
}

export function validateOptionalUrl(value: string, label: string): string {
  if (!value) return '';
  if (!/^https?:\/\//i.test(value)) throw new Error(`${label} must start with http:// or https://`);
  return value.trim();
}

export function validateOptionalEmail(value: string): string {
  if (!value) return '';
  if (!EMAIL_REGEX.test(value)) throw new Error('Email forwarding address is not a valid email.');
  return value.trim();
}

export function parseCSV(value: string[] | string | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : value.split(',')).map((s) => s.trim()).filter(Boolean);
}
