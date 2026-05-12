import { getDatabase } from './database';

export type PlanTier = 'free' | 'starter' | 'pro' | 'business';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  plan: PlanTier;
  razorpay_customer_id: string;
  razorpay_subscription_id: string;
  plan_started_at: string;
  plan_expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

export function createUser(user: CreateUserInput): void {
  const db = getDatabase();
  db.prepare(
    `INSERT INTO users (id, name, email, password_hash, plan, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'free', ?, ?)`,
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

export function getUserBySubscriptionId(subscriptionId: string): UserRecord | null {
  const db = getDatabase();
  return (
    (db
      .prepare('SELECT * FROM users WHERE razorpay_subscription_id = ?')
      .get(subscriptionId) as UserRecord | undefined) ?? null
  );
}

export function updateUserPlan(params: {
  userId: string;
  plan: PlanTier;
  razorpaySubscriptionId?: string;
  razorpayCustomerId?: string;
  planStartedAt?: string;
  planExpiresAt?: string;
}): void {
  const db = getDatabase();
  const existing = getUserById(params.userId);
  if (!existing) return;

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE users SET
      plan = ?,
      razorpay_customer_id = ?,
      razorpay_subscription_id = ?,
      plan_started_at = ?,
      plan_expires_at = ?,
      updated_at = ?
     WHERE id = ?`,
  ).run(
    params.plan,
    params.razorpayCustomerId ?? existing.razorpay_customer_id,
    params.razorpaySubscriptionId ?? existing.razorpay_subscription_id,
    params.planStartedAt ?? existing.plan_started_at,
    params.planExpiresAt ?? existing.plan_expires_at,
    now,
    params.userId,
  );
}
