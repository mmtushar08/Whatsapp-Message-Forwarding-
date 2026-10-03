export type PlanTier = 'free' | 'starter' | 'pro' | 'business';

export interface MarketplaceUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  plan: PlanTier;
  planExpiresAt: string;
}

export interface PlanCapabilities {
  monthlyMessages: number;
  maxDestinations: number;
  webhookRelay: boolean;
  emailForward: boolean;
  label: string;
}

export const PLAN_CAPABILITIES: Record<PlanTier, PlanCapabilities> = {
  free: { monthlyMessages: 200, maxDestinations: 1, webhookRelay: false, emailForward: false, label: 'Free' },
  starter: { monthlyMessages: -1, maxDestinations: 1, webhookRelay: false, emailForward: true, label: 'Starter' },
  pro: { monthlyMessages: -1, maxDestinations: 10, webhookRelay: true, emailForward: true, label: 'Pro' },
  business: { monthlyMessages: -1, maxDestinations: 999, webhookRelay: true, emailForward: true, label: 'Business' },
};

export interface WorkspaceSetup {
  id: string;
  userId: string;
  businessLabel: string;
  sourcePhoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  accessTokenPreview: string;
  appSecretConfigured: boolean;
  forwardToNumber: string;
  extraRecipients: string[];
  keywordFilters: string[];
  forwardingEnabled: boolean;
  webhookVerifyToken: string;
  webhookUrl: string;
  webhookRelayUrl: string;
  emailForwardTo: string;
  status: 'needs_webhook_setup' | 'connected';
  /** embedded_signup: webhooks are managed for the user. manual: their own Meta app. */
  connectionMethod: 'embedded_signup' | 'manual';
  /** When Meta last reached the webhook for this number ('' if never). */
  lastWebhookAt: string;
  /** Approved template used when a destination's 24h window is closed. */
  forwardTemplateName: string;
  forwardTemplateLanguage: string;
  /** Two-step verification PIN set when the number was registered, if any. */
  twoStepPin: string;
  /** Problems found while connecting that the user should act on. */
  setupWarnings: string[];
  updatedAt: string;
}

export interface WorkspaceSettingsInput {
  businessLabel: string;
  sourcePhoneNumber: string;
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  forwardToNumber: string;
  extraRecipients: string[];
  keywordFilters: string;
  forwardingEnabled: boolean;
  webhookRelayUrl: string;
  emailForwardTo: string;
  forwardTemplateName?: string;
  forwardTemplateLanguage?: string;
}

/** A number picked from a pasted access token (customers with their own Meta app). */
export interface ManualConnectionInput {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  appSecret?: string;
  businessLabel?: string;
}

export type MessageChannel = 'whatsapp' | 'email' | 'webhook';

export interface PrototypeMessageLog {
  id: string | number;
  workspace_id?: string | null;
  from: string;
  to: string;
  message: string;
  status: 'success' | 'failed';
  forwardedAt: string;
  error?: string;
  channel: MessageChannel;
}

export interface MessageStats {
  /** Inbound messages received on the business number. */
  received?: number;
  total: number;
  success: number;
  failed: number;
  monthlyUsage?: number;
  monthlyLimit?: number;
}

export interface BillingStatus {
  plan: PlanTier;
  planExpiresAt: string;
  razorpaySubscriptionId: string;
  razorpayConfigured: boolean;
  razorpayKeyId: string;
  limits: {
    monthlyMessages: number;
    maxDestinations: number;
    webhookRelay: boolean;
    emailForward: boolean;
    label: string;
  };
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
