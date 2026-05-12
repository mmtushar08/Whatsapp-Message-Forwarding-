import axios, { AxiosError } from 'axios';
import config from '../config';
import { getForwardToNumber } from '../controllers/configController';
import { SendMessagePayload, SendMessageResponse } from '../types/whatsapp';
import { withRetry } from '../utils/retry';
import logger from './loggerService';

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

export interface WhatsappRuntimeConfig {
  accessToken: string;
  phoneNumberId: string;
}

export async function forwardMessageTo(
  from: string,
  originalText: string,
  to: string,
  runtimeConfig: WhatsappRuntimeConfig = {
    accessToken: config.whatsappAccessToken,
    phoneNumberId: config.whatsappPhoneNumberId,
  },
): Promise<SendMessageResponse> {
  const url = `${GRAPH_API_URL}/${runtimeConfig.phoneNumberId}/messages`;

  const payload: SendMessagePayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: `Forwarded from ${from}:\n\n${originalText}`,
    },
  };

  const headers = {
    Authorization: `Bearer ${runtimeConfig.accessToken}`,
    'Content-Type': 'application/json',
  };

  logger.info(`Forwarding message from ${from} to ${to}`);

  try {
    return await withRetry(
      async () => {
        const response = await axios.post<SendMessageResponse>(url, payload, {
          headers,
          timeout: config.whatsappTimeoutMs,
        });
        logger.info(
          `Message forwarded successfully. ID: ${response.data.messages?.[0]?.id ?? 'unknown'}`,
        );
        return response.data;
      },
      config.maxRetryAttempts,
      config.retryBaseDelayMs,
    );
  } catch (error) {
    const axiosError = error as AxiosError;
    const errorDetails = axiosError.response?.data ?? axiosError.message;
    logger.error(`Failed to forward message: ${JSON.stringify(errorDetails)}`);
    throw new Error(`WhatsApp API error: ${JSON.stringify(errorDetails)}`);
  }
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
): Promise<{ to: string; success: boolean; error?: string }[]> {
  const results = await Promise.allSettled(
    recipients.map(async (to) => {
      await forwardMessageTo(from, originalText, to, runtimeConfig);
      return to;
    }),
  );

  return results.map((result, i) => ({
    to: recipients[i],
    success: result.status === 'fulfilled',
    error: result.status === 'rejected' ? (result.reason as Error).message : undefined,
  }));
}
