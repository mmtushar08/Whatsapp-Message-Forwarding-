import { Request, Response } from 'express';
import logger from '../services/loggerService';

// In-memory store for the forward-to number (loaded from env on startup)
let currentForwardToNumber: string = process.env['FORWARD_TO_NUMBER'] ?? '';

/**
 * Returns the current forward-to number (for internal use by other services).
 */
export function getForwardToNumber(): string {
  return currentForwardToNumber;
}

/**
 * PATCH /config/forward-number
 * Updates the phone number messages are forwarded to.
 *
 * Requires:
 * - Body: { phoneNumber: string, adminToken: string }
 * - adminToken must match ADMIN_TOKEN env variable
 *
 * This allows end users to update their forwarding number without
 * touching the server config files.
 */
export function updateForwardToNumber(req: Request, res: Response): void {
  const { phoneNumber, adminToken } = req.body as { phoneNumber?: string; adminToken?: string };

  // Validate admin token
  const expectedToken = process.env['ADMIN_TOKEN'];
  if (!expectedToken || adminToken !== expectedToken) {
    logger.warn('Unauthorized attempt to update forward-to number');
    res.status(401).json({ error: 'Unauthorized: invalid admin token' });
    return;
  }

  // Validate phone number
  if (!phoneNumber) {
    res.status(400).json({ error: 'phoneNumber is required' });
    return;
  }

  // Basic phone number validation: digits only, 7-15 characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  if (cleaned.length < 7 || cleaned.length > 15) {
    res.status(400).json({
      error: 'Invalid phone number. Must be 7-15 digits with country code (no + sign).',
      example: '12345678900',
    });
    return;
  }

  const previous = currentForwardToNumber;
  currentForwardToNumber = cleaned;

  logger.info(`✅ Forward-to number updated: ****${previous.slice(-4)} → ****${cleaned.slice(-4)}`);

  res.status(200).json({
    success: true,
    message: 'Forward-to number updated successfully',
    previous,
    current: cleaned,
  });
}
