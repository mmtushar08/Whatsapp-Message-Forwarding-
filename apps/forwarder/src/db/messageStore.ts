import { getDatabase } from './database';

export interface MessageLog {
  id: number;
  workspace_id: string | null;
  from_number: string;
  to_number: string;
  message: string;
  type: string;
  status: 'success' | 'failed';
  error: string | null;
  forwarded_at: string;
}

export interface MessageLogInput {
  workspace_id?: string;
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
    `INSERT INTO message_logs (workspace_id, from_number, to_number, message, type, status, error, forwarded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    input.workspace_id ?? null,
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

export interface MessageFilter {
  status?: 'success' | 'failed';
  search?: string;
  from?: string;
}

export function getWorkspaceMessageLogs(
  workspaceId: string,
  limit: number = 50,
  offset: number = 0,
  filter: MessageFilter = {},
): MessageLog[] {
  const db = getDatabase();
  const conditions: string[] = ['workspace_id = ?'];
  const params: unknown[] = [workspaceId];

  if (filter.status) { conditions.push('status = ?'); params.push(filter.status); }
  if (filter.from) { conditions.push('from_number LIKE ?'); params.push(`%${filter.from}%`); }
  if (filter.search) {
    conditions.push('(message LIKE ? OR from_number LIKE ? OR to_number LIKE ?)');
    params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
  }
  params.push(limit, offset);
  return db
    .prepare(`SELECT * FROM message_logs WHERE ${conditions.join(' AND ')} ORDER BY id DESC LIMIT ? OFFSET ?`)
    .all(...params) as MessageLog[];
}

export function getWorkspaceMessageLogCount(workspaceId: string, filter: MessageFilter = {}): number {
  const db = getDatabase();
  const conditions: string[] = ['workspace_id = ?'];
  const params: unknown[] = [workspaceId];

  if (filter.status) { conditions.push('status = ?'); params.push(filter.status); }
  if (filter.from) { conditions.push('from_number LIKE ?'); params.push(`%${filter.from}%`); }
  if (filter.search) {
    conditions.push('(message LIKE ? OR from_number LIKE ? OR to_number LIKE ?)');
    params.push(`%${filter.search}%`, `%${filter.search}%`, `%${filter.search}%`);
  }
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM message_logs WHERE ${conditions.join(' AND ')}`)
    .get(...params) as { count: number };
  return row.count;
}

export function getMessageLogByIdAndWorkspace(id: number, workspaceId: string): MessageLog | null {
  const db = getDatabase();
  const row = db
    .prepare('SELECT * FROM message_logs WHERE id = ? AND workspace_id = ?')
    .get(id, workspaceId) as MessageLog | undefined;
  return row ?? null;
}

export function getMessageLogCount(): number {
  const db = getDatabase();
  const row = db.prepare('SELECT COUNT(*) as count FROM message_logs').get() as { count: number };
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

export function getWorkspaceMessageStats(workspaceId: string): {
  total: number;
  success: number;
  failed: number;
} {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM message_logs
       WHERE workspace_id = ?`,
    )
    .get(workspaceId) as { total: number; success: number; failed: number };
  return {
    total: row.total,
    success: row.success ?? 0,
    failed: row.failed ?? 0,
  };
}
