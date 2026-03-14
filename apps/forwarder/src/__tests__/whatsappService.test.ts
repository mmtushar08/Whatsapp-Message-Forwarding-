import axios from 'axios';
import { forwardMessage } from '../services/whatsappService';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('whatsappService — forwardMessage', () => {
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

  it('successfully forwards a message and returns response', async () => {
    mockedAxios.post.mockResolvedValueOnce(mockResponse);

    const result = await forwardMessage('1234567890', 'Hello World');

    expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    expect(result.messages[0].id).toBe('wamid.test123');
  });

  it('throws an error when the API call fails', async () => {
    mockedAxios.post.mockRejectedValueOnce({
      message: 'Network Error',
      response: { data: { error: 'Unauthorized' } },
    });

    await expect(forwardMessage('1234567890', 'Hello World')).rejects.toThrow(/WhatsApp API error/);
  });
});
