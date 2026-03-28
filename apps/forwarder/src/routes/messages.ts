import { Router } from 'express';
import { getMessages, getStats } from '../controllers/messagesController';
import { requireAdminToken } from '../middleware/adminAuth';
import { configRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/', configRateLimiter, requireAdminToken, getMessages);
router.get('/stats', configRateLimiter, requireAdminToken, getStats);

export default router;
