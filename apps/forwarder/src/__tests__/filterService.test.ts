import { passesFilterForKeywords } from '../services/filterService';

describe('passesFilterForKeywords', () => {
  it('returns true when no keyword filters are configured', () => {
    expect(passesFilterForKeywords('any message at all', [])).toBe(true);
  });

  it('returns true when message contains a configured keyword (case-insensitive)', () => {
    expect(passesFilterForKeywords('This is an URGENT matter', ['urgent'])).toBe(true);
  });

  it('returns false when message does not contain any configured keyword', () => {
    expect(passesFilterForKeywords('Hello, how are you?', ['urgent', 'important'])).toBe(false);
  });

  it('returns true when message matches one of multiple keywords', () => {
    expect(passesFilterForKeywords('This is an important update', ['urgent', 'important'])).toBe(
      true,
    );
  });
});
