import { Request, Response } from 'express';
import { createSession } from '../db/sessionStore';
import { createUser, getUserByEmail, getUserById } from '../db/userStore';
import { saveEmbeddedSignupCredentials, getWorkspaceByUserId } from '../db/workspaceStore';
import { getWorkspaceRuntimeByPhoneNumberId } from '../db/workspaceStore';
import { createId, createSessionToken, hashPassword } from '../services/authService';
import { deriveBaseUrl } from '../utils/deriveBaseUrl';

function sanitizeUser(user: {
  id: string;
  name: string;
  email: string;
  created_at: string;
  plan?: string;
  plan_expires_at?: string;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
    plan: (user.plan as 'free' | 'starter' | 'pro' | 'business' | undefined) ?? 'free',
    planExpiresAt: user.plan_expires_at ?? '',
  };
}

// ─── AFTER META APP APPROVAL ──────────────────────────────────────────────────
// This endpoint handles both signup and login via Meta Embedded Login.
// Currently used with simulated (demo) tokens from MetaLoginModal.tsx.
//
// After approval, the frontend MetaLoginModal will send REAL tokens from FB.login().
// This backend endpoint needs NO changes — it already handles real phone_number_ids.
// ─────────────────────────────────────────────────────────────────────────────

export function metaLogin(req: Request, res: Response): void {
  const { name, access_token, phone_number_id, waba_id } = req.body as {
    name?: string;
    access_token?: string;
    phone_number_id?: string;
    waba_id?: string;
  };

  if (!access_token || !phone_number_id || !waba_id) {
    res.status(400).json({ error: 'access_token, phone_number_id, and waba_id are required' });
    return;
  }

  // Check if a workspace with this phone_number_id already exists
  const existingRuntime = getWorkspaceRuntimeByPhoneNumberId(phone_number_id);

  let userId: string;
  let isNewUser = false;

  if (existingRuntime) {
    // Returning user — log them in
    userId = existingRuntime.userId;
  } else {
    // New user — create account
    if (!name || !name.trim()) {
      res.status(400).json({ error: 'name is required for new accounts' });
      return;
    }

    // Synthetic internal email — never used for email/password login
    const internalEmail = `meta_${phone_number_id.replace(/\W/g, '_')}@sendro.internal`;
    if (getUserByEmail(internalEmail)) {
      res.status(409).json({ error: 'This WhatsApp number is already registered.' });
      return;
    }

    const timestamp = new Date().toISOString();
    const newUser = {
      id: createId('user'),
      name: name.trim(),
      email: internalEmail,
      password_hash: hashPassword(createId('tmp')), // random — Meta users never use email/password
      created_at: timestamp,
      updated_at: timestamp,
    };
    createUser(newUser);
    userId = newUser.id;
    isNewUser = true;

    try {
      saveEmbeddedSignupCredentials(userId, {
        accessToken: access_token,
        phoneNumberId: phone_number_id,
        wabaId: waba_id,
        webhookBaseUrl: deriveBaseUrl(req),
      });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
      return;
    }
  }

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
    workspace: getWorkspaceByUserId(userId),
    isNewUser,
  });
}
