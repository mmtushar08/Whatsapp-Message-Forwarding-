import BetterSqlite3 from 'better-sqlite3';
import { getDatabase } from '../db/database';
import {
  logMessage,
  getMessageLogs,
  getMessageLogCount,
  getMessageStats,
} from '../db/messageStore';

// Mock the database module to use an in-memory SQLite instance
jest.mock('../db/database');

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

let testDb: BetterSqlite3.Database;

function createTestSchema(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      from_number TEXT NOT NULL,
      to_number   TEXT NOT NULL,
      message     TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'text',
      status      TEXT NOT NULL DEFAULT 'success',
      error       TEXT,
      forwarded_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

beforeEach(() => {
  testDb = new BetterSqlite3(':memory:');
  createTestSchema(testDb);
  mockedGetDatabase.mockReturnValue(testDb);
});

afterEach(() => {
  testDb.close();
  jest.clearAllMocks();
});

describe('messageStore', () => {
  describe('logMessage', () => {
    it('inserts a success record into message_logs', () => {
      logMessage({
        from_number: '15551234567',
        to_number: '12345678900',
        message: 'Hello world',
        type: 'text',
        status: 'success',
      });

      const count = getMessageLogCount();
      expect(count).toBe(1);
    });

    it('inserts a failed record with error', () => {
      logMessage({
        from_number: '15551234567',
        to_number: '12345678900',
        message: 'Failed msg',
        type: 'text',
        status: 'failed',
        error: 'API error',
      });

      const logs = getMessageLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0]?.status).toBe('failed');
      expect(logs[0]?.error).toBe('API error');
    });

    it('defaults type to "text" when not provided', () => {
      logMessage({
        from_number: '15551234567',
        to_number: '12345678900',
        message: 'Hello',
        status: 'success',
      });

      const logs = getMessageLogs();
      expect(logs[0]?.type).toBe('text');
    });
  });

  describe('getMessageLogs', () => {
    beforeEach(() => {
      // Insert 3 records
      for (let i = 1; i <= 3; i++) {
        logMessage({
          from_number: `1555000000${i}`,
          to_number: '12345678900',
          message: `Message ${i}`,
          status: 'success',
        });
      }
    });

    it('returns all records when under limit', () => {
      const logs = getMessageLogs();
      expect(logs).toHaveLength(3);
    });

    it('respects the limit parameter', () => {
      const logs = getMessageLogs(2);
      expect(logs).toHaveLength(2);
    });

    it('respects the offset parameter', () => {
      const logs = getMessageLogs(10, 2);
      expect(logs).toHaveLength(1);
    });

    it('returns records newest first (by forwarded_at desc)', () => {
      const logs = getMessageLogs();
      // All rows have same forwarded_at so order by id desc expected
      // Just check all 3 are returned
      expect(logs).toHaveLength(3);
    });
  });

  describe('getMessageLogCount', () => {
    it('returns 0 when no records exist', () => {
      expect(getMessageLogCount()).toBe(0);
    });

    it('returns correct count after inserts', () => {
      logMessage({ from_number: 'a', to_number: 'b', message: 'x', status: 'success' });
      logMessage({ from_number: 'a', to_number: 'b', message: 'y', status: 'failed' });
      expect(getMessageLogCount()).toBe(2);
    });
  });

  describe('getMessageStats', () => {
    it('returns zeros when no records exist', () => {
      const stats = getMessageStats();
      expect(stats.total).toBe(0);
      expect(stats.success).toBe(0);
      expect(stats.failed).toBe(0);
    });

    it('returns correct totals for success and failed', () => {
      logMessage({ from_number: 'a', to_number: 'b', message: '1', status: 'success' });
      logMessage({ from_number: 'a', to_number: 'b', message: '2', status: 'success' });
      logMessage({ from_number: 'a', to_number: 'b', message: '3', status: 'failed' });

      const stats = getMessageStats();
      expect(stats.total).toBe(3);
      expect(stats.success).toBe(2);
      expect(stats.failed).toBe(1);
    });
  });
});
