import axios from 'axios';
import config from '../config';
import { getForwardToNumber } from '../controllers/configController';
import { SendMessagePayload, SendMessageResponse } from '../types/whatsapp';
import { withRetry } from '../utils/retry';
import logger from './loggerService';
import {
  graphUrl,
  MetaApiError,
  OUTSIDE_SESSION_WINDOW_CODE,
  toMetaApiError,
} from './metaGraphService';

export interface WhatsappRuntimeConfig {
  accessToken: string;
  phoneNumberId: string;
}

/** Approved template used when free-form text is refused (24h window closed). */
export interface ForwardTemplate {
  name: string;
  language: string;
}

export interface TemplateParameter {
  type: 'text';
  text: string;
}

const defaultRuntime = (): WhatsappRuntimeConfig => ({
  accessToken: config.whatsappAccessToken,
  phoneNumberId: config.whatsappPhoneNumberId,
});

async function postMessage(
  payload: Record<string, unknown>,
  runtimeConfig: WhatsappRuntimeConfig,
): Promise<SendMessageResponse> {
  const url = graphUrl(`${runtimeConfig.phoneNumberId}/messages`);
  const headers = {
    Authorization: `Bearer ${runtimeConfig.accessToken}`,
    'Content-Type': 'application/json',
  };

  try {
    return await withRetry(
      async () => {
        try {
          const response = await axios.post<SendMessageResponse>(url, payload, {
            headers,
            timeout: config.whatsappTimeoutMs,
          });
          return response.data;
        } catch (error) {
          throw toMetaApiError(error, 'WhatsApp API error');
        }
      },
      config.maxRetryAttempts,
      config.retryBaseDelayMs,
      (error) => !(error instanceof MetaApiError) || error.transient,
    );
  } catch (error) {
    logger.error((error as Error).message);
    throw error;
  }
}

/**
 * Template parameters may not contain newlines, tabs or 4+ consecutive
 * spaces, and the rendered body is capped at 1024 characters.
 */
export function toTemplateText(value: string, maxLength = 700): string {
  const flat = value
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/ {4,}/g, '   ')
    .trim();
  return flat.length > maxLength ? `${flat.slice(0, maxLength - 1)}…` : flat || '-';
}

export async function sendTemplateMessage(
  to: string,
  template: ForwardTemplate,
  bodyParameters: string[],
  runtimeConfig: WhatsappRuntimeConfig,
): Promise<SendMessageResponse> {
  const components =
    bodyParameters.length > 0
      ? [
          {
            type: 'body',
            parameters: bodyParameters.map<TemplateParameter>((text) => ({
              type: 'text',
              text: toTemplateText(text),
            })),
          },
        ]
      : [];

  const response = await postMessage(
    {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: { name: template.name, language: { code: template.language }, components },
    },
    runtimeConfig,
  );
  logger.info(`Template "${template.name}" sent to ${to}`);
  return response;
}

export async function forwardMessageTo(
  from: string,
  originalText: string,
  to: string,
  runtimeConfig: WhatsappRuntimeConfig = defaultRuntime(),
  fallbackTemplate?: ForwardTemplate,
): Promise<SendMessageResponse> {
  const payload: SendMessagePayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: `Forwarded from ${from}:\n\n${originalText}`,
    },
  };

  logger.info(`Forwarding message from ${from} to ${to}`);

  try {
    const response = await postMessage(
      payload as unknown as Record<string, unknown>,
      runtimeConfig,
    );
    logger.info(`Message forwarded successfully. ID: ${response.messages?.[0]?.id ?? 'unknown'}`);
    return response;
  } catch (error) {
    // Business-initiated free-form text is only allowed within 24h of the
    // recipient's last message. Outside it, Meta requires a template.
    if (
      fallbackTemplate?.name &&
      error instanceof MetaApiError &&
      error.code === OUTSIDE_SESSION_WINDOW_CODE
    ) {
      logger.info(`24h window closed for ${to}; forwarding via template ${fallbackTemplate.name}`);
      return sendTemplateMessage(to, fallbackTemplate, [`+${from}`, originalText], runtimeConfig);
    }
    throw error;
  }
}

/**
 * Sends a plain text message (used by inbox replies — no "Forwarded from" prefix).
 */
export async function sendTextMessage(
  to: string,
  text: string,
  runtimeConfig: WhatsappRuntimeConfig,
): Promise<SendMessageResponse> {
  const payload: SendMessagePayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  };

  const response = await postMessage(payload as unknown as Record<string, unknown>, runtimeConfig);
  logger.info(`Reply sent to ${to}. ID: ${response.messages?.[0]?.id ?? 'unknown'}`);
  return response;
}

export async function forwardMessage(
  from: string,
  originalText: string,
): Promise<SendMessageResponse> {
  const forwardTo = getForwardToNumber() || config.forwardToNumber;
  return forwardMessageTo(from, originalText, forwardTo);
}

export async function forwardToMultiple(
  from: string,
  originalText: string,
  recipients: string[],
  runtimeConfig?: WhatsappRuntimeConfig,
  fallbackTemplate?: ForwardTemplate,
): Promise<{ to: string; success: boolean; error?: string }[]> {
  const results = await Promise.allSettled(
    recipients.map(async (to) => {
      await forwardMessageTo(from, originalText, to, runtimeConfig, fallbackTemplate);
      return to;
    }),
  );

  return results.map((result, i) => ({
    to: recipients[i],
    success: result.status === 'fulfilled',
    error: result.status === 'rejected' ? (result.reason as Error).message : undefined,
  }));
}
