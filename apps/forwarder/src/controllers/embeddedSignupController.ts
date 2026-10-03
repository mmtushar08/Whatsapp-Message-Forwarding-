import { Request, Response } from 'express';
import {
  ConnectionError,
  connectVerifiedNumber,
  verifyEmbeddedSignupCode,
  verifyNumberAccess,
} from '../services/whatsappConnectionService';
import logger from '../services/loggerService';
import { deriveBaseUrl } from '../utils/deriveBaseUrl';

function sendConnectionError(res: Response, error: unknown): void {
  if (error instanceof ConnectionError) {
    res.status(error.httpStatus).json({ error: error.message });
    return;
  }
  logger.error(`WhatsApp connection failed: ${(error as Error).message}`);
  res.status(500).json({ error: 'Could not connect WhatsApp. Please try again.' });
}

/**
 * POST /api/complete-embedded-signup
 * Finishes Meta Embedded Signup for the signed-in user: exchanges the code
 * server-side, verifies the number, subscribes webhooks and saves it.
 */
export async function completeEmbeddedSignup(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  const { code, phone_number_id, waba_id } = req.body as {
    code?: string;
    phone_number_id?: string;
    waba_id?: string;
  };

  if (!code?.trim() || !phone_number_id?.trim() || !waba_id?.trim()) {
    res.status(400).json({ error: 'code, phone_number_id, and waba_id are required' });
    return;
  }

  try {
    const number = await verifyEmbeddedSignupCode(
      code.trim(),
      waba_id.trim(),
      phone_number_id.trim(),
    );
    const workspace = await connectVerifiedNumber({
      userId: req.auth.userId,
      number,
      method: 'embedded_signup',
      webhookBaseUrl: deriveBaseUrl(req),
    });
    res.status(200).json({ success: true, workspace });
  } catch (error) {
    sendConnectionError(res, error);
  }
}

/**
 * POST /api/save-credentials
 * Connects a number from a pasted permanent access token (customers who run
 * their own Meta app). The token must prove access to the number.
 */
export async function saveEmbeddedSignup(req: Request, res: Response): Promise<void> {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  const { access_token, phone_number_id, waba_id, app_secret } = req.body as {
    access_token?: string;
    phone_number_id?: string;
    waba_id?: string;
    app_secret?: string;
  };

  if (!access_token?.trim() || !phone_number_id?.trim() || !waba_id?.trim()) {
    res.status(400).json({
      error: 'access_token, phone_number_id, and waba_id are required',
    });
    return;
  }

  try {
    const number = await verifyNumberAccess(
      access_token.trim(),
      waba_id.trim(),
      phone_number_id.trim(),
    );
    const workspace = await connectVerifiedNumber({
      userId: req.auth.userId,
      number,
      method: 'manual',
      appSecret: app_secret?.trim() || undefined,
      webhookBaseUrl: deriveBaseUrl(req),
    });
    res.status(200).json({ success: true, workspace });
  } catch (error) {
    sendConnectionError(res, error);
  }
}
