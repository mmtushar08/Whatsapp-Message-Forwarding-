import { Router } from 'express';
import { completeEmbeddedSignupController, saveEmbeddedSignup } from '../controllers/embeddedSignupController';
import { fetchWabaInfo } from '../controllers/wabaDiscoveryController';
import { appApiRateLimiter } from '../middleware/rateLimiter';
import { requireSession } from '../middleware/sessionAuth';

const router = Router();

router.post('/complete-embedded-signup', appApiRateLimiter, requireSession, completeEmbeddedSignupController);
router.post('/save-credentials', appApiRateLimiter, requireSession, saveEmbeddedSignup);
router.post('/fetch-waba-info', appApiRateLimiter, requireSession, fetchWabaInfo);

export default router;
