import { getDatabase } from './database';

export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export function createSession(session: SessionRecord): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, created_at, expires_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    session.id,
    session.user_id,
    session.token_hash,
    session.created_at,
    session.expires_at,
    session.revoked_at,
  );
}

export function getActiveSessionByTokenHash(tokenHash: string): SessionRecord | null {
  const db = getDatabase();
  return (
    (db
      .prepare(
        `SELECT * FROM sessions
         WHERE token_hash = ?
           AND revoked_at IS NULL
           AND expires_at > ?`,
      )
      .get(tokenHash, new Date().toISOString()) as SessionRecord | undefined) ?? null
  );
}

export function revokeSession(tokenHash: string): void {
  const db = getDatabase();
  db.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL').run(
    new Date().toISOString(),
    tokenHash,
  );
}
