import { Router } from 'express';
import { login, logout, me, signup } from '../controllers/authController';
import { authRateLimiter } from '../middleware/rateLimiter';
import { requireSession } from '../middleware/sessionAuth';

const router = Router();

router.post('/signup', authRateLimiter, signup);
router.post('/login', authRateLimiter, login);
router.post('/logout', authRateLimiter, requireSession, logout);
router.get('/me', authRateLimiter, requireSession, me);

export default router;
