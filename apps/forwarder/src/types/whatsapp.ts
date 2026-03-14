/**
 * TypeScript types for WhatsApp Cloud API webhook payloads and API responses.
 * Based on: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */

/** Top-level webhook payload sent by Meta */
export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

/** Each entry in the webhook payload */
export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

/** A single change event in the webhook entry */
export interface WebhookChange {
  value: WebhookValue;
  field: string;
}

/** The value object inside a change event */
export interface WebhookValue {
  messaging_product: string;
  metadata: WebhookMetadata;
  contacts?: WebhookContact[];
  messages?: IncomingMessage[];
  statuses?: MessageStatus[];
}

/** Metadata about the receiving phone number */
export interface WebhookMetadata {
  display_phone_number: string;
  phone_number_id: string;
}

/** Contact info for the message sender */
export interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

/** An incoming WhatsApp message */
export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: MessageType;
  text?: TextMessage;
  image?: MediaMessage;
  video?: MediaMessage;
  audio?: MediaMessage;
  document?: MediaMessage;
  sticker?: MediaMessage;
  location?: LocationMessage;
  reaction?: ReactionMessage;
}

/** Supported message types */
export type MessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'sticker'
  | 'location'
  | 'reaction'
  | 'unsupported';

/** Text message body */
export interface TextMessage {
  body: string;
}

/** Media message (image, video, audio, document, sticker) */
export interface MediaMessage {
  id: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
}

/** Location message */
export interface LocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

/** Reaction message */
export interface ReactionMessage {
  message_id: string;
  emoji: string;
}

/** Message delivery status update */
export interface MessageStatus {
  id: string;
  recipient_id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
}

/** Payload for sending a message via WhatsApp Cloud API */
export interface SendMessagePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: {
    body: string;
  };
}

/** Response from WhatsApp Cloud API send message */
export interface SendMessageResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

/** Parsed message ready for forwarding */
export interface ParsedMessage {
  from: string;
  messageId: string;
  timestamp: string;
  type: MessageType;
  text: string;
  senderName?: string;
}
