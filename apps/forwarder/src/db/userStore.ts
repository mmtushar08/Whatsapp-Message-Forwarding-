import { getDatabase } from './database';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export function createUser(user: UserRecord): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(user.id, user.name, user.email, user.password_hash, user.created_at, user.updated_at);
}

export function getUserByEmail(email: string): UserRecord | null {
  const db = getDatabase();
  return (
    (db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as UserRecord | undefined) ??
    null
  );
}

export function getUserById(id: string): UserRecord | null {
  const db = getDatabase();
  return (db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRecord | undefined) ?? null;
}
