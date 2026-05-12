import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

const requestContext = new AsyncLocalStorage<string>();

export function getRequestId(): string | undefined {
  return requestContext.getStore();
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string | undefined) ?? crypto.randomUUID();
  res.setHeader('x-request-id', id);
  requestContext.run(id, next);
}
