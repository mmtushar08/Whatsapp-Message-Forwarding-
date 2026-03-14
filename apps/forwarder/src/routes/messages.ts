import { Router } from 'express';
import { getMessages, getStats } from '../controllers/messagesController';
import { configRateLimiter } from '../middleware/rateLimiter';

const router = Router();

/**
 * GET /messages
 * Returns paginated message forwarding history.
 * Query: ?limit=50&offset=0
 */
router.get('/', configRateLimiter, getMessages);

/**
 * GET /messages/stats
 * Returns aggregate stats (total, success, failed).
 */
router.get('/stats', configRateLimiter, getStats);

export default router;
