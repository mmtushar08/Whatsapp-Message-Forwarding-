import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { verifyWebhookSignature } from '../middleware/webhookSignature';
import config from '../config';

// Helper to create a mock Express request
function makeReq(body: object, headers: Record<string, string> = {}): Partial<Request> {
  return { body, headers } as Partial<Request>;
}

// Helper to create a mock Express response
function makeRes(): { status: jest.Mock; json: jest.Mock; statusCode: number } {
  const res = { status: jest.fn(), json: jest.fn(), statusCode: 200 };
  res.status.mockReturnValue(res);
  return res;
}

describe('verifyWebhookSignature middleware', () => {
  const originalAppSecret = config.appSecret;
  const next: NextFunction = jest.fn();

  afterEach(() => {
    config.appSecret = originalAppSecret;
    jest.clearAllMocks();
  });

  it('calls next() when WHATSAPP_APP_SECRET is not set', () => {
    config.appSecret = '';
    const req = makeReq({ test: 'data' });
    const res = makeRes();

    verifyWebhookSignature(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when signature header is missing', () => {
    config.appSecret = 'test_secret';
    const req = makeReq({ test: 'data' });
    const res = makeRes();

    verifyWebhookSignature(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing signature header' });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when signature is invalid', () => {
    config.appSecret = 'test_secret';
    const body = { test: 'data' };
    // Valid sha256= prefix with wrong hex value (64 hex chars = 32 bytes)
    const req = makeReq(body, {
      'x-hub-signature-256':
        'sha256=0000000000000000000000000000000000000000000000000000000000000000',
    });
    const res = makeRes();

    verifyWebhookSignature(req as Request, res as unknown as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid signature' });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next() when signature is valid', () => {
    config.appSecret = 'test_secret';
    const body = { test: 'data' };
    const rawBody = JSON.stringify(body);
    const validSignature = `sha256=${crypto
      .createHmac('sha256', 'test_secret')
      .update(rawBody)
      .digest('hex')}`;

    const req = makeReq(body, { 'x-hub-signature-256': validSignature });
    const res = makeRes();

    verifyWebhookSignature(req as Request, res as unknown as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});
