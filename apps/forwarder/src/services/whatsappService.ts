import axios, { AxiosError } from 'axios';
import config from '../config';
import { getForwardToNumber } from '../controllers/configController';
import { SendMessagePayload, SendMessageResponse } from '../types/whatsapp';
import { withRetry } from '../utils/retry';
import logger from './loggerService';

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Forwards a message to a specific destination number via WhatsApp Cloud API.
 *
 * @param from - The sender's phone number (for logging purposes).
 * @param originalText - The original message text to forward.
 * @param to - The destination phone number.
 * @returns The API response object.
 * @throws Error if the API call fails after all retry attempts.
 */
export async function forwardMessageTo(
  from: string,
  originalText: string,
  to: string,
): Promise<SendMessageResponse> {
  const url = `${GRAPH_API_URL}/${config.whatsappPhoneNumberId}/messages`;

  const payload: SendMessagePayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: `Forwarded from ${from}:\n\n${originalText}`,
    },
  };

  const headers = {
    Authorization: `Bearer ${config.whatsappAccessToken}`,
    'Content-Type': 'application/json',
  };

  logger.info(`Forwarding message from ${from} to ${to}`);

  try {
    return await withRetry(
      async () => {
        const response = await axios.post<SendMessageResponse>(url, payload, { headers });
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

/**
 * Forwards a message to the configured destination number via WhatsApp Cloud API.
 * Backwards-compatible wrapper around forwardMessageTo.
 *
 * @param from - The sender's phone number (for logging purposes).
 * @param originalText - The original message text to forward.
 * @returns The API response object.
 * @throws Error if the API call fails.
 */
export async function forwardMessage(
  from: string,
  originalText: string,
): Promise<SendMessageResponse> {
  const forwardTo = getForwardToNumber() || config.forwardToNumber;
  return forwardMessageTo(from, originalText, forwardTo);
}

/**
 * Forwards a message to multiple recipients in parallel.
 * Each recipient gets their own API call.
 *
 * @param from - The sender's phone number
 * @param originalText - The original message text
 * @param recipients - Array of destination phone numbers
 * @returns Array of results (success or error per recipient)
 */
export async function forwardToMultiple(
  from: string,
  originalText: string,
  recipients: string[],
): Promise<{ to: string; success: boolean; error?: string }[]> {
  const results = await Promise.allSettled(
    recipients.map(async (to) => {
      await forwardMessageTo(from, originalText, to);
      return to;
    }),
  );

  return results.map((result, i) => ({
    to: recipients[i],
    success: result.status === 'fulfilled',
    error: result.status === 'rejected' ? (result.reason as Error).message : undefined,
  }));
}
