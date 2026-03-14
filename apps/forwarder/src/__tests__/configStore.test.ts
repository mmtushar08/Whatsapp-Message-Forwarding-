import BetterSqlite3 from 'better-sqlite3';
import { getDatabase } from '../db/database';
import {
  getConfigValue,
  setConfigValue,
  getPersistedForwardToNumber,
  persistForwardToNumber,
} from '../db/configStore';

// Mock the database module to use an in-memory SQLite instance
jest.mock('../db/database');

const mockedGetDatabase = getDatabase as jest.MockedFunction<typeof getDatabase>;

let testDb: BetterSqlite3.Database;

function createTestSchema(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
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

describe('configStore', () => {
  describe('getConfigValue / setConfigValue', () => {
    it('returns null for a key that does not exist', () => {
      expect(getConfigValue('nonexistent')).toBeNull();
    });

    it('stores and retrieves a value', () => {
      setConfigValue('test_key', 'test_value');
      expect(getConfigValue('test_key')).toBe('test_value');
    });

    it('updates an existing value (upsert)', () => {
      setConfigValue('test_key', 'first');
      setConfigValue('test_key', 'second');
      expect(getConfigValue('test_key')).toBe('second');
    });
  });

  describe('getPersistedForwardToNumber', () => {
    it('returns the env variable default when DB is empty', () => {
      process.env['FORWARD_TO_NUMBER'] = '9876543210';
      const result = getPersistedForwardToNumber();
      expect(result).toBe('9876543210');
    });

    it('returns empty string when DB is empty and env is not set', () => {
      const original = process.env['FORWARD_TO_NUMBER'];
      delete process.env['FORWARD_TO_NUMBER'];
      const result = getPersistedForwardToNumber();
      expect(result).toBe('');
      process.env['FORWARD_TO_NUMBER'] = original;
    });

    it('returns the persisted DB value over env variable', () => {
      process.env['FORWARD_TO_NUMBER'] = '9876543210';
      persistForwardToNumber('12345678900');
      const result = getPersistedForwardToNumber();
      expect(result).toBe('12345678900');
    });
  });

  describe('persistForwardToNumber', () => {
    it('saves and retrieves the forward-to number', () => {
      persistForwardToNumber('12345678900');
      expect(getPersistedForwardToNumber()).toBe('12345678900');
    });

    it('overwrites a previously persisted number', () => {
      persistForwardToNumber('12345678900');
      persistForwardToNumber('19998887777');
      expect(getPersistedForwardToNumber()).toBe('19998887777');
    });
  });
});
