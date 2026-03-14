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
 * Inserts a message log entry into the database.
 */
export function logMessage(input: MessageLogInput): void {
  getDatabase()
    .prepare(
      `INSERT INTO message_logs (from_number, to_number, message, type, status, error)
       VALUES (@from_number, @to_number, @message, @type, @status, @error)`,
    )
    .run({
      from_number: input.from_number,
      to_number: input.to_number,
      message: input.message,
      type: input.type ?? 'text',
      status: input.status,
      error: input.error ?? null,
    });
}

/**
 * Retrieves paginated message logs, newest first.
 *
 * @param limit - Max number of records to return (default: 50)
 * @param offset - Number of records to skip (default: 0)
 */
export function getMessageLogs(limit: number = 50, offset: number = 0): MessageLog[] {
  return getDatabase()
    .prepare(
      `SELECT * FROM message_logs
       ORDER BY forwarded_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as MessageLog[];
}

/**
 * Returns the total count of message logs.
 */
export function getMessageLogCount(): number {
  const row = getDatabase().prepare('SELECT COUNT(*) as count FROM message_logs').get() as {
    count: number;
  };
  return row.count;
}

/**
 * Returns message stats: total, success, failed counts.
 */
export function getMessageStats(): { total: number; success: number; failed: number } {
  const row = getDatabase()
    .prepare(
      `SELECT
        COUNT(*) as total,
        COALESCE(SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END), 0) as success,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) as failed
       FROM message_logs`,
    )
    .get() as { total: number; success: number; failed: number };
  return row;
}
