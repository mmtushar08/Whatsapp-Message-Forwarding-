import { getDatabase } from './database';

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Records a WhatsApp message ID as processed. Returns false when it was seen
 * before, so a redelivered webhook is not forwarded a second time.
 */
export function claimWebhookMessage(messageId: string): boolean {
  if (!messageId) return true;
  const db = getDatabase();
  const now = new Date();
  const result = db
    .prepare(
      'INSERT OR IGNORE INTO processed_webhook_messages (message_id, received_at) VALUES (?, ?)',
    )
    .run(messageId, now.toISOString());

  // Meta stops redelivering after a few days; prune now and then.
  if (Math.random() < 0.01) {
    db.prepare('DELETE FROM processed_webhook_messages WHERE received_at < ?').run(
      new Date(now.getTime() - RETENTION_MS).toISOString(),
    );
  }
  return result.changes === 1;
}
