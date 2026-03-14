import { Router } from 'express';
import { receiveWebhook, verifyWebhook } from '../controllers/webhookController';

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
 */
router.post('/', receiveWebhook);

export default router;
