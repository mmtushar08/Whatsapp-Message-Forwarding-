import { getDatabase } from './database';

export interface ConversationMessage {
  id: number;
  workspace_id: string;
  contact_number: string;
  contact_name: string;
  direction: 'in' | 'out';
  message: string;
  type: string;
  status: string;
  template_name: string | null;
  created_at: string;
}

export interface ConversationMessageInput {
  workspaceId: string;
  contactNumber: string;
  contactName?: string;
  direction: 'in' | 'out';
  message: string;
  type?: string;
  status?: string;
  templateName?: string;
  createdAt?: string;
}

export interface ConversationSummary {
  contactNumber: string;
  contactName: string;
  lastMessage: string;
  lastDirection: 'in' | 'out';
  lastMessageAt: string;
  lastInboundAt: string | null;
  messageCount: number;
  sessionOpen: boolean;
  sessionExpiresAt: string | null;
}

const SESSION_WINDOW_MS = 24 * 60 * 60 * 1000;

export function insertConversationMessage(input: ConversationMessageInput): ConversationMessage {
  const db = getDatabase();
  const createdAt = input.createdAt ?? new Date().toISOString();
  const result = db
    .prepare(
      `INSERT INTO conversation_messages
        (workspace_id, contact_number, contact_name, direction, message, type, status, template_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      input.workspaceId,
      input.contactNumber,
      input.contactName ?? '',
      input.direction,
      input.message,
      input.type ?? 'text',
      input.status ?? (input.direction === 'in' ? 'received' : 'sent'),
      input.templateName ?? null,
      createdAt,
    );

  return db
    .prepare('SELECT * FROM conversation_messages WHERE id = ?')
    .get(result.lastInsertRowid) as ConversationMessage;
}

export function getConversationMessages(
  workspaceId: string,
  contactNumber: string,
): ConversationMessage[] {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT * FROM conversation_messages
       WHERE workspace_id = ? AND contact_number = ?
       ORDER BY created_at ASC, id ASC`,
    )
    .all(workspaceId, contactNumber) as ConversationMessage[];
}

export function getConversations(workspaceId: string): ConversationSummary[] {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT
         contact_number,
         MAX(CASE WHEN contact_name != '' THEN contact_name END) AS contact_name,
         COUNT(*) AS message_count,
         MAX(created_at) AS last_message_at,
         MAX(CASE WHEN direction = 'in' THEN created_at END) AS last_inbound_at
       FROM conversation_messages
       WHERE workspace_id = ?
       GROUP BY contact_number
       ORDER BY last_message_at DESC`,
    )
    .all(workspaceId) as Array<{
    contact_number: string;
    contact_name: string | null;
    message_count: number;
    last_message_at: string;
    last_inbound_at: string | null;
  }>;

  const lastMessageStmt = db.prepare(
    `SELECT message, direction FROM conversation_messages
     WHERE workspace_id = ? AND contact_number = ?
     ORDER BY created_at DESC, id DESC LIMIT 1`,
  );

  const now = Date.now();

  return rows.map((row) => {
    const last = lastMessageStmt.get(workspaceId, row.contact_number) as {
      message: string;
      direction: 'in' | 'out';
    };
    const sessionInfo = computeSessionWindow(row.last_inbound_at, now);

    return {
      contactNumber: row.contact_number,
      contactName: row.contact_name ?? '',
      lastMessage: last.message,
      lastDirection: last.direction,
      lastMessageAt: row.last_message_at,
      lastInboundAt: row.last_inbound_at,
      messageCount: row.message_count,
      sessionOpen: sessionInfo.open,
      sessionExpiresAt: sessionInfo.expiresAt,
    };
  });
}

export function getLastInboundAt(workspaceId: string, contactNumber: string): string | null {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT MAX(created_at) AS last_inbound_at FROM conversation_messages
       WHERE workspace_id = ? AND contact_number = ? AND direction = 'in'`,
    )
    .get(workspaceId, contactNumber) as { last_inbound_at: string | null };
  return row.last_inbound_at;
}

/**
 * Meta's customer-service window: free-form replies are allowed for 24 hours
 * after the customer's most recent inbound message.
 */
export function computeSessionWindow(
  lastInboundAt: string | null,
  nowMs: number = Date.now(),
): { open: boolean; expiresAt: string | null } {
  if (!lastInboundAt) {
    return { open: false, expiresAt: null };
  }
  const expiresMs = new Date(lastInboundAt).getTime() + SESSION_WINDOW_MS;
  return {
    open: expiresMs > nowMs,
    expiresAt: new Date(expiresMs).toISOString(),
  };
}
