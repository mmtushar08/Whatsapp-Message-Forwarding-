import { Request, Response } from 'express';
import { getUserById, getUserBySubscriptionId, updateUserPlan } from '../db/userStore';
import type { PlanTier } from '../db/userStore';
import logger from '../services/loggerService';
import { getLimits } from '../services/planService';
import {
  cancelSubscription,
  createSubscription,
  getKeyId,
  getTierForPlanId,
  isRazorpayConfigured,
  verifyWebhookSignature,
} from '../services/razorpayService';

export function billingStatus(req: Request, res: Response): void {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }
  const user = getUserById(req.auth.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({
    plan: user.plan,
    planExpiresAt: user.plan_expires_at,
    razorpaySubscriptionId: user.razorpay_subscription_id,
    razorpayConfigured: isRazorpayConfigured(),
    razorpayKeyId: getKeyId(),
    limits: getLimits(user.plan),
  });
}

export async function subscribe(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }
  if (!isRazorpayConfigured()) {
    res.status(503).json({ error: 'Billing is not configured on this server.' });
    return;
  }

  const { plan } = req.body as { plan?: string };
  const validTiers: Exclude<PlanTier, 'free'>[] = ['starter', 'pro', 'business'];
  if (!plan || !validTiers.includes(plan as Exclude<PlanTier, 'free'>)) {
    res.status(400).json({ error: 'plan must be one of: starter, pro, business' });
    return;
  }

  const user = getUserById(req.auth.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  try {
    const subscription = await createSubscription({
      planTier: plan as Exclude<PlanTier, 'free'>,
      customerNotify: true,
      notes: { user_id: user.id, email: user.email, name: user.name },
    });
    if (!subscription) {
      res.status(503).json({ error: 'Could not create subscription.' });
      return;
    }

    // Persist the subscription ID immediately so the webhook can correlate it
    updateUserPlan({
      userId: user.id,
      plan: user.plan,
      razorpaySubscriptionId: subscription.id,
    });

    res.json({
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url,
      status: subscription.status,
    });
  } catch (error) {
    logger.error(`Subscription create failed: ${(error as Error).message}`);
    res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
}

export async function cancel(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }
  const user = getUserById(req.auth.userId);
  if (!user || !user.razorpay_subscription_id) {
    res.status(400).json({ error: 'No active subscription to cancel.' });
    return;
  }

  try {
    await cancelSubscription(user.razorpay_subscription_id);
    res.json({ success: true });
  } catch (error) {
    logger.error(`Subscription cancel failed: ${(error as Error).message}`);
    res.status(500).json({ error: 'Could not cancel subscription. Please try again.' });
  }
}

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        current_start: number;
        current_end: number;
        customer_id?: string;
      };
    };
  };
}

export function razorpayWebhook(req: Request, res: Response): void {
  const signature = req.headers['x-razorpay-signature'];
  const rawBody = req.rawBody?.toString('utf8') ?? '';

  if (typeof signature !== 'string' || !verifyWebhookSignature(rawBody, signature)) {
    logger.warn('Razorpay webhook received with invalid signature.');
    res.sendStatus(400);
    return;
  }

  res.sendStatus(200);

  const event = req.body as RazorpayWebhookEvent;
  const subscription = event.payload?.subscription?.entity;
  if (!subscription) {
    logger.debug(`Razorpay webhook ignored (no subscription entity): ${event.event}`);
    return;
  }

  const user = getUserBySubscriptionId(subscription.id);
  if (!user) {
    logger.warn(`Razorpay webhook for unknown subscription: ${subscription.id}`);
    return;
  }

  const tier = getTierForPlanId(subscription.plan_id);
  const planExpiresAt = subscription.current_end
    ? new Date(subscription.current_end * 1000).toISOString()
    : '';
  const planStartedAt = subscription.current_start
    ? new Date(subscription.current_start * 1000).toISOString()
    : new Date().toISOString();

  switch (event.event) {
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.resumed':
      if (tier) {
        updateUserPlan({
          userId: user.id,
          plan: tier,
          planStartedAt,
          planExpiresAt,
          razorpayCustomerId: subscription.customer_id ?? user.razorpay_customer_id,
          razorpaySubscriptionId: subscription.id,
        });
        logger.info(`User ${user.id} upgraded to ${tier} via Razorpay.`);
      }
      break;
    case 'subscription.halted':
    case 'subscription.cancelled':
    case 'subscription.completed':
      updateUserPlan({
        userId: user.id,
        plan: 'free',
        planStartedAt: '',
        planExpiresAt: '',
        razorpaySubscriptionId: '',
      });
      logger.info(`User ${user.id} downgraded to free via Razorpay event ${event.event}.`);
      break;
    default:
      logger.debug(`Razorpay event ${event.event} acknowledged but not acted upon.`);
  }
}
