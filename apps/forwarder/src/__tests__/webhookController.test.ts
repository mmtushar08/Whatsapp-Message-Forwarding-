import request from 'supertest';
import app from '../index';

describe('webhookController', () => {
  describe('GET /webhook — verifyWebhook', () => {
    it('returns 200 with challenge when token matches', async () => {
      const res = await request(app).get('/webhook').query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'test_verify_token',
        'hub.challenge': 'my_challenge_string',
      });
      expect(res.status).toBe(200);
      expect(res.text).toBe('my_challenge_string');
    });

    it('returns 403 when token does not match', async () => {
      const res = await request(app).get('/webhook').query({
        'hub.mode': 'subscribe',
        'hub.verify_token': 'wrong_token',
        'hub.challenge': 'my_challenge_string',
      });
      expect(res.status).toBe(403);
    });

    it('returns 403 when mode is not subscribe', async () => {
      const res = await request(app).get('/webhook').query({
        'hub.mode': 'unsubscribe',
        'hub.verify_token': 'test_verify_token',
        'hub.challenge': 'my_challenge_string',
      });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /webhook — receiveWebhook', () => {
    it('always returns 200 immediately (Meta requirement)', async () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [],
      };
      const res = await request(app).post('/webhook').send(payload);
      expect(res.status).toBe(200);
    });

    it('returns 200 even for non-whatsapp_business_account objects', async () => {
      const payload = {
        object: 'instagram',
        entry: [],
      };
      const res = await request(app).post('/webhook').send(payload);
      expect(res.status).toBe(200);
    });
  });
});
