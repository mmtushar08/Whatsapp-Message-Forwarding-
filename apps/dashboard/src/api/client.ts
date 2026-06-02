import { clearSessionToken, getSessionToken, setSessionToken } from '../lib/session';
import type {
  BillingStatus,
  ForwardingRule,
  ForwardingRuleInput,
  MessageStats,
  MarketplaceUser,
  Pagination,
  PrototypeMessageLog,
  WorkspaceSettingsInput,
  WorkspaceSetup,
} from '../types';

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:3000';

interface AuthPayload {
  user: MarketplaceUser;
  sessionToken: string;
  workspace: WorkspaceSetup | null;
}

function normalizeMessages(
  items: Array<{
    id: string | number;
    workspace_id?: string | null;
    from_number: string;
    to_number: string;
    message: string;
    status: 'success' | 'failed';
    forwarded_at: string;
    error?: string | null;
  }>,
): PrototypeMessageLog[] {
  return items.map((item) => ({
    id: item.id,
    workspace_id: item.workspace_id ?? null,
    from: item.from_number,
    to: item.to_number,
    message: item.message,
    status: item.status,
    forwardedAt: item.forwarded_at,
    error: item.error ?? undefined,
  }));
}

async function request<T>(path: string, options: RequestInit = {}, auth = false): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  if (auth) {
    const token = getSessionToken();
    if (!token) {
      throw new Error('Missing session token. Please log in again.');
    }
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };

  if (!response.ok) {
    throw new Error(payload.error ?? `Request failed with status ${response.status}`);
  }

  return payload as T;
}

function normalizeUser(user: MarketplaceUser): MarketplaceUser {
  return user;
}

export async function signupAccount(
  name: string,
  email: string,
  password: string,
): Promise<{ user: MarketplaceUser; workspace: WorkspaceSetup | null }> {
  const payload = await request<AuthPayload>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password }),
  });

  setSessionToken(payload.sessionToken);
  return {
    user: normalizeUser(payload.user),
    workspace: payload.workspace,
  };
}

export async function loginAccount(
  email: string,
  password: string,
): Promise<{ user: MarketplaceUser; workspace: WorkspaceSetup | null }> {
  const payload = await request<AuthPayload>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  setSessionToken(payload.sessionToken);
  return {
    user: normalizeUser(payload.user),
    workspace: payload.workspace,
  };
}

export async function getCurrentSession(): Promise<{
  user: MarketplaceUser;
  workspace: WorkspaceSetup | null;
} | null> {
  if (!getSessionToken()) {
    return null;
  }

  try {
    const payload = await request<{ user: MarketplaceUser; workspace: WorkspaceSetup | null }>(
      '/auth/me',
      { method: 'GET' },
      true,
    );

    return {
      user: normalizeUser(payload.user),
      workspace: payload.workspace,
    };
  } catch {
    clearSessionToken();
    return null;
  }
}

export async function logoutAccount(): Promise<void> {
  if (!getSessionToken()) {
    return;
  }

  try {
    await request<{ success: boolean }>('/auth/logout', { method: 'POST' }, true);
  } finally {
    clearSessionToken();
  }
}

export async function saveWorkspaceRequest(
  input: WorkspaceSettingsInput,
): Promise<{ workspace: WorkspaceSetup }> {
  const payload = await request<{ workspace: WorkspaceSetup }>(
    '/app/workspace',
    {
      method: 'PATCH',
      body: JSON.stringify({
        businessLabel: input.businessLabel,
        sourcePhoneNumber: input.sourcePhoneNumber,
        phoneNumberId: input.phoneNumberId,
        accessToken: input.accessToken,
        appSecret: input.appSecret,
        forwardToNumber: input.forwardToNumber,
        extraRecipients: input.extraRecipients,
        keywordFilters: input.keywordFilters,
        forwardingEnabled: input.forwardingEnabled,
        webhookRelayUrl: input.webhookRelayUrl,
        emailForwardTo: input.emailForwardTo,
      }),
    },
    true,
  );

  return {
    workspace: payload.workspace,
  };
}

export async function fetchWorkspaceMessages(
  limit = 20,
  offset = 0,
): Promise<{ data: PrototypeMessageLog[]; pagination: Pagination }> {
  const payload = await request<{
    data: Array<{
      id: number;
      workspace_id: string | null;
      from_number: string;
      to_number: string;
      message: string;
      status: 'success' | 'failed';
      forwarded_at: string;
      error?: string | null;
    }>;
    pagination: Pagination;
  }>(`/app/messages?limit=${limit}&offset=${offset}`, { method: 'GET' }, true);

  return {
    data: normalizeMessages(payload.data),
    pagination: payload.pagination,
  };
}

export async function fetchWorkspaceStats(): Promise<MessageStats> {
  return request<MessageStats>('/app/messages/stats', { method: 'GET' }, true);
}

export async function fetchSmtpStatus(): Promise<{ smtpConfigured: boolean }> {
  try {
    return await request<{ smtpConfigured: boolean }>('/health/smtp', { method: 'GET' });
  } catch {
    return { smtpConfigured: false };
  }
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  return request<BillingStatus>('/billing/status', { method: 'GET' }, true);
}

export async function startSubscription(plan: 'starter' | 'pro' | 'business'): Promise<{
  subscriptionId: string;
  shortUrl: string;
  status: string;
}> {
  return request<{ subscriptionId: string; shortUrl: string; status: string }>(
    '/billing/subscribe',
    { method: 'POST', body: JSON.stringify({ plan }) },
    true,
  );
}

export async function cancelSubscription(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/billing/cancel', { method: 'POST' }, true);
}

export async function testWorkspaceConnection(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/app/workspace/test', { method: 'POST' }, true);
}

export async function fetchRules(): Promise<ForwardingRule[]> {
  const payload = await request<{ rules: ForwardingRule[] }>('/app/rules', { method: 'GET' }, true);
  return payload.rules;
}

export async function createRule(input: ForwardingRuleInput): Promise<ForwardingRule> {
  const payload = await request<{ rule: ForwardingRule }>(
    '/app/rules',
    {
      method: 'POST',
      body: JSON.stringify({
        name: input.name,
        forwardToNumber: input.forwardToNumber,
        extraRecipients: input.extraRecipients,
        keywordFilters: input.keywordFilters
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        forwardingEnabled: input.forwardingEnabled,
        webhookRelayUrl: input.webhookRelayUrl,
        emailForwardTo: input.emailForwardTo,
      }),
    },
    true,
  );
  return payload.rule;
}

export async function updateRule(id: number, input: ForwardingRuleInput): Promise<ForwardingRule> {
  const payload = await request<{ rule: ForwardingRule }>(
    `/app/rules/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        name: input.name,
        forwardToNumber: input.forwardToNumber,
        extraRecipients: input.extraRecipients,
        keywordFilters: input.keywordFilters
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        forwardingEnabled: input.forwardingEnabled,
        webhookRelayUrl: input.webhookRelayUrl,
        emailForwardTo: input.emailForwardTo,
      }),
    },
    true,
  );
  return payload.rule;
}

export async function deleteRule(id: number): Promise<void> {
  await request<{ success: boolean }>(`/app/rules/${id}`, { method: 'DELETE' }, true);
}

export async function resendMessageRequest(id: string | number): Promise<{ success: boolean }> {
  return request<{ success: boolean }>(`/app/messages/${id}/resend`, { method: 'POST' }, true);
}
