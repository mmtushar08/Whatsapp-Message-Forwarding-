import { Router } from 'express';
import { login, logout, me, signup } from '../controllers/authController';
import { metaLogin } from '../controllers/metaAuthController';
import { authRateLimiter, signupRateLimiter } from '../middleware/rateLimiter';
import { requireSession } from '../middleware/sessionAuth';

const router = Router();

router.post('/signup', signupRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.post('/meta-login', authRateLimiter, metaLogin);
router.post('/logout', authRateLimiter, requireSession, logout);
router.get('/me', authRateLimiter, requireSession, me);

export default router;
