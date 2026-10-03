import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import config from '../config';

/**
 * Every call this app makes to Meta's Graph API goes through this module, so
 * the API version, host, timeouts and error translation live in one place.
 */

const TIMEOUT_MS = 15_000;

/** Meta error code for "more than 24 hours since the recipient last replied". */
export const OUTSIDE_SESSION_WINDOW_CODE = 131047;

export class MetaApiError extends Error {
  readonly status: number | undefined;
  readonly code: number | undefined;
  readonly subcode: number | undefined;

  constructor(message: string, status?: number, code?: number, subcode?: number) {
    super(message);
    this.name = 'MetaApiError';
    this.status = status;
    this.code = code;
    this.subcode = subcode;
  }

  /** Network failures, rate limits and 5xx are worth retrying; 4xx are not. */
  get transient(): boolean {
    return this.status === undefined || this.status === 429 || this.status >= 500;
  }
}

interface GraphErrorBody {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    error_user_msg?: string;
    error_data?: { details?: string };
  };
}

export function toMetaApiError(error: unknown, context: string): MetaApiError {
  if (error instanceof MetaApiError) return error;
  // Duck-typed rather than axios.isAxiosError() so it also holds when axios is mocked.
  const axiosError = error as AxiosError<GraphErrorBody> | undefined;
  if (axiosError && (axiosError.isAxiosError || axiosError.response)) {
    const body = axiosError.response?.data?.error;
    const detail =
      body?.error_user_msg || body?.error_data?.details || body?.message || axiosError.message;
    return new MetaApiError(
      `${context}: ${detail}`,
      axiosError.response?.status,
      body?.code,
      body?.error_subcode,
    );
  }
  return new MetaApiError(`${context}: ${(error as Error | undefined)?.message ?? String(error)}`);
}

export function graphUrl(path: string): string {
  return `${config.graphApiBaseUrl}/${config.graphApiVersion}/${path.replace(/^\//, '')}`;
}

function authHeaders(accessToken: string): AxiosRequestConfig['headers'] {
  return { Authorization: `Bearer ${accessToken}` };
}

async function graphGet<T>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {},
): Promise<T> {
  const response = await axios.get<T>(graphUrl(path), {
    params,
    headers: authHeaders(accessToken),
    timeout: TIMEOUT_MS,
  });
  return response.data;
}

async function graphPost<T>(path: string, accessToken: string, body?: unknown): Promise<T> {
  // No body means no payload at all — a literal JSON `null` is rejected.
  const response = await axios.post<T>(graphUrl(path), body, {
    headers:
      body === undefined
        ? authHeaders(accessToken)
        : { ...authHeaders(accessToken), 'Content-Type': 'application/json' },
    timeout: TIMEOUT_MS,
  });
  return response.data;
}

/* ── Embedded Signup ─────────────────────────────────────────────────────── */

export function isEmbeddedSignupConfigured(): boolean {
  return Boolean(config.metaAppId && config.metaAppSecret);
}

/**
 * Exchanges the short-lived code returned by FB.login() for a business
 * integration system user token. Codes are single-use, expire in ~30s and are
 * bound to this app, so a successful exchange proves the browser just
 * completed Embedded Signup with our app.
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  if (!isEmbeddedSignupConfigured()) {
    throw new MetaApiError(
      'WhatsApp signup is not configured on the server (META_APP_ID / META_APP_SECRET missing).',
      503,
    );
  }

  try {
    const response = await axios.get<{ access_token?: string }>(graphUrl('oauth/access_token'), {
      params: { client_id: config.metaAppId, client_secret: config.metaAppSecret, code },
      timeout: TIMEOUT_MS,
    });
    if (!response.data?.access_token) {
      throw new MetaApiError('Meta did not return an access token for this signup.');
    }
    return response.data.access_token;
  } catch (error) {
    throw toMetaApiError(error, 'Could not complete the Meta signup');
  }
}

/* ── Token, WABA and phone number lookups ────────────────────────────────── */

export interface TokenInfo {
  appId: string;
  isValid: boolean;
  /** WABA IDs this token was granted, when Meta reports granular scopes. */
  wabaIds: string[];
}

export async function inspectToken(accessToken: string): Promise<TokenInfo> {
  try {
    const body = await graphGet<{
      data?: {
        app_id?: string;
        is_valid?: boolean;
        granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
      };
    }>('debug_token', accessToken, { input_token: accessToken });
    const data = body?.data ?? {};
    const wabaIds = new Set<string>();
    for (const scope of data.granular_scopes ?? []) {
      if (scope.scope.startsWith('whatsapp_business')) {
        scope.target_ids?.forEach((id) => wabaIds.add(id));
      }
    }
    return { appId: data.app_id ?? '', isValid: data.is_valid !== false, wabaIds: [...wabaIds] };
  } catch (error) {
    throw toMetaApiError(error, 'Could not inspect the access token');
  }
}

export interface PhoneNumberDetails {
  id: string;
  /** Digits only, country code first — e.g. "919876543210". */
  displayPhoneNumber: string;
  verifiedName: string;
  /** "CLOUD_API" once registered; anything else means /register is needed. */
  platformType: string;
}

export async function getPhoneNumberDetails(
  phoneNumberId: string,
  accessToken: string,
): Promise<PhoneNumberDetails> {
  try {
    const body = await graphGet<{
      id?: string;
      display_phone_number?: string;
      verified_name?: string;
      platform_type?: string;
    }>(encodeURIComponent(phoneNumberId), accessToken, {
      fields: 'id,display_phone_number,verified_name,platform_type',
    });
    return {
      id: body?.id ?? phoneNumberId,
      displayPhoneNumber: (body?.display_phone_number ?? '').replace(/\D/g, ''),
      verifiedName: body?.verified_name ?? '',
      platformType: body?.platform_type ?? '',
    };
  } catch (error) {
    const metaError = toMetaApiError(error, 'Could not read the WhatsApp phone number');
    if (metaError.status === 401 || metaError.status === 403) {
      throw new MetaApiError(
        'This access token cannot use that phone number. Check the token and Phone Number ID in Meta Business Settings.',
        403,
        metaError.code,
      );
    }
    if (metaError.status === 404 || metaError.code === 100) {
      throw new MetaApiError(
        'Phone Number ID not found. Make sure you copied it from the correct Meta app.',
        404,
        metaError.code,
      );
    }
    throw metaError;
  }
}

export interface WabaPhoneNumber {
  id: string;
  displayPhoneNumber: string;
  verifiedName: string;
}

export async function listWabaPhoneNumbers(
  wabaId: string,
  accessToken: string,
): Promise<WabaPhoneNumber[]> {
  try {
    const body = await graphGet<{
      data?: Array<{ id: string; display_phone_number?: string; verified_name?: string }>;
    }>(`${encodeURIComponent(wabaId)}/phone_numbers`, accessToken, {
      fields: 'id,display_phone_number,verified_name',
      limit: '100',
    });
    return (body?.data ?? []).map((phone) => ({
      id: phone.id,
      displayPhoneNumber: phone.display_phone_number ?? '',
      verifiedName: phone.verified_name ?? '',
    }));
  } catch (error) {
    throw toMetaApiError(
      error,
      'Could not list the phone numbers of this WhatsApp Business Account',
    );
  }
}

export async function getWabaName(wabaId: string, accessToken: string): Promise<string> {
  try {
    const body = await graphGet<{ name?: string }>(encodeURIComponent(wabaId), accessToken, {
      fields: 'name',
    });
    return body?.name ?? '';
  } catch {
    return '';
  }
}

/**
 * Finds every WABA a token can reach: first from the token's granular scopes,
 * then from the businesses it can see (owned and client WABAs).
 */
export async function discoverWabaIds(accessToken: string): Promise<string[]> {
  const fromScopes = (await inspectToken(accessToken)).wabaIds;
  if (fromScopes.length > 0) return fromScopes;

  try {
    const businesses = await graphGet<{ data?: Array<{ id: string }> }>(
      'me/businesses',
      accessToken,
      { fields: 'id', limit: '100' },
    );
    const ids = new Set<string>();
    for (const business of businesses?.data ?? []) {
      for (const edge of [
        'owned_whatsapp_business_accounts',
        'client_whatsapp_business_accounts',
      ]) {
        const wabas = await graphGet<{ data?: Array<{ id: string }> }>(
          `${business.id}/${edge}`,
          accessToken,
          { fields: 'id', limit: '100' },
        ).catch(() => ({ data: [] }));
        wabas?.data?.forEach((waba) => ids.add(waba.id));
      }
    }
    return [...ids];
  } catch (error) {
    throw toMetaApiError(error, 'Could not list WhatsApp Business Accounts for this token');
  }
}

/* ── Activation: webhooks, registration, templates ───────────────────────── */

/**
 * Subscribes the token's app to the WABA's webhooks. Without this Meta never
 * delivers that customer's inbound messages to us.
 */
export async function subscribeAppToWaba(wabaId: string, accessToken: string): Promise<void> {
  try {
    await graphPost(`${encodeURIComponent(wabaId)}/subscribed_apps`, accessToken);
  } catch (error) {
    throw toMetaApiError(error, 'Could not subscribe to webhooks for this WhatsApp account');
  }
}

/**
 * Registers a phone number for the Cloud API. `pin` becomes the number's
 * two-step verification PIN.
 */
export async function registerPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  pin: string,
): Promise<void> {
  try {
    await graphPost(`${encodeURIComponent(phoneNumberId)}/register`, accessToken, {
      messaging_product: 'whatsapp',
      pin,
    });
  } catch (error) {
    throw toMetaApiError(error, 'Could not register the phone number for the Cloud API');
  }
}

/** Template used to forward messages when the destination's 24h window is closed. */
export const FORWARD_TEMPLATE = {
  name: 'forward_alert',
  language: 'en',
  body:
    'You received a new WhatsApp message from {{1}}:\n\n{{2}}\n\n' +
    'Reply on WhatsApp to continue the conversation.',
};

/** Creates the forward-alert template; succeeds quietly if it already exists. */
export async function ensureForwardTemplate(wabaId: string, accessToken: string): Promise<void> {
  try {
    await graphPost(`${encodeURIComponent(wabaId)}/message_templates`, accessToken, {
      name: FORWARD_TEMPLATE.name,
      language: FORWARD_TEMPLATE.language,
      category: 'UTILITY',
      components: [
        {
          type: 'BODY',
          text: FORWARD_TEMPLATE.body,
          example: { body_text: [['+91 98765 43210', 'Is the 2BHK still available?']] },
        },
      ],
    });
  } catch (error) {
    const metaError = toMetaApiError(error, 'Could not create the forward_alert message template');
    // "Message template with that name already exists" — nothing to do.
    if (/already exists/i.test(metaError.message) || metaError.subcode === 2388023) return;
    throw metaError;
  }
}

export interface MessageTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  body: string;
  /** Number of {{n}} placeholders in the body. */
  variableCount: number;
}

export async function listMessageTemplates(
  wabaId: string,
  accessToken: string,
): Promise<MessageTemplate[]> {
  try {
    const body = await graphGet<{
      data?: Array<{
        name: string;
        language: string;
        status: string;
        category?: string;
        components?: Array<{ type: string; text?: string }>;
      }>;
    }>(`${encodeURIComponent(wabaId)}/message_templates`, accessToken, {
      fields: 'name,language,status,category,components',
      limit: '100',
    });
    return (body?.data ?? []).map((template) => {
      const text = template.components?.find((c) => c.type === 'BODY')?.text ?? '';
      const placeholders = new Set(text.match(/\{\{\d+\}\}/g) ?? []);
      return {
        name: template.name,
        language: template.language,
        status: template.status,
        category: template.category ?? '',
        body: text,
        variableCount: placeholders.size,
      };
    });
  } catch (error) {
    throw toMetaApiError(error, 'Could not load message templates from Meta');
  }
}
