import { Router } from 'express';
import { getWorkspaceMessages, getWorkspaceStats } from '../controllers/appMessagesController';
import {
  getThread,
  listConversations,
  listTemplates,
  postReply,
  postTemplate,
} from '../controllers/conversationsController';
import { seedDemoMessages } from '../controllers/demoSeedController';
import { getWorkspace, saveWorkspace } from '../controllers/workspaceController';
import { appApiRateLimiter } from '../middleware/rateLimiter';
import { requireSession } from '../middleware/sessionAuth';

const router = Router();

router.get('/workspace', appApiRateLimiter, requireSession, getWorkspace);
router.patch('/workspace', appApiRateLimiter, requireSession, saveWorkspace);
router.get('/messages', appApiRateLimiter, requireSession, getWorkspaceMessages);
router.get('/messages/stats', appApiRateLimiter, requireSession, getWorkspaceStats);
router.post('/demo/seed', appApiRateLimiter, requireSession, seedDemoMessages);
router.get('/conversations', appApiRateLimiter, requireSession, listConversations);
router.get('/conversations/:contact/messages', appApiRateLimiter, requireSession, getThread);
router.post('/conversations/:contact/reply', appApiRateLimiter, requireSession, postReply);
router.post('/conversations/:contact/template', appApiRateLimiter, requireSession, postTemplate);
router.get('/templates', appApiRateLimiter, requireSession, listTemplates);

export default router;
