import { withRetry } from '../utils/retry';

describe('withRetry', () => {
  it('returns the result on the first successful attempt', async () => {
    const fn = jest.fn().mockResolvedValue('success');

    const result = await withRetry(fn, 3, 0);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on the second attempt', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('first failure'))
      .mockResolvedValue('success');

    const result = await withRetry(fn, 3, 0);

    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('throws the last error after all attempts fail', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('failure 1'))
      .mockRejectedValueOnce(new Error('failure 2'))
      .mockRejectedValueOnce(new Error('persistent failure'));

    await expect(withRetry(fn, 3, 0)).rejects.toThrow('persistent failure');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('uses maxAttempts=1 to not retry at all', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('fail'));

    await expect(withRetry(fn, 1, 0)).rejects.toThrow('fail');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
