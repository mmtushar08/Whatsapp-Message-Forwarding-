import { createId, decryptSecret, encryptSecret } from '../services/authService';
import { getDatabase } from './database';

export interface WorkspaceRecord {
  id: string;
  user_id: string;
  business_label: string;
  source_phone_number: string;
  phone_number_id: string;
  access_token_encrypted: string;
  app_secret_encrypted: string | null;
  access_token_preview: string;
  forward_to_number: string;
  keyword_filters: string;
  forwarding_enabled: number;
  webhook_verify_token: string;
  webhook_url: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceView {
  id: string;
  businessLabel: string;
  sourcePhoneNumber: string;
  phoneNumberId: string;
  accessTokenPreview: string;
  appSecretConfigured: boolean;
  forwardToNumber: string;
  keywordFilters: string[];
  forwardingEnabled: boolean;
  webhookVerifyToken: string;
  webhookUrl: string;
  status: string;
  updatedAt: string;
}

export interface WorkspaceInput {
  businessLabel: string;
  sourcePhoneNumber: string;
  phoneNumberId: string;
  accessToken?: string;
  appSecret?: string;
  forwardToNumber: string;
  keywordFilters: string[];
  forwardingEnabled: boolean;
}

export interface WorkspaceRuntime {
  id: string;
  businessLabel: string;
  sourcePhoneNumber: string;
  phoneNumberId: string;
  accessToken: string;
  appSecret: string;
  forwardToNumber: string;
  keywordFilters: string[];
  forwardingEnabled: boolean;
  webhookVerifyToken: string;
  webhookUrl: string;
  status: string;
}

function toWorkspaceView(record: WorkspaceRecord): WorkspaceView {
  return {
    id: record.id,
    businessLabel: record.business_label,
    sourcePhoneNumber: record.source_phone_number,
    phoneNumberId: record.phone_number_id,
    accessTokenPreview: record.access_token_preview,
    appSecretConfigured: Boolean(record.app_secret_encrypted),
    forwardToNumber: record.forward_to_number,
    keywordFilters: record.keyword_filters
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    forwardingEnabled: record.forwarding_enabled === 1,
    webhookVerifyToken: record.webhook_verify_token,
    webhookUrl: record.webhook_url,
    status: record.status,
    updatedAt: record.updated_at,
  };
}

function toWorkspaceRuntime(record: WorkspaceRecord): WorkspaceRuntime {
  return {
    id: record.id,
    businessLabel: record.business_label,
    sourcePhoneNumber: record.source_phone_number,
    phoneNumberId: record.phone_number_id,
    accessToken: decryptSecret(record.access_token_encrypted),
    appSecret: record.app_secret_encrypted ? decryptSecret(record.app_secret_encrypted) : '',
    forwardToNumber: record.forward_to_number,
    keywordFilters: record.keyword_filters
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    forwardingEnabled: record.forwarding_enabled === 1,
    webhookVerifyToken: record.webhook_verify_token,
    webhookUrl: record.webhook_url,
    status: record.status,
  };
}

export function getWorkspaceByUserId(userId: string): WorkspaceView | null {
  const db = getDatabase();
  const record = db
    .prepare('SELECT * FROM workspaces WHERE user_id = ?')
    .get(userId) as WorkspaceRecord | undefined;

  return record ? toWorkspaceView(record) : null;
}

export function upsertWorkspace(userId: string, input: WorkspaceInput): WorkspaceView {
  const db = getDatabase();
  const existing = db
    .prepare('SELECT * FROM workspaces WHERE user_id = ?')
    .get(userId) as WorkspaceRecord | undefined;
  const timestamp = new Date().toISOString();
  const workspaceId = existing?.id ?? createId('workspace');
  const verifyToken = existing?.webhook_verify_token ?? createId('verify');
  const webhookUrl =
    existing?.webhook_url ??
    `${(process.env['PUBLIC_APP_URL'] ?? 'https://your-domain.com').replace(/\/$/, '')}/webhook`;
  const encryptedAccessToken =
    input.accessToken && input.accessToken.trim().length > 0
      ? encryptSecret(input.accessToken.trim())
      : existing?.access_token_encrypted;
  const accessTokenPreview =
    input.accessToken && input.accessToken.trim().length > 0
      ? input.accessToken.trim().slice(0, 8)
      : existing?.access_token_preview;
  const encryptedAppSecret =
    input.appSecret && input.appSecret.trim().length > 0
      ? encryptSecret(input.appSecret.trim())
      : existing?.app_secret_encrypted ?? null;

  if (!encryptedAccessToken || !accessTokenPreview) {
    throw new Error('Access token is required when creating a workspace.');
  }

  db.prepare(
    `INSERT INTO workspaces (
      id, user_id, business_label, source_phone_number, phone_number_id,
      access_token_encrypted, app_secret_encrypted, access_token_preview, forward_to_number, keyword_filters,
      forwarding_enabled, webhook_verify_token, webhook_url, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      business_label = excluded.business_label,
      source_phone_number = excluded.source_phone_number,
      phone_number_id = excluded.phone_number_id,
      access_token_encrypted = excluded.access_token_encrypted,
      app_secret_encrypted = excluded.app_secret_encrypted,
      access_token_preview = excluded.access_token_preview,
      forward_to_number = excluded.forward_to_number,
      keyword_filters = excluded.keyword_filters,
      forwarding_enabled = excluded.forwarding_enabled,
      status = excluded.status,
      updated_at = excluded.updated_at`,
  ).run(
    workspaceId,
    userId,
    input.businessLabel,
    input.sourcePhoneNumber,
    input.phoneNumberId,
    encryptedAccessToken,
    encryptedAppSecret,
    accessTokenPreview,
    input.forwardToNumber,
    input.keywordFilters.join(','),
    input.forwardingEnabled ? 1 : 0,
    verifyToken,
    webhookUrl,
    'needs_webhook_setup',
    existing?.created_at ?? timestamp,
    timestamp,
  );

  return getWorkspaceByUserId(userId) as WorkspaceView;
}

export function getWorkspaceRuntimeByVerifyToken(verifyToken: string): WorkspaceRuntime | null {
  const db = getDatabase();
  const record = db
    .prepare('SELECT * FROM workspaces WHERE webhook_verify_token = ?')
    .get(verifyToken) as WorkspaceRecord | undefined;
  return record ? toWorkspaceRuntime(record) : null;
}

export function getWorkspaceRuntimeByPhoneNumberId(phoneNumberId: string): WorkspaceRuntime | null {
  const db = getDatabase();
  const record = db
    .prepare('SELECT * FROM workspaces WHERE phone_number_id = ?')
    .get(phoneNumberId) as WorkspaceRecord | undefined;
  return record ? toWorkspaceRuntime(record) : null;
}
