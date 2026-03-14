import { Router } from 'express';
import { receiveWebhook, verifyWebhook } from '../controllers/webhookController';
import { webhookRateLimiter } from '../middleware/rateLimiter';
import { verifyWebhookSignature } from '../middleware/webhookSignature';

const router = Router();

/**
 * GET /webhook
 * Meta webhook verification endpoint.
 * Called once when you register the webhook URL in Meta dashboard.
 */
router.get('/', verifyWebhook);

/**
 * POST /webhook
 * Receives incoming WhatsApp messages and triggers forwarding.
 * Verifies X-Hub-Signature-256 header when WHATSAPP_APP_SECRET is configured.
 */
router.post('/', webhookRateLimiter, verifyWebhookSignature, receiveWebhook);

export default router;
