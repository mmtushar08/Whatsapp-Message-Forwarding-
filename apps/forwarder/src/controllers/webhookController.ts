import { Request, Response } from 'express';
import config from '../config';
import { getForwardToNumber } from '../controllers/configController';
import { logMessage } from '../db/messageStore';
import { passesFilter } from '../services/filterService';
import logger from '../services/loggerService';
import { forwardToMultiple } from '../services/whatsappService';
import { WebhookPayload } from '../types/whatsapp';
import { extractMessages } from '../utils/messageParser';
import { maskPhoneNumber } from '@whatsapp-forwarder/shared';

/**
 * Handles Meta's webhook verification handshake (GET /webhook).
 *
 * Meta sends a GET request with:
 * - hub.mode = "subscribe"
 * - hub.verify_token = your configured token
 * - hub.challenge = a random string to echo back
 *
 * If the token matches, respond 200 with the challenge string.
 */
export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  logger.info(`Webhook verification request received. Mode: ${mode}`);

  if (mode === 'subscribe' && token === config.webhookVerifyToken) {
    logger.info('Webhook verification successful');
    res.status(200).send(challenge);
  } else {
    logger.warn('Webhook verification failed — token mismatch or invalid mode');
    res.sendStatus(403);
  }
}

/**
 * Handles incoming WhatsApp messages (POST /webhook).
 *
 * Flow:
 * 1. Parse the webhook payload
 * 2. Extract all incoming messages
 * 3. For each message, check keyword filters
 * 4. If passes → forward via WhatsApp Cloud API
 * 5. Log all outcomes
 *
 * NOTE: Always respond 200 to Meta, even on errors — otherwise Meta will
 * retry the delivery repeatedly.
 */
export async function receiveWebhook(req: Request, res: Response): Promise<void> {
  // Always acknowledge receipt immediately (Meta requirement)
  res.sendStatus(200);

  const payload = req.body as WebhookPayload;

  // Validate it's a WhatsApp webhook
  if (payload.object !== 'whatsapp_business_account') {
    logger.debug(`Ignoring non-WhatsApp webhook object: ${payload.object}`);
    return;
  }

  const messages = extractMessages(payload);

  if (messages.length === 0) {
    logger.debug('Webhook received but no messages found (possibly a status update)');
    return;
  }

  logger.info(`Processing ${messages.length} message(s) from webhook`);

  for (const message of messages) {
    const senderLabel = message.senderName
      ? `${message.senderName} (${message.from})`
      : message.from;

    logger.info(
      `Received message from ${senderLabel} | Type: ${message.type} | Text: "${message.text}"`,
    );

    // Check keyword filter
    const passes = passesFilter(message.text);

    if (!passes) {
      logger.info(
        `Message from ${senderLabel} did not pass keyword filter — skipping. Text: "${message.text}"`,
      );
      continue;
    }

    // Forward the message to one or more recipients
    try {
      const recipients =
        config.forwardToNumbers.length > 0
          ? config.forwardToNumbers
          : [getForwardToNumber() || config.forwardToNumber];

      const results = await forwardToMultiple(message.from, message.text, recipients);
      results.forEach(({ to, success, error }) => {
        if (success) {
          logger.info(`✅ Forwarded to ${maskPhoneNumber(to)}`);
        } else {
          logger.error(`❌ Failed to forward to ${maskPhoneNumber(to)}: ${error}`);
        }
        logMessage({
          from_number: message.from,
          to_number: to,
          message: message.text,
          type: message.type,
          status: success ? 'success' : 'failed',
          error: error,
        });
      });
    } catch (error) {
      logger.error(`❌ Failed to forward message from ${senderLabel}: ${(error as Error).message}`);
    }
  }
}
