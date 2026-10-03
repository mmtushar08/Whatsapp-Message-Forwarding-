import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import config from '../config';
import { getWorkspaceRuntimeByPhoneNumberId } from '../db/workspaceStore';
import logger from '../services/loggerService';
import { WebhookPayload } from '../types/whatsapp';

export function verifyWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  const payload = req.body as WebhookPayload;
  const phoneNumberId = payload.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
  const workspace = phoneNumberId ? getWorkspaceRuntimeByPhoneNumberId(phoneNumberId) : null;
  const appSecret = workspace?.appSecret || config.appSecret;

  if (!appSecret) {
    // Unsigned webhooks would let anyone inject "inbound" messages and make us
    // send with a customer's credentials — never accept them in production.
    if (process.env['NODE_ENV'] === 'production') {
      logger.error(
        'No app secret configured (META_APP_SECRET / WHATSAPP_APP_SECRET) - rejecting unverifiable webhook.',
      );
      res.status(401).json({ error: 'Webhook signature cannot be verified' });
      return;
    }
    logger.warn(
      'WHATSAPP_APP_SECRET not set - skipping webhook signature verification. Set it for production security.',
    );
    next();
    return;
  }

  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  if (!signature) {
    logger.warn('Webhook request missing X-Hub-Signature-256 header - rejecting');
    res.status(401).json({ error: 'Missing signature header' });
    return;
  }

  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex')}`;

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    logger.warn('Webhook signature verification failed - possible spoofed request');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  logger.debug('Webhook signature verified successfully');
  next();
}
