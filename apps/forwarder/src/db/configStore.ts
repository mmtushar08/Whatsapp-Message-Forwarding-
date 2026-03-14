import { getDatabase } from './database';

const CONFIG_KEY_FORWARD_NUMBER = 'forward_to_number';

/**
 * Gets a config value from the database.
 */
export function getConfigValue(key: string): string | null {
  const row = getDatabase().prepare('SELECT value FROM config WHERE key = ?').get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

/**
 * Sets a config value in the database (upsert).
 */
export function setConfigValue(key: string, value: string): void {
  getDatabase()
    .prepare(
      `INSERT INTO config (key, value, updated_at)
       VALUES (?, ?, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    )
    .run(key, value);
}

/**
 * Gets the persisted forward-to phone number.
 * Falls back to the env variable if not set in DB.
 */
export function getPersistedForwardToNumber(): string {
  return getConfigValue(CONFIG_KEY_FORWARD_NUMBER) ?? process.env['FORWARD_TO_NUMBER'] ?? '';
}

/**
 * Persists the forward-to phone number to the database.
 */
export function persistForwardToNumber(phoneNumber: string): void {
  setConfigValue(CONFIG_KEY_FORWARD_NUMBER, phoneNumber);
}
