import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import config from '../config';
import logger from '../services/loggerService';

/**
 * Middleware to verify the X-Hub-Signature-256 header from Meta.
 * If WHATSAPP_APP_SECRET is not configured, the check is skipped (with a warning).
 * If configured and signature doesn't match, request is rejected with 401.
 */
export function verifyWebhookSignature(req: Request, res: Response, next: NextFunction): void {
  if (!config.appSecret) {
    logger.warn(
      '⚠️  WHATSAPP_APP_SECRET not set — skipping webhook signature verification. Set it for production security.',
    );
    next();
    return;
  }

  const signature = req.headers['x-hub-signature-256'] as string | undefined;

  if (!signature) {
    logger.warn('Webhook request missing X-Hub-Signature-256 header — rejecting');
    res.status(401).json({ error: 'Missing signature header' });
    return;
  }

  // Use the raw body bytes captured during parsing for accurate signature verification.
  // Falls back to re-serializing the parsed body if rawBody is unavailable.
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body);
  const expectedSignature = `sha256=${crypto
    .createHmac('sha256', config.appSecret)
    .update(rawBody)
    .digest('hex')}`;

  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    sigBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
  ) {
    logger.warn('Webhook signature verification failed — possible spoofed request');
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  logger.debug('Webhook signature verified successfully');
  next();
}
