import express from 'express';
import request from 'supertest';
import {
  getForwardToNumber,
  getKeywordFilters,
  getSettings,
  isForwardingEnabled,
  updateForwardToNumber,
  updateSettings,
} from '../controllers/configController';
import { requireAdminToken } from '../middleware/adminAuth';

const app = express();
app.use(express.json());
app.get('/config/settings', requireAdminToken, getSettings);
app.patch('/config/settings', requireAdminToken, updateSettings);
app.patch('/config/forward-number', requireAdminToken, updateForwardToNumber);

describe('configController', () => {
  beforeEach(() => {
    process.env['ADMIN_TOKEN'] = 'test_admin_token';
    process.env['FORWARD_TO_NUMBER'] = '9876543210';
    process.env['KEYWORD_FILTERS'] = '';
  });

  describe('updateForwardToNumber', () => {
    it('returns 401 if admin token is missing', async () => {
      const res = await request(app).patch('/config/forward-number').send({ phoneNumber: '12345678900' });
      expect(res.status).toBe(401);
    });

    it('returns 401 if admin token is wrong', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .set('x-admin-token', 'wrong_token')
        .send({ phoneNumber: '12345678900' });
      expect(res.status).toBe(401);
    });

    it('returns 400 if phoneNumber is missing', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .set('x-admin-token', 'test_admin_token')
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/phoneNumber is required/i);
    });

    it('returns 400 if phone number is too short', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .set('x-admin-token', 'test_admin_token')
        .send({ phoneNumber: '123' });
      expect(res.status).toBe(400);
    });

    it('returns 400 if phone number is too long', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .set('x-admin-token', 'test_admin_token')
        .send({ phoneNumber: '1234567890123456' });
      expect(res.status).toBe(400);
    });

    it('returns 200 and updates number on valid request', async () => {
      const res = await request(app)
        .patch('/config/forward-number')
        .set('x-admin-token', 'test_admin_token')
        .send({ phoneNumber: '12345678900' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.current).toBe('12345678900');
    });
  });

  describe('dashboard settings flow', () => {
    it('returns protected settings data', async () => {
      const res = await request(app).get('/config/settings').set('x-admin-token', 'test_admin_token');
      expect(res.status).toBe(200);
      expect(res.body.settings.forwardToNumber).toBeDefined();
      expect(res.body.meta.webhookPath).toBe('/webhook');
    });

    it('updates keyword filters and forwarding enabled state', async () => {
      const res = await request(app)
        .patch('/config/settings')
        .set('x-admin-token', 'test_admin_token')
        .send({
          phoneNumber: '19998887777',
          keywordFilters: 'urgent, vip',
          forwardingEnabled: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.current.keywordFilters).toEqual(['urgent', 'vip']);
      expect(res.body.current.forwardingEnabled).toBe(false);
      expect(getForwardToNumber()).toBe('19998887777');
      expect(getKeywordFilters()).toEqual(['urgent', 'vip']);
      expect(isForwardingEnabled()).toBe(false);
    });
  });
});
