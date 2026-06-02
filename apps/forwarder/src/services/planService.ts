import type { PlanTier } from '../db/userStore';

export interface PlanLimits {
  monthlyMessages: number;
  maxDestinations: number;
  maxAdditionalRules: number;
  webhookRelay: boolean;
  emailForward: boolean;
  priceUsd: number;
  label: string;
}

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  free: {
    monthlyMessages: 200,
    maxDestinations: 1,
    maxAdditionalRules: 0,
    webhookRelay: false,
    emailForward: false,
    priceUsd: 0,
    label: 'Free',
  },
  starter: {
    monthlyMessages: -1,
    maxDestinations: 1,
    maxAdditionalRules: 0,
    webhookRelay: false,
    emailForward: true,
    priceUsd: 9,
    label: 'Starter',
  },
  pro: {
    monthlyMessages: -1,
    maxDestinations: 10,
    maxAdditionalRules: 4,
    webhookRelay: true,
    emailForward: true,
    priceUsd: 19,
    label: 'Pro',
  },
  business: {
    monthlyMessages: -1,
    maxDestinations: 999,
    maxAdditionalRules: -1,
    webhookRelay: true,
    emailForward: true,
    priceUsd: 39,
    label: 'Business',
  },
};

export function getLimits(plan: PlanTier): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

export interface FeatureCheckInput {
  extraRecipients: string[];
  webhookRelayUrl: string;
  emailForwardTo: string;
}

export interface FeatureCheckError {
  field: 'extraRecipients' | 'webhookRelayUrl' | 'emailForwardTo';
  message: string;
  requiredPlan: PlanTier;
}

export function validatePlanFeatures(
  plan: PlanTier,
  input: FeatureCheckInput,
): FeatureCheckError | null {
  const limits = getLimits(plan);

  const totalDestinations = 1 + input.extraRecipients.length;
  if (totalDestinations > limits.maxDestinations) {
    return {
      field: 'extraRecipients',
      message: `Your ${limits.label} plan supports up to ${limits.maxDestinations} destination${limits.maxDestinations === 1 ? '' : 's'}. Upgrade to Pro for multi-destination fan-out.`,
      requiredPlan: 'pro',
    };
  }

  if (input.webhookRelayUrl && !limits.webhookRelay) {
    return {
      field: 'webhookRelayUrl',
      message: 'Webhook relay is a Pro feature. Upgrade to use it.',
      requiredPlan: 'pro',
    };
  }

  if (input.emailForwardTo && !limits.emailForward) {
    return {
      field: 'emailForwardTo',
      message: 'Email forwarding is a Starter feature. Upgrade to use it.',
      requiredPlan: 'starter',
    };
  }

  return null;
}
