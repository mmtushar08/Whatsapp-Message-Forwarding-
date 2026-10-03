import type axios from 'axios';

/**
 * A URL-routed stand-in for the Graph API endpoints this app uses. Requests
 * that don't carry the fake account's token are rejected the way Meta would,
 * so tests exercise the real ownership checks rather than bypassing them.
 */

export interface FakeMetaAccount {
  code: string;
  token: string;
  appId: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhoneNumber: string;
  verifiedName: string;
  platformType: string;
  templates: Array<{
    name: string;
    language: string;
    status: string;
    category: string;
    components: Array<{ type: string; text?: string }>;
  }>;
}

export function fakeMetaAccount(overrides: Partial<FakeMetaAccount> = {}): FakeMetaAccount {
  return {
    code: 'es-code-123',
    token: 'EAAB-business-token',
    appId: 'test-app-id',
    wabaId: 'waba_1',
    phoneNumberId: 'pn_1',
    displayPhoneNumber: '+91 98765 43210',
    verifiedName: 'Acme Support',
    platformType: 'CLOUD_API',
    templates: [
      {
        name: 'follow_up',
        language: 'en',
        status: 'APPROVED',
        category: 'UTILITY',
        components: [{ type: 'BODY', text: 'Hi {{1}}, following up about {{2}}.' }],
      },
      {
        name: 'payment_reminder',
        language: 'en',
        status: 'PENDING',
        category: 'UTILITY',
        components: [{ type: 'BODY', text: 'Reminder: {{1}} is due.' }],
      },
    ],
    ...overrides,
  };
}

export function graphError(status: number, code: number, message: string): Error {
  return Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { error: { message, code } } },
  });
}

type Mocked = jest.Mocked<typeof axios>;
interface RequestConfig {
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface GraphCalls {
  sentMessages: Array<{ phoneNumberId: string; body: Record<string, unknown> }>;
  posts: string[];
}

/**
 * Installs the fake on a jest-mocked axios. `onSend` may throw (e.g. a
 * graphError) to simulate a failed send.
 */
export function installMetaGraphMock(
  mockedAxios: Mocked,
  accounts: FakeMetaAccount[],
  onSend?: (body: Record<string, unknown>) => void,
): GraphCalls {
  const calls: GraphCalls = { sentMessages: [], posts: [] };
  const byToken = (cfg?: RequestConfig): FakeMetaAccount => {
    const token = cfg?.headers?.['Authorization']?.replace(/^Bearer /, '');
    const account = accounts.find((a) => a.token === token);
    if (!account) throw graphError(401, 190, 'Invalid OAuth access token.');
    return account;
  };

  mockedAxios.get.mockImplementation((async (url: string, cfg?: RequestConfig) => {
    const path = new URL(url).pathname.replace(/^\/v[\d.]+\//, '');

    if (path === 'oauth/access_token') {
      const account = accounts.find((a) => a.code === cfg?.params?.['code']);
      if (!account) throw graphError(400, 100, 'Invalid verification code format.');
      return { data: { access_token: account.token } };
    }

    const account = byToken(cfg);
    if (path === 'debug_token') {
      return {
        data: {
          data: {
            app_id: account.appId,
            is_valid: true,
            granular_scopes: [
              { scope: 'whatsapp_business_management', target_ids: [account.wabaId] },
            ],
          },
        },
      };
    }
    if (path === `${account.wabaId}/phone_numbers`) {
      return {
        data: {
          data: [
            {
              id: account.phoneNumberId,
              display_phone_number: account.displayPhoneNumber,
              verified_name: account.verifiedName,
            },
          ],
        },
      };
    }
    if (path === `${account.wabaId}/message_templates`) {
      return { data: { data: account.templates } };
    }
    if (path === account.wabaId) {
      return { data: { id: account.wabaId, name: `${account.verifiedName} WABA` } };
    }
    if (path === account.phoneNumberId) {
      return {
        data: {
          id: account.phoneNumberId,
          display_phone_number: account.displayPhoneNumber,
          verified_name: account.verifiedName,
          platform_type: account.platformType,
        },
      };
    }
    throw graphError(403, 200, 'Permission denied for this object.');
  }) as never);

  mockedAxios.post.mockImplementation((async (
    url: string,
    body: Record<string, unknown>,
    cfg?: RequestConfig,
  ) => {
    const path = new URL(url).pathname.replace(/^\/v[\d.]+\//, '');
    calls.posts.push(path);
    const account = byToken(cfg);

    if (path === `${account.wabaId}/subscribed_apps`) return { data: { success: true } };
    if (path === `${account.wabaId}/message_templates`) return { data: { id: 'tpl_1' } };
    if (path === `${account.phoneNumberId}/register`) return { data: { success: true } };
    if (path === `${account.phoneNumberId}/messages`) {
      onSend?.(body);
      calls.sentMessages.push({ phoneNumberId: account.phoneNumberId, body });
      return {
        data: {
          messaging_product: 'whatsapp',
          contacts: [{ input: body['to'], wa_id: body['to'] }],
          messages: [{ id: `wamid.${calls.sentMessages.length}` }],
        },
      };
    }
    throw graphError(403, 200, 'Permission denied for this object.');
  }) as never);

  return calls;
}
