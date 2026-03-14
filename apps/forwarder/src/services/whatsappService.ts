import axios, { AxiosError } from 'axios';
import config from '../config';
import { getForwardToNumber } from '../controllers/configController';
import { SendMessagePayload, SendMessageResponse } from '../types/whatsapp';
import logger from './loggerService';

const GRAPH_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Forwards a message to the configured destination number via WhatsApp Cloud API.
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
  // Always use the latest phone number (supports runtime updates)
  const forwardTo = getForwardToNumber() || config.forwardToNumber;
  const url = `${GRAPH_API_URL}/${config.whatsappPhoneNumberId}/messages`;

  const payload: SendMessagePayload = {
    messaging_product: 'whatsapp',
    to: forwardTo,
    type: 'text',
    text: {
      body: `Forwarded from ${from}:\n\n${originalText}`,
    },
  };

  logger.info(`Forwarding message from ${from} to ${forwardTo}`);

  try {
    const response = await axios.post<SendMessageResponse>(url, payload, {
      headers: {
        Authorization: `Bearer ${config.whatsappAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info(
      `Message forwarded successfully. Message ID: ${response.data.messages?.[0]?.id ?? 'unknown'}`,
    );

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    const errorDetails = axiosError.response?.data ?? axiosError.message;
    logger.error(`Failed to forward message: ${JSON.stringify(errorDetails)}`);
    throw new Error(`WhatsApp API error: ${JSON.stringify(errorDetails)}`);
  }
}
