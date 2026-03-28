import { Router } from 'express';
import { getWorkspaceMessages, getWorkspaceStats } from '../controllers/appMessagesController';
import { getWorkspace, saveWorkspace } from '../controllers/workspaceController';
import { configRateLimiter } from '../middleware/rateLimiter';
import { requireSession } from '../middleware/sessionAuth';

const router = Router();

router.get('/workspace', configRateLimiter, requireSession, getWorkspace);
router.patch('/workspace', configRateLimiter, requireSession, saveWorkspace);
router.get('/messages', configRateLimiter, requireSession, getWorkspaceMessages);
router.get('/messages/stats', configRateLimiter, requireSession, getWorkspaceStats);

export default router;
