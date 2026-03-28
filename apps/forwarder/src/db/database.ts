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
      workspace_id TEXT,
      from_number TEXT NOT NULL,
      to_number TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'text',
      status TEXT NOT NULL,
      error TEXT,
      forwarded_at TEXT NOT NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      revoked_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      business_label TEXT NOT NULL,
      source_phone_number TEXT NOT NULL,
      phone_number_id TEXT NOT NULL,
      access_token_encrypted TEXT NOT NULL,
      app_secret_encrypted TEXT,
      access_token_preview TEXT NOT NULL,
      forward_to_number TEXT NOT NULL,
      keyword_filters TEXT NOT NULL,
      forwarding_enabled INTEGER NOT NULL DEFAULT 1,
      webhook_verify_token TEXT NOT NULL,
      webhook_url TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);

  const messageLogColumns = db
    .prepare(`PRAGMA table_info(message_logs)`)
    .all() as Array<{ name: string }>;

  if (!messageLogColumns.some((column) => column.name === 'workspace_id')) {
    db.exec(`ALTER TABLE message_logs ADD COLUMN workspace_id TEXT`);
  }

  const workspaceColumns = db.prepare(`PRAGMA table_info(workspaces)`).all() as Array<{ name: string }>;
  if (!workspaceColumns.some((column) => column.name === 'app_secret_encrypted')) {
    db.exec(`ALTER TABLE workspaces ADD COLUMN app_secret_encrypted TEXT`);
  }
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
