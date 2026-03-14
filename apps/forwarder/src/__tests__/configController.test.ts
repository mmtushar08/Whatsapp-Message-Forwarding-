import express from 'express';
import request from 'supertest';
import { getForwardToNumber, updateForwardToNumber } from '../controllers/configController';

// Build a minimal Express app for testing the controller
const app = express();
app.use(express.json());
app.patch('/config/forward-number', updateForwardToNumber);

describe('configController', () => {
  beforeEach(() => {
    // Reset to the env-configured value before each test
    process.env['ADMIN_TOKEN'] = 'test_admin_token';
    process.env['FORWARD_TO_NUMBER'] = '9876543210';
  });

  describe('updateForwardToNumber', () => {
    it('returns 401 if admin token is missing', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .send({ phoneNumber: '12345678900' });
      expect(res.status).toBe(401);
    });

    it('returns 401 if admin token is wrong', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .send({ phoneNumber: '12345678900', adminToken: 'wrong_token' });
      expect(res.status).toBe(401);
    });

    it('returns 400 if phoneNumber is missing', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .send({ adminToken: 'test_admin_token' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/phoneNumber is required/i);
    });

    it('returns 400 if phone number is too short', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .send({ phoneNumber: '123', adminToken: 'test_admin_token' });
      expect(res.status).toBe(400);
    });

    it('returns 400 if phone number is too long', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .send({ phoneNumber: '1234567890123456', adminToken: 'test_admin_token' });
      expect(res.status).toBe(400);
    });

    it('returns 200 and updates number on valid request', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .send({ phoneNumber: '12345678900', adminToken: 'test_admin_token' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.current).toBe('12345678900');
    });
  });

  describe('getForwardToNumber', () => {
    it('returns the updated number after a successful update', async () => {
      await request(app)
        .patch('/config/forward-number')
        .send({ phoneNumber: '19998887777', adminToken: 'test_admin_token' });
      expect(getForwardToNumber()).toBe('19998887777');
    });
  });
});
