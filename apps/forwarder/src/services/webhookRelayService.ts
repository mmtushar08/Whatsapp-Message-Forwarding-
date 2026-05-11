import axios from 'axios';
import config from '../config';
import logger from './loggerService';

export interface RelayPayload {
  from: string;
  senderName?: string;
  message: string;
  type: string;
  receivedAt: string;
  businessLabel: string;
}

export async function relayToWebhook(url: string, payload: RelayPayload): Promise<void> {
  try {
    await axios.post(url, payload, {
      timeout: config.whatsappTimeoutMs,
      headers: { 'Content-Type': 'application/json' },
    });
    logger.info(`Webhook relay delivered to ${url}`);
  } catch (error) {
    logger.warn(`Webhook relay to ${url} failed: ${(error as Error).message}`);
  }
}
