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

  if (!req.rawBody) {
    logger.error('rawBody not available for signature verification — ensure express.json verify callback is configured');
    res.status(500).json({ error: 'Signature verification unavailable' });
    return;
  }
  const rawBody = req.rawBody.toString('utf8');
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
