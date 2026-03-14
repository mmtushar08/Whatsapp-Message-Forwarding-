import BetterSqlite3 from 'better-sqlite3';
import { mkdirSync } from 'fs';
import path from 'path';
import logger from '../services/loggerService';

const DB_PATH = process.env['DB_PATH']
  ? path.resolve(process.cwd(), process.env['DB_PATH'])
  : path.resolve(process.cwd(), 'data/forwarder.db');

let db: BetterSqlite3.Database | undefined;

/**
 * Initializes the SQLite database and creates tables if they don't exist.
 * Should be called once on app startup.
 */
export function initDatabase(): BetterSqlite3.Database {
  if (db) return db;
  // Ensure data directory exists
  mkdirSync(path.dirname(DB_PATH), { recursive: true });

  db = new BetterSqlite3(DB_PATH);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');

  // Create config table (key-value store for settings)
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Create message_logs table (history of forwarded messages)
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      from_number TEXT NOT NULL,
      to_number   TEXT NOT NULL,
      message     TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'text',
      status      TEXT NOT NULL DEFAULT 'success',
      error       TEXT,
      forwarded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  logger.info(`✅ Database initialized at ${DB_PATH}`);
  return db;
}

/**
 * Returns the initialized database instance.
 * Calls initDatabase() if not yet initialized.
 */
export function getDatabase(): BetterSqlite3.Database {
  if (!db) {
    return initDatabase();
  }
  return db;
}

/**
 * Closes the database connection. Used in tests for cleanup.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = undefined;
  }
}
