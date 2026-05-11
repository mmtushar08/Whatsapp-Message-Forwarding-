export interface MarketplaceUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
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
}

export interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
