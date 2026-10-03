import { createId, decryptSecret, encryptSecret } from '../services/authService';
import { getDatabase } from './database';

export type ConnectionMethod = 'embedded_signup' | 'manual';
export type WorkspaceStatus = 'needs_webhook_setup' | 'connected';

export interface WorkspaceRecord {
  id: string;
  user_id: string;
  business_label: string;
  source_phone_number: string;
  phone_number_id: string;
  waba_id: string;
  access_token_encrypted: string;
  app_secret_encrypted: string | null;
  access_token_preview: string;
  forward_to_number: string;
  extra_recipients: string;
  keyword_filters: string;
  forwarding_enabled: number;
  webhook_verify_token: string;
  webhook_url: string;
  webhook_relay_url: string;
  email_forward_to: string;
  status: string;
  connection_method: string;
  last_webhook_at: string;
  forward_template_name: string;
  forward_template_language: string;
  two_step_pin_encrypted: string | null;
  setup_warnings: string;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceView {
  id: string;
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
  status: string;
  connectionMethod: ConnectionMethod;
  lastWebhookAt: string;
  forwardTemplateName: string;
  forwardTemplateLanguage: string;
  /** Two-step verification PIN we set when registering the number, if any. */
  twoStepPin: string;
  setupWarnings: string[];
  updatedAt: string;
}

/** Fields a user edits from Settings / onboarding. Connection state is untouched. */
export interface WorkspaceSettingsInput {
  businessLabel: string;
  sourcePhoneNumber: string;
  phoneNumberId: string;
  accessToken?: string;
  appSecret?: string;
  forwardToNumber: string;
  extraRecipients: string[];
  keywordFilters: string[];
  forwardingEnabled: boolean;
  webhookRelayUrl: string;
  emailForwardTo: string;
  forwardTemplateName?: string;
  forwardTemplateLanguage?: string;
  webhookBaseUrl?: string;
}

/** A verified WhatsApp connection (Embedded Signup or manual token import). */
export interface ConnectionInput {
  accessToken: string;
  phoneNumberId: string;
  wabaId: string;
  displayPhoneNumber: string;
  verifiedName: string;
  connectionMethod: ConnectionMethod;
  status: WorkspaceStatus;
  appSecret?: string;
  twoStepPin?: string;
  forwardTemplateName?: string;
  setupWarnings: string[];
  webhookBaseUrl?: string;
}

export interface WorkspaceRuntime {
  id: string;
  userId: string;
  businessLabel: string;
  sourcePhoneNumber: string;
  phoneNumberId: string;
  wabaId: string;
  accessToken: string;
  appSecret: string;
  forwardToNumber: string;
  extraRecipients: string[];
  keywordFilters: string[];
  forwardingEnabled: boolean;
  webhookVerifyToken: string;
  webhookUrl: string;
  webhookRelayUrl: string;
  emailForwardTo: string;
  status: string;
  forwardTemplateName: string;
  forwardTemplateLanguage: string;
}

function parseCSV(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function toWorkspaceView(record: WorkspaceRecord): WorkspaceView {
  return {
    id: record.id,
    businessLabel: record.business_label,
    sourcePhoneNumber: record.source_phone_number,
    phoneNumberId: record.phone_number_id,
    wabaId: record.waba_id ?? '',
    accessTokenPreview: record.access_token_preview,
    appSecretConfigured: Boolean(record.app_secret_encrypted),
    forwardToNumber: record.forward_to_number,
    extraRecipients: parseCSV(record.extra_recipients ?? ''),
    keywordFilters: parseCSV(record.keyword_filters),
    forwardingEnabled: record.forwarding_enabled === 1,
    webhookVerifyToken: record.webhook_verify_token,
    webhookUrl: record.webhook_url,
    webhookRelayUrl: record.webhook_relay_url ?? '',
    emailForwardTo: record.email_forward_to ?? '',
    status: record.status,
    connectionMethod: record.connection_method === 'embedded_signup' ? 'embedded_signup' : 'manual',
    lastWebhookAt: record.last_webhook_at ?? '',
    forwardTemplateName: record.forward_template_name ?? '',
    forwardTemplateLanguage: record.forward_template_language || 'en',
    twoStepPin: record.two_step_pin_encrypted ? decryptSecret(record.two_step_pin_encrypted) : '',
    setupWarnings: (record.setup_warnings ?? '').split('\n').filter(Boolean),
    updatedAt: record.updated_at,
  };
}

function toWorkspaceRuntime(record: WorkspaceRecord): WorkspaceRuntime {
  return {
    id: record.id,
    userId: record.user_id,
    businessLabel: record.business_label,
    sourcePhoneNumber: record.source_phone_number,
    phoneNumberId: record.phone_number_id,
    wabaId: record.waba_id ?? '',
    accessToken: decryptSecret(record.access_token_encrypted),
    appSecret: record.app_secret_encrypted ? decryptSecret(record.app_secret_encrypted) : '',
    forwardToNumber: record.forward_to_number,
    extraRecipients: parseCSV(record.extra_recipients ?? ''),
    keywordFilters: parseCSV(record.keyword_filters).map((k) => k.toLowerCase()),
    forwardingEnabled: record.forwarding_enabled === 1,
    webhookVerifyToken: record.webhook_verify_token,
    webhookUrl: record.webhook_url,
    webhookRelayUrl: record.webhook_relay_url ?? '',
    emailForwardTo: record.email_forward_to ?? '',
    status: record.status,
    forwardTemplateName: record.forward_template_name ?? '',
    forwardTemplateLanguage: record.forward_template_language || 'en',
  };
}

function getRecordByUserId(userId: string): WorkspaceRecord | undefined {
  return getDatabase().prepare('SELECT * FROM workspaces WHERE user_id = ?').get(userId) as
    | WorkspaceRecord
    | undefined;
}

function webhookUrlFor(baseUrl: string | undefined): string {
  const base = (baseUrl ?? process.env['PUBLIC_APP_URL'] ?? '').replace(/\/$/, '');
  return `${base || 'https://your-domain.com'}/webhook`;
}

function tokenPreview(token: string): string {
  return token.slice(0, 8);
}

export function getWorkspaceByUserId(userId: string): WorkspaceView | null {
  const record = getRecordByUserId(userId);
  return record ? toWorkspaceView(record) : null;
}

export function getWorkspaceRuntimeByUserId(userId: string): WorkspaceRuntime | null {
  const record = getRecordByUserId(userId);
  return record ? toWorkspaceRuntime(record) : null;
}

/**
 * Returns the user that already owns a phone number ID, if any. A phone number
 * routes inbound webhooks, so it can belong to exactly one workspace.
 */
export function findPhoneNumberOwner(phoneNumberId: string): string | null {
  const row = getDatabase()
    .prepare('SELECT user_id FROM workspaces WHERE phone_number_id = ? LIMIT 1')
    .get(phoneNumberId) as { user_id: string } | undefined;
  return row?.user_id ?? null;
}

/**
 * Creates or updates a workspace from the Settings form. Connection metadata
 * (status, method, webhook health, PIN, warnings) is preserved on update.
 */
export function upsertWorkspace(userId: string, input: WorkspaceSettingsInput): WorkspaceView {
  const db = getDatabase();
  const existing = getRecordByUserId(userId);
  const timestamp = new Date().toISOString();
  const newToken = input.accessToken?.trim() ?? '';
  const newAppSecret = input.appSecret?.trim() ?? '';

  const accessTokenEncrypted = newToken
    ? encryptSecret(newToken)
    : existing?.access_token_encrypted;
  if (!accessTokenEncrypted) {
    throw new Error('Access token is required when creating a workspace.');
  }

  const fields = {
    business_label: input.businessLabel,
    source_phone_number: input.sourcePhoneNumber,
    phone_number_id: input.phoneNumberId,
    access_token_encrypted: accessTokenEncrypted,
    access_token_preview: newToken
      ? tokenPreview(newToken)
      : (existing?.access_token_preview ?? ''),
    app_secret_encrypted: newAppSecret
      ? encryptSecret(newAppSecret)
      : (existing?.app_secret_encrypted ?? null),
    forward_to_number: input.forwardToNumber,
    extra_recipients: input.extraRecipients.join(','),
    keyword_filters: input.keywordFilters.join(','),
    forwarding_enabled: input.forwardingEnabled ? 1 : 0,
    webhook_relay_url: input.webhookRelayUrl.trim(),
    email_forward_to: input.emailForwardTo.trim(),
    forward_template_name:
      input.forwardTemplateName?.trim() ?? existing?.forward_template_name ?? '',
    forward_template_language:
      input.forwardTemplateLanguage?.trim() || existing?.forward_template_language || 'en',
    updated_at: timestamp,
  };

  if (existing) {
    const assignments = Object.keys(fields)
      .map((column) => `${column} = @${column}`)
      .join(', ');
    db.prepare(`UPDATE workspaces SET ${assignments} WHERE user_id = @user_id`).run({
      ...fields,
      user_id: userId,
    });
  } else {
    insertWorkspace({
      ...fields,
      id: createId('workspace'),
      user_id: userId,
      waba_id: '',
      webhook_verify_token: createId('verify'),
      webhook_url: webhookUrlFor(input.webhookBaseUrl),
      status: 'needs_webhook_setup',
      connection_method: 'manual',
      created_at: timestamp,
    });
  }

  return getWorkspaceByUserId(userId) as WorkspaceView;
}

/**
 * Stores a freshly verified WhatsApp connection. Forwarding rules the user
 * already configured are kept; only connection fields change.
 */
export function saveConnection(userId: string, input: ConnectionInput): WorkspaceView {
  const db = getDatabase();
  const existing = getRecordByUserId(userId);
  const timestamp = new Date().toISOString();
  const token = input.accessToken.trim();

  if (!token) {
    throw new Error('access_token is required');
  }

  const fields = {
    business_label:
      existing?.business_label && existing.business_label !== 'WhatsApp Business Account'
        ? existing.business_label
        : input.verifiedName || 'WhatsApp Business Account',
    source_phone_number: input.displayPhoneNumber || existing?.source_phone_number || '',
    phone_number_id: input.phoneNumberId.trim(),
    waba_id: input.wabaId.trim(),
    access_token_encrypted: encryptSecret(token),
    access_token_preview: tokenPreview(token),
    app_secret_encrypted: input.appSecret?.trim()
      ? encryptSecret(input.appSecret.trim())
      : (existing?.app_secret_encrypted ?? null),
    status: input.status,
    connection_method: input.connectionMethod,
    forward_template_name: input.forwardTemplateName ?? existing?.forward_template_name ?? '',
    two_step_pin_encrypted: input.twoStepPin
      ? encryptSecret(input.twoStepPin)
      : (existing?.two_step_pin_encrypted ?? null),
    setup_warnings: input.setupWarnings.join('\n'),
    updated_at: timestamp,
  };

  if (existing) {
    const assignments = Object.keys(fields)
      .map((column) => `${column} = @${column}`)
      .join(', ');
    db.prepare(`UPDATE workspaces SET ${assignments} WHERE user_id = @user_id`).run({
      ...fields,
      user_id: userId,
    });
  } else {
    insertWorkspace({
      ...fields,
      id: createId('workspace'),
      user_id: userId,
      forward_to_number: '',
      extra_recipients: '',
      keyword_filters: '',
      forwarding_enabled: 1,
      webhook_verify_token: createId('verify'),
      webhook_url: webhookUrlFor(input.webhookBaseUrl),
      webhook_relay_url: '',
      email_forward_to: '',
      created_at: timestamp,
    });
  }

  return getWorkspaceByUserId(userId) as WorkspaceView;
}

function insertWorkspace(row: Record<string, string | number | null>): void {
  const columns = Object.keys(row);
  getDatabase()
    .prepare(
      `INSERT INTO workspaces (${columns.join(', ')})
       VALUES (${columns.map((column) => `@${column}`).join(', ')})`,
    )
    .run(row);
}

/**
 * Records that Meta reached us for this workspace — proof the webhook is wired
 * up, so a workspace waiting on webhook setup becomes connected.
 */
export function markWebhookActivity(workspaceId: string): void {
  getDatabase()
    .prepare(`UPDATE workspaces SET last_webhook_at = ?, status = 'connected' WHERE id = ?`)
    .run(new Date().toISOString(), workspaceId);
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
