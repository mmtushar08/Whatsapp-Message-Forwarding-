import {
  IncomingMessage,
  ParsedMessage,
  WebhookContact,
  WebhookPayload,
  WebhookValue,
} from '../types/whatsapp';

/**
 * Extracts all incoming text (and non-text) messages from a webhook payload.
 *
 * Meta's webhook payload can contain multiple entries and changes.
 * This function flattens them into a simple array of ParsedMessage objects.
 *
 * @param payload - The raw webhook payload from Meta.
 * @returns An array of parsed messages ready for processing.
 */
export function extractMessages(payload: WebhookPayload): ParsedMessage[] {
  const parsed: ParsedMessage[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      parsed.push(...extractMessagesFromValue(change.value));
    }
  }

  return parsed;
}

/**
 * Extracts the messages of a single change. Each change carries its own
 * metadata.phone_number_id, so callers that route per business number should
 * work change by change rather than on the flattened payload.
 */
export function extractMessagesFromValue(value: WebhookValue | undefined): ParsedMessage[] {
  const messages = value?.messages;
  if (!messages || messages.length === 0) {
    return [];
  }

  // Build a lookup map: wa_id → contact name
  const contactMap = buildContactMap(value.contacts ?? []);
  const parsed: ParsedMessage[] = [];

  for (const message of messages) {
    const parsedMessage = parseMessage(message, contactMap);
    if (parsedMessage) {
      parsed.push(parsedMessage);
    }
  }

  return parsed;
}

/**
 * Parses a single IncomingMessage into a ParsedMessage.
 *
 * @param message - The raw incoming message object.
 * @param contactMap - Map of wa_id → sender name.
 * @returns A ParsedMessage or null if the message type is unsupported.
 */
function parseMessage(
  message: IncomingMessage,
  contactMap: Map<string, string>,
): ParsedMessage | null {
  const senderName = contactMap.get(message.from);

  // Extract human-readable text for any message type
  const text = extractText(message);

  return {
    from: message.from,
    messageId: message.id,
    timestamp: message.timestamp,
    type: message.type,
    text,
    senderName,
  };
}

/**
 * Extracts a human-readable text representation of the message content.
 *
 * @param message - The raw incoming message.
 * @returns A string representing the message content.
 */
function extractText(message: IncomingMessage): string {
  switch (message.type) {
    case 'text':
      return message.text?.body ?? '';
    case 'image':
      return message.image?.caption ? `[Image] ${message.image.caption}` : '[Image received]';
    case 'video':
      return message.video?.caption ? `[Video] ${message.video.caption}` : '[Video received]';
    case 'audio':
      return '[Audio message received]';
    case 'document':
      return message.document?.caption
        ? `[Document] ${message.document.caption}`
        : '[Document received]';
    case 'sticker':
      return '[Sticker received]';
    case 'location':
      if (message.location) {
        const { name, address, latitude, longitude } = message.location;
        const label = name ?? address ?? `${latitude},${longitude}`;
        return `[Location] ${label}`;
      }
      return '[Location received]';
    case 'reaction':
      return message.reaction ? `[Reaction] ${message.reaction.emoji}` : '[Reaction received]';
    default:
      return '[Unsupported message type]';
  }
}

/**
 * Builds a map of wa_id → contact name from the contacts array.
 *
 * @param contacts - Array of WebhookContact objects.
 * @returns A Map for O(1) lookups.
 */
function buildContactMap(contacts: WebhookContact[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const contact of contacts) {
    map.set(contact.wa_id, contact.profile.name);
  }
  return map;
}
