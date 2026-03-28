import { Request, Response } from 'express';
import { createSession, revokeSession } from '../db/sessionStore';
import { createUser, getUserByEmail, getUserById } from '../db/userStore';
import { getWorkspaceByUserId } from '../db/workspaceStore';
import { createId, createSessionToken, hashPassword, verifyPassword } from '../services/authService';

function sanitizeUser(user: { id: string; name: string; email: string; created_at: string }) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.created_at,
  };
}

export function signup(req: Request, res: Response): void {
  const { name, email, password } = req.body as {
    name?: string;
    email?: string;
    password?: string;
  };

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (getUserByEmail(normalizedEmail)) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const timestamp = new Date().toISOString();
  const user = {
    id: createId('user'),
    name: name.trim(),
    email: normalizedEmail,
    password_hash: hashPassword(password),
    created_at: timestamp,
    updated_at: timestamp,
  };
  createUser(user);

  const sessionToken = createSessionToken();
  createSession({
    id: createId('session'),
    user_id: user.id,
    token_hash: sessionToken.tokenHash,
    created_at: timestamp,
    expires_at: sessionToken.expiresAt,
    revoked_at: null,
  });

  res.status(201).json({
    user: sanitizeUser(user),
    sessionToken: sessionToken.plainToken,
    workspace: null,
  });
}

export function login(req: Request, res: Response): void {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  const user = getUserByEmail(email.trim().toLowerCase());
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const sessionToken = createSessionToken();
  createSession({
    id: createId('session'),
    user_id: user.id,
    token_hash: sessionToken.tokenHash,
    created_at: new Date().toISOString(),
    expires_at: sessionToken.expiresAt,
    revoked_at: null,
  });

  res.status(200).json({
    user: sanitizeUser(user),
    sessionToken: sessionToken.plainToken,
    workspace: getWorkspaceByUserId(user.id),
  });
}

export function logout(req: Request, res: Response): void {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  revokeSession(req.auth.sessionTokenHash);
  res.status(200).json({ success: true });
}

export function me(req: Request, res: Response): void {
  if (!req.auth) {
    res.status(401).json({ error: 'Unauthorized: missing session' });
    return;
  }

  const user = getUserById(req.auth.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  res.status(200).json({
    user: sanitizeUser(user),
    workspace: getWorkspaceByUserId(user.id),
  });
}
