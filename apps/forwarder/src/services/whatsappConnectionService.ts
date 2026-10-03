import crypto from 'crypto';
import config from '../config';
import {
  ConnectionInput,
  ConnectionMethod,
  findPhoneNumberOwner,
  saveConnection,
  WorkspaceView,
} from '../db/workspaceStore';
import logger from './loggerService';
import {
  ensureForwardTemplate,
  exchangeCodeForToken,
  FORWARD_TEMPLATE,
  getPhoneNumberDetails,
  inspectToken,
  listWabaPhoneNumbers,
  MetaApiError,
  PhoneNumberDetails,
  registerPhoneNumber,
  subscribeAppToWaba,
} from './metaGraphService';

/**
 * Turns proof of access (an Embedded Signup code, or a pasted token) into a
 * working, verified WhatsApp connection on a workspace.
 */

export class ConnectionError extends Error {
  readonly httpStatus: number;

  constructor(message: string, httpStatus = 400) {
    super(message);
    this.name = 'ConnectionError';
    this.httpStatus = httpStatus;
  }
}

export interface VerifiedNumber {
  accessToken: string;
  wabaId: string;
  phone: PhoneNumberDetails;
}

function asConnectionError(error: unknown): ConnectionError {
  if (error instanceof ConnectionError) return error;
  if (error instanceof MetaApiError) {
    const status = error.status === 503 ? 503 : error.status === 404 ? 404 : 400;
    return new ConnectionError(error.message, status);
  }
  return new ConnectionError((error as Error).message);
}

/**
 * Proves the token controls the phone number: the number must be listed under
 * the WABA when read with this token. Client-supplied IDs are never trusted on
 * their own — they only name what the token is checked against.
 */
export async function verifyNumberAccess(
  accessToken: string,
  wabaId: string,
  phoneNumberId: string,
): Promise<VerifiedNumber> {
  try {
    const phones = await listWabaPhoneNumbers(wabaId, accessToken);
    if (!phones.some((phone) => phone.id === phoneNumberId)) {
      throw new ConnectionError(
        'That phone number does not belong to the selected WhatsApp Business Account.',
        403,
      );
    }
    const phone = await getPhoneNumberDetails(phoneNumberId, accessToken);
    return { accessToken, wabaId, phone };
  } catch (error) {
    throw asConnectionError(error);
  }
}

export async function verifyEmbeddedSignupCode(
  code: string,
  wabaId: string,
  phoneNumberId: string,
): Promise<VerifiedNumber> {
  let accessToken: string;
  try {
    accessToken = await exchangeCodeForToken(code);
  } catch (error) {
    throw asConnectionError(error);
  }
  return verifyNumberAccess(accessToken, wabaId, phoneNumberId);
}

/** A phone number can route webhooks to only one workspace. */
export function assertNumberAvailable(phoneNumberId: string, userId: string): void {
  const owner = findPhoneNumberOwner(phoneNumberId);
  if (owner && owner !== userId) {
    throw new ConnectionError(
      'This WhatsApp number is already connected to another account. Log in to that account, or disconnect it there first.',
      409,
    );
  }
}

interface ActivationResult {
  status: ConnectionInput['status'];
  twoStepPin?: string;
  forwardTemplateName?: string;
  warnings: string[];
}

/**
 * Wires the number up for forwarding. Only the webhook subscription is
 * essential for Embedded Signup; registration and the template are best-effort
 * and reported back as warnings the user can act on.
 */
async function activate(
  number: VerifiedNumber,
  method: ConnectionMethod,
  tokenAppId: string,
): Promise<ActivationResult> {
  const warnings: string[] = [];
  const webhooksComeToUs = method === 'embedded_signup' || tokenAppId === config.metaAppId;

  try {
    await subscribeAppToWaba(number.wabaId, number.accessToken);
  } catch (error) {
    if (method === 'embedded_signup') throw asConnectionError(error);
    warnings.push(`${(error as Error).message}. Subscribe your app to the WABA in Meta.`);
  }

  let twoStepPin: string | undefined;
  if (number.phone.platformType !== 'CLOUD_API') {
    const pin = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    try {
      await registerPhoneNumber(number.phone.id, number.accessToken, pin);
      twoStepPin = pin;
    } catch (error) {
      warnings.push(
        `${(error as Error).message}. If the number already has a two-step verification PIN, ` +
          'register it from WhatsApp Manager, then reconnect.',
      );
    }
  }

  let forwardTemplateName: string | undefined;
  try {
    await ensureForwardTemplate(number.wabaId, number.accessToken);
    forwardTemplateName = FORWARD_TEMPLATE.name;
  } catch (error) {
    warnings.push(
      `${(error as Error).message}. Forwarding to numbers that haven't messaged you in 24h ` +
        'needs an approved template — set one in Settings.',
    );
  }

  warnings.forEach((warning) => logger.warn(`WhatsApp activation: ${warning}`));
  return {
    status: webhooksComeToUs ? 'connected' : 'needs_webhook_setup',
    twoStepPin,
    forwardTemplateName,
    warnings,
  };
}

/**
 * Activates a verified number and saves it on the user's workspace.
 */
export async function connectVerifiedNumber(params: {
  userId: string;
  number: VerifiedNumber;
  method: ConnectionMethod;
  appSecret?: string;
  businessLabel?: string;
  webhookBaseUrl?: string;
}): Promise<WorkspaceView> {
  const { userId, number, method } = params;
  assertNumberAvailable(number.phone.id, userId);

  let tokenAppId = '';
  if (method === 'manual') {
    const info = await inspectToken(number.accessToken).catch(() => null);
    if (info && !info.isValid) {
      throw new ConnectionError('This access token is expired or has been revoked.');
    }
    tokenAppId = info?.appId ?? '';
  }

  const activation = await activate(number, method, tokenAppId);

  return saveConnection(userId, {
    accessToken: number.accessToken,
    phoneNumberId: number.phone.id,
    wabaId: number.wabaId,
    displayPhoneNumber: number.phone.displayPhoneNumber,
    verifiedName: number.phone.verifiedName,
    businessLabel: params.businessLabel,
    connectionMethod: method,
    status: activation.status,
    appSecret: params.appSecret,
    twoStepPin: activation.twoStepPin,
    forwardTemplateName: activation.forwardTemplateName,
    setupWarnings: activation.warnings,
    webhookBaseUrl: params.webhookBaseUrl,
  });
}
