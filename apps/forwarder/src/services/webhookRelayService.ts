import axios from 'axios';
import config from '../config';
import { assertSafeOutboundUrl } from '../utils/urlSafety';
import logger from './loggerService';

export interface RelayPayload {
  from: string;
  senderName?: string;
  message: string;
  type: string;
  receivedAt: string;
  businessLabel: string;
}

export interface DeliveryResult {
  success: boolean;
  error?: string;
}

export async function relayToWebhook(url: string, payload: RelayPayload): Promise<DeliveryResult> {
  try {
    // Re-checked at send time: DNS can change after the URL was saved.
    const safeUrl = await assertSafeOutboundUrl(url);
    await axios.post(safeUrl, payload, {
      timeout: config.whatsappTimeoutMs,
      headers: { 'Content-Type': 'application/json' },
      maxRedirects: 0,
    });
    logger.info(`Webhook relay delivered to ${url}`);
    return { success: true };
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    const message = status ? `Webhook responded with HTTP ${status}` : (error as Error).message;
    logger.warn(`Webhook relay to ${url} failed: ${message}`);
    return { success: false, error: message };
  }
}
