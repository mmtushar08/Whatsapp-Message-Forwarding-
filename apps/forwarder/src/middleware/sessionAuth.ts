import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { getActiveSessionByTokenHash } from '../db/sessionStore';

function extractSessionToken(req: Request): string | undefined {
  const headerToken = req.header('authorization');
  if (headerToken?.startsWith('Bearer ')) {
    return headerToken.slice('Bearer '.length).trim();
  }

  return req.header('x-session-token') ?? undefined;
}

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  const token = extractSessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized: missing session token' });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const session = getActiveSessionByTokenHash(tokenHash);

  if (!session) {
    res.status(401).json({ error: 'Unauthorized: invalid or expired session' });
    return;
  }

  req.auth = {
    userId: session.user_id,
    sessionTokenHash: tokenHash,
  };
  next();
}
