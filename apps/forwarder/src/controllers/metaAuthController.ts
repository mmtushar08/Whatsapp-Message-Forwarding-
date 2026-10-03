import { Request, Response } from 'express';
import { createSession } from '../db/sessionStore';
import { createUser, getUserByEmail, getUserById } from '../db/userStore';
import { findPhoneNumberOwner, getWorkspaceByUserId } from '../db/workspaceStore';
import { createId, createSessionToken, hashPassword } from '../services/authService';
import logger from '../services/loggerService';
import {
  ConnectionError,
  connectVerifiedNumber,
  verifyEmbeddedSignupCode,
} from '../services/whatsappConnectionService';
import { deriveBaseUrl } from '../utils/deriveBaseUrl';
import { sanitizeUser } from './authController';

/**
 * POST /auth/meta-login
 * Sign up or log in with Meta Embedded Signup.
 *
 * The browser sends only the one-time `code` from FB.login() plus the IDs Meta
 * posted back. The code is exchanged server-side, and the resulting token must
 * be able to read the phone number — that is the proof of identity. The
 * account that owns the verified number is the one logged in.
 */
export async function metaLogin(req: Request, res: Response): Promise<void> {
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

    let userId = findPhoneNumberOwner(number.phone.id);
    const isNewUser = !userId;

    if (!userId) {
      // Meta-only accounts get a synthetic internal email and a random
      // password hash; they always sign in through Meta.
      const internalEmail = `meta_${number.phone.id.replace(/\W/g, '_')}@sendro.internal`;
      const existingByEmail = getUserByEmail(internalEmail);
      if (existingByEmail) {
        userId = existingByEmail.id;
      } else {
        const timestamp = new Date().toISOString();
        userId = createId('user');
        createUser({
          id: userId,
          name: number.phone.verifiedName || 'Business Owner',
          email: internalEmail,
          password_hash: hashPassword(createId('tmp')),
          created_at: timestamp,
          updated_at: timestamp,
        });
      }
    }

    // Refresh the stored token and re-run activation for returning users too:
    // a new code means a new token, and re-subscribing is idempotent.
    const workspace = await connectVerifiedNumber({
      userId,
      number,
      method: 'embedded_signup',
      webhookBaseUrl: deriveBaseUrl(req),
    });

    const user = getUserById(userId);
    if (!user) {
      res.status(500).json({ error: 'Failed to retrieve account' });
      return;
    }

    const sessionToken = createSessionToken();
    createSession({
      id: createId('session'),
      user_id: userId,
      token_hash: sessionToken.tokenHash,
      created_at: new Date().toISOString(),
      expires_at: sessionToken.expiresAt,
      revoked_at: null,
    });

    res.status(isNewUser ? 201 : 200).json({
      user: sanitizeUser(user),
      sessionToken: sessionToken.plainToken,
      workspace: workspace ?? getWorkspaceByUserId(userId),
      isNewUser,
    });
  } catch (error) {
    if (error instanceof ConnectionError) {
      res.status(error.httpStatus).json({ error: error.message });
      return;
    }
    logger.error(`Meta login failed: ${(error as Error).message}`);
    res.status(500).json({ error: 'Could not sign in with Meta. Please try again.' });
  }
}
