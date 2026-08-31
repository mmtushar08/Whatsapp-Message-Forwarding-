import axios from 'axios';

const GRAPH_BASE = `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION || 'v22.0'}`;

function metaError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string } } | undefined;
    return data?.error?.message || error.message;
  }
  return error instanceof Error ? error.message : 'Unknown Meta API error';
}

export interface EmbeddedSignupResult {
  accessToken: string;
  wabaId: string;
  phoneNumberId: string;
  businessId?: string;
}

/**
 * Exchanges the short-lived Embedded Signup code for the customer-scoped
 * Business Integration System User token. The app secret never leaves the
 * backend.
 */
export async function exchangeEmbeddedSignupCode(code: string): Promise<string> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error('META_APP_ID and META_APP_SECRET must be configured on the server.');
  }

  try {
    const response = await axios.get<{ access_token?: string }>(
      `${GRAPH_BASE}/oauth/access_token`,
      {
        params: {
          client_id: appId,
          client_secret: appSecret,
          code,
        },
        timeout: 15000,
      },
    );

    if (!response.data.access_token) {
      throw new Error('Meta did not return a business access token.');
    }

    return response.data.access_token;
  } catch (error) {
    throw new Error(`Meta authorization-code exchange failed: ${metaError(error)}`);
  }
}

/**
 * Subscribes the Tech Provider app to the customer's WABA so the app can
 * receive WhatsApp webhook events for that account.
 */
export async function subscribeWabaToApp(wabaId: string, accessToken: string): Promise<void> {
  try {
    await axios.post(`${GRAPH_BASE}/${encodeURIComponent(wabaId)}/subscribed_apps`, null, {
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 15000,
    });
  } catch (error) {
    throw new Error(`Meta WABA webhook subscription failed: ${metaError(error)}`);
  }
}

export async function getPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
): Promise<{ displayPhoneNumber: string; verifiedName: string }> {
  try {
    const response = await axios.get<{
      display_phone_number?: string;
      verified_name?: string;
    }>(`${GRAPH_BASE}/${encodeURIComponent(phoneNumberId)}`, {
      params: { fields: 'display_phone_number,verified_name' },
      headers: { Authorization: `Bearer ${accessToken}` },
      timeout: 10000,
    });

    return {
      displayPhoneNumber: response.data.display_phone_number || '',
      verifiedName: response.data.verified_name || '',
    };
  } catch (error) {
    throw new Error(`Meta phone lookup failed: ${metaError(error)}`);
  }
}

export async function completeEmbeddedSignup(params: {
  code: string;
  wabaId: string;
  phoneNumberId: string;
  businessId?: string;
}): Promise<EmbeddedSignupResult> {
  const accessToken = await exchangeEmbeddedSignupCode(params.code);
  await subscribeWabaToApp(params.wabaId, accessToken);

  return {
    accessToken,
    wabaId: params.wabaId,
    phoneNumberId: params.phoneNumberId,
    businessId: params.businessId,
  };
}
