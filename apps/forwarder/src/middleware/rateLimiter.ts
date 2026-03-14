import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for the webhook endpoint.
 * Meta sends many webhooks quickly during high traffic — allow generous limit.
 * 500 requests per minute per IP.
 */
export const webhookRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.method === 'GET', // Don't rate limit webhook verification
});

/**
 * Rate limiter for the config endpoint.
 * Admin-only endpoint — stricter limit.
 * 10 requests per minute per IP.
 */
export const configRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many config update requests, please try again later.' },
});
