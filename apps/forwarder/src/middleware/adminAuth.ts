import { NextFunction, Request, Response } from 'express';
import logger from '../services/loggerService';

function extractAdminToken(req: Request): string | undefined {
  const headerToken = req.header('x-admin-token');
  if (headerToken) {
    return headerToken;
  }

  const queryToken = req.query['adminToken'];
  if (typeof queryToken === 'string') {
    return queryToken;
  }

  const body = req.body as { adminToken?: string } | undefined;
  return body?.adminToken;
}

export function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  const expectedToken = process.env['ADMIN_TOKEN'];
  const providedToken = extractAdminToken(req);

  if (!expectedToken || providedToken !== expectedToken) {
    logger.warn(`Unauthorized admin request to ${req.method} ${req.originalUrl}`);
    res.status(401).json({ error: 'Unauthorized: invalid admin token' });
    return;
  }

  next();
}
