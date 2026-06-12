import { Request } from 'express';
import config from '../config';

export function deriveBaseUrl(req: Request): string {
  if (config.publicAppUrl) return config.publicAppUrl.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] as string | undefined) ?? req.protocol;
  const host = (req.headers['x-forwarded-host'] as string | undefined) ?? req.get('host') ?? '';
  return host ? `${proto}://${host}` : '';
}
