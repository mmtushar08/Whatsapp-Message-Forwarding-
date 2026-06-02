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
      plan TEXT NOT NULL DEFAULT 'free',
      razorpay_customer_id TEXT NOT NULL DEFAULT '',
      razorpay_subscription_id TEXT NOT NULL DEFAULT '',
      plan_started_at TEXT NOT NULL DEFAULT '',
      plan_expires_at TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS usage_counters (
      workspace_id TEXT NOT NULL,
      year_month TEXT NOT NULL,
      message_count INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (workspace_id, year_month)
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

  const ruleColumns = db.prepare(`PRAGMA table_info(forwarding_rules)`).all() as Array<{ name: string }>;
  if (!ruleColumns.some((c) => c.name === 'allowed_senders')) {
    db.exec(`ALTER TABLE forwarding_rules ADD COLUMN allowed_senders TEXT NOT NULL DEFAULT ''`);
  }

  const messageLogColumns = db
    .prepare(`PRAGMA table_info(message_logs)`)
    .all() as Array<{ name: string }>;

  if (!messageLogColumns.some((column) => column.name === 'workspace_id')) {
    db.exec(`ALTER TABLE message_logs ADD COLUMN workspace_id TEXT`);
  }

  const workspaceColumns = db.prepare(`PRAGMA table_info(workspaces)`).all() as Array<{ name: string }>;
  if (!workspaceColumns.some((c) => c.name === 'app_secret_encrypted')) {
    db.exec(`ALTER TABLE workspaces ADD COLUMN app_secret_encrypted TEXT`);
  }
  if (!workspaceColumns.some((c) => c.name === 'extra_recipients')) {
    db.exec(`ALTER TABLE workspaces ADD COLUMN extra_recipients TEXT NOT NULL DEFAULT ''`);
  }
  if (!workspaceColumns.some((c) => c.name === 'webhook_relay_url')) {
    db.exec(`ALTER TABLE workspaces ADD COLUMN webhook_relay_url TEXT NOT NULL DEFAULT ''`);
  }
  if (!workspaceColumns.some((c) => c.name === 'email_forward_to')) {
    db.exec(`ALTER TABLE workspaces ADD COLUMN email_forward_to TEXT NOT NULL DEFAULT ''`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS forwarding_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id TEXT NOT NULL,
      name TEXT NOT NULL,
      forward_to_number TEXT NOT NULL,
      extra_recipients TEXT NOT NULL DEFAULT '',
      keyword_filters TEXT NOT NULL DEFAULT '',
      forwarding_enabled INTEGER NOT NULL DEFAULT 1,
      webhook_relay_url TEXT NOT NULL DEFAULT '',
      email_forward_to TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(workspace_id) REFERENCES workspaces(id)
    )
  `);

  const userColumns = db.prepare(`PRAGMA table_info(users)`).all() as Array<{ name: string }>;
  if (!userColumns.some((c) => c.name === 'plan')) {
    db.exec(`ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'`);
  }
  if (!userColumns.some((c) => c.name === 'razorpay_customer_id')) {
    db.exec(`ALTER TABLE users ADD COLUMN razorpay_customer_id TEXT NOT NULL DEFAULT ''`);
  }
  if (!userColumns.some((c) => c.name === 'razorpay_subscription_id')) {
    db.exec(`ALTER TABLE users ADD COLUMN razorpay_subscription_id TEXT NOT NULL DEFAULT ''`);
  }
  if (!userColumns.some((c) => c.name === 'plan_started_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN plan_started_at TEXT NOT NULL DEFAULT ''`);
  }
  if (!userColumns.some((c) => c.name === 'plan_expires_at')) {
    db.exec(`ALTER TABLE users ADD COLUMN plan_expires_at TEXT NOT NULL DEFAULT ''`);
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
