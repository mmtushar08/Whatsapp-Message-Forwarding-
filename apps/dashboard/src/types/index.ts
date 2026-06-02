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
  maxAdditionalRules: number;
  webhookRelay: boolean;
  emailForward: boolean;
  aiAutoReply: boolean;
  label: string;
}

export const PLAN_CAPABILITIES: Record<PlanTier, PlanCapabilities> = {
  free:     { monthlyMessages: 200,  maxDestinations: 1,   maxAdditionalRules: 0,  webhookRelay: false, emailForward: false, aiAutoReply: false, label: 'Free' },
  starter:  { monthlyMessages: -1,   maxDestinations: 1,   maxAdditionalRules: 0,  webhookRelay: false, emailForward: true,  aiAutoReply: false, label: 'Starter' },
  pro:      { monthlyMessages: -1,   maxDestinations: 10,  maxAdditionalRules: 4,  webhookRelay: true,  emailForward: true,  aiAutoReply: true,  label: 'Pro' },
  business: { monthlyMessages: -1,   maxDestinations: 999, maxAdditionalRules: -1, webhookRelay: true,  emailForward: true,  aiAutoReply: true,  label: 'Business' },
};

export interface ForwardingRule {
  id: number;
  workspaceId: string;
  name: string;
  forwardToNumber: string;
  extraRecipients: string[];
  keywordFilters: string[];
  allowedSenders: string[];
  forwardingEnabled: boolean;
  webhookRelayUrl: string;
  emailForwardTo: string;
  createdAt: string;
  updatedAt: string;
}

export interface ForwardingRuleInput {
  name: string;
  forwardToNumber: string;
  extraRecipients: string[];
  keywordFilters: string;
  allowedSenders: string;
  forwardingEnabled: boolean;
  webhookRelayUrl: string;
  emailForwardTo: string;
}

export interface WorkspaceSetup {
  id: string;
  userId: string;
  businessLabel: string;
  sourcePhoneNumber: string;
  phoneNumberId: string;
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
  autoReplyEnabled: boolean;
  autoReplyPrompt: string;
  status: 'needs_webhook_setup' | 'connected';
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
  autoReplyEnabled: boolean;
  autoReplyPrompt: string;
}

export interface PrototypeMessageLog {
  id: string | number;
  workspace_id?: string | null;
  from: string;
  to: string;
  message: string;
  status: 'success' | 'failed';
  forwardedAt: string;
  error?: string;
}

export interface MessageStats {
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
