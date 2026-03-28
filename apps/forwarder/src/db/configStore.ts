import { getDatabase } from './database';

const CONFIG_KEY_FORWARD_NUMBER = 'forward_to_number';
const CONFIG_KEY_KEYWORD_FILTERS = 'keyword_filters';
const CONFIG_KEY_FORWARDING_ENABLED = 'forwarding_enabled';

/**
 * Reads the persisted forward-to number from the database.
 * Falls back to the FORWARD_TO_NUMBER environment variable if not found in the DB
 * or if the database has not been initialized.
 */
export function getPersistedForwardToNumber(): string {
  return getConfigValue(CONFIG_KEY_FORWARD_NUMBER) ?? process.env['FORWARD_TO_NUMBER'] ?? '';
}

/**
 * Persists the forward-to number to the database (upsert).
 * Silently skips if the database has not been initialized.
 */
export function persistForwardToNumber(phoneNumber: string): void {
  setConfigValue(CONFIG_KEY_FORWARD_NUMBER, phoneNumber);
}

export function getPersistedKeywordFilters(): string[] {
  const raw = getConfigValue(CONFIG_KEY_KEYWORD_FILTERS) ?? process.env['KEYWORD_FILTERS'] ?? '';
  return raw
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function persistKeywordFilters(keywordFilters: string[]): void {
  setConfigValue(CONFIG_KEY_KEYWORD_FILTERS, keywordFilters.join(','));
}

export function getPersistedForwardingEnabled(): boolean {
  const raw = getConfigValue(CONFIG_KEY_FORWARDING_ENABLED);
  if (!raw) {
    return true;
  }

  return raw === 'true';
}

export function persistForwardingEnabled(forwardingEnabled: boolean): void {
  setConfigValue(CONFIG_KEY_FORWARDING_ENABLED, forwardingEnabled ? 'true' : 'false');
}

/**
 * Reads a generic key-value config entry from the database.
 * Returns null if the key does not exist or if the database is not initialized.
 */
export function getConfigValue(key: string): string | null {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT value FROM config WHERE key = ?').get(key) as
      | { value: string }
      | undefined;
    return row?.value ?? null;
  } catch {
    return null;
  }
}

/**
 * Writes a generic key-value config entry to the database (upsert).
 * Silently skips if the database has not been initialized.
 */
export function setConfigValue(key: string, value: string): void {
  try {
    const db = getDatabase();
    db.prepare(
      `INSERT INTO config (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    ).run(key, value, new Date().toISOString());
  } catch {
    // Silently ignore if database is not available
  }
}
