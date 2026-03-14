import BetterSqlite3 from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

let db: BetterSqlite3.Database | null = null;

const DB_PATH = process.env['DB_PATH'] ?? 'data/forwarder.db';

/**
 * Initializes the SQLite database, creating the data directory and tables if needed.
 * Enables WAL mode for improved concurrent read performance.
 */
export function initDatabase(): void {
  const dbPath = path.resolve(DB_PATH);
  const dir = path.dirname(dbPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new BetterSqlite3(dbPath);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  // Create message_logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_number TEXT NOT NULL,
      to_number TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      status TEXT NOT NULL,
      error TEXT,
      forwarded_at TEXT NOT NULL
    )
  `);
}

/**
 * Returns the active database instance.
 * @throws Error if the database has not been initialized yet.
 */
export function getDatabase(): BetterSqlite3.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}
