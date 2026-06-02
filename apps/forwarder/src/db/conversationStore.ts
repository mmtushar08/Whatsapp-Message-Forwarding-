import { getDatabase } from './database';

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConversationRecord {
  role: string;
  content: string;
  created_at: string;
}

const THREAD_TTL_MS = 24 * 60 * 60 * 1000; // 24 h — matches WhatsApp free session window
const MAX_HISTORY = 20; // keep last 20 turns to stay within context limits

export function getHistory(workspaceId: string, fromNumber: string): ConversationMessage[] {
  const db = getDatabase();
  const cutoff = new Date(Date.now() - THREAD_TTL_MS).toISOString();
  const rows = db
    .prepare(
      `SELECT role, content FROM conversations
       WHERE workspace_id = ? AND from_number = ? AND created_at >= ?
       ORDER BY id DESC LIMIT ?`,
    )
    .all(workspaceId, fromNumber, cutoff, MAX_HISTORY) as ConversationRecord[];
  return rows.reverse().map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content }));
}

export function appendMessage(
  workspaceId: string,
  fromNumber: string,
  role: 'user' | 'assistant',
  content: string,
): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO conversations (workspace_id, from_number, role, content, created_at)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(workspaceId, fromNumber, role, content, new Date().toISOString());
}

export function clearHistory(workspaceId: string, fromNumber: string): void {
  getDatabase()
    .prepare(`DELETE FROM conversations WHERE workspace_id = ? AND from_number = ?`)
    .run(workspaceId, fromNumber);
}

export function pruneExpiredThreads(): void {
  const cutoff = new Date(Date.now() - THREAD_TTL_MS).toISOString();
  getDatabase()
    .prepare(`DELETE FROM conversations WHERE created_at < ?`)
    .run(cutoff);
}
