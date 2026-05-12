import crypto from 'crypto';
import Razorpay from 'razorpay';
import type { PlanTier } from '../db/userStore';
import logger from './loggerService';

const keyId = process.env['RAZORPAY_KEY_ID'] ?? '';
const keySecret = process.env['RAZORPAY_KEY_SECRET'] ?? '';
const webhookSecret = process.env['RAZORPAY_WEBHOOK_SECRET'] ?? '';

const PLAN_ID_BY_TIER: Record<Exclude<PlanTier, 'free'>, string> = {
  starter: process.env['RAZORPAY_PLAN_STARTER'] ?? '',
  pro: process.env['RAZORPAY_PLAN_PRO'] ?? '',
  business: process.env['RAZORPAY_PLAN_BUSINESS'] ?? '',
};

const TIER_BY_PLAN_ID: Record<string, PlanTier> = Object.fromEntries(
  Object.entries(PLAN_ID_BY_TIER).map(([tier, id]) => [id, tier as PlanTier]),
);

const client = keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;

export function isRazorpayConfigured(): boolean {
  return client !== null;
}

export function getKeyId(): string {
  return keyId;
}

export function getPlanIdForTier(tier: PlanTier): string | null {
  if (tier === 'free') return null;
  return PLAN_ID_BY_TIER[tier] || null;
}

export function getTierForPlanId(planId: string): PlanTier | null {
  return TIER_BY_PLAN_ID[planId] ?? null;
}

export async function createSubscription(params: {
  planTier: Exclude<PlanTier, 'free'>;
  customerNotify: boolean;
  notes: Record<string, string>;
}): Promise<{ id: string; short_url: string; status: string } | null> {
  if (!client) {
    logger.warn('Razorpay subscription requested but Razorpay is not configured.');
    return null;
  }
  const planId = getPlanIdForTier(params.planTier);
  if (!planId) {
    throw new Error(`No Razorpay plan ID configured for tier '${params.planTier}'`);
  }

  const subscription = await client.subscriptions.create({
    plan_id: planId,
    customer_notify: params.customerNotify ? 1 : 0,
    total_count: 12, // 12 months of monthly billing; renews automatically after
    notes: params.notes,
  });

  return {
    id: subscription.id,
    short_url: subscription.short_url,
    status: subscription.status,
  };
}

export async function cancelSubscription(subscriptionId: string): Promise<void> {
  if (!client) return;
  await client.subscriptions.cancel(subscriptionId, false);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!webhookSecret) return false;
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}
