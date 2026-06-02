import { Router } from 'express';
import { getWorkspaceMessages, getWorkspaceStats, resendMessage } from '../controllers/appMessagesController';
import { getWorkspace, saveWorkspace, testWorkspace } from '../controllers/workspaceController';
import {
  listRules,
  createRuleHandler,
  updateRuleHandler,
  deleteRuleHandler,
} from '../controllers/rulesController';
import { configRateLimiter } from '../middleware/rateLimiter';
import { requireSession } from '../middleware/sessionAuth';

const router = Router();

router.get('/workspace', configRateLimiter, requireSession, getWorkspace);
router.patch('/workspace', configRateLimiter, requireSession, saveWorkspace);
router.post('/workspace/test', configRateLimiter, requireSession, testWorkspace);
router.get('/messages', configRateLimiter, requireSession, getWorkspaceMessages);
router.get('/messages/stats', configRateLimiter, requireSession, getWorkspaceStats);
router.post('/messages/:id/resend', configRateLimiter, requireSession, resendMessage);
router.get('/rules', configRateLimiter, requireSession, listRules);
router.post('/rules', configRateLimiter, requireSession, createRuleHandler);
router.patch('/rules/:id', configRateLimiter, requireSession, updateRuleHandler);
router.delete('/rules/:id', configRateLimiter, requireSession, deleteRuleHandler);

export default router;
