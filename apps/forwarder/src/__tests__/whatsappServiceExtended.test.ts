import axios from 'axios';
import { forwardMessage, forwardMessageTo, forwardToMultiple } from '../services/whatsappService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('whatsappService', () => {
  const mockResponse = {
    data: {
      messaging_product: 'whatsapp',
      contacts: [{ input: '9876543210', wa_id: '9876543210' }],
      messages: [{ id: 'wamid.test123' }],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('forwardMessage (backwards-compat)', () => {
    it('successfully forwards a message and returns response', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await forwardMessage('1234567890', 'Hello World');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(result.messages[0].id).toBe('wamid.test123');
    });

    it('throws an error when the API call fails', async () => {
      mockedAxios.post.mockRejectedValue({
        message: 'Network Error',
        response: { data: { error: 'Unauthorized' } },
      });

      await expect(forwardMessage('1234567890', 'Hello World')).rejects.toThrow(
        /WhatsApp API error/,
      );
    });
  });

  describe('forwardMessageTo', () => {
    it('forwards to a specific recipient', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await forwardMessageTo('1234567890', 'Hello', '9876543210');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const callPayload = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;
      expect(callPayload['to']).toBe('9876543210');
      expect(result.messages[0].id).toBe('wamid.test123');
    });

    it('throws on API failure', async () => {
      mockedAxios.post.mockRejectedValue({
        message: 'Timeout',
        response: { data: { error: 'timeout' } },
      });

      await expect(forwardMessageTo('111', 'Hi', '999')).rejects.toThrow(/WhatsApp API error/);
    });
  });

  describe('forwardToMultiple', () => {
    it('returns success results for all recipients', async () => {
      mockedAxios.post.mockResolvedValueOnce(mockResponse).mockResolvedValueOnce(mockResponse);

      const results = await forwardToMultiple('sender', 'Hello', ['111', '222']);

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ to: '111', success: true, error: undefined });
      expect(results[1]).toEqual({ to: '222', success: true, error: undefined });
    });

    it('returns error result for a failed recipient', async () => {
      mockedAxios.post
        .mockResolvedValueOnce(mockResponse)
        .mockRejectedValue({ message: 'API fail', response: { data: 'error' } });

      const results = await forwardToMultiple('sender', 'Hello', ['111', '222']);

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toMatch(/WhatsApp API error/);
    });

    it('returns empty array for empty recipients list', async () => {
      const results = await forwardToMultiple('sender', 'Hello', []);
      expect(results).toEqual([]);
    });
  });
});
