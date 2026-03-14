import express from 'express';
import request from 'supertest';
import { configRateLimiter } from '../middleware/rateLimiter';
import { getMessages, getStats } from '../controllers/messagesController';

// Mock the messageStore module
jest.mock('../db/messageStore', () => ({
  getMessageLogs: jest.fn(),
  getMessageLogCount: jest.fn(),
  getMessageStats: jest.fn(),
}));

import { getMessageLogs, getMessageLogCount, getMessageStats } from '../db/messageStore';

const mockedGetMessageLogs = getMessageLogs as jest.MockedFunction<typeof getMessageLogs>;
const mockedGetMessageLogCount = getMessageLogCount as jest.MockedFunction<
  typeof getMessageLogCount
>;
const mockedGetMessageStats = getMessageStats as jest.MockedFunction<typeof getMessageStats>;

// Build a minimal express app for testing
const app = express();
app.use(express.json());
app.get('/messages', configRateLimiter, getMessages);
app.get('/messages/stats', configRateLimiter, getStats);

beforeEach(() => {
  mockedGetMessageLogs.mockReturnValue([
    {
      id: 1,
      from_number: '15559876543',
      to_number: '12345678900',
      message: 'Hello, this is a test!',
      type: 'text',
      status: 'success',
      error: null,
      forwarded_at: '2026-03-14 07:30:00',
    },
  ]);
  mockedGetMessageLogCount.mockReturnValue(1);
  mockedGetMessageStats.mockReturnValue({ total: 10, success: 8, failed: 2 });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('messagesController', () => {
  describe('GET /messages', () => {
    it('returns 200 with data and pagination', async () => {
      const res = await request(app).get('/messages');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);
    });

    it('includes pagination metadata', async () => {
      const res = await request(app).get('/messages');
      const { pagination } = res.body as {
        pagination: { total: number; limit: number; offset: number; hasMore: boolean };
      };
      expect(pagination.total).toBe(1);
      expect(pagination.limit).toBe(50);
      expect(pagination.offset).toBe(0);
      expect(pagination.hasMore).toBe(false);
    });

    it('respects limit and offset query params', async () => {
      mockedGetMessageLogCount.mockReturnValue(100);
      const res = await request(app).get('/messages?limit=10&offset=20');
      expect(res.status).toBe(200);
      expect(mockedGetMessageLogs).toHaveBeenCalledWith(10, 20);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.offset).toBe(20);
    });

    it('caps limit at 100', async () => {
      const res = await request(app).get('/messages?limit=500');
      expect(res.status).toBe(200);
      expect(mockedGetMessageLogs).toHaveBeenCalledWith(100, 0);
    });

    it('returns correct message fields', async () => {
      const res = await request(app).get('/messages');
      const msg = res.body.data[0];
      expect(msg).toMatchObject({
        id: 1,
        from_number: '15559876543',
        to_number: '12345678900',
        message: 'Hello, this is a test!',
        type: 'text',
        status: 'success',
        error: null,
      });
    });
  });

  describe('GET /messages/stats', () => {
    it('returns 200 with total, success, failed counts', async () => {
      const res = await request(app).get('/messages/stats');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ total: 10, success: 8, failed: 2 });
    });

    it('calls getMessageStats once', async () => {
      await request(app).get('/messages/stats');
      expect(mockedGetMessageStats).toHaveBeenCalledTimes(1);
    });
  });
});
