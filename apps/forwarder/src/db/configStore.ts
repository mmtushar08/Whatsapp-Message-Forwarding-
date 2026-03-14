import { getDatabase } from './database';

const CONFIG_KEY_FORWARD_NUMBER = 'forward_to_number';

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
