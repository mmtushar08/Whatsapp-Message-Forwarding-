import { getDatabase } from './database';

export interface MessageLog {
  id: number;
  from_number: string;
  to_number: string;
  message: string;
  type: string;
  status: 'success' | 'failed';
  error: string | null;
  forwarded_at: string;
}

export interface MessageLogInput {
  from_number: string;
  to_number: string;
  message: string;
  type?: string;
  status: 'success' | 'failed';
  error?: string;
}

/**
 * Inserts a new forwarding record into the message_logs table.
 */
export function logMessage(input: MessageLogInput): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO message_logs (from_number, to_number, message, type, status, error, forwarded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.from_number,
    input.to_number,
    input.message,
    input.type ?? 'text',
    input.status,
    input.error ?? null,
    new Date().toISOString(),
  );
}

/**
 * Returns paginated message logs ordered newest first.
 */
export function getMessageLogs(limit: number = 50, offset: number = 0): MessageLog[] {
  const db = getDatabase();
  return db
    .prepare('SELECT * FROM message_logs ORDER BY id DESC LIMIT ? OFFSET ?')
    .all(limit, offset) as MessageLog[];
}

/**
 * Returns the total count of message log records.
 */
export function getMessageLogCount(): number {
  const db = getDatabase();
  const row = db
    .prepare('SELECT COUNT(*) as count FROM message_logs')
    .get() as { count: number };
  return row.count;
}

/**
 * Returns aggregate statistics: total, success, and failed message counts.
 */
export function getMessageStats(): { total: number; success: number; failed: number } {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM message_logs`,
    )
    .get() as { total: number; success: number; failed: number };
  return {
    total: row.total,
    success: row.success ?? 0,
    failed: row.failed ?? 0,
  };
}
