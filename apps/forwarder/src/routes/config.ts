import { Router } from 'express';
import {
  getSettings,
  updateForwardToNumber,
  updateSettings,
} from '../controllers/configController';
import { requireAdminToken } from '../middleware/adminAuth';
import { configRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.get('/settings', configRateLimiter, requireAdminToken, getSettings);
router.patch('/settings', configRateLimiter, requireAdminToken, updateSettings);
router.patch('/forward-number', configRateLimiter, requireAdminToken, updateForwardToNumber);

export default router;
