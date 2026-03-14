import { Router } from 'express';
import { updateForwardToNumber } from '../controllers/configController';

const router = Router();

/**
 * PATCH /config/forward-number
 * Updates the phone number to forward messages to.
 * Body: { "phoneNumber": "12345678900", "adminToken": "your_admin_token" }
 */
router.patch('/forward-number', updateForwardToNumber);

export default router;
