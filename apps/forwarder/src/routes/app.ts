import { Router } from 'express';
import { getWorkspaceMessages, getWorkspaceStats, resendMessage } from '../controllers/appMessagesController';
import { getWorkspace, saveWorkspace, testWorkspace } from '../controllers/workspaceController';
import {
  listRules,
  createRuleHandler,
  updateRuleHandler,
  deleteRuleHandler,
} from '../controllers/rulesController';
import { apiReadLimiter, configRateLimiter } from '../middleware/rateLimiter';
import { requireSession } from '../middleware/sessionAuth';

const router = Router();

router.get('/workspace', apiReadLimiter, requireSession, getWorkspace);
router.patch('/workspace', configRateLimiter, requireSession, saveWorkspace);
router.post('/workspace/test', configRateLimiter, requireSession, testWorkspace);
router.get('/messages', apiReadLimiter, requireSession, getWorkspaceMessages);
router.get('/messages/stats', apiReadLimiter, requireSession, getWorkspaceStats);
router.post('/messages/:id/resend', configRateLimiter, requireSession, resendMessage);
router.get('/rules', apiReadLimiter, requireSession, listRules);
router.post('/rules', configRateLimiter, requireSession, createRuleHandler);
router.patch('/rules/:id', configRateLimiter, requireSession, updateRuleHandler);
router.delete('/rules/:id', configRateLimiter, requireSession, deleteRuleHandler);

export default router;
