import { passesFilter } from '../services/filterService';
import config from '../config';

describe('passesFilter', () => {
  afterEach(() => {
    // Reset keyword filters after each test
    config.keywordFilters = [];
  });

  it('returns true when no keyword filters are configured', () => {
    config.keywordFilters = [];
    expect(passesFilter('any message at all')).toBe(true);
  });

  it('returns true when message contains a configured keyword (case-insensitive)', () => {
    config.keywordFilters = ['urgent'];
    expect(passesFilter('This is an URGENT matter')).toBe(true);
  });

  it('returns false when message does not contain any configured keyword', () => {
    config.keywordFilters = ['urgent', 'important'];
    expect(passesFilter('Hello, how are you?')).toBe(false);
  });

  it('returns true when message matches one of multiple keywords', () => {
    config.keywordFilters = ['urgent', 'important'];
    expect(passesFilter('This is an important update')).toBe(true);
  });
});
