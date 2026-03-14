import { Router } from 'express';
import { getMessages, getStats } from '../controllers/messagesController';
import { configRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /messages?limit=50&offset=0
 * Returns paginated forwarded message history.
 */
router.get('/', configRateLimiter, getMessages);

/**
 * GET /messages/stats
 * Returns aggregate message statistics.
 */
router.get('/stats', configRateLimiter, getStats);

export default router;
