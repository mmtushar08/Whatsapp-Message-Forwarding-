import { Router } from 'express';
import {
  completeEmbeddedSignup,
  saveEmbeddedSignup,
} from '../controllers/embeddedSignupController';
import { fetchWabaInfo } from '../controllers/wabaDiscoveryController';
import { appApiRateLimiter } from '../middleware/rateLimiter';
import { requireSession } from '../middleware/sessionAuth';

const router = Router();

router.post('/complete-embedded-signup', appApiRateLimiter, requireSession, completeEmbeddedSignup);
router.post('/save-credentials', appApiRateLimiter, requireSession, saveEmbeddedSignup);
router.post('/fetch-waba-info', appApiRateLimiter, requireSession, fetchWabaInfo);

export default router;
