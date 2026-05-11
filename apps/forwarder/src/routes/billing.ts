import { Router } from 'express';
import {
  billingStatus,
  cancel,
  razorpayWebhook,
  subscribe,
} from '../controllers/billingController';
import { authRateLimiter } from '../middleware/rateLimiter';
import { requireSession } from '../middleware/sessionAuth';

const router = Router();

router.get('/status', authRateLimiter, requireSession, billingStatus);
router.post('/subscribe', authRateLimiter, requireSession, subscribe);
router.post('/cancel', authRateLimiter, requireSession, cancel);

// Razorpay webhook — public, but signature-verified inside the handler.
// Excluded from authRateLimiter so retries from Razorpay aren't throttled.
router.post('/webhook', razorpayWebhook);

export default router;
