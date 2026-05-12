import { getDatabase } from './database';

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function incrementUsage(workspaceId: string, delta: number = 1): void {
  if (!workspaceId) return;
  const db = getDatabase();
  const ym = currentYearMonth();
  db.prepare(
    `INSERT INTO usage_counters (workspace_id, year_month, message_count)
     VALUES (?, ?, ?)
     ON CONFLICT(workspace_id, year_month) DO UPDATE SET
       message_count = message_count + excluded.message_count`,
  ).run(workspaceId, ym, delta);
}

export function getCurrentMonthUsage(workspaceId: string): number {
  if (!workspaceId) return 0;
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT message_count FROM usage_counters WHERE workspace_id = ? AND year_month = ?`,
    )
    .get(workspaceId, currentYearMonth()) as { message_count: number } | undefined;
  return row?.message_count ?? 0;
}
