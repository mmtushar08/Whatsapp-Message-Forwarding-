import { extractMessages } from '../utils/messageParser';
import { WebhookPayload } from '../types/whatsapp';

describe('extractMessages', () => {
  it('returns empty array for empty payload', () => {
    const payload: WebhookPayload = { object: 'whatsapp_business_account', entry: [] };
    expect(extractMessages(payload)).toEqual([]);
  });

  it('returns empty array for status update (no messages key)', () => {
    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                statuses: [
                  {
                    id: 'wamid.123',
                    recipient_id: '9876543210',
                    status: 'delivered',
                    timestamp: '1700000000',
                  },
                ],
              },
            },
          ],
        },
      ],
    };
    expect(extractMessages(payload)).toEqual([]);
  });

  it('correctly extracts text messages from a valid webhook payload', () => {
    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                messages: [
                  {
                    from: '1234567890',
                    id: 'wamid.abc',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Hello World' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = extractMessages(payload);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('1234567890');
    expect(result[0].text).toBe('Hello World');
    expect(result[0].type).toBe('text');
    expect(result[0].messageId).toBe('wamid.abc');
  });

  it('correctly extracts sender name from contacts array', () => {
    const payload: WebhookPayload = {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'entry1',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '1234', phone_number_id: '5678' },
                contacts: [{ profile: { name: 'John Doe' }, wa_id: '1234567890' }],
                messages: [
                  {
                    from: '1234567890',
                    id: 'wamid.abc',
                    timestamp: '1700000000',
                    type: 'text',
                    text: { body: 'Hi there' },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const result = extractMessages(payload);
    expect(result).toHaveLength(1);
    expect(result[0].senderName).toBe('John Doe');
  });
});
